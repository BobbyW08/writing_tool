# Next task

This file holds the instructions for the next phase/step/task in the build, in accordance
with `traveler-wiki-build-plan.md` and the rules in `CLAUDE.md`. Update it at the end of every
session: replace its contents with the instructions for whatever comes after.

## Task: Phase 3 closure

`traveler-wiki-build-plan.md`, Phase 3, has these items. Confirm each one, check it off in that
file, and fix anything that fails before moving on.

- [ ] UNK marker shows on every list and read page, and the review queue page
      (`/review`) works.
- [ ] Home, entry read pages (`/[entityType]/[slug]`), and event read pages
      (`/events/[slug]`) read from the data layer (`lib/world/queries.ts`) and link IDs
      correctly (ID-code linkification: `C12`, `E4`, etc. render as working links).
- [ ] Timeline (`/timeline`) reads and writes `startYear` through the data layer.
- [x] Old forms, actions, data layer, database code and legacy dependencies removed.
      Done in Part 7 of the Payload removal.

### How to verify

1. Do not start or restart the dev server (hard rule). If it is already running on port 3000,
   use it. Otherwise this check can run against a production build on port 3001
   (`npm run build`, then `npm run start`, per the hard rule that production timing runs use
   port 3001 only).
2. Visit every top-level route and every entity type's list and read page. Confirm:
   - The page loads with no error.
   - Data shown matches what is in `appDb` (spot check a couple of records).
   - Nav links in the sidebar (`components/app-sidebar.tsx`) all resolve.
   - Any reference to another entity (a relationship, a mention) renders as a working link,
     not a bare code or a dead link.
3. Note anything broken. Fix before marking Phase 3 closed.

### When this is done

1. Check off the Phase 3 items above in `traveler-wiki-build-plan.md`.
2. Update `BUILD_GUIDE.md`: "Current state" becomes "Phase 3 closed, verified in browser. G1
   is next." and "Next up" drops the Phase 3 closure line.
3. Update `SESSION.md` with what was done this session.
4. Replace this file (`next.md`) with the G1 task below.
5. Ask before starting G1 itself, since it is a new build step, not a verification pass.

---

## Queued next: G1, the link index

Do not start this until Phase 3 closure above is done and checked off.

From `traveler-wiki-build-plan.md` ("Build order", item 4): the link index backs every later
view (node map, relationship view, convergence view) and the AI context builder. It needs
Phase 3 done first because it indexes what Phase 3's pages already read and display.

Read the "Link index" section of `traveler-wiki-build-plan.md` in full before starting. It
covers:

- The `links` table shape.
- Which write functions in `lib/world/actions.ts` need to call the sync function (the sync now
  runs inside the data layer's write functions, not in a hook, per the Payload removal).
- The graph endpoints and the "What links here" feature it enables.

Build order after G1: Phase 4 (continuity check port), then Phase 5 (views), per the table in
`traveler-wiki-build-plan.md`.
