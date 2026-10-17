import { z } from "zod";
import { ENTITY_DB_TYPES } from "./constants";

// What the model is asked to return. Empty strings stand in for "none" so the schema
// stays simple for structured output.
export const detectSchema = z.object({
  mentioned: z.array(z.object({ slug: z.string() })),
  newEntities: z.array(z.object({ name: z.string(), type: z.enum(ENTITY_DB_TYPES) })),
});
export type DetectResult = z.infer<typeof detectSchema>;

export const compareSchema = z.object({
  findings: z.array(
    z.object({
      entity: z.string(), // slug of a recorded entry, or the exact name of a new entry
      kind: z.enum(["match", "conflict", "new_detail"]),
      label: z.string(), // short field name for the detail, e.g. "Appearance"
      quote: z.string(), // exact words from the writing
      canonLabel: z.string(), // match and conflict: the canon field it relates to, else ""
      canonExcerpt: z.string(), // match and conflict: exact words from that canon field, else ""
      explanation: z.string(), // conflict: one sentence on how they differ, else ""
      maybeDevelopment: z.boolean(), // conflict: could be intentional change over time
    }),
  ),
});
export type CompareResult = z.infer<typeof compareSchema>;
export type Finding = CompareResult["findings"][number];

export interface EntityForCheck {
  id: string;
  slug: string;
  name: string;
  type: string;
  fields: Record<string, string>;
}

export interface SnippetForCheck {
  title: string;
  label: string | null;
  body: string;
  sortOrder: number | null;
}
