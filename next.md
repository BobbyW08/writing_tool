# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Status: UX1, UX2 and UX3 are done. Next: UX4 (Review what I have so far screen).

The Next.js 16.4.2 → 16.4.6 security upgrade is merged (commit `d3581d0`). UX1 (Home launcher) and
UX2 (type-page AI gap finder) are done; see the working log for detail and `lib/gaps/`,
`components/gap-recommender.tsx`.

UX3 is done as of 2026-11-21: new, additive routes `app/(app)/story-builder/page.tsx` (the picker,
board 3) and `app/(app)/story-builder/[code]/page.tsx` (the per-story "what do you want to do"
screen, board 4), backed by `lib/story-builder/queries.ts` (`getAllStoryStats`, `getStoryStats`,
`getStoryPickerList`) and `lib/story-builder/actions.ts` (`createBlankStoryAction`). `/stories` and
`/stories/[code]` are untouched — they keep their own, different purpose (full CRUD browse, and the
rich infobox with inline writing/beats/relationships). The sidebar has a bold "Story Builder" nav
link and Home's "Open Story Builder" button now points at `/story-builder`. Only "Blank" is wired on
the New story panel; "An idea I already logged" and "AI suggests seed questions" are visible but
disabled. "Use the Story Builder" falls back to `/stories/[code]/beats` (the canvas doesn't exist
yet); "Review what I have so far" is greyed until a story has written prose, then falls back to
`/stories/[code]` (UX4 doesn't exist yet). See the working-log entry "step UX3, stories picker and
per-story actions screen" for full detail.

**UX4: Review what I have so far screen (board 6, `Review.dc.html` in the "Story Builder
Wireframes" artifact).** Per the plan: a dedicated screen, reached from the "Review what I have so
far" card on `/story-builder/[code]` once `getStoryStats(storyId).hasProse` is true (replacing that
card's current fallback link to `/stories/[code]`). Concretely:
- Read `project/Review.dc.html` from the wireframes artifact (`https://claude.ai/artifact/YPgbFm2sRvgpw6HXz8KDAU`)
  before writing any code, the same way board 3/4 were read for UX3.
- This is **Review writing**, the one allowed form of AI text in writing per hard rule 1: a single
  suggested edit to a sentence Bobby already wrote (grammar, style, vocabulary, flow), shown as a
  before/after, applied only when he accepts that one suggestion. Check whether any Review
  machinery already exists (`/review` in the sidebar nav is the UNK review queue, a different
  feature — confirm this before assuming code reuse) before building new AI plumbing; route any new
  AI calls through the existing `lib/ai/` module (hard rule 10, and the AI layer spec in the plan).
  "a fact check against your canon" (from the board-4 card body text) likely means checking the
  story's prose against canon details already on linked entries — read the plan's AI layer section
  for how this is scoped before inventing a mechanism.
- New route: likely `app/(app)/story-builder/[code]/review/page.tsx`, consistent with UX3's route
  shape, but confirm against the wireframe's actual navigation (board 4's card links to
  `Review.dc.html` directly, not nested under a sub-path, in the mock) before deciding the URL.
- Once built, update `/story-builder/[code]/page.tsx`'s Review card to link there instead of to
  `/stories/[code]`.

After UX4: UX5 (editor panel placement, board 7) and UX6 (entry header, board 9) remain, per the
Step UX checklist.

## Do not
Do not start the Story Builder canvas (SB), story architecture (AR) or Phase 9 without Bobby's
go-ahead — UX1 to UX6 is the authorized scope for now. Do not add any file beyond what UX4 needs.
