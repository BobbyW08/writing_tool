# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Task: step S7, finish the backward check's UI, then the Draft-vs-Locked split

The backward check itself is done (`lib/continuity/backward.ts`, `lib/continuity/backward-check.ts`,
wired into `updateDetailsAction`, `revertStaleClaimAction`, `stale_claim` in `UPDATE_KINDS`; see the
working log entry "step S7, wired the backward check into the data layer"). This task finishes what it
left open, in order, one commit each.

### Part 1: `stale_claim` in the `/continuity` inbox
`app/(app)/continuity/page.tsx`'s "Added to canon" tab already renders every `UPDATE_KINDS` flag
generically (`KIND_LABELS[f.kind]` badge, entry link, `"{f.newQuote}"`), with a kind-specific action:
`new_detail` gets `UndoDetailButton` (`undoNewDetailAction`). Check whether the generic rendering
already reads sensibly for `stale_claim` (its `newQuote` is the stale passage's quote, its
`fieldLabel` is set, its `existingExcerpt`/`explanation` are not currently shown there) and whether
Bobby can tell, from the inbox alone, which canon field changed and to what. If not, add a
`stale_claim`-specific line (what the field now says, from `explanation`) the way `new_detail` gets
its own `fieldLabel` line. Add a `RevertStaleClaimButton` (or similar, mirroring `UndoDetailButton`)
wired to `revertStaleClaimAction`, shown only when `f.kind === 'stale_claim'`. Use Playwright for the
front-end verification: change a details field on a canon entry that has a claim against it (or set
one up), confirm the flag appears in the inbox with working Accept and Revert actions, and confirm
Revert is correctly refused if the field changed again since.

### Part 2: Draft-vs-Locked priority split
`buildPlan`/`compareSchema` (`lib/continuity/plan.ts`) carry no `canonState` of the conflicting side,
so every conflict is raised the same way regardless of source. Add it: a conflict against an entry (or
field) whose `canonState`/`status` is Locked should be prioritized over one where both sides are Draft.
Read "Steps S0 to S7" (item S7) and "The AI layer" in `traveler-wiki-build-plan.md` for what `canonState`
values exist and where they are read from today. Write the comparison as a pure function with tests
first (`scripts/test-continuity.ts`), the same way `fieldWasReplaced` was built.

### Constraints
- Keep hard rules 1, 9, 13 and 21 (arc/theme/scope links are optional and never block a save — not
  relevant to this task directly, but the same "never block a save" spirit applies to any new check).
- No migration. If one seems necessary, stop and ask.
- Run `npm run build` and `npm run test:continuity` after each part.
- Relative timing (proposing a recorded relationship from "two years after") stays optional, not part
  of this task.

### When this is done
1. Mark S7 fully done ([x]) in "Steps S0 to S7", add a working log entry, update row 11 of the roadmap
   table.
2. Re-read the changes against this task and `CLAUDE.md`'s hard rules.
3. Run `npm run build`, zero errors.
4. Ask Bobby before starting UX1 or the Story Builder — both are next in the roadmap table but neither
   is authorized by this file.

## Do not
Do not start UX1 to UX6, the Story Builder canvas (SB), story architecture (AR) or Phase 9. Do not
build relative timing in this task. Do not add any file other than what this task needs. Do not commit
to Neon anything except through a migration Bobby applies by hand.
