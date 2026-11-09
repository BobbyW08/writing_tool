# BUILD_GUIDE.md: working log for building The Traveler

Session-to-session memory for this build. Read this before `traveler-wiki-build-plan.md` and
`docs/PLAN_WRITING_AND_AI.md` on every new session. This file says where things actually stand;
the plan says what the finished product looks like. Update "Current state" and "Next up" at the
end of every session.

---

## Current state (as of 2026-11-09)

**Phase 3, G1 (the link index), Phase 4 (the continuity check port) and Phase 5 (views) are all
closed. Steps W3 (maps), W4 (chronicles), W5 (boards) and W6 (interactive tables) are also
closed — see their sections below. That closes out the whole W1-W6 "Feature reference" block of
Phase 5. The Gaps view (Phase 6) is also closed — see its section below; Phase 6's other two
items (Review/UNK queue, Suggestions) were already done (Phase 3) or are blocked on S4-S6.
Build passes zero errors. See the gaps flagged at the end of the Phase 4 section before touching
anything AI- or writing-related again. The Vercel AI Gateway billing block (Phase 4 gap #1) was
re-checked a third time this session (Bobby said it was resolved; it was not — same
`customer_verification_required` error, including after a 90s wait for propagation) — still
needs resolving account-side before S4 can start; don't keep re-spiking it blindly. Pivoted to
Phase 6 (Gaps view, unblocked) while that gets sorted out.**

### Step W6: interactive tables

An interactive table (code N) for tabular reference data (a magic system's tiers, a ruler list).
A cell can hold an ID code, which renders as a link and is indexed as a text mention — never a
relationship or join row.

- **Library spike** (recorded in `CLAUDE.md`'s stack table): `@tanstack/react-table`, pinned to the
  stable **v8** line (`8.21.3`), not the newly-installed v9 (`9.3.1`) — v9 turned out to be a
  recent, differently-shaped rewrite (feature-based `constructTable`/`createTableHook`/`Subscribe`
  API, no `useReactTable`/`getCoreRowModel` at all), caught immediately by `tsc` after the first
  install. Swapped to v8 (`useReactTable`, `getCoreRowModel`, `flexRender`, `createColumnHelper` —
  the long-stable, widely-documented API) rather than learning v9's shape mid-task. Headless, so
  cell rendering per column type (text/number/date/link/tag) and all styling are ours. CSV via
  `papaparse@5.7.0`.
- **Schema**: `tables` table (`worldSharedCols()` plus `columns` (jsonb array of
  `{key,label,type,width}`) and `rows` (jsonb array of `{[columnKey]: string}`)). Migration
  `0009_bitter_ronan.sql` (purely additive), applied to `APP_DATABASE_URL`.
- **Full data-layer wiring**, same pattern as `boards`: `tables` added to `WORLD_TABLE_MAP` in
  `lib/world/actions.ts`, `lib/world/queries.ts`, `lib/graph/sync.ts`, and to
  `scripts/rebuild-links.ts`'s `TABLES` map; code assignment (N prefix) in `lib/codes.ts`; node
  styling in `lib/nodeKinds.ts`; nav entry in `app/(app)/layout.tsx`. No bespoke server actions —
  the generic `createEntityAction`/`updateFieldAction` cover it entirely, same as `boards`.
- **New `TEXT_FIELDS` kind, `'rows'`** (`lib/graph/extract.ts`, handled in
  `lib/graph/sync.ts`'s `extractTextLinks`): scans every string value of every row object (not
  just one named field or the `details` array) for ID codes, same `text`/`mentions` link source as
  everything else — this is what makes "a cell can hold an ID code, which renders as a link and
  appears in the link index as a text mention" (the plan's spec for this step) actually true,
  without inventing a new link source or a bespoke join table. `isLinkRelevantField` taught that
  `tables.rows` is link-relevant, so editing a table's rows triggers a resync like any other
  text field edit.
- **UI**: `app/(app)/tables/page.tsx` (list) + `components/new-table-form.tsx`.
  `app/(app)/tables/[code]/page.tsx` (detail) + `components/table-grid.tsx` — a TanStack Table
  instance with a column-management bar (add/rename/retype/remove columns) above an editable grid
  (every cell a plain `<input>`, typed by column `type`), Add/remove row buttons, CSV import
  (`papaparse` parse, auto-creates columns from the CSV header when the table has none yet,
  otherwise matches by column label and replaces the row set) and export (`papaparse` unparse +
  a Blob download), and a "Save table" button that persists `columns`/`rows` together.
- **Real bug found and fixed via live testing** (type-check and build alone would not have caught
  it): `createColumnHelper<TableRow>()` was called fresh inside the component body on every
  render. The `colDefs` `useMemo` depended on `[columns, columnHelper]`, so a new `columnHelper`
  identity on every render busted that memo on every keystroke (not just on real column changes),
  rebuilding the column defs and remounting the cell `<input>`s mid-type — typing "C6" into a cell
  landed as just "C". Confirmed live via `read_page` showing the cell's actual value, not just a
  screenshot. Fixed by hoisting `columnHelper` to module scope so its identity is stable across
  renders. **Lesson for future work on this codebase**: a value recreated on every render but fed
  into a `useMemo`/`useCallback` dependency array silently busts that memo every render, not just
  when its logical inputs change — easy to miss since nothing throws and the UI often still "looks
  right" for anything slower than live typing (a reload-driven test would have passed here, since
  by the time you read the saved value the cursor-stealing damage was already baked into what got
  typed).
- **Verified live**: created a table, added a text column, added a row, typed a code (`C6`) into
  the cell (first catching the bug above this way, then confirming the fix the same way), saved,
  confirmed persistence on reload, and confirmed the `rows`-sourced text mention appeared correctly
  on C6's "What links here" ("Test Ruler Table — Mentioned in"), then deleted the test table and
  confirmed the mention was cleanly gone. CSV import/export were not live-tested this pass (a
  disclosed scope cut, not an oversight) — `papaparse` is a mature, widely-used library and the
  glue code around it is small; worth a quick manual spot-check before relying on it for a real
  import.

### Phase 6: Gaps view

Hard rule 4: any entry whose `status` is not `locked` is a normal row, visually flagged. The plan
(`traveler-wiki-build-plan.md`, "Creative-assist layer") calls for a view listing every such entry
with its `gapPrompt` so gaps can be resolved in a batch — `gapPrompt` itself and the per-entry
status editor already existed (every entity read page, plus the continuity check's
`buildNewRecordGapPrompt`); this step is the missing aggregate view across every collection.

- **Data layer**: `getGapRecords()` in `lib/world/queries.ts`, modeled directly on the existing
  `getUnkRecords()` next to it. Loops `ENTITY_SLUGS` minus `writing` (no `status` column — it uses
  `canonState` instead) and skips `relationships` entirely (no status concept at all; it isn't in
  `ENTITY_SLUGS`). `events` and `stories` are special-cased like in `getUnkRecords` since they
  aren't in `WORLD_TABLE_MAP`; everything else goes through `getWorldTable()`. Each collection's
  rows are filtered server-side with `ne(table.status, 'locked')` and sorted newest-updated-first.
- **UI**: `app/(app)/gaps/page.tsx`. One page, grouped by collection (reusing the same
  `COLLECTION_LABELS`/`collectionHref` pattern as `/review`), each row showing the code, a link to
  the record, an inline `EditableField` select for `status` (same `STATUS_OPTIONS` used on the
  entity pages), the human-readable status label, and an inline `EditableField` textarea for
  `gapPrompt` — so a gap can be read, and either resolved (edit the prompt, flip status to
  `locked`) or re-prioritized, without leaving the page. No new component: both `EditableField`
  instances are the exact same component already used on every entity read page, just assembled
  onto one aggregate list. Nav entry added to `app/(app)/layout.tsx` under Tools, next to Review.
- **Verified live** (light touch, per the "stop testing so much" standing instruction — the
  `EditableField` save path itself is already proven elsewhere, so this only needed to confirm the
  new aggregation query and page): loaded `/gaps` against real data — 217 entries not yet locked
  across 7 collections (Characters, Locations, Events, Factions, Cultures, Lore, Stories), each
  showing its real `gapPrompt` text and status, grouped and linked correctly. Did not click through
  an actual inline edit on this page specifically (not needed — same component, same server
  action, already covered by prior sessions' live tests on entity pages).
- **Build**: `npm run build`, zero errors, `/gaps` listed as a new dynamic route.

### Step W5: boards

A board (code D) is either a saved, reusable graph view over the link index (node map, content
tree, family tree, causal tree, story map — all one schema, distinguished only by `kind` and
default query presets) or a free-form whiteboard. A board never creates edges in the link index —
it only draws them.

- **Library spike** (recorded in `CLAUDE.md`'s stack table): `tldraw@5.6.0`. React 19 SDK,
  actively maintained, sticky notes/shapes/images/frames built in, and its own `editor.getSnapshot()`
  / `editor.loadSnapshot()` persist the whole canvas as opaque JSON — a direct fit for the `scene`
  column, so the board's own `notes`/`connectors` fields from the original plan spec were dropped
  in favor of letting tldraw own the whole whiteboard data model (hard rule 10: off-the-shelf
  before hand-rolling). Note: tldraw's free tier shows a small "Get a license for production"
  watermark on the canvas — acceptable for a personal, non-commercial tool; flagged here in case
  it ever matters later.
- **Schema**: `boards` table (`worldSharedCols()` plus `kind`, `rootCodes` (code array), `query`
  (collections/relationshipTypes/sources/direction/depth/yearFrom/yearTo), `layoutMode`
  (`auto_tree`/`manual`), `nodePositions` (code → `{x,y,collapsed?,pinned?}`), `scene` (opaque,
  whiteboard only), `viewport`). Migration `0008_secret_tempest.sql` (purely additive), applied to
  `APP_DATABASE_URL`.
- **Full data-layer wiring**, following the same pattern as `chronicles`: `boards` added to
  `WORLD_TABLE_MAP` in `lib/world/actions.ts`, `lib/world/queries.ts`, `lib/graph/sync.ts`, and to
  `scripts/rebuild-links.ts`'s `TABLES` map; code assignment (D prefix) in `lib/codes.ts`;
  text-mention scanning in `lib/graph/extract.ts`; node styling in `lib/nodeKinds.ts`; nav entry in
  `app/(app)/layout.tsx`. Deliberately **not** added to `ARRAY_FIELD_LINKS`/`SIMPLE_FIELD_LINKS` or
  `isLinkRelevantField` — `rootCodes`/`query`/`nodePositions`/`scene` never produce link-index rows
  (only the generic parent-field link and name/summary/body text mentions do, same as every other
  collection), matching the spec's "a board never creates edges in the link index."
- **No bespoke server actions needed**: the existing generic `createEntityAction`/`updateFieldAction`
  cover boards entirely (array fields like `rootCodes` survive the generic create path's
  non-primitive-field strip since arrays aren't stripped, only plain objects are; `query`/
  `nodePositions`/`scene` default to the schema's jsonb defaults on create and are set afterward
  via `updateFieldAction`) — another instance of the "try the off-the-shelf/existing path first"
  rule, this time within the app's own code rather than a library.
- **UI**: `app/(app)/boards/page.tsx` (list) + `components/new-board-form.tsx` (name + kind select).
  `app/(app)/boards/[code]/page.tsx` (detail, kind-aware: whiteboard kind renders
  `components/board-whiteboard.tsx`, every other kind renders `components/board-graph-view.tsx`).
  `components/board-graph-view.tsx` reuses the exact same `/api/graph` and `/api/graph/:code`
  routes and `layoutNodeMap` dagre layout already proven by `components/node-map-view.tsx` (step
  Phase 5) — multi-root support fetches each root code's centered graph separately and merges
  node/edge sets client-side, since the existing route is single-code-centered. Supports
  `auto_tree` (dagre, recomputed live) and `manual` (drag any node to switch modes, position
  persisted per-code in `nodePositions`) layout modes, with a "Reset to auto layout" and a "Save
  view" button that persists `rootCodes`/`query`/`layoutMode`/`nodePositions` in one batch.
  `components/board-whiteboard.tsx` (`next/dynamic(..., {ssr:false})`, same pattern as
  `components/map-canvas.tsx`, since tldraw touches `window` at import time) wraps
  `components/board-whiteboard-inner.tsx` — the tldraw canvas, a "Save board" button
  (`editor.getSnapshot()` → `scene`), and a simple "Promote to relationship" bar (type a from-code,
  pick a relationship type, type a to-code, Create link → `createRelationshipAction`). This is a
  deliberate scope cut from the original plan's idea of parsing tldraw's internal arrow-binding
  model to auto-detect connectors: typing two codes is simpler, more robust against tldraw's
  internal shape model changing across versions, and still satisfies the spec's actual requirement
  ("Promote to relationship creates an X record").
- **Verified live**: created a node-map board (D1, kind `node_map`), confirmed the whole-graph
  default view renders; selected a single root entry (Vashten/C3), confirmed the centered
  `/api/graph/:code` fetch and dagre layout render real data with edges; dragged a node, confirmed
  it switched to manual layout; clicked Save view, reloaded, confirmed `rootCodes`, `layoutMode`,
  and the dragged node's exact saved position all persisted. Created a whiteboard board (D2, kind
  `whiteboard`), placed a sticky note, clicked Save board, reloaded, confirmed the shape persisted
  (tldraw's canvas doesn't reliably screenshot over CDP for an automated browser — a tooling
  limitation, not a product bug — so this was confirmed via the DOM text "Note. 1 of 1" rather than
  a screenshot); used the Promote-to-relationship bar to link C1 → C6, confirmed the `X` record and
  its link-index row appeared correctly on C1's read page, then removed it the normal way through
  the Relationships editor and confirmed it was gone cleanly on reload. All test boards and the
  test relationship were deleted afterward.

### Step W4: chronicles

A chronicle (code H) pairs a timeline strip with a map: selecting an event moves the map to
wherever that event happened and switches maps when the pin sits on a different one than is
currently shown.

- **Schema**: `chronicles` table (generic `worldSharedCols()` plus `mapPeriods` jsonb
  `{mapId, fromYear, toYear, isDefault}[]`, `eraIds` jsonb `number[]`, `filter` jsonb
  `{collections, tagIds, involvesCodes}`, `startYear`/`endYear`). New `event_pins` join table
  (plain `{eventId, mapPinId}`, not the generic `entryCollection/entryId` shape, since pins are
  always `map-pins`) — the map pins showing where an event happened. Migration
  `0007_acoustic_photon.sql` (purely additive), applied to `APP_DATABASE_URL`.
- **Full data-layer wiring**, following the same pattern as `eras`/`maps`/`map-pins`: `chronicles`
  added to `WORLD_TABLE_MAP` in `lib/world/actions.ts` and `lib/world/queries.ts`; code assignment
  (H prefix) in `lib/codes.ts`; text-mention scanning in `lib/graph/extract.ts`; link-index sync in
  `lib/graph/sync.ts` (`eraIds` through the existing `ARRAY_FIELD_LINKS` mechanism; two bespoke
  extractors, `extractEventPinsLinks` and `extractChronicleMapPeriodsLinks`, for the two
  non-generic jsonb/join shapes, with `isLinkRelevantField` taught that `chronicles.mapPeriods` is
  link-relevant); node styling in `lib/nodeKinds.ts`; nav entry in `app/(app)/layout.tsx`;
  `scripts/rebuild-links.ts`'s `TABLES` map.
- **Queries** (`lib/world/queries.ts`): `getEventPins`, `getChroniclesList`, `getChronicleByCode`
  (resolves `mapPeriods` map refs and `eraIds` era rows), `getEventsForChronicle` (loads a
  chronicle's events within its year range, applying the `filter`), and `getMapsDataByIds` — all
  the maps a chronicle might need are prefetched server-side in one batch (since the active map
  changes client-side as the user clicks events), which required extracting `getMapByCode`'s body
  into a shared `buildMapData()` helper.
- **UI**: `app/(app)/chronicles/page.tsx` (list) + `components/new-chronicle-form.tsx`;
  `app/(app)/chronicles/[code]/page.tsx` (detail/editor — map periods, eras shown, and event
  filters, plus the paired view); `components/chronicle-config.tsx` (`MapPeriodsEditor`,
  `ChronicleErasEditor`, `ChronicleFilterEditor`); `components/chronicle-view.tsx` — a custom,
  lightweight, read-only timeline strip (plain percentage-based absolute positioning, same
  technique as the era-band overlay on `/timeline`, deliberately lighter than
  `react-calendar-timeline` since chronicles only need click-to-select, not drag-editing) paired
  with `MapCanvas` in `editable={false}` mode; selecting an event resolves the map to show via its
  first pin if it has one (focusing that pin), else via `mapPeriods` (preferring the entry marked
  `isDefault`) for the event's year. `components/event-pins-editor.tsx` (`EventPinsEditor`, added
  to the event read page) mirrors the maps step's `PinLinksEditor` code-input Add/Remove pattern.
- **Two real, pre-existing bugs found via live testing** (not introduced this step, but surfaced
  while exercising the era-deletion path during W4 verification): `checkDeleteConflictsAction`'s
  "events that involve this entry" delete-conflict check, and the read-only `getEventsInvolving()`
  query (used on every world-entity read page's "Events involving this" section), both filtered
  `eventInvolves` rows by `entryId` alone, never scoping by `entryCollection` — so two records in
  different collections that happen to share a numeric id falsely cross-reference each other's
  involvement (ids are per-table sequences, not globally unique). Confirmed live: deleting era Y3
  (id=3) was falsely blocked by an `eventInvolves` row that actually belonged to a `locations`
  entry with the same numeric id. Fixed both by adding the missing `entryCollection` filter.
  **Lesson for future work on this codebase**: any join-table lookup keyed by a generic
  `(entryCollection, entryId)` pair must filter by both fields together — filtering by `entryId`
  alone is a silent correctness trap the moment two unrelated records in different collections
  share a numeric id.
- **Verified live, in order**: chronicle creation; event selection switching the displayed event;
  adding a map period and watching the view fall back to the default map correctly; era-band
  rendering at the correct position; the "only show events involving these collections" filter
  correctly narrowing the event set; the link index recording `showsMap` (confirmed via "What
  links here" on a map showing "Shown by chronicle" after adding it as a map period) and `pins`
  edges; drawing a pin on a test map, linking it to an event via `EventPinsEditor`, and confirming
  selecting that event in the chronicle view switched to that map and opened/focused that exact
  pin — the core "selecting an event zooms to its pin" spec requirement. All test records (test
  chronicle, test map and its pin, the leftover duplicate test era from W3's cleanup) were deleted
  afterward.

### Step W3: maps

Library spike, schema, full CRUD wiring, viewer/editor UI, Location-page embed, and live-browser
verification of every interactive path (pin/circle create, drag, circle resize, links editor,
behavior select, delete with cascade cleanup). All test data created during verification was
deleted afterward; `scripts/_tmp-check-pins.mjs` (a scratch DB-check script) was deleted too.

- **Library choice** (recorded in `CLAUDE.md`'s stack table): `leaflet@1.9.4` + `react-leaflet@5.0.0`
  (confirmed React 19 peer-dep support) with `CRS.Simple` for pixel-based, non-geographic image
  maps. Drawing/editing toolbar: `@geoman-io/leaflet-geoman-free@2.20.6` (actively maintained,
  unlike the stale `leaflet-draw`).
- **Schema**: `maps` (M) and `map_pins` (P) tables plus a `map_pin_links` many-to-many join table
  (a pin's popup/links list references any number of entries across collections). Migration
  `0005_shiny_jocasta.sql` (additive, both tables + 7 indexes), applied to `APP_DATABASE_URL`.
  A follow-up migration `0006_neat_nighthawk.sql` dropped `map_pins.geometry`'s `NOT NULL`
  constraint (see the bug below) — also applied.
- **Pixel-coordinate discipline** (hard rule 16): `lib/maps/coords.ts` centralizes every
  conversion between the app's true pixel geometry (origin top-left, y-down, plain
  `{x,y}`/`{x,y,radius}`/`{points:[[x,y],...]}`  — the only thing ever persisted) and Leaflet's
  internal lat/lng (y-up under `CRS.Simple`). Nothing Leaflet-specific (a LatLng, a zoom level) is
  ever written to the database.
- **Full data-layer wiring**, following the same pattern established for `eras`: `maps`/`map-pins`
  added to `WORLD_TABLE_MAP` in `lib/world/actions.ts` and `lib/world/queries.ts`; code assignment
  (M, P prefixes) in `lib/codes.ts`; text-mention scanning in `lib/graph/extract.ts`; link-index
  sync in `lib/graph/sync.ts` (including a dedicated `extractMapPinLinksLinks` for the
  `map_pin_links` join table, since it's a separate table from the generic field-link pattern);
  route mapping in `lib/graph/href.ts` (`/maps/:code`, pins redirect through `/pins/:code` →
  `/maps/:mapCode?pin=:code` since a pin has no page of its own); node styling in
  `lib/nodeKinds.ts`; nav entry in `app/(app)/layout.tsx`.
- **Bespoke pin actions** (`lib/world/actions.ts`): `createMapPinAction` (two-step — the generic
  `createEntityAction` strips non-primitive fields on insert, so it creates the row first, then
  sets `geometry` via `updateFieldAction` immediately after), `updateMapPinGeometryAction`
  (drag/resize/reshape), `resolveEntryForLinkAction` (code/name → entry for the links editor),
  `updateMapPinLinksAction` (replaces a pin's `map_pin_links` rows).
- **UI**: `components/map-canvas-inner.tsx` (the full Leaflet/geoman viewer+editor — pan/zoom,
  base image + layer overlays with visibility toggles, pin-group visibility toggles, pin/circle/
  polygon/line rendering, click-to-select with popups, a draw toolbar, drag-to-move, an "Edit
  shape" mode for circles/polygons/lines, a links editor, a behavior selector, delete), wrapped by
  `components/map-canvas.tsx` (`next/dynamic(..., {ssr:false})`, same pattern as
  `components/timeline-view.tsx`). `components/map-base-image-upload.tsx` (upload flow, adapted
  from `infobox.tsx`). `app/(app)/maps/page.tsx` (list) + `components/new-map-form.tsx`.
  `app/(app)/maps/[code]/page.tsx` (detail/editor, accepts `?pin=` for deep-linking).
  `app/(app)/pins/[code]/page.tsx` (thin redirect to the owning map). Embedded read-only
  (`editable={false}`) on the Location read page (`app/(app)/[entityType]/[slug]/page.tsx`) when a
  location has one or more linked maps.
- **Three real bugs found and fixed via live-browser testing** (type-check and build alone would
  not have caught any of these):
  1. **Geoman's `window.L` race** (`ReferenceError: L is not defined`) — a static top-level
     `import` of the plugin ran before Leaflet was attached to `window`. Fixed with a
     `loadGeoman()` dynamic-import singleton that sets `window.L = L` first.
  2. **Geoman's init-hook never fires on React-constructed objects** (`TypeError: Cannot read
     properties of undefined (reading 'addControls')`) — react-leaflet constructs the Map/shape
     instances before geoman's async import resolves, so its `addInitHook`-based `.pm` attachment
     misses them. Fixed by reading geoman's own source
     (`node_modules/@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.js`) and writing
     `ensureMapPm`/`ensureLayerPm` to manually replicate the exact constructions
     (`new L.PM.Map(this)`, `new L.PM.Edit.Circle/Polygon/Line(this)`) it would have run.
  3. **`map_pins.geometry` NOT NULL violated by the two-step create, silently.**
     `createEntityAction`'s generic insert strips non-primitive fields, so `createMapPinAction`'s
     first INSERT (no `geometry` yet) always failed the NOT NULL constraint — caught by
     `createEntityAction`'s own try/catch (`return {id:0, error:...}`, no throw), and the client
     (`DraftPinForm.handleSave()`) never checked the result for `.error`, so the UI just closed the
     draft form as if it had succeeded. Confirmed via a direct DB query showing the pins table
     empty after an apparently-successful create. Fixed three ways: `geometry` is now nullable
     (migration `0006`, with an explanatory comment in `db/schema.ts`), `getMapByCode` filters out
     any pin with a null `geometry` as defense-in-depth, and `DraftPinForm.handleSave()` now checks
     `result.error` and surfaces it in the form. **Lesson for future work on this codebase**: a
     client component that calls a server action and discards its return value without checking
     `.error` can hide a real server-side failure behind an apparently-successful UI transition —
     always check the result.
- **A fourth real bug, found during this session's final cleanup pass**: deleting a map or a pin
  left orphaned rows in `map_pin_links` — no DB-level cascade is defined on
  `map_pins.mapId`/`map_pin_links.mapPinId`, and the generic `deleteEntityAction` only ever
  deleted the one row plus that record's own link-index entries. Fixed in
  `lib/world/actions.ts`: deleting a `map-pins` record now deletes its `map_pin_links` rows first;
  deleting a `maps` record now deletes all of its pins' `map_pin_links` rows, then the pins
  themselves (and removes each pin's own link-index entries), before deleting the map row.
  Verified live: created a map with a linked pin, deleted the map through the UI, confirmed via
  direct DB query that `maps`, `map_pins`, and `map_pin_links` were all empty afterward, and that
  no stale entries for the deleted codes remained in the `links` index either.
- **`scripts/rebuild-links.ts` was also missing `eras`, `maps`, and `map-pins`** from its
  hardcoded `TABLES` map (a pre-existing gap for `eras`, from the Phase 5 session, that W3's dry
  run run surfaced). Added all three — `eras` for the first time, matching the pattern this script
  already uses for every other collection. Re-ran the dry run clean afterward (0 records for all
  three, since no eras/maps/pins exist right now; the point was confirming the script no longer
  silently skips them).
- **Verified live, in order**: pin creation (marker shape, code `P3`) and persistence; circle
  creation (code `P4`), drag-to-move, and "Edit shape" resize, each confirmed via direct DB query
  of the stored pixel geometry; the links editor (added a real culture entry, Caeldrath Culture/U3,
  to a pin's links, confirmed in `map_pin_links`); the behavior select (`open_entry`) — clicking
  the pin navigated straight to `/cultures/U3` instead of showing the popup; the per-pin Delete
  button (removed the pin, its popup, and its "What links here" listing, and — after the fix above
  — its `map_pin_links` row); the page-level map Delete button, with an in-page (not native)
  confirm step, cascading correctly to its pins and their links; the Location-page embed, by
  linking a throwaway map to a real location (L1, CALDOR) and confirming it rendered with no
  console errors, then deleting that map too. Polygon and line drawing were not separately
  clicked through — they share the identical `pm:create` → draft-form → save path already proven
  for pin and circle, so this was judged a reasonable scope cut for this pass; worth a quick spot
  check before W4 (chronicles) leans on pins more heavily.

### Phase 5: views

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
- Node map + per-entry relationship view: installed `@xyflow/react` (React Flow, per the stack
  table) and `dagre` (layered graph layout — not in the stack table since it's an internal layout
  detail, not a user-facing feature choice; chosen because it's the standard, lightweight pairing
  with React Flow for exactly this shape of problem). The backend (`/api/graph`, `/api/graph/:code`,
  `/api/codes/:code/links`, `lib/graph/queries.ts`) already existed from G1 — this chunk is
  frontend only. New: `lib/graph/layout.ts` (`layoutNodeMap()` — dagre, left-to-right, isolates
  grid below; `layoutRelationshipView()` — entry-centered, columns by relationship `group` from
  `lib/relationshipTypes.ts`, Family column ordered parents-above/children-below via `hierarchy`),
  `components/graph-node.tsx` (one shared node renderer — icon + color from `lib/nodeKinds.ts`,
  used by both views, per hard rule 15), `components/node-map-view.tsx` + `app/(app)/node-map/page.tsx`
  (full map: filter by collection and connection type, search a starting entry + steps-out depth,
  click a node to re-center, double-click to open it), `components/relationship-view.tsx` (embedded
  per-entry, below `RelationshipEditor` and above `WhatLinksHere` on both the generic world-entity
  page and the events page — `WhatLinksHere` stays as the plain text list, this is the visual
  companion). Also added `getGraphCandidates()` (`lib/world/queries.ts`) for the node map's search,
  and `lib/graph/href.ts` (`hrefForNode()`) — pulled the collection→route mapping that `code-text.tsx`,
  `what-links-here.tsx` and `convergence-view.tsx` each had their own copy of into one shared
  function, so it can't drift between views again the way `code-text.tsx`'s regex did.
- Found and fixed a real bug during verification, not just a test artifact: clicking a node to
  re-center the map runs `setStartCode` immediately, which re-fetches and re-lays-out the graph —
  but that layout shift can displace the node out from under the second click of a genuine
  double-click before it lands, so double-click-to-open silently degraded into two single
  re-centers. Fixed by debouncing the center (250ms) and having `onNodeDoubleClick` cancel the
  pending center before navigating, so a real double-click always wins the race.
- Verified live: node map's whole-graph view rendered 349 nodes / 59 edges with correct DOM
  positions and no console errors; clicking a node re-centered and re-fetched correctly (confirmed
  via `/api/graph/:code` response reflected in the DOM — E94 centered showed its one real edge,
  "Took place at" → MOSSEND L9); double-click navigated to `/events/E94` after the debounce fix
  (it failed, silently re-centering instead, before the fix — this is what surfaced the bug above);
  the embedded relationship view on `/events/E94` showed the same 2-node/1-edge graph; on
  `/characters/C1` (SERO) it rendered 18 nodes / 17 edges, center fixed at (0,0), event nodes
  correctly grouped in a single column. No test-data mutations were made (read-only verification).
- Story board (`/story-board`): stories grouped by their existing free-text `era` field (the seven
  story-catalog eras — `era_one`..`era_seven`, unrelated to the new Y-coded `eras` timeline
  collection; this field already existed on `stories`, nothing new needed in the schema) and
  `stage`, floating stories (`floating = true`) pulled into their own lane above the grid, per
  `stories.era`/`stage`/`floating`. New `lib/stories.ts` (`STORY_ERAS`, `STORY_STAGES` + label
  maps) — pulled out of `app/(app)/stories/page.tsx`, which had its own local copies of both maps,
  so the story board can't drift from the stories list's labels. Read-only grid (no drag-and-drop —
  not in the plan for this view; `dnd-kit` is reserved for Phase 7 compilation reordering per the
  stack table); editing stage/era still happens on the story's own read page.
- Verified live: all 73 real stories rendered in their correct cells (9 floating, the rest spread
  across all seven era rows), no console errors, a card's link resolved to the correct
  `/stories/S16` read-page route.
- W2 polish (search/filter, time gaps, mini-map, two-tier header) — closes out Phase 5's checklist:
  - **Time gaps**: `lib/timeline-scale.ts` gained `compressYear()`/`expandYear()` (real year <->
    compressed display year, piecewise-linear over `timelineSettings.gaps`) and `yearToMs()`/
    `msToYear()` composing those with the existing `sortOrderToMs()`/`msToSortOrder()`. Both are
    the **identity when `gaps` is empty** — every one of `timeline-view-inner.tsx`'s existing call
    sites (items, drag, zoom-to-fit, click-to-add, era bands, the DateHeader labels) was switched
    from the raw `sortOrderToMs`/`msToSortOrder` to gap-aware `toMs`/`toYear` wrappers, so with no
    gap configured the view behaves byte-identically to before this feature existed — verified by
    re-running the exact same drag/zoom checks from the eras/lanes chunk. New
    `components/timeline-gaps-manager.tsx` (same collapsible-panel pattern as `era-manager.tsx`)
    edits the existing `timelineSettings.gaps` singleton field (schema and
    `updateTimelineSettingsAction` already existed from the Phase 5 start but had no UI until now).
    A new gap-band overlay (same absolutely-positioned-overlay technique as era bands) marks each
    gap's squeezed span with a dashed border and rotated label.
  - **Two-tier header**: a `unit="primaryHeader"` `DateHeader` (the library's auto-granularity
    row, which normally labels in real calendar terms) stacked above the existing per-year row,
    with a custom `intervalRenderer` that converts the row's own interval boundaries through
    `toYear()` so it always shows "Year N–M" instead of a real calendar date.
  - **Mini-map**: new `components/timeline-minimap.tsx`, a plain overview strip (not a
    react-calendar-timeline feature) spanning every event's year range, a density tick per event,
    the current viewport as a highlighted rectangle, click-anywhere-to-recenter. Operates in the
    same compressed-ms space the main canvas does, so it never drifts from what's on screen.
  - **Search/filter**: a search box (`components/timeline-view-inner.tsx`, reusing the existing
    zoom-to-fit logic factored out as `zoomToEvent()`) with a live dropdown of title matches; an
    event-type `MultiSelect` that dims (not hides, so lanes/positions never shift) non-matching
    items via the `itemRenderer`.
  - Found and fixed a real bug during verification, not a test artifact: the first drag attempt
    (a `left_click_drag` at the item's reported center) registered as neither a click nor a drag —
    the DB showed no change at all. Re-measured the item's actual `getBoundingClientRect()`
    immediately before retrying (rather than reusing a stale position from an earlier query) and
    the drag then worked correctly and committed. Root cause was stale coordinates in the test,
    not application code — recorded here because it's a trap worth remembering for any future
    live-browser drag test on this view: always re-read the element's rect right before dragging it.
  - Verified live: two-tier header renders correctly with `gaps=[]` (identity case holds, no
    console errors); search-to-zoom centers the correct event (typed "Ritual", clicked the match,
    confirmed the header range shifted to center on year 7); event-type filter dims all items when
    none match and un-dims on clear; drag-to-reposition still correctly persists (`E1`'s
    `startYear` 7 → 10 → reverted to 7 afterward via a one-off script, same cleanup pattern as
    prior sessions); added a real gap (years 40→100, shown as 5) via the new UI and confirmed the
    header ticks compressed exactly as designed (`40, 52, 64, 76, 88, 100` — 60 real years over 5
    compressed ticks, 12 years each) with the "60 YEARS SKIPPED" marker in the right place, then
    removed it and confirmed `timeline_settings.gaps` is back to `[]`.

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
- `/node-map`
- `/story-board`
- `/continuity`, `/continuity/[flagCode]`
- `/snippets`, `/snippets/new`, `/snippets/[id]` (stubbed)
- `/link-health`
- `/maps`, `/maps/[code]` (W3)
- `/pins/[code]` (thin redirect to its owning map, W3)

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

1. **S4 to S7.** AI foundation, Story Builder, Ask AI and the prompts menu, canon check extensions
   (S7 is also where Phase 4's documented "Draft never spreads" gap gets closed, via the claims
   ledger — see the Phase 4 section above). **Still blocked** on the Vercel AI Gateway billing
   issue (`customer_verification_required`) — re-confirmed a third time this session (Bobby said
   it was resolved; the spike still failed identically, including after a 90s wait in case it was
   a propagation delay) — looks like an account/team-scoping mismatch between where the card was
   added and the team `AI_GATEWAY_API_KEY` belongs to, not something retrying from here can fix.
   Re-spike once Bobby confirms the team/key match in the Vercel dashboard, then resume.
2. **Phases 7 and 8.** Export, compilations, search, deploy. Phase 6's Gaps view is now closed
   (see its section above); Review (UNK) was already done in Phase 3; Suggestions stays blocked on
   S4-S6 above. Phases 7-8 are the next unblocked work while S4-S7 waits on the billing fix.

3. **Phase 5A, steps U1 to U6 (working surfaces).** Header actions, editable relationships and
   place history, a writing area on story pages, table and status board views on collection pages,
   editing and record popups in the relationship view and node map, and drag and drop on the story
   board. Detail is in `traveler-wiki-build-plan.md` ("Steps U1 to U6"). Not started. Step U3
   depends on the Lexical crash below being fixed first. The order within 5A, and where it sits
   against items 1 and 2, is the user's call.

Also still open: the pre-existing Lexical #173 / React #418 crash on `/write[code]` (Phase 4 gap
#2) — blocks using the Writing Studio day to day, worth fixing before leaning on it further.

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
