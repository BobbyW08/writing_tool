# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Current phase: Story Builder canvas (step SB). SB1 and SB2 done 2026-11-23. Do SB3 next.

SB1 (new left menu, `/story-builder` as the canvas route) and SB2 (canvas shell: React Flow, dotted
background, pan, zoom, pinned timeline ruler) are both done -- see their checklist entries and the two
2026-11-23 working-log entries for what was built, the two routing/layout questions asked and answered
along the way, and a real viewport bug caught and fixed during live verification.

**Not yet committed as of writing this**: confirm with Bobby whether SB2's changes are already
committed before starting SB3 -- check `git log` and `git status` first rather than assuming.

## SB3: Boxes

Per the checklist: "Boxes: create by typing (saved as beats), move, resize spans, set dates by
horizontal drag, undated state, delete, save positions on the board." Read the "Story Builder canvas
(step SB)" section's "Canvas" subsection in the plan in full before starting (the "Creating boxes" and
"Moving" bullets especially), and look at board 5 (`source-docs/wireframe-png/5. Story Builder canvas,
with ideas for the selected box.png`) again for exact box styling (CHARACTER, STORY-span, LOCATION,
IDEA box variants) and the "Double click blank canvas, or press N, to create a new box" empty-state
hint.

Key points to carry in from SB2's build:
- `lib/story-builder/canvas-scale.ts` (`YEAR_WIDTH`, `yearToX`, `xToYear`) is the one shared
  pixel-per-year mapping -- box x positions must use it, not a new constant, so they land in the same
  place the ruler already draws its ticks.
- The canvas's board row (code D, `kind = 'story_canvas'`, fetched via `getStoryCanvasBoard()` in
  `lib/world/queries.ts`) is where box *vertical* position, size and group belong (hard rule 18) --
  almost certainly in its existing `nodePositions` jsonb column, keyed by the beat's code, the same
  shape `BoardNodePositions` already uses for node maps (`{x, y, collapsed?, pinned?}` -- check whether
  that shape needs extending with `width`/`height` for span boxes, or a separate field).
- A typed box is saved as a beat (`state = 'idea'`) immediately on creation -- "every box is a record."
  Use `createEntityAction('beats', {...})`, the same generic action SB2 reused for the board row.
- Horizontal position is never stored on the beat itself -- it comes from `startYear` (point boxes) or
  `startYear`/`endYear` (span boxes, drag either edge to resize). Moving a box horizontally sets those
  fields through `updateFieldAction`, same as the master timeline's drag-to-reposition already does
  (`updateEventYearAction` is the precedent to look at, even though this is beats not events).
  Dragging never rewrites `yearLabel` silently (hard rule 3) -- after a horizontal drag, offer to
  update it, don't just overwrite it.
- Boxes with no year sit in an "Undated" state (dashed outline, "no date" badge per the wireframe) --
  a missing date never blocks a save (hard rule 4's spirit: placeholders are first-class).
- `components/story-builder-canvas.tsx` currently renders `nodes={[]} edges={[]}` -- SB3 is where real
  nodes (one React Flow custom node type per box kind, or one flexible type) and the node-click/drag
  handlers actually get wired in.

## Do not

Do not start SB4 to SB8, AR, or Phase 9 without finishing SB3 and checking in first if anything about
its scope is unclear, the same way SB1's nav scope and SB2's route scope both were. Do not build the
shelf (dragging existing entries onto the canvas, SB4), merging (SB5), the expanded popup (SB6), or any
AI helper (SB7) in this step -- SB3 is boxes only: create, move, resize, undated state, delete, save
position.
