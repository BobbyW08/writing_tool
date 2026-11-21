# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Status: UX1 (Home launcher) is done. Next: UX2 (type page with the AI gap finder).

The Next.js 16.4.2 → 16.4.6 security upgrade is merged into this branch (commit `d3581d0`); the
isolated worktree and its branch are gone.

UX1 is done as of 2026-11-21: `lib/gaps/` (deterministic, tested gap ranking in `rank.ts`, DB
candidates in `queries.ts`, AI wording in `actions.ts`), `GapRecommender`
(`components/gap-recommender.tsx`, built reusable for UX2), `getCollectionNeedsAttentionCount` in
`lib/world/queries.ts`, and `app/(app)/page.tsx` rewritten to the five-card "What do you want to work
on?" launcher. Verified live via Playwright; `npm run build` and `npm run test:gaps` are clean. See
the working log entry "Next.js worktree merge, then step UX1 (Home launcher)" for detail.

**UX2: Type page with the AI gap finder (board 2, `TypePage.dc.html`).** Per the plan: "reuses the
UX1 ranking, filtered to this type first, and Open it can leave the type page when the biggest gap is
elsewhere." Concretely:
- Add an optional filter to `computeGapCandidates()`/`rankGaps()` (or a thin wrapper) so a type page
  can ask for gaps in its own collection first, falling back to the global ranking so the panel is
  never empty on a collection with no open gaps of its own.
- Reuse `<GapRecommender />` on each type page (`/characters`, `/locations`, etc.) rather than
  building a second panel; pass it the collection to filter by.
- Match board 2's layout from the wireframe canvas (already read into context this session: a filter
  bar, the entry list, and the gap panel). Read `project/TypePage.dc.html` again from the "Story
  Builder Wireframes" artifact if needed.
- The old per-collection card gallery that used to live on Home (now replaced by UX1) does not need
  to move anywhere new — each type page already has its own entry list; this step only adds the gap
  panel to it.

After UX2: UX3 (stories picker, boards 3-4), UX4 (Review screen, board 6), UX5 (editor panel
placement, board 7), UX6 (entry header, board 9) remain, in that order, per the Step UX checklist.

## Do not
Do not start the Story Builder canvas (SB), story architecture (AR) or Phase 9 without Bobby's
go-ahead — UX1 to UX6 is the authorized scope for now. Do not add any file beyond what UX2 needs.
