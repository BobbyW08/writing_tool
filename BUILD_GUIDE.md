# BUILD_GUIDE.md: working log for building The Traveler

Session-to-session memory for this build. Read this before `traveler-wiki-build-plan.md` and
`docs/PLAN_WRITING_AND_AI.md` on every new session. This file says where things actually stand;
the plan says what the finished product looks like. Update "Current state" and "Next up" at the
end of every session.

---

## Current state (as of 2026-11-08)

**Phase 3 and G1 (the link index) are both closed. Build passes zero errors. Phase 4 (continuity check port) is next.**

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
- Continuity pages (`/continuity`, `/continuity/[flagId]`), snippets pages, and
  continuity-related components are stubbed ("returns in Phase 4").

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

Active routes under `app/(app)/`:
- `/` home hub
- `/[entityType]` list, `/[entityType]/new` create, `/[entityType]/[slug]` read/edit
- `/events`, `/events/new`, `/events/[slug]`
- `/stories`, `/stories/new`, `/stories/[code]`
- `/write`, `/write/[code]`
- `/timeline`
- `/continuity`, `/continuity/[flagId]` (stubbed)
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
  of Bobby's own words only, each with an Undo; conflicts need his explicit decision.
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

1. **Phase 4.** Port the continuity check, then run the first real writing check.
2. **Phase 5, S3 and W2.** Filter, convergence view, node map, relationship view, story board,
   eras, lanes. (The link index and node/edge shape it depends on are done — G1.)
3. **S4 to S7.** AI foundation, Story Builder, Ask AI and the prompts menu, canon check extensions.
4. **W3 to W6.** Maps, chronicles, boards, interactive tables.
5. **Phases 6 to 8.** Gaps view, export, compilations, search, deploy.

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
