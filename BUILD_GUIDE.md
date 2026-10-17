# BUILD_GUIDE.md: working log for building The Traveler

Session-to-session memory for this build. Read this before `traveler-wiki-build-plan.md` on every
new session. This file says where things actually stand; the plan says what the finished product
looks like. Update "Current state" and "Next up" at the end of every session.

---

## Current state (as of 2026-10-17)

**Direction change:** the app is moving onto Payload CMS. All writing and storage happens in
Payload, every record gets a permanent ID code (C10, L4, E27, S12), and story ideas are a
collection of their own. The plan (`traveler-wiki-build-plan.md`, v2.0) and `CLAUDE.md` were
rewritten for this. **No Payload code is installed in the app yet.** The next step is Phase 0.

What exists today is the v1 app:
- Phases 0 to 2 done (canonicalize, schema, ingestion). Phase 3 done for entry and event CRUD,
  wiki-link rendering, and a single-line draggable timeline. Phase 3.6 (snippets and continuity
  check) built and verified offline.
- Sidebar multi-select, multi-lane convergence, Gaps view, suggestion pane, export, and
  compilations were never started.
- Real data in the old Neon database: 47 entries (36 characters, 11 locations), 113 events
  (38 from `Events.md`, 75 one-liners from `Timeline.md`), 36 event links, 4 relationships.
- Stack as installed: Next 16.3.2, React 19.2.8, TypeScript 6.0.3, Drizzle 0.45.2,
  `react-calendar-timeline` 0.30.0-beta.19, `ai` 7.0.77. The `.env` file has `DATABASE_URL` and
  `AI_GATEWAY_API_KEY` set.

**Uncommitted work (important).** The last git commit (`f3c17ad`) predates Phase 3.6. Eleven tracked
files are modified and the whole continuity feature (`app/continuity/`, `app/snippets/`, six
components, `drizzle/0003` journal entry) is untracked. Migration `0003` has not been applied to
the database. Commit and tag this before changing anything (Phase 0).

**Payload starter delivered.** `payload-starter/` contains the collections, ID-code hook, code
lookup endpoints, and relationship types. It typechecks against Payload 3.x and has not been run
against a database.

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

---

## Next up (in order)

0. **Phase 0.** Commit the working tree and tag `pre-payload`. Apply migration `0003` or confirm
   there are no snippets. Take a snapshot of the old database.
1. **Phase 1.** Create the Payload database, update Next, install Payload, add the route groups,
   copy the starter, run `/admin`. Milestone: writing is possible.
2. **Phase 2.** Write the migration script and story catalog import, dry run, review, apply, verify.
3. **Phase 3.** Rewire home, read pages and timeline to the Local API, retire the old CRUD code.
4. **Phase 4.** Port the continuity check, then run the first real writing check.
5. **Phase 5.** Sidebar filter, convergence view, node map, relationship view, story board.
6. **Phases 6 to 8.** Gaps view and suggestion pane, export and compilations, search and deploy.

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
