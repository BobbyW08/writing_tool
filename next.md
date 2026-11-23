# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Status: UX1, UX2, UX3, UX5 and UX6 are done. UX4 is held for Bobby's review tonight.

The Next.js 16.4.2 → 16.4.6 security upgrade is merged (commit `d3581d0`). UX1 (Home launcher), UX2
(type-page AI gap finder) and UX3 (stories picker and per-story actions screen, `/story-builder` and
`/story-builder/[code]`) are done; see the working log for detail.

**UX5 and UX6 are done as of 2026-11-21** (built in the same session, while UX4 waited for review):
- UX5: the unlinked-names panel on `/write/[code]` now sits in the same column as the writing
  surface (it was stretching full width before), plus a one-line hint about dragging an entry from
  the world tree or typing its name and pressing Tab. The world tree rail itself is the existing
  global sidebar `<WorldTree>` — already a working drag source into the editor since UX0 — so nothing
  new was built there.
- UX6: the generic entry page (`app/(app)/[entityType]/[slug]/page.tsx`, all eight world collections)
  now has title+badges on their own row and a toolbar row below with four tabs (Overview, Connections,
  Timeline, Writing) plus `RecordActions` (Export as Markdown, status, Change type, and Delete tucked
  under a new "More" popover). New `components/entry-tabs.tsx`; `WhatLinksHere` gained an optional
  `sources` filter so the Connections and Writing tabs split the one link-index query instead of
  duplicating it.

See the working-log entry "steps UX5 and UX6, editor panel placement and entry page tabs" for full
detail, including exactly which existing content moved into which tab.

**UX4: Review what I have so far screen (board 6, `Review.dc.html` in the "Story Builder
Wireframes" artifact, `https://claude.ai/artifact/YPgbFm2sRvgpw6HXz8KDAU`).** Held back deliberately:
it is the first real use of hard rule 1's one carve-out (Review writing applies a single accepted
sentence edit to Bobby's own prose), so it gets a focused pass with Bobby rather than an autonomous
one. Per the plan: a dedicated screen, reached from the "Review what I have so far" card on
`/story-builder/[code]` once `getStoryStats(storyId).hasProse` is true (replacing that card's current
fallback link to `/stories/[code]`). Concretely, once Bobby has reviewed and given the go-ahead:
- Read `project/Review.dc.html` again before writing any code, the same way board 3/4 were read for
  UX3 (full markup already captured once this session — check the working log / prior session
  transcript before re-fetching if it's still available).
- This is **Review writing**: a single suggested edit to a sentence Bobby already wrote (grammar,
  style, vocabulary, flow), shown as a before/after, applied only when he accepts that one
  suggestion. Check whether any Review machinery already exists (`/review` in the sidebar nav is the
  UNK review queue, a different feature) before building new AI plumbing; route any new AI calls
  through the existing `lib/ai/` module (hard rule 10). The plan specs this in full under "Writing
  Studio and AI layer" → "Review writing" and "Review facts" (also referenced from step SB7) — read
  that section, not just the wireframe, before building: it covers the style-sample input, what
  "Review facts" checks against (dates, places, motivations, relationships, promises, what each
  character knows), and the accept/reject/decide-later flow for both.
- New route: likely `app/(app)/story-builder/[code]/review/page.tsx`, consistent with UX3's route
  shape, but confirm against the wireframe's own navigation before deciding the URL.
- Once built, update `/story-builder/[code]/page.tsx`'s Review card to link there instead of to
  `/stories/[code]`.

## Design follow-ups from Bobby (2026-11-23), build after UX4 is reviewed
- **UX6b:** the Timeline tab on entry pages (board 10 of the wireframe canvas). Clicking it shows the
  timeline of this one story (its span, events, planned beats, undated items) plus a button, "View in the
  master timeline", that opens the full timeline with this story highlighted. Keep the four tabs as they
  are on board 9, with no box around them. Characters and locations show their own events the same way.
- **SB (later):** idea boxes on the Story Builder canvas are solid light blue, never see-through, so the
  dots do not show through. The expanded box popup keeps the left menu visible behind it, dimmed.

## Do not
Do not start the Story Builder canvas (SB), story architecture (AR) or Phase 9 without Bobby's
go-ahead — UX1 to UX6 is the authorized scope for now. Do not build UX4's AI mechanism without
Bobby's review and go-ahead first.
