# CLAUDE.md: The Traveler, Story Wiki and Timeline

## What this is
A personal, single-user writing tool for "The Traveler" story universe. Characters, locations,
events, items, factions, cultures, races, languages, lore, story ideas, and the prose itself are
all stored in a Neon Postgres database via Drizzle ORM. Every record has a permanent ID code
(C10, L4, E27, S12) and those codes are how entries are referenced in text, notes and prompts.
All creating, editing and writing happens in the frontend, in place, with no separate edit mode.
One shared password gates the whole app at the edge (hard rule 12), with no user accounts. The frontend adds the views that are hard to do in a table: a world tree
with an infobox on every entry, the Story Builder canvas, a timeline with eras and lanes, image maps with pins, chronicles,
node maps, family and causality trees, whiteboards, interactive tables, a writing studio, and
relationship views. A backend link index records every connection between every record, and every
view reads from it. The tool also acts as a lightweight creative assistant (suggestions, a prompts
menu, placeholder and gap tracking, a continuity check on new writing), and all AI runs on Claude.
It never writes narrative prose for the user.

The repo keeps exactly three instruction files: this one (hard rules), `next.md` (the next task),
and `traveler-wiki-build-plan.md` (v4: the full plan, table specs, link index spec, Writing Studio
and AI layer, Story Builder canvas, build order, progress checklist, working log, decisions and
error log). Read all three before starting a phase or step. This file is the quick-reference and
hard-rules layer on top of the plan, not a replacement. Never create any other guide, handoff,
status or session file.

**This is not:** a ghostwriter, a project/task manager, or a multi-user product. One user, one shared password, no accounts.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router |
| Data layer | Drizzle ORM (`drizzle-orm`), schema in `db/schema.ts`, client in `db/index.ts` as `appDb` |
| Database | Neon Postgres, pooled connection via `@neondatabase/serverless`, env var `APP_DATABASE_URL` |
| Editor | Lexical (`lexical@0.50.0`), `@lexical/react`, `@lexical/markdown`, `@lexical/rich-text`, `@lexical/list`, `@lexical/headless` |
| Writing body | Stored as Markdown in a `text` column. `lib/studio/lexical.ts` converts between Lexical JSON and Markdown server-side |
| ID codes | `lib/codes.ts`, counters persisted in the `counters` table (write functions in the data layer) |
| Link index | `links` table and `lib/graph/` (step G1). Every connection between records. Derived and rebuildable. Sync runs inside the data layer's write functions |
| Node and edge shape | `lib/graph/types.ts`. The one shape every visual feature uses |
| Media | `media` table, `sharp` for sizes |
| Timeline (single-line) | `react-calendar-timeline` pinned at `0.30.0-beta.19` |
| Timeline (multi-lane convergence) | `i-storyline-js` for layout math, custom SVG render |
| Node map, trees, relationship views and the Story Builder canvas | React Flow (`@xyflow/react`) |
| Image maps with pins | One library, chosen by the step W3 spike and recorded in this row |
| Whiteboards | One library, chosen by the step W5 spike and recorded in this row |
| Table grid | One library, chosen by the step W6 spike and recorded in this row |
| Sidebar multi-select | `shadcn-multi-select-component` (copy-paste shadcn) |
| Compilation reordering | `dnd-kit` (`@dnd-kit/sortable`) |
| AI | All AI runs on Claude: the `ai` package with `@ai-sdk/anthropic`, calling Anthropic directly with `ANTHROPIC_API_KEY`, behind one module (`lib/ai/`). Covers suggestions, the prompts menu and the continuity check |
| Deployment | Vercel |

## Route layout
- `app/(app)/` holds all frontend views: home, world tree and read pages for entries, the writing
  studio (`/write`), timeline, maps, chronicles, node map, trees, boards, tables, continuity inbox,
  link health.
- There is no admin route. A single shared-password gate (`proxy.ts` and `app/(auth)/login`, hard rule 12)
  sits in front of everything else. All reads and writes go through server components and server actions
  using `appDb`.
- Connections between records come from the link index.

---

## ID codes

| Prefix | Table slug | What it is |
|---|---|---|
| C | `characters` | Characters |
| L | `locations` | Locations |
| E | `events` | Events on the timeline |
| I | `items` | Items and artifacts |
| F | `factions` | Factions. Many factions can sit inside one culture |
| U | `cultures` | Cultures: a people and their way of life |
| R | `races` | Races |
| G | `languages` | Languages |
| K | `lore` | Lore entries |
| S | `stories` | Story ideas, and the finished stories they grow into |
| W | `writing` | Chapters, scenes, snippets (the prose) |
| B | `beats` | Planned story beats (step S5) |
| Y | `eras` | Spans of years on the timeline (step W2) |
| M | `maps` | Image maps (step W3) |
| P | `map-pins` | One marker, label, line, circle or polygon on a map (step W3) |
| H | `chronicles` | A timeline paired with maps (step W4) |
| D | `boards` | Saved node maps, trees, story maps, whiteboards (step W5) and Story Builder canvases (step SB) |
| N | `tables` | Interactive tables (step W6) |
| A | `compilations` | Reserved for Phase 7 |
| X | `relationships` | A link between two entries |
| Q | `continuity-flags` | A continuity question or notice |
| T | `tags` | A tag (UNK is built in, and so is AI suggested) |

A code can retire when an entry changes type. Retired codes live in `code_history` and still resolve.

The user types a code (C10) in his writing. Anything that reads his text should resolve codes
through `extractCodes()` in `lib/codes.ts` and `GET /api/codes/:code`. The code pattern takes every prefix in
the table above. A code with no record renders as plain text, never as a broken link.

---

## Hard rules, never broken

1. **No AI-generated prose insertion, anywhere.** The suggestion pane returns options, questions,
   or tensions, never a written scene, chapter, snippet or new paragraph. Nothing is auto-inserted
   into any entry field without the user explicitly accepting it. The one allowed form of AI text in
   writing is Review writing: a single suggested edit to a sentence Bobby already wrote (grammar,
   style, vocabulary, flow), shown as a before and after, in his voice, applied only when he accepts
   that one suggestion.
   The one automatic write is the writing continuity check (`lib/continuity/`). When a piece of
   writing is saved, details Bobby wrote that are not in canon yet are added to entry details as
   **verbatim quotes of his own text**, and a named place or character that was never logged gets
   a new `in_development` record built the same way. Every quote is verified word for word against
   the writing before it is stored, the model never writes any field text, and each automatic
   addition shows up in the Continuity inbox with an Undo. A record created this way is tagged
   `UNK`. Anything that contradicts canon is never applied without his explicit decision.
2. **`appDb` is the only source of truth.** The one-time moves into it (the old app database, the
   story catalog and the story bible) are migrations, never ongoing sync. Never point code at a
   stale `DATABASE_URL` for reads or writes.
3. **`startYear` and `yearLabel` are independent.** Year 0 is the year SERO is born, and prequels
   use negative years. Dragging an event on the timeline updates `startYear` only. Never rewrite
   a vague `yearLabel` (for example "Age 150-350") from a drag. Prompt the user instead.
4. **Placeholders are first-class records, not errors.** Any entry with `status` other than
   `locked` (`in_development`, `needs_name`, `placeholder`) is a normal row, visually flagged.
   Creating a stub must generate a `gapPrompt`.
5. **An event's `involves` list is required machinery, not optional.** "Every event involving X",
   the timeline filter, and the convergence view all depend on it. Never flatten it.
6. **A code is never edited in place and never reused.** Codes are assigned automatically on create
   (inside the data layer write function) and a rename or delete never changes one. The only way a
   code changes is a type change (`moveEntryAction` in `lib/world/move.ts`, the Change type button on
   an entry): the entry gets a new code in the new type, the old code is written to `code_history`
   and keeps resolving to the entry for good, and everything that pointed at it is repointed.
   Counters never go backwards. Do not build any feature that renumbers records in bulk. Anything
   that resolves a code must go through `currentCodes()` in `lib/codes-history.ts` first.
7. **`APP_DATABASE_URL` is the only database written to.** `DATABASE_URL` is the old v1 database,
   read-only and used only by `scripts/copy-from-payload.ts`. Never use it in any app code path.
8. **Imports upsert, never duplicate.** Key on `legacyId` or `sourceDocId` plus the code.
   Re-running any import or migration script must produce identical results.
9. **Codes render as links, raw link syntax is never shown.** Writing stores a mention as
   `[words as written](C4)`. In read views the link shows the words as written, a bare code shows the
   entry's name, and nobody types or searches by code. The old `[[Type#Name|Label]]` syntax exists
   only in the legacy data and is converted during the migration.
10. **Try the off-the-shelf library before hand-rolling.** The stack table above is the
    pre-selected list. Fall back to a custom build only if integration genuinely does not fit.
11. **`npm run build` must pass with zero errors before every commit.**
12. **One shared password gate, nothing more.** This is a personal single-user tool running on
    Vercel at a public URL, so it needs one lock on the front door, not real authentication.
    `proxy.ts` checks a `session` cookie against `APP_SECRET`. `/api/login` checks a submitted
    password against `APP_PASSWORD` and sets that cookie. No user accounts, no per-user sessions,
    no OAuth, no password reset flow, no admin UI. Do not grow this into real auth or reuse it for
    anything beyond gating the whole app at the edge.
13. **UNK means "double check this".** Any record, link or piece of writing can carry tags.
    Whenever the data layer, an import, or the migration fills something in on a best guess (a
    matched name, a guessed era or format, a rewritten link, an auto-created record), it applies
    its best tags, adds the `UNK` tag, and writes what to verify in the record's `reviewNote`.
    Never leave a guess untagged. Only the user removes `UNK`, after he confirms.
    `GET /api/unk` returns the review queue.
14. **The link index is derived, and every connection goes through it.** The `links` table is kept
    in step with the records by sync calls inside the data layer's write functions, and rebuilt by
    `scripts/rebuild-links.ts`. Never edit it by hand and never treat it as canon. Views, trees
    and the AI read connections from it, not by hand-querying relationship columns. A new
    relationship column or a new table is not finished until its edges are added to
    `lib/graph/extract.ts`.
15. **One node shape and one edge shape.** Every visual feature uses `Graph` from
    `lib/graph/types.ts`. No view defines its own. Layout positions belong to a board, never to
    the record being drawn.
16. **Map coordinates are pixels on the map's base image, origin at the top left.** Never store
    screen positions or zoom-dependent values.
17. **The look and the wording are our own.** World Anvil is a behavior reference only. Never
    reuse its code, artwork, icons, names or prompt text.
18. **Every Story Builder box is a record.** A typed box is saved as a beat (state `idea`), a dragged
    box is an existing entry. Horizontal position on the canvas is the record's year and is never
    stored. Vertical position, size and groups belong to the board (rule 15). Moving a box
    horizontally changes `startYear` or `endYear` only, never `yearLabel` (rule 3). Dates are whole years.
19. **A merge on the canvas writes nothing until Bobby picks what it means, and each merge can be
    undone.** Only a confirmed merge creates a relationship, through the data layer. Drawing or
    grouping on the canvas never creates links in the link index.
20. **Themes are questions, and each comes with its inverse.** A theme row stores its question, and a
    themed pair is linked by `inverseThemeId` on both rows. Pressure themes (Hunger, Restriction,
    Belonging) have no inverse. (Step AR.)
21. **Arc, theme and scope links are always optional and never block a save.** Missing links appear
    as flags in the coverage view only. They are never validation errors. (Step AR.)
22. **Only era, arc and story scales live in the `arcs` table.** A promoted beat is an event, and arc
    and theme links attach to events. Planned beats (the `beats` table) are linked when promoted.
    Motifs are entries of `type = 'motif'`, linked through the existing event links. (Step AR.)
23. **AI-proposed arc, theme or scope links apply only after the user accepts them.** This extends
    rule 1 to the story-architecture layer.
24. **Documentation is exactly three files:** `CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.
    Progress is checked off in the plan, and errors are logged in the plan's error log when found and
    again when fixed.

---

## Data model
Tables are defined in `db/schema.ts`. That file is the source of truth and is kept in sync with
the table listings in `traveler-wiki-build-plan.md`. Tables the plan marks as not built have no code
yet, and their field lists there are the spec. Step AR tables (`arcs`, `themes`, `event_arcs`,
`arc_themes`, `event_themes`, the `motif` entry type and `events.scope`) are specified in the plan and
are not in `db/schema.ts` until that step is built. Add them to the schema and migration together. The link index and the node and edge shape are
specified in the same plan ("Link index"). Do not duplicate field lists here.

All reads and writes go through `lib/world/queries.ts` (entity fetchers), `lib/world/actions.ts`
(server actions for CRUD), and the equivalent `lib/studio/` files for writing. Import `appDb`
from `db/index.ts`.

---

## Session start protocol
1. Read this file.
2. Read `traveler-wiki-build-plan.md` for the current phase or step, including "Build order".
3. Read `next.md` for the task to do now. Do only that task.
4. State the current phase or step and sub-task before writing code.

## Session end protocol
1. In `traveler-wiki-build-plan.md`: check off finished items, add anything learned to the working
   log, and log any error found or fixed in the error log.
2. Replace the contents of `next.md` with the instructions for whatever comes next.
3. Run `npm run build`, zero errors.
4. Re-read the changes and recheck the original instructions and the hard rules above, to confirm
   everything was followed.
5. If a relationship column or table changed, confirm its edges are in the link index
   (`scripts/rebuild-links.ts` dry run).

## When in doubt
`traveler-wiki-build-plan.md` is the source of truth for tables, the data model, and phase scope.
Do not invent a different data model, and do not grow the shared password gate into real auth or
multi-user patterns. This app is intentionally single-user.

# This is NOT the Next.js you know

This version has breaking changes -- APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` -- verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
