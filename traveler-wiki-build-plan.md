# The Traveler: Story Wiki and Timeline, Build Plan (v2.0)

## What this is

A personal writing tool for "The Traveler" story universe. All writing and all worldbuilding is
done directly in Payload CMS, and everything is stored there: characters, locations, events,
items, factions and cultures, races, languages, lore, story ideas, and the prose itself. Every
record carries a permanent ID code (C10, L4, E27, S12) so any entry can be referenced by typing
its code. The frontend reads the same data and adds the views the admin cannot: a draggable
timeline, a node map, and relationship views.

v2.0 also keeps the creative-assist layer: it can suggest options (never prose), track
placeholders for undecided worldbuilding, and check new writing against canon.

**This is not:**
- A ghostwriter. It never generates narrative prose the user would paste into a draft.
- A project/task manager.
- A multi-user product. One user, one real login at most.

## Editing model: Payload is where writing happens

- Add, edit, or delete any record in the Payload admin, which has a full editor for every field.
- Write chapters, scenes and snippets in the `writing` collection. Type ID codes (C10, L4) in the text.
- Drag an event on the frontend timeline to change its `startYear`.
- The Payload database is the only source of truth. The one-time moves into it (the old app's
  database, and the story catalog) are migrations, never ongoing sync.

## Where things stand (end of v1)

The first version was built as a custom Next.js app with its own database and hand-built forms.
Phases 0 to 2 (canonicalize, schema, ingestion), Phase 3 (entry and event pages, wiki-link
rendering, single-line draggable timeline) and Phase 3.6 (snippet intake and continuity check)
are done. The data is real: 47 entries (36 characters, 11 locations), 113 events, 36 event links,
4 relationships. The sidebar filter, multi-lane convergence view, gaps view, suggestion pane,
export and compilations were not started. Full detail is in `BUILD_GUIDE.md`.

v2.0 moves that work onto Payload. The admin replaces every hand-built form. What carries over
is the data, the pure continuity logic, the timeline component, and the source documents.

---

## Architecture

- **One Next.js app, two route groups.** `app/(payload)/` serves `/admin` and `/api`.
  `app/(app)/` serves the frontend views.
- **Payload 3.x stable** with the Postgres adapter and the Lexical editor. Collections live in
  `collections/`, shared fields in `fields/`, endpoints in `endpoints/`, shared helpers in `lib/`.
- **Local API everywhere in the frontend.** Server components and server actions call
  `getPayload({ config })`. There is no second data layer.
- **Database.** A new Neon database used only by Payload (`PAYLOAD_DATABASE_URL`). The old
  database stays untouched and read-only as the migration source until the migration is verified.
- **Access.** Local development uses `autoLogin` so there is no login screen. A deployed copy
  keeps one real login. The Local API in Payload 3.x bypasses access control by default, so
  frontend server code is trusted code; do not expose write actions to the public.
- **Environment.** `PAYLOAD_DATABASE_URL`, `PAYLOAD_SECRET`, `AI_GATEWAY_API_KEY`,
  `CONTINUITY_MODEL` (optional), `DEV_LOGIN_EMAIL` (dev autoLogin, set to your admin email).
  `DATABASE_URL` points at the old database and is used only by the migration script.

---

## ID codes

Every record you author or decide on has a code made of one letter and a number.

| Prefix | Collection | Notes |
|---|---|---|
| C | characters | |
| L | locations | |
| E | events | |
| I | items | Items and artifacts together (`itemType` says which) |
| F | factions | Groups that sit inside a culture (`kind` says what sort) |
| U | cultures | A people and their way of life. Many factions can sit inside one |
| R | races | |
| G | languages | |
| K | lore | Myths, history, belief systems, magic |
| S | stories | Story ideas and the stories they become |
| W | writing | Chapters, scenes, snippets |
| X | relationships | A typed link between two entries |
| Q | continuity-flags | A continuity question or notice |
| T | tags | Tags, with UNK built in |
| A | compilations | Reserved for Phase 7 |

Behavior:
- Assigned automatically on create by the `assignCode` hook, from the hidden `counters` collection.
- Permanent. A rename never changes a code. A delete never frees a number. An update that tries
  to change a code is ignored.
- Import support: a record created with a code already filled in (for example `C10`) keeps it, and
  the counter moves past it.
- `extractCodes(text)` in `lib/codes.ts` finds codes in any text. A code must stand alone (not
  inside a longer word), so `C10` matches and `ABC10` and `C3PO` do not.
- `GET /api/codes/C10` returns the entry. `POST /api/codes/resolve` with `{ "text": "..." }`
  returns every entry mentioned plus any codes that do not exist. `GET /api/codes/C10/links`
  returns every relationship touching it, from either side.
- Log rows (field history, confirmations) have no codes. They are system records, not things you
  point at.

---

## Collections

Starter code for everything below is in `payload-starter/src/`. It typechecks against Payload 3.x
and has not yet been run against a database.

### Fields every entry shares
`code`, `slug` (set once from the name, stable after), `name`, `aliases`, `summary`, `status`,
`gapPrompt`, `details` (free-form labeled rows, the replacement for the old `fields` JSON),
`body` (notes, rich text), `parent` (makes it a sub-item of another entry in the same collection),
and a collapsed "origin of this record" section with `sourceDocId` and `legacyId`.

Every record also has `tags` and a `reviewNote`. See "Tags and the UNK tag" below.

`status` keeps the four values the old app used, so nothing is lost: `locked`, `in_development`,
`needs_name`, `placeholder`. Every field is always visible, blank when empty.

### World collections
| Collection | Extra fields |
|---|---|
| characters | role, birthYear, deathYear, birthplace, race, culture |
| locations | kind, culture |
| items | itemType, createdYear, currentOwner, currentLocation |
| cultures | homelands, languages spoken, emerged and ended years |
| factions | kind (faction, organization, government, order, movement), `culture` (the culture it sits inside), foundedYear, endedYear |
| races | none |
| languages | none |
| lore | category |

### events
`startYear`, `endYear`, `yearLabel`, `sortOrder` (tie-break only), `location`, `involves`
(any world entry, many), `whatHappened`, `whyItHappened`, `whatItCaused`, `whatWasLearned`,
`draftText` (rich text scene notes), `parent` for sub-events.

### stories (story ideas)
One record per story idea, from first spark to finished story.
- `stage`: idea, outlined, drafting, written, shelved
- `format`: novel, novella, short story, vignette, other
- `era`: the seven eras from the story catalog
- `startYear`, `endYear`, `yearLabel`, `floating` (true when the story has no fixed place yet)
- `beats`: the ordered story points, as your own notes
- `involves`: characters, places, items that appear (placeholder names are real Characters with
  status `needs_name`)
- `dramatizes`: the events this story tells
- `catalogNumber`: its number in the original catalog

### writing
The actual prose. `kind` (chapter, scene, snippet), `story`, `order`, `startYear` (where it sits
in-universe), `text` (rich text), `mentions`, a hidden `plainText` copy kept in sync by a hook, and
a collapsed continuity-check status section. Saving new or changed text starts the continuity check.

### relationships
One record per link, stored once. `from`, `to` (any entry), `type`, `startYear`, `endYear`, `notes`.
Reverse direction is found by querying both ends and using the inverse label. The types are in
`lib/relationshipTypes.ts`: family (parent, sibling, spouse, relative), people (love interest,
friend, ally, rival, enemy, mentor, serves, killed), places (born in, lives in, located in, rules,
visited), groups (member, leader, culture, race, speaks), items (owns, wields, created), events and stories
(participated in, took place at, caused, appears in, mentioned in), and a catch-all.

### tags
`name` (unique) and `description`, with a `T` code. **UNK** is created automatically on startup and cannot
be deleted. Any tag you create yourself works the same way.

### continuity
`continuity-flags` (Q codes), `field-history`, `snippet-confirmations`. Same meaning as in v1, now
pointing at `writing` instead of snippets.

---

## Tags and the UNK tag

Every record (entries, relationships, writing, stories) has a `tags` field and an always-visible
`reviewNote` ("Check this").

**UNK means "I applied what I think is right, but you should double check it."** Wherever Claude, an
import, or the migration fills something in on a best guess, it applies its best tags, adds `UNK`, and
writes what to verify in `reviewNote`. Examples: a placeholder name matched to an existing character, a
guessed era or format on a story, a wiki-link rewritten to a code, an entry's category chosen during
the migration, and every record the continuity check creates on its own.

- Only the user removes `UNK`, after he has confirmed the record.
- `GET /api/unk` returns the review queue across all collections. The Payload admin can also filter any
  list by the UNK tag.
- Frontend views show UNK records with a visible marker, and the node map draws them with a dashed outline.
- The suggestion pane never writes tags or fields. It only suggests.

---

## Time model

Plain whole numbers. Year 0 is the year SERO is born, and the story moves forward from there.
Negative years sit before that, so prequels need no migration. `startYear` is a position and what a
timeline drag changes. `yearLabel` is display text ("Age ~350-400") and is never rewritten by a
drag; after a drag the app prompts whether to update it. `sortOrder` only breaks ties inside one
year. The timeline's abstract-year-to-calendar mapping in `lib/timeline-scale.ts` stays as is.

---

## Migration from the old database (one time)

A script `scripts/migrate-legacy.ts` reads the old database (read-only) and writes to Payload
through the Local API.

| Old | New |
|---|---|
| `entities` type character, location, race, language | characters, locations, races, languages |
| `entities` type item, artifact | items (`itemType` = artifact for artifacts) |
| `entities` type culture | cultures |
| `entities.fields` (label to value) | `details` rows, same order |
| `entities.parent_entity_id`, `events.parent_event_id` | `parent`, resolved in a second pass |
| `events` | events: `sort_order` becomes `startYear`, `year_label` stays `yearLabel`, `sortOrder` set to 0 |
| `event_links` | `involves` (collection chosen from the linked entry's type) |
| `relationships` (4 rows) | relationships with type `related_to` |
| `snippets` | writing, `kind` = snippet, `sort_order` becomes `startYear` |
| `continuity_flags`, `field_history`, `snippet_confirmations` | continuity-flags, field-history, snippet-confirmations |
| `compilations`, `compilation_items` | skipped if empty |

Rules for the script:
- Idempotent. Every record carries `legacyId`. A re-run updates, never duplicates (hard rule 8).
- Code numbering. Entries are numbered in the order they appear in their source document
  (Sero is C1), then in-app entries alphabetically. The script writes `legacy-code-map.json`
  and a dry-run mode prints the full old-name to new-code list for review before anything is written.
- Wiki-links. `[[Characters#Giana|Giana]]` in any text is rewritten to `Giana (C2)`, using the same
  slug logic the old ingestion used. Any record whose text was rewritten gets `UNK` and a `reviewNote`
  listing the links that changed. Unresolvable links (the known "Bard (The Traveler - Novel)" typo)
  are left as plain text and listed in the report.
- Plain text to rich text. Long text moving into a rich text field (`draftText`, snippet text)
  goes through the Lexical markdown converter.
- Verification. After a run, counts must match (47 entries, 113 events, 36 links, 4 relationships,
  plus snippets, flags and history), and a spot check of five entries and five events is compared
  field by field against the old rows.
- The old database is not modified and not deleted until the user says the migration is verified.

## Story catalog import (one time)

`scripts/import-story-catalog.ts` reads `source-docs/ideas/Sero_Story_Catalog.md` (40 stories).
- Each `### ` heading is a story. Era comes from the `## ERA` heading above it.
- The italic line gives years and format: `*Age 20–23 | Novel*`, `*Age ~350–400 | Short Story*`,
  `*Floating, suggested Age 250–280 | Short Story*` (sets `floating`). `Short Story/Novella` is
  stored as the first format with a note.
- Bullets become `beats`. The `Characters:` line becomes `involves`.
- Placeholder names (marked with an asterisk, listed in the catalog's master table) are matched
  against existing Characters first. Matches link to the existing entry. Unmatched names become new
  Characters with status `needs_name` and a generated `gapPrompt`.
- Dry run first. It writes `story-import-review.md` listing every story with its matched and
  unmatched names, so the user decides before `--apply`.
- Same upsert rule as the migration: keyed on `sourceDocId` and `catalogNumber`.
- Every guess (a name matched to an existing character, an era or format interpretation, a floating
  story's suggested range) gets the `UNK` tag with a `reviewNote`.
- Triage task: some story ideas may already sit inside the migrated events (the Timeline one-liners
  and the "events to be developed" rows). The review file flags events whose title closely matches a
  catalog story so the user can decide which to link with `dramatizes` and which to convert.

---

## Frontend views (read pages and visualizations)

All views read through the Local API and link every entry to its admin edit page.

- **Home.** Counts per collection, open continuity items, placeholders waiting.
- **Entry read pages.** Details, notes, linked events, relationships (read from both ends), sub-items.
  ID codes in any text render as links showing the entry's name.
- **Code lookup.** A search box that takes a code (C10) or a name and jumps to the entry.
- **Timeline.** Single-line draggable view (`react-calendar-timeline`), all events by `startYear`.
  Dragging changes `startYear` only and offers to update `yearLabel`.
- **Sidebar multi-select filter.** Searchable, grouped by collection, any combination at once.
- **Multi-lane convergence view.** With two or more selected, one lane each, lanes braid together at
  events whose `involves` contains two or more of them. Layout from `i-storyline-js`; fall back to a
  custom render only if its model does not fit. Dragging a convergence point moves every entry involved.
- **Node map.** Nodes are entries, edges are relationships (and optionally `involves` and `parent`).
  Color by collection, filter by relationship type or by a starting entry plus N steps.
  Built on React Flow.
- **Relationship view per entry.** The entry in the middle, grouped by relationship type, family
  shown as a tree. Powered by `/api/codes/:code/links`.
- **Story board.** Stories grouped by era and stage, with floating stories in their own lane.
- **Review queue.** Everything tagged UNK in one list, with its `reviewNote` and a link to the admin edit page.

---

## Continuity check (ported)

The behavior is the same as v1 and the rules in `CLAUDE.md` hard rule 1 still hold: the model reads
and reports, every detail that reaches canon is a verbatim quote of the user's own words verified
word for word, automatic additions have an Undo, and conflicts wait for a decision.

What carries over unchanged (no data access, already tested by `npm run test:continuity`):
`lib/continuity/analyze.ts`, `constants.ts`, `links.ts`, `plan.ts`, `text.ts`, `types.ts`.

What is rewritten on the Local API: `run-check.ts`, the actions, and the data queries. A snippet
becomes a `writing` record, an entity becomes an entry in the matching collection, `fields`
becomes `details`. The check reads `writing.plainText`.

Trigger: saving a `writing` record whose text or `startYear` changed starts the check (a Payload
`afterChange` hook that sets `checkStatus` and runs the check after the response, with a manual
"Check now" action as the fallback). The decision screens (inbox, side-by-side review, entry
history) stay on the frontend, because the admin cannot show a highlighted side-by-side.

Decision options are unchanged: keep canon, update canon, both are true, it changed over time,
decide later.

First real run still pending: apply it against the migrated data and tune the two prompts in
`analyze.ts` from what it reports.

---

## Creative-assist layer

**Placeholders and gaps.** Placeholders are real records. A Gaps view lists every entry whose
status is not `locked`, with its `gapPrompt`, so they can be resolved in a batch. Creating a stub
generates a `gapPrompt` from the context it was mentioned in. Entries that already have prompts
from the old ingestion carry them over.

**Suggestion pane.** From any entry or event page, "Get suggestions" calls the model with the
current record and everything linked to it, referenced by code. The system prompt constrains output
to options, questions, and tensions. Never finished prose. Output is a list of discrete suggestions;
nothing is inserted until the user accepts it.

---

## Export and compilations

- Every entry and event gets "Export as Markdown": header, `Status:` line, labeled details, and
  relationships written out. The serializer mirrors the migration's source format so a round trip
  loses nothing.
- A `compilations` collection (code prefix A): an ordered set of events and entries, typed as age,
  chapter, or custom. Drag to reorder with `@dnd-kit/sortable`. "Export compilation" joins each
  item's Markdown in order into one file. One compilation per age can be generated automatically
  as a starting point.

---

## Phases

### Phase 0: Preserve the current state
- [x] Commit everything now in the working tree (the continuity feature and doc changes are not yet
      committed) and tag it `pre-payload`.
- [x] Apply migration `0003` to the old database so the old schema matches the code (or confirm no
      snippets exist yet and skip it). -- skipped, no snippets in old DB; tables exist in new DB.
- [x] Export a snapshot of the old database (`pg_dump` or the Neon branch feature) as the safety copy.
      -- old DB is a live read-only Neon branch; treated as the safety copy.

### Phase 1: Payload running, writing possible -- DONE 2026-10-19
- [x] Create a new Neon database for Payload. Add `PAYLOAD_DATABASE_URL` and `PAYLOAD_SECRET` to `.env`.
- [x] Update Next.js to the latest patched 16.x, install `payload`, `@payloadcms/next`,
      `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `sharp`, `graphql`, all at one version.
- [x] Restructure routes: add `app/(payload)/`, move the existing frontend into `app/(app)/`.
      Wrap `next.config.mjs` with `withPayload`. Add the `@payload-config` alias in `tsconfig.json`.
- [x] Copy `payload-starter/src/*` to the repo root (collections, fields, endpoints, lib).
- [x] Generate types and the import map, start `npm run dev`, open `/admin`, create one entry of each
      kind, confirm codes are assigned and `/api/codes/C1` resolves.
- [x] **Milestone: the admin is usable for writing.**

### Phase 2: Bring the data across
- [ ] Write and dry-run `scripts/migrate-legacy.ts`, review the code map, then apply and verify counts.
- [ ] Write and dry-run `scripts/import-story-catalog.ts`, review, then apply.
- [ ] **Milestone: existing canon and all 40 story ideas are in Payload.**

### Phase 3: Rewire the frontend and retire the old app code
- [ ] UNK marker on every list and read page, and a basic review queue page.
- [ ] Home, entry read pages, event read pages on the Local API with ID-code linkification.
- [ ] Timeline reading and writing through the Local API (`startYear`).
- [ ] Remove the old forms, actions, data layer, database code and legacy dependencies (list in
      `BUILD_GUIDE.md`) once the migration is verified.

### Phase 4: Continuity check port
- [ ] Rewrite `run-check.ts`, actions and data queries on the Local API; keep the pure files.
- [ ] Rewire the inbox, review screen, entry history and sidebar badge.
- [ ] Run `npm run test:continuity`, then a first real writing check, then tune prompts.

### Phase 5: Views
- [ ] Sidebar multi-select filter.
- [ ] Multi-lane convergence view.
- [ ] Node map and per-entry relationship view.
- [ ] Story board.
- [ ] Timeline polish: two-tier header for wide zoom, decide whether sub-events hide until zoom.

### Phase 6: Creative assist
- [ ] Gaps view.
- [ ] Review queue (UNK) view, if not already built in Phase 3.
- [ ] Suggestion pane.

### Phase 7: Export and compilations
- [ ] Markdown export, `compilations` collection, ordered compile, combined export.

### Phase 8: Polish and deploy
- [ ] Search across everything (by name, alias, or code).
- [ ] Switch from dev auto-push to migrations, deploy to Vercel with a real single-user login.

---

## Available vs. custom

| Piece | Source | Notes |
|---|---|---|
| Writing UI, forms, versions, drafts | **Available**, Payload admin | Replaces every hand-built form |
| Rich text editing | **Available**, Lexical | Built into Payload |
| Postgres hosting | **Available**, Neon | Dedicated database for Payload |
| Single-line draggable timeline | **Available**, `react-calendar-timeline` | Already working in v1 |
| Multi-lane convergence layout | **Available, needs integration**, `iStoryline.js` | Not started |
| Node map | **Available**, React Flow | Data mapping plus styling |
| Sidebar multi-select | **Available**, `shadcn-multi-select-component` | Copy-paste component |
| List reordering | **Available**, `@dnd-kit/sortable` | For compilations |
| ID codes, code lookup endpoints | **Custom, small** | Written, in the starter |
| Entity and relationship collections | **Custom** | Written, in the starter |
| One-time migration and catalog import | **Custom** | Phase 2 |
| Continuity check logic | **Custom, ported** | Pure logic kept, data layer rewritten |
| Suggestion pane | **Custom** | A prompt, not an algorithm |
| Markdown export | **Custom, simple** | Mirrors the source format |

## Explicitly out of scope

- No multi-user support and no public access.
- No AI-generated prose insertion anywhere. Suggestions and gap prompts only.
- No ongoing sync with Google Drive or any second store.
