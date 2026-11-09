# Next task

This file holds the instructions for the next phase/step/task in the build, in accordance
with `traveler-wiki-build-plan.md` and the rules in `CLAUDE.md`. Update it at the end of every
session: replace its contents with the instructions for whatever comes after.

## Do this too, once the current task below is finished

Bobby wants Vercel wired to deploy automatically on every push to GitHub. Not urgent, but
do not forget it. Pick it up after whatever task is in progress completes.

**Current state:** this repo has no GitHub remote configured yet (checked 2026-11-08,
`git remote -v` was empty). So this is two steps, not one.

1. **Push this repo to GitHub.** If Bobby hasn't already created a GitHub repo for this,
   ask him for the repo URL (or whether to create one), then `git remote add origin <url>`
   and `git push -u origin master`.
2. **Connect Vercel to that GitHub repo.** Vercel dashboard, this project, Settings, Git.
   Connect the GitHub repository. Once connected, Vercel auto-deploys on every push to the
   production branch (`master`) and creates a preview deployment for every other branch and
   PR, with no further setup.
3. Confirm by making a trivial commit and push, then checking the Deployments tab for a new
   deployment that started on its own.


## Task: Phase 4, the continuity check port

G1 (the link index) is done — checked off in `traveler-wiki-build-plan.md`, verified against live
data 2026-11-08. This is a new build step, not a verification pass — **ask Bobby before starting
it**, same as G1 was.

From `traveler-wiki-build-plan.md`'s "Phase 4: Continuity check port" (under "Build order", item
5) and `docs/PLAN_WRITING_AND_AI.md`'s "S7. Canon check and change tracking":

- [ ] Rewrite `run-check.ts`, its actions and its data queries on the data layer (`appDb`,
      `lib/world/` / `lib/studio/` conventions) — keep the pure files (the parts of `lib/continuity/`
      that don't touch Payload) as-is.
- [ ] Rewire the Continuity inbox, review screen, entry field history, and the sidebar badge
      (currently stubbed — see `app/(app)/continuity/` and `components/continuity-badge.tsx`).
- [ ] Run `npm run test:continuity`, then a first real writing check against live data, then tune
      prompts.
- [ ] Confirm the hard rule still holds end to end: automatic writes are **verbatim quotes of
      Bobby's own text only**, never AI-written prose, each new addition shows up in the inbox with
      an Undo, every automatic record is tagged `UNK`, and anything that contradicts canon is never
      applied without his explicit decision (CLAUDE.md hard rule 1).
- [ ] Confirm the link index sync (G1) fires correctly when the continuity check creates a new
      `in_development` record or adds a detail — it should go through the same
      `lib/world/actions.ts` / `lib/studio/actions.ts` write functions G1 already wired, not a
      separate path that bypasses `syncLinksForRecord`.

Read `docs/PLAN_WRITING_AND_AI.md` in full before starting (the continuity check, AI layer, and
canon check are specified there, not in `traveler-wiki-build-plan.md`).

### When this is done

1. Check off the Phase 4 items in `traveler-wiki-build-plan.md`.
2. Update `BUILD_GUIDE.md`: "Current state" and "Next up".
3. Update `SESSION.md` with what was done this session.
4. Replace this file (`next.md`) with the Phase 5 task (views: filter, convergence, node map,
   relationship view, story board — all built on the G1 link index).

Build order after Phase 4: Phase 5 (views) and step S3/W2, per the table in
`traveler-wiki-build-plan.md`.
