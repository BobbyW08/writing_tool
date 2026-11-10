# Next task

This file holds the instructions for the next phase/step/task in the build, in accordance
with `traveler-wiki-build-plan.md` and the rules in `CLAUDE.md`. Update it at the end of every
session: replace its contents with the instructions for whatever comes after.

## Where things stand (2026-11-10)

Every phase through Phase 8 is closed. Phase 7 (export and compilations) is fully closed: the
`compilations` migration was applied by Bobby by hand and `/compilations` is confirmed live. Phase
8's search and login lines are both closed: login is a single shared password gate (`proxy.ts` +
`/api/login` against `APP_SECRET`/`APP_PASSWORD`), `CLAUDE.md` hard rule 12 updated to describe it
as the one sanctioned exception to "no auth code." The gate hit one real bug — Next.js 16's strict
route matching flagged `/login` over an unrelated `@modal` parallel-route slot in `(app)/layout.tsx`
— fixed via `deprecated.looseRouteMatching: true` in `next.config.mjs` (Next's own documented
escape hatch for this exact false positive). `npm run build` is clean and the full flow (wrong
password, correct password, cookie, authenticated access, unauthenticated redirect) is verified
working, not just written. Phase 8's *other* half (switching off dev auto-push to real migrations
before deploy) is still open — see below.

## Three loose ends, not blocking S4, don't lose track of these

1. **Confirm U4/U6 drag-and-drop by hand.** The record-popup editing (U4) and story board (U6)
   drag gestures were built and verified by reading the code, but browser automation couldn't
   exercise dnd-kit's drag start under simulated pointer input, so neither has actually been
   clicked and dragged by a human yet. Try both in the browser; if either doesn't work, flag it
   here before building anything else on top of Phase 5A.
2. **Switch from dev auto-push to real migrations before deploy.** Half of the old Phase 8 deploy
   line. Still unstarted. Low priority, but shouldn't get lost now that the login half is done.
3. **Suggestions (last open item in Phase 6)** is still blocked on the same AI Gateway question as
   S4 below — once the Gateway is confirmed working, Suggestions and S4 unblock together.

## One thing to confirm before S4 can start

The Vercel AI Gateway billing block (`customer_verification_required`) was blocking S4 through
S7. Since the last entry, Bobby found the project's Framework Preset was set to "Other" instead
of "Next.js" (an unrelated misconfiguration causing a `STATIC_BUILD_NO_OUT_DIR` build failure),
fixed that, and separately updated `AI_GATEWAY_API_KEY` (it had been blank). The build now
succeeds. **Not yet confirmed: whether an actual Gateway call succeeds end to end** — the billing
error was never directly retested after both fixes. Before starting S4, make one live call
through `lib/ai/` (or the smallest thing that exercises the Gateway) and confirm it doesn't return
`customer_verification_required`. If it still fails, stop and flag it. Don't build S4 against an
unconfirmed Gateway.

## Next unblocked build step: S4

Once the Gateway is confirmed, build S4 (AI foundation on Claude — `lib/ai/`, the context builder
on the link index, `ai_proposals`, `ai_settings`, the Accept/Reject inbox, the `AI suggested`
tag), then S5/S6 (Story Builder, Ask AI anywhere), then S7 (claims ledger, backward check, revert
by source — also where Phase 4's documented "Draft never spreads into canon" gap gets closed).

**Phase 9 (Cartographer Studio Design) is last in the build order (item 16 of 16)**, gated on
every item above it closing, not just the login/migration/billing items. W3 through W6 (maps,
chronicles, boards, tables) are already built out of the table's listed order, which the plan
explicitly allows — but S4 through S7 are not built yet. Do not start Phase 9 before S4–S7 are
done.

## Also still pending from before (not urgent, no new information)

Bobby wants Vercel wired to deploy automatically on every push to GitHub. Pick it up whenever —
it doesn't block anything above.

1. Push this repo to GitHub (`origin` → `github.com/BobbyW08/writing_tool.git`, confirmed present
   in an earlier session via `git remote -v`) once Bobby has reviewed what's accumulated.
2. Connect Vercel to that GitHub repo if not already done (Vercel dashboard → this project →
   Settings → Git).
3. Confirm by making a trivial commit and push, then checking the Deployments tab for a new
   deployment that started on its own.

### When the Gateway is confirmed and S4 is built

1. Check off S4 in `traveler-wiki-build-plan.md`.
2. Update `BUILD_GUIDE.md`: "Current state" and "Next up".
3. Add a new entry at the top of `SESSION.md`.
4. Replace this file (`next.md`) with the next task (S5).
