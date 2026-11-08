# Session context

Paste this into a new session alongside CLAUDE.md to get a model up to speed.

## Last session (2026-11-08b): Phase 3 closure

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

1. **G1, the link index.** Phase 3 closure is done. Per `next.md`, ask before starting G1 since
   it's a new build step, not a verification pass.

## Stack reference (quick)

| Thing | Where |
|---|---|
| Active database | `APP_DATABASE_URL` on Neon, `appDb` from `db/index.ts` |
| Schema | `db/schema.ts` |
| Queries and actions | `lib/world/queries.ts`, `lib/world/actions.ts` |
| Lexical packages | All at `0.50.0` |
| Routes | All in `app/(app)/` |
| No login, no admin | Anywhere in this codebase |
