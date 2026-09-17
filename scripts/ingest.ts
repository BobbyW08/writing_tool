import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { entities, events, eventLinks, relationships } from "../lib/db/schema";
import { parseEntityFile, type ParsedEntity } from "../lib/ingest/entities";
import { parseEventsFile } from "../lib/ingest/events";
import { parseTimelineFile } from "../lib/ingest/timelineEvents";
import { slugify } from "../lib/ingest/slug";
import type { WikiLink } from "../lib/ingest/wikilinks";

const SOURCE_DIR = path.join(process.cwd(), "source-docs", "canonical");

// remark-wiki-link's node.value uses the raw "Type" text from [[Type#Name|Label]] —
// map that to this app's entity `type` column values.
const WIKI_TYPE_TO_ENTITY_TYPE: Record<string, string> = {
  Characters: "character",
  Locations: "location",
};

function generateGapPrompt(name: string, statusRaw: string, fields: Record<string, string>): string {
  const firstFieldValue = Object.values(fields)[0] ?? "";
  const snippet = firstFieldValue.slice(0, 200).trim();
  return snippet ? `${statusRaw}: ${name}. ${snippet}${firstFieldValue.length > 200 ? "…" : ""}` : `${statusRaw}: ${name}. Needs development.`;
}

async function upsertEntities(parsed: ParsedEntity[]): Promise<Map<string, string>> {
  const idBySlug = new Map<string, string>();
  for (const e of parsed) {
    const gapPrompt = e.status === "locked" ? null : generateGapPrompt(e.name, e.status, e.fields);
    const [row] = await db
      .insert(entities)
      .values({
        type: e.type,
        name: e.name,
        slug: e.slug,
        status: e.status,
        fields: e.fields,
        gapPrompt,
        sourceDocId: e.sourceDocId,
      })
      .onConflictDoUpdate({
        target: entities.slug,
        set: { type: e.type, name: e.name, status: e.status, fields: e.fields, gapPrompt, sourceDocId: e.sourceDocId },
      })
      .returning({ id: entities.id });
    idBySlug.set(`${e.type}:${e.slug}`, row.id);
  }
  return idBySlug;
}

function resolveEntityId(idBySlug: Map<string, string>, wikiTargetType: string, wikiTargetName: string): string | null {
  const type = WIKI_TYPE_TO_ENTITY_TYPE[wikiTargetType];
  if (!type) return null;
  return idBySlug.get(`${type}:${slugify(wikiTargetName)}`) ?? null;
}

interface EventRowInput {
  title: string;
  slug: string;
  yearLabel: string | null;
  sortOrder: number | null;
  locationLink: WikiLink | null;
  linkedEntities: { link: WikiLink; role: string | null }[];
  sourceDocId: string;
  whatHappened?: string | null;
  whyItHappened?: string | null;
  whatItCaused?: string | null;
  whatWasLearned?: string | null;
  draftText?: string | null;
}

async function upsertEventRow(
  ev: EventRowInput,
  idBySlug: Map<string, string>,
  warnings: string[],
  stats: { eventLinks: number },
): Promise<string> {
  const locationId = ev.locationLink ? resolveEntityId(idBySlug, ev.locationLink.targetType, ev.locationLink.targetName) : null;
  if (ev.locationLink && !locationId) {
    warnings.push(`[unresolved event location] "${ev.title}" -> [[${ev.locationLink.targetType}#${ev.locationLink.targetName}]]`);
  }
  const values = {
    title: ev.title,
    yearLabel: ev.yearLabel,
    sortOrder: ev.sortOrder !== null ? String(ev.sortOrder) : null,
    locationId,
    whatHappened: ev.whatHappened ?? null,
    whyItHappened: ev.whyItHappened ?? null,
    whatItCaused: ev.whatItCaused ?? null,
    whatWasLearned: ev.whatWasLearned ?? null,
    draftText: ev.draftText ?? null,
    sourceDocId: ev.sourceDocId,
  };
  const [row] = await db
    .insert(events)
    .values({ ...values, slug: ev.slug })
    .onConflictDoUpdate({ target: events.slug, set: { ...values, updatedAt: sql`now()` } })
    .returning({ id: events.id });

  for (const { link, role } of ev.linkedEntities) {
    const entityId = resolveEntityId(idBySlug, link.targetType, link.targetName);
    if (!entityId) {
      warnings.push(`[unresolved event_link] "${ev.title}" -> [[${link.targetType}#${link.targetName}]]`);
      continue;
    }
    await db
      .insert(eventLinks)
      .values({ eventId: row.id, entityId, role })
      .onConflictDoUpdate({ target: [eventLinks.eventId, eventLinks.entityId], set: { role } });
    stats.eventLinks++;
  }

  return row.id;
}

async function main() {
  const warnings: string[] = [];
  const stats = {
    characters: 0,
    locations: 0,
    events: 0,
    timelineEvents: 0,
    timelineSkippedAsDuplicate: 0,
    relationships: 0,
    eventLinks: 0,
  };

  const charactersText = readFileSync(path.join(SOURCE_DIR, "Characters.md"), "utf8");
  const locationsText = readFileSync(path.join(SOURCE_DIR, "Locations.md"), "utf8");
  const eventsText = readFileSync(path.join(SOURCE_DIR, "Events.md"), "utf8");

  const { entities: characterEntities, warnings: charWarnings } = parseEntityFile(charactersText, "character", "canonical/Characters.md");
  const { entities: locationEntities, warnings: locWarnings } = parseEntityFile(locationsText, "location", "canonical/Locations.md");
  warnings.push(...charWarnings.map((w) => `[entity dup] ${w.sourceDocId} "${w.headerText}": ${w.reason}`));
  warnings.push(...locWarnings.map((w) => `[entity dup] ${w.sourceDocId} "${w.headerText}": ${w.reason}`));

  const allParsedEntities = [...characterEntities, ...locationEntities];
  stats.characters = characterEntities.length;
  stats.locations = locationEntities.length;

  const idBySlug = await upsertEntities(allParsedEntities);

  // Entity-to-entity relationships from [[wiki-links]] found in character/location bodies.
  // Links that target an Event (not an entity) are deferred and resolved into event_links below.
  const pendingEntityToEvent: { entityAId: string; wikiTargetName: string }[] = [];

  for (const e of allParsedEntities) {
    const aId = idBySlug.get(`${e.type}:${e.slug}`)!;
    for (const link of e.wikiLinks) {
      if (link.targetType === "Events") {
        pendingEntityToEvent.push({ entityAId: aId, wikiTargetName: link.targetName });
        continue;
      }
      const bId = resolveEntityId(idBySlug, link.targetType, link.targetName);
      if (!bId) {
        warnings.push(`[unresolved relationship] ${e.type} "${e.name}" -> [[${link.targetType}#${link.targetName}]] (from ${e.sourceDocId})`);
        continue;
      }
      if (bId === aId) continue; // self-link, skip
      await db
        .insert(relationships)
        .values({ entityIdA: aId, entityIdB: bId, label: link.alias })
        .onConflictDoUpdate({ target: [relationships.entityIdA, relationships.entityIdB], set: { label: link.alias } });
      stats.relationships++;
    }
  }

  const { events: parsedEvents } = parseEventsFile(eventsText, "canonical/Events.md");
  stats.events = parsedEvents.length;

  const eventIdBySlug = new Map<string, string>();
  for (const ev of parsedEvents) {
    const id = await upsertEventRow(ev, idBySlug, warnings, stats);
    eventIdBySlug.set(ev.slug, id);
  }

  // Timeline.md's ERA tables add a handful of one-line events with no Events.md
  // counterpart (see BUILD_GUIDE.md) — everything that duplicates an Events.md
  // entry is filtered out inside parseTimelineFile via age + shared-word matching.
  const timelineText = readFileSync(path.join(SOURCE_DIR, "Timeline.md"), "utf8");
  const { events: timelineEvents, skippedAsDuplicate, danglingEventLinks } = parseTimelineFile(
    timelineText,
    "canonical/Timeline.md",
    parsedEvents.map((e) => ({ title: e.title, sortOrder: e.sortOrder })),
    new Set(parsedEvents.map((e) => e.slug)),
  );
  stats.timelineEvents = timelineEvents.length;
  stats.timelineSkippedAsDuplicate = skippedAsDuplicate;
  warnings.push(...danglingEventLinks.map((w) => `[dangling Events# link] ${w}`));
  for (const ev of timelineEvents) {
    const id = await upsertEventRow(ev, idBySlug, warnings, stats);
    eventIdBySlug.set(ev.slug, id);
  }

  // Resolve entity -> event wiki-links deferred from the relationships pass above.
  for (const pending of pendingEntityToEvent) {
    const eventId = eventIdBySlug.get(slugify(pending.wikiTargetName));
    if (!eventId) {
      warnings.push(`[unresolved entity->event link] entity ${pending.entityAId} -> [[Events#${pending.wikiTargetName}]]`);
      continue;
    }
    await db
      .insert(eventLinks)
      .values({ eventId, entityId: pending.entityAId, role: null })
      .onConflictDoUpdate({ target: [eventLinks.eventId, eventLinks.entityId], set: {} });
    stats.eventLinks++;
  }

  console.log("\n=== Ingestion complete ===");
  console.log(stats);
  if (warnings.length) {
    console.log(`\n=== ${warnings.length} warning(s) ===`);
    for (const w of warnings) console.log(" -", w);
  } else {
    console.log("\nNo warnings.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
