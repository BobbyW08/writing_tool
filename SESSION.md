# Session context

Paste this into a new session alongside CLAUDE.md to get a model up to speed.

## Last session (2026-11-08c): G1, the link index

Built the whole link index per `traveler-wiki-build-plan.md`'s "Link index" section and "Step G1"
checklist (all boxes now checked there): new code prefixes, `hierarchy`/`follows`/`offsetYears`,
the `links` table, `lib/graph/` (`types.ts`, `labels.ts`, `extract.ts`, `sync.ts`, `queries.ts`),
sync calls wired into every coded write path in `lib/world/actions.ts` and `lib/studio/actions.ts`,
`scripts/rebuild-links.ts`, the six graph/codes API endpoints, a "What links here" component on
all three read pages, and a `/link-health` page.

Verified against live data: `npm run build` passes zero errors (27 routes); `rebuild-links.ts`
dry run matched `--apply`, and two consecutive `--apply` runs produced identical counts (field 51,
relationship 6 — exactly matching the live X-record count, text 2, total 59 across 355 records);
a scripted create/delete/resync test confirmed a text mention creates a row, deleting its target
marks that row broken without touching anything else, and a resync clears a stale broken row
rather than resurrecting it. Full design-decision list in `BUILD_GUIDE.md`'s "Current state" > "G1".

One permission was asked and granted mid-session: applying the additive migration (`links` table
+ `relationships.offset_years`) to the live `APP_DATABASE_URL`, since the harness flags
`drizzle-kit migrate` as a production-deploy action.

Committed: not yet — pending user review of this session's changes.

## Previous session (2026-11-08b): Phase 3 closure

Ran the Phase 3 closure browser checklist against a production build (`npm run build` +
`npm run start -p 3001`; nothing was listening on port 3000, so no dev server was touched).
All checklist items verified and checked off in `traveler-wiki-build-plan.md`.

Found and fixed three real bugs along the way (details in `BUILD_GUIDE.md`):
1. UNK badge visibility was non-deterministic (uninitialized cache, order-dependent on which
   page loaded first in a server process). Fixed in `lib/world/queries.ts`.
2. Event read page duplicated its own long-text fields (`CodeText` + `EditableField` both
   rendering the same value). Fixed by adding a `renderValue` prop to `EditableField`.
3. Event `Location` field showed literal `Location #<id>` instead of a resolved link. Added
   `getLocationRef()` and wired it in.

Also fixed stale "(edit in admin for relationships)" copy on the generic entity page — referenced
the already-removed Payload admin.

Note: the duplicate-looking text on E2 (one copy reading "Keth (KETH)", the other "Keth (L7)")
was fully explained by bug #2 above, not a data problem — `CodeText` resolved the `L7` code to
the location's display name ("KETH") while the adjacent raw `EditableField` showed the
unprocessed `L7` from the same single stored string. No duplicate data exists in the DB.

Committed: not yet — pending user review of this session's changes.

## What is next

See `next.md` for the full instructions. In short:

1. **Phase 4, the continuity check port.** G1 is done, so the link index it depends on exists now.

## Stack reference (quick)

| Thing | Where |
|---|---|
| Active database | `APP_DATABASE_URL` on Neon, `appDb` from `db/index.ts` |
| Schema | `db/schema.ts` |
| Queries and actions | `lib/world/queries.ts`, `lib/world/actions.ts` |
| Link index | `lib/graph/` (`sync.ts` writes, `queries.ts` reads), `scripts/rebuild-links.ts` |
| Lexical packages | All at `0.50.0` |
| Routes | All in `app/(app)/` |
| No login, no admin | Anywhere in this codebase |
