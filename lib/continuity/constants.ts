// Shared by server code and client components, so nothing here may import server-only modules.

export const ENTITY_DB_TYPES = ["character", "location", "item", "culture", "race", "language", "artifact"] as const;
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
  character: ["Appearance", "Personality", "Origin", "Role", "Relationships"],
  location: ["Appearance", "Layout", "Climate", "Population", "History", "Significance"],
  item: ["Appearance", "Origin", "Purpose", "Current holder"],
  culture: ["Government", "Beliefs", "Customs", "Relationships with other peoples"],
  race: ["Appearance", "Origins", "Customs"],
  language: ["Where it is spoken", "Writing", "Notable features"],
  artifact: ["Appearance", "Origin", "Properties", "Current location"],
};
