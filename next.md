# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## What happened in the session right before this one

No progress on SB8 live-verification -- `.env.local` still didn't exist, so the task below was
still blocked the same way it was at the end of the SB8 session. Bobby asked to commit everything
and stop (switching to his main PC), which surfaced that this environment had **no `.git` at all**
(confirmed with `git rev-parse --show-toplevel` failing here and in every parent directory, and no
`.git` found anywhere under `C:\dev`) -- despite the plan's working log referencing real prior
commits and a pushed `claude/writing-drives-world` branch from elsewhere. With Bobby's confirmation,
`git init` was run in this folder and a single commit (`5cd0cdb`, local `user.name`/`user.email` set
to his own, no `--global` change) captured the full working tree as of SB1 to SB8 -- `node_modules`
excluded via the existing `.gitignore`, no secrets found or committed, nothing pushed anywhere (no
remote is configured). **This local history is disconnected from whatever real history exists on
the main PC.** Before doing anything git-related next (push, branch, merge), reconcile the two --
the main PC's repo (with the real pushed commits the plan already references) should almost
certainly be treated as canonical, not this fresh init.

## Current phase: Story Builder canvas (step SB). SB1 to SB8 are built. Live-verify SB8, then Gate SB.

Read the "Story Builder canvas (step SB)" section in full, and the SB8 checklist entry and the
2026-11-27 working-log entry -- they cover exactly what SB8 built (Fit View padding, the N-shortcut
fix, the new arrow-key nudge, the shelf-as-drawer on narrow screens) and why each choice was made.

**This session had no `.env.local`, so SB8 was implemented and static-checked
(`tsc --noEmit`, `npm run build`) but never opened in a real browser against the real database.**
Bobby confirmed proceeding that way rather than supplying credentials. That live pass is this
session's first job, with real `APP_DATABASE_URL` and `ANTHROPIC_API_KEY` in `.env.local`.

## Do this first: live-verify SB8

Open `/story-builder` and confirm, against real data:

- **Fit View**: with a realistic mixed spread of boxes (some undated, some far from year 0),
  React Flow's Fit View control frames them sensibly with the new `padding: 0.2`. If it still looks
  bad with certain undated/far-flung boxes, that is real data behaving correctly (an undated box has
  nowhere better to sit) rather than a bug -- confirm with Bobby before changing anything here.
- **N shortcut**: pressing N creates a box when nothing else is open; pressing N while the box popup
  or the merge menu is open does nothing on the canvas (and still types a literal "n" into any of
  the popup's own text fields).
- **Keyboard moves**: select one box and arrow-nudge it; confirm left/right change its `startYear`/
  `endYear`/`createdYear` in the database by exactly one year per press, and up/down only move its
  board position (check `boards.nodePositions`, not any date field). Select two or more boxes at
  once (shift-click) and confirm they move together.
- **Narrow screen behavior**: at a narrow viewport width, confirm the "Shelf" toggle opens the
  drawer, the backdrop closes it, and dragging an entry out of the drawer onto the canvas still
  works and still refuses an entry already placed.

Fix anything that does not hold up, log it in the error log (found and fixed, same session), and
update the SB8 checklist entry and the 2026-11-27 working-log entry to say it was live-verified
(do not add a new entry for this if it is the same session finishing SB8's verification -- extend
the existing one).

## Then: Gate SB

Once SB8 is actually verified: build passes, merges verified against the link index
(`scripts/rebuild-links.ts` dry run), a drag changes only `startYear`/`endYear`, no AI result
applies without an accept. Check it off.

## After that

Step AR (arcs, themes, motifs) is the next item in "Build order", but it is explicitly **held until
Bobby says go**. Ask him before starting anything new -- do not assume AR is authorized just because
it is next in the table.

## Do not

Do not touch the AI helpers panel, the Review writing/Review facts/What happens next/Ask AI anything
flows, or the ghost-box idea-generation flow, except as needed to confirm SB8's own N/arrow-key
guards against them still behave correctly. Do not touch `app/(app)/layout.tsx`'s nav rail -- making
it collapse on narrow screens is step UX's job, not this one, and was deliberately left alone in
SB8 (see the working-log entry).
