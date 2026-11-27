# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Current phase: Story Builder canvas (step SB). SB1 to SB4 done 2026-11-26. Do SB5 next.

Read the "Story Builder canvas (step SB)" section in the plan in full, especially the "Canvas"
subsection's "Merging" bullets (around line 826), and the 2026-11-26 working-log entry for SB4 --
it documents four real bugs found and fixed while testing the shelf live (a floating overlay
blocking canvas interaction, a node's inherited `pointer-events: none`, a client-side display gap,
and promoted beats double-showing), plus the "Make this a..." conversion feature SB5 can reuse the
pattern of (a select on a selected box, wired through a server action, swapping the box at its board
position). SB4's changes are **not yet committed** -- commit them (or ask whether to) before or as
part of starting SB5, so the working tree doesn't carry two steps of uncommitted work at once.

## SB5: Merge menu and confirmed merges, with Undo

Per the checklist: "Merge menu and the confirmed merges (relationship, appears in, located at),
with Undo." The Canvas spec's "Merging" bullet (plan, ~line 826):

- Drag one box onto another and a highlight shows the drop target. On drop, a small menu asks what
  the merge means, and nothing is written until a choice is made:
  - **Character onto character:** "Record a relationship" (pick a type from
    `lib/relationshipTypes.ts`'s `RELATIONSHIP_TYPES`, `startYear` = the drop year) or "Group on
    this canvas only" (writes nothing to canon -- this option needs its own decision about what, if
    anything, a canvas-only group is, since the board already stores groups per hard rule 15/18;
    check how SB2/SB3 treat board-only groupings, if at all, before inventing a new concept).
  - **Character onto a story:** records an `appears_in` relationship with `startYear` = the drop
    year and adds the character to the story's `involves` (`storyInvolves`, `db/schema.ts` line 217
    -- mirrors `eventInvolves`, hard rule 5: never flatten it).
  - **Character, story or event onto a location:** records a places relationship (`visited` or
    `lives_in` from `RELATIONSHIP_TYPES`) with `startYear` = the drop year.
  - Every merge shows an Undo that removes what it wrote. Merges go through the data layer, so the
    link index and the wiki pages update (hard rule 19: "A merge on the canvas writes nothing until
    Bobby picks what it means, and each merge can be undone").
- A board never creates edges in the link index by drawing (hard rule 19 again). Only a confirmed
  merge writes a relationship.

Key things already in place to build on, found this session:
- `createRelationshipAction(fromCode, toCode, type, notes?, startYear?, endYear?)` and
  `deleteRelationshipAction(id)` already exist in `lib/world/actions.ts` (lines 638, 761) and are
  exactly the data-layer calls a confirmed merge should use -- Undo is just
  `deleteRelationshipAction` on the id the merge call returned. `updateRelationshipAction` also
  exists if a merge ever needs to edit one in place rather than delete/recreate.
- `RELATIONSHIP_TYPES` in `lib/relationshipTypes.ts` already has every type the spec names (`visited`,
  `lives_in`, `appears_in`, and the full Family/People/Places/Groups/Items/Events-and-stories/Other
  groups) with labels, inverses and tree hierarchy -- no new types needed for SB5.
- `storyInvolves` (`db/schema.ts:217`) and `eventInvolves` (`db/schema.ts:171`) both exist;
  `updateEventInvolvesAction` in `lib/world/actions.ts` is the existing precedent for writing an
  involves list -- look for (or write) the equivalent for `storyInvolves` if nothing already adds to
  it piecemeal (most existing uses may replace the whole list; a merge only needs to add one entry).
- The entry/beat node drag machinery (`onNodeDragStop` in `components/story-builder-canvas.tsx`) is
  where a merge-drop would need to detect "dropped onto another node" (compare drop position against
  other nodes' bounding boxes, or use React Flow's own node-intersection helpers if `@xyflow/react`
  v12.12.1 exposes one -- check `getIntersectingNodes` on `useReactFlow()` before hand-rolling
  bounding-box math) rather than reading it as a plain position/year change.
- `components/story-builder-entry-node.tsx` (`EntryNodeData`) only models character/location/event/
  story/item/lore boxes as independent entries; merging needs a new UI (the "small menu" on drop) --
  look at how the "Make this a..." dropdown on `BeatNode` (`components/story-builder-beat-node.tsx`)
  was built as the closest existing pattern for an on-canvas choice menu, including its `nodrag nopan`
  class so the menu itself doesn't trigger a drag or pane-pan.

## Do not

Do not start SB6 (expanded box popup), SB7 (AI helpers) or SB8 (polish) without finishing SB5 and
checking in first if anything about its scope is unclear -- in particular:
- What a "Group on this canvas only" merge actually does/stores (the one option in the spec that
  writes nothing to canon) is not fully specified and is worth confirming before building, since the
  board's existing group concept (hard rule 15) may or may not already cover it.
- The spec's three merge pairings (character-character, character-story, {character,story,event}-
  location) don't cover every possible drag-one-box-onto-another combination (e.g. event onto event,
  location onto location, anything onto lore/item). Default to refusing a merge combination the spec
  doesn't name, with a message, rather than inventing new relationship semantics -- surface any
  combination that seems like it should obviously work (e.g. "event participated_in a story") rather
  than silently deciding it yourself.
Do not touch the locations year-field migration (still needs Bobby's go-ahead, same as before) as
part of this step -- it's unrelated to merging.
