import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { entities, eventLinks, events, relationships } from "@/lib/db/schema";

export interface EntitySummary {
  id: string;
  type: string;
  name: string;
  slug: string;
  status: string;
  gapPrompt: string | null;
}

export async function listEntitiesByType(dbType: string): Promise<EntitySummary[]> {
  const rows = await db
    .select({
      id: entities.id,
      type: entities.type,
      name: entities.name,
      slug: entities.slug,
      status: entities.status,
      gapPrompt: entities.gapPrompt,
    })
    .from(entities)
    .where(eq(entities.type, dbType))
    .orderBy(entities.name);
  return rows;
}

export interface EntityDetail {
  id: string;
  type: string;
  name: string;
  slug: string;
  status: string;
  fields: Record<string, string>;
  gapPrompt: string | null;
  sourceDocId: string | null;
  parentEntityId: string | null;
}

export async function getEntityBySlug(slug: string): Promise<EntityDetail | null> {
  const [row] = await db.select().from(entities).where(eq(entities.slug, slug)).limit(1);
  if (!row) return null;
  return row;
}

export async function getEntityById(id: string): Promise<EntityDetail | null> {
  const [row] = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
  return row ?? null;
}

export interface RelatedEntity {
  relatedEntityId: string;
  name: string;
  slug: string;
  type: string;
  label: string | null;
}

// relationships is undirected in practice (a wiki-link from A to B) but stored as
// two explicit columns — check both sides so either direction surfaces the link.
export async function getRelatedEntities(entityId: string): Promise<RelatedEntity[]> {
  const rows = await db
    .select({
      aId: relationships.entityIdA,
      bId: relationships.entityIdB,
      label: relationships.label,
      bEntity: entities,
    })
    .from(relationships)
    .innerJoin(entities, eq(entities.id, relationships.entityIdB))
    .where(eq(relationships.entityIdA, entityId));

  const rowsReverse = await db
    .select({
      aId: relationships.entityIdA,
      bId: relationships.entityIdB,
      label: relationships.label,
      aEntity: entities,
    })
    .from(relationships)
    .innerJoin(entities, eq(entities.id, relationships.entityIdA))
    .where(eq(relationships.entityIdB, entityId));

  return [
    ...rows.map((r) => ({ relatedEntityId: r.bEntity.id, name: r.bEntity.name, slug: r.bEntity.slug, type: r.bEntity.type, label: r.label })),
    ...rowsReverse.map((r) => ({ relatedEntityId: r.aEntity.id, name: r.aEntity.name, slug: r.aEntity.slug, type: r.aEntity.type, label: r.label })),
  ];
}

export interface LinkedEvent {
  eventId: string;
  title: string;
  slug: string;
  yearLabel: string | null;
  sortOrder: string | null;
  role: string | null;
}

export async function getLinkedEvents(entityId: string): Promise<LinkedEvent[]> {
  const rows = await db
    .select({ event: events, role: eventLinks.role })
    .from(eventLinks)
    .innerJoin(events, eq(events.id, eventLinks.eventId))
    .where(eq(eventLinks.entityId, entityId))
    .orderBy(events.sortOrder);
  return rows.map((r) => ({
    eventId: r.event.id,
    title: r.event.title,
    slug: r.event.slug ?? r.event.id,
    yearLabel: r.event.yearLabel,
    sortOrder: r.event.sortOrder,
    role: r.role,
  }));
}

export async function entityExistsWithSlug(slug: string): Promise<boolean> {
  const [row] = await db.select({ id: entities.id }).from(entities).where(eq(entities.slug, slug)).limit(1);
  return !!row;
}

export async function listAllEntitiesForPicker(): Promise<{ id: string; name: string; type: string; slug: string }[]> {
  return db.select({ id: entities.id, name: entities.name, type: entities.type, slug: entities.slug }).from(entities).orderBy(entities.type, entities.name);
}

export async function getChildEntities(parentId: string): Promise<EntitySummary[]> {
  return db
    .select({ id: entities.id, type: entities.type, name: entities.name, slug: entities.slug, status: entities.status, gapPrompt: entities.gapPrompt })
    .from(entities)
    .where(eq(entities.parentEntityId, parentId))
    .orderBy(entities.name);
}

export async function getParentEntity(parentEntityId: string | null): Promise<{ id: string; name: string; slug: string; type: string } | null> {
  if (!parentEntityId) return null;
  const [row] = await db.select({ id: entities.id, name: entities.name, slug: entities.slug, type: entities.type }).from(entities).where(eq(entities.id, parentEntityId)).limit(1);
  return row ?? null;
}

export async function relationshipExists(aId: string, bId: string): Promise<boolean> {
  const [row] = await db
    .select({ a: relationships.entityIdA })
    .from(relationships)
    .where(or(and(eq(relationships.entityIdA, aId), eq(relationships.entityIdB, bId)), and(eq(relationships.entityIdA, bId), eq(relationships.entityIdB, aId))))
    .limit(1);
  return !!row;
}
