# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Task: finish what step P0's audit found missing in S7

Read "Where things stand", "Steps S0 to S7" and "Step P0" in `traveler-wiki-build-plan.md` first.
Step P0 (audit, verify, commit and push) is done: `tsc`, build and all tests are clean, the link
index dry run found 66 links across 359 records, migrations 0011 to 0016 are confirmed already
applied to Neon, and the branch is confirmed already pushed through commit `3d9a762`. S4, S5 and S6
are confirmed done. S7 (canon check and change tracking) is partial. This task finishes it.

### What is already built (do not redo)
- The claims ledger: `recordClaims()` in `lib/continuity/run-check.ts`, one row per checkable fact,
  tagged with `sourceCanonState`.
- The forward check: conflicts and possible changes become Continuity inbox flags (`buildPlan` in
  `lib/continuity/plan.ts`).
- The label check: `checkEventLabelMismatch()` in `lib/world/actions.ts`, no AI, flags a `yearLabel`
  that disagrees with `startYear`.
- "Leaving Canon": `components/writing-history-panel.tsx` + `revertHistoryRowAction`, one click
  revert for an appended detail. Reverting a whole created record is deliberately not offered.

### What is missing (this task builds it)
1. **The backward check.** The data layer write function for every coded table should compare old
   and new values. When a field with dependent claims changes (an event year from 22 to 21), it
   opens a Continuity inbox flag listing every passage (via the `claims` table, which already
   records `writingId`, `entryCollection`, `entryId`, `fieldLabel` and `quote`) that assumed the old
   value. For each: edit the passage, accept it as outdated, or revert the change. Right now nothing
   reads `claims` except `recordClaims()` (writes) and the count shown next to the editor
   (`lib/continuity/queries.ts`).
2. **The forward check's Draft-vs-Locked priority split.** "A Draft that contradicts a Locked record
   is a flag. Two Drafts that disagree is a lower priority flag." `buildPlan`/`compareSchema` in
   `lib/continuity/plan.ts` and `lib/continuity/types.ts` carry no `canonState` for the conflicting
   side, so every conflict is raised the same way today. Add that distinction, keeping hard rule 1
   (nothing is applied without Bobby's decision).
3. **Relative timing.** "Two years after the arrival" can only be tracked if the link is a recorded
   relationship between events. The check should propose recording it when it finds one. Not built
   at all yet; add it if 1 and 2 leave room, otherwise note it as still open.

### Constraints
- Keep hard rule 1: the AI never writes prose, only proposals; the one automatic write stays the
  continuity check writing verbatim quotes tagged UNK.
- Reuse the existing `continuity`, `continuityHistory` and `claims` tables. Do not add a new table
  unless the audit's confirmed shape genuinely cannot hold this (it likely can).
- Follow TDD (`superpowers:test-driven-development`) for the comparison logic, the same way
  `scripts/test-continuity.ts` tests `buildPlan` today — extend that script rather than starting a
  new one, unless the new logic is clearly a separate concern.
- `npm run build` must pass with zero errors before you are done (hard rule 11). If Next.js shows its
  security-advisory nudge, retry the same build command once, per CLAUDE.md's "heed deprecation
  notices" note — that is expected on this version, not a real failure.

### When this is done
1. Check off the relevant item in "Steps S0 to S7" (S7) in the plan, record what was built and
   where, and log anything learned in the working log.
2. Re-read the changes and recheck this task and `CLAUDE.md`'s hard rules.
3. Run `npm run build`, zero errors.
4. Replace this file with the next task. Ask Bobby before starting the Story Builder canvas (step
   SB), story architecture (step AR), or anything in Phase 9 — none of those are authorized yet.

## Do not
Do not start the Story Builder canvas, story architecture (AR) or Phase 9. Do not add any file other
than what this task needs. Do not commit to Neon anything except through a migration Bobby applies by
hand — this task can generate a migration file but must not run `drizzle-kit migrate`.
