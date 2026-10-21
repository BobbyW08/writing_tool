# CLAUDE.md: The Traveler, Story Wiki and Timeline

## What this is
A personal, single-user writing tool for "The Traveler" story universe. Everything is written
and stored in Payload CMS: characters, locations, events, items, factions and cultures, races,
languages, lore, story ideas, and the writing itself. Every record has a permanent ID code
(C10, L4, E27, S12) and those codes are how entries are referenced in text, notes and prompts.
All creating, editing and writing happens in the frontend, in place, with no separate edit mode. The Payload admin is the fallback back office. The frontend also adds the views the admin cannot: a world tree
with an infobox on every entry, a timeline with eras and lanes, image maps with pins, chronicles
(timeline plus maps), node maps, family and causality trees, whiteboards, interactive tables, a
writing studio, and relationship views. A backend link index records every connection between
every record, and every view reads from it. The tool also acts as a lightweight creative assistant
(suggestions, a prompts menu, placeholder and gap tracking, a continuity check on new writing),
and all AI runs on Claude. It never writes narrative prose for the user.

Full plan, collection specs, link index spec, migration steps, phases and the master build order:
`traveler-wiki-build-plan.md` (v3). Writing Studio, AI layer and canon check:
`docs/PLAN_WRITING_AND_AI.md`. Working log and current state: `BUILD_GUIDE.md`. Read all three
before starting a phase or step. This file is the quick-reference and hard-rules layer on top of
them, not a replacement.

**This is not:** a ghostwriter, a project/task manager, or a multi-user product. One user.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router, on a patched 16.x release that the installed Payload version supports |
| Writing surface and data | Payload CMS 3.x (stable), Lexical rich text editor, Local API for all frontend reads and writes |
| Database | Postgres on Neon, in a database used only by Payload (`PAYLOAD_DATABASE_URL`) |
| Starter collections | `payload-starter/` (its `src/` folders were copied to the repo root in Phase 1) |
| ID codes | `lib/codes.ts`, assigned by the `assignCode` hook, counters in the hidden `counters` collection |
| Link index | `links` collection and `lib/graph/` (step G1). Every connection between records. Derived and rebuildable |
| Node and edge shape | `lib/graph/types.ts`. The one shape every visual feature uses |
| Media | `media` upload collection, `sharp` for sizes |
| Timeline (single-line) | `react-calendar-timeline` pinned at `0.30.0-beta.19` |
| Timeline (multi-lane convergence) | `iStoryline.js` (npm `i-storyline-js`) for layout math, custom SVG render |
| Node map, trees and relationship views | React Flow (`@xyflow/react`) |
| Image maps with pins | One library, chosen by the step W3 spike and recorded in this row |
| Whiteboards | One library, chosen by the step W5 spike and recorded in this row |
| Table grid | One library, chosen by the step W6 spike and recorded in this row |
| Sidebar multi-select | `shadcn-multi-select-component` (copy-paste shadcn) |
| Compilation reordering | `dnd-kit` (`@dnd-kit/sortable`) |
| Wiki-link parsing | `remark-wiki-link`, used only by the one-time migration and the Markdown export |
| AI | All AI runs on Claude: the `ai` package through Vercel AI Gateway, plain `anthropic/...` model strings, behind one module (`lib/ai/`). Covers suggestions, the prompts menu and the continuity check |
| Deployment | Vercel |

## Route layout
- `app/(payload)/` holds the Payload admin (`/admin`) and API (`/api`). This is the fallback back office; routine work happens in the frontend.
- `app/(app)/` holds the frontend views: home, world tree and read pages for entries, the writing
  studio (`/write`), timeline, maps, chronicles, node map, trees, boards, tables, continuity inbox,
  link health.
- Frontend code reads and writes through the Payload Local API (`getPayload({ config })`), never
  through a second data layer. Connections between records come from the link index.

---

## ID codes

| Prefix | Collection slug | What it is |
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
| D | `boards` | Saved node maps, trees, story maps and whiteboards (step W5) |
| N | `tables` | Interactive tables (step W6) |
| A | `compilations` | Reserved for Phase 7 |
| X | `relationships` | A link between two entries |
| Q | `continuity-flags` | A continuity question or notice |
| T | `tags` | A tag (UNK is built in, and so is AI suggested) |

The user types a code (C10) in his writing. Anything that reads his text should resolve codes
through `extractCodes()` in `lib/codes.ts` and `GET /api/codes/:code`. Step G1 adds the new prefix
letters to the code pattern. A code with no record renders as plain text, never as a broken link.

---

## Hard rules, never broken

1. **No AI-generated prose insertion, anywhere.** The suggestion pane returns options, questions,
   or tensions, never a written scene. Nothing is auto-inserted into any entry field without the
   user explicitly accepting it.
   The one automatic write is the writing continuity check (`lib/continuity/`). When a piece of
   writing is saved, details Bobby wrote that are not in canon yet are added to entry details as
   **verbatim quotes of his own text**, and a named place or character that was never logged gets
   a new `in_development` record built the same way. Every quote is verified word for word against
   the writing before it is stored, the model never writes any field text, and each automatic
   addition shows up in the Continuity inbox with an Undo. A record created this way is tagged
   `UNK`. Anything that contradicts canon is never applied without his explicit decision.
2. **Payload is the only source of truth.** The move from the old database and the story catalog
   import are one-time migrations. No two-way sync is ever built. An optional one-way export or
   backup is fine later.
3. **`startYear` and `yearLabel` are independent.** Year 0 is the year SERO is born, and prequels
   use negative years. Dragging an event on the timeline updates `startYear` only. Never rewrite
   a vague `yearLabel` (for example "Age ~150-350") from a drag. Prompt the user instead.
4. **Placeholders are first-class records, not errors.** Any entry with `status` other than
   `locked` (`in_development`, `needs_name`, `placeholder`) is a normal row, visually flagged.
   Creating a stub must generate a `gapPrompt`.
5. **An event's `involves` list is required machinery, not optional.** "Every event involving X",
   the timeline filter, and the convergence view all depend on it. Never flatten it.
6. **Codes are permanent.** Assigned automatically on create, never edited, never reused, never
   changed by a rename or a delete. Do not build any feature that renumbers records.
7. **Payload gets its own database.** By default Payload drops tables it does not know about. Never
   point it at a database that holds other data, and back up before any schema change. Use
   migrations, not dev auto-push, once real writing lives in the database.
8. **Imports upsert, never duplicate.** Key on `legacyId` or `sourceDocId` plus the code. Re-running
   any import or migration script must produce identical results.
9. **Codes render as links, raw link syntax is never shown.** In read views, an ID code in text
   renders as a real link showing the entry's name. The old `[[Type#Name|Label]]` syntax exists only
   in the legacy data and is converted during the migration.
10. **Try the off-the-shelf library before hand-rolling.** The stack table above is the pre-selected
    list. Fall back to a custom build only if integration genuinely does not fit.
11. **`npm run build` must pass with zero errors before every commit.**
12. **Admin access.** `autoLogin` is for local development only. A deployed copy keeps a real
    single-user login.
13. **UNK means "double check this".** Any record, link or piece of writing can carry tags. Whenever
    Claude, an import, or the migration fills something in on a best guess (a matched name, a guessed
    era or format, a rewritten link, an auto-created record), it applies its best tags, adds the
    `UNK` tag, and writes what to verify in the record's `reviewNote`. Never leave a guess untagged.
    Only the user removes `UNK`, after he confirms. `GET /api/unk` returns the review queue.
14. **The link index is derived, and every connection goes through it.** `links` is kept in step
    with the records by sync hooks and rebuilt by `scripts/rebuild-links.ts`. Never edit it by hand
    and never treat it as canon. Views, trees and the AI read connections from it, not by
    hand-querying relationship fields. A new relationship field or a new collection is not finished
    until its edges are added to `lib/graph/extract.ts`.
15. **One node shape and one edge shape.** Every visual feature uses `Graph` from
    `lib/graph/types.ts`. No view defines its own. Layout positions belong to a board, never to the
    record being drawn.
16. **Map coordinates are pixels on the map's base image, origin at the top left.** Never store
    screen positions or zoom-dependent values.
17. **The look and the wording are our own.** World Anvil is a behavior reference only. Never reuse
    its code, artwork, icons, names or prompt text.

---

## Data model
Collections are defined in `collections/` (copied from `payload-starter/`). Those files are the
source of truth and are kept in sync with the collection tables in `traveler-wiki-build-plan.md`.
Collections marked new in that plan have no code yet, and their field lists there are the spec.
The link index and the node and edge shape are specified in the same plan ("Link index"). Do not
duplicate field lists here.

---

## Session start protocol
1. Read this file.
2. Read `traveler-wiki-build-plan.md` for the current phase or step, including "Build order".
3. Read `BUILD_GUIDE.md` (working log: current state, decisions made, what is next).
4. If the step is labeled S, read `docs/PLAN_WRITING_AND_AI.md`. If a handoff file is named, read it fully.
5. State the current phase or step and sub-task before writing code.

## Session end protocol
1. Update `BUILD_GUIDE.md` with what was done and what is next.
2. Run `npm run build`, zero errors.
3. Re-check the hard rules above against anything touched this session.
4. If a relationship field or collection changed, confirm its edges are in the link index
   (`scripts/rebuild-links.ts` dry run, once step G1 exists).

## When in doubt
`traveler-wiki-build-plan.md` is the source of truth for collections and phase scope. Do not invent
a different data model, and do not add auth or multi-user patterns. This app is intentionally
single-user.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
