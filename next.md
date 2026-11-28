# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## What happened in the session right before this one

Resumed on a different machine from the one that built SB1-SB8. Pulled the latest commit from
GitHub (`fc4ac5d`, SB8 polish) -- same history as the other laptop, nothing to reconcile. This
machine had a real `.env.local`, so SB8's live-verification (owed since the previous session had no
env values) finally ran, and **Gate SB is now checked off**. Full detail is in the SB8 checklist
entry and the second 2026-11-27 working log entry in `traveler-wiki-build-plan.md`.

Two real bugs turned up live-verifying SB8, both found and fixed the same session:

1. **Fit View silently failed on a realistic spread.** `minZoom={0.2}` in
   `components/story-builder-canvas.tsx` clamped how far Fit View could zoom out, so any two boxes
   more than ~27 years apart (at `YEAR_WIDTH = 160`) ended up entirely off-screen. Asked Bobby how to
   handle it; he chose to lower `minZoom` rather than remove it. Now `0.002` (covers the real
   `events`/`stories` year range, roughly 0 to 2000, with room to spare). Re-verified live on the
   original failing spread and on a near-maximum ~2000-year spread.
2. **Keyboard-move drift.** Arrow nudges were moving selected boxes 165px/25px instead of 160px/20px,
   because React Flow's own built-in keyboard accessibility nudge (default 5px) was stacking with the
   app's own handler. Fixed with `disableKeyboardA11y` on `<ReactFlow>`; re-verified live at exactly
   the intended step afterward.

N and the narrow-screen drawer held up exactly as built. All test data from the verification pass
was cleaned up afterward (reverted via direct SQL, confirmed with a `rebuild-links.ts --dry-run`
matching pre-session counts both before and after the `minZoom` fix). `tsc --noEmit` and `npm run
build` are both clean. Nothing was committed or pushed yet -- that's this session's job below.

## Do this first: commit, push, and ask about a PR

1. Commit this session's changes on `claude/writing-drives-world`: the two SB8 fixes
   (`disableKeyboardA11y`, `minZoom={0.002}`) in `components/story-builder-canvas.tsx`, and the
   `traveler-wiki-build-plan.md`/`next.md` updates. Group into one or more commits as makes sense;
   either way the commit message(s) should name both fixes.
2. Push the branch to `origin/claude/writing-drives-world`.
3. Ask Bobby whether to open a PR to `master` now that SB1-SB8 is fully live-verified and gated, or
   wait. Do not open one without him saying so.

## After that

Step AR (arcs, themes, motifs) is the next item in "Build order", but it is explicitly **held until
Bobby says go**. Ask him before starting anything new -- do not assume AR is authorized just because
it is next in the table.

## Do not

Do not touch the AI helpers panel, the Review writing/Review facts/What happens next/Ask AI anything
flows, or the ghost-box idea-generation flow -- none of that was touched this session and none of it
needs re-verifying. Do not touch `app/(app)/layout.tsx`'s nav rail -- same as every SB session, that
is step UX's job.
