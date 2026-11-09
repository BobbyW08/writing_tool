// Shared by server code and client components, so nothing here may import server-only modules.

import { WORLD_SLUGS } from "@/lib/codes";

// The 8 world collections a continuity check compares writing against. Matches the
// collection slugs used everywhere else in the app (table names, route segments).
export const ENTITY_DB_TYPES = WORLD_SLUGS;
export type EntityDbType = (typeof ENTITY_DB_TYPES)[number];

export type FlagKind = "conflict" | "possible_change" | "new_record" | "new_detail";

// Conflicts need a decision. New records and new details are applied automatically and
// only need to be acknowledged (or undone).
export const DECISION_KINDS: FlagKind[] = ["conflict", "possible_change"];
export const UPDATE_KINDS: FlagKind[] = ["new_record", "new_detail"];

export type ResolutionChoice = "keep_canon" | "update_canon" | "both_true" | "changed_over_time" | "decide_later";

export const CHOICE_LABELS: Record<string, string> = {
  keep_canon: "Kept canon",
  update_canon: "Updated canon",
  both_true: "Both are true",
  changed_over_time: "Changed over time",
  decide_later: "Decide later",
  acknowledged: "Acknowledged",
  undone: "Undone",
};

export const KIND_LABELS: Record<string, string> = {
  conflict: "Conflict",
  possible_change: "Possible change",
  new_record: "New record",
  new_detail: "New detail",
};

// What each kind of entity usually needs described. Used only to word the gap prompt on
// a record that was created automatically from a snippet.
export const EXPECTED_LABELS: Record<EntityDbType, string[]> = {
  characters: ["Appearance", "Personality", "Origin", "Role", "Relationships"],
  locations: ["Appearance", "Layout", "Climate", "Population", "History", "Significance"],
  items: ["Appearance", "Origin", "Purpose", "Current holder"],
  cultures: ["Government", "Beliefs", "Customs", "Relationships with other peoples"],
  factions: ["Purpose", "Leadership", "Membership", "Relationships with other factions"],
  races: ["Appearance", "Origins", "Customs"],
  languages: ["Where it is spoken", "Writing", "Notable features"],
  lore: ["What it is", "Origin", "Significance"],
};
