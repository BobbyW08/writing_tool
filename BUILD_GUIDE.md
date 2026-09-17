# BUILD_GUIDE.md — working log for building The Traveler

This is the session-to-session memory for building this app. Read this before
`traveler-wiki-build-plan.md` on every new session — this file says where things actually
stand; the plan file says what the finished feature should look like. Update the "Current
state" and "Next up" sections at the end of every session so the next session doesn't
re-derive any of this.

---

## Current state (as of 2026-09-17)

**Phase 0 (canonicalize), Phase 1 (schema), Phase 2 (ingestion) — done.**
**Phase 3 (frontend) — entity/event CRUD done, timeline views not started.**

- Git initialized, `npm run build` confirmed clean (the flagged React 19 peer-dep warning
  on `react-calendar-timeline`'s `create-react-context` sub-dependency is cosmetic — it
  prefers native `React.createContext`, which React 19 has, so the incompatible legacy
  code path never runs).
- `.env` has real `DATABASE_URL` and `AI_GATEWAY_API_KEY`, both confirmed readable.
- Phase 1 schema is live on the real Neon database. Since the original migration, two
  more columns/constraints were added (see "Schema changes since Phase 1" below) — run
  `npm run db:migrate` if you're picking this up on a machine that hasn't pulled the
  latest `drizzle/` migrations yet.
- **Ingestion is done and verified.** `npm run ingest` (`scripts/ingest.ts`) parses
  `source-docs/canonical/Characters.md`, `Locations.md`, `Events.md`, and `Timeline.md`
  and upserts into the DB. Current counts: 47 entities (36 characters, 11 locations), 113
  events (38 from `Events.md`'s detailed entries + 75 one-liners from `Timeline.md`'s ERA
  tables that have no `Events.md` counterpart), 36 `event_links`, 4 `relationships`. Fully
  idempotent — reran 5+ times this session with identical results, no duplicates.
  - `Timeline.md` and `Working-Doc.md` are **not** ingested by the parser itself — see
    "Ingestion scope decisions" below for why, and how their useful content got in anyway.
- **Phase 3 CRUD is built and manually verified in-browser** (see "Phase 3 — what's
  built" below). `npm run dev` works; a dev server may already be running in the
  background from this session (check before starting another — port 3000).

---

## Ingestion scope decisions

- **`ideas/` folder**: not parsed as a structured source. It's ~90% restatement of
  `canonical/` in different words (different date notation: "Year X since conquest" vs.
  canonical's "Age X since birth", roughly +20 year offset). A handful of genuinely new
  facts were hand-merged directly into `canonical/Characters.md` and `Events.md` instead
  (Zen Buddhism touchstone, Sero's father Eron, Giana's uncle Menas, plague death toll
  ~25%, empire's peak territorial control 50–70%, ritual permanence). Two real
  contradictions were found and resolved with Bobby: collapse date is Age ~820 (not the
  ~1100 `ideas/` was internally inconsistent about), and the ritual **cannot** be
  transferred to anyone else (matches `Working-Doc.md`, not `Sero-Worldbuilding-Gap-Analysis.md`'s
  claim that it can). Bobby also dictated new canon on when Sero learns the ritual's
  effects — see the new "Giana's Death" and "The Ritual" event text in `Events.md`, plus
  a new undated "The Journal at Vashten's Home" row in Events.md's "Events to be
  developed" table (needs an exact Age and reconciling against "First Journey to Keth").
- **`Timeline.md`**: its ERA tables (`Age | Event | Status`) don't fit the
  `##`/`###`-header parser at all. Most rows duplicate `Events.md` content; ~75 rows don't
  (one-line beats like "25 — First witnessed execution..."). Bobby asked for those
  ingested as lightweight events. `lib/ingest/timelineEvents.ts` does this: skips rows
  whose `Status` column is `GAP`, skips rows that explicitly link to an `Events.md` entry
  (`[[Events#X]]`, tolerant of a missing/extra leading "The"), and skips rows whose
  Age + shared significant words match an existing `Events.md` title (age-exact +
  ≥1 shared word ≥4 chars, excluding stopwords). What's left becomes a minimal event:
  title = the row's own text, `year_label`/`sort_order` from the Age column, no
  `what_happened`/etc. structure. One dangling link surfaced and stayed unresolved on
  purpose: Timeline.md's Age ~540 row links to `[[Events#Assassination Attempt]]`, which
  doesn't exist in `Events.md` — it's still ingested (with just its own terse text), but
  flagged since nothing else describes that event. **Bobby may want to flesh this out
  into a full `Events.md` entry later.**
- **`Working-Doc.md`**: not ingested at all — it's Q&A prose + (irrelevantly) an old chat
  transcript about a Supabase/TanStack RPG-game prototype that has nothing to do with
  this app (out of scope per CLAUDE.md's stack rules; left in place, just never read by
  the parser). Its useful worldbuilding answers were manually folded into `Characters.md`
  and `Events.md` during the hand-merge pass above.
- **Two small reference tables in `Locations.md`** ("Regional Locations — To Be
  Developed", "Archive Network — Full Map") are also not ingested — same table-vs-header
  shape mismatch as `Timeline.md`, lower priority since deferred as a follow-up rather
  than asked for this session.
- **One known unresolved data issue**: `Events.md`'s "The Invasion" links to
  `[[Characters#Bard (The Traveler - Novel)]]`, which doesn't match any entity (only
  `Bard (Original)` exists). Almost certainly a typo for `Bard (Original)` — left
  unresolved rather than guess-fixed. Ingestion logs this as a warning every run.
- `Keth`, `Caldor`, and `Mossend` didn't have `Status:` lines in `Locations.md` (unlike
  every sibling location), so they weren't being ingested as entities even though
  `Events.md` links to them repeatedly. Added `**Status:** ✓ Locked` to each — a
  mechanical fix, not new lore.

## Schema changes since Phase 1

The original Phase 1 schema had no natural unique key on `events`, `event_links`, or
`relationships`, which would have caused the ingestion parser to duplicate rows on every
rerun (violates hard rule 7). Added, additively, in `drizzle/0001_thin_skullbuster.sql`:
- `events.slug` (unique) + `events.source_doc_id` — mirrors `entities`, used as the
  upsert key.
- Composite unique constraint on `event_links(event_id, entity_id)`.
- Composite unique constraint on `relationships(entity_id_a, entity_id_b)`.

## Phase 3 — what's built

Entity CRUD (`app/[entityType]/`) and event CRUD (`app/events/`), both fully wired to the
real DB via Server Actions (`lib/actions/entities.ts`, `lib/actions/events.ts`) and query
helpers (`lib/data/entities.ts`, `lib/data/events.ts`):
- Home page with per-type entity counts + event count.
- Entity type index pages (all 7 types: characters, locations, items, cultures, races,
  languages, artifacts), status-flagged, "Add new" link.
- Entity detail/edit page: name, status, free-form `fields` (dynamic key/value editor,
  `components/entity-fields-editor.tsx`), `gap_prompt` (shown when status ≠ locked),
  related entities (add/remove, backed by `relationships`), linked events (add/remove,
  backed by `event_links`, acts as the "mini timeline strip" the plan calls for), delete
  with confirmation dialog.
- Event detail/edit page: title, year_label, sort_order, location (select from
  location-type entities), the 4 structured fields, draft/notes, linked entities
  (add/remove), delete with confirmation.
- "Add new" flows for both entities and events.

All manually verified in-browser this session: create/edit/delete an entity, add/remove a
relationship, add/remove an event link, event edit/delete — all round-tripped through the
real DB correctly (confirmed via server logs and DB state, not just UI appearance).

**Bug fixed along the way**: `components.json` pre-existed but `shadcn init` was never
actually run, so `app/globals.css` never got shadcn's CSS theme variables
(`--background`, `--border`, etc.) — this made all Radix-based popovers/dialogs render
fully transparent (confirmed visually: the delete-confirmation `AlertDialog` had page
content bleeding through it). Fixed by hand-adding the standard shadcn neutral-theme CSS
block to `globals.css` (light + dark mode) and installing `tw-animate-css` (the Tailwind
v4-compatible animation package the components' `data-[state=...]` classes need). If you
add more shadcn components later, double check dialogs/popovers/selects actually render
opaque — this class of bug is easy to miss from a screenshot alone if you don't zoom in.

**Not built yet** (still Phase 3, per the plan):
- Single-line draggable timeline (`react-calendar-timeline`).
- Sidebar multi-select filter across all entity types
  (`shadcn-multi-select-component`).
- Multi-lane convergence view (`iStoryline.js` integration) — flagged in the plan as
  likely the hardest single piece.
- Wiki-link rendering: entity/event `fields`/`draft_text` text still contains raw
  `[[Type#Name|Label]]` syntax from ingestion (preserved verbatim for lossless Phase 4
  export round-tripping) — nothing yet renders it as an actual in-app hyperlink at
  display time (hard rule 8). Right now it just shows as literal bracket text in the
  Textareas. This needs a render-time transform before Phase 3 is really "done" — the
  stored text should stay raw; only the read view should link-ify it.

**Phase 3.5 / 4 / 5**: not started. Phase 3.5's gap data already exists (11 entities have
`gap_prompt`s from ingestion) but there's no "Gaps" view yet; no AI suggestion pane; no
export serializer; no compilations.

---

## Decisions already made (don't re-litigate these)

- Neon + Drizzle, not Supabase. No auth, single user, no multi-tenancy.
- Drive import is one-time. The app DB is now the source of truth. No two-way sync gets
  built, ever.
- `sort_order` (drag position) and `year_label` (display text) are separate fields on
  purpose — dragging never overwrites the label text. (Not yet exercised by any UI, since
  the draggable timeline isn't built, but both columns already exist and are populated.)
- Off-the-shelf libraries are pre-selected for: wiki-link parsing (`remark-wiki-link`,
  already used in ingestion), single-line timeline (`react-calendar-timeline`), multi-lane
  convergence layout (`i-storyline-js`), sidebar multi-select (copy the
  `shadcn-multi-select-component` repo, don't build from scratch), compilation reordering
  (`@dnd-kit/sortable`). Reach for a custom build only if integration genuinely fails.
- AI suggestion pane is Claude API (via Vercel AI Gateway) + prompt design only — no
  framework. It must never auto-insert output into a field, and the system prompt must
  forbid finished prose.
- The immortality ritual is permanent and cannot be transferred to anyone else (resolved
  contradiction, see "Ingestion scope decisions" above).
- Empire collapse / 4th ruler's assassination is Age ~820 (resolved contradiction).

---

## Next up (in order)

1. Render `[[Type#Name|Label]]` wiki-link syntax as real in-app hyperlinks in the entity
   fields / event text read views (hard rule 8) — currently shows raw bracket syntax.
2. Single-line draggable timeline view (`react-calendar-timeline`), all events by
   `sort_order`, drag updates `sort_order` only (never `year_label` — hard rule 3).
3. Sidebar multi-select filter (`shadcn-multi-select-component`) across all entity types.
4. Multi-lane convergence view (`iStoryline.js`) for 2+ selected entities — the hardest
   single piece per the plan; try the library before falling back to custom D3.
5. Decide what to do with the two flagged data gaps: the dangling "Assassination Attempt"
   event (Age ~540, no full `Events.md` entry) and the "Bard (The Traveler - Novel)" typo
   in "The Invasion" (Events.md) — both currently just logged as ingestion warnings.
6. Phase 3.5: a "Gaps" view listing the 11 entities that already have `gap_prompt`s from
   ingestion; AI suggestion pane via Claude through the Vercel AI Gateway.
7. Phase 4: Markdown export serializer (must mirror the Phase 2 parser format exactly —
   hard rule 6); compilations feature.
8. Phase 5: search, deploy to Vercel, optional Drive re-sync button.

## Gotchas encountered this session

- Table rows in the source markdown can contain `[[Type#Name|Label]]` wiki-links, whose
  own `|` alias-divider breaks a naive `line.split("|")` table-cell parser. Both table
  parsers (`lib/ingest/events.ts`'s "to be developed" table, `lib/ingest/timelineEvents.ts`)
  use the bracket-aware `splitTableRow` helper in `lib/ingest/markdown.ts` — don't
  reintroduce a naive split if you touch either.
- Changing how `slugify()` derives a slug (e.g. the em-dash-subtitle-stripping fix for
  "SERO — THE TRAVELER" → matching inbound `[[Characters#Sero]]` links) orphans the old
  slug's row on the next `npm run ingest`, since `ON CONFLICT (slug)` no longer matches
  it — the old row survives as a duplicate under its stale slug. If you change slug
  derivation logic, check for and clean up orphaned rows afterward (query for entities
  whose current parse output no longer produces their stored slug).
- Source docs use CommonMark backslash-escaping around punctuation (e.g.
  `\[\[Locations\#Renmark|Renmark\]\]` instead of `[[Locations#Renmark|Renmark]]`) —
  `lib/ingest/markdown.ts`'s `unescapeMarkdown()` handles this; anything parsing these
  files needs to run through it first or wiki-links won't tokenize.
- `tsx` (and Node generally) doesn't auto-load `.env` the way Next.js dev/build does —
  `npm run ingest` already has `--env-file=.env` wired into its `package.json` script
  definition, but any other one-off DB script needs `npx tsx --env-file=.env <script>.ts`
  explicitly.
- A Next.js dev server started *before* `npm install <new-shadcn-dependency>` won't see
  the new package even after the file that imports it is saved — Turbopack needs a full
  process restart (not just HMR) to pick up newly-installed node_modules. If you see a
  "Can't resolve '<package>'" error right after `npx shadcn add` or a fresh `npm install`,
  kill and restart `npm run dev` rather than debugging the import.
- The Claude-in-Chrome browser tab occasionally froze mid-session (screenshot/read calls
  timing out) for reasons unrelated to the app — opening a fresh tab each time
  unstuck it. Not a code issue; don't chase it if it recurs, just cycle the tab.
