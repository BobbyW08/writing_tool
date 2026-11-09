# The Traveler: Story Wiki and Timeline, Build Plan (v3.0)

## What this is

A personal writing tool for "The Traveler" story universe. All writing and all worldbuilding is
done here: characters, locations, events, items, factions and cultures, races, languages, lore,
story ideas, and the prose itself. Every record carries a permanent ID code (C10, L4, E27, S12)
so any entry can be referenced by typing its code.

The frontend is where the work feels good. It adds the views you cannot do in a plain table: a
world tree with a Wikipedia-style infobox, a timeline with eras and parallel lanes, image maps
with clickable pins, chronicles (a timeline paired with maps), node maps, family and causality
trees, whiteboards, interactive tables, a blank-page writing studio, and relationship views.

A backend **link index** records every connection between every record (relationship records,
relationship columns, parent links, and codes typed in text), so any view can ask "what is linked
to what" with one query. All AI runs on Claude. It suggests options (never prose), tracks
placeholders for undecided worldbuilding, and checks new writing against canon.

**This is not:**
- A ghostwriter. It never generates narrative prose the user would paste into a draft.
- A project/task manager.
- A multi-user product. One user. No login.

## Editing model: the data layer holds everything, the frontend is where all the work happens

- **All creating, editing and writing happens in the frontend.** Every entity type has a create
  flow and edit in place on its read page: fields, details rows, tags, parent, image, relationships.
  There is no separate view mode and edit mode. The Writing Studio (`/write`) is the editor for
  chapters, scenes and snippets. The timeline, maps, boards and tables are edited in place.
- Type ID codes (C10, L4) in any text. Codes render as links and are recorded in the link index.
- Drag an event on the frontend timeline to change its `startYear`. The timeline is edited in place.
- `appDb` (Drizzle + Neon, `APP_DATABASE_URL`) is the only source of truth. The one-time moves
  into it (the old app database, the story catalog and the story bible) are migrations, never ongoing sync.

## Where things stand (2026-11-08)

Version 1 was a custom Next.js app with its own database and hand-built forms. The data was moved
to a direct Drizzle + Neon stack in November 2026, completing Phase 3.

- Phase 2A through 2C: all done. Data counters: C=40, L=13, U=5, F=2, K=102, S=74, W=3.
- Phase 3 closed, verified in browser 2026-11-08. `npm run build` passes zero errors. G1 is next.
- Writing Studio (S1) complete.

This version (v3.0) adds the World features (steps W1 to W6), the link index (step G1), and the
Writing Studio and AI work from `docs/PLAN_WRITING_AND_AI.md` (steps S1 to S7). The master order
is in "Build order" below. Full history is in `BUILD_GUIDE.md`.

---

## Architecture

- **One Next.js app, one route group.** `app/(app)/` serves all frontend views.
- **Drizzle ORM** (`drizzle-orm`), schema in `db/schema.ts`, client in `db/index.ts` as `appDb`.
  All reads and writes use `appDb` with `APP_DATABASE_URL`.
- **Neon Postgres** as the database, using `@neondatabase/serverless` with the `neon-http` driver.
- **Data layer.** Server components and server actions call `lib/world/queries.ts` (fetchers) and
  `lib/world/actions.ts` (mutations). There is no second data layer. Writing Studio uses
  `lib/studio/queries.ts` and `lib/studio/actions.ts`.
- **Lexical editor.** `lexical@0.50.0` and its `@lexical/*` packages. Writing bodies are stored as
  Markdown. `lib/studio/lexical.ts` converts between Lexical JSON and Markdown using `@lexical/headless`.
- **Link index.** The `links` table and `lib/graph/` hold every connection between records. Views
  and the AI context builder read connections from there, never by hand-querying columns. Sync runs
  inside the data layer's write functions.
- **Media.** A `media` table stores images: portraits, crests, map images, map layers and era
  backgrounds. It uses `sharp`, which is already installed.
- **AI.** All AI runs on Claude through the `ai` package and Vercel AI Gateway, with plain
  `anthropic/...` model strings, behind one module (`lib/ai/`).
- **No login and no auth code.** This is a personal single-user tool. No middleware, no session.
- **Environment.** `APP_DATABASE_URL`, `AI_GATEWAY_API_KEY`, `CONTINUITY_MODEL` (optional).
  `DATABASE_URL` points at the old v1 database (read-only, used only by `scripts/copy-from-payload.ts`).
- **Look and feel.** The frontend has its own visual style, built on the existing shadcn components
  and theme tokens. World Anvil is a behavior reference only (see "Feature reference").

---

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
| B | beats | A planned story beat, before it becomes an event (step S5) |
| Y | eras | A span of years on the timeline (step W2) |
| M | maps | An uploaded map image with layers (step W3) |
| P | map-pins | One marker, label, line, circle or polygon on a map (step W3) |
| H | chronicles | A timeline paired with maps (step W4) |
| D | boards | Saved node maps, trees, story maps and whiteboards (step W5) |
| N | tables | Interactive tables (step W6) |
| A | compilations | Reserved for Phase 7 |
| X | relationships | A typed link between two entries |
| Q | continuity-flags | A continuity question or notice |
| T | tags | Tags, with UNK built in |

Behavior:
- Assigned automatically on create by the `assignCode` hook, from the `counters` table.
  A counter row is created the first time a prefix is used, so a new prefix needs no seeding.
- Permanent. A rename never changes a code. A delete never frees a number. An update that tries
  to change a code is ignored.
- Import support: a record created with a code already filled in (for example `C10`) keeps it, and
  the counter moves past it.
- `extractCodes(text)` in `lib/codes.ts` finds codes in any text. A code must stand alone (not
  inside a longer word), so `C10` matches and `ABC10`, `H2O` and `C3PO` do not. Step G1 adds the new
  prefix letters to the pattern. A code that matches the pattern but has no record (a stray "B12")
  renders as plain text and is listed as unknown, never as a broken link.
- `GET /api/codes/C10` returns the entry. `POST /api/codes/resolve` with `{ "text": "..." }`
  returns every entry mentioned plus any codes that do not exist. `GET /api/codes/C10/links`
  returns every connection touching it, from either side, read from the link index.
- Log and index rows (field history, confirmations, `links`, `claims`, `ai-proposals`) have no
  codes. They are system records, not things you point at.

---

## Collections

The world entity types are defined as tables in `db/schema.ts`. The spec below lists the fields for each type; Collections
and fields marked **new** below have no code yet. Their field lists here are the spec, and each
is built in the step that first needs it (see "Build order").

### Fields every entry shares
`code`, `slug` (set once from the name, stable after), `name`, `aliases`, `summary`, `status`,
`gapPrompt`, `details` (free-form labeled rows, the replacement for the old `fields` JSON),
`body` (notes, rich text), `parent` (makes it a sub-item of another entry in the same collection),
and a collapsed "origin of this record" section with `sourceDocId` and `legacyId`.

New shared fields:
- `image`: an upload from `media` (portrait, crest or header). It shows in the infobox and on node cards.
- `details[].inInfobox`: a checkbox on each detail row. Checked rows appear in the infobox at the
  top of the read page. The fixed fields that always appear in the infobox for each collection
  (birth year, culture, kind and so on) are listed in `lib/infobox.ts`.

Every record also has `tags` and a `reviewNote`. See "Tags and the UNK tag" below.

`status` keeps the four values the old app used, so nothing is lost: `locked`, `in_development`,
`needs_name`, `placeholder`. Every field is always visible, blank when empty.

`writing` omits `details`, `body` and `image`.

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

New (step W2 and W4):
- `eventType`: a select (celestial, political, battle, discovery, death, birth, journey, other).
- `importance`: minor, normal, important. Controls the marker size on the timeline.
- `lane`: a whole number from 0 to 10. Events in different lanes run in parallel on the timeline.
- `pins`: the map pins (P codes) that show where this event happened, many. A chronicle uses these.

Causes and consequences are not fields. They are relationships of type `caused` between events
(see "relationships"), so they appear in the link index and in causality trees.

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

New (step S1): `canonState` (draft, canon, set_aside; default draft). Draft and Canon are included
in continuity checks and AI context. Set aside is excluded from both. It is separate from `status`.

### relationships
One record per link, stored once. `from`, `to` (any entry), `type`, `startYear`, `endYear`, `notes`.
Reverse direction is found by querying both ends and using the inverse label. The types are in
`lib/relationshipTypes.ts`: family (parent, sibling, spouse, relative), people (love interest,
friend, ally, rival, enemy, mentor, serves, killed), places (born in, lives in, located in, rules,
visited), groups (member, leader, culture, race, speaks), items (owns, wields, created), events and stories
(participated in, took place at, caused, appears in, mentioned in), and a catch-all.

New (step G1):
- Each type gets a `hierarchy` property: `from_is_parent`, `from_is_child` or none. Tree views use
  it to point every edge the same way. For example `parent_of` is `from_is_parent`, `located_in`
  and `member_of` are `from_is_child`, and `caused` is `from_is_parent` (cause above effect).
- A new type `follows` (inverse "Followed by", group Events and stories), for event order that is
  relative rather than a year ("two years after the arrival").
- `offsetYears` on the relationship record: an optional number, used with `follows`.

### tags
`name` (unique) and `description`, with a `T` code. **UNK** is created automatically on startup and cannot
be deleted. Any tag you create yourself works the same way. New (step S4): **AI suggested** is built in
and protected the same way. It marks text that was accepted from an AI proposal.

### continuity
`continuity-flags` (Q codes), `field-history`, `snippet-confirmations`. Same meaning as in v1, now
pointing at `writing` instead of snippets.

### media (new, step W1, no code)
An upload collection. Fields: the file, `alt`, `kind` (portrait, crest, header, map_base,
map_layer, era_background, board_image, other). Image sizes are generated with `sharp`. A map base
image and its layers keep their original size, because pin coordinates depend on it.

### eras (new, step W2, code Y)
A span of years on the timeline. An entry (common fields) plus: `startYear`, `endYear`,
`yearLabel`, `color`, `backgroundImage` (media), `kind` (era, age, period). `parent` lets an age sit
inside an era. The timeline draws eras as colored bands with the background image behind them.

### maps (new, step W3, code M)
An uploaded image made interactive. An entry (common fields) plus:
- `kind`: world, region, city, building, diagram, other (a map does not have to be a map).
- `baseImage` (media, required), with `imageWidth` and `imageHeight` in pixels, set on upload.
- `layers`: an array of `name`, `image` (media), `opacity`, `defaultVisible`, `order`. A layer is an
  overlay at the same size as the base image.
- `pinGroups`: an array of `name`, `color`, `defaultVisible`. The viewer can toggle groups.
- `minZoom`, `maxZoom`, `startView` (`x`, `y`, `zoom`).
- `location`: the location this map depicts, optional.
- `yearFrom`, `yearTo`: the period the map shows, optional. Chronicles use it to choose a map by year.

Coordinates are **pixel positions on the base image, origin at the top left**. They do not depend on
screen size or zoom.

### map-pins (new, step W3, code P)
One marker on one map. A record so it can have a code, tags and links. Fields: `name`, `summary`
(shown in the popup), `map` (required), `shape` (pin, label, line, circle, polygon), `geometry`
(JSON: a pin is `{x, y}`, a label is `{x, y, text, size}`, a circle is `{x, y, radius}`, a line or
polygon is `{points: [[x, y], ...]}`), `icon`, `color`, `group` (a `pinGroups` name), `layer` (a layer
name, empty means all layers), `behavior` (popup, open_entry, open_map, none), `links` (any entries,
many, listed in the popup), `opensMap` (a map), `yearFrom`, `yearTo` (when the pin is visible).

### chronicles (new, step W4, code H)
A timeline paired with maps. An entry plus: `mapPeriods` (an array of `map`, `fromYear`, `toYear`,
`isDefault`), `eras` (which eras to show, many), `filter` (collections, tags, and `involves` codes
that limit which events appear), `startYear`, `endYear`. Selecting an event moves the map to that
event's pin. If the pin is on a different map, that map becomes active. With no pin, the map for
that year in `mapPeriods` is used.

### boards (new, step W5, code D)
Saved visual views over the link index, and free-form whiteboards. An entry plus:
- `kind`: node_map, content_tree, family_tree, causal_tree, story_map, whiteboard.
- `rootCodes`: the codes the view starts from (a text array).
- Query: `collections`, `relationshipTypes`, `sources` (relationship, field, parent, text),
  `direction` (out, in, both), `depth`, `yearFrom`, `yearTo`.
- `layoutMode`: auto_tree, auto_force, manual.
- `nodePositions`: JSON, `{ "C1": { "x": 0, "y": 0, "collapsed": false, "pinned": true } }`.
  Positions belong to the board, never to the record.
- `notes`: whiteboard items (`id`, `type` sticky, text, shape, image or frame, `x`, `y`, `w`, `h`,
  `text`, `color`, `media`) and `connectors` (`id`, `fromRef`, `toRef`, `label`, where a ref is a code or
  a note id). A connector is a drawing, not a link. "Promote to relationship" creates an X record.
- `scene`: opaque JSON owned by the whiteboard library chosen in step W5.
- `viewport`: JSON, the saved pan and zoom.

A board never creates edges in the link index. It only draws them.

### tables (new, step W6, code N)
An interactive table, for things like a magic system's tiers or a ruler list. An entry plus
`columns` (an array of `key`, `label`, `type` text, number, date, link or tag, `width`) and `rows`
(JSON, an array of objects keyed by column key). A cell can hold ID codes, which render as links
and appear in the link index as text mentions. CSV import and export are part of step W6.

### beats (new, step S5, code B)
Defined in `docs/PLAN_WRITING_AND_AI.md`. A planned story beat that becomes an event only when
promoted. Beat positions on the story map are stored on a board, not on the beat.

### System collections and globals (new, no codes)
- `links`: the link index. See the next section.
- `claims`, `ai-proposals`: defined in `docs/PLAN_WRITING_AND_AI.md` (steps S4 and S7).
- `prompt-sets`: the prompts menu (step S6). Fields: `collection` (which entry type), `group`
  (for example Presentation, Origins, Current state), `label`, `question`, `detailLabel` (the detail
  row an answer is written into), `order`, `active`. Seeded with prompts written for this project.
- `timeline-settings` (global, step W2): `scaleMode` (to_scale or in_sequence), `gaps` (an array of
  `fromYear`, `toYear`, `collapsedTo`, `label`) so long empty stretches can be squeezed, and the default zoom.
- `ai-settings` (global, step S4): which Claude model each task uses.

---

## Link index

`links` is a system collection with one row per connection between two coded records. It is
**derived data**. It is rebuilt from the records, never edited by hand, and never the source of
truth for canon. It exists so that every view and the AI can ask "what is linked to what" with one query.

### Where connections come from

| `source` | Comes from | Example |
|---|---|---|
| relationship | an X record | C10 parent_of C12 |
| field | a relationship field on a record | E5 involves C1, C1 birthplace L1, I7 currentOwner C3, S4 dramatizes E9, E5 pins P8 |
| parent | the `parent` ("Part of") field | L5 is part of L2 |
| text | an ID code typed in rich text, a textarea, a detail value, a table cell or writing | W3 mentions C10 |
| pin | a map pin's `links` and `opensMap` | P4 links to L1, P4 opens M2 |

### Fields of a link row
`key` (unique and deterministic: source, owner code, type or field, from code, to code),
`fromCode`, `fromCollection`, `toCode`, `toCollection`, `source`, `type` (the relationship type
value for X rows, the field name for field rows such as `involves`, `parent`, or `mentions`),
`fieldName` (where it was found inside the owner, such as `details.Origin` or `text`), `ownerCode`
(the record that holds the relationship, field or text), `directed`, `startYear`, `endYear`,
`broken` (the target no longer exists), `updatedAt`.

### Upkeep
- An `afterChange` hook on every coded collection recomputes the rows owned by that record: rows no
  longer present are removed, the rest are upserted by `key`.
- A delete function in the data layer removes the rows the record owned and marks rows that point at it `broken`.
  A code is never reused, so a broken row stays identifiable and shows in the broken links list.
- `scripts/rebuild-links.ts` rebuilds the whole index from the records. It is idempotent. A dry run
  prints counts by source, and `--apply` writes. Running it twice gives identical results.
- Text mentions come from codes only. A name written without a code is not indexed; the continuity
  check and the AI handle names.

### Reading it
Helpers live in `lib/graph/` and the same queries are exposed as endpoints:
- `GET /api/codes/:code/links`: every connection touching a record, both directions, with the label
  and the inverse label, grouped by source and type.
- `GET /api/graph/:code?depth=2&direction=both&sources=&types=&collections=`: nodes and edges
  outward from one record, breadth first, capped at 300 nodes, with `truncated` set when the cap is hit.
- `GET /api/graph?collections=&tags=&yearFrom=&yearTo=`: a whole or filtered graph.
- `GET /api/graph/orphans`: records with no connections.
- `GET /api/graph/broken`: connections whose target was deleted.
- `GET /api/graph/path?from=C1&to=C20`: the shortest chain of connections between two records.

Every read page shows "What links here", built from the index. The label read from the far side
of a connection is the inverse label for relationship types, and a fixed label for fields
(`involves` reads "Involved in", `parent` reads "Has part", and so on), kept in `lib/graph/labels.ts`.

### Node and edge shape (`lib/graph/types.ts`)
Every visual feature takes the same two shapes. No view invents its own.

```
Node = {
  code, collection, name, summary, status,
  tags: string[], unk: boolean, aiSuggested: boolean,
  startYear?, endYear?, yearLabel?,
  parentCode?, imageUrl?, color, icon
}

Edge = {
  id,                         // the link row key
  from, to,                   // codes
  source,                     // relationship | field | parent | text | pin
  type, label, inverseLabel,
  directed, hierarchy,        // from_is_parent | from_is_child | none
  ownerCode, relationshipCode?, // the X code for relationship rows
  startYear?, endYear?, broken?
}

Graph = { nodes: Node[], edges: Edge[], truncated: boolean }
```

`toNode(collection, doc)` and `toEdge(linkRow)` are the only adapters. Color and icon per
collection come from `lib/nodeKinds.ts`, not from fields. Node maps, relationship views, family,
causality and content trees, the story map, timeline lanes and convergence, chronicles, whiteboard
cards, compilations and the AI context builder all consume `Graph`.

Tree views use `hierarchy` to orient edges. A family tree is `parent_of`, `spouse_of` and
`sibling_of`. A causality tree is `caused` and `follows`. A content tree is any chosen set of types
plus `parent`.

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
- `GET /api/unk` returns the review queue across all collections. The data layer can also filter any
  list by the UNK tag.
- Frontend views show UNK records with a visible marker, and the node map draws them with a dashed outline.
- Text accepted from an AI proposal carries the built-in **AI suggested** tag as well as UNK until the user clears both.
- The suggestion pane never writes tags or fields. It only suggests.

---

## Time model

Plain whole numbers. Year 0 is the year SERO is born, and the story moves forward from there.
Negative years sit before that, so prequels need no migration. `startYear` is a position and what a
timeline drag changes. `yearLabel` is display text ("Age ~350-400") and is never rewritten by a
drag; after a drag the app prompts whether to update it. `sortOrder` only breaks ties inside one
year. The timeline's abstract-year-to-calendar mapping in `lib/timeline-scale.ts` stays as is. Eras are
bands over a range of years. Time gaps (in `timeline-settings`) only squeeze how a long empty
stretch is drawn. They never change a year or a position.

---

## Migration from the old database (one time)

A script `scripts/migrate-legacy.ts` reads the old database (read-only) and writes to appDb via the data layer
through the data layer.

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

All views read and write through the data layer and edit in place. Each page also carries a small "Open in admin" link. Every view takes
its connections from the link index and its nodes and edges from the shared `Graph` shape.

- **Shell.** A slim icon rail, a side panel (the world tree) and a main canvas.
- **World tree (left panel).** A searchable tree of everything. Modes: by type (collection, then
  `parent` hierarchy), by story, by culture, by era. A filter box, a button to add an entry or a
  group, and drag to re-parent within a collection (changes `parent` only).
- **Home.** Quick-create tiles per collection, counts, open continuity items, placeholders waiting,
  recent edits.
- **Entry read pages.** The **infobox** sits at the top right of the page, above the text, like an
  encyclopedia: image, the fixed fields for that collection, and any detail rows marked `inInfobox`.
  Below it: details, notes, linked events, relationships (read from both ends), sub-items, and
  **What links here** from the link index. ID codes in any text render as links showing the entry's name.
- **Code lookup.** A search box that takes a code (C10) or a name and jumps to the entry.
- **Timeline.** Eras as colored bands, parallel lanes (0 to 10), event types and importance, a
  year ruler with optional time gaps, a mini-map, search and filter. Single-line view first
  (`react-calendar-timeline`), all events by `startYear`. Click empty space to add an event at that
  year. Edit in place: there is no separate view mode and edit mode. Dragging changes `startYear` only
  and offers to update `yearLabel`.
- **Sidebar multi-select filter.** Searchable, grouped by collection, any combination at once.
- **Multi-lane convergence view.** With two or more selected, one lane each, lanes braid together at
  events whose `involves` contains two or more of them. Layout from `i-storyline-js`; fall back to a
  custom render only if its model does not fit. Dragging a convergence point moves every entry involved.
- **Maps.** A list of maps and a viewer: pan and zoom, pins, labels, lines, circles and polygons,
  popups that list linked entries, pins that open another map, layer and group toggles. Right click
  to add a pin. A map can be shown inside any read page.
- **Chronicles.** The timeline strip with a map beside it. Selecting an event zooms the map to its
  pin and switches maps when the pin is on a different one. Eras band the strip.
- **Node map.** Nodes are entries, edges are connections from the link index. Color by collection,
  filter by type, source or a starting entry plus N steps. Built on React Flow. Can be saved as a board.
- **Content trees.** Family trees, causality trees and hierarchy trees, drawn from a root code and a
  chosen set of relationship types, oriented by `hierarchy`. Can be saved as a board.
- **Relationship view per entry.** The entry in the middle, grouped by relationship type, family
  shown as a tree. Powered by `/api/codes/:code/links`.
- **Whiteboards.** Free-form boards with sticky notes, shapes, images and entry cards, saved as a board.
- **Tables.** An editable grid with typed columns, CSV import and export, and codes that render as links.
- **Writing Studio and Story Builder.** See `docs/PLAN_WRITING_AND_AI.md`.
- **Story board.** Stories grouped by era and stage, with floating stories in their own lane.
- **Review queue.** Everything tagged UNK in one list, with its `reviewNote`, editable in place, and a link to the record.
- **Link health.** Orphans (records with no connections) and broken links, from the link index.

---

## Continuity check (ported)

The behavior is the same as v1 and the rules in `CLAUDE.md` hard rule 1 still hold: the model reads
and reports, every detail that reaches canon is a verbatim quote of the user's own words verified
word for word, automatic additions have an Undo, and conflicts wait for a decision.

What carries over unchanged (no data access, already tested by `npm run test:continuity`):
`lib/continuity/analyze.ts`, `constants.ts`, `links.ts`, `plan.ts`, `text.ts`, `types.ts`.

What is rewritten on the data layer: `run-check.ts`, the actions, and the data queries. A snippet
becomes a `writing` record, an entity becomes an entry in the matching collection, `fields`
becomes `details`. The check reads `writing.plainText`.

Trigger: saving a `writing` record whose text or `startYear` changed starts the check (a data layer
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

**Suggestions.** The AI is Claude, through one module (`lib/ai/`). From any entry or event page, the
prompts menu and "Ask AI" call the model with the current record and everything linked to it, found
through the link index and referenced by code. The system prompt constrains output to options,
questions, and tensions. Never finished prose. Output is a list of discrete proposals; nothing is
inserted until the user accepts that one proposal. Details are in `docs/PLAN_WRITING_AND_AI.md`.

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

The base build. The World features (W), the link index (G) and the Writing Studio and AI steps (S)
fit between these phases. The master order is in "Build order" below.

### Phase 0: Preserve the current state
- [x] Commit everything now in the working tree (the continuity feature and doc changes are not yet
      committed) and tag it `pre-drizzle`.
- [x] Apply migration `0003` to the old database so the old schema matches the code (or confirm no
      snippets exist yet and skip it). Skipped: no snippets in the old database, and the tables exist in the new one.
- [x] Export a snapshot of the old database (`pg_dump` or the Neon branch feature) as the safety copy.
      The old database is a live read-only Neon branch and is treated as the safety copy.

### Phase 1: Data setup and migration (done)
- [x] Create Neon database, set `APP_DATABASE_URL` in .env, run Drizzle migrations.
- [x] Update Next.js to the latest patched 16.x. Install Lexical packages at 0.50.0: `@lexical/react`, `@lexical/markdown`, `@lexical/rich-text`, `@lexical/list`, `@lexical/headless`.
- [x] Restructure routes: add `app/(app)/`, move the existing frontend into `app/(app)/`.
- [x] Set up `db/schema.ts`, generate Drizzle migrations, run them against `APP_DATABASE_URL`.
- [x] Wire the data layer: `lib/world/queries.ts`, `lib/world/actions.ts`. Codes assigned inside write functions.
- [x] **Milestone: the data layer is usable for writing.**

### Phase 2: Bring the data across
- [x] 2A: `scripts/migrate-legacy.ts` applied and verified (done 2026-10-19).
- [x] 2B: `scripts/import-story-catalog.ts` applied, 40 stories S1 to S40 (done 2026-10-20).
- [x] 2C: story bible import applied 2026-10-20. 149 records. `scripts/import-story-bible.ts`. Idempotent.
- [x] **Milestone: all data is in appDb.**

### Phase 3: Rewire the frontend and retire the old app code
Delivered together with step S2 and step W1.
- [x] UNK marker on every list and read page, and a basic review queue page.
- [x] Home, entry read pages, event read pages on the data layer with ID-code linkification.
- [x] Timeline reading and writing through the data layer (`startYear`).
- [x] Remove the old forms, actions, data layer, database code and legacy dependencies (list in
      `BUILD_GUIDE.md`) once the migration is verified.
- [x] **Milestone: Phase 3 closed.** Verified in browser against a production build 2026-11-08.
      Three bugs found and fixed during closure: the UNK badge depended on an uninitialized cache
      and only showed if `/` or `/review` had been visited first in the server process; the four
      long-text event fields rendered their content twice (`CodeText` plus `EditableField`'s own
      display both firing); `Location` on event pages showed literal `Location #<id>` instead of
      a resolved link. See `BUILD_GUIDE.md` for details.

### Phase 4: Continuity check port
- [x] Rewrite `run-check.ts`, actions and data queries on the data layer; keep the pure files.
      Done 2026-11-08. `lib/continuity/run-check.ts`, `lib/continuity/actions.ts`,
      `lib/continuity/queries.ts` on `appDb`/Drizzle. Kept unchanged: `analyze.ts`, `plan.ts`,
      `text.ts`, `types.ts`. Fixed `constants.ts`'s `ENTITY_DB_TYPES`/`EXPECTED_LABELS` to the 8
      current world collections (was a stale 7-entry Payload-era list).
- [x] Rewire the inbox, review screen, entry history and sidebar badge. Done 2026-11-08.
      `app/(app)/continuity/page.tsx`, `app/(app)/continuity/[flagCode]/page.tsx` (route renamed
      from `[flagId]` — flags are addressed by their Q-code, not a UUID),
      `components/continuity-badge.tsx`, `components/continuity-review-form.tsx`,
      `components/highlighted-text.tsx`, `components/undo-detail-button.tsx`. Also wired the
      pre-existing, previously-unused `components/snippet-check-status.tsx` into the Writing
      Studio editor with a manual "Check against canon" fallback action.
- [x] Run `npm run test:continuity`, then a first real writing check, then tune prompts.
      Done 2026-11-08. All 17 pure-logic tests pass. A real check against live writing W3 ran
      the full pipeline (claimCheck → world index → AI Gateway → plan → apply) successfully and
      failed only on an account-level block: "AI Gateway requires a valid credit card on file"
      on this Vercel account. The error path worked as designed (`checkStatus` set to `failed`
      with the message stored). **Prompts have not been tuned against a real successful run yet
      — that needs the credit card added first.**

**Schema added:** `writing.checkStartedAt/checkedAt/checkNotes/checkError`; `continuity` table
expanded to the full flag shape (`writingId`, `fieldLabel`, `existingExcerpt`, `newQuote`,
`explanation`, `status`, `choice`, `reason`, `context`, `resolvedAt`); two new tables,
`continuity_history` and `continuity_confirmations`. Two-pass migration (additive, then
drop/tighten) to avoid `drizzle-kit`'s non-interactive rename-ambiguity prompt. Both passes
applied to live `APP_DATABASE_URL` with permission asked each time.

**Known gaps to flag to Bobby, not fixed in this phase:**
1. **AI Gateway needs a credit card on file** on the Vercel account before any continuity check
   can actually complete (see link in the error message stored on a failed check).
2. **Pre-existing Writing Studio bug, unrelated to this phase**: opening any `/write/[code]`
   editor page throws a Lexical error #173 (cascading from a React #418 hydration mismatch) in
   the browser console, reproducing on W1 and W3 alike — found while testing Phase 4's "Check
   against canon" button, not caused by it. Not investigated or fixed here.
3. **Draft vs. Canon "never spreads"** (`docs/PLAN_WRITING_AND_AI.md`, "Decisions already made"
   #2-3) is not yet implemented: today the check auto-applies new records/details from Draft
   writing exactly as it does from Canon writing, matching the pre-existing mechanism this phase
   ported. Only "Set aside" is excluded from the check entirely. Properly gating Draft so it is
   "checked and flagged but never spreads" needs the claims ledger, which `docs/PLAN_WRITING_AND_AI.md`
   explicitly schedules as part of S7, after this phase.

### Phase 5: Views
Delivered together with step S3 and step W2. **Closed 2026-11-09**, verified live in a real
browser for every item (see `BUILD_GUIDE.md`'s Phase 5 section for the detail and what was fixed
along the way).
- [x] Sidebar multi-select filter.
- [x] Multi-lane convergence view.
- [x] Node map and per-entry relationship view, on the link index.
- [x] Story board.
- [x] Timeline polish: two-tier header for wide zoom. (Sub-events hiding until zoom was not
      needed in practice — the timeline reads fine with children shown at every zoom level; left
      as a possible future refinement, not a blocker.)

### Phase 6: Creative assist
- [ ] Gaps view.
- [ ] Review queue (UNK) view, if not already built in Phase 3.
- [ ] Suggestions: delivered by steps S4 to S6.

### Phase 7: Export and compilations
- [ ] Markdown export, `compilations` collection, ordered compile, combined export.

### Phase 8: Polish and deploy
- [ ] Search across everything (by name, alias, or code).
- [ ] Switch from dev auto-push to migrations, deploy to Vercel with a real single-user login.

---

## Build order

One list, in the order to build. Each item says where its detail lives. Steps marked S are in
`docs/PLAN_WRITING_AND_AI.md`. Steps marked G and W are below.

| # | Step | What it delivers |
|---|---|---|
| 1 | Gate 2C (Phase 2C) | Story bible applied. Done 2026-10-20. |
| 2 | S1 | Writing Studio: `/write`, `canonState`, autosave, `@` mentions. Done 2026-10-20. |
| 3 | Phase 3, S2, W1 | Frontend shell on the data layer, world tree, infobox, home hub, images. Old code retired |
| 4 | G1 | Link index, sync hooks, graph endpoints, What links here. Done 2026-11-08. |
| 5 | Phase 4 | Continuity check port. Done 2026-11-08 (see gaps noted in Phase 4 above). |
| 6 | Phase 5, S3, W2 | Filter, convergence, live node map, relationship view, story board, eras, lanes, time gaps. Done 2026-11-09. |
| 7 | S4 | AI foundation on Claude. The context builder reads the link index |
| 8 | S5 | Story Builder and beats |
| 9 | S6 | Ask AI and the prompts menu |
| 10 | S7 | Claims ledger, backward check, revert by source |
| 11 | W3 | Maps and pins |
| 12 | W4 | Chronicles |
| 13 | W5 | Boards: saved node maps, content trees, whiteboards, story map |
| 14 | W6 | Interactive tables |
| 15 | Phases 6 to 8 | Gaps view, export, compilations, search, deploy |

The user may reorder items 6 to 14. Items 1 to 5 stay first: item 4 is needed by every later view
and by the AI, and item 3 retires the old code those views would otherwise build on.

---

## Step G1: link index

Needs Phase 3 done. Delivers the `links` collection and everything in "Link index" above.
Done 2026-11-08.
- [x] Add the new prefixes (B, Y, M, P, H, D, N, A) to `lib/codes.ts`: the code pattern letters,
      `PREFIX_TO_SLUG` and the constants. Nothing else about those collections is built yet.
- [x] Add `hierarchy` to every type in `lib/relationshipTypes.ts`, the `follows` type, and `offsetYears` on `relationships`.
- [x] Create `links` and `lib/graph/` (`types.ts`, `extract.ts` for edges per collection,
      `labels.ts`, `toNode`, `toEdge`, `sync.ts`). Extraction covers every relationship field, `parent`,
      X records and codes found in rich text, textareas and detail values.
- [x] Sync calls wired into every coded write path. No Payload-style hooks exist post-removal, so
      this is direct calls to `syncLinksForRecord`/`removeRecordLinks` inside `lib/world/actions.ts`
      and `lib/studio/actions.ts`'s create/update/delete functions, matching the decision already
      recorded in `BUILD_GUIDE.md` ("the sync runs inside the data layer's write functions, not in
      a hook"). `updateFieldAction` only resyncs when the edited field is link-relevant
      (`isLinkRelevantField`), so an unrelated edit (summary, role, kind, image) is a no-op.
- [x] `scripts/rebuild-links.ts` with a dry run and `--apply`. Verified: two consecutive `--apply`
      runs produced identical counts (field: 51, relationship: 6, text: 2, total 59, across 355
      records); the 6 `relationship` rows equal the live X-record count exactly; a scripted
      create → delete → resync check confirmed a text mention creates a row, deleting its target
      marks that row `broken` without touching anything else, and the owner's own next resync
      clears the stale broken row rather than resurrecting it (no `involves` edit was exercised
      through the browser UI this session, but `updateEventInvolvesAction` calls
      `syncLinksForRecord('events', eventId)` directly after the join-table write, using the same
      extraction path verified against live data).
- [x] Endpoints: `GET /api/codes/:code/links`, `GET /api/graph`, `GET /api/graph/:code`,
      `GET /api/graph/orphans`, `GET /api/graph/broken`, `GET /api/graph/path`.
- [x] A "What links here" component (`components/what-links-here.tsx`) on all three read pages
      (`[entityType]/[slug]`, `events/[slug]`, `stories/[code]`), and a link health page (`/link-health`).
- [x] **Gate G1:** `npm run build` passes with zero errors, 27 routes rendered. Live row counts by
      source (field 51, relationship 6, text 2). Orphan and broken lists are empty on the current
      data except where exercised by the scripted test above (cleaned up after). See `BUILD_GUIDE.md`
      "Current state" for the full report.

## Step W1: world tree, infobox, home hub, images

Delivered with Phase 3 and step S2.
- [ ] `media` upload collection, `image` on every entry, `inInfobox` on detail rows, `lib/infobox.ts`.
- [ ] The shell: icon rail, side panel, canvas.
- [ ] World tree with its four modes, filter, add entry, drag to re-parent.
- [ ] Infobox at the top right of every read page.
- [ ] Home hub with quick-create tiles.

## Step W2: eras and the timeline canvas

Delivered with Phase 5 and step S3. **Closed 2026-11-09** — see `BUILD_GUIDE.md`'s Phase 5 section.
- [x] Spike first: confirm `react-calendar-timeline` can draw era bands and 11 lanes. If it cannot,
      render the single-line view by hand using the math in `lib/timeline-scale.ts`. Confirmed: it
      can (lanes are native groups; era bands are a custom absolutely-positioned overlay, since the
      library has no built-in full-height colored span).
- [x] `eras` collection (Y), `timeline-settings` global, and the event fields `eventType`, `importance`, `lane`.
- [x] Era bands with lanes, mini-map, search and filter. **Gap, not done**: era bands are solid
      color only — `eras` has a `color` field but no `image` field, so "background images" per
      this line's original wording was never built. Flagging rather than silently checking it off;
      add an `imageId` column to `eras` first if this is wanted later.
- [x] Click empty space to add an event at that year, edit in place, time gaps.

## Step W3: maps

Delivered. **Closed 2026-11-09** — see `BUILD_GUIDE.md`'s W3 section.
- [x] Spike first: pick one maintained library for image maps (pan, zoom, markers, shapes, layers). Record
      the choice in the stack table in `CLAUDE.md`. Confirmed: `leaflet` + `react-leaflet` with
      `CRS.Simple`, drawing/editing via `@geoman-io/leaflet-geoman-free`.
- [x] `maps` (M) and `map-pins` (P), layers, pin groups, popups, open-another-map pins (`open_entry`
      and `open_map` behaviors both built and verified; `open_map` was verified at the data/UI-field
      level, not by clicking through to a second map, since the test pass used only one map).
- [x] Map viewer, then the editor (right click to add, drag, draw lines, circles and polygons). Pin
      and circle creation, drag, and circle edit-shape (resize) were all verified live. Line and
      polygon drawing use the identical `pm:create` → draft-form → save path proven for pin/circle,
      but were not separately clicked through in the browser this pass. The `label` shape is spec'd
      in the schema (`shape` enum) but has no distinct rendering/behavior yet — plain pins and labels
      look and act the same.
- [x] Show a map inside a read page. Embedded (read-only) on the Location read page when a location
      has one or more maps; verified live with a real location.

## Step W4: chronicles

Needs W2 and W3.
- [ ] `chronicles` (H) and the event `pins` field.
- [ ] The paired timeline and map view, with map switching by pin and by period.

## Step W5: boards

Needs G1.
- [ ] `boards` (D). Saved node maps, content trees (family, causality, hierarchy), the story map for beats.
- [ ] Spike first for whiteboards: pick one maintained whiteboard library and record the choice in the stack table.
- [ ] Whiteboards with sticky notes, shapes, images and entry cards. Promote a connector to a relationship.

## Step W6: interactive tables

- [ ] Spike first: pick one maintained grid library and record the choice in the stack table.
- [ ] `tables` (N), the grid editor, typed columns, CSV import and export, code cells that link and index.

---

## Feature reference

The features in W1 to W6 follow how World Anvil behaves (its timelines, maps, chronicles, trees,
whiteboards, tables, and prompts menu). The notes are in `C:\dev\REA_WorldAnvil` (`STATUS.md` and
`evidence/learn/`). It is a behavior reference only. The look, wording, icons, prompt text and
layout here are our own. Do not reuse its code, artwork, icons, names or prompts.

---

## Available vs. custom

| Piece | Source | Notes |
|---|---|---|
| Writing UI, forms, versions, drafts | **Custom frontend forms over the data layer** | data layer stays as the fallback |
| Rich text editing | **Available**, Lexical | Lexical packages installed explicitly |
| Postgres hosting | **Available**, Neon | APP_DATABASE_URL on Neon |
| Single-line draggable timeline | **Available**, `react-calendar-timeline` | Already working in v1. Era bands and lanes confirmed by the W2 spike |
| Multi-lane convergence layout | **Available, needs integration**, `iStoryline.js` | Not started |
| Node map and trees | **Available**, React Flow | Data mapping from the link index plus styling |
| Sidebar multi-select | **Available**, `shadcn-multi-select-component` | Copy-paste component |
| List reordering | **Available**, `@dnd-kit/sortable` | For compilations |
| Image maps | **Available**, library chosen by the W3 spike | Pins, shapes, layers |
| Whiteboards | **Available**, library chosen by the W5 spike | Scene stored on the board |
| Table grid | **Available**, library chosen by the W6 spike | Typed columns, CSV |
| ID codes, code lookup endpoints | **Custom, small** | Written, in the starter |
| Entity and relationship collections | **Custom** | Written, in the starter |
| Link index and graph helpers | **Custom** | Step G1 |
| World tree and infobox | **Custom**, shadcn components | Step W1 |
| One-time migration and imports | **Custom** | Phase 2 |
| Continuity check logic | **Custom, ported** | Pure logic kept, data layer rewritten |
| AI suggestions and prompts menu | **Custom** | Prompts and context building, no algorithm |
| Markdown export | **Custom, simple** | Mirrors the source format |

## Explicitly out of scope

- No multi-user support and no public access.
- No AI-generated prose insertion anywhere. Suggestions and gap prompts only.
- No ongoing sync with Google Drive or any second store.
