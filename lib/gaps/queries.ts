import "server-only";
import { and, eq, inArray, ne, isNotNull } from "drizzle-orm";
import { appDb } from "@/db/index";
import * as schema from "@/db/schema";
import type { GapCandidate } from "./types";

// Same per-file table map convention as lib/continuity/queries.ts and lib/world/queries.ts.
type AnyWorldTable = typeof schema.characters;
const GAP_TABLE_MAP: Record<string, AnyWorldTable> = {
  characters: schema.characters as unknown as AnyWorldTable,
  locations: schema.locations as unknown as AnyWorldTable,
  items: schema.items as unknown as AnyWorldTable,
  cultures: schema.cultures as unknown as AnyWorldTable,
  factions: schema.factions as unknown as AnyWorldTable,
  races: schema.races as unknown as AnyWorldTable,
  languages: schema.languages as unknown as AnyWorldTable,
  lore: schema.lore as unknown as AnyWorldTable,
};

const SCREEN_LABELS: Record<string, string> = {
  characters: "Character screen",
  locations: "Location screen",
  items: "Item screen",
  cultures: "Culture screen",
  factions: "Faction screen",
  races: "Race screen",
  languages: "Language screen",
  lore: "Lore screen",
  events: "Event screen",
};

type GapRow = { id: number; code: string; name: string; gapPrompt: string | null };

async function fieldGapRows(): Promise<{ collection: string; rows: GapRow[] }[]> {
  const out: { collection: string; rows: GapRow[] }[] = [];
  for (const [collection, table] of Object.entries(GAP_TABLE_MAP)) {
    const rows = await appDb
      .select({ id: table.id, code: table.code, name: table.name, gapPrompt: table.gapPrompt })
      .from(table as never)
      .where(and(ne(table.status, "locked"), isNotNull(table.gapPrompt), ne(table.gapPrompt, "")));
    if (rows.length > 0) out.push({ collection, rows: rows as GapRow[] });
  }
  const eventRows = await appDb
    .select({ id: schema.events.id, code: schema.events.code, name: schema.events.name, gapPrompt: schema.events.gapPrompt })
    .from(schema.events)
    .where(and(ne(schema.events.status, "locked"), isNotNull(schema.events.gapPrompt), ne(schema.events.gapPrompt, "")));
  if (eventRows.length > 0) out.push({ collection: "events", rows: eventRows as GapRow[] });
  return out;
}

// Counts, per entry code, the distinct stories (by stage) that mention it through the link index
// (writing's `text` field, hard rule 14 — never hand-queried relationship columns) in writing that
// is not Set aside, and the distinct beats that involve it.
async function storyTouches(codes: string[]): Promise<{
  activeByCode: Map<string, number>;
  writtenByCode: Map<string, number>;
}> {
  const activeByCode = new Map<string, number>();
  const writtenByCode = new Map<string, number>();
  if (codes.length === 0) return { activeByCode, writtenByCode };

  const mentionRows = await appDb
    .select({ toCode: schema.links.toCode, fromCode: schema.links.fromCode })
    .from(schema.links)
    .where(and(eq(schema.links.broken, false), eq(schema.links.fromCollection, "writing"), inArray(schema.links.toCode, codes)));

  if (mentionRows.length > 0) {
    const writingCodes = [...new Set(mentionRows.map((r) => r.fromCode))];
    const writingRows = await appDb
      .select({ code: schema.writing.code, storyId: schema.writing.storyId, canonState: schema.writing.canonState })
      .from(schema.writing)
      .where(and(inArray(schema.writing.code, writingCodes), ne(schema.writing.canonState, "set_aside")));
    const storyIdByWritingCode = new Map(writingRows.map((w) => [w.code, w.storyId]));

    const storyIds = [...new Set(writingRows.map((w) => w.storyId).filter((id): id is number => id !== null))];
    const storyStageById = new Map(
      storyIds.length > 0
        ? (await appDb.select({ id: schema.stories.id, stage: schema.stories.stage }).from(schema.stories).where(inArray(schema.stories.id, storyIds))).map((s) => [s.id, s.stage])
        : [],
    );

    const activeStoryIdsByCode = new Map<string, Set<number>>();
    const writtenStoryIdsByCode = new Map<string, Set<number>>();
    for (const { toCode, fromCode } of mentionRows) {
      const storyId = storyIdByWritingCode.get(fromCode);
      if (storyId == null) continue;
      const stage = storyStageById.get(storyId);
      if (stage === "drafting") {
        if (!activeStoryIdsByCode.has(toCode)) activeStoryIdsByCode.set(toCode, new Set());
        activeStoryIdsByCode.get(toCode)!.add(storyId);
      } else if (stage === "written") {
        if (!writtenStoryIdsByCode.has(toCode)) writtenStoryIdsByCode.set(toCode, new Set());
        writtenStoryIdsByCode.get(toCode)!.add(storyId);
      }
    }
    for (const [code, ids] of activeStoryIdsByCode) activeByCode.set(code, ids.size);
    for (const [code, ids] of writtenStoryIdsByCode) writtenByCode.set(code, ids.size);
  }

  return { activeByCode, writtenByCode };
}

async function beatTouches(entries: { collection: string; id: number; code: string }[]): Promise<Map<string, number>> {
  const beatByCode = new Map<string, number>();
  if (entries.length === 0) return beatByCode;
  const byCollection = new Map<string, number[]>();
  for (const e of entries) byCollection.set(e.collection, [...(byCollection.get(e.collection) ?? []), e.id]);

  const rows: { entryCollection: string; entryId: number; beatId: number }[] = [];
  for (const [collection, ids] of byCollection) {
    const found = await appDb
      .select({ entryCollection: schema.beatInvolves.entryCollection, entryId: schema.beatInvolves.entryId, beatId: schema.beatInvolves.beatId })
      .from(schema.beatInvolves)
      .where(and(eq(schema.beatInvolves.entryCollection, collection), inArray(schema.beatInvolves.entryId, ids)));
    rows.push(...found);
  }

  const codeByCollectionId = new Map(entries.map((e) => [`${e.collection}:${e.id}`, e.code]));
  const beatIdsByCode = new Map<string, Set<number>>();
  for (const r of rows) {
    const code = codeByCollectionId.get(`${r.entryCollection}:${r.entryId}`);
    if (!code) continue;
    if (!beatIdsByCode.has(code)) beatIdsByCode.set(code, new Set());
    beatIdsByCode.get(code)!.add(r.beatId);
  }
  for (const [code, ids] of beatIdsByCode) beatByCode.set(code, ids.size);
  return beatByCode;
}

function collectionHref(collection: string, code: string): string {
  if (collection === "events") return `/events/${code}`;
  return `/${collection}/${code}`;
}

// Candidates where a world entry (or event) has an open gapPrompt (hard rule 4) and is not Locked.
async function fieldGapCandidates(): Promise<GapCandidate[]> {
  const groups = await fieldGapRows();
  const entries = groups.flatMap((g) => g.rows.map((r) => ({ collection: g.collection, id: r.id, code: r.code })));
  const codes = entries.map((e) => e.code);

  const [{ activeByCode, writtenByCode }, beatByCode] = await Promise.all([
    storyTouches(codes),
    beatTouches(entries),
  ]);

  return groups.flatMap(({ collection, rows }) =>
    rows.map((r) => ({
      key: `${collection}:${r.id}`,
      kind: "field_gap" as const,
      entryCollection: collection,
      code: r.code,
      name: r.name,
      prompt: r.gapPrompt ?? "",
      href: collectionHref(collection, r.code),
      screenLabel: SCREEN_LABELS[collection] ?? "Entry screen",
      activeStoryCount: activeByCode.get(r.code) ?? 0,
      writtenStoryCount: writtenByCode.get(r.code) ?? 0,
      beatCount: beatByCode.get(r.code) ?? 0,
    })),
  );
}

// Candidates where a story has planned beats but no written prose yet (none of its non-Set-aside
// writing has any text). The destination is the beats page, the Story Builder's stand-in until
// step SB3 exists (same convention as UX3's "Use the Story Builder" card).
async function storyNoProseCandidates(): Promise<GapCandidate[]> {
  const storyRows = await appDb
    .select({ id: schema.stories.id, code: schema.stories.code, name: schema.stories.name, stage: schema.stories.stage })
    .from(schema.stories)
    .where(ne(schema.stories.status, "locked"));
  if (storyRows.length === 0) return [];

  const storyIds = storyRows.map((s) => s.id);
  const beatRows = await appDb.select({ storyId: schema.beats.storyId }).from(schema.beats).where(inArray(schema.beats.storyId, storyIds));
  const beatCountByStory = new Map<number, number>();
  for (const b of beatRows) {
    if (b.storyId == null) continue; // filtered to storyIds above, but keeps the Map's type honest
    beatCountByStory.set(b.storyId, (beatCountByStory.get(b.storyId) ?? 0) + 1);
  }

  const withBeats = storyRows.filter((s) => (beatCountByStory.get(s.id) ?? 0) > 0);
  if (withBeats.length === 0) return [];

  const writingRows = await appDb
    .select({ storyId: schema.writing.storyId, canonState: schema.writing.canonState, plainText: schema.writing.plainText })
    .from(schema.writing)
    .where(and(inArray(schema.writing.storyId, withBeats.map((s) => s.id)), ne(schema.writing.canonState, "set_aside")));
  const hasProseByStory = new Set<number>();
  for (const w of writingRows) {
    if (w.storyId !== null && (w.plainText ?? "").trim().length > 0) hasProseByStory.add(w.storyId);
  }

  return withBeats
    .filter((s) => !hasProseByStory.has(s.id))
    .map((s) => ({
      key: `stories:${s.id}`,
      kind: "story_no_prose" as const,
      entryCollection: "stories",
      code: s.code,
      name: s.name,
      prompt: "Has beats planned but no written scenes yet",
      href: `/stories/${s.code}/beats`,
      screenLabel: "Story Builder",
      activeStoryCount: s.stage === "drafting" ? 1 : 0,
      writtenStoryCount: 0,
      beatCount: beatCountByStory.get(s.id) ?? 0,
    }));
}

export async function computeGapCandidates(): Promise<GapCandidate[]> {
  const [fieldGaps, storyGaps] = await Promise.all([fieldGapCandidates(), storyNoProseCandidates()]);
  return [...fieldGaps, ...storyGaps];
}
