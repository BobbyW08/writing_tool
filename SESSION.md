# Session context

Paste this into a new session alongside CLAUDE.md to get a model up to speed.

## Session (2026-11-10): compilations migration applied, password gate built and verified, Framework Preset bug found

Bobby ran the `compilations` migration by hand (`drizzle-kit migrate`); `/compilations` confirmed
live. Phase 8's deploy line ("a real single-user login") is built as a single shared password
gate: `proxy.ts` checks a `session` cookie against `APP_SECRET`; `/api/login` checks the
submitted password against `APP_PASSWORD` and sets that cookie. `CLAUDE.md` hard rule 12 updated
to describe this as the one sanctioned exception to "no auth code" rather than real multi-user
auth. `traveler-wiki-build-plan.md` and `BUILD_GUIDE.md` updated to match (all prior "conflicts
with hard rule 12" notes closed out).

Separately, while chasing the AI Gateway billing block, found the Vercel project's Framework
Preset was set to "Other" instead of "Next.js" (likely a stale import setting), which was
producing an unrelated `STATIC_BUILD_NO_OUT_DIR` build failure. Fixed by switching the preset to
Next.js. Bobby also updated `AI_GATEWAY_API_KEY` (previously blank). Build now succeeds, but the
Gateway call itself hasn't been retested since both fixes landed — `next.md` flags this as the one
thing to confirm before starting S4.

Phase 9 (Cartographer Studio Design) was discussed in a separate chat, surfaced from
`traveler-wiki-build-plan.md`'s Phase 9 section. Confirmed it is item 16 of 16 in the build order,
gated on S4 through S7 closing, not just the three items above — W3–W6 are done out of the
table's listed order (allowed by the plan), but S4–S7 are not built yet.

**Later the same day:** the password gate above was built but not yet verified — `/login` threw a
Next.js 16 "strict route matching" build error (`app/(auth)/login/page.tsx` didn't match any
complete route). Root cause: `(app)/layout.tsx`'s `@modal` parallel-route slot, combined with route
groups being stripped before Next's slot-completeness check runs, so `/login` got swept into a
slot requirement that has nothing to do with it. Fixed with Next's own documented escape hatch,
`deprecated.looseRouteMatching: true` in `next.config.mjs`. `npm run build` now passes clean, and
the full flow was verified: wrong password → 401 with an inline error in the UI; correct password
→ 200 + session cookie → authenticated requests succeed; unauthenticated requests redirect to
`/login?from=...`. The password gate is now genuinely done, not just written.

## Last session (2026-11-09, latest): Lexical crash fixed, Phase 5A closed

This entry consolidates everything since 2026-11-08d below — several sessions' worth of progress
that never got a SESSION.md entry written along the way. Full detail for all of it is in
`BUILD_GUIDE.md`'s "Current state" and each phase's own section; this is the condensed version.

**Since 2026-11-08d, in order:** Phase 5 (views: sidebar filter, multi-lane convergence, node map
and relationship view on the link index, story board, timeline polish — closed 2026-11-09, step
S3/W2 delivered with it). Phase 5A, steps U1-U6 (header actions; edit relationships + place
history in place; table and status board views on every collection list page; record popups with
movable nodes, edge editing and drag-to-create-relationship; story board drag and drop) — all
closed, with U4/U6's drag-and-drop gesture itself flagged for Bobby to confirm by hand (browser
automation couldn't exercise dnd-kit's drag start under simulated pointer input). Phase 6 (Gaps
view, `/gaps`) — closed; Suggestions stays blocked on the AI Gateway billing issue. Phase 7
(Markdown export for any entry, the new `compilations` collection with drag-reorder and combined
export) — closed, but its migration (`db/migrations/0010_spicy_talisman.sql`, purely additive) is
generated and **not applied**: the harness denies `drizzle-kit migrate` against `APP_DATABASE_URL`
outright as a production-deploy action, no prompt. Bobby needs to run it by hand:
`node --env-file=.env.local node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.app.config.ts`
— `/compilations` 500s until then. Phase 8's search (`/search`, exact-code or name/alias match
across every collection) — closed; Phase 8's other line ("deploy with a real single-user login")
is flagged, not built — it conflicts with `CLAUDE.md` hard rule 12 (no auth code anywhere);
needs Bobby's call on which one is stale before anyone touches it.

**This session specifically:** Found and fixed the real root cause of the `/write/[code]` crash
that had blocked step U3 across multiple sessions (tracked as "Phase 4 gap #2" below, and
previously guessed to be a generic hydration mismatch — it wasn't). The actual cause: the default
Lexical Markdown `TRANSFORMERS` set includes CODE and LINK transformers whose `dependencies`
arrays name `CodeNode`/`LinkNode`; neither was registered in `initialConfig.nodes`, so Lexical's
own dependency check threw synchronously on every `/write/[code]` mount regardless of content.
Fixed by registering both node types (`@lexical/code-core`, `@lexical/link` — both already
present transitively at the matching `0.50.0`, now direct dependencies) in both
`app/(app)/write/[code]/editor.tsx` (client) and `lib/studio/lexical.ts` (server headless
converter). Verified live on W1 and W3 with no console exceptions. Committed separately
(`646a9f6`) from the feature work it unblocked.

With that fixed, built **step U3** — a "Keep writing" section on `/stories/[code]` that embeds
the real `WritingEditor` directly (not a fork), with a picker across the story's writing records,
a "+ New" option, and a record list below linking to `/write/[code]`. Added a `getWritingListByStory`
query, an optional `storyId` on `createWriting`, and an `onFieldsSaved` callback on `WritingEditor`
so the embedded list stays in sync without a full reload. Also added the "floating = suggested age
range" label wherever a story's floating state is shown (the story page and the story board's
floating lane/cards) — `lib/stories.ts`'s `floatingRangeText()`. Verified live against real data
(switched records, created and then cleaned up one throwaway test record). Committed (`d780aab`).
**This closes Phase 5A completely (U1-U6 all done).**

Also corrected a stale-documentation issue found while updating these docs: `traveler-wiki-build-plan.md`'s
"Step W1" section and `docs/PLAN_WRITING_AND_AI.md`'s S2 line were both still unchecked despite
both already saying "Delivered with Phase 3 and step S2" — the shell, world tree, infobox and home
hub were genuinely built long ago; the checkboxes were just never flipped. Spot-checked the actual
code (`components/world-tree.tsx`, `components/infobox.tsx`, `lib/infobox.ts`, the home page) to
confirm before correcting rather than taking the stale note at face value.

Committed: yes, two commits (`646a9f6` the Lexical fix, `d780aab` step U3).

**What's left, and all three need Bobby, not more building:** applying the `compilations`
migration by hand; a decision on the Phase 8 login-vs-hard-rule-12 conflict; and the Vercel AI
Gateway `customer_verification_required` billing error (re-checked three times now with no
change — likely an account/team-scoping mismatch, not something retrying from here will fix).
Phase 9 (Cartographer Studio Design) is explicitly scoped to start only once every phase above is
closed, so it's waiting on these too.

## Session (2026-11-08d): Phase 4, the continuity check port

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

Committed: yes (`4635001`, includes G1's prior commit `b92b929` on top of it in history).

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

See `next.md` for the full instructions. In short, every base-build phase through Phase 8 is now
closed (Phase 5 views, Phase 5A U1-U6, Phase 6 Gaps view, Phase 7 export/compilations, Phase 8
search and the password gate), the `/write/[code]` Lexical crash is fixed, the `compilations`
migration is applied, and the Vercel Framework Preset build failure is fixed. One item is left:

1. **Fix the Vercel AI Gateway billing block** (`customer_verification_required`) account-side —
   this is what S4-S7 (the AI foundation, Story Builder, Ask AI, canon check extensions) are
   waiting on. `AI_GATEWAY_API_KEY` was updated and the Framework Preset fixed since the last
   check, but the Gateway call itself hasn't been retested since — confirm the fix landed before
   starting S4.

Phase 9 (Cartographer Studio Design) is explicitly scoped to start only once every phase above is
closed — it's now waiting only on S4-S7, which are waiting on item 1.

## Stack reference (quick)

| Thing | Where |
|---|---|
| Active database | `APP_DATABASE_URL` on Neon, `appDb` from `db/index.ts` |
| Schema | `db/schema.ts` |
| Queries and actions | `lib/world/queries.ts`, `lib/world/actions.ts` |
| Link index | `lib/graph/` (`sync.ts` writes, `queries.ts` reads), `scripts/rebuild-links.ts` |
| Lexical packages | All at `0.50.0` |
| Routes | All in `app/(app)/` |
| Auth | One shared password gate (`proxy.ts` + `/api/login`), not real auth. No admin route. See `CLAUDE.md` hard rule 12 |
