# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Task: step S7, wire the backward check into the data layer

Read "Steps S0 to S7" (item S7) in `traveler-wiki-build-plan.md` first. `lib/continuity/backward.ts`
already holds the pure comparison, tested in `scripts/test-continuity.ts`:
- `fieldWasReplaced(oldValue, newValue)`: true only when the new wording actually replaces the old
  (not when `appendToField` adds to it).
- `findStaleClaims({ changed, claims, alreadyFlagged })`: one `StaleFlag` per claim whose quote
  assumed wording a field no longer has, skipping anything in `alreadyFlagged`.

Nothing calls either function yet. This task wires them into the one place every coded table's field
changes go through: `updateFieldAction` and `updateDetailsAction` in `lib/world/actions.ts`.

### What to build
1. A new `lib/continuity/backward-check.ts` (or similar) exporting a function that, given a
   collection, entry id, and the field's label, old value and new value, does the following when
   `fieldWasReplaced` is true:
   - Reads the entry's claims from the `claims` table (`entryCollection`, `entryId`, `fieldLabel`),
     mapped to `ClaimRef`.
   - Reads existing `stale_claim` continuity flags for this entry (any status) and builds the
     `alreadyFlagged` set with `staleClaimKey`.
   - Calls `findStaleClaims` and, for each `StaleFlag`, inserts one `continuity` row: `kind:
     'stale_claim'`, `fieldLabel`, `existingExcerpt` = the field's new wording (what canon now says),
     `newQuote` = the claim's quote (the passage that assumed the old wording), `status: 'open'`,
     coded with `assignNextCode('Q')` like every other flag (see `lib/continuity/run-check.ts` for the
     pattern). Add `'stale_claim'` to the `FlagKind` type and to `UPDATE_KINDS` in
     `lib/continuity/constants.ts` (it is raised automatically, like `new_detail`, not a decision Bobby
     has to make before anything is applied) and a `KIND_LABELS` entry ("Stale claim" or similar).
2. Wire it into `updateFieldAction`: before the `appDb.update(...)`, read the field's current value
   (one select), and after the write, if the field is one `claims.fieldLabel` can reference (named
   columns like `summary`, not `details` — `updateDetailsAction` covers that), call the new function
   with the old and new value.
3. Wire it into `updateDetailsAction`: it already has the current `details` array (via `readDetails`)
   before calling `updateFieldAction('details', ...)`. Diff the incoming `details` against the current
   one by label (matching how `resolveLabel`/`appendToField` key rows in `run-check.ts`) to get a list
   of `ChangedField` (label, oldValue, newValue), and call the new function once per changed label.
4. A revert action for a `stale_claim` flag, alongside `acknowledgeFlagAction` (accept as outdated) in
   `lib/continuity/actions.ts`: `revertStaleClaimAction(flagCode)` that puts the named field or detail
   row back to the flag's recorded old value, the same way `revertHistoryRowAction` does, but keyed by
   the continuity flag (not a `continuityHistory` row) since this flag is raised outside a writing-save
   check. Guard it the same way: only revert if the field's current value still matches what triggered
   the flag, otherwise say it changed since and leave it alone.

### Tests first
Add cases to `scripts/test-continuity.ts` (or a new `scripts/test-backward-check.ts` if the DB-touching
parts need separating from the pure ones) covering: a field replaced with no claims (nothing happens),
a field replaced with one matching claim (one flag), two claims on the same field (two flags, each
revertible independently), a field *appended to* via `appendToField` (`fieldWasReplaced` false, no
flag), and a claim already flagged (not flagged again, matching `findStaleClaims`'s own test).

### Constraints
- Keep hard rules 1, 9 and 13. A stale-claim flag only ever surfaces a question for Bobby (edit the
  passage himself, accept it as outdated, or revert the canon change) — nothing here writes to a
  `writing` record.
- Do not touch the forward check (`buildPlan`, `lib/continuity/plan.ts`) or `compareSchema` — the
  Draft-vs-Locked priority split on those is a separate, later task (see below).
- No migration: `claims` and `continuity` already carry every column this needs. If one seems
  necessary, stop and ask.
- Run `npm run build` and `npm run test:continuity` after the wiring is in; run `npm run test:continuity`
  after the test cases are added, before the wiring, per TDD.

### When this is done
1. Check off S7's backward-check bullet in the plan's "Steps S0 to S7", add a working log entry, and
   note in the error log if anything unexpected turned up.
2. Re-read the changes against this task and `CLAUDE.md`'s hard rules.
3. Run `npm run build`, zero errors.
4. Replace this file with the next task: surfacing `stale_claim` flags in the `/continuity` inbox UI
   (it already renders `UPDATE_KINDS` flags generically; confirm the new kind's label, excerpt and
   revert button render sensibly, add a dedicated UI only if the generic rendering does not fit), then
   the Draft-vs-Locked priority split in `buildPlan`/`compareSchema`. Ask Bobby before starting UX1 or
   the Story Builder.

## Do not
Do not start UX1 to UX6, the Story Builder canvas (SB), story architecture (AR) or Phase 9. Do not
build the Draft-vs-Locked split or relative timing in this task. Do not add any file other than what
this task needs. Do not commit to Neon anything except through a migration Bobby applies by hand.
