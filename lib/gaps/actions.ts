"use server";

import { z } from "zod";
import { computeGapCandidates } from "./queries";
import { rankGaps } from "./rank";
import type { RankedGap } from "./types";
import { askAI } from "@/lib/ai/model";

// Step UX1's "Ask AI to recommend a gap". The ranking above is deterministic (lib/gaps/rank.ts,
// tested in scripts/test-gaps.ts) — nothing here changes the order. The model only reworks the
// "Why first" wording for the few gaps actually shown, and never writes anything (hard rules 1
// and 4: this only reads).
const wordingSchema = z.object({
  items: z.array(z.object({ key: z.string(), whyFirst: z.string() })),
});

async function wordTopGaps(top: RankedGap[]): Promise<RankedGap[]> {
  if (top.length === 0 || !process.env.ANTHROPIC_API_KEY) return top;
  try {
    const { output } = await askAI({
      task: "quick_suggestions",
      system:
        "You write one short, concrete reason ('Why first: ...' style, under 12 words) for why each " +
        "listed gap in a story wiki ranks where it does. Use only the facts given for each item " +
        "(how many stories being written now, finished stories, or planned beats touch it). Never " +
        "invent facts, never suggest what the gap should say, and keep the same order.",
      prompt: JSON.stringify(
        top.map((g) => ({
          key: g.key,
          what: g.prompt,
          activeStories: g.activeStoryCount,
          writtenStories: g.writtenStoryCount,
          beats: g.beatCount,
        })),
      ),
      schema: wordingSchema,
    });
    const byKey = new Map(output.items.map((i) => [i.key, i.whyFirst]));
    return top.map((g) => ({ ...g, whyFirst: byKey.get(g.key) ?? g.whyFirst }));
  } catch {
    return top; // the deterministic template from rankGaps is a fine fallback
  }
}

// UX2's type-page panel passes `collection` to rank that type's own gaps first (step UX2: "reuses
// the UX1 ranking, filtered to this type first"). If the type has none open, falls back to the
// global ranking so the panel is never empty — "Open" can then leave the type page, as the plan says.
export async function getTopGapsAction(limit = 3, collection?: string): Promise<RankedGap[]> {
  const candidates = await computeGapCandidates();
  const scoped = collection ? candidates.filter((c) => c.entryCollection === collection) : candidates;
  const top = rankGaps(scoped.length > 0 ? scoped : candidates).slice(0, limit);
  return wordTopGaps(top);
}
