# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Current phase: Story Builder canvas (step SB). SB1 to SB7 done 2026-11-26. Do SB8 next.

Read the "Story Builder canvas (step SB)" section in full, and SB7's working-log entry (2026-11-26,
fourth session) -- it documents what SB7 built (the popup's AI helpers panel, canvas-level "Suggest
ideas" with ghost boxes, the Ask AI anything chip) and two small React Flow bugs found and fixed
along the way (a missing `pointerEvents: "auto"` override on a non-interactive node, and ghost-box
vertical spacing that didn't account for wrapped summary text). SB7 is committed.

## SB8: Polish

Per the checklist: "Polish: Fit to view, N shortcut, keyboard moves, narrow screen behavior."

- **Fit to view**: the canvas already has React Flow's own zoom/pan controls (`Control Panel` with
  Zoom In / Zoom Out / Fit View per the SB1-era groundwork) -- confirm "Fit View" actually works well
  for this canvas's content (it currently fits all nodes, which may include far-off or undated boxes
  in odd places) rather than building a new control.
- **N shortcut**: the plan's wireframe says "Double-click, or press N, to add an idea" -- confirm this
  already works (grep `components/story-builder-canvas.tsx` for a keydown handler) or wire it if it
  doesn't yet cover every focus state (e.g. while a popup or an input has focus, N should type the
  letter, not create a box).
- **Keyboard moves**: selected box(es) should be nudgeable with arrow keys (a small, a board-position
  concern per hard rule 15 for a beat/entry's canvas position, or a real `startYear`/`endYear` change
  per hard rule 18 if the existing drag-to-set-year behavior should also respond to arrow keys --
  check what the plan's board 5/8 wireframes say about this before deciding which).
- **Narrow screen behavior**: check what happens to the three-column layout (left world-tree menu,
  canvas, and the SB6/SB7 popup's own internal two-column grid) under a narrow viewport. The plan may
  not specify an exact breakpoint -- use judgment consistent with the rest of the app's existing
  responsive patterns (check how other dense views, e.g. the popup itself or `/stories`, already
  handle narrow screens) rather than inventing a new pattern.

Read the plan's full Story Builder canvas section for the precise wording of each of these before
starting -- this file only summarizes the checklist line, not the full spec.

## Do not

Do not touch the AI helpers panel, the Review writing/Review facts/What happens next/Ask AI anything
flows, or the ghost-box idea-generation flow SB7 just built, except as needed for keyboard/shortcut
polish that genuinely intersects them (e.g. if N should be suppressed while the AI panel's own input
has focus). Do not start step SB's "Gate SB" checklist item (build passes, merges verified against
the link index, a drag changes only `startYear`/`endYear`, no AI result applies without an accept)
as a separate task -- treat it as the final check once SB8 itself is done and verified, in the same
session.
