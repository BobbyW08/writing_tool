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


## Task: G1, the link index

Phase 3 closure is done (checked off in `traveler-wiki-build-plan.md`, verified in browser
2026-11-08). This is a new build step, not a verification pass — **ask Bobby before starting it.**

From `traveler-wiki-build-plan.md` ("Build order", item 4): the link index backs every later
view (node map, relationship view, convergence view) and the AI context builder. It needs
Phase 3 done first because it indexes what Phase 3's pages already read and display.

Read the "Link index" section of `traveler-wiki-build-plan.md` in full before starting. It
covers:

- The `links` table shape.
- Which write functions in `lib/world/actions.ts` need to call the sync function (the sync runs
  inside the data layer's write functions, not in a hook, per the Payload removal).
- The graph endpoints and the "What links here" feature it enables.

See the "Step G1: link index" section of `traveler-wiki-build-plan.md` for the detailed task
checklist, including the new code prefixes (B, Y, M, P, H, D, N, A) that need adding to
`lib/codes.ts` first.

### When this is done

1. Check off the G1 items in `traveler-wiki-build-plan.md`.
2. Update `BUILD_GUIDE.md`: "Current state" and "Next up".
3. Update `SESSION.md` with what was done this session.
4. Replace this file (`next.md`) with the Phase 4 task (continuity check port).

Build order after G1: Phase 4 (continuity check port), then Phase 5 (views), per the table in
`traveler-wiki-build-plan.md`.
