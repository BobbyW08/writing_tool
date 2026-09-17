"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { entities, eventLinks, events, relationships } from "@/lib/db/schema";
import { entityTypeByDbType, entityTypeByUrlSlug, STATUS_OPTIONS } from "@/lib/data/entity-types";
import { entityExistsWithSlug } from "@/lib/data/entities";
import { slugify } from "@/lib/ingest/slug";

const fieldsSchema = z.record(z.string(), z.string());

function parseFields(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return fieldsSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function uniqueSlugFor(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || "entity";
  let candidate = base;
  let n = 2;
  while (await entityExistsWithSlug(candidate)) {
    const [existing] = await db.select({ id: entities.id }).from(entities).where(eq(entities.slug, candidate)).limit(1);
    if (excludeId && existing?.id === excludeId) break;
    candidate = `${base}-${n}`;
    n++;
  }
  return candidate;
}

export async function createEntityAction(urlTypeSlug: string, formData: FormData) {
  const typeConfig = entityTypeByUrlSlug(urlTypeSlug);
  if (!typeConfig) throw new Error(`Unknown entity type: ${urlTypeSlug}`);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  const status = String(formData.get("status") ?? "in_development");
  const fields = parseFields(formData.get("fields") as string | null);
  const gapPrompt = String(formData.get("gapPrompt") ?? "").trim() || null;

  const slug = await uniqueSlugFor(name);

  await db.insert(entities).values({
    type: typeConfig.dbType,
    name,
    slug,
    status,
    fields,
    gapPrompt,
    sourceDocId: null,
  });

  revalidatePath(`/${typeConfig.urlSlug}`);
  redirect(`/${typeConfig.urlSlug}/${slug}`);
}

// `urlTypeSlug` is the type the page was loaded under — the entity may be reassigned to a
// different type via the form's `type` field, in which case we redirect to the new URL.
export async function updateEntityAction(id: string, urlTypeSlug: string, formData: FormData) {
  const currentTypeConfig = entityTypeByUrlSlug(urlTypeSlug);
  if (!currentTypeConfig) throw new Error(`Unknown entity type: ${urlTypeSlug}`);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  const status = String(formData.get("status") ?? "in_development");
  if (!STATUS_OPTIONS.includes(status as (typeof STATUS_OPTIONS)[number])) throw new Error("Invalid status");
  const fields = parseFields(formData.get("fields") as string | null);
  const gapPrompt = String(formData.get("gapPrompt") ?? "").trim() || null;
  const newDbType = String(formData.get("type") ?? currentTypeConfig.dbType);
  const newTypeConfig = entityTypeByDbType(newDbType) ?? currentTypeConfig;

  const [current] = await db.select({ slug: entities.slug, name: entities.name }).from(entities).where(eq(entities.id, id)).limit(1);
  if (!current) throw new Error("Entity not found");

  const slug = name === current.name ? current.slug : await uniqueSlugFor(name, id);

  await db
    .update(entities)
    .set({ name, slug, status, fields, gapPrompt, type: newTypeConfig.dbType })
    .where(eq(entities.id, id));

  revalidatePath(`/${currentTypeConfig.urlSlug}`);
  revalidatePath(`/${currentTypeConfig.urlSlug}/${slug}`);
  if (newTypeConfig.urlSlug !== currentTypeConfig.urlSlug) revalidatePath(`/${newTypeConfig.urlSlug}`);
  redirect(`/${newTypeConfig.urlSlug}/${slug}`);
}

export async function deleteEntityAction(id: string, urlTypeSlug: string) {
  const typeConfig = entityTypeByUrlSlug(urlTypeSlug);
  if (!typeConfig) throw new Error(`Unknown entity type: ${urlTypeSlug}`);

  await db.delete(relationships).where(or(eq(relationships.entityIdA, id), eq(relationships.entityIdB, id)));
  await db.delete(eventLinks).where(eq(eventLinks.entityId, id));
  await db.update(events).set({ locationId: null }).where(eq(events.locationId, id));
  await db.update(entities).set({ parentEntityId: null }).where(eq(entities.parentEntityId, id));
  await db.delete(entities).where(eq(entities.id, id));

  revalidatePath(`/${typeConfig.urlSlug}`);
  redirect(`/${typeConfig.urlSlug}`);
}

export async function addRelationshipAction(entityId: string, targetEntityId: string, label: string | null) {
  if (entityId === targetEntityId) return;
  await db
    .insert(relationships)
    .values({ entityIdA: entityId, entityIdB: targetEntityId, label })
    .onConflictDoUpdate({ target: [relationships.entityIdA, relationships.entityIdB], set: { label } });
  await revalidateEntityPaths(entityId);
  await revalidateEntityPaths(targetEntityId);
}

export async function removeRelationshipAction(entityId: string, targetEntityId: string) {
  await db
    .delete(relationships)
    .where(
      or(
        and(eq(relationships.entityIdA, entityId), eq(relationships.entityIdB, targetEntityId)),
        and(eq(relationships.entityIdA, targetEntityId), eq(relationships.entityIdB, entityId)),
      ),
    );
  await revalidateEntityPaths(entityId);
  await revalidateEntityPaths(targetEntityId);
}

async function revalidateEntityPaths(id: string) {
  const [row] = await db.select({ slug: entities.slug, type: entities.type }).from(entities).where(eq(entities.id, id)).limit(1);
  if (!row) return;
  const typeConfig = entityTypeByDbType(row.type);
  if (typeConfig) revalidatePath(`/${typeConfig.urlSlug}/${row.slug}`);
}

export async function addSubItemAction(parentId: string, childId: string) {
  if (parentId === childId) return;
  await db.update(entities).set({ parentEntityId: parentId }).where(eq(entities.id, childId));
  await revalidateEntityPaths(parentId);
  await revalidateEntityPaths(childId);
}

export async function removeSubItemAction(childId: string) {
  await db.update(entities).set({ parentEntityId: null }).where(eq(entities.id, childId));
  await revalidateEntityPaths(childId);
}

// One-way move: an entity that's really an event gets recreated as one, with its custom
// fields folded into draft_text (events have no free-form jsonb field). Relationships and
// event_links pointing at the old entity row are dropped — they don't carry over cleanly
// since an event can't be the target of an entity-to-entity relationship.
export async function convertEntityToEventAction(entityId: string) {
  const [entity] = await db.select().from(entities).where(eq(entities.id, entityId)).limit(1);
  if (!entity) throw new Error("Entity not found");

  const { eventExistsWithSlug } = await import("@/lib/data/events");
  const base = slugify(entity.name) || "event";
  let slug = base;
  let n = 2;
  while (await eventExistsWithSlug(slug)) slug = `${base}-${n++}`;

  const fieldsText = Object.entries(entity.fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n\n");
  const draftText = [entity.gapPrompt ? `Gap: ${entity.gapPrompt}` : null, fieldsText || null].filter(Boolean).join("\n\n") || null;

  const [newEvent] = await db
    .insert(events)
    .values({ title: entity.name, slug, draftText, sourceDocId: entity.sourceDocId })
    .returning({ id: events.id, slug: events.slug });

  await db.delete(relationships).where(or(eq(relationships.entityIdA, entityId), eq(relationships.entityIdB, entityId)));
  await db.delete(eventLinks).where(eq(eventLinks.entityId, entityId));
  await db.update(events).set({ locationId: null }).where(eq(events.locationId, entityId));
  await db.update(entities).set({ parentEntityId: null }).where(eq(entities.parentEntityId, entityId));
  await db.delete(entities).where(eq(entities.id, entityId));

  const typeConfig = entityTypeByDbType(entity.type);
  if (typeConfig) revalidatePath(`/${typeConfig.urlSlug}`);
  revalidatePath("/events");
  redirect(`/events/${newEvent.slug}`);
}
