# BUILD_GUIDE.md — working log for building The Traveler

This is the session-to-session memory for building this app. Read this before
`traveler-wiki-build-plan.md` on every new session — this file says where things actually
stand; the plan file says what the finished feature should look like. Update the "Current
state" and "Next up" sections at the end of every session so the next session doesn't
re-derive any of this.

---

## Current state (as of 2026-10-16)

**Phase 0 (canonicalize), Phase 1 (schema), Phase 2 (ingestion) — done.**
**Phase 3 (frontend) — entity/event CRUD done, wiki-link rendering done, single-line
draggable timeline done (with click-to-zoom + sub-events + generic sub-items on top of
the original scope, added mid-session per Bobby's live feedback). Sidebar multi-select +
multi-lane convergence not started.**

**Phase 3.6 (snippets + continuity check) is built and verified offline. It has not been run
against the real Neon database or the real model yet.** Migration
`drizzle/0003_classy_lilandra.sql` is NOT applied: run `npm run db:migrate` first. See
"Phase 3.6: what's built" below.

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

**`drizzle/0002_early_krista_starr.sql`** (added mid-session, per Bobby's request for a
generic hierarchy): `entities.parent_entity_id` and `events.parent_event_id`, both
nullable self-referencing FKs, no unique constraint (an entity/event has at most one
parent, but nothing stops many children sharing one parent). Both additive, no data loss.
**If you add a delete path for entities or events anywhere else in the app, remember to
null out `parent_entity_id`/`parent_event_id` for that row's children first** — Postgres
will reject the delete with a FK violation otherwise. Hit this exact bug once already
(`deleteEntityAction` initially only handled `relationships`/`event_links`/`events.location_id`,
not entities parented under the one being deleted) — fixed, but it's an easy thing to
forget again if a new delete path gets added later (e.g. bulk delete, cascade-delete-children).

## Phase 3 — what's built

Entity CRUD (`app/[entityType]/`) and event CRUD (`app/events/`), both fully wired to the
real DB via Server Actions (`lib/actions/entities.ts`, `lib/actions/events.ts`) and query
helpers (`lib/data/entities.ts`, `lib/data/events.ts`):
- Home page with per-type entity counts + event count.
- Entity type index pages (all 7 types: characters, locations, items, cultures, races,
  languages, artifacts), status-flagged, "Add new" link.
- Entity detail/edit page: name, category (`type` — reassignable, see below), status,
  free-form `fields` (dynamic key/value editor, `components/entity-fields-editor.tsx`),
  `gap_prompt` (always visible, blank shown as blank — see "no hidden fields" below),
  sub-items (add/remove, backed by `parent_entity_id`), related entities (add/remove,
  backed by `relationships`), linked events (add/remove, backed by `event_links`, acts as
  the "mini timeline strip" the plan calls for), convert-to-event, delete with
  confirmation dialog.
- Event detail/edit page: title, year_label, sort_order, location (select from
  location-type entities), the 4 structured fields, draft/notes (all always visible,
  blank shown as blank), sub-events (add/remove, backed by `parent_event_id`), linked
  entities (add/remove), delete with confirmation.
- "Add new" flows for both entities and events.
- All entity/event/location pickers throughout the app are searchable comboboxes
  (`components/combobox.tsx`, shadcn `Command`+`Popover`) with a real scrollbar — not
  plain `<Select>`s. Typing filters by substring with prefix-matches ranked first (cmdk's
  default scoring — no custom filter logic needed, satisfies "type G, get things starting
  with G then containing G" as asked).

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
nothing about this is a real date. **The ruler only ever shows "Year N" (N = `sort_order`,
can be negative, starts conceptually at 0 for the story's own year 1)** via a custom
`TimelineHeaders`/`DateHeader` with `unit="year"` forced and a custom `labelFormat` —
real calendar month/day breakdowns never leak through regardless of zoom level, which is
what Bobby specifically asked for ("we can worry about ages... later, I want all
timelines to start at 0000"). Dragging calls `updateEventSortOrderAction`
(`lib/actions/events.ts`) — updates `sort_order` only — and shows a `sonner` toast
prompting to optionally update the (unrelated, untouched) `year_label`, with a button
that deep-links to the event's edit page.

**Click behavior**: single-click zooms the view to fit that event (and its direct
sub-events, if any, via `parent_event_id`) with ~20% padding; double-click navigates to
the event's page. This is real `react-calendar-timeline` behavior, not a custom
gesture — the library's own `selectItem` only fires `onItemClick` on a second click of an
*already-selected* item (confirmed by reading the bundled source,
`node_modules/react-calendar-timeline/dist/react-calendar-timeline.es.js`, search
`selectItem`); `onItemDoubleClick` fires unconditionally. **Testing note**: this session's
browser-automation tool could not reliably trigger the click/select gesture (confirmed via
console-log instrumentation that `onItemClick` never fired through synthetic
`left_click`), consistent with the drag-gesture quirk noted below — double-click was
verified working, and the click-to-zoom code path was verified by reading the library
source rather than by driving it through the automation tool. If you pick this up next
and want to be extra sure, just click an event twice yourself in a real browser.

Programmatic zoom (click-to-zoom, the "Reset view" button) discovered a real library
quirk worth knowing: **`visibleTimeStart`/`visibleTimeEnd` props are only read once, at
mount** — changing them on a later render does nothing. The only way to change the
visible range after mount is to call the component instance's own `updateScrollCanvas`
method directly via a ref (see `timelineRef` in `timeline-view-inner.tsx`) — the
library's public `ref` TypeScript type doesn't expose that method, so it's called through
a narrow local interface cast rather than the library's own (incomplete) ref type.

Also fixed: **ctrl/pinch-scroll-to-zoom was also scrolling the page behind the timeline**
— the library's own zoom handler doesn't call `preventDefault()` on the wheel event, and
React's `onWheel` is passive by default so calling it there is a no-op anyway. Fixed with
a native, non-passive `wheel` listener on the timeline's container div.

**Not built yet** (still Phase 3, per the plan):
- Sidebar multi-select filter across all entity types (`shadcn-multi-select-component`) —
  the timeline currently shows *all* events with no per-entity filtering.
- Multi-lane convergence view (`iStoryline.js` integration) for 2+ selected entities —
  flagged in the plan as likely the hardest single piece; doesn't exist yet at all.
- The timeline's default zoom window is hand-tuned to ages ~(-5)–65 in
  `timeline-view-inner.tsx` (`DEFAULT_START`/`DEFAULT_END`) — legible at that range, but
  nothing auto-adjusts it and zooming/panning out to see the full ~2000-year span still
  renders one DOM tick per year (dense; a real perf consideration, not just visual — this
  is what caused screenshot timeouts earlier in the session before the range was
  narrowed). A coarser secondary header tier (decade/century) for wide zoom would help,
  but Bobby didn't ask for it and it's not blocking.

## Sub-items / sub-events (generic hierarchy)

Added mid-session per explicit request ("items, locations, characters should all be able
to have sub items under them... events should be filled with sub-events"). One generic
self-referencing parent relationship each for `entities` (`parent_entity_id`) and
`events` (`parent_event_id`) — see "Schema changes" above. UI is the same
add/remove-via-searchable-combobox pattern as `relationships`/`event_links`: a "Sub-items"
section on every entity detail page, a "Sub-events" section on every event detail page,
plus a "Part of {parent}" line shown under the breadcrumb when the current entity/event
has a parent. `lib/actions/entities.ts`'s `addSubItemAction`/`removeSubItemAction` and
`lib/actions/events.ts`'s `addSubEventAction`/`removeSubEventAction` just set/null the
column — no cycle detection beyond preventing an item from being its own parent (fine for
a manually-curated single-user tool; if this ever becomes a problem, the fix is a
recursive CTE checking the target isn't already a descendant before allowing the
assignment). The timeline's click-to-zoom (above) is the main place sub-events currently
do anything visible beyond the two detail pages.

## Entity category (type) reassignment + entity→event conversion

Also added per explicit request ("I need a way to change each entity's overarching
category... we have story ideas in places, they should be in events"):
- **Type reassignment**: the entity edit form now has a "Category" select (all 7 types).
  `updateEntityAction` (`lib/actions/entities.ts`) accepts the new type, updates the row,
  and redirects to the new type's URL (`/{newUrlSlug}/{slug}`) since routes are
  per-type. Verified end-to-end with a throwaway test entity (item → location, confirmed
  URL/breadcrumb/sidebar all updated correctly).
- **Convert entity to event** (`components/convert-to-event-button.tsx`,
  `convertEntityToEventAction`): for the case where something was ingested/created as an
  entity but is really an event. One-way, confirmed via the same `AlertDialog` pattern as
  delete. Creates a new event (title = entity name, `draft_text` = the entity's
  `gap_prompt` + serialized `fields`, since events have no free-form jsonb field to fold
  them into directly), then deletes the original entity. Relationships and event_links
  pointing at the old entity are dropped — flagged clearly in the confirmation dialog
  since there's no way to carry an entity-to-entity relationship over onto an event.
  Verified end-to-end with a throwaway test item.

## No hidden fields

Explicit request: "allow me to just create an entity and assign all of those fields
necessary, so they should all be editable for everyone. also, no hidden fields. if they
are blank, show them as blank." Concretely, this meant: `gap_prompt` was previously only
shown/editable when `status !== "locked"` — a real conditionally-hidden field. Removed
that conditional everywhere (`EntityReadView`, the entity edit form) — `gap_prompt` is
now always shown, blank rendered as an italic "(blank)" rather than the field
disappearing. Same treatment applied to `EventReadView`'s four structured fields and
`draft_text` (previously each silently rendered nothing if empty — now always shows the
label with "(blank)"). Also surfaced `source_doc_id` on both entity and event read views
(was a real column with no UI anywhere before this) as a read-only "Source doc" line,
showing "(created in-app)" for anything not from ingestion.

**Phase 3.5 / 4 / 5**: not started. Phase 3.5's gap data already exists (11 entities have
`gap_prompt`s from ingestion) but there's no "Gaps" view yet; no AI suggestion pane; no
export serializer; no compilations.

---

## Phase 3.6: what's built

Snippet intake and continuity check, specified in `traveler-wiki-build-plan.md` (Phase 3.6).
Bobby writes a snippet (`/snippets/new`), it is read against canon, and he is prompted to
decide anything that conflicts. Every snippet either confirms the lore or adds to it.

**How a check runs.** `createSnippetAction` saves the snippet, `claimCheck` marks it
`checking` (refuses if a check is already running; a check stuck for 10 minutes counts as
dead), and `after()` runs `runContinuityCheck` once the response is sent. The snippet page
polls every 3 seconds and fires a toast when the check ends. The check is two model calls
(`lib/continuity/analyze.ts`): `detect` (which recorded entries are mentioned, and which named
things are not recorded yet) and `compare` (only the mentioned entries' fields are sent).
`lib/continuity/plan.ts` then verifies and classifies every finding, and `run-check.ts`
applies the plan. Saving a changed body or timeline position checks again; decided conflicts
and the notices for changes already applied are kept, undecided conflicts are re-evaluated.

**The write rule (see the note under hard rule 1 in CLAUDE.md).** The model never writes field
text. `plan.ts` only lets a detail through if its exact words are found, word for word, in the
snippet (`findQuote` in `lib/continuity/text.ts` ignores case, whitespace, typographic quotes
and markdown marks, and always returns the author's original wording with balanced marks), and
a canon excerpt is only accepted if it is found in the entity's current fields. Anything else
is discarded and counted in `snippets.check_notes`. Automatic writes are: a new `in_development`
record with a generated `gap_prompt` (`sourceDocId = snippet:<id>`), and new details appended to
existing fields. Both create a notice with Undo (new details) or a link to the entity (new
records). Conflicts never touch canon until a decision.

**Time awareness.** A conflict becomes `possible_change` when the snippet has a timeline
position and either the model set `maybeDevelopment`, or an earlier snippet (lower position)
set that field (`loadPriorAges` reads `field_history`).

**Decisions** (`resolveFlagAction`): keep canon, update canon (editable pre-filled text),
both are true / changed over time (saved as a new field named `"<Label> (<context>)"`), decide
later (appended to `gap_prompt`, `locked` becomes `in_development`). The flag is claimed first,
so a double click cannot apply a decision twice, and it reverts to open if the canon write fails.

**Where things are.** Logic: `lib/continuity/` (`constants`, `types`, `text`, `plan`,
`analyze`, `run-check`, `links`). Queries: `lib/data/snippets.ts`, `lib/data/continuity.ts`.
Actions: `lib/actions/snippets.ts`, `lib/actions/continuity.ts`. Pages: `/snippets`,
`/snippets/new`, `/snippets/[id]`, `/continuity` (tabs), `/continuity/[flagId]`. The entity
page has a Continuity section (`components/entity-continuity.tsx`) with open items and field
history. The sidebar has Snippets and Continuity with a badge of conflicts waiting on a
decision.

**Model.** AI Gateway string from `CONTINUITY_MODEL`, default `anthropic/claude-sonnet-4.5`.
The default was not exercised against the real gateway, so if a check fails with a model or
auth error, the snippet page shows the message with a Try again button: set
`CONTINUITY_MODEL` in `.env` to a model your gateway offers.

**Verification done.** `npm run test:continuity` runs 17 offline checks of the verification
and classification rules. The whole flow (the real migrations, `runContinuityCheck`, every
decision, undo, idempotent re-check, cascade deletes, failure handling) was also run in a
scratch copy against an in-memory Postgres with a scripted stand-in for the model, and every
new page was rendered with seeded data. That harness needs `@electric-sql/pglite`, so it is
not in this repo. `npm run build` passes.

**Root layout is now `force-dynamic`.** Every page reads live DB data and the sidebar badge
must be current, so nothing is prerendered at build time. (This also means the home page
counts are no longer frozen at build time.)

**Left out on purpose.** New places and characters are not placed on the timeline (only
events appear there). Snippets are compared against entities only, not against events.

## Phase 3.6 follow-ups worth considering

- Run a real snippet through the check and tune `DETECT_SYSTEM` / `COMPARE_SYSTEM` in
  `lib/continuity/analyze.ts` from what it reports. The comparison is semantic, so expect some
  missed conflicts and the occasional false one until the prompts are tuned against real text.
- Snippet-to-event linking, so a scene can be tied to the event it dramatizes.

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
- Continuity check: the app database is the only record of canon, so a decision updates the
  entity page directly. Automatic writes are verbatim quotes of Bobby's own words only, each
  with an Undo; conflicts need his explicit decision.

---

## Next up (in order)

0. Apply the Phase 3.6 migration (`npm run db:migrate`), then save a first real snippet and
   watch the check run. Confirm the model string works (see "Model" in Phase 3.6).
1. Sidebar multi-select filter (`shadcn-multi-select-component`) across all entity types —
   the timeline currently has no per-entity filtering at all.
2. Multi-lane convergence view (`iStoryline.js`) for 2+ selected entities — the hardest
   single piece per the plan; try the library before falling back to custom D3.
3. Timeline polish: a real two-tier header (year + era/century) instead of the single
   hand-tuned default zoom window — needed before the full ~2000-year range is usable
   without dense one-tick-per-year rendering (see the react-calendar-timeline section
   above). Also worth deciding whether the top-level timeline lane should show *only*
   parent-level events (hiding sub-events until you zoom into their parent) now that
   sub-events exist — currently every event with a `sort_order` shows on the main lane
   regardless of `parent_event_id`, so a parent and its sub-events all appear side by side
   at the default zoom.
4. Decide what to do with the two flagged data gaps: the dangling "Assassination Attempt"
   event (Age ~540, no full `Events.md` entry) and the "Bard (The Traveler - Novel)" typo
   in "The Invasion" (Events.md) — both currently just logged as ingestion warnings.
5. Phase 3.5: a "Gaps" view listing the 11 entities that already have `gap_prompt`s from
   ingestion; AI suggestion pane via Claude through the Vercel AI Gateway.
6. Phase 4: Markdown export serializer (must mirror the Phase 2 parser format exactly —
   hard rule 6); compilations feature.
7. Phase 5: search, deploy to Vercel, optional Drive re-sync button.
8. Skipped this session on request: replatforming onto Fumadocs was considered and
   explicitly declined (it's a docs-site framework built around static/MDX content trees
   and doesn't provide the live-editing CRUD forms/relationship pickers this app needs —
   would mean rebuilding the same forms under a different page shell, not replacing them).
   Don't re-raise this unless the requirements genuinely change.

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
- Browser-automation clicks (this session used Claude-in-Chrome) intermittently miss —
  the same click sometimes registers instantly, sometimes needs a retry, with no visible
  difference in the page state. This bit basic `<button>` clicks (Save, Delete, dialog
  confirmations), not just the timeline's drag/tap gestures. If a click-driven test seems
  to silently do nothing, retry once or twice with a screenshot in between before
  concluding the underlying feature is broken — check server logs (`/tmp/dev-server.log`
  if using the same background-dev-server pattern) for whether the expected POST/Server
  Action actually fired, since that's a more reliable signal than the screenshot.
- Deleting a row that's a parent of others (via the new `parent_entity_id`/
  `parent_event_id` columns) fails with a Postgres FK violation unless the delete action
  first nulls out the children's parent reference — see "Schema changes since Phase 1"
  above. Caught this via a real `NeonDbError` in the Next.js error overlay while testing
  entity delete, not via a type error, since Drizzle doesn't know about the FK constraint
  at the TypeScript level.
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
- The DB driver is `neon-http`, which has no interactive transactions. When several rows must
  change together, use `db.batch([...])` (one transaction), as `run-check.ts` and
  `lib/actions/continuity.ts` do. Claim-then-apply (an atomic `update ... where status = 'open'
  returning`) guards against double submits.
- The Phase 3.6 tables reference `entities` and `snippets` with `ON DELETE CASCADE` (history
  keeps its row and just loses its snippet link), so deleting an entity or a snippet needs no
  extra cleanup in the delete actions.
- `npm run lint` does not work yet: the repo has no ESLint config file.
