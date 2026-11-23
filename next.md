# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Current phase: Story Builder canvas (step SB). SB1 done 2026-11-23. Do SB2 next.

Bobby authorized the Story Builder canvas as the next phase after UX1-to-UX6b closed (see
`traveler-wiki-build-plan.md`'s "Story Builder canvas (step SB)" section for the full spec: menu and
entry point, canvas, expanded box, and the Step SB checklist SB1 to SB8). SB1 (new left menu order and
the Story Builder route) is done -- see its checklist entry and the 2026-11-23 (third) working-log
entry for what was built and why the nav flattening went exactly as the wireframe shows (confirmed
with Bobby, who pointed to the wireframe itself and sent updated copies, now saved in `source-docs/`:
`Story Builder Wireframes.html`, `Story Builder Wireframes-png.zip`, and `wireframe-png/` with one PNG
per board).

## SB2: Canvas shell

Per the checklist: "React Flow, dotted background, pan, zoom, pinned timeline ruler (0 to 5, extend,
zoom)." Read the "Story Builder canvas (step SB)" section's "Canvas" subsection in the plan in full
before starting, and look at board 5 (`Canvas.dc.html` in the wireframe artifact, or
`source-docs/wireframe-png/5. Story Builder canvas, with ideas for the selected box.png`) for the
exact layout. Key points from the spec:

- Route `/story-builder/[code]` already exists (step UX3's per-story actions page) -- check whether
  this step changes that route to the canvas itself, or whether the canvas is a new view reached from
  it. Re-read the spec's "Until SB3 exists this opens the story's beats page" line (under "Start flow
  and page redesign") for how the existing flow currently reaches Story Builder, and decide how SB2's
  shell fits into that without breaking the picker (`/story-builder`) or per-story actions flow that
  UX3 already built.
- React Flow (`@xyflow/react`) -- already a project dependency (used for node maps and trees per the
  stack table in `CLAUDE.md`). Reuse it, per hard rule 10 and the one node/edge shape rule (hard rule
  15, `lib/graph/types.ts`) -- though the canvas's own boxes are a different, SB-specific shape (board
  positions, not graph nodes/edges), since hard rule 18 says layout position belongs to a board, not
  the record.
- Dot-pattern background, pan and zoom, white canvas in the wireframe (the wireframe boards are dark
  theme for the chrome around it, but the canvas area itself reads as drawn -- check the actual
  colors in the board 5 image rather than assuming).
- A custom timeline ruler pinned to the top, following pan and zoom, defaulting to years 0 to 5 (Year
  0 is SERO's birth per hard rule 3), extending in both directions, years as whole numbers.
- Storage: this step only needs a minimal `boards` row with `kind = 'story_canvas'` to hold the
  viewport (the `boards` table already exists in `db/schema.ts` with a `viewport` column and a `kind`
  column whose comment lists allowed values -- `story_canvas` is not yet one of them, so add it to
  that comment, and add a migration if the column needs anything SB2 specifically requires beyond what
  already exists). Box positions, sizes and groups (hard rule 18) are SB3's job, not SB2's -- this step
  is the shell only: pan, zoom, dotted background, the pinned ruler.

## Do not

Do not start SB3 to SB8, AR, or Phase 9 without finishing SB2 and checking in first if anything about
its scope is unclear the way SB1's nav scope was. Do not touch the `beats` table's schema or write any
new beat rows in this step -- that starts at SB3 ("Boxes: create by typing (saved as beats)...").
