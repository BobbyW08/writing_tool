// Step UX1: the gap ranking behind "Ask AI to recommend a gap". Pure and deterministic — the
// model never decides order, only words the explanation (lib/gaps/actions.ts does that, falling
// back to explainGap below if the call fails). No imports, so this is safe for scripts too.

import type { GapCandidate, RankedGap } from "./types";

export function rankGaps(candidates: GapCandidate[]): RankedGap[] {
  return [...candidates]
    .sort(
      (a, b) =>
        b.activeStoryCount - a.activeStoryCount ||
        b.writtenStoryCount - a.writtenStoryCount ||
        b.beatCount - a.beatCount ||
        a.key.localeCompare(b.key),
    )
    .map((c) => ({ ...c, whyFirst: explainGap(c) }));
}

export function explainGap(c: GapCandidate): string {
  if (c.activeStoryCount > 0) {
    return c.activeStoryCount === 1
      ? "The story you are writing now"
      : `${c.activeStoryCount} stories you are writing now`;
  }
  if (c.writtenStoryCount > 0) {
    return `Needed in ${c.writtenStoryCount} finished ${c.writtenStoryCount === 1 ? "story" : "stories"}`;
  }
  if (c.beatCount > 0) {
    return `Needed by ${c.beatCount} planned beat${c.beatCount === 1 ? "" : "s"}`;
  }
  return "Not yet used in any story";
}
