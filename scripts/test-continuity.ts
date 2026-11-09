// Offline checks for the rules that decide what the continuity check may write to canon.
// No database and no model call: run with `npm run test:continuity`.
import assert from "node:assert/strict";
import { buildPlan, filterDetect } from "../lib/continuity/plan";
import { buildNewRecordGapPrompt, findQuote, passageAround, replaceRange, resolveLabel, verbatim } from "../lib/continuity/text";
import type { CompareResult, EntityForCheck } from "../lib/continuity/types";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`ok  ${name}`);
}

const renmark: EntityForCheck = {
  id: "e-renmark",
  slug: "renmark",
  name: "Renmark",
  type: "locations",
  fields: {
    Description: "A coastal port city on the western edge of Caldor. **Mediterranean feel**, warm, busy, salt-aired.",
    Appearance: "White stone houses climb the hill above the harbor.",
  },
};
const sero: EntityForCheck = { id: "e-sero", slug: "sero", name: "Sero", type: "characters", fields: { Personality: "Quiet and guarded. Slow to trust anyone." } };

const body = `Sero walked into Renmark at dawn.\n\nThe city was cold and silent, the harbor empty.   He   was “open” with everyone he met.\n\nHarrowmere lay beyond the ridge, a village of grey slate roofs and one crooked bell tower.`;

function finding(over: Partial<CompareResult["findings"][number]>): CompareResult["findings"][number] {
  return { entity: "renmark", kind: "conflict", label: "Description", quote: "", canonLabel: "Description", canonExcerpt: "", explanation: "They differ.", maybeDevelopment: false, ...over };
}

test("findQuote tolerates whitespace, curly quotes, case and markdown marks, and returns the original wording", () => {
  assert.equal(verbatim(body, "he was “open” with everyone"), "He   was “open” with everyone");
  assert.equal(verbatim(body, 'He was "open" with everyone'), "He   was “open” with everyone");
  assert.equal(verbatim(renmark.fields.Description, "Mediterranean feel, warm"), "**Mediterranean feel**, warm");
  assert.equal(verbatim(renmark.fields.Description, "feel"), "feel", "a span that cuts through bold keeps no stray marks");
  assert.equal(verbatim("He made a *bold* move at dawn.", "bold move"), "*bold* move");
  assert.equal(verbatim("He made a *bold* move at dawn.", "a bold"), "a *bold*");
  assert.equal(findQuote(body, "this text is not in the body"), null);
  assert.equal(findQuote(body, "ab"), null);
});

test("a quote the model made up is discarded, never written", () => {
  const plan = buildPlan({
    snippet: { title: "t", label: null, body, sortOrder: null },
    mentioned: [renmark],
    candidates: [],
    compare: { findings: [finding({ quote: "The city was warm and loud", canonExcerpt: "warm, busy" })] },
    priorAges: new Map(),
  });
  assert.equal(plan.flags.length, 0);
  assert.equal(plan.discarded, 1);
});

test("a conflict needs a real canon excerpt, or it is discarded", () => {
  const plan = buildPlan({
    snippet: { title: "t", label: null, body, sortOrder: null },
    mentioned: [renmark],
    candidates: [],
    compare: { findings: [finding({ quote: "The city was cold and silent", canonExcerpt: "bustling and loud" })] },
    priorAges: new Map(),
  });
  assert.equal(plan.flags.length, 0);
  assert.equal(plan.discarded, 1);
});

test("a real conflict becomes a flag with exact wording from both sides", () => {
  const plan = buildPlan({
    snippet: { title: "t", label: null, body, sortOrder: null },
    mentioned: [renmark],
    candidates: [],
    compare: { findings: [finding({ quote: "the city was cold and silent", canonExcerpt: "warm, busy", canonLabel: "description" })] },
    priorAges: new Map(),
  });
  assert.equal(plan.flags.length, 1);
  assert.equal(plan.flags[0].kind, "conflict");
  assert.equal(plan.flags[0].fieldLabel, "Description");
  assert.equal(plan.flags[0].existingExcerpt, "warm, busy");
  assert.equal(plan.flags[0].newQuote, "The city was cold and silent");
});

test("a wrong canonLabel still finds the excerpt in the right field", () => {
  const plan = buildPlan({
    snippet: { title: "t", label: null, body, sortOrder: null },
    mentioned: [renmark],
    candidates: [],
    compare: { findings: [finding({ quote: "The city was cold and silent", canonLabel: "Climate", canonExcerpt: "White stone houses climb the hill" })] },
    priorAges: new Map(),
  });
  assert.equal(plan.flags[0].fieldLabel, "Appearance");
});

test("time awareness: development flag plus a timeline position makes it a possible change", () => {
  const base = { mentioned: [renmark], candidates: [], priorAges: new Map<string, number>() };
  const compare = { findings: [finding({ quote: "The city was cold and silent", canonExcerpt: "warm, busy", maybeDevelopment: true })] };
  assert.equal(buildPlan({ ...base, compare, snippet: { title: "t", label: null, body, sortOrder: 820 } }).flags[0].kind, "possible_change");
  assert.equal(buildPlan({ ...base, compare, snippet: { title: "t", label: null, body, sortOrder: null } }).flags[0].kind, "conflict");
});

test("time awareness: canon set by an earlier snippet makes a later scene a possible change", () => {
  const compare = { findings: [finding({ quote: "The city was cold and silent", canonExcerpt: "warm, busy" })] };
  const earlier = new Map([["e-renmark::description", 100]]);
  assert.equal(buildPlan({ mentioned: [renmark], candidates: [], compare, priorAges: earlier, snippet: { title: "t", label: null, body, sortOrder: 820 } }).flags[0].kind, "possible_change");
  assert.equal(buildPlan({ mentioned: [renmark], candidates: [], compare, priorAges: earlier, snippet: { title: "t", label: null, body, sortOrder: 50 } }).flags[0].kind, "conflict");
});

test("a match is logged as a confirmation", () => {
  const plan = buildPlan({
    snippet: { title: "t", label: null, body: "Renmark was warm and busy as ever.", sortOrder: null },
    mentioned: [renmark],
    candidates: [],
    compare: { findings: [finding({ kind: "match", quote: "warm and busy", canonExcerpt: "warm, busy" })] },
    priorAges: new Map(),
  });
  assert.equal(plan.confirmations.length, 1);
  assert.equal(plan.flags.length, 0);
});

test("a new detail already stated in canon becomes a confirmation, not a duplicate", () => {
  const plan = buildPlan({
    snippet: { title: "t", label: null, body: "White stone houses climb the hill above the harbor, he thought.", sortOrder: null },
    mentioned: [renmark],
    candidates: [],
    compare: { findings: [finding({ kind: "new_detail", label: "Appearance", quote: "White stone houses climb the hill above the harbor", canonLabel: "", canonExcerpt: "" })] },
    priorAges: new Map(),
  });
  assert.equal(plan.newDetails.length, 0);
  assert.equal(plan.confirmations.length, 1);
});

test("a new detail on an existing entity reuses its existing field name", () => {
  const plan = buildPlan({
    snippet: { title: "t", label: null, body, sortOrder: null },
    mentioned: [renmark],
    candidates: [],
    compare: { findings: [finding({ kind: "new_detail", label: "appearance", quote: "the harbor empty", canonLabel: "", canonExcerpt: "" })] },
    priorAges: new Map(),
  });
  assert.deepEqual(plan.newDetails.map((d) => d.label), ["Appearance"]);
});

test("an unlogged town gets a record built only from verified quotes", () => {
  const detect = { mentioned: [{ slug: "renmark" }, { slug: "does-not-exist" }], newEntities: [{ name: "Harrowmere", type: "locations" as const }] };
  const { mentioned, candidates } = filterDetect(detect, [renmark, sero], body);
  assert.deepEqual(mentioned.map((m) => m.slug), ["renmark"]);
  assert.deepEqual(candidates.map((c) => c.name), ["Harrowmere"]);

  const plan = buildPlan({
    snippet: { title: "Chapter 3", label: null, body, sortOrder: null },
    mentioned,
    candidates,
    compare: {
      findings: [
        finding({ entity: "Harrowmere", kind: "new_detail", label: "appearance", quote: "a village of grey slate roofs", canonLabel: "", canonExcerpt: "" }),
        finding({ entity: "Harrowmere", kind: "new_detail", label: "Landmarks", quote: "one crooked bell tower", canonLabel: "", canonExcerpt: "" }),
        finding({ entity: "Harrowmere", kind: "new_detail", label: "Population", quote: "about two hundred people", canonLabel: "", canonExcerpt: "" }),
      ],
    },
    priorAges: new Map(),
  });
  assert.equal(plan.newEntities.length, 1);
  assert.equal(plan.newEntities[0].name, "Harrowmere");
  assert.deepEqual(plan.newEntities[0].details, [
    { label: "Appearance", quote: "a village of grey slate roofs" },
    { label: "Landmarks", quote: "one crooked bell tower" },
  ]);
  assert.equal(plan.discarded, 1, "the invented population detail is dropped");
});

test("a new entry whose name is not in the writing, or is already recorded, is not created", () => {
  const detect = { mentioned: [], newEntities: [{ name: "Ghostville", type: "locations" as const }, { name: "RENMARK", type: "locations" as const }, { name: "Sero", type: "characters" as const }] };
  assert.deepEqual(filterDetect(detect, [renmark, sero], body).candidates, []);
});

test("a finding about an entry that was never detected is discarded", () => {
  const plan = buildPlan({
    snippet: { title: "t", label: null, body, sortOrder: null },
    mentioned: [renmark],
    candidates: [],
    compare: { findings: [finding({ entity: "sero", kind: "new_detail", label: "Mood", quote: "Sero walked into Renmark at dawn", canonLabel: "", canonExcerpt: "" })] },
    priorAges: new Map(),
  });
  assert.equal(plan.newDetails.length, 0);
  assert.equal(plan.discarded, 1);
});

test("a conflict about a new entry is discarded (nothing recorded to conflict with)", () => {
  const plan = buildPlan({
    snippet: { title: "t", label: null, body, sortOrder: null },
    mentioned: [],
    candidates: [{ name: "Harrowmere", type: "locations" }],
    compare: { findings: [finding({ entity: "Harrowmere", kind: "conflict", quote: "one crooked bell tower", canonExcerpt: "x" })] },
    priorAges: new Map(),
  });
  assert.equal(plan.newEntities.length, 0);
});

test("duplicate findings collapse to one", () => {
  const f = finding({ kind: "new_detail", label: "Mood", quote: "the harbor empty", canonLabel: "", canonExcerpt: "" });
  const plan = buildPlan({ snippet: { title: "t", label: null, body, sortOrder: null }, mentioned: [renmark], candidates: [], compare: { findings: [f, { ...f }] }, priorAges: new Map() });
  assert.equal(plan.newDetails.length, 1);
});

test("replaceRange swaps only the disputed words, and passageAround finds the paragraph", () => {
  const range = findQuote(renmark.fields.Description, "warm, busy")!;
  assert.equal(replaceRange(renmark.fields.Description, range, "cold, silent"), "A coastal port city on the western edge of Caldor. **Mediterranean feel**, cold, silent, salt-aired.");
  const r = findQuote(body, "The city was cold and silent")!;
  const passage = passageAround(body, r);
  assert.ok(passage.text.startsWith("The city was cold"));
  assert.equal(passage.text.slice(passage.start, passage.end), "The city was cold and silent");
});

test("labels and gap prompts", () => {
  assert.equal(resolveLabel(["Appearance", "Layout"], "layout"), "Layout");
  assert.equal(resolveLabel([], "physical layout"), "Physical Layout");
  const gap = buildNewRecordGapPrompt("Chapter 3", ["Appearance", "Layout", "Climate"], ["appearance"]);
  assert.equal(gap, 'Created automatically from "Chapter 3". Everything recorded here is quoted from that snippet. Not yet described: Layout, Climate.');
});

console.log(`\n${passed} checks passed`);
