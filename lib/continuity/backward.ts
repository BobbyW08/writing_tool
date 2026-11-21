import { containsText, normalizeForCompare } from "./text";

// The backward check (step S7): the data layer write function for every coded table calls
// this when it overwrites a canon field's wording, so a claim an earlier piece of writing
// made about the old wording does not go stale silently.

export interface ClaimRef {
  writingId: number;
  fieldLabel: string;
  quote: string;
}

export interface ChangedField {
  label: string;
  oldValue: string;
  newValue: string;
}

export interface StaleFlag {
  writingId: number;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  quote: string;
}

// True only when the new wording actually replaces the old, not when it is added to.
// `appendToField` always keeps the old text as a prefix, so an addition still contains it;
// only a real replacement can make an earlier claim stale.
export function fieldWasReplaced(oldValue: string, newValue: string): boolean {
  const oldTrimmed = oldValue.trim();
  if (!oldTrimmed) return false;
  if (normalizeForCompare(oldTrimmed) === normalizeForCompare(newValue.trim())) return false;
  return !containsText(newValue, oldTrimmed);
}

// The one entry point the data layer calls when it writes a new details array: diffs it against
// the entry's current details by label and returns only the rows that were genuinely replaced
// (never a brand new row, which had no old value to have been assumed, and never a row that was
// only appended to).
export function changedReplacedFields(
  before: { label: string; value: string }[],
  after: { label: string; value: string }[],
): ChangedField[] {
  const beforeByLabel = new Map(before.map((r) => [r.label.trim().toLowerCase(), r]));
  const out: ChangedField[] = [];
  for (const afterRow of after) {
    const beforeRow = beforeByLabel.get(afterRow.label.trim().toLowerCase());
    if (!beforeRow) continue;
    if (fieldWasReplaced(beforeRow.value, afterRow.value)) {
      out.push({ label: beforeRow.label, oldValue: beforeRow.value, newValue: afterRow.value });
    }
  }
  return out;
}

export function staleClaimKey(writingId: number, fieldLabel: string, quote: string): string {
  return `${writingId}|${fieldLabel.trim().toLowerCase()}|${normalizeForCompare(quote)}`;
}

// One flag per claim that assumed wording a field no longer has. `alreadyFlagged` carries
// every stale-claim key already raised for this entry (any status), so a later revert that
// changes the field again never raises the same claim twice.
export function findStaleClaims(input: {
  changed: ChangedField[];
  claims: ClaimRef[];
  alreadyFlagged: Set<string>;
}): StaleFlag[] {
  const changedByLabel = new Map(input.changed.map((c) => [c.label.trim().toLowerCase(), c]));
  const out: StaleFlag[] = [];
  const seen = new Set<string>();
  for (const claim of input.claims) {
    const change = changedByLabel.get(claim.fieldLabel.trim().toLowerCase());
    if (!change) continue;
    const key = staleClaimKey(claim.writingId, claim.fieldLabel, claim.quote);
    if (input.alreadyFlagged.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({
      writingId: claim.writingId,
      fieldLabel: claim.fieldLabel,
      oldValue: change.oldValue,
      newValue: change.newValue,
      quote: claim.quote,
    });
  }
  return out;
}
