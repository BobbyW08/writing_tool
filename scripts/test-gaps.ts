// Step UX1's gap ranking. Pure, deterministic, no DB. Run with: npx tsx scripts/test-gaps.ts
import { rankGaps, explainGap } from "../lib/gaps/rank";
import type { GapCandidate } from "../lib/gaps/types";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`);
  if (!ok) failed++;
}

function candidate(overrides: Partial<GapCandidate>): GapCandidate {
  return {
    key: "x",
    kind: "field_gap",
    entryCollection: "characters",
    code: "C1",
    name: "Someone",
    prompt: "What color are their eyes?",
    href: "/characters/C1",
    screenLabel: "Character screen",
    activeStoryCount: 0,
    writtenStoryCount: 0,
    beatCount: 0,
    ...overrides,
  };
}

// Ranking order
{
  const a = candidate({ key: "a", activeStoryCount: 0, writtenStoryCount: 0, beatCount: 0 });
  const b = candidate({ key: "b", activeStoryCount: 1, writtenStoryCount: 0, beatCount: 0 });
  const ranked = rankGaps([a, b]);
  check("a gap touching an active story outranks one touching nothing", ranked[0].key === "b");
}
{
  const a = candidate({ key: "a", activeStoryCount: 0, writtenStoryCount: 5, beatCount: 99 });
  const b = candidate({ key: "b", activeStoryCount: 1, writtenStoryCount: 0, beatCount: 0 });
  const ranked = rankGaps([a, b]);
  check("tier 1 (active stories) beats tier 2 and tier 3 regardless of their size", ranked[0].key === "b");
}
{
  const a = candidate({ key: "a", activeStoryCount: 1, writtenStoryCount: 0, beatCount: 99 });
  const b = candidate({ key: "b", activeStoryCount: 1, writtenStoryCount: 2, beatCount: 0 });
  const ranked = rankGaps([a, b]);
  check("tied on tier 1, tier 2 (finished stories) decides next", ranked[0].key === "b");
}
{
  const a = candidate({ key: "a", activeStoryCount: 0, writtenStoryCount: 0, beatCount: 1 });
  const b = candidate({ key: "b", activeStoryCount: 0, writtenStoryCount: 0, beatCount: 3 });
  const ranked = rankGaps([a, b]);
  check("tied on tiers 1 and 2, tier 3 (beats) decides next", ranked[0].key === "b");
}
{
  const a = candidate({ key: "z-tied" });
  const b = candidate({ key: "a-tied" });
  const ranked = rankGaps([a, b]);
  check("a true tie breaks deterministically by key, not call order", ranked[0].key === "a-tied");
}
{
  const input = [candidate({ key: "a" }), candidate({ key: "b" })];
  rankGaps(input);
  check("ranking never mutates the input array", input[0].key === "a" && input[1].key === "b");
}

// Wording
check(
  "an active-story gap is worded as being written now",
  explainGap(candidate({ activeStoryCount: 1 })) === "The story you are writing now",
);
check(
  "more than one active story is counted in the wording",
  explainGap(candidate({ activeStoryCount: 2 })) === "2 stories you are writing now",
);
check(
  "with no active story, a finished story is named instead",
  explainGap(candidate({ writtenStoryCount: 1 })) === "Needed in 1 finished story",
);
check(
  "several finished stories pluralize",
  explainGap(candidate({ writtenStoryCount: 2 })) === "Needed in 2 finished stories",
);
check(
  "with no story at all, a planned beat is named",
  explainGap(candidate({ beatCount: 1 })) === "Needed by 1 planned beat",
);
check(
  "touching nothing at all says so plainly",
  explainGap(candidate({})) === "Not yet used in any story",
);

console.log(`\n${failed === 0 ? "All checks passed." : `${failed} check(s) failed.`}`);
process.exit(failed === 0 ? 0 : 1);
