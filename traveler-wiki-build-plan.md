# The Traveler — Story Wiki & Timeline: Build Plan (v1.0)

## What this is

A personal web app for organizing "The Traveler" story universe: characters, locations,
events, items, cultures, races, languages, and artifacts, all cross-linked, with a
filterable timeline. v1.0 also acts as a lightweight creative assistant: it can suggest
story ideas (never write prose for the user) and let the user drop in placeholders for
undecided worldbuilding so writing never has to stop to go look something up.

**This is not:**
- A ghostwriter. It never generates narrative prose the user would paste into a draft.
- A project/task manager.
- A multi-user product. Single user, no auth needed for v1.0.

## Editing model — the app is where writing happens

This is a live-editing tool, not a read-only viewer. The user needs to be able to:
- Add, edit, or delete any entity or event directly in the app.
- Drag an event on the timeline to move it to a different point in time.
- Write an event's scene/notes inside the app, set its Age, and have it appear on the
  timeline immediately — no separate doc to maintain and re-sync.

**Consequence for source of truth:** once this app exists, the database is the living
source of truth going forward, not the Google Drive docs. Drive import (Phase 0/2) is
a one-time migration of existing content, not an ongoing two-way sync — trying to keep
both Drive and the app simultaneously editable would create constant conflict-resolution
problems for no real benefit. If the user wants an export/backup copy in Drive later,
that's a one-way app→Drive push, not sync.

## Source material — what already exists

The user has been writing this world in Google Drive as structured Markdown/Docs for a
while, and the format is already close to database-ready:

- One file per entity type: `Characters.md`, `Events.md`, `Locations.md` (others like
  Cultures/Items/Races/Languages may or may not exist yet — check before assuming).
- Each entity is a `##`/`###` header (e.g. `## SERO — THE TRAVELER`, `### Renmark`).
- Entities have a `Status:` line — values seen so far: `✓ Locked`, `~ Needs a name`,
  `~ In development`, `? Open`. Anything not `✓ Locked` is effectively a placeholder
  already — v1.0 should treat these as first-class "incomplete" entities, not errors.
- Fields under each entity are loose but consistent-ish: labeled lines like
  `Origin:`, `Personality:`, `What happened:`, `Why it happened:`.
- Cross-references use wiki-link syntax: `[[Locations#Renmark|Renmark]]`,
  `[[Characters#Nyneave|Nyneave]]`. These are the relationship graph — parse them.
- `Events.md` follows an especially clean template: `Age | Location | Characters
  involved`, then `What happened / Why it happened / What it caused / What Sero
  learned`. This maps almost directly to the `events` table below.
- **Known issue:** duplicate/stale copies of these files exist across multiple Drive
  folders (at least 3 seen: a "Traveler" folder, a "THE_TRAVELER" folder, and an older
  working folder). Phase 0 must resolve this before any ingestion, or the parser will
  ingest conflicting facts.

## Phase 0 — Canonicalize the source (one-time import prep)

- [ ] Note: there isn't a large volume of existing material in Drive, so this import is
      light — the app becomes the primary writing space going forward, not a viewer for
      a large existing archive.
- [ ] Pick ONE Drive folder as the canonical source for the initial import. Move/
      consolidate the latest version of each file there; archive the rest (don't
      delete yet — just get them out of the import path).
- [ ] Confirm the full set of entity-type files that should exist (Characters,
      Locations, Events, and whichever of Cultures/Races/Languages/Items/Artifacts
      the user has started). Create empty stub files for any category the user wants
      tracked but hasn't started yet.
- [ ] Agree on the field-label vocabulary per entity type (it doesn't need to be rigid,
      but the parser needs to know what labels to expect, e.g. `Status:`, `Origin:`,
      `Significance:`).

## Phase 1 — Data model (Postgres via Neon + Drizzle ORM)

**Not Supabase.** Use [Neon](https://neon.tech) (serverless Postgres, one-click Vercel
marketplace integration, generous free tier, owned by Databricks as of 2025) with
[Drizzle ORM](https://orm.drizzle.team) for schema/queries. This gives the same
Postgres + `jsonb` capability the schema below needs, without Supabase's bundled
auth/storage/realtime layer this project doesn't use. `drizzle-kit` handles migrations.

```sql
entities
  id            uuid pk
  type          text        -- 'character' | 'location' | 'event' | 'item' | 'culture'
                             -- | 'race' | 'language' | 'artifact'
  name          text
  slug          text unique
  status        text        -- 'locked' | 'in_development' | 'needs_name' | 'placeholder'
  fields        jsonb        -- free-form label -> value, from parsed markdown
  gap_prompt    text null    -- only set when status = 'placeholder' (see Phase 3.5)
  source_doc_id text         -- which source file this came from, for round-tripping

events
  id                uuid pk
  title             text
  year_label        text     -- "Age ~350-400" (display text; ranges/approximations OK)
  sort_order        numeric  -- numeric position on the timeline axis (in "Sero years")
  location_id       uuid fk -> entities
  what_happened     text
  why_it_happened   text
  what_it_caused    text
  what_was_learned  text
  draft_text        text null  -- freeform scene/notes written in-app for this event
  updated_at        timestamptz

event_links            -- many-to-many: which entities are involved in which events
  event_id    uuid fk -> events
  entity_id   uuid fk -> entities
  role        text null   -- optional: 'protagonist', 'location', 'item_involved', etc.

relationships           -- non-event connections, derived from [[wiki-links]]
  entity_id_a  uuid fk -> entities
  entity_id_b  uuid fk -> entities
  label        text null  -- optional context, e.g. "trained by"
```

Design notes:
- `event_links` is the piece that makes "show me every event involving X" work —
  this is the whole point of the timeline-filtering feature. Don't skip it or fold it
  into a simpler structure.
- `status = 'placeholder'` entities are real rows, not a separate table — they show up
  in normal entity lists (clearly marked) and can be filled in later without migrating
  data.
- `sort_order` is what actually moves when the user drags an event on the timeline —
  it's independent of `year_label` so a drag doesn't have to force a clean number onto
  an intentionally vague label like "Age ~150-350." After a drag, prompt the user to
  optionally update `year_label` to match; don't auto-rewrite their wording.
- `draft_text` is the "write it in the app" field — an event can exist purely as
  metadata (title + Age, no prose yet) or carry the actual scene notes. Either way, as
  soon as `sort_order`/`year_label` is set, it shows up on the timeline.

## Phase 2 — Ingestion pipeline

- [ ] Script pulls the canonical docs from Drive — reuse the same Drive→GitHub Apps
      Script pattern the user already built for their other content pipeline; it's the
      same auth and pull mechanism, just pointed at this folder instead.
- [ ] Parser splits each file on `##`/`###` headers → one entity per header.
- [ ] Parser reads labeled lines (`Status:`, `Origin:`, etc.) into `fields` (jsonb).
- [ ] Parser extracts every `[[Type#Name|Label]]` into a `relationships` row — use
      [`remark-wiki-link`](https://www.npmjs.com/package/remark-wiki-link) (or the
      `@portaljs` fork, which explicitly supports the `[[Page|Alias]]` syntax already
      in use) rather than hand-rolling a regex parser for this.
- [ ] `Events.md` gets a dedicated parse path since its template is stricter — extract
      Age/Location/Characters directly into `events` + `event_links`.
- [ ] Any entity whose `Status:` isn't `✓ Locked` gets `status` set accordingly; if it's
      clearly a stub (e.g. "Needs a name"), also generate a first-pass `gap_prompt`
      (see Phase 3.5 — same generation logic applies whether the placeholder came from
      existing docs or was created live in the app).
- [ ] Re-running ingestion should upsert, not duplicate — key on `source_doc_id` +
      header text or a stable slug.

## Phase 3 — Frontend (Next.js, deploy on Vercel)

- [ ] Index page per entity type (Characters, Locations, Events, Cultures, Races,
      Languages, Items, Artifacts) — simple list/grid, placeholders visually flagged.
      Each has an "Add new" action.
- [ ] Entity detail page: rendered fields, list of linked entities, and a mini timeline
      strip showing just this entity's events (via `event_links`). Fully editable
      in-place — add/edit/remove fields, add/remove relationships to other entities.
- [ ] Event detail/edit view: edit title, Age/year_label, location, linked characters,
      the four structured fields, and the freeform `draft_text` scene notes. Saving
      with a year_label/sort_order set is what makes it appear on the timeline —
      no separate publish step.
- [ ] Full delete support for entities and events, with a confirmation step (this is a
      personal creative tool, but accidental deletes of locked canon should still be
      hard to do by accident).

**Timeline view — sidebar filtering and multi-entity convergence**

This is the centerpiece feature, so it gets its own detail:

- [ ] Left sidebar: a persistent, searchable, multi-select filter across **all** entity
      types at once — not "pick a type, then pick one entity." The user can toggle on
      any combination simultaneously (e.g. two characters + one artifact together).
- [ ] Zero or one entity selected → today's single-line timeline, all events (or that
      one entity's events) plotted by `sort_order`.
- [ ] Two or more entities selected → switch to a **multi-lane view**: one horizontal
      lane per selected entity, positioned chronologically. At any event whose
      `event_links` include two or more of the currently-selected entities, their lanes
      visually converge into a single point at that moment on the timeline, then
      separate again afterward if their paths diverge. Example: select two characters
      and an artifact — their three lanes run independently until the theft event that
      links all three, where they braid together at that point, then split again.
- [ ] The query underneath this is straightforward given the existing schema: for the
      selected entity IDs, pull every event where `event_links` contains any of them
      (to draw each lane), and flag events where it contains 2+ of them (convergence
      points) — no schema changes needed, this is a query/rendering feature on top of
      what Phase 1 already models.
- [ ] Clicking a convergence point opens that event's detail (same event page as
      elsewhere in the app).
- [ ] **Build note — this is the one real find of the research pass:**
      [`iStoryline.js`](https://github.com/remaerd/iStoryline.js) (npm:
      `i-storyline-js`) is an existing, MIT-licensed JS library built specifically for
      this — it computes storyline/braided-convergence layouts from character/scene
      data (the academic lineage is the StoryFlow/iStoryline research papers on
      narrative visualization). It takes a story script (characters + scenes) and
      returns computed line paths, leaving you to render them with your own SVG/canvas.
      This turns the hardest part of this feature — the convergence layout math —
      from a custom build into a data-mapping problem: transform `entities` +
      `event_links` into the shape it expects, feed it in, render its output. Try this
      before reaching for a fully custom D3 renderer; fall back to hand-rolled D3 only
      if its layout model doesn't fit once you're actually integrating it.
- [ ] Drag-to-reschedule (see below) should still work in multi-lane mode — dragging a
      convergence point moves every entity involved in that event together.

- [ ] Timeline events are **draggable** — dragging an event to a new position updates
      its `sort_order` via an API call on drop (optimistic update in the UI, persist in
      the background). In single-line mode,
      [`react-calendar-timeline`](https://www.npmjs.com/package/react-calendar-timeline)
      is the better fit than raw `vis-timeline` here — it's React-native (props-based,
      not an imperative wrapper), actively maintained with a 2025 TypeScript rewrite,
      and has drag/resize/zoom and grouped "lanes" built in out of the box. In
      multi-lane convergence mode, drag is handled by whatever renders iStoryline's
      output (see above).
- [ ] Sidebar multi-select: don't build this from scratch either —
      [`shadcn-multi-select-component`](https://github.com/sersavan/shadcn-multi-select-component)
      is a copy-paste shadcn/ui component with grouped options (group by entity type),
      search, and multi-level filtering already built — close to exactly what the
      sidebar needs with just data wiring.
- [ ] Any `[[wiki-link]]`-derived relationship rendered in body text becomes a real
      in-app hyperlink automatically (this replaces the raw `[[...]]` syntax at render
      time — don't show it raw to the user).

## Phase 3.5 — Creative-assist layer (core v1.0 feature)

**Placeholder / stub flow**
- [ ] When creating or editing an entity/event and referencing something that doesn't
      exist yet (a culture, a place, an item), the app can create a stub entity inline
      rather than blocking — `status = 'placeholder'`.
- [ ] On stub creation, auto-generate a `gap_prompt`: a short, specific note of what
      needs deciding, derived from the context it was mentioned in. Example: creating
      a placeholder culture from "the culture that controls the Lost Archive site"
      should produce something like: *"Placeholder: culture controlling the Lost
      Archive site — needs: government type, relationship to the Asharan Empire, why
      they'd threaten/destroy the archive."*
- [ ] A "Gaps" view lists every placeholder entity with its prompt, so they can be
      resolved in a batch later. This can absorb the user's existing "Gaps in Story and
      Worldbuilding" section from the Story Bible doc.

**Suggestion / brainstorm pane**
- [ ] From any entity or event page, a "Get suggestions" panel calls the Claude API
      with: the current entity/event's fields + everything linked to it via
      `relationships`/`event_links` (so suggestions respect established canon).
- [ ] System prompt must explicitly constrain output to options/questions, never
      finished narrative prose — e.g. "Suggest 2–3 possible reasons this could happen
      without contradicting the provided canon" or "Here's a tension this could create
      with [character]'s arc" — never "here's how the scene could go."
- [ ] Output renders as a list of discrete, selectable suggestions — user picks, edits,
      or discards; nothing is auto-inserted into any entity's fields without the user
      accepting it.

## Phase 4 — Export & compilation

**Single-page Markdown export**
- [ ] Every entity and event detail page gets an "Export as Markdown" action that
      downloads a `.md` file for that item alone.
- [ ] The export serializer mirrors the import format from Phase 2, in reverse:
      header + `Status:` line + labeled fields + relationships rendered back out as
      `[[Type#Name|Label]]` wiki-links. Import and export should share the same format
      spec so one round-trips into the other cleanly.
- [ ] File name derived from the entity/event slug.

**Compilations (chapters / ages)**
- [ ] New concept: a **compilation** — an ordered, user-curated set of events and/or
      entities, typed as `'age'`, `'chapter'`, or freeform. This is what lets the user
      assemble "Chapter 7" or "Age ~350-400" as an actual document rather than just a
      timeline filter.
- [ ] Schema:
      ```sql
      compilations
        id           uuid pk
        title        text        -- e.g. "Chapter 7: Vashten's Final Years"
        type         text        -- 'age' | 'chapter' | 'custom'
        description  text null

      compilation_items          -- ordered contents, mixed events and entities
        compilation_id  uuid fk -> compilations
        event_id        uuid fk -> events, null
        entity_id       uuid fk -> entities, null
        position        integer  -- manual order within the compilation
      ```
- [ ] On import (Phase 2), auto-generate one `type = 'age'` compilation per distinct
      `year_label` bucket as a starting point, pre-populated with that Age's events in
      chronological order — the user can then rename, reorder, add, or remove freely.
      This gives every existing Age a compilation for free without requiring the user
      to build chapters from scratch.
- [ ] Compilation detail page: ordered list of items, drag-to-reorder — use
      [`@dnd-kit`](https://dndkit.com) (`dnd-kit/sortable`), the current standard for
      React list reordering; `react-beautiful-dnd` is deprecated as of 2026. Add/remove
      items from anywhere in the app, rename/retitle.
- [ ] "Export compilation" produces a single combined `.md` file: each item's content
      in order under its own header — an event's `draft_text` if present, otherwise its
      structured What happened/Why/What it caused/What was learned fields; an entity's
      full field set if an entity is included directly. This is effectively a live,
      user-assembled version of the old "Consolidated Story Bible" doc, generated from
      current data instead of hand-copied. **No library needed for the concatenation
      itself** — it's just the single-page export serializer run per item and joined in
      order with header separators. `pandoc` is worth having available as an optional
      post-step if a compilation ever needs to become a PDF/EPUB later, but plain
      Markdown concatenation covers the v1.0 requirement.

## Available vs. custom — honest breakdown

| Piece | Source | Notes |
|---|---|---|
| Postgres hosting + ORM | **Available** — Neon + Drizzle | Managed service, one-click Vercel setup |
| Wiki-link parsing | **Available** — `remark-wiki-link` | Matches existing `[[Page\|Alias]]` syntax directly |
| Drive pull mechanism | **Reused** — your existing Apps Script pipeline | Same auth/pull pattern, new destination |
| Basic draggable timeline | **Available** — `react-calendar-timeline` | Drag/resize/zoom/lanes out of the box |
| Sidebar multi-select filter | **Available** — `shadcn-multi-select-component` | Copy-paste shadcn component, grouping built in |
| List reordering (compilations) | **Available** — `dnd-kit/sortable` | Current standard, accessible |
| Multi-lane convergence layout | **Available, needs integration** — `iStoryline.js` | Layout math is done; wiring your data model in and rendering its output is custom |
| Entity/event schema & CRUD | **Custom** | This is your specific data model — no shortcut here |
| Markdown export serializer | **Custom, simple** | Mirrors the import format; small, well-defined |
| Compilation concatenation | **Custom, trivial** | String-join of already-serialized markdown |
| AI suggestion pane | **Custom** | Direct Claude API call + prompt design, no library needed |
| Placeholder/gap-prompt generation | **Custom** | Small, specific to this app's flow |

**Existing full worldbuilding apps (Kanka, Fantasia Archive)** were also checked —
Kanka is the closest open-source match (GPLv3, self-hostable, strong cross-linking) but
it's PHP/Laravel; Fantasia Archive is open-source too but a downloadable Electron app.
Neither shares a stack with this build, so there's no code to lift directly — worth a
skim for entity-taxonomy ideas, but not a source of reusable components here.

**Rough overall split:** the data layer, the timeline drag interaction, the wiki-link
parsing, and the sidebar filter are all real, maintained, off-the-shelf pieces —
genuinely more "wire it up" than "write it." The convergence timeline gets a major
head start from iStoryline.js but still needs real integration work. What's fully
custom is comparatively small: the entity/event schema itself (because it's your
world), the export/compilation glue (simple, but nobody else has this exact format to
reuse), and the AI suggestion layer (a prompt, not an algorithm). Nothing in this plan
requires inventing an algorithm from scratch anymore — the one piece that looked like
it might (convergence layout) turned out to already exist.

## Phase 5 — Polish

- [ ] Basic search across entities.
- [ ] Deploy to Vercel.
- [ ] Optional: re-sync button to re-pull from the canonical Drive source on demand
      (one-time import only — see Editing model above).

## Explicitly out of scope for v1.0

- No auth/multi-user support.
- No AI-generated prose insertion anywhere — suggestions and gap prompts only.
- No ongoing two-way Drive sync. Drive import is one-time (Phase 0/2); after that, the
  app's database is the source of truth and Drive docs are no longer kept in sync.

## Suggested session breakdown

1. Phase 0 (canonicalize) + Phase 1 (schema) — mostly manual/config work, one session.
2. Phase 2 (parser/ingestion, one-time import) — one session, test against real
   Characters.md/Events.md.
3. Phase 3 (entity pages + CRUD forms) — one session.
4. Phase 3 continued (basic single-line draggable timeline) — one session.
5. Phase 3 continued (sidebar multi-select + multi-lane convergence view) — one
   session, likely the hardest single piece in v1.0 given the custom rendering.
6. Phase 3.5 (placeholders + suggestion pane) — one session.
7. Phase 4 (single-page export + compilations) — one session.
8. Phase 5 (polish/deploy) — one session.
