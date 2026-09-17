import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entities, eventLinks, events } from "@/lib/db/schema";

export interface EventSummary {
  id: string;
  title: string;
  slug: string | null;
  yearLabel: string | null;
  sortOrder: string | null;
}

export async function listEvents(): Promise<EventSummary[]> {
  return db
    .select({ id: events.id, title: events.title, slug: events.slug, yearLabel: events.yearLabel, sortOrder: events.sortOrder })
    .from(events)
    .orderBy(asc(events.sortOrder));
}

export interface EventDetail {
  id: string;
  title: string;
  slug: string | null;
  yearLabel: string | null;
  sortOrder: string | null;
  locationId: string | null;
  whatHappened: string | null;
  whyItHappened: string | null;
  whatItCaused: string | null;
  whatWasLearned: string | null;
  draftText: string | null;
  sourceDocId: string | null;
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const [row] = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return row ?? null;
}

export async function getEventById(id: string): Promise<EventDetail | null> {
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return row ?? null;
}

export async function getEventLocation(locationId: string | null): Promise<{ id: string; name: string; slug: string } | null> {
  if (!locationId) return null;
  const [row] = await db.select({ id: entities.id, name: entities.name, slug: entities.slug }).from(entities).where(eq(entities.id, locationId)).limit(1);
  return row ?? null;
}

export interface LinkedEventEntity {
  entityId: string;
  name: string;
  slug: string;
  type: string;
  role: string | null;
}

export async function getEventLinkedEntities(eventId: string): Promise<LinkedEventEntity[]> {
  const rows = await db
    .select({ entity: entities, role: eventLinks.role })
    .from(eventLinks)
    .innerJoin(entities, eq(entities.id, eventLinks.entityId))
    .where(eq(eventLinks.eventId, eventId))
    .orderBy(entities.name);
  return rows.map((r) => ({ entityId: r.entity.id, name: r.entity.name, slug: r.entity.slug, type: r.entity.type, role: r.role }));
}

export async function eventExistsWithSlug(slug: string): Promise<boolean> {
  const [row] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug)).limit(1);
  return !!row;
}
