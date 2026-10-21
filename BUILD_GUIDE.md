# BUILD_GUIDE.md: working log for building The Traveler

Session-to-session memory for this build. Read this before `traveler-wiki-build-plan.md` and
`docs/PLAN_WRITING_AND_AI.md` on every new session. This file says where things actually stand; the plan says what the finished product
looks like. Update "Current state" and "Next up" at the end of every session.

---

## Current state (as of 2026-10-21)

**Phase 2A complete. Phase 2B complete. Phase 2C applied. S1 Writing Studio complete. Phase 3 (S2 + W1) complete, awaiting Gate P3a browser checks.**

Phase 2A: all old-DB data is in Payload. Migration is fully idempotent. Counters: C=37, E=114,
L=12, X=5, T=2. C1=SERO, L1=CALDOR. UNK queue: E2, E16, E36 to E39, X1 to X4.

Phase 2B: 40 stories imported (S1 to S40). S counter = 41. Two idempotent runs confirmed (run 2
skipped all 40). 16 UNK stories.

Phase 2C: applied 2026-10-20. 149 records created across 7 collections. `scripts/import-story-bible.ts`
wrote and ran idempotently (0 created on second run). Aldric alias already present on C4 (skipped).
Counters after: C=40, L=13, U=5, F=2, K=102, S=74, W=3. UNK tag on all 149.

S1 Writing Studio: complete 2026-10-20. Files added:
- `lib/studio/queries.ts` - getWritingList, getWritingByCode, getStoryList (Payload Local API)
- `lib/studio/actions.ts` - createWriting, saveWriting, deleteWriting, searchEntities (server actions)
- `lib/studio/lexical.ts` - server-side Lexical <-> Markdown conversion (headless, for tests)
- `app/(app)/write/page.tsx` - writing list grouped by story, state filter, New button
- `app/(app)/write/_new-button.tsx` - client component for creating new writing records
- `app/(app)/write/[code]/page.tsx` - server component loading one record
- `app/(app)/write/[code]/editor.tsx` - Lexical editor client component
- `scripts/verify-s1.ts` - round-trip and counter verification
- `canonState` field added to Writing collection in both entities.ts files; types regenerated.
Round-trip test: W1 OK (909w, # symbol stripped), W2 OK (302w), W3 OK (108w). Counter test: W4
created and deleted, plainText populated by hook, counter increments correctly (no rollback on delete).

`scripts/migrate-legacy.ts`: legacy migration, idempotent.
`scripts/import-story-catalog.ts`: story catalog, stage then apply, skip existing.
`scripts/import-story-bible.ts`: applied 2026-10-20, idempotent.

Phase 1 complete 2026-10-19. Phase 2A complete 2026-10-19. Phase 2B complete 2026-10-20.
Phase 2C applied 2026-10-20. S1 complete 2026-10-20, awaiting browser checks.

**Phase 3 / S2 + W1 (2026-10-21):** Full unattended run per PHASE_3_HANDOFF.md.
Parts 1-6 all complete, build passes zero errors.

New files:
- `lib/world/queries.ts` - all data fetchers (Local API only)
- `lib/world/actions.ts` - CRUD server actions: create, updateField, updateDetails, delete (with conflict check), createRelationship, deleteRelationship, updateTags, updateEventInvolves, attachImage, updateEventYear
- `lib/world/fields.ts` - field definitions per collection driving create forms and edit UI
- `components/editable-field.tsx` - click-to-edit inline field
- `components/details-editor.tsx` - details array editor with dnd-kit drag-to-reorder
- `components/relationship-editor.tsx` - add/remove relationships via Local API
- `components/delete-record-button.tsx` - delete with conflict check and refusal list
- `components/new-entity-form.tsx` - reusable create form driven by field defs
- `components/infobox.tsx` - infobox with image upload/remove (client component)
- `components/world-tree.tsx` - searchable four-mode tree with drag-to-reparent
- `scripts/verify-world-edit.ts` - create/edit/relate/delete/counter verification (all passed)
- `scripts/verify-w1.ts` - infobox and image field verification (all passed)
- `GATE_P3_REPORT.md` - gate report with browser checklists for both Gate P3a and P3b

Updated pages:
- `app/(app)/layout.tsx` - three-pane shell with nav, world tree panel, main canvas
- `app/(app)/page.tsx` - home hub: tiles, counts, UNK status bar, recent edits
- `app/(app)/[entityType]/[slug]/page.tsx` - full in-place edit + infobox + relationships + delete
- `app/(app)/events/[slug]/page.tsx` - full in-place edit for all event scalar fields
- `app/(app)/stories/[code]/page.tsx` - in-place edit of stage/format/era/years + relationships + delete
- `app/(app)/[entityType]/new/page.tsx` - new entity (rewritten, no old imports)
- `app/(app)/events/new/page.tsx` - new event (rewritten, no old imports)
- `app/(app)/stories/new/page.tsx` - new story route
- `app/(app)/[entityType]/page.tsx` - list with image thumbnails

Counters unchanged after both verify scripts. No old-code imports in any new file.

Note for browser check: dev server restart needed once before Gate P3a checks so Payload picks up schema changes.

**v3.0 planning (2026-10-20).** The four guiding docs (`CLAUDE.md`, this file,
`traveler-wiki-build-plan.md`, `docs/PLAN_WRITING_AND_AI.md`) were updated together. What changed:
- New steps W1 to W6 (world tree and infobox, eras and the timeline canvas, maps, chronicles,
  boards with trees and whiteboards, interactive tables) and G1 (the link index). Specs are in the build plan.
- New code prefixes B, Y, M, P, H, D, N (A stays reserved). None is in `lib/codes.ts` yet.
- All AI runs on Claude through Vercel AI Gateway. The web research step was removed.
- One master build order, in the build plan ("Build order").

---

## Findings from the full codebase review (2026-10-17)

### Keep as is
- `source-docs/` (all of it). Reference material and the input to both one-time imports.
- `components/ui/*` (shadcn primitives), `app/globals.css`, `postcss.config.mjs`, `components.json`.
- `lib/timeline-scale.ts`, `lib/utils.ts`.
- `lib/continuity/analyze.ts`, `constants.ts`, `links.ts`, `plan.ts`, `text.ts`, `types.ts`. These
  six files do not touch the database, and `scripts/test-continuity.ts` (17 offline checks) covers them.
- `components/combobox.tsx`, `highlighted-text.tsx`, `status-badge.tsx`.

### Keep, but change what feeds it
- `components/timeline-view.tsx`, `timeline-view-inner.tsx`, `timeline-view.css`. The component
  stays; it reads `startYear` from Payload instead of `sort_order` from the old tables.
- `app/timeline/page.tsx`, `lib/data/events.ts`: re-point to the Local API.
- `app/layout.tsx` moves to `app/(app)/layout.tsx`. Payload brings its own root layout.
- `app/page.tsx` (home counts), `components/app-sidebar.tsx` (collections list, link to `/admin`).
- `components/entity-read-view.tsx`, `event-read-view.tsx`, `wiki-text.tsx`, `lib/wiki-resolve.ts`:
  become read pages that link ID codes instead of `[[...]]` links.
- Continuity UI: `app/continuity/page.tsx`, `app/continuity/[flagId]/page.tsx`,
  `components/continuity-badge.tsx`, `continuity-review-form.tsx`, `entity-continuity.tsx`,
  `snippet-check-status.tsx`, `undo-detail-button.tsx`. The decision screens stay on the frontend;
  they read and write Payload.
- `package.json`, `tsconfig.json`, `next.config.mjs` (wrap with `withPayload`), `.env.example`
  (add `PAYLOAD_DATABASE_URL`, `PAYLOAD_SECRET`).

### Rewrite on the Local API
- `lib/continuity/run-check.ts`, `lib/actions/continuity.ts`, `lib/actions/snippets.ts`,
  `lib/data/continuity.ts`, `lib/data/snippets.ts`.

### Retire after the migration is verified
- Hand-built CRUD pages: `app/[entityType]/**`, `app/events/**`, `app/snippets/new`,
  `app/snippets/[id]` (writing moves to the Payload admin; check progress shows on the writing record).
- Hand-built form components: `add-link-form`, `convert-to-event-button`, `delete-button`,
  `entity-fields-editor`, `location-select`, `status-select`, `type-select`, `view-edit-toggle`.
- Old data layer: `lib/actions/entities.ts`, `lib/actions/events.ts`, `lib/data/entities.ts`,
  `lib/data/events.ts` (after rewrite), `lib/data/entity-types.ts` (replaced by collection config),
  `lib/db/`, `drizzle/`, `drizzle.config.ts`.
- One-time scripts and parsers: `scripts/ingest.ts`, `lib/ingest/*`. Keep `markdown.ts` and
  `wikilinks.ts` until the migration and Markdown export are done, since both reuse their logic.
- Dependencies once nothing imports them: `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`,
  `react-hook-form` (one use), and later `remark`, `remark-wiki-link`, `unified`.
- `NEXT_SESSION_PROMPT.md` and `traveler-continuity-check-addendum.md` were stale and are replaced.

### Housekeeping found
- `package.json` has an `import:drive` script pointing at a file that does not exist. Remove it.
- `i-storyline-js` and `@dnd-kit/*` are installed and never imported (both are planned for later phases).
- No ESLint config file exists, so `npm run lint` does not run.
- `source-docs/rpg-ai-game-concept/SERO_OPENING_NARRATIVE_MINDMAP.md.b64` was never decoded to a `.md`.
- Several `source-docs/` files carry old chat transcripts that no parser reads (`Working-Doc.md`,
  the tail of `Consolidated-Story-Bible.md`). Leave them as reference.

### Risks
1. **Payload drops tables it does not know about by default.** Pointing it at the old database
   would wipe the old data. Payload gets a separate Neon database. The old one is read-only until
   the migration is verified.
2. **Next.js version.** Installed is 16.3.2. Payload's installation page lists 16.2.6 as the floor
   and other sources report 16.3.3 or higher for current Payload 3.x. Update to the latest patched
   16.x and install every `@payloadcms/*` package at one matching version.
3. **Payload 4 is in canary** (not stable as of early October 2026). Use 3.x stable.
4. **The continuity check has never run against the real database or the real model.** Expect to
   tune the two prompts after the first real run.
5. **Story ideas may be hiding in events.** The Timeline one-liners and "events to be developed" rows
   may include story ideas. The catalog import flags close title matches for a human decision.
6. **Code numbering order** cannot be recovered from the old data (ids are random). The migration
   numbers in source-document order and shows the list before writing.

---

## Decisions already made (do not re-litigate)

- All writing and storage live in Payload. The Payload database is the only source of truth. The
  move from the old database and the story catalog import are one-time.
- Every record has a permanent code. Prefixes are C, L, E, I, F, U, R, G, K, S, W (entries), X
  (relationships), Q (continuity flags), T (tags), A (reserved, compilations).
- Story ideas are their own collection (`stories`, prefix S), one record per idea, with stage,
  format, era, years, beats, characters involved, and events dramatized. The prose itself lives in
  `writing` (prefix W).
- Year 0 is the year SERO is born. Prequels use negative years. `startYear` (position) and
  `yearLabel` (text) are independent.
- Items and artifacts merge into one `items` collection. Cultures are their own collection (prefix U).
  Factions (prefix F) sit inside a culture, and many factions can share one culture.
- Every record can carry tags. **UNK is a built-in tag meaning "applied on a best guess, double check it".**
  Claude, the migration and the imports add UNK plus a `reviewNote` whenever they guess. Only the user
  removes it.
- The four statuses (`locked`, `in_development`, `needs_name`, `placeholder`) carry over unchanged.
- Local development signs in automatically. A deployed copy keeps one real login.
- Off-the-shelf libraries are pre-selected: `react-calendar-timeline` (single line), `i-storyline-js`
  (convergence), React Flow (node map), `shadcn-multi-select-component` (sidebar), `@dnd-kit/sortable`
  (compilations), `remark-wiki-link` (migration and export only).
- The AI suggestion pane and the continuity check use the model through Vercel AI Gateway. They must
  never auto-insert prose. The suggestion prompt forbids finished prose.
- Canon decisions from the earlier ingestion stand: the immortality ritual is permanent and cannot be
  transferred to anyone else; the empire's collapse and the fourth ruler's assassination are Age ~820.
- Continuity check: the database is the only record of canon, so a decision updates the entry
  directly. Automatic writes are verbatim quotes of Bobby's own words only, each with an Undo;
  conflicts need his explicit decision.
- All AI runs on Claude, through the `ai` package and Vercel AI Gateway, behind `lib/ai/`. The model
  is chosen per task from Claude models in the `ai-settings` global.
- Every connection between records lives in the derived `links` index (step G1). Views, trees and
  the AI read connections from it. It is rebuilt from the records and never edited by hand.
- All visual features share one node shape and one edge shape (`lib/graph/types.ts`). Layout
  positions live on boards, not on records. Map coordinates are pixels on the base image.
- New code prefixes: B beats, Y eras, M maps, P map pins, H chronicles, D boards, N tables.
- Causes and consequences of events are relationships (`caused`, and `follows` with `offsetYears`
  for relative timing), not event fields. Events gain `eventType`, `importance`, `lane` and `pins`.
- The timeline is edited in place. There is no separate view mode and edit mode.
- The frontend has its own look. World Anvil is a behavior reference only, with notes in
  `C:\dev\REA_WorldAnvil`. Nothing of its code, art, icons, names or prompts is reused.
- Libraries for image maps, whiteboards and the table grid are chosen by a short spike at the start
  of steps W3, W5 and W6, and recorded in the stack table in `CLAUDE.md`.

---

## Next up (in order)

The master order is in `traveler-wiki-build-plan.md` ("Build order"). In short:

0. **S1 browser checks (Bobby).** See checklist below. After "studio checks done", delete any test
   pieces Bobby created and confirm the W counter stays at 4.
1. **Phase 3, S2 and W1.** Rewire the frontend on the Local API, retire the old code, build the
   shell, world tree, infobox and home hub.
2. **G1, the link index.** Needed by every later view and by the AI.
5. **Phase 4.** Port the continuity check, then run the first real writing check.
6. **Phase 5, S3 and W2.** Filter, convergence view, node map, relationship view, story board, eras, lanes.
7. **S4 to S7.** AI foundation, Story Builder, Ask AI and the prompts menu, canon check extensions.
8. **W3 to W6.** Maps, chronicles, boards, interactive tables.
9. **Phases 6 to 8.** Gaps view, export, compilations, search, deploy.

Still-open data items from the earlier ingestion, to decide during Phase 2:
- The dangling "Assassination Attempt" event (Age ~540) that has no full `Events.md` entry. It
  likely matches story #15 in the catalog.
- The `[[Characters#Bard (The Traveler - Novel)]]` link in "The Invasion", almost certainly a typo
  for `Bard (Original)`.
- The undated "The Journal at Vashten's Home" event needs an exact Age.

---

## Reference: what v1 built (the migration reads this)

### Ingestion scope decisions
- **`ideas/` folder**: not parsed as a structured source. About 90 percent restated `canonical/` in
  different words (different date notation: "Year X since conquest" versus canonical's "Age X since
  birth", roughly a 20-year offset). A handful of genuinely new facts were hand-merged into
  `canonical/Characters.md` and `Events.md` (Zen Buddhism touchstone, Sero's father Eron, Giana's
  uncle Menas, plague death toll about 25 percent, the empire's peak control of 50 to 70 percent,
  ritual permanence). Two contradictions were resolved with Bobby: collapse date is Age ~820, and
  the ritual cannot be transferred. Bobby also dictated new canon on when Sero learns the ritual's
  effects (see "Giana's Death" and "The Ritual" in `Events.md`).
  The one file in `ideas/` that was not ingested and is now a source is `Sero_Story_Catalog.md`,
  which becomes the `stories` collection.
- **`Timeline.md`**: its ERA tables (`Age | Event | Status`) are ingested by
  `lib/ingest/timelineEvents.ts` as lightweight events. It skips rows marked GAP, rows that link to
  an `Events.md` entry, and rows whose Age plus shared significant words match an existing event
  title. About 75 rows became minimal events with no structured fields.
- **`Working-Doc.md`**: not ingested. Its useful answers were hand-merged into `Characters.md`
  and `Events.md`.
- Two small reference tables in `Locations.md` ("Regional Locations, To Be Developed" and "Archive
  Network, Full Map") are not ingested.
- `Keth`, `Caldor` and `Mossend` had no `Status:` line in `Locations.md`, so `**Status:** ✓ Locked`
  was added to each.

### Schema as it stands in the old database
`entities` (type, name, slug, status, `fields` JSON, `gap_prompt`, `source_doc_id`,
`parent_entity_id`), `events` (title, slug, `year_label`, `sort_order`, `location_id`, four
structured text fields, `draft_text`, `source_doc_id`, `parent_event_id`), `event_links`,
`relationships`, `compilations`, `compilation_items`, and the Phase 3.6 tables `snippets`,
`continuity_flags`, `field_history`, `snippet_confirmations` (migration `0003`, not yet applied).

### What the entry and event pages do (being replaced by the Payload admin)
Entry pages edit name, category, status, free-form fields, gap prompt, sub-items, related entries,
linked events, convert-to-event, and delete. Event pages edit title, year label, sort order,
location, the four structured fields, scene notes, sub-events, and linked entries. Nothing is
hidden: blank fields show as blank. Pickers are searchable comboboxes. The same "no hidden fields"
behavior is carried into the Payload collections (every field always visible).

### Timeline
`/timeline` renders every event with a position on one draggable lane using
`react-calendar-timeline`. `sort_order` maps to calendar milliseconds in `lib/timeline-scale.ts`
purely for layout, and the ruler only shows "Year N". Dragging updates the position only and
shows a toast offering to update the year label. Single click zooms to an event and its
sub-events; double click opens it. The timeline library must be loaded client-only
(`next/dynamic` with `ssr: false`).

### Continuity check mechanics
`createSnippetAction` saves a snippet, `claimCheck` marks it `checking` (a check stuck for 10
minutes counts as dead), and `after()` runs `runContinuityCheck` once the response is sent. Two
model calls (`detect`, then `compare`) feed `plan.ts`, which verifies and classifies every finding.
Quotes are checked by `findQuote` in `text.ts` (ignores case, whitespace, typographic quotes and
markdown marks). Automatic writes: new `in_development` records with a generated `gap_prompt`, and
new details appended to existing fields. Decisions: keep canon, update canon, both are true,
changed over time, decide later. A conflict becomes `possible_change` when the snippet has a
timeline position and the model flagged development or an earlier snippet set the same field.
The model comes from `CONTINUITY_MODEL`, default `anthropic/claude-sonnet-4.5`.

---

## Gotchas still relevant

- Adding a code prefix means updating three places in `lib/codes.ts`: `ENTITY_PREFIXES`, the letters
  in `CODE_REGEX`, and `PREFIX_TO_SLUG`. `relationships` takes any entry through `ENTITY_SLUGS`, so a
  new entry collection becomes linkable automatically. Counters are created on first use.

- **`react-calendar-timeline`**: only the `0.30.0-beta.19` prerelease works with React 19. Pin it
  exactly. Its `visibleTimeStart` and `visibleTimeEnd` props are read once at mount; changing the
  range later needs the instance's `updateScrollCanvas` through a ref. The component must be loaded
  client-only. Drag detection needs gradual pointer movement (matters only for browser automation).
  If it breaks again, hand-roll the single-line view using the math in `lib/timeline-scale.ts`.
- Ctrl or pinch zoom scrolled the page behind the timeline. Fixed with a native non-passive `wheel`
  listener on the container.
- Table rows in source markdown can contain `[[Type#Name|Label]]` links whose `|` breaks a naive
  split. Use the bracket-aware `splitTableRow` in `lib/ingest/markdown.ts`.
- Source docs use CommonMark backslash escaping (`\[\[Locations\#Renmark|Renmark\]\]`).
  `unescapeMarkdown()` in `lib/ingest/markdown.ts` must run first.
- Changing how `slugify()` derives a slug orphans the old row on the next ingest. The migration
  must use the same slug logic as the original ingestion so inbound links resolve.
- `tsx` does not load `.env` on its own. Run one-off scripts with `npx tsx --env-file=.env <file>`.
- A dev server started before installing a new package will not see it. Restart the server.
- shadcn popovers and dialogs rendered transparent until the theme variables were added to
  `globals.css`. If you add components, check they render opaque.
- Browser automation clicks intermittently miss. Retry, and check server logs for whether the
  action actually fired.
- Payload specifics to watch: dev mode auto-pushes schema changes and warns on data loss; do not mix
  push with manual migrations. Run `payload generate:types` and `payload generate:importmap` after
  collection or component changes. Frontend params in Next 16 are async and must be awaited.
