# BUILD_GUIDE.md: working log for building The Traveler

Session-to-session memory for this build. Read this before `traveler-wiki-build-plan.md` and
`docs/PLAN_WRITING_AND_AI.md` on every new session. This file says where things actually stand;
the plan says what the finished product looks like. Update "Current state" and "Next up" at the
end of every session.

---

## Current state (as of 2026-11-08)

**Phase 3, G1 (the link index) and Phase 4 (the continuity check port) are all closed. Phase 5
(views) is in progress — see below. Build passes zero errors. See the gaps flagged at the end of
the Phase 4 section before touching anything AI- or writing-related again.**

### Phase 5: views (in progress)

Done so far, committed:
- Schema: `eras` table (code Y, generic world-shaped CRUD — wired into the same `getTable()` maps
  as the 8 world collections in `lib/world/actions.ts`, `lib/world/queries.ts`, `lib/graph/sync.ts`,
  so it gets code assignment, parent-link sync, text-mention resolution, and delete-conflict checks
  for free). `timeline_settings` global (singleton row, id fixed at 1, upserted). `events` gained
  `eventType`, `importance`, `lane`. Migration `0004_perpetual_ricochet.sql`, applied to
  `APP_DATABASE_URL`.
- Fixed a real pre-existing bug while wiring eras in: `components/code-text.tsx` had its own
  hardcoded, stale prefix regex (`[CLEIFRGKSWXQTU]`) instead of importing `CODE_PREFIX_CHARS` from
  `lib/codes.ts` — any newer prefix (Y, B, A, M, P, H, D, N) silently failed to even match as a
  code in free text, let alone link. Now builds the regex from the single source of truth.
- Eras have no dedicated read page (not in the plan's Frontend views list — they're managed inline
  from the Timeline page's "Eras" panel, `components/era-manager.tsx`, using the same
  `EditableField`/`DeleteRecordButton` components every other collection's read page uses). A
  Y-code rendered in text or "What links here" links to `/timeline?era=<code>` instead of a
  `/eras/<code>` page, which doesn't exist.
- Timeline canvas (step W2's spike item, now confirmed): `components/timeline-view-inner.tsx`
  rewritten. Lanes are real `react-calendar-timeline` groups, computed dynamically from the
  distinct `lane` values in use (always includes lane 0). Era bands are a custom absolutely-
  positioned overlay (the library has no native concept of a full-height colored time-span) —
  positioned as a percentage of the currently-visible time range, recomputed on every
  `onTimeChange`, so it tracks pan/zoom exactly. `eventType` sets marker color (fixed 8-color map);
  `importance` sets marker height — found during verification that `getItemProps()` silently
  reclaims any `top`/`height` passed to it (it owns row-stacking math), so importance-driven sizing
  had to move to an *inner* content div the library never touches, not the outer item wrapper.
  Click empty canvas space to add an event, now routes to `/events/new?startYear=<y>&lane=<n>` with
  `NewEntityForm` prefilling from those params.
- Verified live in a real browser (not just `npm run build`): created a real era via the UI, got
  code Y1, confirmed its band's `left`/`width` % matched the expected math exactly
  (`(0-(-5))/70 = 7.14%`, `55/70 = 71.43%` against the default `-5..65` view); set a real event's
  lane and eventType via its read page, confirmed a second lane row appeared and the marker colored
  and sized correctly; confirmed click-to-add's query-param prefill. All test mutations reverted
  afterward (test era deleted, E1's lane/eventType/importance reset to their original values via a
  one-off script, same pattern as prior sessions' live-data checks).
- Sidebar multi-select filter + multi-lane convergence view: built as one coupled chunk (the
  multi-select is the convergence view's entry-picker). `components/ui/multi-select.tsx` is a
  copy-paste shadcn-style component (`Command`/`Popover`/`Badge`/`Button`, all already in this
  project — not an installed package, per CLAUDE.md's stack-table note and hard rule 10). Reverse-
  engineered `i-storyline-js`'s real `loadJSON()` API directly from its source (its README only
  documents an XML-file path): `lib/convergence/build.ts` (pure story-JSON builder — finds every
  event whose `involves` names two or more of the selected entries, builds a `Story.Characters`
  span map with shared "converging" sessions at those years), `lib/convergence/actions.ts` (server
  action — runs the library entirely server-side via `getConvergenceGraphAction`, returns only
  plain SVG path strings so the library's weight never reaches the client bundle),
  `types/i-storyline-js.d.ts` (minimal ambient shim — package ships no types and none exist on
  npm), `components/convergence-view.tsx` (client component: multi-select, calls the action on
  selection change, renders an SVG with one colored path per entry, a legend, and a text list of
  convergence points). New queries: `getConvergenceCandidates()` (every coded entry across all 8
  world collections), `getEventsForConvergence()` (every placed event's `involves` resolved to
  codes). Wired into `app/(app)/timeline/page.tsx` below the timeline canvas.
  `i-storyline-js`'s `main` field points at unbundled ESM source with extensionless relative
  imports — resolves fine through Turbopack (confirmed via `npm run build`, zero errors) but not
  plain Node, so it can't be smoke-tested standalone outside the Next.js server.
- Verified live in a real browser: selected SERO (C1) and Vashten (C3) in the multi-select: the
  SVG rendered 2 paths (confirmed via DOM inspection — `viewBox="0 0 1000 160"`, both `d` attrs
  non-empty), the points list showed exactly the three events where both are in `involves` (Year
  7 — The Ritual, Year 10 — The Arrival of the Asharan Empire, Year 23 — Giana's Death), no console
  errors. No test-data cleanup needed — selecting entries in the UI doesn't mutate anything.
- Not yet done: node map + per-entry relationship view (React Flow — not yet installed), story
  board, and the rest of W2's polish (mini-map, search/filter, time gaps, two-tier header). See
  `next.md`.

### Phase 4: the continuity check port

Ported the whole continuity check from its pre-Payload-removal implementation (read from git
history at `5bef6fc^`) onto `appDb`/Drizzle, following exactly the `lib/world/` /
`lib/studio/` server-action conventions G1 already established. Full checklist and the schema
change detail are in `traveler-wiki-build-plan.md`'s "Phase 4" section.

What moved and what didn't:
- **Unchanged (pure, no data access):** `lib/continuity/analyze.ts`, `plan.ts`, `text.ts`,
  `types.ts` — all 17 of `scripts/test-continuity.ts`'s offline checks still pass verbatim.
- **Fixed, not just carried over:** `lib/continuity/constants.ts`'s `ENTITY_DB_TYPES` was a stale
  7-entry Payload-era list (singular `"character"`/`"location"`/... down to an `"artifact"` type
  that doesn't exist in this schema, and missing `faction`/`lore` entirely). Replaced with
  `WORLD_SLUGS` from `lib/codes.ts` — the current app's 8 real collection slugs — and fixed
  `EXPECTED_LABELS` to match. `scripts/test-continuity.ts`'s fixtures were updated to the same
  plural slugs so it still typechecks; the logic it tests didn't change.
- **New:** `lib/continuity/run-check.ts` (`claimCheck`, `runContinuityCheck`, `loadPriorAges`,
  `applyPlan`), `lib/continuity/actions.ts` (`resolveFlagAction`, `acknowledgeFlagAction`,
  `acknowledgeAllUpdatesAction`, `undoNewDetailAction`, `triggerContinuityCheckAction`,
  `recheckWritingAction`), `lib/continuity/queries.ts` (the read side, including a new
  `getCheckSummary`).

Key design decisions made while building it:
- **Entities are addressed by code, not UUID.** The old Payload schema used a single `entities`
  table with a UUID `id`; this app has 8 separate per-collection tables with integer ids. Rather
  than invent a synthetic cross-collection id, `EntityForCheck.id` (and every id `plan.ts` passes
  around) is the record's permanent **code** (e.g. `C7`). `run-check.ts` builds a local
  `code -> {collection, dbId, details, tagIds}` map once per check (`loadWorldIndex()`) and
  resolves through it — never a UUID anywhere in this port.
- **Flags are addressed by their own `Q` code too**, not a numeric/UUID id — consistent with
  "codes are permanent, codes are how things are referenced" (CLAUDE.md hard rule 6). The route
  is `/continuity/[flagCode]` (renamed from the stubbed `[flagId]`).
- **`entityHref()` bypasses `lib/data/entity-types.ts` entirely.** That file is a second, stale,
  independent slug-mapping table (same staleness as the old `constants.ts`: missing
  faction/lore, has a non-existent "artifact" type) used elsewhere only by the legacy
  `[[Type#Name|Label]]` bracket-link renderer (`lib/wiki-resolve.ts` /
  `components/wiki-text.tsx`), which is out of this phase's scope and was left untouched.
  Continuity's `EntityDbType` values **are** the collection slugs already, and those slugs are
  already identical to the route segments, so `entityHref(collection, slug)` is just
  `` `/${collection}/${slug}` `` — no lookup table needed.
- **New-entity creation and new-detail writes go through the real write functions, not raw
  `appDb` calls** — `createEntityAction`, `updateDetailsAction`, `updateTagsAction` from
  `lib/world/actions.ts` — specifically so the G1 link-index sync they already call
  (`syncLinksForRecord`) fires automatically. This was the explicit Phase 4 checklist item in
  `next.md` and was verified: creating a stub record or appending a detail through the
  continuity check re-syncs that record's links the same as any other write.
- **UNK tagging only on automatic writes, never on an explicit decision.** A `new_record` or
  `new_detail` automatic write gets the `UNK` tag (hard rule 13: "whenever the data layer...
  fills something in on a best guess"). `resolveFlagAction`'s `update_canon`/`both_true`/
  `changed_over_time` paths are choices Bobby made himself and are never tagged `UNK`.
- **The two-pass migration.** `drizzle-kit generate` requires an interactive terminal to resolve
  "did you rename column X, or drop+add" ambiguity, which this harness can't supply
  non-interactively. Splitting the `continuity` table change into pass 1 (purely additive: new
  nullable columns, two new tables) and pass 2 (set `NOT NULL`, drop the two old stub columns —
  the table was confirmed empty first) avoided the prompt entirely in both generations. Worth
  reusing this split any time a future migration both drops and adds columns on the same table.
- **`SnippetCheckStatus` already existed, unwired.** `components/snippet-check-status.tsx` was
  sitting in the repo as a complete, correct, generic status component (checking/failed/
  unchecked/checked states, polling via `router.refresh()` while checking, a toast on
  completion) with zero references anywhere — evidently written ahead of this phase in an
  earlier session. Wired it into `app/(app)/write/[code]/editor.tsx` and `page.tsx` rather than
  rebuilding it. Added `router.refresh()` after every successful save in the editor so the
  "checking" state (set synchronously by `claimCheck` inside the save's `after()` hook) actually
  becomes visible without a manual page reload.

**Known gaps, not fixed in this phase — see also `traveler-wiki-build-plan.md`'s Phase 4 section:**
1. **The AI Gateway needs a credit card on file** on this Vercel account. A real check against
   live writing (`W3`) ran the entire pipeline correctly end to end and failed only at the
   network call, with the exact Vercel URL to add a card captured in `writing.checkError`. No
   continuity check will produce real findings until that's resolved account-side.
2. **Pre-existing Writing Studio bug, found but not caused by this phase.** Opening any
   `/write/[code]` editor (tried W1 and W3) throws a Lexical error #173 in the browser console,
   immediately after a React #418 hydration-mismatch error — almost certainly the editor's
   `editorState: () => $convertFromMarkdownString(...)` initializer producing a different tree
   client-side than what SSR rendered. This blocked verifying the "Check against canon" button
   end-to-end through the browser; verified instead via a direct script
   (`claimCheck`+`runContinuityCheck` called directly) and via the Continuity inbox pages, which
   don't use Lexical and rendered cleanly (checked via console-log inspection, not just visually).
3. **Draft vs. Canon "never spreads" is not implemented.** `docs/PLAN_WRITING_AND_AI.md`
   ("Decisions already made" #2-3, dated the same day as this session) says new facts should
   only spread into canon from Canon-state writing, with Draft only "checked and flagged."
   Today's port doesn't make that distinction — Draft and Canon both auto-apply identically,
   same as the mechanism this phase ported. Only `set_aside` is excluded (from triggering the
   check at all, per the same doc). That doc itself schedules the claims-ledger work needed to
   do this properly as part of S7, explicitly *after* Phase 4 — so this is a known, documented
   gap to close then, not an oversight to fix now.

### G1: the link index

Delivered the `links` table and `lib/graph/` (`types.ts`, `labels.ts`, `extract.ts`, `sync.ts`,
`queries.ts`), wired sync calls into every coded write path, the six `/api/graph*` and
`/api/codes/:code/links` endpoints, a "What links here" component on all three read pages, and a
`/link-health` page. Full checklist and verification detail in `traveler-wiki-build-plan.md`'s
"Step G1" section.

Key design decisions made while building it (not spelled out in the plan, recorded here so they
aren't re-litigated):
- The link row `key` is deterministic from `source:ownerCode:type:fromCode:toCode` — **not**
  including `fieldName`, so the same code mentioned in two different text fields of one record
  collapses to a single edge rather than two.
- `writeOwnedLinks()` always deletes every row a given owner code currently owns, then inserts the
  freshly computed set, via `appDb.batch([del, ins])` (one atomic round trip on the neon-http
  driver, which has no interactive multi-statement transactions).
- A relationship row's `ownerCode` is its own X code, not `fromCode` — it is the one record that
  genuinely owns that connection and whose delete should remove it.
- `isLinkRelevantField()` lives in `lib/graph/sync.ts`, next to the field maps it mirrors, so
  `updateFieldAction`'s "should I resync" check can never drift out of sync with the extraction
  logic itself.
- `lib/graph/sync.ts` and `lib/graph/queries.ts` deliberately do **not** `import 'server-only'`
  (unlike `lib/world/queries.ts`), because `sync.ts` is also imported directly by
  `scripts/rebuild-links.ts`, a plain `tsx` script outside Next's bundler — `server-only` is not an
  installed npm package, Next provides it only inside its own webpack/Turbopack build, and a bare
  `tsx` run fails with `ERR_MODULE_NOT_FOUND` if anything in the import chain pulls it in.
- The migration (`links` table + `relationships.offset_years`, both additive) needed explicit
  approval to run against the live `APP_DATABASE_URL` (the harness flags `drizzle-kit migrate` as
  a production-deploy action) — approved and applied 2026-11-08. `drizzle-kit`'s CLI does not load
  `.env.local` itself (unlike Next or `tsx --env-file`); run it as
  `node --env-file=.env.local node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.app.config.ts`.
- `components/app-sidebar.tsx` is dead code (not imported anywhere) — the real nav lives inline in
  `app/(app)/layout.tsx`. Discovered while adding the Link health nav entry; added it to both for
  now rather than deleting the unused file, since that cleanup wasn't asked for.

### Phase 3 closure

Phase 3 closure browser check (production build on port 3001, since nothing was listening on 3000):
- All 16 top-level/list routes return 200 and loaded cleanly.
- Nav links in the sidebar all resolve to real routes; entry read pages, event read pages, and
  the review queue all link IDs correctly (ID-code linkification confirmed in both structured
  fields and inline prose).
- `/timeline` reads `startYear` correctly; the drag handler (`handleItemMove` in
  `components/timeline-view-inner.tsx`) is correctly wired to `updateEventYearAction` in
  `lib/world/actions.ts`, which writes `startYear` through `appDb` and never touches `yearLabel`.
  A synthetic browser drag didn't register with `react-calendar-timeline`'s drag threshold (the
  already-documented gotcha below), so the write path was instead verified directly: the `Year`
  field's inline editor was used to change `startYear` and change it back, confirmed against the
  database both times.

Three bugs found and fixed during closure:
1. **UNK badge was non-deterministic.** `isUnk()` checks a module-level `UNK_TAG_ID_CACHE`, which
   was only populated by `getUnkTagId()` — called only from `getUnkRecords()` and
   `getCollectionUnkCount()` (home page, `/review`). Any other page, visited first in a server
   process's lifetime, showed no UNK badges even on tagged records. Fixed by having `getAllTags()`
   (called by every read page) populate `UNK_TAG_ID_CACHE` too, since it already fetches the same
   `tags` table. `lib/world/queries.ts`.
2. **Event read page duplicated its own body text.** `app/(app)/events/[slug]/page.tsx` rendered
   `<CodeText>` (linkified display) immediately followed by `<EditableField>` for the same value —
   `EditableField` always renders the raw value itself when not editing, so both showed at once.
   Fixed by adding an optional `renderValue` prop (a plain `ReactNode`, not a function — React
   Server Components can't pass functions to Client Components) to `EditableField`
   (`components/editable-field.tsx`) and passing the `CodeText` element through it instead of
   rendering both.
3. **Event `Location` field showed literal `Location #<id>`.** Never resolved to the actual
   location. Added `getLocationRef()` to `lib/world/queries.ts` and wired the event page to render
   a real link.

Also fixed: the generic entity page's relationship-kind fields (birthplace, race, culture)
showed `(edit in admin for relationships)` — stale copy from the removed Payload admin. Changed to
accurately point at the Relationships section below, which already supports `born_in`,
`belongs_to_culture`, and `belongs_to_race` as general relationship types.

The app now runs entirely on Drizzle ORM and Neon Postgres with no Payload dependency.
`appDb` (from `db/index.ts`, using `APP_DATABASE_URL`) is the only database connection in app
code. `db/schema.ts` is the source of truth for the schema.

Data counters (from migration): C=40, L=13, U=5, F=2, K=102, S=74, W=3. UNK queue: E2, E16,
E36 to E39, X1 to X4. (C is now at 61 — two scratch records created and deleted during G1's
scripted verification advanced it, by design: counters never roll back after a delete.)

Build state:
- `npm run build` passes with zero TypeScript errors, all 27 routes rendered.
- Lexical packages installed explicitly: `lexical@0.50.0`, `@lexical/react`, `@lexical/markdown`,
  `@lexical/rich-text`, `@lexical/list`, `@lexical/headless` (all at `0.50.0`).
- Continuity pages and components are live (Phase 4, done 2026-11-08). Snippets pages
  (`/snippets`, `/snippets/new`, `/snippets/[id]`) remain stubbed — they're a separate,
  not-yet-scheduled piece, unrelated to the continuity check.

Data layer files:
- `lib/world/queries.ts` - all entity fetchers, using `appDb`
- `lib/world/actions.ts` - CRUD server actions (create, updateField, updateDetails, delete, relationships, tags) — now also sync the link index after any link-relevant write
- `lib/world/fields.ts` - field definitions per entity type driving create forms and edit UI
- `lib/studio/queries.ts` - writing record fetchers
- `lib/studio/actions.ts` - writing CRUD server actions — same link-sync wiring
- `lib/studio/lexical.ts` - server-side Lexical to Markdown conversion (uses `@lexical/headless`)
- `lib/graph/types.ts` - the one `Node`/`Edge`/`Graph` shape (`toNode`, `toEdge`)
- `lib/graph/labels.ts` - fixed field labels/inverse labels for field- and text-sourced edges
- `lib/graph/extract.ts` - per-collection registry of which text fields get scanned for codes
- `lib/graph/sync.ts` - the sync engine: `syncLinksForRecord`, `removeRecordLinks`, `computeOwnedLinks`, `isLinkRelevantField`
- `lib/graph/queries.ts` - read side: `getLinksForCode`, `getGraphFromCode`, `getFilteredGraph`, `getOrphanCodes`, `getBrokenLinks`, `getShortestPath`
- `scripts/rebuild-links.ts` - rebuild the whole index from the records (`--apply` to write)
- `lib/continuity/run-check.ts` - orchestration: `claimCheck`, `runContinuityCheck`, `loadPriorAges`, `applyPlan` (Phase 4)
- `lib/continuity/actions.ts` - server actions: resolve/acknowledge/undo/trigger-check (Phase 4)
- `lib/continuity/queries.ts` - read side: open decisions/updates, decision log, one flag, entity history, check summary (Phase 4)
- `lib/continuity/{analyze,plan,text,types,constants,links}.ts` - the pure/shared logic (constants.ts fixed in Phase 4, the rest unchanged)

Active routes under `app/(app)/`:
- `/` home hub
- `/[entityType]` list, `/[entityType]/new` create, `/[entityType]/[slug]` read/edit
- `/events`, `/events/new`, `/events/[slug]`
- `/stories`, `/stories/new`, `/stories/[code]`
- `/write`, `/write/[code]`
- `/timeline`
- `/continuity`, `/continuity/[flagCode]`
- `/snippets`, `/snippets/new`, `/snippets/[id]` (stubbed)
- `/link-health`

Active routes under `app/api/`:
- `/api/media`, `/api/uploads/[...path]`
- `/api/codes/[code]/links`
- `/api/graph`, `/api/graph/[code]`, `/api/graph/orphans`, `/api/graph/broken`, `/api/graph/path`

---

## History

The app was built on Payload CMS 3.x for phases 1 through 3, then migrated to a direct
Drizzle + Neon stack in November 2026 to simplify deployment and remove the admin dependency.

---

## Decisions already made (do not re-litigate)

- All writing and storage live in `appDb`. The `APP_DATABASE_URL` Neon database is the only
  source of truth. The old v1 database (`DATABASE_URL`) is read-only and used only by the
  one-time `scripts/copy-from-payload.ts` migration script.
- Every record has a permanent code. Prefixes are C, L, E, I, F, U, R, G, K, S, W (entries), X
  (relationships), Q (continuity flags), T (tags), A (reserved, compilations).
- Story ideas are their own table (`stories`, prefix S), one record per idea, with stage,
  format, era, years, beats, characters involved, and events dramatized. The prose itself lives
  in `writing` (prefix W).
- Year 0 is the year SERO is born. Prequels use negative years. `startYear` (position) and
  `yearLabel` (text) are independent.
- Items and artifacts merge into one `items` table. Cultures are their own table (prefix U).
  Factions (prefix F) sit inside a culture, and many factions can share one culture.
- Every record can carry tags. **UNK is a built-in tag meaning "applied on a best guess, double check it".**
  The data layer and the imports add UNK plus a `reviewNote` whenever they guess. Only the user removes it.
- The four statuses (`locked`, `in_development`, `needs_name`, `placeholder`) carry over unchanged.
- No login and no auth code. This is a personal single-user tool.
- Off-the-shelf libraries are pre-selected: `react-calendar-timeline` (single line), `i-storyline-js`
  (convergence), React Flow (node map), `shadcn-multi-select-component` (sidebar), `@dnd-kit/sortable`
  (compilations).
- The AI suggestion pane and the continuity check use Claude through Vercel AI Gateway. They must
  never auto-insert prose.
- Canon decisions from the earlier ingestion stand: the immortality ritual is permanent and cannot be
  transferred to anyone else; the empire's collapse and the fourth ruler's assassination are Age ~820.
- Continuity check: the database is the only record of canon. Automatic writes are verbatim quotes
  of Bobby's own words only, each with an Undo; conflicts need his explicit decision. Ported onto
  `appDb` in Phase 4 — world entries and flags are both addressed by their permanent code, never
  a UUID or bare numeric id, consistent with every other part of this app.
- All AI runs on Claude, through the `ai` package and Vercel AI Gateway, behind `lib/ai/`.
- Every connection between records lives in the derived `links` index (step G1). Views, trees and
  the AI read connections from it. It is rebuilt from the records and never edited by hand.
- The link index sync runs inside the data layer's write functions, not in hooks.
- All visual features share one node shape and one edge shape (`lib/graph/types.ts`). Layout
  positions live on boards, not on records. Map coordinates are pixels on the base image.
- New code prefixes: B beats, Y eras, M maps, P map pins, H chronicles, D boards, N tables.
- Causes and consequences of events are relationships (`caused`, and `follows` with `offsetYears`
  for relative timing), not event columns. Events gain `eventType`, `importance`, `lane` and `pins`.
- The timeline is edited in place. There is no separate view mode and edit mode.
- The frontend has its own look. World Anvil is a behavior reference only.

---

## Next up (in order)

The master order is in `traveler-wiki-build-plan.md` ("Build order"). In short:

1. **Phase 5, S3 and W2.** Filter, convergence view, node map, relationship view, story board,
   eras, lanes. (The link index and node/edge shape it depends on are done — G1.)
2. **S4 to S7.** AI foundation, Story Builder, Ask AI and the prompts menu, canon check extensions
   (S7 is also where Phase 4's documented "Draft never spreads" gap gets closed, via the claims
   ledger — see the Phase 4 section above).
3. **W3 to W6.** Maps, chronicles, boards, interactive tables.
4. **Phases 6 to 8.** Gaps view, export, compilations, search, deploy.

Before any of that: add a credit card to the Vercel account's AI Gateway billing (Phase 4 gap
#1 above) and look at the pre-existing Lexical #173 / React #418 crash on `/write/[code]`
(Phase 4 gap #2) — neither blocks Phase 5, but both block actually using the continuity check or
the Writing Studio day to day.

---

## Gotchas still relevant

- Adding a code prefix means updating three places in `lib/codes.ts`: `ENTITY_PREFIXES`, the letters
  in `CODE_REGEX`, and `PREFIX_TO_SLUG`. `relationships` takes any entry through `ENTITY_SLUGS`, so a
  new entry table becomes linkable automatically. Counters are created on first use.
- **`react-calendar-timeline`**: only the `0.30.0-beta.19` prerelease works with React 19. Pin it
  exactly. Must be loaded client-only (`next/dynamic` with `ssr: false`). Drag detection needs
  gradual pointer movement. If it breaks, hand-roll the single-line view using `lib/timeline-scale.ts`.
- Ctrl or pinch zoom scrolled the page behind the timeline. Fixed with a native non-passive `wheel`
  listener on the container.
- `tsx` does not load `.env` on its own. Run one-off scripts with `npx tsx --env-file=.env <file>`.
- `import 'server-only'` breaks any plain `tsx` script that transitively imports the file it's in —
  the package isn't actually installed; Next supplies it only inside its own webpack/Turbopack
  build. Keep it out of any `lib/` file a `scripts/*.ts` might import (e.g. `lib/graph/sync.ts`,
  `lib/graph/queries.ts`), even though `lib/world/queries.ts` still has it (nothing in `scripts/`
  imports that one directly).
- `drizzle-kit`'s CLI does not load `.env.local` the way `tsx --env-file` or Next does. Run
  migrations as `node --env-file=.env.local node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.app.config.ts`.
- Applying a schema migration (`drizzle-kit migrate`) against `APP_DATABASE_URL` is flagged by the
  harness as a production-deploy action — ask before running it, same as any other hard-to-reverse
  action against shared state.
- shadcn popovers and dialogs rendered transparent until the theme variables were added to
  `globals.css`. If you add components, check they render opaque.
- Browser automation clicks intermittently miss. Retry, and check server logs for whether the
  action actually fired.
- Lexical packages must all be pinned at the same minor version. The installed version is `0.50.0`.
- `drizzle-kit generate` needs a real TTY whenever a table's diff both drops and adds columns in
  the same run (it tries to prompt "did you rename X, or drop+add" and this harness can't answer
  that prompt). Split the schema change into two migrations instead: pass 1 adds every new
  column as nullable (plus any new tables) and leaves the old ones in place; pass 2 drops the old
  columns and tightens `NOT NULL` once pass 1 is applied. Neither pass triggers the prompt.
- `scripts/*.ts` run via plain `tsx` can't import anything that pulls in `import 'server-only'`
  (see the G1 gotcha above) **or** anything that pulls in a `'use server'` file whose action
  calls `revalidatePath`/`after()` — those need a real Next.js request context. For a one-off
  check against live data outside the app (like Phase 4's first real check), call the
  non-`'use server'` pieces directly (e.g. `lib/continuity/run-check.ts`'s `claimCheck`/
  `runContinuityCheck`, which don't call `revalidatePath` themselves) rather than the `lib/world/
  actions.ts`/`lib/studio/actions.ts` server actions, and stub `server-only` locally
  (`node_modules/server-only/{package.json,index.js}` as a one-line no-op) for the duration —
  delete the stub afterward, don't commit it.

---

## Reference: data counters and ingestion notes (from migration)

Counters after `scripts/copy-from-payload.ts` run: C=40, L=13, U=5, F=2, K=102, S=74, W=3.

Ingestion scope decisions:
- `ideas/` folder: not parsed as a structured source. A handful of genuinely new facts were
  hand-merged into canonical files. The one file ingested is `Sero_Story_Catalog.md` (stories).
- `Timeline.md`: ERA tables ingested by `lib/ingest/timelineEvents.ts` as lightweight events.
  About 75 rows became minimal events with no structured fields.
- `Working-Doc.md`: not ingested. Its useful answers were hand-merged into `Characters.md` and `Events.md`.
- Two small reference tables in `Locations.md` were not ingested.

Still-open data items (to decide during Phase 3 closure or Phase 4):
- The dangling "Assassination Attempt" event (Age ~540) that has no full `Events.md` entry. It
  likely matches story #15 in the catalog.
- The `[[Characters#Bard (The Traveler - Novel)]]` link in "The Invasion", almost certainly a typo
  for `Bard (Original)`.
- The undated "The Journal at Vashten's Home" event needs an exact Age.
