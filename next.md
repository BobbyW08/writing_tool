# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Current phase: Story Builder canvas (step SB). SB1 to SB5 done 2026-11-26. Do SB6 next.

Read the "Story Builder canvas (step SB)" section in full, especially the "Expanded box (popup)"
subsection (plan, ~line 841) and its wireframe, and the two 2026-11-26 working-log entries for SB4
and SB5 -- SB5's entry documents the four merge pairings and two mid-session decisions (Bobby
confirmed "Group on this canvas only" needs no new data concept, and added character-onto-event as a
fifth pairing beyond the original spec text, specifically so a dragged event shows on the
character's own page as a life event). SB4 and SB5 are both committed. Commit SB5's work (or ask
whether to) before or as part of starting SB6.

## SB6: Expanded box popup

Per the checklist: "Expanded box popup: Write area, state switch, story questions writing through
the data layer. The left menu stays visible behind the popup, dimmed (board 8)." Per the plan's own
scoping note (~line 896), SB7's AI helpers (Review writing, Review facts, What happens next, the
chips) are **not** part of this step -- only the popup shell, the Write tab, the Draft/Canon/Set aside
switch, and the story questions that write through the data layer. The spec's wireframe (~line 846):

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
|                                                | characters, time-  |
|                                                | frame, locations,  |
|                                                | events, items and  |
|                                                | lore, themes, arc  |
+--------------------------------------------------------------------+
```

The AI helpers panel and AI results row are SB7's. Build the popup shell (dimmed canvas behind it,
Open full page, Close), the Write/Details/Links/History tabs, and the story questions panel on the
right (Characters, Timeframe, Story, Locations, Events, Items and Lore -- the themes/arc question
stays hidden until step AR exists, per the spec). Each answer writes through the data layer, same as
everywhere else in this app.

**Reuse before building new (hard rule 10):**
- `WritingEditor` (`app/(app)/write/[code]/editor.tsx:376`) already has the Draft/Canon/Set aside
  switch (`canonState`: `'draft' | 'canon' | 'set_aside'`), word count, the continuity check, and a
  history panel -- and its own comment already anticipates being embedded elsewhere ("other
  embeddings of this editor (none yet)", with an `onFieldsSaved` callback built for exactly that).
  For a **story or beat box**, the popup's Write tab should almost certainly render this component
  directly against that story's writing record (`getWritingListByStory`/`createWriting` in
  `lib/studio/`, same get-or-create pattern `app/(app)/story-builder/[code]/page.tsx:34-38` already
  uses) rather than rebuilding an editor.
- For an **entry box** (character, location, and so on), the spec says the Write tab "edits the
  entry's notes" -- check what field that actually means before assuming. `worldSharedCols()` in
  `db/schema.ts` gives every world entry a `details` array and a `body` text column; check how an
  entry's own read/edit page currently lets Bobby write freeform notes (if it does yet) before
  deciding whether the popup's Write tab is editing `body`, a `details` row, or something else. This
  may itself be a small gap to fill rather than something already built.
- `app/(app)/story-builder/[code]/page.tsx` and `app/(app)/story-builder/[code]/review/page.tsx` are
  **pre-canvas** scaffolding from the old UX3 "new story or pick existing" flow (the first's own
  comment says "the canvas is not built yet"). Check whether "Open full page" in the new popup should
  route to one of these, to the plain writing studio (`/write/[code]`), or somewhere else -- and
  whether either stale page should be folded into the new flow or removed, now that the canvas
  exists. Don't assume; this wasn't touched by SB1 to SB5 and may need its own small decision.
- The "left menu stays visible behind the popup, dimmed" instruction implies a modal/overlay that
  sits above the canvas but below nothing else -- check how other full-screen dimmed overlays in this
  app are built (if any exist yet) before inventing a new pattern.

## Do not

Do not start SB7 (AI helpers) or SB8 (polish) without finishing SB6 and checking in first if anything
about its scope is unclear -- in particular the two open points above (what an entry box's "notes"
field actually is, and what "Open full page" should link to) are real gaps, not implementation
details to guess past. Do not build the AI helpers panel, the chips, or the AI results row in this
step -- SB6 is the popup shell, Write/Details/Links/History tabs, the state switch, and the story
questions only.
