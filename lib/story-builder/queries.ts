import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { appDb } from "@/db/index";
import * as schema from "@/db/schema";

// Step UX3: the stories picker (board 3) and per-story "what do you want to do" screen (board 4).
// Word and beat counts come from one query each across all stories, grouped in JS, rather than a
// query per story (there is no stored word-count column; `writing.plainText` is counted live, same
// as lib/studio/queries.ts's getWritingList).

export type StoryStats = {
  wordCount: number; // sum of non-Set-aside pieces' word counts
  pieceCount: number; // non-Set-aside pieces with any words
  hasProse: boolean; // the Review-availability rule (step UX3): any non-empty, non-Set-aside piece
  beatCount: number;
  linkedEntryCount: number; // distinct entries any of this story's beats involve
};

const EMPTY_STATS: StoryStats = { wordCount: 0, pieceCount: 0, hasProse: false, beatCount: 0, linkedEntryCount: 0 };

export async function getAllStoryStats(): Promise<Map<number, StoryStats>> {
  const stats = new Map<number, StoryStats>();

  const writingRows = await appDb
    .select({ storyId: schema.writing.storyId, plainText: schema.writing.plainText, canonState: schema.writing.canonState })
    .from(schema.writing);
  for (const w of writingRows) {
    if (w.storyId == null || w.canonState === "set_aside") continue;
    const words = (w.plainText ?? "").trim();
    if (!words) continue;
    const count = words.split(/\s+/).length;
    const s = stats.get(w.storyId) ?? { ...EMPTY_STATS };
    s.wordCount += count;
    s.pieceCount += 1;
    s.hasProse = true;
    stats.set(w.storyId, s);
  }

  const beatRows = await appDb.select({ id: schema.beats.id, storyId: schema.beats.storyId }).from(schema.beats);
  const beatIdsByStory = new Map<number, number[]>();
  for (const b of beatRows) {
    const s = stats.get(b.storyId) ?? { ...EMPTY_STATS };
    s.beatCount += 1;
    stats.set(b.storyId, s);
    beatIdsByStory.set(b.storyId, [...(beatIdsByStory.get(b.storyId) ?? []), b.id]);
  }

  const allBeatIds = beatRows.map((b) => b.id);
  if (allBeatIds.length > 0) {
    const involveRows = await appDb
      .select({ beatId: schema.beatInvolves.beatId, entryCollection: schema.beatInvolves.entryCollection, entryId: schema.beatInvolves.entryId })
      .from(schema.beatInvolves)
      .where(inArray(schema.beatInvolves.beatId, allBeatIds));
    const beatToStory = new Map(beatRows.map((b) => [b.id, b.storyId]));
    const entriesByStory = new Map<number, Set<string>>();
    for (const r of involveRows) {
      const storyId = beatToStory.get(r.beatId);
      if (storyId == null) continue;
      if (!entriesByStory.has(storyId)) entriesByStory.set(storyId, new Set());
      entriesByStory.get(storyId)!.add(`${r.entryCollection}:${r.entryId}`);
    }
    for (const [storyId, entries] of entriesByStory) {
      const s = stats.get(storyId) ?? { ...EMPTY_STATS };
      s.linkedEntryCount = entries.size;
      stats.set(storyId, s);
    }
  }

  return stats;
}

export async function getStoryStats(storyId: number): Promise<StoryStats> {
  const all = await getAllStoryStats();
  return all.get(storyId) ?? EMPTY_STATS;
}

// Most-recently-touched first: a picker favors what Bobby is likely mid-way through over
// alphabetical order (lib/studio/queries.ts's getStoryList stays alphabetical for its dropdown use).
export async function getStoryPickerList(): Promise<{ id: number; code: string; name: string; stage: string | null }[]> {
  return appDb
    .select({ id: schema.stories.id, code: schema.stories.code, name: schema.stories.name, stage: schema.stories.stage })
    .from(schema.stories)
    .orderBy(desc(schema.stories.updatedAt));
}
