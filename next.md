# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Current phase: Story Builder canvas (step SB). SB1, SB2 and SB3 done 2026-11-23. Do SB4 next.

Read the "Story Builder canvas (step SB)" section in the plan in full, especially the "Canvas"
subsection's shelf/merging bullets, and the three 2026-11-23 working-log entries for SB1 to SB3 --
SB3's entry in particular documents a real data-model change (beats now start storyless; a story is a
group of connected beats, formed by SB5's merging, not a container you create first) that SB4 and SB5
both build directly on.

SB3 is committed (`c503398`).

## SB4: Shelf

Per the checklist: "Shelf: drag existing entries onto the canvas. Convert a typed box to an entry
type." Board 5's wireframe (`source-docs/wireframe-png/5. Story Builder canvas, with ideas for the
selected box.png`) shows this as a right-hand panel: "Drag onto canvas" with grouped counts
(Characters (2), Stories (1), Locations (1), Events, Items and Lore) -- entries not yet placed on the
canvas, grouped by type.

**Bobby's answer to the x-position question (2026-11-24), build to this:**
- Character: dropping at year X shows the character's age at that year (X minus `birthYear`), or "age
  unknown" with an offer to set a birth year when there is none. Dropping does not change `birthYear`.
- Location and item: the drop year is the founding year or the first mention in the story. Items already
  have `createdYear`. Locations have no year field, so add one nullable whole-year field (migration,
  confirm with Bobby before applying, as with 0017) and wire it into the link index extraction if needed.
- Event and story: drop year is `startYear` (rule 18). Lore: undated at the drop point for now.
- No year means undated (dashed outline, "no date" badge). Never block a drop.
Also fixed 2026-11-24 (commit `82d53f4`): idea boxes are now solid light blue, not see-through.
**The shelf half of SB4 is already written (2026-11-24, remote session, types checked only).** First job:
run `npm run build`, open `/story-builder`, and test it in the browser: drag one of each type from the
shelf, confirm it leaves the shelf, a second drop of the same entry is refused with a toast, an event or
story dragged sideways writes `startYear` and an item writes `createdYear`, a character's age line
follows its position, and Backspace on an entry's box removes only the box. Fix whatever fails. Then
build what is left: the locations year field (ask Bobby first), lore, and "Make this a..." conversion.

Key points to carry in from SB1 to SB3:
- Dropping an existing character/location/event/story/lore entry onto the canvas does **not** create a
  beat -- it places that real entry as its own box, positioned by its own year field (`characters`
  don't have one directly tied to canvas placement the way events/stories do; check what each
  collection actually offers for "when" before deciding how each entry type gets an x position --
  this needs its own small design pass per collection, not one shared rule).
  "Dropping an entry that is already on the canvas is refused with a message" (per the Canvas spec) --
  decide what "already on the canvas" means operationally: likely, present in the board's
  `nodePositions` under that entry's code.
- `lib/story-builder/canvas-scale.ts` (`yearToX`/`xToYear`) is still the one shared mapping.
- The board's `nodePositions` (keyed by code, same `BoardNodePositions` shape SB3 already uses for
  beats) is where a dropped entry's vertical position and size land -- entries share the same
  position-storage convention as beats, just a different code prefix.
- "Convert a typed box to an entry type" is the "Make this a..." character/location/event/story/lore
  conversion mentioned in the Canvas spec's "Creating boxes" bullet -- this is the first point SB
  actually creates a real world entry from a beat. Look at `lib/world/move.ts`'s `moveEntryAction`
  (hard rule 6: a type change gets a new code, the old one retires to `code_history`) -- converting a
  beat to an entry is a *different* operation from a type change between two already-coded tables
  (a beat becoming, say, a character is the beat's content seeding a brand-new character record, not
  the beat's own B-code moving to a C-code), so don't assume `moveEntryAction` applies as-is without
  checking what it actually does first.
- `components/story-builder-beat-node.tsx`'s `STORY_BUILDER_NODE_TYPES` map will need a new node type
  (or a few, one per collection, or one shared "entry" type parameterized by collection) for dropped
  entries, distinct from the existing `beat`/`draft` types.

## Do not

Do not start SB5 to SB8, AR, or Phase 9 without finishing SB4 and checking in first if anything about
its scope is unclear, the same way SB1, SB2 and SB3's scope questions all were -- SB4 in particular has
at least one open design question above (how each entry type's "when" maps to canvas x) that's likely
worth surfacing before committing to an approach. Do not build merging (SB5), the expanded popup
(SB6), or AI helpers (SB7) in this step -- SB4 is the shelf and box-to-entry conversion only.
