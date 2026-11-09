# Session context

Paste this into a new session alongside CLAUDE.md to get a model up to speed.

## Last session (2026-11-08d): Phase 4, the continuity check port

Ported the whole continuity check (`lib/continuity/run-check.ts`, `actions.ts`, `queries.ts`) from
its pre-Payload-removal implementation onto `appDb`/Drizzle, following `lib/world/`'s server-action
conventions so the G1 link-index sync fires automatically on every write it makes. Kept the pure
logic (`analyze.ts`, `plan.ts`, `text.ts`, `types.ts`) unchanged; fixed `constants.ts`'s
`ENTITY_DB_TYPES`/`EXPECTED_LABELS`, which were a stale 7-entry Payload-era list. Rewired the
Continuity inbox, review screen (route renamed `[flagId]` → `[flagCode]`, since flags are
addressed by their own code, not a UUID), sidebar badge, and three supporting components. Wired
the pre-existing, previously-unused `SnippetCheckStatus` component into the Writing Studio editor
with a manual "Check against canon" fallback, and the automatic save-time trigger via `after()`.

Schema: expanded `writing` (check status/timestamps) and `continuity` (full flag shape), added
`continuity_history` and `continuity_confirmations`. Two-pass migration to dodge `drizzle-kit`'s
interactive rename-ambiguity prompt (see `BUILD_GUIDE.md` gotchas). Both passes applied to live
`APP_DATABASE_URL` with permission asked each time.

Verified: all 17 `test-continuity.ts` checks pass; `npm run build` zero errors, 29 routes; a real
check against live writing (W3) ran the full pipeline correctly end to end and failed only at the
AI Gateway call (this Vercel account has no credit card on file yet — the exact add-a-card link is
captured in the stored error); the Continuity inbox's three tabs render cleanly in a real browser
with no console errors. Found, but did not fix (out of scope, pre-existing): a Lexical #173 /
React #418 crash opening any `/write/[code]` editor page, reproducing on W1 and W3 alike.

One documented gap: `docs/PLAN_WRITING_AND_AI.md`'s "Draft writing is checked and flagged but never
spreads" decision (written the same day) isn't implemented yet — today Draft and Canon both
auto-apply identically, matching the mechanism as ported. That doc itself schedules the fix
(the claims ledger) for S7, after Phase 4, so this is tracked, not missed.

Committed: not yet — pending user review of this session's changes.

## Previous session (2026-11-08c): G1, the link index

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

1. **Phase 5 (views): filter, convergence, node map, relationship view, story board.** Builds on
   the G1 link index, which is done.
2. Before that becomes the day-to-day focus: a credit card needs adding to the Vercel account's
   AI Gateway billing, and the pre-existing `/write/[code]` Lexical crash (found during Phase 4,
   not caused by it) is worth a look — see `BUILD_GUIDE.md`'s Phase 4 section for both.

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
