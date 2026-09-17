# CLAUDE.md — The Traveler: Story Wiki & Timeline

## What this is
A personal, single-user web app for organizing "The Traveler" story universe: characters,
locations, events, items, cultures, races, languages, and artifacts, all cross-linked, with
a filterable/braided timeline. It also acts as a lightweight creative assistant (suggestions
and placeholder/gap tracking) — it never writes narrative prose for the user.

Full plan, schema, and phase breakdown: `traveler-wiki-build-plan.md` (same folder). Read
that file before starting any phase — this file is the quick-reference / hard-rules layer
on top of it, not a replacement.

**This is not:** a ghostwriter, a project/task manager, or a multi-user product. No auth
needed for v1.0.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router |
| Database | Neon (serverless Postgres) — **not Supabase** |
| ORM | Drizzle ORM + `drizzle-kit` for migrations |
| Wiki-link parsing | `remark-wiki-link` (or `@portaljs` fork) |
| Timeline (single-line) | `react-calendar-timeline` |
| Timeline (multi-lane convergence) | `iStoryline.js` (npm: `i-storyline-js`) for layout math, custom SVG/canvas render |
| Sidebar multi-select | `shadcn-multi-select-component` (copy-paste shadcn) |
| Compilation reordering | `dnd-kit` (`dnd-kit/sortable`) — not `react-beautiful-dnd` (deprecated) |
| AI suggestions | Claude API, direct call, no framework |
| Deployment | Vercel |

No Supabase anywhere in this project. No `googleapis` package for Drive pulls — reuse the
existing Apps Script Drive→GitHub pipeline pattern instead.

---

## Hard rules — never broken

1. **No AI-generated prose insertion, anywhere.** The suggestion pane returns options,
   questions, or tensions — never a written scene. Nothing is auto-inserted into any
   entity/event field without the user explicitly accepting it.
2. **Drive import is one-time, not sync.** Once the app exists, its database is the sole
   source of truth. Phase 0/2 Drive ingestion is a one-time migration. No two-way sync is
   ever built. An optional one-way app→Drive export/backup is fine later; it is not sync.
3. **`sort_order` and `year_label` are independent.** Dragging an event on the timeline
   updates `sort_order` only. Never auto-rewrite a vague `year_label` (e.g. "Age
   ~150-350") from a drag — prompt the user if they want to update it, don't force it.
4. **Placeholders are first-class rows, not errors.** Any entity with `status` other than
   `locked` (`in_development`, `needs_name`, `placeholder`) is a normal row, visually
   flagged, not a validation failure. Stub creation must auto-generate a `gap_prompt`.
5. **`event_links` is required, not optional.** It's the many-to-many join that makes
   "every event involving X" queries work — the entire timeline-filtering feature depends
   on it. Never flatten it into a simpler structure.
6. **Import/export share one format spec.** The Markdown export serializer must mirror the
   Phase 2 parser exactly (header + `Status:` + labeled fields + `[[Type#Name|Label]]`
   links) so round-tripping is lossless in both directions.
7. **Re-running ingestion upserts, never duplicates.** Key on `source_doc_id` + a stable
   slug/header text.
8. **Raw `[[wiki-link]]` syntax is never shown to the user.** It's always rendered as a
   real in-app hyperlink at render time.
9. **Try the off-the-shelf library before hand-rolling.** Per the plan's "Available vs.
   custom" table — `remark-wiki-link`, `react-calendar-timeline`, `iStoryline.js`,
   `shadcn-multi-select-component`, `dnd-kit/sortable` are all pre-selected. Fall back to a
   custom build (e.g. hand-rolled D3) only if integration genuinely doesn't fit.
10. **`npm run build` must pass with zero errors before every commit.**

---

## Data model

See `lib/db/schema.ts` — the Drizzle schema is the source of truth (kept in sync with
`traveler-wiki-build-plan.md`'s Phase 1 SQL). Don't duplicate it here.

---

## Session start protocol

1. Read this file.
2. Read `traveler-wiki-build-plan.md` for the current phase's detail.
3. Read `BUILD_GUIDE.md` (working log — current phase, decisions made, what's next).
4. State the current phase/sub-task before writing code.

## Session end protocol

1. Update `BUILD_GUIDE.md` with what was done and what's next.
2. Run `npm run build` — zero errors, once a Next.js app exists.
3. Re-check the hard rules above against anything touched this session.

## When in doubt
`traveler-wiki-build-plan.md` is the source of truth for schema and phase scope. Don't
invent a different data model or reach for Supabase/auth/multi-user patterns from other
projects — this app is intentionally single-user with no auth layer.
