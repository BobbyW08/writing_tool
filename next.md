# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Current phase: Story Builder canvas (step SB). SB1 to SB6 done 2026-11-26. Do SB7 next.

Read the "Story Builder canvas (step SB)" section in full, especially the "Expanded box (popup)"
subsection (plan, ~line 841) and its wireframe, and SB6's working-log entry (2026-11-26, third
session) -- it documents exactly what SB6 built and the small decisions made along the way (what an
entry box's "notes" field is, what "Open full page" links to, how a storyless beat is handled). SB6
is committed.

## SB7: AI helpers

Per the checklist: "AI helpers: Review writing, Review facts, What happens next, then the chips.
Idea generation also works from a selected box on the canvas: results show as dashed ghost boxes to
its right, with Add to canvas and Dismiss." The wireframe in the "Expanded box (popup)" subsection
shows where these live in the popup SB6 already built (`components/story-builder-box-popup.tsx`):

```
+--------------------------------------------------------------------+
| STORY BOX  Origins                       [Open full page] [Close]  |
+----------------------------------------+---------------------------+
| Write | Details | Links | History      | AI helpers                |
| (blank page, saves as you type)        |  [Review writing]         |
|                                        |  [Review facts]           |
|                                        |  [What happens next]      |
| Draft | Canon | Set aside              |  more ideas (chips)       |
+----------------------------------------+---------------------------+
| AI results (nothing applies until you accept)  | Story details:     |
+--------------------------------------------------------------------+
```

This step adds the "AI helpers" panel and the "AI results" row to the popup's Write area (currently
just the embedded `WritingEditor`, no AI panel at all), and a separate canvas-level idea-generation
flow (ghost boxes next to a selected box, Add to canvas / Dismiss).

**Reuse before building new (hard rule 10) -- the AI foundation (step S4) is already built in full:**
- `lib/ai/model.ts`'s `askAI()` is the one entry point for every model call, reading the model per
  task from `ai_settings`.
- `lib/ai/review-writing.ts` / `review-writing-actions.ts` already implement "Review writing" --
  check whether the Studio's own writing page (`app/(app)/write/[code]/`) already surfaces this as a
  UI pattern to lift into the popup, rather than rebuilding the review flow.
- `lib/ai/context.ts`'s `buildAiContext()` reads the link index (`schema.links`) for context, not
  hand-queried columns, and excludes Set aside writing -- reuse this for whatever context "Review
  facts" and "What happens next" need.
- `lib/ai/proposals.ts` / `actions.ts` already implement the accept/reject proposal flow
  (`acceptProposalAction` tags a record `UNK` and `AI suggested`) and the `/ai-inbox` page -- the
  "AI results ... nothing applies until you accept" row in this popup is very likely the same
  proposal pattern reused, not a new concept.
- `lib/ai/beats.ts` may already cover idea generation for beats -- check before writing a new
  "What happens next" / idea-generation code path from scratch.

**Hard rules that bind this step directly:**
- Rule 1: no AI-generated prose insertion anywhere. "Review writing" is the one allowed form (a
  single suggested edit to a sentence Bobby already wrote, shown before/after, applied only on
  accept) -- never an auto-inserted new paragraph or scene.
- Rule 23: AI-proposed links (arc/theme/scope, when that step exists) apply only after Bobby accepts
  them -- same spirit for every other proposal this step adds.
- The ghost boxes from idea generation are suggestions only, placed on the canvas as a *board*
  concern (hard rule 15: layout positions belong to a board, never to the record) until Bobby accepts
  one via "Add to canvas", at which point it becomes a normal beat (hard rule 18: a typed box is
  saved as a beat with state `idea`).

## Do not

Do not start SB8 (polish: Fit to view, N shortcut, keyboard moves, narrow screen behavior) until SB7
is finished. Do not touch the Write/Details/Links/History tabs, the state switch, or the story
questions panel SB6 already built except as needed to add the AI helpers panel and results row
alongside them. Do not build any new AI primitive (a new model-calling path, a new proposal/accept
mechanism) without first confirming `lib/ai/` doesn't already have it -- step S4 is complete and
`/ai-inbox` already proves the accept/reject flow works end to end with a live model call.
