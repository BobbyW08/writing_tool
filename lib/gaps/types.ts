// Step UX1: the gap recommender behind "Ask AI to recommend a gap". No imports, so this file is
// safe for both server code and plain scripts.

export type GapKind = "field_gap" | "story_no_prose";

export interface GapCandidate {
  key: string; // stable id for dedup and a deterministic tiebreak, e.g. "characters:124" or "story:7"
  kind: GapKind;
  entryCollection: string;
  code: string;
  name: string;
  prompt: string; // the gapPrompt text, or a fixed line for story_no_prose
  href: string; // where "Open it" goes
  screenLabel: string; // the chip shown beside "Open it", e.g. "Character screen", "Story Builder"
  activeStoryCount: number; // tier 1: stories being written now (stage "drafting") that touch this
  writtenStoryCount: number; // tier 2: finished stories (stage "written") that touch this
  beatCount: number; // tier 3: planned beats that depend on this
}

export interface RankedGap extends GapCandidate {
  whyFirst: string;
}
