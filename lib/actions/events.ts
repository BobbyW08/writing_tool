"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, eventLinks } from "@/lib/db/schema";
import { eventExistsWithSlug } from "@/lib/data/events";
import { slugify } from "@/lib/ingest/slug";

async function uniqueSlugFor(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || "event";
  let candidate = base;
  let n = 2;
  while (await eventExistsWithSlug(candidate)) {
    const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.slug, candidate)).limit(1);
    if (excludeId && existing?.id === excludeId) break;
    candidate = `${base}-${n}`;
    n++;
  }
  return candidate;
}

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function createEventAction(formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Title is required");
  const slug = await uniqueSlugFor(title);
  const sortOrderRaw = str(formData, "sortOrder");

  await db.insert(events).values({
    title,
    slug,
    yearLabel: str(formData, "yearLabel"),
    sortOrder: sortOrderRaw,
    locationId: str(formData, "locationId"),
    whatHappened: str(formData, "whatHappened"),
    whyItHappened: str(formData, "whyItHappened"),
    whatItCaused: str(formData, "whatItCaused"),
    whatWasLearned: str(formData, "whatWasLearned"),
    draftText: str(formData, "draftText"),
    sourceDocId: null,
  });

  revalidatePath("/events");
  redirect(`/events/${slug}`);
}

export async function updateEventAction(id: string, formData: FormData) {
  const title = str(formData, "title");
  if (!title) throw new Error("Title is required");

  const [current] = await db.select({ slug: events.slug, title: events.title }).from(events).where(eq(events.id, id)).limit(1);
  if (!current) throw new Error("Event not found");

  const slug = title === current.title ? current.slug : await uniqueSlugFor(title, id);
  const sortOrderRaw = str(formData, "sortOrder");

  await db
    .update(events)
    .set({
      title,
      slug,
      yearLabel: str(formData, "yearLabel"),
      sortOrder: sortOrderRaw,
      locationId: str(formData, "locationId"),
      whatHappened: str(formData, "whatHappened"),
      whyItHappened: str(formData, "whyItHappened"),
      whatItCaused: str(formData, "whatItCaused"),
      whatWasLearned: str(formData, "whatWasLearned"),
      draftText: str(formData, "draftText"),
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));

  revalidatePath("/events");
  revalidatePath(`/events/${slug}`);
  redirect(`/events/${slug}`);
}

export async function deleteEventAction(id: string) {
  await db.delete(eventLinks).where(eq(eventLinks.eventId, id));
  await db.update(events).set({ parentEventId: null }).where(eq(events.parentEventId, id));
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/events");
  redirect("/events");
}

export async function addSubEventAction(parentId: string, childId: string) {
  if (parentId === childId) return;
  await db.update(events).set({ parentEventId: parentId }).where(eq(events.id, childId));
  const rows = await db.select({ slug: events.slug }).from(events).where(eq(events.id, parentId));
  const child = await db.select({ slug: events.slug }).from(events).where(eq(events.id, childId));
  for (const r of [...rows, ...child]) if (r.slug) revalidatePath(`/events/${r.slug}`);
  revalidatePath("/timeline");
}

export async function removeSubEventAction(childId: string) {
  await db.update(events).set({ parentEventId: null }).where(eq(events.id, childId));
  const [row] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, childId)).limit(1);
  if (row?.slug) revalidatePath(`/events/${row.slug}`);
  revalidatePath("/timeline");
}

export async function addEventLinkAction(eventId: string, entityId: string, role: string | null) {
  await db
    .insert(eventLinks)
    .values({ eventId, entityId, role })
    .onConflictDoUpdate({ target: [eventLinks.eventId, eventLinks.entityId], set: { role } });
  const [row] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, eventId)).limit(1);
  if (row?.slug) revalidatePath(`/events/${row.slug}`);
}

export async function removeEventLinkAction(eventId: string, entityId: string) {
  await db.delete(eventLinks).where(and(eq(eventLinks.eventId, eventId), eq(eventLinks.entityId, entityId)));
  const [row] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, eventId)).limit(1);
  if (row?.slug) revalidatePath(`/events/${row.slug}`);
}

// Dragging a timeline item updates sort_order only — never year_label (hard rule 3).
// The UI prompts the user to optionally update the label separately; it's never rewritten here.
export async function updateEventSortOrderAction(eventId: string, sortOrder: number) {
  await db
    .update(events)
    .set({ sortOrder: String(sortOrder), updatedAt: new Date() })
    .where(eq(events.id, eventId));
  revalidatePath("/timeline");
}
