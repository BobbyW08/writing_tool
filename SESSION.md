# Session context

Paste this into a new session alongside CLAUDE.md to get a model up to speed.

## Last session (2026-11-08)

Completed REBUILD_HANDOFF.md Parts 7 and 8:

- **Part 7:** Stripped Payload CMS entirely. Deleted `app/(payload)/`, all `collections/`,
  `payload.config.ts`, `payload-types.ts`, `payload-starter/`, the old `drizzle/` migrations,
  `lib/db/`, `lib/data/`, `lib/actions/`, `lib/ingest/`, and all migration/import scripts.
  Fixed `lib/continuity/plan.ts` import, installed `@lexical/headless@0.50.0`.
  `npm run build` passes zero errors, 21 routes.

- **Part 8:** Rewrote all four ruling docs (`CLAUDE.md`, `BUILD_GUIDE.md`,
  `traveler-wiki-build-plan.md`, `docs/PLAN_WRITING_AND_AI.md`) to describe only the current
  stack: Next.js, Drizzle, Neon, `lib/world/` data layer, no admin, no login.

- **Cleaned up docs:** Deleted all old handoff and gate report files. Replaced them with
  `SESSION.md` (this file) and `next.md` (task instructions).

Committed: `5bef6fc` on `master`.

## What is next

See `next.md` for the full instructions. In short:

1. **Phase 3 closure.** Browser smoke-check: load every route, confirm nav links work, confirm
   data loads from `appDb`. Mark Phase 3 items in `traveler-wiki-build-plan.md` as done.
   Update `BUILD_GUIDE.md` and this file when done.

2. **G1, the link index.** After Phase 3 closure. Do not start G1 until closure is confirmed.

## Stack reference (quick)

| Thing | Where |
|---|---|
| Active database | `APP_DATABASE_URL` on Neon, `appDb` from `db/index.ts` |
| Schema | `db/schema.ts` |
| Queries and actions | `lib/world/queries.ts`, `lib/world/actions.ts` |
| Lexical packages | All at `0.50.0` |
| Routes | All in `app/(app)/` |
| No login, no admin | Anywhere in this codebase |
