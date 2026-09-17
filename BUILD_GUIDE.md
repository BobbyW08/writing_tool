# BUILD_GUIDE.md — working log for building The Traveler

This is the session-to-session memory for building this app. Read this before
`traveler-wiki-build-plan.md` on every new session — this file says where things actually
stand; the plan file says what the finished feature should look like. Update the "Current
state" and "Next up" sections at the end of every session so the next session doesn't
re-derive any of this.

---

## Current state (as of 2026-09-17)

**Phase 0 (canonicalize), Phase 1 (schema), Phase 2 (ingestion) — done.**
**Phase 3 (frontend) — entity/event CRUD done, wiki-link rendering done, single-line
draggable timeline done. Sidebar multi-select + multi-lane convergence not started.**

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
  - `Working-Doc.md` is **not** ingested by the parser at all — see "Ingestion scope
    decisions" below for why, and how its useful content got in anyway. `Timeline.md`
    *is* ingested (just its ERA tables' one-liners, via a separate small parser).
- **Phase 3 CRUD is built and manually verified in-browser** (see "Phase 3 — what's
  built" below). `npm run dev` works; a dev server may already be running in the
  background from this session (check before starting another — port 3000).
- **Wiki-link rendering (hard rule 8) is done.** `[[Type#Name|Label]]` syntax in stored
  `fields`/`draft_text` now renders as real clickable links in a read-only view mode;
  edit mode still shows the raw syntax (as it should — you're editing markdown-ish
  source). See "Phase 3 — what's built" below.
- **Single-line draggable timeline is done** (`/timeline`). Dragging updates `sort_order`
  only and prompts (via a toast) to optionally update `year_label` — never auto-rewrites
  it. **Important**: had to swap `react-calendar-timeline` from the pinned `^0.28.0` to
  the `0.30.0-beta.19` prerelease — see "react-calendar-timeline React 19 incompatibility"
  below, this is a real risk worth knowing about before touching that dependency again.

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

**Wiki-link rendering (hard rule 8)**: entity/event detail pages now default to a
read-only view (`components/view-edit-toggle.tsx`) where `[[Type#Name|Label]]` syntax in
`fields`/`draft_text` renders as a real `<Link>` via `components/wiki-text.tsx` +
`lib/wiki-resolve.ts`. Resolution is purely computed (slugify the link target the same
way ingestion does, look it up in a slug→route map built from all entities/events on the
page — no extra DB round-trip per link). Unresolved links (the one known "Bard (The
Traveler - Novel)" typo) just render as plain text instead of a broken link. Clicking
"Edit" swaps to the existing form, which still shows raw `[[...]]` syntax — that's
correct, the *stored* text stays raw for lossless Phase 4 export round-tripping; only the
read view link-ifies it.

**Single-line draggable timeline** (`app/timeline/page.tsx`, `components/timeline-view*`):
all events with a non-null `sort_order` render as draggable items on one lane; events
without one (currently 3: two "Various"-age catch-alls plus the new undated "Journal at
Vashten's Home") are listed separately below as "Not yet positioned." `sort_order` (an
abstract number, "Sero years") is mapped onto real calendar milliseconds
(`lib/timeline-scale.ts`, epoch = year 1 AD, 1 sort_order unit = 1 real year) purely so
`react-calendar-timeline`'s date-based layout/zoom engine can do the positioning math —
nothing about this is a real date, don't let `sort_order`'s Age-1-AD framing leak into any
UI copy. Dragging calls `updateEventSortOrderAction` (`lib/actions/events.ts`) — updates
`sort_order` only — and shows a `sonner` toast prompting to optionally update the
(unrelated, untouched) `year_label`, with a button that deep-links to the event's edit
page. Verified end-to-end: dragged a real event, confirmed via server logs the action
fired and only `sort_order` changed in the DB, then reverted the test drag.

**Not built yet** (still Phase 3, per the plan):
- Sidebar multi-select filter across all entity types (`shadcn-multi-select-component`) —
  the timeline currently shows *all* events with no per-entity filtering.
- Multi-lane convergence view (`iStoryline.js` integration) for 2+ selected entities —
  flagged in the plan as likely the hardest single piece; doesn't exist yet at all.
- The timeline's default zoom window is hand-tuned to ages ~(-5)–65 in
  `timeline-view-inner.tsx` (`defaultTimeStart`/`defaultTimeEnd`) — legible at that range,
  but nothing auto-adjusts it and zooming out to see the full ~2000-year span still
  renders one DOM tick per year (dense/slow; a real perf smell, not just visual). Worth
  a custom two-tier header (year + era/century) before this feels finished — the library
  supports custom headers (`TimelineHeaders`/`DateHeader`), just not wired up yet.

**Phase 3.5 / 4 / 5**: not started. Phase 3.5's gap data already exists (11 entities have
`gap_prompt`s from ingestion) but there's no "Gaps" view yet; no AI suggestion pane; no
export serializer; no compilations.

---

## react-calendar-timeline React 19 incompatibility — read before touching this dependency

The plan's stack table names `react-calendar-timeline` (pinned `^0.28.0` originally) and
claims it has "a 2025 TypeScript rewrite" and is React-19-safe. **That's wrong for the
`0.28.0` release actually on npm's `latest` tag.** `0.28.0` uses React's legacy
`childContextTypes`/`getChildContext` API, which React 19 removed outright (not
deprecated — gone). This isn't the same issue as the `create-react-context` peer-dep
warning noted earlier in this doc (that one really is harmless, since it prefers native
`React.createContext`) — this is the timeline library's *own* code, and it crashes
immediately on mount with "ReactCalendarTimeline uses the legacy childContextTypes API
which was removed in React 19," both during Next.js server-side prerendering **and**
client-side. The "2025 TypeScript rewrite" the plan is describing is real, but it's only
shipped under npm's `beta` dist-tag as a `0.30.0-beta.x` prerelease series (currently up
to `beta.19`), not under `latest`. That prerelease explicitly declares
`"react": "^18 || ^19"` in its `peerDependencies`, dropped `create-react-context`/`moment`
entirely (now uses `dayjs`), and ships its own TypeScript types (`@types/react-calendar-timeline`
is no longer needed and was removed).

**What's actually installed now**: `react-calendar-timeline@0.30.0-beta.19`, pinned exactly
(not `^0.30.0-beta.19` — betas don't follow semver-safe patch bumps the same way; bumping
to a newer beta should be a deliberate, tested choice, not an automatic `npm install`).
API differences from the `0.28.0` docs/types you'll find by googling: CSS moved from
`react-calendar-timeline/lib/Timeline.css` to `react-calendar-timeline/dist/style.css`;
`defaultTimeStart`/`defaultTimeEnd` are plain numbers (ms) now, not `Date`/`Moment`;
`keys`, `sidebarWidth`, `rightSidebarWidth`, `lineHeight`, `itemHeightRatio`, `minZoom`,
`maxZoom`, `stackItems`, `timeSteps` are typed as required props even though
`static defaultProps` still fills them at runtime — pass them explicitly to keep
TypeScript happy (see `components/timeline-view-inner.tsx` for values that work).

Also: this library **must** be loaded client-only. It measures its container and (even in
the beta) doesn't survive Next.js's server-side prerendering — wrap it in
`next/dynamic(() => import(...), { ssr: false })` (see `components/timeline-view.tsx`,
which does this and is the file to import from; `components/timeline-view-inner.tsx` is
the real implementation and should never be imported directly from a Server Component).

If a future upgrade attempt breaks again: the fallback is hand-rolling the single-line
view (positioned/draggable divs over a linear scale — genuinely not that much code given
`lib/timeline-scale.ts` already has the sort_order↔position math) rather than fighting
this dependency further. Hard rule 9 says try off-the-shelf first, but that's been tried
twice now (`0.28.0` stable, `0.30.0-beta.19` prerelease) — a third attempt should have a
specific reason to expect a different result.

## Decisions already made (don't re-litigate these)

- Neon + Drizzle, not Supabase. No auth, single user, no multi-tenancy.
- Drive import is one-time. The app DB is now the source of truth. No two-way sync gets
  built, ever.
- `sort_order` (drag position) and `year_label` (display text) are separate fields on
  purpose — dragging never overwrites the label text. Now live and verified on
  `/timeline`: dragging updates `sort_order` only and prompts (doesn't force) a
  `year_label` update via toast.
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

1. Sidebar multi-select filter (`shadcn-multi-select-component`) across all entity types —
   the timeline currently has no per-entity filtering at all.
2. Multi-lane convergence view (`iStoryline.js`) for 2+ selected entities — the hardest
   single piece per the plan; try the library before falling back to custom D3.
3. Timeline polish: a real two-tier header (year + era/century) instead of the single
   hand-tuned default zoom window — needed before the full ~2000-year range is usable
   without dense/slow one-tick-per-year rendering (see the react-calendar-timeline
   section above).
4. Decide what to do with the two flagged data gaps: the dangling "Assassination Attempt"
   event (Age ~540, no full `Events.md` entry) and the "Bard (The Traveler - Novel)" typo
   in "The Invasion" (Events.md) — both currently just logged as ingestion warnings.
5. Phase 3.5: a "Gaps" view listing the 11 entities that already have `gap_prompt`s from
   ingestion; AI suggestion pane via Claude through the Vercel AI Gateway.
6. Phase 4: Markdown export serializer (must mirror the Phase 2 parser format exactly —
   hard rule 6); compilations feature.
7. Phase 5: search, deploy to Vercel, optional Drive re-sync button.

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
  unstuck it. Not a code issue; don't chase it if it recurs, just cycle the tab. One
  specific case *was* real, though: a timeline default zoom window wide enough to render
  hundreds of per-year tick DOM nodes reliably made screenshot calls time out even in a
  fresh tab, while `get_page_text` still worked fine (proving the page itself wasn't
  hung) — if a screenshot times out repeatedly right after a page loads real content,
  suspect DOM size before assuming it's just the extension.
- `react-calendar-timeline`'s drag-to-move needs genuine gradual pointer movement to
  register with its underlying `interactjs` drag detection — a single fast
  `left_click_drag` from A to B gets interpreted as a canvas pan instead (no
  `onItemMove` fires). Several smaller sequential `left_click_drag` calls covering the
  same path work. A real user's mouse won't have this problem; it only matters for
  browser-automation testing.
