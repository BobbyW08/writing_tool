"use server";

import { createEntityAction } from "@/lib/world/actions";

// Step UX3's "New story" panel (board 3). A title is optional -- a stub is fine, same as every
// other placeholder record (hard rule 4) -- and "Blank" is the only "Start from" option wired up
// so far; "An idea I already logged" and "AI suggests seed questions" stay visible but disabled
// until there is a real, rule-compliant source for them (no beats are logged as free-standing
// ideas yet, and seeding AI text into a field without Bobby's accept would break hard rule 1).
export async function createBlankStoryAction(title?: string): Promise<{ code?: string; error?: string }> {
  const name = title?.trim() || "Untitled story";
  const result = await createEntityAction("stories", { name });
  if (result.error || !result.code) return { error: result.error ?? "Could not create the story" };
  return { code: result.code };
}
