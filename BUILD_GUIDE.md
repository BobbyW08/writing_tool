# BUILD_GUIDE.md — working log for building The Traveler

This is the session-to-session memory for building this app. Read this before
`traveler-wiki-build-plan.md` on every new session — this file says where things actually
stand; the plan file says what the finished feature should look like. Update the "Current
state" and "Next up" sections at the end of every session so the next session doesn't
re-derive any of this.

---

## Current state (as of 2026-09-16)

**Phase 0 (canonicalize source) — decision made, execution not started.** See "Open
decision — resolved" below.

**Scaffold — done, unverified.** A minimal Next.js App Router project exists at the repo
root:
- `package.json` — full dependency list per the plan's stack table. `node_modules` is
  populated (413 packages), but `npm run build` has not been confirmed clean end-to-end —
  verify it at the start of the next session before writing new code on top of it. Watch
  specifically for peer-dependency friction on `react-calendar-timeline` and
  `i-storyline-js` against React 19 — both are older packages.
- `lib/db/schema.ts` + `drizzle.config.ts` — Drizzle schema transcribed from the plan's
  Phase 1 SQL (`entities`, `events`, `event_links`, `relationships`, `compilations`,
  `compilation_items`). **Not yet pushed to a real database.** A Neon project already
  exists (Bobby has it) but `DATABASE_URL` has not been set in a local `.env` yet — no
  `.env` file exists in this repo, only `.env.example`. Nothing will run until it's added.
- `AI_GATEWAY_API_KEY` also still needs to be generated and added to `.env` — Bobby does
  not have this yet. In the Vercel dashboard: AI Gateway -> API Keys -> create a key (or
  `vercel env pull` if the Vercel project is already linked). No `@ai-sdk/anthropic`
  package is needed — the `ai` package talks to Claude through the Gateway with a plain
  `"anthropic/claude-..."` model string.
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css` — placeholder shell only, no real
  UI yet.
- `components.json` — shadcn config stub, no components installed yet (multi-select,
  form, etc. still need `npx shadcn@latest add ...` once shadcn is actually initialized).
- **No git repository yet.** `git status` fails with "not a git repository." Initialize
  git and make an initial commit before starting Phase 0/1 work, since the hard rules
  require `npm run build` to pass before every commit going forward.

**Source docs — pulled from Drive, not yet parsed.** `source-docs/` currently contains:

```
source-docs/
  canonical/     # Characters.md, Events.md, Locations.md, Timeline.md, Working-Doc.md
  ideas/         # Consolidated-Story-Bible.md, Sero_Story_Catalog.md,
                 # Sero-Worldbuilding-Gap-Analysis.md
  drafts/        # actual prose drafts (Introduction, ch. 1 Origins) — reference only,
                 # NOT ingestion input
  rpg-ai-game-concept/  # Goat Deeper RPG concept material — NOT part of this app.
                        # Ignore for Traveler-wiki work unless Bobby explicitly pivots.
```

The previously-flagged `duplicates-rpg-ai-game-folder/` (a third, docx-based copy of
Characters/Events/Locations/Timeline) is no longer present in `source-docs/` — that part
of the original open decision is resolved on its own; don't spend time looking for it.

---

## Open decision — resolved

The plan's Phase 0 asked to pick ONE canonical folder. Bobby's call: **merge
`canonical/` and `ideas/`, not either/or.**

- `canonical/` (Characters.md, Events.md, Locations.md, Timeline.md, Working-Doc.md) is
  the structured, entity-per-header source the Phase 2 parser is designed around — this
  is still the primary ingestion input.
- `ideas/` (Consolidated-Story-Bible.md, Sero_Story_Catalog.md,
  Sero-Worldbuilding-Gap-Analysis.md) is looser brainstorming material, but Bobby wants
  it folded in rather than left out, since it may contain entities, events, or field
  detail that never made it into `canonical/`.
- Before running the Phase 2 parser for real: diff `ideas/` against `canonical/` per
  entity/event (don't assume `ideas/` is a strict superset or subset). Where `ideas/` has
  content `canonical/` lacks, either (a) hand-merge it into `canonical/` first so there's
  one clean parser input, or (b) extend the parser to also read `ideas/` and upsert on
  the same `source_doc_id` + slug key it already uses for re-runs — whichever is less
  ingestion-pipeline complexity for a one-time import. Flag ambiguous conflicts (same
  entity, contradictory field values between the two folders) for Bobby to resolve rather
  than silently picking one.
- `drafts/` and `rpg-ai-game-concept/` stay out of ingestion, as before.

---

## Decisions already made (don't re-litigate these)

- Neon + Drizzle, not Supabase. No auth, single user, no multi-tenancy.
- Drive import is one-time. The app DB becomes the source of truth after Phase 2 runs
  once. No two-way sync gets built, ever.
- `sort_order` (drag position) and `year_label` (display text) are separate fields on
  purpose — dragging never overwrites the label text.
- Off-the-shelf libraries are pre-selected for: wiki-link parsing (`remark-wiki-link`),
  single-line timeline (`react-calendar-timeline`), multi-lane convergence layout
  (`i-storyline-js`), sidebar multi-select (copy the `shadcn-multi-select-component`
  repo, don't build from scratch), compilation reordering (`@dnd-kit/sortable`). Reach
  for a custom build only if integration genuinely fails.
- AI suggestion pane is Claude API (via Vercel AI Gateway) + prompt design only — no
  framework. It must never auto-insert output into a field, and the system prompt must
  forbid finished prose.
- Canonical source for ingestion is `canonical/` merged with `ideas/` (see "Open decision
  — resolved" above), not `canonical/` alone.
- Priority for the next work stretch is **getting ingestion right before UI polish** —
  Bobby would rather have correct data behind a plain page than a good-looking page
  showing wrong or incomplete worldbuilding data.

---

## Next up (in order)

1. `git init` + first commit of the current scaffold, before touching anything else.
2. Confirm `npm run build` runs clean. Resolve any React 19 peer-dependency conflicts on
   `react-calendar-timeline` / `i-storyline-js` now, not later.
3. Add `.env` with `DATABASE_URL` (Bobby will supply the existing Neon connection string)
   and `AI_GATEWAY_API_KEY` (needs to be generated — see "Scaffold" section above).
4. Run `npm run db:generate` then `npm run db:migrate` against the real Neon database to
   confirm the Phase 1 schema applies cleanly.
5. Diff `canonical/` vs `ideas/` per the resolved Open Decision above; decide hand-merge
   vs. dual-source parser before writing ingestion code.
6. Write and run the Phase 2 ingestion parser against `source-docs/canonical/` (+
   `ideas/` per the merge decision). Test against the real `Characters.md`/`Events.md`
   content already sitting in `source-docs/` — no need to re-pull from Drive.
7. Spot-check the ingested data directly in the DB (or `npm run db:studio`) against the
   source markdown before building any UI on top of it.
8. Only after ingestion is verified correct: start Phase 3 entity pages/CRUD, then the
   timeline views, per the plan's "Suggested session breakdown."

## Gotchas encountered so far

- `read_file_content` (Drive MCP tool) was used for both native Google Docs and `.docx`
  files — it supports both. Plain `.md`-mimetype files were pulled with
  `download_file_content` + base64 decode instead, to get exact byte-for-byte text
  rather than a "natural language representation."
- A `npm run build` attempted from a bridged/remote shell against this repo failed on a
  platform-specific SWC binary download (`@next/swc-linux-x64-gnu`) blocked by that
  shell's network egress — this is an artifact of that shell's environment, not a real
  problem with the repo. Re-verify `npm run build` from Bobby's actual dev environment
  (where `npm install` was originally run) rather than trusting that failure.
