# Next task

This file holds the instructions for the next phase/step/task in the build, in accordance
with `traveler-wiki-build-plan.md` and the rules in `CLAUDE.md`. Update it at the end of every
session: replace its contents with the instructions for whatever comes after.

## Do this first: two things found during Phase 4, neither fixed yet

Both are flagged in detail in `BUILD_GUIDE.md`'s "Phase 4" section and
`traveler-wiki-build-plan.md`'s Phase 4 checklist. Neither blocks starting Phase 5, but both
block actually using the continuity check or the Writing Studio day to day, so raise them with
Bobby before or alongside starting Phase 5 — don't silently work around either.

1. **The Vercel account's AI Gateway has no credit card on file.** A real continuity check
   against live writing (W3) ran the whole pipeline correctly and failed only at the network
   call, with this message (also stored verbatim on the writing's `checkError`):
   "AI Gateway requires a valid credit card on file to service requests." The fix is entirely
   account-side (Bobby adding a card in the Vercel dashboard); there's nothing to build.
2. **Pre-existing bug, found while testing Phase 4, not caused by it**: opening any
   `/write/[code]` editor page (confirmed on both W1 and W3) throws a Lexical error #173
   cascading from a React #418 hydration mismatch, in the browser console. The page may render
   broken or the tab may hang. Likely cause: the editor's
   `editorState: () => $convertFromMarkdownString(record.text ?? '', TRANSFORMERS)` initializer
   in `app/(app)/write/[code]/editor.tsx` producing a different tree client-side than SSR
   rendered — a classic Lexical+SSR hydration issue. Not investigated further this session
   (out of Phase 4's scope). Whoever picks this up should reproduce it first (it's not
   browser-automation flakiness — confirmed via `read_console_messages`, not just a screenshot
   timeout) before deciding on a fix.

## Task: Phase 5 (views) and step S3 / W2

G1 (the link index) and Phase 4 (the continuity check port) are both done — checked off in
`traveler-wiki-build-plan.md`. This is a new build step, not a verification pass — **ask Bobby
before starting it**, same as G1 and Phase 4 were.

From `traveler-wiki-build-plan.md`'s "Phase 5: Views" (under "Build order", item 6) and
"Step W2: eras and the timeline canvas":

- [ ] Sidebar multi-select filter (`shadcn-multi-select-component`).
- [ ] Multi-lane convergence view (`i-storyline-js` for layout math, custom SVG render — see the
      "Multi-lane convergence view" note around line 496 of the build plan for the braiding
      behavior).
- [ ] Node map and per-entry relationship view, built on React Flow, reading the G1 link index
      (`lib/graph/queries.ts`) — **not** by hand-querying relationship columns. Every visual
      feature shares the one `Graph`/`Node`/`Edge` shape in `lib/graph/types.ts` (hard rule 15).
- [ ] Story board (for beats — note `beats` itself is a later step, S5; the board surface can be
      built now against the same `lib/graph/types.ts` shape it will need then).
- [ ] Timeline polish: two-tier header for wide zoom; decide whether sub-events hide until zoom.
- [ ] Step W2: spike `react-calendar-timeline` for era bands + 11 lanes first (fall back to
      hand-rolling the single-line view with `lib/timeline-scale.ts` if it can't). `eras` table
      (prefix Y, already reserved in `lib/codes.ts`), a `timeline-settings` global, and new event
      fields `eventType`/`importance`/`lane`. Era bands with background images, lanes, mini-map,
      search/filter. Click empty space to add an event at that year; time gaps.

Read `traveler-wiki-build-plan.md`'s full "Link index" section and `lib/graph/types.ts` before
starting — every new view here is a consumer of G1, not a new data path of its own.

### When this is done

1. Check off the Phase 5 / W2 items in `traveler-wiki-build-plan.md`.
2. Update `BUILD_GUIDE.md`: "Current state" and "Next up".
3. Update `SESSION.md` with what was done this session.
4. Replace this file (`next.md`) with the next task (S4, the AI foundation, per the build order —
   unless Bobby wants W3-W6 reordered ahead of it, which the plan explicitly allows).

Build order after Phase 5 / W2: S4 (AI foundation on Claude, item 7), then S5/S6 (Story Builder,
Ask AI), then S7 (claims ledger, backward check, revert by source — this is also where Phase 4's
documented "Draft writing never spreads into canon" gap gets closed), per the table in
`traveler-wiki-build-plan.md`. Items 11-14 (W3-W6: maps, chronicles, boards, tables) can be
reordered ahead of S4-S7 if Bobby prefers — the plan only requires items 1-5 (now all done) to
stay first.

## Also still pending from before (not urgent)

Bobby wants Vercel wired to deploy automatically on every push to GitHub. Pick it up whenever —
it doesn't block anything above.

1. **Push this repo to GitHub.** The remote already exists
   (`origin` → `github.com/BobbyW08/writing_tool.git`, checked this session via `git remote -v`).
   `master` is currently 1 commit ahead of `origin/master` (the G1 commit) with Phase 4's changes
   still uncommitted on top — push once those are committed and Bobby has reviewed them
   (`git push -u origin master` if the upstream link needs re-establishing, else plain `git push`).
2. **Connect Vercel to that GitHub repo**, if not already done — check the Vercel dashboard,
   this project, Settings, Git first. If connected, Vercel auto-deploys on every push to the
   production branch (`master`) and creates a preview deployment for every other branch and PR.
3. Confirm by making a trivial commit and push, then checking the Deployments tab for a new
   deployment that started on its own.
