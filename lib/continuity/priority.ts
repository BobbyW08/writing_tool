export type ConflictPriority = "high" | "normal";

// Step S7's Draft-vs-Locked split: a conflict against a Locked entry needs a decision before one
// where the entry is still being worked out (in_development, needs_name, placeholder) and
// disagreement is unsurprising. Computed from the entry's current status, not a snapshot taken
// when the flag was raised, so it reflects what canon says now.
export function conflictPriority(entryStatus: string): ConflictPriority {
  return entryStatus === "locked" ? "high" : "normal";
}
