import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { compareSchema, detectSchema, type CompareResult, type DetectResult, type EntityForCheck, type SnippetForCheck } from "./types";

// The two model calls behind the continuity check. The model only reads and reports. It
// never writes story content, and nothing it returns reaches canon until plan.ts has
// verified every quote against the author's own words.

const MODEL = process.env.CONTINUITY_MODEL || "claude-sonnet-4-5";

export interface Analyzer {
  detect(input: { snippet: SnippetForCheck; index: EntityForCheck[] }): Promise<DetectResult>;
  compare(input: {
    snippet: SnippetForCheck;
    mentioned: EntityForCheck[];
    candidates: { name: string; type: string }[];
  }): Promise<CompareResult>;
}

const DETECT_SYSTEM = `You help an author keep a fictional world consistent. You are given a piece of the author's writing and an index of everything already recorded in the world.

Report two things:
1. mentioned: every recorded entry the writing mentions or clearly refers to, by its slug. Count references by short name, nickname or title (for example "the Empress" when exactly one recorded entry is the Empress).
2. newEntities: every named person, place, item, culture, race, language or artifact that the writing names AND says something about, that is NOT in the index.

Rules:
- A new entry needs a proper name that appears in the writing. Never report unnamed or generic things ("the market", "a guard").
- Do not report something that is already in the index under a different spelling or a shorter name.
- Do not report a name that is only mentioned in passing with nothing said about it.
- Never invent anything. If you are not sure, leave it out.`;

const COMPARE_SYSTEM = `You check an author's new writing against the recorded canon of their fictional world. You only read and report. You never write story content, never rephrase the author's words, and never invent details.

For each attribute the writing states about a recorded entry or a new entry, produce one finding. Attributes to look for: personality and behavior, appearance, physical layout, climate and surroundings, landmarks, customs and beliefs, lasting relationships, and what a place or thing is like. Do NOT report plot events or actions that happen in the scene (those belong on the timeline), and do not report anything the writing only implies.

Finding kinds:
- match: the writing states something that agrees with a specific recorded detail. Set canonLabel and canonExcerpt.
- conflict: the writing states something that cannot be true at the same time as a specific recorded detail. Set canonLabel and canonExcerpt. Use conflict only for a real incompatibility. Added detail, a different emphasis, or a character acting differently under pressure is NOT a conflict. Set maybeDevelopment to true when the difference could plausibly be intentional change over time or circumstance (aging, growth, rebuilding after destruction, a different era).
- new_detail: the writing states something about the entry that the canon neither confirms nor contradicts. Every finding about a new entry is new_detail.

Rules for the text fields:
- quote: copy the author's words exactly, character for character, from the writing. One or two sentences at most, under 400 characters. Never paraphrase, summarize or fix spelling.
- canonExcerpt: copy the recorded words exactly, character for character, from the canon text for that entry. Empty string for new_detail.
- canonLabel: the exact name of the canon field the excerpt came from. Empty string for new_detail.
- label: a short field name of one to three words in Title Case, such as Appearance, Personality, Layout or Climate. Reuse an existing canon field name when the detail belongs under it.
- explanation: for a conflict, one plain sentence saying how the two differ. Empty string otherwise.
- entity: for a recorded entry, its slug. For a new entry, its exact name.

If you are unsure whether something is a conflict, do not report it as one. Report at most 40 findings and put conflicts first.`;

function formatEntity(e: EntityForCheck): string {
  const fields = Object.entries(e.fields)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `[${k}]\n${v.trim()}`)
    .join("\n\n");
  return `=== RECORDED ENTRY | slug: ${e.slug} | name: ${e.name} | type: ${e.type} ===\n${fields || "(no fields recorded yet)"}`;
}

function formatSnippet(s: SnippetForCheck): string {
  const where = s.sortOrder === null ? "unknown" : `${s.sortOrder} (Sero years, the same scale as the timeline)`;
  return `Timeline position of this writing: ${where}\n=== THE WRITING: ${s.title}${s.label ? ` (${s.label})` : ""} ===\n${s.body}`;
}

async function ask<S extends z.ZodType>(system: string, prompt: string, schema: S): Promise<z.infer<S>> {
  const { output } = await generateText({
    model: anthropic(MODEL),
    system,
    prompt,
    temperature: 0,
    output: Output.object({ schema }),
  });
  if (!output) throw new Error("The model returned no structured answer");
  return output as z.infer<S>;
}

export const aiAnalyzer: Analyzer = {
  detect({ snippet, index }) {
    const lines = index.map((e) => `${e.slug} | ${e.name} | ${e.type}`).join("\n");
    return ask(DETECT_SYSTEM, `=== INDEX OF RECORDED ENTRIES (slug | name | type) ===\n${lines || "(nothing recorded yet)"}\n\n${formatSnippet(snippet)}`, detectSchema);
  },
  compare({ snippet, mentioned, candidates }) {
    const recorded = mentioned.map(formatEntity).join("\n\n") || "(no recorded entries are mentioned)";
    const fresh = candidates.map((c) => `=== NEW ENTRY | name: ${c.name} | type: ${c.type} ===`).join("\n") || "(no new entries)";
    return ask(COMPARE_SYSTEM, `${recorded}\n\n${fresh}\n\n${formatSnippet(snippet)}`, compareSchema);
  },
};
