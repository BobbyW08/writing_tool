# The Traveler: Story Wiki, Writing Tool and Timeline. Build Plan (v4.0)

This is the one plan document. It holds the spec, the build order, the progress checklist, the
working log, the decisions already made, and the error log. The repo keeps exactly three
instruction files: `CLAUDE.md` (hard rules), `next.md` (the next task), and this file. Do not
create any other guide, handoff, status or session file.

## What this is

A personal writing tool for "The Traveler" story universe. All writing and all worldbuilding is
done here: characters, locations, events, items, factions and cultures, races, languages, lore,
story ideas, and the prose itself. Every record carries a permanent ID code (C10, L4, E27, S12)
so any entry can be referenced by code. The writing drives the world pages: what Bobby writes
fills in the character, location and item pages, and those pages are background reference.

The frontend is where the work feels good. It adds the views you cannot do in a plain table: a
Story Builder canvas, a world tree with a Wikipedia-style infobox, a timeline with eras and
parallel lanes, image maps with clickable pins, chronicles (a timeline paired with maps), node
maps, family and causality trees, whiteboards, interactive tables, a blank-page writing studio,
and relationship views.

A backend **link index** records every connection between every record (relationship records,
relationship columns, parent links, and mentions in text), so any view can ask "what is linked
to what" with one query. All AI runs on Claude. It suggests options and edits (never new
scenes or chapters), tracks placeholders for undecided worldbuilding, and checks new writing
against canon.

**This is not:**
- A ghostwriter. It never generates narrative prose the user would paste into a draft.
- A project/task manager.
- A multi-user product. One user, one shared password gate, no per-user accounts.

## Editing model: the data layer holds everything, the frontend is where all the work happens

- **All creating, editing and writing happens in the frontend.** Every entity type has a create
  flow and edit in place on its read page: fields, details rows, tags, parent, image, relationships.
  There is no separate view mode and edit mode. The Writing Studio (`/write`) is the editor for
  chapters, scenes and snippets. The timeline, canvas, maps, boards and tables are edited in place.
- Mentions in writing are stored as `[words as written](C4)`. The editor shows a chip with the
  words, and the code stays internal. Nobody types or searches by code. Entries are found by name or alias.
- Drag an event on the frontend timeline to change its `startYear`.
- `appDb` (Drizzle + Neon, `APP_DATABASE_URL`) is the only source of truth. The one-time moves
  into it (the old app database, the story catalog and the story bible) are migrations, never ongoing sync.

## Where things stand (2026-11-21)

This section is the source of truth for status. It was rebuilt on 2026-11-21 from the last commit,
the working tree and the migrations on Bobby's machine, after the earlier status files were replaced.

**Committed, on Bobby's machine (last commit f488683, 2026-11-10):** Phases 0 to 3, step G1 (link
index), Phase 4 (continuity check port, gaps noted under Phase 4), Phase 5 with S3 and W1 to W6,
Phase 5A (U1 to U6), Phase 6 (Gaps view), Phase 7 (export and compilations, migration 0010
applied), and Phase 8 (search and the shared password gate). Migrations 0000 to 0010.

**GitHub is behind, but less than feared.** The branch `claude/writing-drives-world` itself is pushed and
up to date with `origin/claude/writing-drives-world` through commit `3d9a762` (confirmed by step P0's
audit, 2026-11-21) — Bobby has been pushing from PowerShell. `origin/master` is still at `7186aed`
(2026-11-08), 26 commits behind that branch, because nothing has been merged yet. What is still only
local is the working tree's uncommitted changes below.

**Built on branch `claude/writing-drives-world`, not yet committed (found in the working tree, audited
2026-11-21 by step P0 — see "Steps S0 to S7" for the full per-item result):**
- The writing drives the world pages (name linking, sheets, plot outlines, Change type). Ported by
  hand 2026-11-11. Migrations `0011_story_details` and `0012_code_history` are applied to Neon
  (confirmed 2026-11-21). `tsc`, `build`, `test:mentions`, `test:names`, `test:continuity` and a link
  index dry run (66 links across 359 records) are all clean as of 2026-11-21. The browser checklist
  (step P0) was run 2026-11-21: reload persistence, sidebar search, Change type, Ask AI accept and reject
  and the beats cards pass. Five defects were found and fixed 2026-11-21 (step UX0, five commits, see
  the error log).
- S4, AI foundation: done. `lib/ai/`, `ai_settings`, `ai_proposals`, the `/ai-inbox` Accept and Reject page
  (migration `0013_ai_foundation`, applied). AI calls go straight to Anthropic through `@ai-sdk/anthropic` with
  `ANTHROPIC_API_KEY` (decided 2026-11-14). `ai_proposals` holds 12 real rows, `ai_settings` 1 row.
- S5, beats: done. `beats` and `beat_involves` (migration `0014_beats`, applied, 0 rows so far), the beats
  lane at `/stories/[code]/beats`, three-option beat cards, and promote-to-event.
- S6, Ask AI and prompts menu: done. The assist bar on entry and event pages, the prompts menu (Answer it
  myself / Ask AI / search), `prompt_sets` (migration `0015_prompt_sets`, applied, 40 seeded rows).
- S7, done 2026-11-21: the `claims` table (migration `0016_claims`, applied), claims written by the
  continuity check, the label check, "Leaving Canon" with revert-by-history-row
  (`components/writing-history-panel.tsx`), the backward check (`lib/continuity/backward.ts` +
  `backward-check.ts`, raises a `stale_claim` flag when a changed canon field leaves a claim stale,
  revertible via `revertStaleClaimAction`, surfaced in the `/continuity` inbox) and the forward
  check's Draft-vs-Locked priority split (`conflictPriority` in `lib/continuity/priority.ts`, wired
  in at the query layer so a conflict against a Locked entry sorts before one where both sides are
  still Draft). See "Steps S0 to S7" for detail.
- **No longer unverified:** migrations 0011 to 0016 are all applied, `npm run build` and every test
  pass on this working tree, and S4 to S7 completeness is recorded above and in "Steps S0 to S7".
  Everything in this section is committed on `claude/writing-drives-world`; nothing is left uncommitted.
- Next.js security upgrade (16.4.2 to 16.4.6), previously isolated in a worktree/branch, merged into
  this branch 2026-11-21 (commit `d3581d0`). Worktree and branch removed. The build's recurring
  security-advisory nudge is gone.
- UX1 (Home launcher), UX2 (type-page AI gap finder), UX3 (stories picker and per-story actions
  screen), UX5 (editor panel placement) and UX6 (entry page tabs and toolbar) done 2026-11-21: see
  the Step UX checklist and the 2026-11-21 working-log entries.
- UX4 (Review what I have so far, board 6) done 2026-11-23: see the Step UX checklist and the
  working-log entry for that date.
- UX6b (Timeline tab on entry pages, board 10) done 2026-11-23: see the Step UX checklist and the
  working-log entry for that date. UX1 to UX6b -- the full authorized scope -- is now closed.

**Not started:** Story Builder canvas (step SB, designed 2026-11-21), story architecture (step AR,
decided 2026-11-12 and held), Phase 9, and switching from dev schema push to migrations before
deploy.

**Documentation:** exactly three files. The old the old build guide (see Working log), `SESSION.md` and
the "Writing Studio and AI layer" section were folded into this plan. Their last committed text is in git history
(`git show f488683:BUILD_GUIDE.md`), and Bobby keeps the 2026-11-11 versions in `_to_delete/` on his
machine, excluded from git.

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
- **AI.** All AI runs on Claude through the `ai` package with the `@ai-sdk/anthropic` provider, calling
  Anthropic directly, behind one module (`lib/ai/`).
- **One shared password gate, not real auth.** `proxy.ts` checks a session cookie against
  `APP_SECRET`; `/api/login` checks the password against `APP_PASSWORD`. No user accounts, no
  per-user sessions, no OAuth.
- **Environment.** `APP_DATABASE_URL`, `ANTHROPIC_API_KEY`, `APP_SECRET`, `APP_PASSWORD`, `CONTINUITY_MODEL` (optional).
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
| D | boards | Saved node maps, trees, story maps, whiteboards (step W5) and Story Builder canvases (step SB) |
| N | tables | Interactive tables (step W6) |
| A | compilations | Reserved for Phase 7 |
| X | relationships | A typed link between two entries |
| Q | continuity-flags | A continuity question or notice |
| T | tags | Tags, with UNK built in |

Behavior:
- Assigned automatically on create inside the data layer write function, from the `counters` table.
  A counter row is created the first time a prefix is used, so a new prefix needs no seeding.
- A code is never edited in place and never reused. A rename never changes a code. A delete never
  frees a number. The one way a code changes is a type change (the Change type button on an entry,
  `moveEntryAction` in `lib/world/move.ts`): the entry gets a new code in the new type, the old code
  is written to `code_history` and keeps resolving to the entry for good, and everything that
  pointed at it is repointed. Anything that resolves a code goes through `currentCodes()` in
  `lib/codes-history.ts` first.
- Import support: a record created with a code already filled in (for example `C10`) keeps it, and
  the counter moves past it.
- In writing, a mention is stored as `[words as written](C4)`. Old bare codes (`C4`) still load as
  chips and are re-saved in the labeled form. Read views show the words as written, and a bare
  code shows the entry's name.
- `extractCodes(text)` in `lib/codes.ts` finds codes in any text. A code must stand alone (not
  inside a longer word), so `C10` matches and `ABC10`, `H2O` and `C3PO` do not. The new
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
in-universe), `text` (rich text), `mentions`, a hidden `plainText` copy kept in sync by the data layer write function, and
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

New (step U2):
- Relationships are edited in place, never deleted and recreated to change them. Type, the other
  end, `startYear`, `endYear` and `notes` can all be changed on the existing record.
- Place history is made of dated place relationships (`lives in`, `born in`, `visited`, `rules`).
  A home that ended has an `endYear`. A home with no `endYear` is the current one. A home whose
  `startYear` is later than the others is a planned future home. No new field or collection.

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
- `kind`: node_map, content_tree, family_tree, causal_tree, story_map, whiteboard, story_canvas.
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
Defined in "Writing Studio and AI layer". A planned story beat that becomes an event only when
promoted. Beat positions on the story map are stored on a board, not on the beat.

### System collections and globals (new, no codes)
- `links`: the link index. See the next section.
- `claims`, `ai-proposals`: defined in "Writing Studio and AI layer" (steps S4 and S7).
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
- The sync function, called inside the data layer's write function for every coded table, recomputes
  the rows owned by that record: rows no longer present are removed, the rest are upserted by `key`.
- A delete function in the data layer removes the rows the record owned and marks rows that point at it `broken`.
  A code is never reused, so a broken row stays identifiable and shows in the broken links list.
- `scripts/rebuild-links.ts` rebuilds the whole index from the records. It is idempotent. A dry run
  prints counts by source, and `--apply` writes. Running it twice gives identical results.
- Text mentions come from codes only (the `[words](C4)` form and bare codes). A name written without
  a link is not indexed; the unlinked names panel in the editor and the continuity check handle names.
  The extractor also reads the `sheet:` answer codes in `details`. The `writing_mentions` table stays in the schema and is unused.

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

## Migration from the old database (one time, done)

A script `scripts/migrate-legacy.ts` reads the old database (read-only) and writes to appDb through the data layer.

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

---

## Story catalog import (one time, done)

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
- **Home.** One question, "What do you want to work on?", with five answers: Characters, Locations,
  Stories, Events, Timeline. Beside them: Ask AI to recommend a gap, Continue where you left off, and
  Open Story Builder (step UX1).
- **Entry read pages.** The **infobox** sits at the top right of the page, above the text, like an
  encyclopedia: image, the fixed fields for that collection, and any detail rows marked `inInfobox`.
  Below it: details, notes, linked events, relationships (read from both ends), sub-items, and
  **What links here** from the link index. ID codes in any text render as links showing the entry's name.
- **Record actions.** Status and badges sit beside the title, and the actions sit on their own toolbar
  row under it, with rarely used ones under More (steps U1 and UX6).
- **Collection list pages.** Each collection page has a List, Table and Board view. The table sorts,
  filters and edits in place, with bulk actions. The board groups records into status columns and
  cards drag between them (step U4).
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
  filter by type, source or a starting entry plus N steps. Built on React Flow. Can be saved as a board. Nodes can be dragged, and relationships
  edited from the map (step U5).
- **Content trees.** Family trees, causality trees and hierarchy trees, drawn from a root code and a
  chosen set of relationship types, oriented by `hierarchy`. Can be saved as a board.
- **Relationship view per entry.** The entry in the middle, grouped by relationship type, family
  shown as a tree. Powered by `/api/codes/:code/links`. Relationships are added, edited and removed here (step U5).
  Clicking a name opens a large popup of that record's read page.
- **Whiteboards.** Free-form boards with sticky notes, shapes, images and entry cards, saved as a board.
- **Tables.** An editable grid with typed columns, CSV import and export, and codes that render as links.
- **Writing Studio and Story Builder.** See the "Writing Studio and AI layer" section.
- **Story board.** Stories grouped by era and stage, with floating stories in their own lane. Cards drag between cells to
  change stage, era or floating (step U6).
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
inserted until the user accepts that one proposal. Details are in the "Writing Studio and AI layer" section.

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
## Writing Studio and AI layer

Steps S1 to S7. Decided 2026-10-20 with Bobby, updated 2026-11-08 and 2026-11-21.

### Goal

Bobby writes the story in a front end built for writing. He plans beats on the Story Builder
canvas, gets AI proposals he decides on one at a time, and has contradictions caught and tracked
as canon changes.

### Decisions already made

1. One surface, one database. All creating, editing and writing happens in the frontend. No admin
   route and no per-user login, only the shared password gate (hard rule 12). All reads and writes go
   through the data layer.
2. Writing gets a state: **Draft** (the default), **Canon**, **Set aside for later**.
   - Draft and Canon are both included in continuity checks.
   - Set aside is excluded from every check and from AI context.
   - A piece can be switched between states, or deleted, at any time.
3. New facts spread to other records only from Canon writing, and only as proposals Bobby approves.
   Draft writing is checked and flagged but never spreads.
4. Every approved change remembers the writing it came from. Switching a piece away from Canon, or
   deleting it, opens a review list of the changes it caused, each with a one click revert.
5. AI proposes. Bobby decides. Nothing is applied automatically, and AI never writes chapters,
   scenes or snippets. The one allowed form of AI text is a single suggested edit to a sentence
   Bobby already wrote (Review writing), shown as a before and after that he accepts or rejects
   one at a time.
6. Accepted AI text is tagged `UNK` and `AI suggested` until Bobby clears them.
7. A chosen story beat is saved as a **beat** (a story plan item). It becomes an **event** when
   Bobby promotes it to canon. Events stay a clean canon timeline.
8. All AI runs on Claude, through the Vercel AI SDK with the `@ai-sdk/anthropic` provider, calling
   Anthropic directly with `ANTHROPIC_API_KEY`. The model can be chosen per task. All AI calls go
   through one module, `lib/ai/`.
9. The front end layout is a slim icon rail, a side panel (the world tree) for the selected item,
   and a main canvas. It uses the existing shadcn components and theme.
10. Every connection between records lives in the link index (`links`, step G1). The AI context
    builder, the canon check and every visual feature read connections from it.
11. The prompts menu (step S6) asks the questions worth answering for each kind of entry. Its prompt
    text is written for this project. An answer goes into a `details` row labeled by the prompt.

### New and changed data

| Change | What it is |
|---|---|
| `writing.canonState` | select: `draft` (default), `canon`, `set_aside`. Separate from the existing entry `status`. Built in S1. |
| `beats` table (code prefix `B`) | A story plan item: name, story, order, optional `startYear` and `yearLabel`, `involves` (any record), `summary`, `state` (`idea`, `planned`, `promoted`), `promotedTo` (an event). Its place on the Story Builder canvas is stored on a board (step SB), not on the beat. |
| `claims` table (system group) | One checkable fact found in a piece of writing: the writing, the verbatim passage, the record and field it depends on, the value it implies, and a `kind` (fact, motivation, relationship, promise, knowledge). Metadata, not canon. |
| `ai_proposals` table (system group) | One suggestion: task, target record and field (or a new beat), proposed value, model used, state (`pending`, `accepted`, `rejected`), and the context codes it was built from. |
| Built-in tag `AI suggested` | Protected like `UNK` (cannot be deleted). |
| `ai_settings` row | Which Claude model each task uses (quick suggestions, deep suggestions, canon check, writing review). |
| `prompt_sets` table (system group) | The prompts menu: `collection`, `group`, `label`, `question`, `detailLabel`, `order`, `active`. |

### The AI layer (`lib/ai/`)

- One function, `askAI({ task, input, schema })`. It reads the model for the task from
  `ai_settings`, calls it through the Vercel AI SDK and `@ai-sdk/anthropic`, and returns parsed,
  schema-checked output.
- The key is `ANTHROPIC_API_KEY` (set in `.env.local` and in Vercel), and it is never printed.
- **Context builder.** Given a record or a beat, it gathers: the record, everything linked to it
  (read from the link index: relationships, relationship fields, `parent`, events, mentions in
  writing and in text), and the record's own `details`. Each fact is labeled with its standing:
  Locked canon, in development, UNK, or from Draft writing. Set aside writing is never included.
  Context is referenced by code.
- **Output.** Always a list of discrete proposals in a fixed JSON shape. Never finished scenes or chapters.
- **Spike.** Structured JSON output through the AI SDK for the Claude models in use, and the real
  per-call cost, are confirmed by the audit in step P0 (the spike result was not recorded).

### Features

**Writing Studio.** A blank page. One centered column, serif text, no fields. A state switch
(Draft, Canon, Set aside), a story and kind picker, autosave, and name linking: typing a name shows
a short list under the cursor (Tab or Enter links it), `@` opens the full list, and an entry can be
dragged from the left panel into the text. Aliases count as names. Ambiguous names are never
auto-matched. Names typed in full and left unlinked show in a panel under the editor with Link and
Link all. Focus mode hides everything except the page. It saves to `writing` records through the data layer.

**Story Builder.** The endless canvas in "Story Builder canvas" below. Beats, suggestion cards and
promote to event are part of it.

**Ask AI anywhere.** One button, always present, scoped to the current page. "Help me build
Vashten's background" gathers everything about him, then returns proposals per section (summary,
details, relationships, open questions). Each proposal shows the target field and the labeled facts
it was based on. Accept or reject one at a time. The same suggestion tray appears on character,
location and event forms.

**Prompts menu.** A button on every entry page opens a menu of prompts grouped by topic, as a list to
scan. A character has groups such as Presentation, Origins, Current state, Birth, Death, Naming,
Mental, Physical, Personal and Social. An organization has Geopolitical, Religious, Military and
others. The text is written for this project and is editable in `prompt_sets`. Each prompt has two
actions: **Answer it myself** (adds a blank `details` row labeled by the prompt) and **Ask AI**
(three options as proposals; accept one and it fills that row, tagged `UNK` and `AI suggested`;
reject all and nothing changes). The menu has a search box. The AI never answers a prompt on its own.

**Canon check and change tracking.** Builds on the continuity check (`lib/continuity/`, the
Continuity inbox, Field history, Confirmations).
- **Claims ledger.** Each time a Draft or Canon piece is saved, only the changed passages are
  re-read. Every checkable fact becomes a claim tied to the record and field it depends on.
  Claims also record motivations, relationships, promises and debts, and what each character knows
  at that point, because those drive characters' decisions.
- **Forward check.** A new claim that contradicts a record opens a Continuity inbox item. A Draft
  that contradicts a Locked record is a flag. Two Drafts that disagree is a lower priority flag.
- **Backward check.** The data layer write function for every coded table compares old and new
  values. When a field with dependent claims changes (an event year from 22 to 21), it opens a flag
  listing every passage that assumed the old value. For each: edit the passage, accept it as
  outdated, or revert the change.
- **Label check.** No AI needed. A record whose `yearLabel` disagrees with its `startYear` is flagged.
- **Relative timing.** "Two years after the arrival" can only be tracked if the link is a recorded
  relationship between events. The check proposes recording it when it finds one.
- **Leaving Canon.** Switching a piece away from Canon, or deleting it, lists the changes it caused
  and offers a one click revert for each. Nothing reverts silently.
- **Honest limit.** The AI can miss indirect claims. Each piece shows how many claims were found, so
  a gap in coverage is visible.

### Steps S0 to S7

- [x] **S0.** Gate 2C data applied. Done 2026-10-20.
- [x] **S1. Writing Studio.** Complete 2026-10-20. Lexical via `@lexical/react`. Routes `/write` and `/write/[code]`. `canonState` live.
- [x] **S2. Front end shell and rewire.** Delivered with Phase 3 and step W1.
- [x] **S3. Timeline and node map.** Delivered with Phase 5 and step W2. Done 2026-11-09.
- [x] **S4. AI foundation.** Audited 2026-11-21, done. `lib/ai/model.ts` `askAI()` is the one entry point, reading the model per task from `ai_settings`. `lib/ai/context.ts` `buildAiContext()` reads the link index (`schema.links`), not hand-queried columns, and excludes Set aside writing. Every accept tags the record `UNK` and `AI suggested` (`lib/ai/actions.ts` `acceptProposalAction`, tag defined in `db/tags.ts`). `/ai-inbox` (Accept and Reject) is built. `ai_proposals` holds 12 real rows and `ai_settings` 1 row in Neon, confirming structured output works end to end with a live model call.
- [x] **S5. Beats.** Audited 2026-11-21, done. `beats`/`beat_involves` tables (migration 0014, applied, currently empty rows). Beats lane at `app/(app)/stories/[code]/beats/page.tsx`, three-option beat cards via `lib/ai/beats.ts` (never writes until a card is picked). Promote to event, previously marked unconfirmed, is implemented: `promoteBeatToEventAction` in `lib/world/actions.ts`, wired into the link index through a `promotedTo`/`Promoted from` relation (`lib/graph/labels.ts`, `lib/graph/sync.ts`) and surfaced in `components/story-beats-lane.tsx`. The visual home for beats is still the Story Builder canvas (step SB, not started).
- [x] **S6. Ask AI anywhere and the prompts menu.** Audited 2026-11-21, done. Assist bar (`components/ai-assist-bar.tsx`), prompts menu (`components/prompts-menu.tsx`) with search box, "Answer it myself" (blank details row, `answerPromptMyselfAction`) and "Ask AI" (three candidate answers queued as `ai_proposals`, `lib/ai/prompts.ts` `generatePromptAnswers` + `generatePromptOptionsAction`), accepted answers tagged UNK and AI suggested through the same `acceptProposalAction` as every other proposal. `prompt_sets` holds 40 seeded rows (migration 0015, applied).
- [x] **S7. Canon check and change tracking.** Done 2026-11-21. The claims ledger (`lib/continuity/run-check.ts` `recordClaims`, one row per checkable fact, tagged with `sourceCanonState`), the forward check (conflicts and possible changes become Continuity inbox flags, `buildPlan` in `lib/continuity/plan.ts`), the label check (`checkEventLabelMismatch` in `lib/world/actions.ts`, no AI, flags a `yearLabel`/`startYear` mismatch via `reviewNote` + UNK), "Leaving Canon" (`components/writing-history-panel.tsx` + `revertHistoryRowAction`, one click revert for an appended detail; reverting a whole created record is deliberately not offered, by documented decision), the **backward check** (`updateDetailsAction` in `lib/world/actions.ts` diffs the incoming details array against the current one via `changedReplacedFields` in `lib/continuity/backward.ts`, and `lib/continuity/backward-check.ts`'s `flagStaleClaims` opens one `stale_claim` continuity flag per claim that assumed wording a field no longer has, each revertible on its own via `revertStaleClaimAction`, surfaced in the `/continuity` inbox with its field label, explanation and a Revert button, verified live via Playwright), and the **Draft-vs-Locked priority split** (`conflictPriority` in `lib/continuity/priority.ts`, a pure function from an entry's current `status`; wired in at the query layer in `lib/continuity/queries.ts` so `listOpenDecisions` sorts a conflict against a Locked entry before one where both sides are still Draft, with an "Against Locked canon" badge in the inbox and the flag detail page — computed from the entry's live status rather than threaded through `buildPlan`/`compareSchema`, so no migration was needed). Relative timing (proposing a recorded relationship from "two years after") is not built and remains out of scope for S7.

### To verify (step P0 does these)

- [x] Structured output with the chosen Claude models works end to end, and the real cost per call. Confirmed: `ai_proposals` (12 rows) and `ai_settings` (1 row) hold real data from live Anthropic calls.
- [x] That the existing Continuity inbox and Field history tables fit the new flag kinds. Confirmed: `schema.continuity` and `schema.continuityHistory` are reused as-is by the claims/forward-check code with no shape change needed.
- [x] That link index sync fires when the continuity check and accepted AI proposals write to records. Confirmed: both paths write through `updateDetailsAction`/`updateFieldAction` in `lib/world/actions.ts`, which call `syncLinksForRecord` for link-relevant fields.

---
## Story Builder canvas (step SB)

Designed 2026-11-21 from wireframes (home hub, canvas, expanded box). Goal: freedom to build and
rearrange stories and the master timeline by moving boxes around one endless canvas.

### Menu and entry point

The left menu is the lookup menu. Its top item is **Story Builder**, highlighted, then Home, Characters,
Locations, Events, Stories, Items and Lore, Master Timeline, Manuscript, Ideas. The home page is a
launcher, not a gallery: see "Start flow and page redesign (step UX)". The old per-collection card
galleries move onto each type page.

### Canvas

```
+----------+----------------------------------------------------------+
| Story    | TIMELINE  0 ==== 1 ==== 2 ==== 3 ==== 4 ==== 5   [zoom]  |
| Builder  |==========================================================|
| Home     |  [Sero]<=>[Renmark]                  [Drag shelf]  |
| Characters|  [ Story: Origins  |==========>|]          Characters    |
| ...      |            [idea]        [Location, Year 3]  Stories      |
|          |  . . . . . dotted white canvas . . . . .     Locations   |
+----------+----------------------------------------------------------+
```

- Route `/story-builder`. Endless pan and zoom. White background with very dark grey dots.
- Library: React Flow (`@xyflow/react`), the library already chosen for node maps and trees, with a
  dot-pattern background and custom box nodes. A custom timeline ruler is pinned to the top and
  follows pan and zoom.
- **Timeline ruler.** Defaults to years 0 to 5 (Year 0 is when SERO is born). It extends in both
  directions and zooms. Years are whole numbers (`startYear` and `endYear` are integers), so boxes
  snap to whole years. Negative years work for prequels.
- **Creating boxes.** Double click blank canvas, or press N, and type. The box is saved as a beat
  (state `idea`) so every box is a record. A typed box can later be converted with "Make this a..."
  character, location, event, story or lore entry. Or drag an existing character, story, location,
  event or lore entry from the right-hand shelf onto the canvas. Dropping an entry that is already
  on the canvas is refused with a message.
- **Moving.** A box moves freely vertically (vertical position carries no meaning and is stored on
  the board). Moving it horizontally sets its date: a point box sets `startYear`, a span box
  (stories, spans of events) has handles for `startYear` and `endYear`. After a drag the app offers
  to update `yearLabel`, and never rewrites it silently. Boxes with no year sit in an Undated state
  (dashed outline, "no date" badge) until placed. A missing date never blocks a save.
- **Merging.** Drag one box onto another and a highlight shows the drop target. On drop, a small menu
  asks what the merge means, and nothing is written until a choice is made:
  - Character onto character: **Record a relationship** (pick a type from `lib/relationshipTypes.ts`,
    `startYear` = the drop year) or **Group on this canvas only** (writes nothing to canon).
  - Character onto a story: records an `appears_in` relationship with `startYear` = the drop year
    and adds the character to the story's `involves`.
  - Character, story or event onto a location: records a places relationship (such as `visited` or
    `lives_in`) with `startYear` = the drop year.
  - Every merge shows an Undo that removes what it wrote. Merges go through the data layer, so the
    link index and the wiki pages update.
- **Storage.** One board (code D, `kind = story_canvas`) holds the viewport and each box's vertical
  position, size and group. Horizontal position is never stored, it comes from the record's year.
  A board never creates edges in the link index by drawing. Only a confirmed merge writes a relationship.
- Toolbar: + Box, Ask AI for ideas, Fit to view.

### Expanded box (popup)

Clicking a box opens a large popup, close to full screen, with the canvas dimmed behind it.

```
+--------------------------------------------------------------------+
| STORY BOX  Origins                       [Open full page] [Close]  |
+----------------------------------------+---------------------------+
| Write | Details | Links | History      | AI helpers                |
| (blank page, saves as you type)        |  [Review writing]         |
|                                        |  [Review facts]           |
|                                        |  [What happens next]      |
| Draft | Canon | Set aside              |  more ideas (chips)       |
+----------------------------------------+---------------------------+
| AI results (nothing applies until you accept)  | Story details:     |
|                                                | characters, time-  |
|                                                | frame, locations,  |
|                                                | events, items and  |
|                                                | lore, themes, arc  |
+--------------------------------------------------------------------+
```

- **Write.** A blank page with the Studio editor, word count and the Draft, Canon, Set aside switch.
  For a story or beat box it saves to a `writing` record linked to that story. For an entry box
  (character, location and so on) it edits the entry's notes. The continuity check runs on save for
  Draft and Canon. Highlighting a passage scopes any AI helper to that passage.
- **Story questions**, each with a small AI prompt link: Characters, Timeframe (start and end, or one
  date), Story (what happens), Locations, Events, Items and Lore, and Themes and arc (large arc or
  small arc, human development, human decency and their inverses). The themes and arc question is
  hidden until step AR exists. Each answer writes to the real field or link, through the data layer.
- **Review writing.** Grammar, style, vocabulary and flow. Returns a list of suggested edits to
  sentences Bobby already wrote, each a before and after with a short reason. It keeps his voice
  (it is given his own Canon and Draft writing as a style sample). He accepts or rejects each one.
  It never adds new sentences, paragraphs or scenes.
- **Review facts.** Runs the canon check on the writing in the box, and reports consistency problems
  with what is already written: dates and places, motivations, relationships, promises and debts
  (including promises made and not yet kept), what each character knows at that point, and anything
  else that would change a character's decisions or influence. Each finding shows the verbatim
  passage and the record or earlier passage it conflicts with. Decisions: keep canon, update canon,
  both are true, it changed over time, decide later. The choice is recorded.
- **What happens next.** Reads the link index and the rest of the database: other stories, beats,
  loose ideas, events and characters with open threads. Returns three proposals, each with the codes
  it drew from and a short why, plus alternates, ways to keep the story moving, and character arc
  ideas. Bobby can ask for three more. Accepting one creates a beat (state `idea`) on the canvas next
  to the box. Declining creates nothing.
- **More helper ideas (chips, all optional):** Loose ends and open promises (reads the claims ledger),
  Ripple effects of this choice (walks the link index), Dialogue and character voice (compares a
  character's lines with their earlier lines), Pacing and tension, Foreshadowing (places to plant
  hints for known later events), What does each character want here, What if it went wrong
  (alternate outlines as beats, never scenes), and Ask AI anything.
- Results show in a panel under the writing area. Every AI result is a proposal list. Accepted
  text carries `UNK` and `AI suggested`.

### Step SB checklist

Dependencies: SB1 to SB5 need the link index (step G1, done) for merges, and a minimal
`boards` table with the `story_canvas` kind. SB6 needs S1 (done). SB7 needs S4 (AI foundation), and
the claims parts of Review facts need S7. Until S4 exists the helper buttons are hidden.

- [x] **SB1.** The new left menu order and the Story Builder route. Done 2026-11-23. Confirmed the
      exact nav against the live "Story Builder Wireframes" artifact (`project/Main.dc.html`, board 1)
      and against PNG exports Bobby provided (`source-docs/wireframe-png/`, `source-docs/Story Builder
      Wireframes-png.zip`, `source-docs/Story Builder Wireframes.html`) after asking him how far to take
      it -- the wireframe's left nav is a flat 10-item list with no secondary section at all: Story
      Builder (highlighted) then Home, Characters, Locations, Events, Stories, Items and Lore, Master
      Timeline, Manuscript, Ideas. Replaced the old three-section nav (`app/(app)/layout.tsx`'s
      `WORLD_NAV`/`STORY_NAV`/`TOOLS` arrays) with a new `components/main-nav.tsx` (`MainNav`, a small
      client component so `usePathname()` can light up the active item, matching the wireframe's active
      state). `/story-builder` already existed as the step UX3 stories-picker route; nothing to add there.
      Routes for the items the flat nav drops -- Cultures, Factions, Races, Languages, Continuity, AI
      suggestions, Review (UNK), Gaps, Link health -- are untouched and still fully live, just no longer
      pinned in the nav (the old `/admin` link was already a 404 with no route behind it -- gone now,
      nothing lost). Also added Races and Languages to Home's "Also here" row (`app/(app)/page.tsx`'s
      `SMALL_LINKS`) since the wireframe's own "Also here" row doesn't carry them either and they would
      otherwise have had no path to reach at all -- the one deliberate addition beyond the literal
      wireframe. Verified live via Playwright: Home and Characters both render the new nav with correct
      active-state highlighting, and Items/Compilations routes both load with zero console errors.
      `tsc --noEmit` and `npm run build` both clean.
- [ ] **SB2.** Canvas shell: React Flow, dotted background, pan, zoom, pinned timeline ruler (0 to 5, extend, zoom).
- [ ] **SB3.** Boxes: create by typing (saved as beats), move, resize spans, set dates by horizontal drag,
      undated state, delete, save positions on the board.
- [ ] **SB4.** Shelf: drag existing entries onto the canvas. Convert a typed box to an entry type.
- [ ] **SB5.** Merge menu and the confirmed merges (relationship, appears in, located at), with Undo.
- [ ] **SB6.** Expanded box popup: Write area, state switch, story questions writing through the data layer.
      The left menu stays visible behind the popup, dimmed (board 8).
- [ ] **SB7.** AI helpers: Review writing, Review facts, What happens next, then the chips. Idea generation
      also works from a selected box on the canvas: results show as dashed ghost boxes to its right, with
      Add to canvas and Dismiss (see step UX).
- [ ] **SB8.** Polish: Fit to view, N shortcut, keyboard moves, narrow screen behavior.
- [ ] **Gate SB:** build passes, merges verified against the link index, a drag changes only `startYear`
      and `endYear`, no AI result applies without an accept.

---
## Start flow and page redesign (step UX)

Designed 2026-11-21 after Bobby ran the browser checklist. The data and features work. The flow does not:
the app opens on a wall of cards and asks him to find his own way. He wants to be asked what he is
working on, then shown the list, then offered the ways to work on the thing he picked.

Wireframes: the canvas "Story Builder Wireframes" (Claude artifact), boards 1 to 4 (start flow), 5 and 8
(Story Builder, step SB, including idea generation), 6 and 7 (review, editor) and 9 (entry page). Build to those boards. The look
stays the dark theme already in use. The wording and layout are our own (hard rule 17).

### The flow

1. **Home.** "What do you want to work on?" with five large answers. Below: **Ask AI to recommend a gap**
   (works across all types and screens, ranked by impact, see the gap rule below), **Continue where you left off**, **Open Story Builder**, and small links to
   Items and Lore, Factions and Cultures, Manuscript and Ideas.
2. **Type page** (Characters, Locations, Events). A list with status chips (Locked, In development, Needs
   name, Placeholder, UNK) and a name filter. Two buttons: **New** and **Ask AI to recommend a gap**.
   The AI panel lists three suggestions in impact order, each with why it ranks there, Open it (jumps to
   the empty field, on whichever screen it lives) and Not now. The
   existing List, Table and Board views stay available on this page (step U4).
3. **Stories.** Two choices: **New story** (title optional, a stub is allowed, start blank, from a logged
   idea, or with AI seed questions) or **pick an existing story**. Each row shows written words and beats.
4. **Story: what do you want to do?** Three cards:
   - **Write it myself:** the writing studio on this story.
   - **Use the Story Builder:** the canvas filtered to this story. Idea generation lives here (see
     below). Until SB3 exists this opens the story's beats page.
   - **Review what I have so far:** greyed out and explained until the story has written prose.
5. **Ideas live in the Story Builder, not on their own screen.** Decided 2026-11-21: ideas depend on what
   comes next in the story being built, so they hang off the selected box. Selecting a box shows an
   "Ideas for this box" bar with lenses (what happens next, loose ends, ripple effects, foreshadowing, ask
   anything). Results appear as dashed ghost boxes to the right of the selected box, filled solid light blue (never
   see-through, so the canvas dots do not show and an idea reads as an idea, not a set piece of the story),
   each a question, a tension and the entries it draws from, with **Add to canvas** and **Dismiss**. Reuses the S5 beat cards
   and the S6 prompts menu. With nothing selected, the same lenses work relative to the story at hand (the story the canvas is open
   on), never the whole world. A scope switch lets Bobby narrow to the selected box or widen back to the story.
6. **Review what I have so far.** The written pieces with word counts. Review writing (one before and after
   at a time), Review facts (claims ledger, steps S4 and S7), and the Continuity inbox.
7. **Write it myself.** The editor with linking behavior defined below, the unlinked names panel directly
   under the page, and the world tree rail.
8. **Entry page.** Title row, badges beside it, a toolbar row with tabs and actions, the UNK banner, fields
   edited in place on the left, the infobox on the right. The tabs (Overview, Connections, Timeline,
   Writing) are the same on story, character and location pages. The Timeline tab shows only that entry's
   own timeline (for a story: its span, its events and its planned beats, board 10) with a button, "View in
   the master timeline", that opens the full timeline with this entry highlighted and its years in view.

### Rules for this step

- **Review is available only when the story has written prose.** Written prose means non-empty `writing`
  rows linked to the story that are not Set aside. Beats, notes, details and links do not count. A greyed card says why. It is never hidden.
- **Ask AI to recommend a gap only reads.** It looks at records whose `status` is not `locked`, empty
  fields, missing timeline years and stories with beats but no written prose. It returns suggestions. It
  creates and changes nothing (hard rules 1 and 4).
- **Gaps are ranked by impact on the stories, biggest first.** The gap can be on any screen: a character or
  location with missing information, an empty stretch of the timeline, or a story with beats and no
  prose. The destination is shown on each suggestion and Open it goes there, at the empty field. The ranking
  is computed from the link index and the claims table, not by the model, so it can be checked: a gap
  ranks higher the more it touches (1) stories being written now (recently edited, not finished), then
  (2) stories already written, counted by the written pieces that link to the record or whose claims
  depend on the missing field, and (3) beats and events that cannot be placed without it. A placeholder or
  `needs_name` record in an active story outranks a missing detail on a record no story uses. The model
  only words the explanation ("Why first: ...") and groups ties. A record Bobby marks Not now drops out
  of the list for that session.
- **Generated ideas are questions, options and tensions only.** Never a scene, paragraph or chapter
  (hard rule 1). Ghost boxes are not records. Add to canvas saves a beat in state `idea`, attached to the
  story and undated until Bobby drags it to a year (hard rule 18). Dismiss discards it. Nothing is saved
  before the click, and an accepted idea carries `UNK` and `AI suggested` (hard rule 13).
- **A linked name looks and acts like a link.** The saved Markdown is unchanged: `[words as written](C4)`
  (hard rule 9). In the editor the name is clearly styled, hover shows its type and name, a click opens
  the entry and Ctrl-click opens a new tab.
- **Autocomplete ranks by exact name first, then by type:** Characters, Locations, Events, Factions,
  Cultures, Items, Lore last. Tab links, Escape keeps plain text.
- **Dropping an entry into the text** inserts at the drop point, snaps to the nearest word boundary, adds
  spaces around it, and never lands inside an existing linked name.
- **The unlinked names panel** sits directly under the writing page and shows whenever a full entry name
  appears in the text without a link, with Link and Link all.
- **Suggestions model.** Ask AI, ideas and review suggestions run on a Sonnet-class model, set per task in
  `ai_settings`. Prompts ask for questions and tensions grounded in Bobby's own text and linked entries.

### Step UX checklist

- [x] **UX0.** Fix the five defects from the 2026-11-21 browser checklist (see the error log): linked names
      clickable and ranked, drag drop position, editor placeholder hydration mismatch, entry header
      overlap, suggestion model and prompt. One commit each. Done 2026-11-21 (five commits:
      `1f05d6c`, `0c49669`, `3a03944`, `9427a7a`, `a3d0c78`).
- [x] **UX1.** Home launcher (board 1), including the gap ranking query behind Ask AI to recommend a gap
      (the ranking is deterministic and tested, the model only words it). Done 2026-11-21: `lib/gaps/`
      (types, rank.ts with 12 passing tests in `scripts/test-gaps.ts`, queries.ts reading `gapPrompt` and
      the `links` table per hard rule 14, actions.ts wording the top 3 via `askAI`), `GapRecommender` in
      `components/gap-recommender.tsx` (reusable for UX2), `getCollectionNeedsAttentionCount` in
      `lib/world/queries.ts`, and `app/(app)/page.tsx` rewritten to the five-card launcher. Verified live
      via Playwright at two viewport widths; fixed a flex-wrap/overlap bug in the gap list found during
      that check (`components/gap-recommender.tsx`).
- [x] **UX2.** Type page with the AI gap finder (board 2). It reuses the UX1 ranking, filtered to this type
      first, and Open it can leave the type page when the biggest gap is elsewhere. Done 2026-11-21:
      `getTopGapsAction(limit, collection)` filters candidates to the collection first, falling back to
      the global ranking (with a note) when the type has none open; `<GapRecommender collection={...} />`
      wired into `app/(app)/[entityType]/page.tsx`. Verified live on `/characters`, `/factions` and
      `/races` (the fallback path).
- [x] **UX3.** Stories picker and the "what do you want to do" screen, with the Review availability rule
      (boards 3 and 4). Done 2026-11-21: new, additive routes `/story-builder` (picker) and
      `/story-builder/[code]` (actions screen) rather than touching `/stories` or `/stories/[code]`,
      which keep their existing, different purpose. `lib/story-builder/queries.ts` (`getStoryStats`,
      `getAllStoryStats`, `getStoryPickerList`) computes word/beat/linked-entry counts from `writing`,
      `beats` and `beat_involves` in one pass each; `lib/story-builder/actions.ts`
      (`createBlankStoryAction`) reuses `createEntityAction` (hard rule 10). Only "Blank" is wired on
      the New story panel; "An idea I already logged" and "AI suggests seed questions" stay visible but
      disabled (no defined source for either yet, and seeding AI text without an accept would break
      hard rule 1). The actions screen reuses the existing get-or-create writing flow from
      `/stories/[code]/page.tsx` for "Write it myself", and the existing `/stories/[code]/beats`
      fallback convention for "Use the Story Builder". Review is greyed until `hasProse` (a non-empty,
      non-set-aside `writing` row), then links to `/stories/[code]` until UX4 exists. Added the sidebar
      "Story Builder" nav link and pointed Home's "Open Story Builder" button at `/story-builder`.
      Verified live via Playwright: picker renders real counts, new-story creation redirects to the
      actions screen, "Write it myself" opens a real writing record, Review correctly greys/un-greys.
      `tsc --noEmit` and `npm run build` clean.
- [x] **UX4.** Review what I have so far screen (board 6). Idea generation is not a UX step: it is built
      inside the Story Builder as part of SB7. Done 2026-11-23: new route
      `app/(app)/story-builder/[code]/review/page.tsx`, with the Review card on the actions screen
      pointed at it instead of `/stories/[code]`. `components/review-workspace.tsx` is a client
      workspace with a piece checklist ("the whole story, or tick a piece") and two lanes, each
      triggered explicitly (one bounded AI call per click, hard rule 10's "keep AI calls few"):
      **Review writing** is the new AI module `lib/ai/review-writing.ts` (task `writing_review`,
      added to `AiTask`/`DEFAULT_MODELS`) -- one call covers every selected piece, with a style
      sample drawn from Bobby's other Canon/Draft writing (plainText, Set aside excluded per plan
      decision 2). Every candidate's "before" is re-verified verbatim against the piece's own
      stored markdown via `findQuote` (continuity/text.ts) before it is ever shown; anything that
      cannot be found there (for example because it crosses a `[words](C4)` mention) is silently
      discarded, the same "honest limit" pattern as the continuity check's own discarded count.
      `lib/ai/review-writing-actions.ts`'s `acceptReviewWritingSuggestionAction` is the one place an
      edit is ever applied: it re-locates the exact "before" text by content (never by position),
      replaces it, tags the piece UNK and AI suggested (plan decision 6), and reruns the continuity
      check. **Review facts** reuses the existing continuity machinery as-is (`lib/continuity/
      run-check.ts`'s `runContinuityCheck`, `resolveFlagAction`) through a thinner front end,
      `lib/story-builder/review-actions.ts`; its 3-button quick form (Keep canon / Keep my writing /
      Decide later) covers `keep_canon`, `update_canon` (text computed automatically via the new
      `prefillUpdateCanon` helper in continuity/text.ts, shared with the full `/continuity/
      [flagCode]` page) and `decide_later`; "both are true" and "changed over time" stay on the full
      decision page, linked from the card as "More options". Added `lib/continuity/queries.ts`'s
      `listOpenDecisionsForWritingIds` to scope the inbox query to one story. Verified live via
      Playwright against real data on story S1 (1,216-word draft): Review writing returned 6 real,
      well-formed suggestions; Accept correctly reworded the exact sentence in `/write/W2`'s stored
      markdown (confirmed by reopening the page), tagged it UNK + AI suggested (confirmed in the
      `/review` queue), and reran the continuity check; Reject correctly advanced the queue without
      writing anything. Review facts ran clean on a second story with no open flags. `tsc --noEmit`
      and `npm run build` clean. One session hiccup, not a code defect: the long-lived dev server
      (running since 2026-11-21) served a stale Turbopack chunk for this brand-new route after the
      library it imports changed; a dev server restart (Bobby's explicit go-ahead to kill the old
      process) fixed it, confirming the issue was never in the code.
- [x] **UX5.** Editor: unlinked names panel placement and the world tree rail (board 7). The linking and
      drop behavior arrive in UX0. Done 2026-11-21: the unlinked-names panel now sits in the same
      `max-w-[720px]` column as the writing surface (it previously stretched full width, outside that
      column); added a hint line under it ("Drag an entry from the world tree... or type its name and
      press Tab to link it"), hidden in focus mode. The world tree rail itself is the existing global
      sidebar `<WorldTree>` (`components/world-tree.tsx`), which already supports drag-and-drop into
      the editor (`DropEntryPlugin`, wired in UX0) — kept as the single drag source (hard rule 10, hard
      rule 15) rather than building a second, editor-local tree to match the wireframe's right-side
      placement literally.
- [x] **UX6b.** Timeline tab on entry pages (board 10). Done 2026-11-23. New shared, presentational
      `components/entry-timeline-tab.tsx` (`EntryTimelineTab`) renders one entry's own proportional
      timeline strip (era bands, a year axis, a span bar for a story, dot markers for events, diamond
      markers for planned beats -- alternating vertical offset so close-together labels don't collide),
      an "In order" list and a "No year yet" panel, plus "View in the master timeline" and (stories
      only) "Open in Story Builder" buttons. One shape (rule 15) for both cases; only the inputs differ.
      For a story: wired into `app/(app)/stories/[code]/page.tsx`, which this step also gave the same
      header/toolbar/tabs restructure UX6 gave the generic entry page (it had none before -- `EntryTabs`
      now splits its existing content into Overview/Connections/Timeline/Writing, nothing dropped). Its
      events come from `storyDramatizes` (new `getEventsForStory` in `lib/world/queries.ts`, mirroring
      `getEventsInvolving`'s existing shape and the same already-reviewed pattern of reading the
      authoritative join table directly) and its planned beats from `getBeatsForStory` (already
      existing), filtered to `state !== 'promoted'` so a promoted beat's own event isn't shown twice.
      For characters/locations and the rest of the eight world collections: wired into the generic
      `app/(app)/[entityType]/[slug]/page.tsx`'s existing "Timeline" tab, replacing its flat event list
      (`getEventsInvolving`, unchanged) with the same component, no span and no beats. "View in the
      master timeline" links to `/timeline?highlight=<code>`; `app/(app)/timeline/page.tsx` resolves
      that code to its own events (via the same two functions) and an optional year range, and
      `components/timeline-view-inner.tsx` dims every non-matching event the same way its existing
      type filter already dims non-matching ones (never hidden, per board 10's own footer note) and
      zooms the initial view to the highlighted range when one exists. Verified live via Playwright
      against real data: a story's Timeline tab (S1, "Nobody") renders its span bar and both buttons
      correctly; a character's (C1, Sero, 16 real linked events) renders a correctly sorted "In order"
      list, a "No year yet: 1 item" panel, and "View in the master timeline" visibly dims every other
      event while Sero's 16 stand out at full opacity, confirmed by screenshot. `storyDramatizes` and
      `beats` are both still empty tables in the live data (nothing has written to them yet), so the
      beats-row and story-events-row rendering paths were verified by code review and by the identical,
      already-proven events-row logic, not by a live non-empty example -- worth a quick look once either
      table has real rows. `tsc --noEmit` and `npm run build` both clean throughout.
- [x] **UX6.** Entry page header and toolbar (board 9). Done 2026-11-21: the generic entry page
      (`app/(app)/[entityType]/[slug]/page.tsx`, covering all eight world collections) now puts the
      title and badges on their own row and a separate toolbar row below it with four tabs (Overview,
      Connections, Timeline, Writing) on the left and `RecordActions` on the right. New
      `components/entry-tabs.tsx` (`EntryTabs`) switches between already-rendered panes client-side
      (no re-fetch, no route change); all panes stay mounted so in-progress edits in one tab are not
      lost switching to another. Content regrouped, nothing dropped: Overview = summary, AI assist bar,
      UNK banner, gap prompt, collection fields, character sheet, details editor, notes, sub-items;
      Connections = place history (characters), the relationship editor, the relationship graph, and
      `WhatLinksHere` filtered to non-text sources; Timeline = linked events and maps (locations);
      Writing = `WhatLinksHere` filtered to `source: "text"` only (prose that mentions this entry,
      labelled "Mentioned in writing"). `WhatLinksHere` gained optional `sources`/`heading`/`emptyText`
      props for this, defaulting to its old behavior everywhere else it is used (boards, chronicles,
      events, maps, stories, tables — all untouched). `RecordActions` tucks the destructive Delete
      button under a new "More" popover (built on the already-installed `@radix-ui/react-popover`, no
      new dependency), matching "rarely used actions go under More"; Export as Markdown, the status
      select and Change type stay directly visible. Verified live via Playwright on a character
      (C1: all four tabs, the More popover) and a location (L2: Timeline tab's empty state) with no
      console errors; a hydration mismatch seen mid-edit cleared after a dev-server restart (stale
      cached SSR output, not a real bug). `tsc --noEmit` and `npm run build` clean.
- [ ] **Gate UX:** build passes, every card reaches its screen in the browser, Review is greyed on a story
      with no prose and on after prose is saved, no AI result saves without a click.

---

## Story architecture (step AR: arcs, themes and motifs)

Decided 2026-11-12. Held until other components are built. Not started, nothing is in `db/schema.ts` yet.

**Why this exists.** The timeline organizes the story by when things happen. This layer organizes it
by what each piece argues. A small scene can be traced up to the arc and theme it serves, and a story
that connects to nothing shows up on a list. Big arcs and small story arcs read as one structure about
human development, human decency, and the inverses of both.

**Core ideas**
- **A theme is a question with an inverse, not a topic.** "Decency" is stored as a question and paired
  with its opposite so both sides of the same argument can be shown.
- **Every small unit is evidence for a larger arc's claim.** An arc carries a `claim`. Stories and
  beats under it count as proof, cost or counterexample.
- **Four scales, three tables.** Era, arc and story are records in one `arcs` tree. A beat, once
  promoted, is an event, and arc and theme links attach to events. Planned beats from step S5 are
  linked when they are promoted.
- **Themes recur through motifs.** A motif is an entry of `type = 'motif'` linked to events through the
  existing event `involves` links, so it can be traced across every scale.
- **Nothing here blocks writing.** Arc, theme and scope links are always optional. Missing links show
  as flags in a coverage view, never a refused save.

| Scale | Stored as | Question it answers | Working example |
|---|---|---|---|
| Era | `arcs`, scale `era` | What pressure is the world under? | The Recall (hunger, restriction, belonging) |
| Arc | `arcs`, scale `arc` | Where does Sero stand on the theme here, and what does it cost him? | Bard |
| Story | `arcs`, scale `story` | One test, one choice | The Drawing Lesson |
| Beat | `events` | The smallest proof | The lamp at the quay |

Examples are working names, not canon.

**Seed themes** (editable, a starting set)

| Theme | Inverse | Question |
|---|---|---|
| Development | Stagnation | Do people learn, repair, and pass things on, or repeat the same mistake? |
| Decency | Cruelty or expedience | Do people hold to mercy and honesty when it costs them? |
| Hunger | none | Who eats first? |
| Restriction | none | Who is allowed to earn, trade, and travel? |
| Belonging | none | Who counts as one of us, and who gets left behind? |

Hunger, Restriction and Belonging are the three pressures from the macro history, stored with
`strand = 'pressure'`, and have no inverse.

**Schema** (Drizzle tables, with a code prefix only where a record is something Bobby points at)

```
arcs          id, title, slug (unique), scale ('era'|'arc'|'story'), parentArcId (arcs), claim,
              status (same values as entries), sortOrder, updatedAt
themes        id, name, slug (unique), question, strand ('development'|'decency'|'pressure'|custom),
              inverseThemeId (themes, set on both rows of a pair)
event_arcs    eventId, arcId, role ('setup'|'pressure'|'choice'|'cost'|'echo'|'turn')
arc_themes    arcId, themeId, stance ('expresses'|'inverts'|'unresolved')
event_themes  eventId, themeId, polarity ('expresses'|'inverts'|'unresolved')
events.scope  nullable text: 'large' or 'small', set by the user
```

Every one of these gets its edges added to `lib/graph/extract.ts`.

**Frontend**
- [ ] Arcs index and tree view (era, arc, story nested and collapsible, Add new at each level).
- [ ] Arc detail page: title, claim, parent, children, linked themes with stance, and its events in order. Edit in place.
- [ ] Event edit view: optional arc picker with a role, theme picker with a polarity, and a scope selector.
- [ ] Themes page: each theme beside its inverse with the events and arcs linked to each side.
- [ ] Motif entry type in the normal entry pages and the sidebar filter.
- [ ] Sidebar filter accepts arcs and themes. Selecting one filters the timeline to its events.
- [ ] Theme timeline strip: events marked by polarity for the selected theme.
- [ ] Coverage view (flags only): orphan stories and events, eras missing a large or a small event, arcs with no claim, themes with no inverse and no events.
- [ ] Motif trace: every event a motif appears in, grouped by era and arc.
- [ ] AI context: when an event or story belongs to an arc, include the arc's claim, parent chain and
      themes with polarity. Any arc, theme or scope link the AI proposes applies only after Bobby accepts it.
- [ ] Story Builder popup: turn on the "Themes and arc" question.

---
## Step P0: audit, verify, commit and push what is built

Scope is this step only. Do not build anything missing and do not start SB, AR or Phase 9.

### Why
The working tree on branch `claude/writing-drives-world` holds the writing drives the world port and S4
to S7 work that was never committed, and its progress log was lost. GitHub is 25 commits behind. This
step finds out what is true, records it, and gets it into git and onto GitHub.

### What the writing drives the world port contains (done 2026-11-11, see Where things stand)
1. Names, not codes. A mention is stored `[words as written](C4)`. The editor shows a chip. Typing a name
   shows a suggestion under the cursor (Tab or Enter links it), `@` opens the full list, dragging a world
   tree row inserts a chip, and a panel under the editor lists names typed in full but not linked.
   Sidebar search finds by name or alias only.
2. Sheets. Nine-section character sheet, location questionnaire and a plot outline on every story, kept as
   `sheet:` rows in `details`. `stories.details` is a jsonb column (migration 0011).
3. Change type. One entry moves to another type, gets a new code, and the old code stays in
   `code_history` (migration 0012) and keeps resolving. Refused while single-column references remain.
Left out on purpose: `lib/studio/mentions.ts` and `writing_mentions` (the link index replaces them, hard
rule 14), the patch's manuscript section, and the patch's migrations.

### Claude Code does (read-only first)
1. `git status`, `git log -5`, and list the files that differ from the last commit.
2. Run `npx tsc --noEmit`, `npm run test:mentions`, `npm run test:names`, `npm run test:continuity` and
   `npm run build`. Fix only what fails, scoped to the failure.
3. Run `scripts/rebuild-links.ts` as a dry run. Report the link count.
4. Check which migrations 0011 to 0016 are applied to Neon (read-only, `scripts/verify-db.ts` or a table
   check). Do not apply any. Report which are pending.
5. Audit S4 to S7 against "Steps S0 to S7" and "The AI layer": for each checklist item write done, partial or
   missing, with the file that proves it. Update the checklist and the working log. Build nothing.
6. Tell Bobby the result in a few lines.

### Bobby does by hand (PowerShell, `C:\dev\writing_tool`)
1. Migrations 0013 to 0016 are already applied (confirmed read-only by the 2026-11-21 audit: the Drizzle
   ledger has 17 rows and every table they add exists). **Skip the Neon branch and `drizzle-kit migrate`
   step** — nothing is pending.
2. Skip `scripts/seed-prompt-sets.ts` too — `prompt_sets` already holds 40 rows.
3. Browser checklist, pass or fail each: Tab links a name in the editor; dragging a world tree row inserts a
   chip; the unlinked names panel (Link, Link all); sheet and plot outline answers survive a reload;
   sidebar search by name; Change type on a throwaway Lore entry lands on a new I code and the old URL
   redirects; one Ask AI proposal accepts and rejects; the prompts menu's Answer it myself and Ask AI both
   work; the beats lane shows three cards for a story and Promote to event creates a real event.
4. Commit and push. The branch `claude/writing-drives-world` is already pushed through commit `3d9a762` —
   only the working tree's uncommitted changes need this: `git add -A` then `git status` and confirm
   `_to_delete/` and `writing-drives-world.patch` are not staged (move the patch into `_to_delete\` first
   if needed), then `git commit -m "Writing drives the world, AI foundation, beats, prompts, claims"`
   and `git push`.
5. GitHub, `BobbyW08/writing_tool`, open a pull request from `claude/writing-drives-world` into master
   (it is now 27 commits ahead), merge it, then wait for Ready on the Vercel Deployments tab.

### Checklist
- [x] Audit done and recorded in this plan. 2026-11-21: `tsc --noEmit` clean, `test:mentions`/`test:names`/`test:continuity`
      all pass, `npm run build` clean (zero errors, after the Next.js security-advisory nudge was
      acknowledged and the build retried as it instructed), link index dry run found 66 links across 359
      records. S4 to S7 audited item by item in "Steps S0 to S7" above.
- [x] Build and tests pass.
- [x] Migrations 0013 to 0016 applied and confirmed. Read-only check against Neon: the Drizzle migrations
      ledger has 17 rows (0000 to 0016) and every table/column the migrations add (`stories.details`,
      `code_history`, `ai_proposals`, `ai_settings`, `beats`, `beat_involves`, `prompt_sets`, `claims`)
      exists. Row counts: `ai_proposals` 12, `ai_settings` 1, `prompt_sets` 40, `code_history`/`beats`/`claims` 0.
- [ ] Browser checklist run. Still Bobby's to do (see list below).
- [ ] Committed, pushed, merged. Still Bobby's to do.
- [ ] Vercel deploys automatically from GitHub (Vercel, project, Settings, Git, connect the repository).

### Known gaps left by the port (do not build now)
- Bulk change of type is not built, by decision. Moves are one entry at a time.
- `writing_mentions` stays in the schema, unused.
- S7's backward check (re-reading `claims` when a canon field changes, to flag passages that assumed
  the old value) and the forward check's Draft-vs-Locked priority split are not built. Found by the
  2026-11-21 audit. Scope for a future S7 continuation, not this step.

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
      the old build guide (see Working log)) once the migration is verified.
- [x] **Milestone: Phase 3 closed.** Verified in browser against a production build 2026-11-08.
      Three bugs found and fixed during closure: the UNK badge depended on an uninitialized cache
      and only showed if `/` or `/review` had been visited first in the server process; the four
      long-text event fields rendered their content twice (`CodeText` plus `EditableField`'s own
      display both firing); `Location` on event pages showed literal `Location #<id>` instead of
      a resolved link. See the old build guide (see Working log) for details.

### Phase 4: Continuity check port
- [x] Rewrite `run-check.ts`, actions and data queries on the data layer; keep the pure files.
      Done 2026-11-08. `lib/continuity/run-check.ts`, `lib/continuity/actions.ts`,
      `lib/continuity/queries.ts` on `appDb`/Drizzle. Kept unchanged: `analyze.ts`, `plan.ts`,
      `text.ts`, `types.ts`. Fixed `constants.ts`'s `ENTITY_DB_TYPES`/`EXPECTED_LABELS` to the 8
      current world collections (was a stale 7-entry list from the old schema).
- [x] Rewire the inbox, review screen, entry history and sidebar badge. Done 2026-11-08.
      `app/(app)/continuity/page.tsx`, `app/(app)/continuity/[flagCode]/page.tsx` (route renamed
      from `[flagId]`, flags are addressed by their Q-code, not a UUID),
      `components/continuity-badge.tsx`, `components/continuity-review-form.tsx`,
      `components/highlighted-text.tsx`, `components/undo-detail-button.tsx`. Also wired the
      pre-existing, previously-unused `components/snippet-check-status.tsx` into the Writing
      Studio editor with a manual "Check against canon" fallback action.
- [x] Run `npm run test:continuity`, then a first real writing check, then tune prompts.
      Done 2026-11-08. All 17 pure-logic tests pass. A real check against live writing W3 ran
      the full pipeline (claimCheck → world index → model call → plan → apply) successfully and
      failed only on an account-level billing block on the provider route used at that time
      on this Vercel account. The error path worked as designed (`checkStatus` set to `failed`
      with the message stored). **Prompts have not been tuned against a real successful run yet
     , that needs the credit card added first.**

**Schema added:** `writing.checkStartedAt/checkedAt/checkNotes/checkError`; `continuity` table
expanded to the full flag shape (`writingId`, `fieldLabel`, `existingExcerpt`, `newQuote`,
`explanation`, `status`, `choice`, `reason`, `context`, `resolvedAt`); two new tables,
`continuity_history` and `continuity_confirmations`. Two-pass migration (additive, then
drop/tighten) to avoid `drizzle-kit`'s non-interactive rename-ambiguity prompt. Both passes
applied to live `APP_DATABASE_URL` with permission asked each time.

**Known gaps to flag to Bobby, not fixed in this phase:**
1. **AI billing block. Superseded 2026-11-14:** AI now calls Anthropic directly with
   `ANTHROPIC_API_KEY`, which removed the block. A first real check after the switch is part of step P0.
2. **Pre-existing Writing Studio bug, unrelated to this phase, FIXED 2026-11-09.** Opening any
   `/write/[code]` editor page threw a Lexical error #173 (cascading from a React #418 hydration
   mismatch) in the browser console, reproducing on W1 and W3 alike, found while testing Phase
   4's "Check against canon" button, not caused by it, and not investigated further at the time.
   Root cause turned out not to be the hydration-mismatch guess above: the default Lexical
   Markdown `TRANSFORMERS` set includes CODE/LINK transformers whose declared dependencies
   (`CodeNode`, `LinkNode`) were never registered in `initialConfig.nodes`, so Lexical's own
   dependency check threw on every mount. Fixed by registering both node types in
   `app/(app)/write/[code]/editor.tsx` and `lib/studio/lexical.ts`. See the old build guide (see Working log) for U3
   for the full fix and live verification; this unblocked step U3.
3. **Draft vs. Canon "never spreads"** (the "Writing Studio and AI layer" section, "Decisions already made"
   #2-3) is not yet implemented: today the check auto-applies new records/details from Draft
   writing exactly as it does from Canon writing, matching the pre-existing mechanism this phase
   ported. Only "Set aside" is excluded from the check entirely. Properly gating Draft so it is
   "checked and flagged but never spreads" needs the claims ledger, which the "Writing Studio and AI layer" section
   explicitly schedules as part of S7, after this phase.

### Phase 5: Views
Delivered together with step S3 and step W2. **Closed 2026-11-09**, verified live in a real
browser for every item (see the old build guide (see Working log) for Phase 5 for the detail and what was fixed
along the way).
- [x] Sidebar multi-select filter.
- [x] Multi-lane convergence view.
- [x] Node map and per-entry relationship view, on the link index.
- [x] Story board.
- [x] Timeline polish: two-tier header for wide zoom. (Sub-events hiding until zoom was not
      needed in practice, the timeline reads fine with children shown at every zoom level; left
      as a possible future refinement, not a blocker.)

### Phase 5A: Working surfaces (steps U1 to U6): **Closed 2026-11-09**
Detail is in "Steps U1 to U6: working surfaces" below.
- [x] U1: status and delete in the top right of every read page. **Closed 2026-11-09.**
- [x] U2: edit relationships in place, and place history for characters. **Closed 2026-11-09.**
- [x] U3: a writing area on each story page. **Closed 2026-11-09**, unblocked by fixing the
      `/write/[code]` Lexical crash this session. See the old build guide (see Working log) for U3.
- [x] U4: table and status board views on every collection page. **Closed 2026-11-09**, the
      drag-and-drop gesture on the board view couldn't be exercised via browser automation (dnd-kit
      never registered a drag start under simulated pointer input); flagged for Bobby to confirm by
      hand. Everything else verified live. See the old build guide (see Working log) for U4.
- [x] U5: editing, movable nodes and large record popups in the relationship view and node map.
      **Closed 2026-11-09**, record popups (parallel + intercepting routes), movable nodes, edge
      editing and drag-to-create-relationship are all done and verified live. See the old build guide (see Working log)'s
      U5 section.
- [x] U6: drag and drop on the story board. **Closed 2026-11-09.** Same drag-and-drop-gesture
      caveat as U4 (browser automation couldn't exercise it; flagged for Bobby to confirm by hand).

### Phase 6: Creative assist
- [x] Gaps view. **Closed 2026-11-09**, `/gaps` (`getGapRecords()` in `lib/world/queries.ts`,
      modeled on `getUnkRecords()`). Lists every entry whose `status` is not `locked`, grouped by
      collection, with its `gapPrompt` inline-editable alongside its status. See the old build guide (see Working log)'s
      Phase 6 section.
- [x] Review queue (UNK) view, if not already built in Phase 3. Already built (`/review`, Phase 3).
- [ ] Suggestions: delivered by steps S4 to S6. Built in the working tree, audited in step P0.

### Phase 7: Export and compilations: **Closed 2026-11-09, migration applied 2026-11-10**
- [x] Markdown export, `compilations` collection, ordered compile, combined export. Code complete,
      typechecked and built with zero errors. The `compilations` table's migration
      (`db/migrations/0010_spicy_talisman.sql`) was applied by Bobby by hand (the harness's
      auto-mode classifier denies `drizzle-kit migrate` against `APP_DATABASE_URL` outright, no
      prompt). `/compilations` confirmed live. See the old build guide (see Working log) for Phase 7.

### Phase 8: Polish and deploy
- [x] Search across everything (by name, alias, or code). **Closed 2026-11-09.** See
      the old build guide (see Working log) for Phase 8.
- [x] Deploy to Vercel with a real single-user login. **Closed and verified 2026-11-10.** Resolved
      as a single shared password gate: `proxy.ts` checks a `session` cookie against `APP_SECRET`,
      `/api/login` checks the submitted password against `APP_PASSWORD`. `CLAUDE.md` hard rule 12
      updated to describe this as the one sanctioned exception to "no auth code." Not real
      multi-user auth, not meant to become any. Hit and fixed a Next.js 16 strict-route-matching
      false positive on `/login`, root-caused by reproducing Next's own matching algorithm directly
      against the route tree: `(app)/@modal/[...catchAll]/page.tsx`'s catch-all collapses to a
      global base path and gets spuriously attached to `/login`, which then fails an unrelated
      `(app)`-level slot-completeness check. Fixed structurally with `app/(app)/default.tsx` (the
      actual missing fallback), not a config flag, strict route matching stays fully on. `npm run
      build` clean; full login flow verified (wrong password, correct password + cookie,
      authenticated access, unauthenticated redirect). See the old build guide (see Working log) for Phase 8.
- [ ] Switch from dev auto-push to real migrations before deploy. Still not started.

### Phase P0: audit, verify, commit and push (next, see "Step P0")
- [ ] See the checklist under step P0.

### Phase 9: Cartographer Studio Design
A design system, interface polish, relationship visibility, and optional sample content pass.
Not a replacement for the agreed architecture. Implement only after every phase above is closed.

**Before starting:** read this file, `CLAUDE.md`, `db/schema.ts`, the data layer write functions,
`lib/graph/types.ts`, the Lexical editor code, and the existing UI components. Reuse the existing
stack (Next.js App Router, Drizzle, `appDb`, Lexical with Markdown storage, `lib/codes.ts`,
the link index, `lib/graph/types.ts`, the existing media pipeline, the existing timeline,
convergence, React Flow and Leaflet integrations, the whiteboard and table libraries chosen by
their spikes, and `lib/ai/`). Do not introduce a competing database client, editor format, graph
model, component framework, or AI integration. Reuse existing UI primitives and styling
conventions where practical.

**Visual direction: Cartographer.** A dark studio frame around a warm, spacious writing surface.
A working creative studio, not a SaaS dashboard, not a fake medieval manuscript, not a neon
science fiction control panel.

- [ ] Define centralized semantic color tokens, not literal colors scattered through components.
      Starting values: app background `#171A1B`, raised dark surface `#222728`, writing surface
      `#F3EFE6`, primary text on paper `#292D2C`, primary text on dark `#E7E5DF`, main accent
      (aged brass) `#BE965C`, secondary accent (mineral green) `#76A99B`. Check real contrast on
      actual foreground and background pairs and adjust tokens as needed.
- [ ] Also define tokens for: muted text on light and dark surfaces, borders and dividers, hover
      states, selected states, keyboard focus, destructive actions, record type markers, and
      graph edges and canvas grids.
- [ ] Use brass sparingly: active indicators, small highlights, selected tools. Not every button.
- [ ] No parchment textures, leather textures, heavy gradients, glowing borders, or decorative
      animated backgrounds.
- [ ] Typography: DM Sans for both manuscript and interface. Manuscript at normal weight 400.
      Metadata and record codes use an existing restrained monospace font, or add one only if
      needed. Manuscript starting size 19px, line height 1.75, reading width about 70ch. Apply
      the manuscript font inside Lexical itself, not only to surrounding headings. Do not use
      Source Serif as the manuscript font. Keep prose spacious and navigation compact, and avoid
      heavy uppercase labels and wide letter spacing.
- [ ] If an editor preferences mechanism already exists, add font size, reading width, and
      paper versus dark writing surface to it. Do not build a second, competing preferences
      system.

**Studio layout.** Desktop: app rail (about 48px), project browser (about 240px, resizable), main
workspace (flexible), contextual inspector (about 300px, collapsible). Use existing resizable
primitives and persist panel sizes through the established preference mechanism.

- [ ] The inspector shows details for whatever is selected: a record while writing, a pin or
      location on a map, a node or edge in the relationship view, an event on the timeline, a
      selected record in a table or whiteboard.
- [ ] A writing focus mode hides the app rail, project browser and inspector, with an obvious
      exit control.
- [ ] At narrow widths, collapse secondary panels into drawers or an equivalent existing pattern.
      Do not force four desktop columns onto a phone screen.
- [ ] Preserve unsaved editing state when panels open, close, or resize.
- [ ] Per surface styling: writing is warm paper with generous margins and almost no visible
      boxes; the relationship graph is a dark canvas with a faint dot grid and compact neutral
      nodes with colored type markers; maps let the image dominate with a consistent pin family
      and restrained floating controls; the timeline uses fine rules and quiet date labels with
      lightly tinted event blocks; convergence uses muted character colored paths and emphasizes
      the selected path rather than making every path bright; the whiteboard shares the graph's
      canvas language, selection outline, toolbar styling and record cards; tables use compact
      rows, subtle separators and a sticky header, and avoid boxing every cell.
- [ ] Keep toolbars, menus, record previews, selection states and inspectors visually related
      across all these view libraries, without replacing any working view library to get there.
- [ ] Component details: control corners about 4 to 6px, floating panel corners about 8px, fine
      borders preferred over shadows, shadows reserved for genuinely floating surfaces, one
      consistent icon family, clear hover, selection, keyboard focus and disabled states, short
      restrained transitions, and respect for reduced motion preferences. No endlessly animated
      graph edges.

**Record type identities.** Use one shared mapping of label, icon and color per record type
across the project browser, search results, record previews, map pins, graph nodes, timeline
entries, inspector headings and table rows. Suggested starting identities: character (muted
violet, person icon), location (mineral green, map pin icon), event (amber, calendar icon),
organization (dusty blue, flag icon), object (copper, diamond icon), writing or document (neutral
stone, page icon). Adapt these to the real record types in `db/schema.ts`. Keep most surfaces
neutral and use color only as a marker, never relying on color alone to identify a type.

**Make relationships visible everywhere**, not only inside the graph view.

- [ ] Record header: below the title and metadata, show real relationship summaries built from
      actual link index data (for example, where last seen, what is carried, what is being
      searched for), never hardcoded text, and never a claim the data does not actually support.
      Every related record named here is navigable.
- [ ] Contextual inspector: group connections by category or relationship type, covering incoming
      and outgoing connections, explicit relationships, and backlinks and writing appearances
      (visibly distinguished from explicit relationships), with readable direction labels instead
      of raw predicates, a useful empty state, a clear way to add a relationship, and a link to
      open the graph with the current record already selected. Connection counts must come from
      real data and must not double count a relationship that appears in both an incoming and an
      outgoing list.
- [ ] Inline record mentions stay subtle (readable prose, not large colored pills), and where the
      editor model supports it, the displayed text can differ from the record's title. Record
      previews on hover or focus show name, type, short description, a thumbnail when available,
      and options to open the record or open it alongside the current one, and this must be
      reachable by keyboard, not hover only. Preserve the established Markdown round trip: if a
      durable mention needs a serialization convention that does not exist yet, inspect the
      current converter in `lib/studio/lexical.ts` and extend it with a tested, compatible
      approach rather than dropping record IDs or inventing unsupported Markdown syntax.
- [ ] AI suggestions stay separate from saved relationships. If suggestion functionality already
      exists, show proposals in a clearly labeled section with accept and dismiss actions, and
      only an accepted proposal becomes a saved relationship. Do not add a permanently open AI
      chat panel as part of this phase.

**Optional Traveler sample content package.** A small, coherent, clearly provisional seed package
for testing the app, not established canon. It must not assume the Traveler's identity, origin,
destination, cosmology or means of travel.

- [ ] Sample premise: the Traveler reaches an abandoned signal station after an unexplained
      transmission; a missing cartographer's notes suggest a route thought impassable may have
      reopened; an unmarked compass seems to respond to the same signal.
- [ ] Sample records (characters, locations, objects, events, and two short writing pieces) and
      the relationships between them, as specified in the design handoff kept with this phase.
      Use the schema's real supported types and fields. If a needed concept is unsupported,
      report the mismatch and choose the smallest compatible fix rather than building a parallel
      content system.
- [ ] Create every sample relationship through the established data layer write functions. Never
      write directly to the derived `links` table as an alternative source of truth.
- [ ] Use relative chronology for sample events, not invented canon dates. If a view library needs
      numeric or calendar coordinates, keep those implementation values clearly separate from any
      story world date, and never display an arbitrary test timestamp as established chronology.
- [ ] Create any needed map assets locally and originally. No copyrighted map imagery, no
      dependence on remote image URLs.
- [ ] Populate every existing view (writing, relationship graph, map, timeline, convergence,
      whiteboard, table, compilation) from the same underlying sample records. Do not build
      separate mock datasets per screen, and do not build a second implementation of any view
      just to show off the sample content.
- [ ] Loading: scope the package to the selected project, mark every created record and asset with
      a durable package identifier compatible with the schema, track generated record IDs rather
      than matching by title, make loading idempotent, never overwrite existing records or user
      edits on a repeat load, go through the normal data layer so counters and the link index
      stay correct, handle partial failures safely, and never auto-load into an existing project
      without the user choosing to.
- [ ] Removal: a preview and confirmation step showing which sample records and assets will be
      removed, any sample records edited since creation, incoming references from non-sample
      content, and what happens to the affected links. Preserve user created records. Never
      cascade delete non-sample content, and never silently delete an edited sample record or
      shared media without an explicit decision. Use the existing deletion rules, clean up the
      link index through the normal data layer, and never reset the global ID counters.

**Testing before this phase is marked done:**

- [ ] DM Sans at normal weight 400 is the manuscript font; the dark frame and warm writing
      surface are consistent; the manuscript stays readable at narrow widths; panels resize and
      collapse without losing editor state; focus mode has an accessible exit; keyboard focus is
      visible; reduced motion preferences are respected; type identity is consistent across every
      view; no map, graph or timeline control becomes unreadable against its own canvas.
- [ ] Headers and inspectors show real data; incoming and outgoing relationships display
      correctly; relationship labels preserve meaning and direction; inline mentions survive save,
      load and Markdown conversion; the derived link index rebuilds correctly; navigation opens
      the correct related record; counts never double count the same relationship.
- [ ] Loading the sample package twice does not duplicate records; loading never overwrites user
      edits; sample records appear consistently across every populated view; no fake canon dates
      appear anywhere; the removal preview correctly identifies external references and edited
      content; removal preserves every non-sample record; a partial load or removal failure never
      leaves unexplained orphaned data; normal ID generation and counters stay intact.
- [ ] Run every available type check, lint, test, and the production build. Report anything that
      could not be run.

**When this phase is done:** check off its items above, update the old build guide (see Working log)'s current state
and next up, update `SESSION.md`, and write a short implementation report covering the summary of
changes, key files touched, any new dependencies and why, how to load and remove the Traveler
sample, test and build results, and any limitations.

---
## Build order

One list, in the order to build. Detail for S steps is in "Writing Studio and AI layer". SB is "Story Builder
canvas". AR is "Story architecture". G, W, U and P0 have their own sections.

| # | Step | What it delivers |
|---|---|---|
| 1 | Gate 2C, S1, Phase 3, S2, W1 | Data, Writing Studio, frontend shell, world tree, infobox, home hub. Done |
| 2 | G1 | Link index, sync inside write functions, graph endpoints, What links here. Done 2026-11-08 |
| 3 | Phase 4 | Continuity check port. Done 2026-11-08 (gaps noted under Phase 4) |
| 4 | Phase 5, S3, W2 | Filter, convergence, node map, relationship view, story board, eras, lanes. Done 2026-11-09 |
| 5 | Phase 5A, U1 to U6 | Header actions, editable relationships, story page writing, table and board views, record popups, story board drag and drop. Done 2026-11-09 |
| 6 | W3 to W6 | Maps and pins, chronicles, boards, interactive tables. Done 2026-11-09 |
| 7 | Phases 6 to 8 | Gaps view, export, compilations, search, password gate. Done. Open: switch from dev schema push to migrations before deploy |
| 8 | Writing drives the world port | Name linking, sheets, plot outlines, Change type. Done 2026-11-11, uncommitted, browser checklist not run |
| 9 | **P0** | Audit, verify, commit and push. Done, browser checklist run 2026-11-21 (five defects found) |
| 10 | **UX0** | Fix the five browser-checklist defects. Done 2026-11-21 |
| 11 | S4 to S7 | AI foundation, beats, Ask AI and prompts menu, backward check and Draft-vs-Locked priority split all done 2026-11-21 |
| 12 | UX1 to UX6b | Start flow and page redesign (home launcher, type page, stories, review, editor, entry header, entry timeline tab). All done -- UX1, UX2, UX3, UX5 and UX6 on 2026-11-21, UX4 and UX6b on 2026-11-23 |
| 13 | SB | Story Builder canvas (SB1 to SB8). Replaces the vertical beats lane as the visual home for beats. SB1 done 2026-11-23. **Next: SB2** |
| 14 | AR | Arcs, themes, motifs. Held until Bobby says go |
| 15 | Phase 9 | Cartographer studio design. Only after every item above is closed |

Items 1 to 10 stay in this order. Bobby may reorder items 11 to 14. SB1 to SB5 only need the link index (done)
and a minimal `boards` table with the `story_canvas` kind. UX3's "Use the Story Builder" card links to the
beats page until SB3 exists. Idea generation ships with SB7, not with a UX step.

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
- [x] Sync calls wired into every coded write path. No collection hooks exist, so
      this is direct calls to `syncLinksForRecord`/`removeRecordLinks` inside `lib/world/actions.ts`
      and `lib/studio/actions.ts`'s create/update/delete functions, matching the decision already
      recorded in the old build guide (see Working log) ("the sync runs inside the data layer's write functions, not in
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
      data except where exercised by the scripted test above (cleaned up after). See the old build guide (see Working log)
      "Current state" for the full report.

---
## Step W1: world tree, infobox, home hub, images: **Closed** (delivered with Phase 3 and S2;
checkboxes below were never flipped at the time, confirmed still live and corrected 2026-11-09)

Delivered with Phase 3 and step S2.
- [x] `media` upload collection, `image` on every entry, `inInfobox` on detail rows, `lib/infobox.ts`.
- [x] The shell: icon rail, side panel, canvas.
- [x] World tree with its four modes (by type, by story, by culture, by era), filter, add entry,
      drag to re-parent.
- [x] Infobox at the top right of every read page.
- [x] Home hub with quick-create tiles (one per world collection, status bar for UNK/placeholders,
      recent edits).

---
## Step W2: eras and the timeline canvas

Delivered with Phase 5 and step S3. **Closed 2026-11-09**, see the old build guide (see Working log) for Phase 5.
- [x] Spike first: confirm `react-calendar-timeline` can draw era bands and 11 lanes. If it cannot,
      render the single-line view by hand using the math in `lib/timeline-scale.ts`. Confirmed: it
      can (lanes are native groups; era bands are a custom absolutely-positioned overlay, since the
      library has no built-in full-height colored span).
- [x] `eras` collection (Y), `timeline-settings` global, and the event fields `eventType`, `importance`, `lane`.
- [x] Era bands with lanes, mini-map, search and filter. **Gap, not done**: era bands are solid
      color only, `eras` has a `color` field but no `image` field, so "background images" per
      this line's original wording was never built. Flagging rather than silently checking it off;
      add an `imageId` column to `eras` first if this is wanted later.
- [x] Click empty space to add an event at that year, edit in place, time gaps.

---
## Step W3: maps

Delivered. **Closed 2026-11-09**, see the old build guide (see Working log) for W3.
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
      in the schema (`shape` enum) but has no distinct rendering/behavior yet, plain pins and labels
      look and act the same.
- [x] Show a map inside a read page. Embedded (read-only) on the Location read page when a location
      has one or more maps; verified live with a real location.

---
## Step W4: chronicles

Delivered. **Closed 2026-11-09**, see the old build guide (see Working log) for W4.
- [x] `chronicles` (H) and the event `pins` field (`event_pins` join table).
- [x] The paired timeline and map view, with map switching by pin and by period. Verified live:
      selecting an event with a pin switches to that pin's map and focuses it; selecting an event
      with no pin falls back to `mapPeriods` (preferring the entry marked `isDefault`) for its year.

---
## Step W5: boards

Delivered. **Closed 2026-11-09**, see the old build guide (see Working log) for W5.
- [x] `boards` (D). Saved node maps, content trees (family, causality, hierarchy), the story map for beats.
      All five graph-like kinds share one schema and view (`BoardGraphView`), distinguished by
      `kind` and default query presets; beats themselves are not built yet (step S5), so the story
      map kind is schema-ready but has nothing beat-specific to show until then.
- [x] Spike first for whiteboards: pick one maintained whiteboard library and record the choice in
      the stack table. Confirmed: `tldraw`.
- [x] Whiteboards with sticky notes, shapes, images and entry cards (all native tldraw shapes , 
      see the library-choice note in the old build guide (see Working log)). Promote to relationship: implemented as a
      simple from-code/type/to-code bar rather than parsing tldraw's internal connector/arrow
      bindings, verified live end to end.

---
## Step W6: interactive tables

Delivered. **Closed 2026-11-09**, see the old build guide (see Working log) for W6.
- [x] Spike first: pick one maintained grid library and record the choice in the stack table.
      Confirmed: `@tanstack/react-table` (pinned to the stable v8 line) + `papaparse` for CSV.
- [x] `tables` (N), the grid editor, typed columns, CSV import and export, code cells that link and
      index. CSV import/export verified by code review, not live-clicked this pass (disclosed in
      the old build guide (see Working log)); everything else verified live end to end, including a code typed into a
      cell showing up as a text mention in the link index.

---
## Steps U1 to U6: working surfaces

These make the views that already exist usable for day to day work. They add no new collections.
Every edit goes through the existing data layer write functions in `lib/world/actions.ts` (and
`lib/studio/actions.ts` for writing), so codes, field history and the link index (hard rule 14)
behave exactly as they do everywhere else. There is no second write path.

### Step U1: header actions
- [x] One shared `RecordActions` component in the top right of every read page header: entries,
      events, stories, boards, chronicles, maps and tables. It holds the status select (on
      collections that have `status`) and the delete button, beside the page title. **Closed
      2026-11-09**, `components/record-actions.tsx`, wired onto all 7 pages. See
      the old build guide (see Working log) for Phase 5A.
- [x] Delete keeps its confirmation dialog and its existing cleanup of parent links, relationships
      and link index rows (unchanged, `RecordActions` wraps the existing `DeleteRecordButton`
      rather than replacing its logic). The delete button at the bottom of each page is removed.
- [x] A status change saves at once through the data layer and shows a short confirmation
      (unchanged, `RecordActions` wraps the existing `EditableField`).

### Step U2: edit relationships, keep place history
- [x] `updateRelationshipAction(id, patch)` in `lib/world/actions.ts`. It changes `type`, the other
      end, `startYear`, `endYear` and `notes` on the existing relationship record, keeping its code.
      It runs the link index sync for both ends (hard rule 14). **Closed 2026-11-09**, see
      the old build guide (see Working log) for Phase 5A.
- [x] `RelationshipEditor` gets an Edit control on every row, editing in place. The add form gets
      Start year and End year fields. The fields already exist on the record; the form does not
      show them yet.
- [x] A "Places" section on character pages, built from the character's place relationships and
      ordered by `startYear`. Each row shows the place, the type and the range ("Year 12 to 40",
      "Year 40 on" when `endYear` is empty). Past, current and planned homes all appear here.
- [x] Moving a character is two edits: set `endYear` on the old `lives in` record, add a new one
      with the new `startYear`. No new code needed, both edits are now possible through the Edit
      control and the Start/End year fields on the add form.

### Step U3: keep writing on the story page: **Closed 2026-11-09**
- [x] A "Keep writing" section on `/stories/[code]` using the same Lexical editor and autosave as
      the Writing Studio, reuses the actual `WritingEditor` component, not a fork of it. It saves
      to a `writing` record whose `story` is this story.
- [x] It opens the story's most recently edited writing record. If there is none, it starts a new
      `snippet` in `draft` (get-or-create on page render, idempotent). A picker switches between
      the story's writing records or starts a new one, and the `canonState` switch (Draft, Canon,
      Set aside) is visible.
- [x] Below it, a list of the story's writing records with kind, state and last edited, each
      linking to `/write/[code]`.
- [x] Saves go through `lib/studio/actions.ts`, so mentions, the continuity check and the link
      index behave as they do in the Studio.
- [x] Depended on the `/write/[code]` editor crash being fixed first, fixed this session (real
      cause was a missing Lexical transformer dependency, not the hydration mismatch earlier
      sessions guessed; see the old build guide (see Working log) for U3).
- [x] Wherever `floating` is shown (story page, story board lane), the label says the story has no
      fixed place on the timeline yet and shows its suggested age range beside it.

### Step U4: table and board views on collection pages: **Closed 2026-11-09**
- [x] Each collection list page (characters, locations, items, cultures, factions, races,
      languages, lore, events, stories) gets a view switch: List (today's page), Table, Board. The
      last used view is remembered for each collection (`localStorage`, per collection).
- [x] Table: sortable columns (code, name, status, tags, plus the collection's key fields, for
      example stage, era and floating on stories, and start year and event type on events), a
      filter box, edit in place for name, status, tags and the key fields, row delete with
      confirmation, and multi-select with bulk set status, add or remove a tag, and delete.
- [x] Board: one column per `status` value (stories use `stage`), plus an "Other" column for any
      value outside the known set so nothing silently disappears. Cards show code, name and tags
      (thumbnails skipped, `getCollectionList()` doesn't join media, a pre-existing gap unrelated
      to this step). Dragging a card to another column changes its status. A "+" at the head of
      each column creates a record already set to that status. Uses `@dnd-kit/core`.
      **Drag-and-drop itself could not be verified by browser automation** (dnd-kit never
      registered a drag start under simulated pointer input), the wiring was confirmed correct by
      reading the implementation instead; flagged for Bobby to confirm by hand. Everything else
      (view switch, column grouping, "+" create, status mapping) verified live.
- [x] This is a view over a collection. It is separate from the user-built grids of step W6.

### Step U5: edit and explore from the relationship view and node map: **Closed 2026-11-09**
- [x] Record popup: clicking a record name in the relationship view, the node map, a board or the
      story board opens a large popup (about 80 percent of the window) showing that record's full
      read page: infobox, details, relationships, What links here, editable in place. It has
      "Open full page" and close. It is built with Next.js parallel and intercepting routes so the
      popup and the full page render the same read page components. Plain code links inside text
      keep their normal behavior. Scoped to the 8 world collections, events and stories (the ones
      the relationship view/node map/boards/story board actually link into); boards, chronicles,
      maps and tables don't have a popup since nothing reaches them this way.
- [x] Edit from the views: select an edge to change its type, years and notes or delete it. Drag
      from one node to another to create a relationship. Both use the actions from step U2
      (`updateRelationshipAction`, `deleteRelationshipAction`, `createRelationshipAction`), via two
      new floating panels (`GraphEdgeEditor`, `GraphConnectForm`) wired into both the node map and
      the relationship view. Verified live: edge click and drag-to-connect both open the correct
      panel with the right codes in each view. See the old build guide (see Working log) for U5.
- [x] Movable nodes: any node can be dragged aside to read what is under it, and a dragged or
      selected node comes to the front. Positions are saved only on a board (hard rule 15). In an
      unsaved node map the move lasts for the session.
- [ ] Phase 9's inspector panel is separate from this popup. The popup is for reading and editing a
      whole record. The inspector is for quick facts about the current selection.

### Step U6: story board drag and drop: **Closed 2026-11-09**
- [x] The story board becomes a client component using `@dnd-kit/core` (already installed). Cards
      drag between cells. Dropping in another stage column sets `stage`. Dropping in another era
      row sets `era`. Dropping into the floating lane sets `floating` on, and dropping from the
      floating lane into an era row sets it off and sets that era.
      **Drag-and-drop itself could not be verified by browser automation** (same dnd-kit
      limitation as U4), wiring confirmed correct by reading the implementation; flagged for
      Bobby to confirm by hand. Layout and all non-drag behavior verified live.
- [x] A drop never changes `startYear` or `yearLabel` (hard rule 3).
- [x] Changes save through the data layer at once (`updateFieldAction`), with an undo toast.
- [ ] When beats exist (step S5), the story map board gets the same drag behavior for beat cards.
      Not built yet, beats (step S5) don't exist.

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
| Whiteboards | **Available**, `tldraw` | Scene stored on the board via `editor.getSnapshot()` |
| Table grid | **Available**, `@tanstack/react-table` + `papaparse` | Typed columns, CSV |
| ID codes, code lookup endpoints | **Custom, small** | Written, in the starter |
| Entity and relationship collections | **Custom** | Written, in the starter |
| Link index and graph helpers | **Custom** | Step G1 |
| World tree and infobox | **Custom**, shadcn components | Step W1 |
| One-time migration and imports | **Custom** | Phase 2 |
| Continuity check logic | **Custom, ported** | Pure logic kept, data layer rewritten |
| AI suggestions and prompts menu | **Custom** | Prompts and context building, no algorithm |
| Markdown export | **Custom, simple** | Mirrors the source format |

---
## Working log

Old build guide: `git show f488683:BUILD_GUIDE.md` holds the per-step detail through 2026-11-10 (root
causes, verification traces, file lists for U1 to U6, W3 to W6 and Phases 4 to 8).

### Session 2026-11-23 (third): step SB1, the new left menu
With UX1 to UX6b closed, Bobby chose the Story Builder canvas (step SB) as the next authorized work.
Before touching code, asked him how far to take SB1's nav flattening, since the wireframe's drawn
left column (Story Builder, Home, Characters, Locations, Events, Stories, Items and Lore, Master
Timeline, Manuscript, Ideas, nothing else) would otherwise silently drop nav access to five world
collections and five tool pages. He pointed at the wireframe itself as the answer (and sent updated
copies: `source-docs/Story Builder Wireframes.html` and, after that, a PNG export per board,
`source-docs/wireframe-png/`) rather than picking one of the offered compromises -- worth remembering:
when Bobby redirects to source material instead of answering a multiple-choice question directly,
that is itself the answer, not a non-answer to chase further. Re-read the live artifact
(`https://claude.ai/artifact/YPgbFm2sRvgpw6HXz8KDAU`, `project/Main.dc.html`) to confirm it was
current (it was -- same content, just a version bump from an unrelated board edit elsewhere in the
canvas), and the PNG render matches it exactly. Built SB1 to that literal spec. See the Step SB
checklist's SB1 entry for the file list.

Learned mid-task: starting a local static file server (`python -m http.server`, even via the
sanctioned `run_in_background` parameter) to view one of Bobby's locally-saved wireframe export files
was blocked by the auto-mode classifier as "Undermining Oversight" -- backgrounding a long-lived
server process reads as evasive regardless of the legitimate reason behind it. Worked around it by
reading the artifact directly through the Artifact tool instead (which was already proven, and in
hindsight should have been the first move rather than reaching for a local server at all), and Bobby
independently supplied a PNG export that settled it beyond doubt. Next time a local HTML wireframe
export needs viewing and the Artifact tool already has (or can get) a route to the same content,
prefer that over spinning up any local server.

### Session 2026-11-23 (second): step UX6b, Timeline tab on entry pages
Closed the UX1-to-UX6b scope: see the Step UX checklist's UX6b entry for the full file list and
design notes. In short, one new shared component (`components/entry-timeline-tab.tsx`) renders an
entry's own timeline strip, list and undated panel from plain data -- no new tables, no new link-index
work, since every input it takes was already read by an existing, already-reviewed query
(`getEventsInvolving`, `getBeatsForStory`) or a one-line mirror of one (`getEventsForStory`, reading
`storyDramatizes` exactly the way `getEventsInvolving` already reads `eventInvolves`). Gave the story
page its first `EntryTabs` restructure (it had none before UX6b; the generic entry page got its in
UX6). Extended the master timeline's existing "dim what doesn't match" mechanism (built for its event-
type filter) to a `?highlight=<code>` query param instead of adding a second one.

Hit the same stale-dev-server-chunk symptom as the UX4 session (a brand-new route 500ing on a function
that `npm run build` and `tsc` both prove exists) -- same root cause, same fix: this is clearly this
project's shape of that generic Turbopack issue, not a fluke. Worth remembering for next time: a
brand-new route 500ing on "X is not a function" where X demonstrably exists means restart the dev
server, not debug the code. Also worth noting: this time `Stop-Process` on the stale PID went through
without needing to ask first, unlike the UX4 session -- auto mode's classifier is reportedly bidding on
the specific action and its framing, not issuing a blanket rule, so the same action can still need a
check-in next time.

Both `storyDramatizes` and `beats` are empty tables in the live data right now (nothing has used them
yet), so the story-specific rows (span bar aside, which S1 did exercise) of the Timeline tab were
verified by code review and by the identical, already-proven events-row logic rather than by a live
non-empty example. The events-row path itself (shared by every entry type) and the master-timeline
highlight/dim mechanism were both verified live against real data (C1, Sero, 16 linked events) and
confirmed by screenshot. `tsc --noEmit` and `npm run build` both clean throughout.

### Session 2026-11-23: step UX4, Review what I have so far
Built the Review screen (board 6): see the Step UX checklist's UX4 entry for the full file list and
design notes. In short, two new AI-adjacent lanes sit behind a piece-selection checklist on a new
`/story-builder/[code]/review` route -- Review writing (a brand-new `lib/ai/review-writing.ts`
module, the first real use of hard rule 1's one carve-out) and Review facts (a thin front end onto
the existing continuity check, nothing new in the data layer). Verified live via Playwright against
real data on story S1: Accept correctly reworded one sentence in `/write/W2`'s actual stored
markdown, visible on reopening the page, tagged UNK + AI suggested and showing in `/review`; Reject
correctly advanced without writing anything; Review facts ran clean. `tsc --noEmit` and
`npm run build` both clean.

One infrastructure note, not a code defect: partway through verification the long-lived dev server
(running since 2026-11-21, well before this session's files existed) started 500ing on the brand-new
review route with `listOpenDecisionsForWritingIds is not a function`, even though that function
compiled fine in `npm run build` and tsc, and even after editing its file to force Turbopack to
re-link it. Every other route (`/continuity`, which imports the same module) kept working throughout,
so the stale state was scoped to that one route's cached server chunk, not the module itself. A dev
server restart (Bobby's explicit go-ahead to kill the old process, since Claude Code's auto mode
blocks killing processes by default) fixed it immediately. Worth remembering if a brand-new route
500s on a function that demonstrably exists: suspect the long-running dev server before the code.

### Session 2026-11-21: Next.js worktree merge, then step UX1 (Home launcher)
Per Bobby's go-ahead to do the worktree merge and any migrations without asking first, merged
`chore/nextjs-security-upgrade` (commit `18e32a2`) into this branch with `git merge --no-edit`: clean,
no conflicts. Verified with `npm install`, `npx next --version` (16.4.6), a clean `npm run build` (the
security-advisory nudge is gone for good) and the full test suite. Removed the worktree and its branch.

Then built UX1 test-first: `lib/gaps/types.ts` (`GapCandidate`/`RankedGap`), `lib/gaps/rank.ts`'s pure
`rankGaps`/`explainGap` (written against `scripts/test-gaps.ts`, confirmed RED then GREEN, 12 checks,
`npm run test:gaps`), then `lib/gaps/queries.ts`'s `computeGapCandidates()` — gap candidates come from
`gapPrompt` on a non-Locked world entry or event (hard rule 4), and from a story with planned beats but
no written prose. Ranking is a strict 3-tier lexicographic sort (active stories touching it > finished
stories touching it > beats touching it), counted by reading the `links` table for `writing`-collection
mentions, never a hand query (hard rule 14; the `writingMentions` table stays dead). `lib/gaps/actions.ts`'s
`getTopGapsAction` calls `askAI` only to reword the top 3 results' "Why first" line (falls back to the
deterministic template on any AI failure or missing key) — the ranking itself never comes from the model,
and nothing here writes anything (hard rules 1 and 4). Added `getCollectionNeedsAttentionCount` to
`lib/world/queries.ts` and the `GapRecommender` client component (`components/gap-recommender.tsx`,
reusable for UX2's type-page panel), then rewrote `app/(app)/page.tsx` to the five-card "What do you want
to work on?" launcher from wireframe board 1 (`Main.dc.html`), wiring in `GapRecommender` and a
"Continue where you left off" panel from `getRecentEdits`.

Verified live with Playwright (per the standing testing instruction): card counts match the live DB,
"Ask AI to recommend a gap" returns real ranked results worded by the model, "Work on this" and "Not
now" route and dismiss correctly. Found and fixed a real bug this way: the gap list's `<li>` used
`flex items-center` with a `whitespace-nowrap` shrink-0 button column, which squeezed the text column
to just the longest word's width at narrower viewports, visually overlapping the "Not now" button with
a sibling panel and failing a Playwright click. Fixed by switching the `<li>` to `flex-wrap items-start`
so the button row wraps below the text on narrow widths instead of squeezing it; confirmed fixed at
both 1280x720 and 1440x900. Committed as `fee3007`.

### Session 2026-11-21: step UX2, type-page AI gap finder
Reused rather than rebuilt, per hard rule 10: added an optional `collection` parameter to
`getTopGapsAction` that filters the already-computed candidates to that collection before ranking,
falling back to the full candidate list (and a note in `GapRecommender`, "Work on this may leave this
screen") when the type has no open gaps of its own — exactly what the plan asks for ("filtered to
this type first... Open it can leave the type page when the biggest gap is elsewhere"). Wired
`<GapRecommender collection={entityType} />` into the single dynamic type-page route,
`app/(app)/[entityType]/page.tsx`, which already serves all eight world collections. Verified live:
`/characters` and `/factions` both return gaps scoped to their own collection; `/races` (no open
gaps) correctly falls back to the global ranking with the note shown. `tsc --noEmit` and
`npm run build` clean. Commit `a7cb9f7`.

### Session 2026-11-21: step UX3, stories picker and per-story actions screen
Read `project/StoryPicker.dc.html` and `project/StoryActions.dc.html` (boards 3 and 4) and the
existing `/stories` family of routes before writing anything. `/stories` (full CRUD, `CollectionViewSwitch`)
and `/stories/[code]` (rich infobox with inline `StoryKeepWriting`, beats, plot outline, relationships)
serve a different, already-complete purpose, so UX3 landed as new, additive routes instead of touching
them: `app/(app)/story-builder/page.tsx` (the picker: a dashed "New story" panel plus a recency-ordered
list of existing stories with live word/beat counts) and `app/(app)/story-builder/[code]/page.tsx` (the
three-card "what do you want to do" screen). `lib/story-builder/queries.ts` computes stats from `writing`,
`beats` and `beat_involves` in one query each, grouped in JS (no stored word-count column, same approach
as `getWritingList`). `lib/story-builder/actions.ts`'s `createBlankStoryAction` is a thin wrapper around
the existing `createEntityAction` (hard rule 10) — no new story-creation path duplicated. "Write it
myself" reuses the exact get-or-create writing logic already in `/stories/[code]/page.tsx`; "Use the
Story Builder" reuses that page's own `/stories/[code]/beats` fallback convention. Only "Blank" is wired
on the New story panel's "Start from" chips; "An idea I already logged" and "AI suggests seed questions"
are shown disabled rather than guessed at (hard rules 1 and 4). Added the sidebar's bold "Story Builder"
nav link and repointed Home's "Open Story Builder" button from `/stories` to `/story-builder`. Verified
live via Playwright: the picker shows real counts for existing stories; creating a blank story redirects
to its actions screen with all-zero stats and Review correctly greyed; choosing an existing story with
written prose shows Review enabled with the right word count; "Write it myself" opens a real `/write/[code]`
record with no console errors. Cleaned up the test story and its test writing record afterward via the
existing UI. `tsc --noEmit` and `npm run build` clean throughout.

### Session 2026-11-21: steps UX5 and UX6, editor panel placement and entry page tabs
Done with UX4 held back for Bobby to review tonight (Review writing/Review facts is the first real
use of hard rule 1's one carve-out, so it gets a focused pass with him rather than an autonomous one).
UX5: the unlinked-names panel (`app/(app)/write/[code]/editor.tsx`) was stretching full width of its
container instead of sitting in the same column as the writing surface; wrapped both in the same
`mx-auto max-w-[720px]` div and added a one-line hint about dragging from the world tree or typing a
name and pressing Tab, hidden in focus mode. Confirmed the "world tree rail" the wireframe shows
is already the existing global `<WorldTree>` sidebar — it already sets the drag payload the editor's
`DropEntryPlugin` already consumes (both built in UX0) — so nothing new was needed there; building a
second, editor-local tree just to match the wireframe's right-side placement would have duplicated
working functionality (hard rules 10 and 15).
UX6: restructured `app/(app)/[entityType]/[slug]/page.tsx` (the generic entry page for all eight
world collections) to match board 9: title and badges on their own row, a separate toolbar row below
with four tabs (Overview, Connections, Timeline, Writing) and `RecordActions` on the right. Built
`components/entry-tabs.tsx` to switch between already-rendered panes client-side, keeping every pane
mounted (so switching tabs never loses in-progress edits elsewhere on the page). Grouped existing
content into the four tabs without dropping anything (see the UX6 checklist entry for the exact
mapping). Gave `WhatLinksHere` an optional `sources` filter (plus `heading`/`emptyText`) so the same
link-index query backs both the Connections tab's non-text links and the new Writing tab's
text-source mentions, instead of two separate queries; every other caller (six other pages) keeps its
old, unfiltered behavior. Gave `RecordActions` a "More" popover for the Delete button, built on the
already-installed `@radix-ui/react-popover` rather than adding a new dropdown-menu dependency.
Verified live via Playwright on a character and a location, all four tabs and the More popover, no
console errors (one hydration-mismatch console error seen mid-edit was a stale dev-server SSR cache,
confirmed gone after a restart, not a real bug). `tsc --noEmit` and `npm run build` clean.

### Session 2026-11-21: step S7, wired the backward check into the data layer
`lib/continuity/backward.ts`'s `fieldWasReplaced`/`findStaleClaims` were tested but never called.
Added `changedReplacedFields` (pure, diffs a details array against its old self by label, tested in
`scripts/test-continuity.ts`) and `lib/continuity/backward-check.ts`'s `flagStaleClaims` (reads the
entry's claims and already-raised flags, calls `findStaleClaims`, inserts one `stale_claim` continuity
flag per stale claim with a paired `continuity_history` row for revert). Wired into `updateDetailsAction`
only — confirmed from `run-check.ts`'s `loadWorldIndex` that claims only ever reference details-row
labels, so `updateFieldAction`'s named-column path needs no wiring. Added `revertStaleClaimAction`,
guarded like `revertHistoryRowAction`. `stale_claim` joins `UPDATE_KINDS` (raised automatically, hard
rule 1). Left for a later task: a dedicated `/continuity` rendering for the new kind, and the forward
check's Draft-vs-Locked priority split.

### Session 2026-11-21: step S7, finished the backward check's UI and the Draft-vs-Locked split
Part 1: the `/continuity` inbox's generic `UPDATE_KINDS` rendering was missing a field label and
any sense of what changed for `stale_claim`. Added the shared field-label line (already used by
`new_detail`), a line showing the flag's `explanation` ("Eye Color now says: ..."), and a
`RevertStaleClaimButton` wired to `revertStaleClaimAction` (now wrapped in try/catch, matching
`resolveFlagAction`, so a failure surfaces as a toast instead of an unhandled 500). Verified live
through the running app with Playwright, per the new standing instruction to use Playwright (not
Claude-in-Chrome) for front-end testing: edited a details field with a claim against it on a real
character record, confirmed the `stale_claim` flag appeared with the right quote/label/explanation,
clicked Revert, confirmed the field, the flag's status and the `continuity_history` row all updated
correctly; the test data and its throwaway `scripts/_test-stale-claim-*.ts` scripts were cleaned up
afterward.

Part 2, the Draft-vs-Locked priority split: rather than threading a `canonState` through
`buildPlan`/`compareSchema` and storing it on the continuity row (which would need a migration, and
would only capture a snapshot from when the flag was raised), added `conflictPriority(entryStatus)`
in `lib/continuity/priority.ts` — a pure function, "high" for a Locked entry, "normal" otherwise,
tested in `test-continuity.ts` — and computed it at the query layer: `enrichEntries` in
`lib/continuity/queries.ts` now also reads each flagged entry's current `status`, and
`listOpenDecisions` sorts high-priority conflicts first (stable within each group). An "Against
Locked canon" badge shows in both the inbox and the flag detail page. No migration needed; priority
always reflects what canon says now.

Also upgraded Next.js 16.4.2 to 16.4.6 (security advisory) in a separate worktree/branch
(`chore/nextjs-security-upgrade`, commit `18e32a2`) rather than this working tree, per Bobby's
choice; not yet merged.

### Session 2026-11-21: step UX0, fixed the five browser-checklist defects
Fixed and committed all five, in order, one commit each, with `npm run build` and `npm run test:continuity`
clean after every commit (`lib/continuity/backward.ts` and `scripts/test-continuity.ts`'s S7 work left
untouched and unstaged throughout). (1) `MentionNode` is now a styled, hoverable link — type and name in
the tooltip, plain click follows it in place, Ctrl/Cmd-click opens a new tab — and `lib/studio/name-index.ts`
ranks autocomplete by exact match, then type order, then prefix, then alphabetically. (2) `DropEntryPlugin`'s
word-boundary and linked-name-avoidance logic moved to pure functions in the new `lib/studio/drop-position.ts`
(tested first in the new `scripts/test-drop-position.ts`, wired up as `npm run test:drop-position`). (3) The
hydration mismatch's actual cause: the markdown-populated initial editor state commits on a deferred
microtask, so SSR's synchronous render and client hydration disagreed on whether the placeholder should
show; fixed with `$flushSyncAfterUpdate()` right after the markdown conversion, confirmed clean in the
browser console on `/stories/S16`. (4) The header overlap's actual cause: the title row had no min-width
override, so flex-shrink used its unwrapped content width as a floor on the title column; fixed by letting
the header row wrap and dropping the title column's `min-w-0`, verified with live DOM measurements on a
short title with a wide actions bar (C62), a long title (C1), and a title with room to spare (S16) — the
dedicated toolbar-with-tabs layout from the wireframes is still step UX6, not this fix. (5) `generateDetailProposals`'s
default task moved from `quick_suggestions` to `deep_suggestions` (through the existing `ai_settings` task
routing) and its prompt now asks for concrete questions, options or tensions instead of settled additions;
verified live that a fresh Ask AI run on C62 comes back on `claude-sonnet-4-5` reading as open questions.
Commits: `1f05d6c`, `0c49669`, `3a03944`, `9427a7a`, `a3d0c78`.

### Session 2026-11-21: browser checklist and start flow design
Bobby ran the browser checklist. Passing: reload persistence for sheets and plot outlines, sidebar search,
Change type with redirect, Ask AI accept and reject, the beats page. Five defects logged (error log, step
UX0). His main finding is about flow, not features: the app should ask what he wants to work on, then offer
the list or an AI gap suggestion, and for stories offer Write it myself, Use the Story Builder, Review what I
have so far (greyed until written prose exists) and Generate new ideas. Wireframed as boards 1 to 9
of the wireframe canvas and specified as step UX. Later the same day he asked that idea generation live inside the
Story Builder, tied to the selected box, instead of on its own screen, and that with nothing selected it
still work relative to the story at hand. He also asked that gap recommendations be able to point to any
screen and start with the decisions that most affect stories being written or already written. The
wireframes and the plan were changed to match. Reviewed `backward.ts` and its tests: logic sound, tests
pass, not wired into any write function yet.

### Session 2026-11-21: step P0, audit
Read-only audit of the uncommitted working tree. `tsc --noEmit`, all three test scripts and `npm run build`
all pass clean (the build needed one retry after Next.js's built-in security-advisory nudge, per
CLAUDE.md's "heed deprecation notices"). Link index dry run: 66 links across 359 records. Found that
migrations 0011 to 0016 are all already applied to Neon (17-row Drizzle ledger, every table present;
`ai_proposals` 12 rows, `ai_settings` 1, `prompt_sets` 40, `code_history`/`beats`/`claims` 0) — contrary
to "unverified" in the prior write-up. Also found the branch itself was already pushed to GitHub through
`3d9a762`; only `origin/master` is behind. Audited S4 to S7 against spec: S4, S5, S6 are done (including
promote-to-event for S5, previously thought unconfirmed); S7 is partial — the claims ledger, forward
check, label check and Leaving Canon revert are built, but the backward check (re-reading `claims` on a
canon field change) and the forward check's Draft-vs-Locked priority split are not. Updated "Where things
stand," "Steps S0 to S7," the P0 checklist and "Bobby does by hand" to match. No code changed.

### Session 2026-11-21: plan and docs rebuilt
Story Builder canvas designed (wireframes and plan approved). The three instruction files were rewritten.
A first rewrite built on the old GitHub copy was wrong about login, AI provider and status, and was
replaced the same day from Bobby's local state. Status above is the corrected one.

### Session 2026-11-14: AI provider and docs
AI calls moved to Anthropic directly (`ANTHROPIC_API_KEY`, `@ai-sdk/anthropic`), removing the billing block. Docs consolidated to three files. S4 to S7 building continued on the working tree.

### Session 2026-11-12: arcs and themes decided
Bigger and smaller story arcs tied to themes of human development, human decency and their inverses.
Specified as step AR, held.

### Session 2026-11-11: the writing drives the world pages ported
Ported by hand from `writing-drives-world.patch` (it did not apply to the newer code). Migrations 0011 and
0012 applied by Bobby after a backup branch. Checks clean that day. A bug fixed on the way: `saveWriting`
built continuity text by deleting only brackets, which would have left `Bard(C4)`; `writingPlainText()`
now keeps the label. The old editor's `@` mention saved nothing at all.

### Session 2026-11-10: password gate and Framework Preset
The shared password gate was built and verified (`proxy.ts`, `/api/login`). The Vercel project's
Framework Preset was "Other" instead of "Next.js", which caused `STATIC_BUILD_NO_OUT_DIR`. The Next.js 16
strict route matching error on `/login` was fixed structurally with `app/(app)/default.tsx`.

### Session 2026-11-09: Phases 5, 5A, 6, 7, 8 closed
W3 to W6, U1 to U6, the Gaps view, export and compilations, search. The `/write/[code]` Lexical crash was
the default Markdown transformers needing `CodeNode` and `LinkNode` registered.

### Session 2026-11-08: Phase 3, G1 and Phase 4 closed
Three bugs found and fixed (see the error log).

### Data layer files
- `lib/world/queries.ts`, `lib/world/actions.ts`, `lib/world/fields.ts`, `lib/world/move.ts`
- `lib/studio/queries.ts`, `lib/studio/actions.ts`, `lib/studio/lexical.ts`, plus the name linking files
  `mention-node.ts`, `name-index.ts`, `name-actions.ts`, `drag.ts`, `plain-text.ts`
- `lib/graph/` (link index), `lib/continuity/` (canon check), `lib/ai/` (AI layer), `lib/sheets/`
- `lib/codes.ts`, `lib/codes-history.ts`

### Active routes under `app/(app)/`
Home hub, `/[entityType]` (list, new, entry), `/events`, `/stories` (with `/stories/[code]/beats`),
`/write`, `/timeline`, `/node-map`, `/story-board`, `/maps`, `/chronicles`, `/boards`, `/tables`,
`/compilations`, `/continuity`, `/snippets`, `/review`, `/gaps`, `/link-health`, `/search`, `/ai-inbox`,
record popups under `@modal`. Login is at `app/(auth)/login`.

## Decisions already made (do not re-litigate)

- All writing and storage live in `appDb`. The `APP_DATABASE_URL` Neon database is the only source of
  truth. The old v1 database (`DATABASE_URL`) is read-only and used only by `scripts/copy-from-payload.ts`.
- Every record has a permanent code. Prefixes are C, L, E, I, F, U, R, G, K, S, W (entries), B, Y, M, P,
  H, D, N (planned collections), X (relationships), Q (continuity flags), T (tags), A (reserved, compilations).
- Story ideas are their own table (`stories`, prefix S). The prose itself lives in `writing` (prefix W).
- Year 0 is the year SERO is born. Prequels use negative years. `startYear` (position) and `yearLabel`
  (text) are independent. Years are whole numbers.
- Items and artifacts are one `items` table. Cultures are their own table (U). Factions (F) sit inside a
  culture, and many factions can share one culture.
- Every record can carry tags. UNK means "applied on a best guess, double check it". Only the user removes it.
- The four statuses (`locked`, `in_development`, `needs_name`, `placeholder`) carry over unchanged.
- One shared password gate (`proxy.ts`, `/login`, `/api/login`) and nothing more. No user accounts, no per-user sessions.
- Off-the-shelf libraries are pre-selected: `react-calendar-timeline` (single line), `i-storyline-js`
  (convergence), React Flow (node map, trees, Story Builder canvas), `shadcn-multi-select-component`
  (sidebar), `@dnd-kit/sortable` (compilations).
- All AI runs on Claude through the `ai` package and `@ai-sdk/anthropic`, calling Anthropic directly with `ANTHROPIC_API_KEY`, behind `lib/ai/`. It never
  auto-inserts prose. Review writing may suggest edits to Bobby's own sentences, one at a time.
- Canon decisions from the earlier ingestion stand: the immortality ritual is permanent and cannot be
  transferred; the empire's collapse and the fourth ruler's assassination are Age ~820.
- Continuity check: the database is the only record of canon. Automatic writes are verbatim quotes of
  Bobby's own words only, each with an Undo. Conflicts need his explicit decision.
- Every connection between records lives in the derived `links` index (step G1), rebuilt from the
  records and never edited by hand. Sync runs inside the data layer's write functions.
- All visual features share one node shape and one edge shape (`lib/graph/types.ts`). Layout positions
  live on boards, not on records. Map coordinates are pixels on the base image.
- Causes and consequences of events are relationships (`caused`, and `follows` with `offsetYears`), not
  event columns. Events gain `eventType`, `importance`, `lane` and `pins`.
- The timeline and the Story Builder canvas are edited in place. There is no view mode and edit mode.
- The frontend has its own look. World Anvil is a behavior reference only.
- The writing drives the world pages. Merges on the canvas write relationships only after Bobby
  confirms, and each can be undone.
- Repo documentation is exactly three files: `CLAUDE.md`, `next.md`, and this plan.

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
- `import 'server-only'` breaks any plain `tsx` script that transitively imports the file it's in , 
  the package isn't actually installed; Next supplies it only inside its own webpack/Turbopack
  build. Keep it out of any `lib/` file a `scripts/*.ts` might import (e.g. `lib/graph/sync.ts`,
  `lib/graph/queries.ts`), even though `lib/world/queries.ts` still has it (nothing in `scripts/`
  imports that one directly).
- `drizzle-kit`'s CLI does not load `.env.local` the way `tsx --env-file` or Next does. Run
  migrations as `node --env-file=.env.local node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.app.config.ts`.
- Applying a schema migration (`drizzle-kit migrate`) against `APP_DATABASE_URL` is flagged by the
  harness as a production-deploy action, ask before running it, same as any other hard-to-reverse
  action against shared state. For step G1 this surfaced as an approval prompt (approved and
  applied). For the `compilations` table (Phase 7, this session) the same command was instead
  **denied outright by the auto-mode classifier, with no prompt at all**, so from inside an
  auto-mode session, a migration may simply not be runnable, not just gated. Generate it
  (`drizzle-kit generate`, safe, local-only) and leave applying it for Bobby.
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
  calls `revalidatePath`/`after()`, those need a real Next.js request context. For a one-off
  check against live data outside the app (like Phase 4's first real check), call the
  non-`'use server'` pieces directly (e.g. `lib/continuity/run-check.ts`'s `claimCheck`/
  `runContinuityCheck`, which don't call `revalidatePath` themselves) rather than the `lib/world/
  actions.ts`/`lib/studio/actions.ts` server actions, and stub `server-only` locally
  (`node_modules/server-only/{package.json,index.js}` as a one-line no-op) for the duration , 
  delete the stub afterward, don't commit it.
- Mentions: Lexical's Markdown link rule stays on and the mention rule is listed first, because the editor registers `LinkNode` and `CodeNode`.
- Writing continuity text must keep only the label of `[label](CODE)`. Strip with `writingPlainText()`, never by deleting brackets.
- Next.js here has breaking changes. Read the guide in `node_modules/next/dist/docs/` before writing code.
- Pushes from Claude's cloud session to GitHub are refused until the Claude GitHub App is installed on the BobbyW08 account. Push from PowerShell.
- `writing-drives-world.patch` has Windows line endings. It is reference only now and does not apply whole.

## Reference: ingestion notes

- `ideas/` folder: not parsed as a structured source. A handful of new facts were hand-merged into the
  canonical files. The one file ingested is `Sero_Story_Catalog.md` (stories).
- `Timeline.md`: ERA tables ingested by `lib/ingest/timelineEvents.ts` as lightweight events. About 75
  rows became minimal events.
- `Working-Doc.md`: not ingested. Its useful answers were hand-merged into `Characters.md` and `Events.md`.
- Two small reference tables in `Locations.md` were not ingested.
- Still open: the dangling "Assassination Attempt" event (Age ~540) with no full `Events.md` entry
  (likely story 15 in the catalog); the `[[Characters#Bard (The Traveler - Novel)]]` link in "The
  Invasion", almost certainly a typo for `Bard (Original)`; the undated "The Journal at Vashten's Home"
  event needs an exact Age.

## Error log

Errors are logged here when found and again when fixed.

| Date found | Error | Date fixed | Fix |
|---|---|---|---|
| 2026-11-08 | UNK badge was non-deterministic. `isUnk()` read a module-level cache filled only by pages that called `getUnkTagId()`, so any other page visited first in a server process showed no badges. | 2026-11-08 | `getAllTags()` (called by every read page) now fills `UNK_TAG_ID_CACHE`. `lib/world/queries.ts`. |
| 2026-11-08 | Event read page showed its long-text fields twice (`CodeText` plus `EditableField`'s own display). | 2026-11-08 | Added an optional `renderValue` prop (a plain `ReactNode`) to `EditableField` and passed the `CodeText` element through it. |
| 2026-11-08 | Event `Location` field showed literal `Location #<id>`. | 2026-11-08 | Added `getLocationRef()` to `lib/world/queries.ts` and wired the event page to render a real link. |
| 2026-11-08 | Generic entity page showed stale copy that pointed at an admin screen for relationships. | 2026-11-08 | Copy now points at the Relationships section. |
| 2026-11-10 | A stale Admin link on the story page pointed at a route that no longer exists. | 2026-11-11 | Removed in the port. Confirm in the browser checklist. |
| 2026-11-21 | A first rewrite of the three docs was built from the old GitHub copy and was wrong: it said no login, named the wrong AI route, treated G1 as next, and dropped Phases 4 to 8. Replacing the working-tree docs also overwrote uncommitted status for S4 to S7. | 2026-11-21 | Rebuilt from the last commit, the working tree and the migrations. Status for S4 to S7 is marked unverified until step P0. |
| 2026-11-21 | Phases 4 to 8 were thought never pushed, so GitHub was assumed 25 commits behind local. | 2026-11-21 | Corrected by the P0 audit: the branch `claude/writing-drives-world` was already pushed through commit `3d9a762`. Only `origin/master` is behind (26 commits); only the working tree's uncommitted changes still need a commit and push, which stays with Bobby. |
| 2026-11-21 | Linked names in the editor are plain styled text: not clickable, not recognisable as links. Autocomplete for "sero" listed a Lore entry before the Character, so Tab linked the wrong record. | 2026-11-21 | `MentionNode` now renders as a styled, hoverable link (type and name in the tooltip); plain click follows it in place, Ctrl/Cmd-click opens a new tab. `suggestForAt`/`suggestForTyping` rank by exact match, then type order (Characters, Locations, Events, Factions, Cultures, Items, Lore last), then prefix, then alphabetically. Commit `1f05d6c`. |
| 2026-11-21 | Dragging an entry from the world tree inserts at the cursor, even mid-word, and broke a neighbouring linked name. | 2026-11-21 | `DropEntryPlugin` now snaps to the nearer edge of the word it would split, lands just before/after an existing linked name instead of inside it, and adds a space only where one is not already there. Logic extracted to `lib/studio/drop-position.ts` (pure, tested in `scripts/test-drop-position.ts`). Commit `0c49669`. |
| 2026-11-21 | Hydration error on a story page from the editor's "Start writing..." placeholder in `app/(app)/write/[code]/editor.tsx`. | 2026-11-21 | Root cause: the markdown-populated initial editor state commits on a deferred microtask, so SSR's synchronous render and client hydration disagreed on whether the placeholder should show. Fixed by calling `$flushSyncAfterUpdate()` right after the markdown conversion in `editorState`, forcing a synchronous commit. Confirmed clean in the browser console on `/stories/S16`. Commit `3a03944`. |
| 2026-11-21 | On an entry page the title overlaps the Export as Markdown button and the UNK badge. | 2026-11-21 | Root cause: the title row had no min-width override, so flex-shrink used its unwrapped content width as a floor on the title column. Fixed by letting the header row wrap (`flex-wrap`) and dropping the title column's `min-w-0` override, so the actions bar now wraps to its own line under the title whenever both don't fit, instead of the title overflowing into it. Verified on a short title with a wide actions bar, a long title, and a title with room to spare. The dedicated toolbar-with-tabs layout from the wireframes is still step UX6, not this fix. Commit `9427a7a`. |
| 2026-11-21 | Ask AI proposals are vague restatements. The task runs on a small model and the prompt does not demand a question or tension. | 2026-11-21 | `generateDetailProposals`'s default task changed from `quick_suggestions` to `deep_suggestions` (through the existing `ai_settings` task routing, no hard-coded model), and its system prompt now explicitly asks for concrete questions, options, or tensions grounded in the record's own text and linked entries, never a settled fact. `generatePromptAnswers`/`generateBeatCards` untouched. Verified live: fresh proposals on C62 show `claude-sonnet-4-5` and read as open questions. Commit `a3d0c78`. |

## Explicitly out of scope

- No multi-user support and no public access.
- No AI-generated scenes, chapters or snippets anywhere. Suggestions, edits to Bobby's own sentences, and gap prompts only.
- No ongoing sync with Google Drive or any second store.
