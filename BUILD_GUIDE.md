# BUILD_GUIDE.md: working log for building The Traveler

Session-to-session memory for this build. Read this before `traveler-wiki-build-plan.md` and
`docs/PLAN_WRITING_AND_AI.md` on every new session. This file says where things actually stand;
the plan says what the finished product looks like. Update "Current state" and "Next up" at the
end of every session.

---

## Current state (as of 2026-11-08)

**Phase 3 frontend complete. Payload stripped. Build passes zero errors. Awaiting Phase 3 closure and G1.**

The app now runs entirely on Drizzle ORM and Neon Postgres with no Payload dependency.
`appDb` (from `db/index.ts`, using `APP_DATABASE_URL`) is the only database connection in app
code. `db/schema.ts` is the source of truth for the schema.

Data counters (from migration): C=40, L=13, U=5, F=2, K=102, S=74, W=3. UNK queue: E2, E16,
E36 to E39, X1 to X4.

Build state:
- `npm run build` passes with zero TypeScript errors, all 21 routes rendered.
- Lexical packages installed explicitly: `lexical@0.50.0`, `@lexical/react`, `@lexical/markdown`,
  `@lexical/rich-text`, `@lexical/list`, `@lexical/headless` (all at `0.50.0`).
- Continuity pages (`/continuity`, `/continuity/[flagId]`), snippets pages, and
  continuity-related components are stubbed ("returns in Phase 4").

Data layer files:
- `lib/world/queries.ts` - all entity fetchers, using `appDb`
- `lib/world/actions.ts` - CRUD server actions (create, updateField, updateDetails, delete, relationships, tags)
- `lib/world/fields.ts` - field definitions per entity type driving create forms and edit UI
- `lib/studio/queries.ts` - writing record fetchers
- `lib/studio/actions.ts` - writing CRUD server actions
- `lib/studio/lexical.ts` - server-side Lexical to Markdown conversion (uses `@lexical/headless`)

Active routes under `app/(app)/`:
- `/` home hub
- `/[entityType]` list, `/[entityType]/new` create, `/[entityType]/[slug]` read/edit
- `/events`, `/events/new`, `/events/[slug]`
- `/stories`, `/stories/new`, `/stories/[code]`
- `/write`, `/write/[code]`
- `/timeline`
- `/continuity`, `/continuity/[flagId]` (stubbed)
- `/snippets`, `/snippets/new`, `/snippets/[id]` (stubbed)

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

1. **Phase 3 closure.** Run the Phase 3 browser checklist. Confirm all nav links load.
   The retire list from Part 7 is complete.
2. **G1, the link index.** Needed by every later view and by the AI.
3. **Phase 4.** Port the continuity check, then run the first real writing check.
4. **Phase 5, S3 and W2.** Filter, convergence view, node map, relationship view, story board,
   eras, lanes.
5. **S4 to S7.** AI foundation, Story Builder, Ask AI and the prompts menu, canon check extensions.
6. **W3 to W6.** Maps, chronicles, boards, interactive tables.
7. **Phases 6 to 8.** Gaps view, export, compilations, search, deploy.

Do not start G1 yet.

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
