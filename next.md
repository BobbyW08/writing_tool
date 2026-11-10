# Next task

This file holds the instructions for the next phase/step/task in the build, in accordance
with `traveler-wiki-build-plan.md` and the rules in `CLAUDE.md`. Update it at the end of every
session: replace its contents with the instructions for whatever comes after.

## Where things stand (2026-11-09)

Every phase through Phase 5A is closed: Phase 5 (views), Phase 5A (steps U1-U6, working surfaces),
Phase 6 (Gaps view), Phase 7 (export and compilations), and Phase 8's search. The pre-existing
`/write/[code]` Lexical crash (Phase 4 gap #2) is fixed. Full detail for all of it is in
`BUILD_GUIDE.md`'s "Current state" and each phase's own section.

## Ask Bobby about these three before building anything else

There is no unblocked build work left — the only remaining items in the plan each need something
only Bobby can do. Don't work around any of these; raise them and wait.

1. **Apply the `compilations` migration.** It's generated
   (`db/migrations/0010_spicy_talisman.sql`, purely additive — a single `CREATE TABLE` plus two
   `CREATE INDEX` statements) but not applied. The harness denies `drizzle-kit migrate` against
   `APP_DATABASE_URL` outright as a production-deploy action — no approval prompt, unlike earlier
   migrations in this project. Bobby needs to run it himself:
   `node --env-file=.env.local node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.app.config.ts`
   `/compilations` 500s until this runs.
2. **Decide the Phase 8 login question.** The plan's Phase 8 line ("deploy to Vercel with a real
   single-user login") conflicts with `CLAUDE.md` hard rule 12 ("No login and no auth code,
   anywhere in this codebase"). No auth code has been written — hard rules win on conflict. Bobby
   needs to say which one is stale: either that plan line, or hard rule 12.
3. **Fix the Vercel AI Gateway billing block.** Every attempt fails with
   `customer_verification_required` even after Bobby said it was resolved (re-checked three times
   across sessions, including after a 90s wait for propagation) — this looks like an
   account/team-scoping mismatch between where a card was added and the team the
   `AI_GATEWAY_API_KEY` belongs to, not something retryable from here. This blocks S4 through S7
   (AI foundation, Story Builder, Ask AI and the prompts menu, canon check extensions) and
   Suggestions (the last open item in Phase 6).

## After those are resolved

- Once item 1 is done: nothing else to build for Phase 7: it's fully closed.
- Once item 2 is decided: either build the login (if hard rule 12 gets updated) or mark Phase 8
  fully closed as-is (if the plan line was stale) and switch from dev auto-push to real migrations
  for deploy, per that same Phase 8 line.
- Once item 3 is fixed: S4 (AI foundation on Claude — `lib/ai/`, the context builder on the link
  index, `ai_proposals`, `ai_settings`, the Accept/Reject inbox, the `AI suggested` tag) is next
  in the build order, then S5/S6 (Story Builder, Ask AI anywhere), then S7 (claims ledger,
  backward check, revert by source — also where Phase 4's documented "Draft never spreads into
  canon" gap gets closed).
- **Phase 9 (Cartographer Studio Design)** is explicitly scoped in the plan to start only once
  every phase above it is closed — so it's gated behind items 1 and 2 above, not ready yet even
  though it doesn't depend on the AI Gateway.

## Also still pending from before (not urgent, no new information)

Bobby wants Vercel wired to deploy automatically on every push to GitHub. Pick it up whenever —
it doesn't block anything above, and ties naturally into whatever Bobby decides for the Phase 8
deploy line.

1. Push this repo to GitHub (`origin` → `github.com/BobbyW08/writing_tool.git`, confirmed present
   in an earlier session via `git remote -v`) once Bobby has reviewed what's accumulated.
2. Connect Vercel to that GitHub repo if not already done (Vercel dashboard → this project →
   Settings → Git).
3. Confirm by making a trivial commit and push, then checking the Deployments tab for a new
   deployment that started on its own.

### When any of the three blockers above gets resolved

1. Check off the relevant items in `traveler-wiki-build-plan.md`.
2. Update `BUILD_GUIDE.md`: "Current state" and "Next up".
3. Add a new entry at the top of `SESSION.md`.
4. Replace this file (`next.md`) with the next task.
