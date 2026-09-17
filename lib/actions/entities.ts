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
    gapPrompt: status === "locked" ? null : gapPrompt,
    sourceDocId: null,
  });

  revalidatePath(`/${typeConfig.urlSlug}`);
  redirect(`/${typeConfig.urlSlug}/${slug}`);
}

export async function updateEntityAction(id: string, urlTypeSlug: string, formData: FormData) {
  const typeConfig = entityTypeByUrlSlug(urlTypeSlug);
  if (!typeConfig) throw new Error(`Unknown entity type: ${urlTypeSlug}`);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  const status = String(formData.get("status") ?? "in_development");
  if (!STATUS_OPTIONS.includes(status as (typeof STATUS_OPTIONS)[number])) throw new Error("Invalid status");
  const fields = parseFields(formData.get("fields") as string | null);
  const gapPrompt = String(formData.get("gapPrompt") ?? "").trim() || null;

  const [current] = await db.select({ slug: entities.slug, name: entities.name }).from(entities).where(eq(entities.id, id)).limit(1);
  if (!current) throw new Error("Entity not found");

  const slug = name === current.name ? current.slug : await uniqueSlugFor(name, id);

  await db
    .update(entities)
    .set({ name, slug, status, fields, gapPrompt: status === "locked" ? null : gapPrompt })
    .where(eq(entities.id, id));

  revalidatePath(`/${typeConfig.urlSlug}`);
  revalidatePath(`/${typeConfig.urlSlug}/${slug}`);
  redirect(`/${typeConfig.urlSlug}/${slug}`);
}

export async function deleteEntityAction(id: string, urlTypeSlug: string) {
  const typeConfig = entityTypeByUrlSlug(urlTypeSlug);
  if (!typeConfig) throw new Error(`Unknown entity type: ${urlTypeSlug}`);

  await db.delete(relationships).where(or(eq(relationships.entityIdA, id), eq(relationships.entityIdB, id)));
  await db.delete(eventLinks).where(eq(eventLinks.entityId, id));
  await db.update(events).set({ locationId: null }).where(eq(events.locationId, id));
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
