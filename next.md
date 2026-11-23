# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Status: UX1 to UX6b are all done. Stop and check in with Bobby before starting anything else.

UX1 (Home launcher), UX2 (type-page AI gap finder), UX3 (stories picker and per-story actions
screen), UX5 (editor panel placement) and UX6 (entry page tabs and toolbar) were done 2026-11-21.
UX4 (Review what I have so far, board 6) and UX6b (Timeline tab on entry pages, board 10) were done
2026-11-23. That closes the entire authorized start-flow-and-page-redesign scope (UX1 to UX6b). See
the Step UX checklist in `traveler-wiki-build-plan.md` for every entry's file list and design notes,
and the two 2026-11-23 working-log entries for what each session actually built and verified.

**UX6b in one line**, for quick orientation: a new shared `components/entry-timeline-tab.tsx`
renders one entry's own timeline (span, events, planned beats, era band, ordered list, undated
panel, "View in the master timeline" and, on stories, "Open in Story Builder"), wired into both the
generic `[entityType]/[slug]` page's existing Timeline tab and a newly-tabbed `/stories/[code]`
page; the master timeline gained a `?highlight=<code>` param that dims every other event the same
way its existing type filter already dims non-matching ones. `storyDramatizes` and `beats` are both
still empty tables in the live data, so re-check the story-specific rows (span bar aside) once
either has real rows.

## Do not
The next items in the plan -- the Story Builder canvas (step SB), story architecture (step AR, held
since 2026-11-12), and Phase 9 -- are all out of scope until Bobby explicitly authorizes the next
one. Do not start any of them, or guess which one comes next, without asking him first. When he
does give the go-ahead, replace this whole file with that task's instructions before starting.
