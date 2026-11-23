# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Status: UX1 to UX5 are done. UX4 is done (2026-11-23). Build UX6b next.

UX1 (Home launcher), UX2 (type-page AI gap finder), UX3 (stories picker and per-story actions
screen), UX5 (editor panel placement) and UX6 (entry page tabs and toolbar) were done 2026-11-21.
UX4 (Review what I have so far, board 6) is done as of 2026-11-23: new route
`app/(app)/story-builder/[code]/review/page.tsx`, `components/review-workspace.tsx`, the new AI
module `lib/ai/review-writing.ts` + `lib/ai/review-writing-actions.ts` for Review writing (hard
rule 1's carve-out), and `lib/story-builder/review-actions.ts` as a thin front end onto the existing
continuity check for Review facts. Verified live via Playwright against real data (Accept correctly
reworded a sentence in a real writing record, tagged UNK + AI suggested; Reject correctly left
nothing written). See the Step UX checklist's UX4 entry and the 2026-11-23 working-log entry in
`traveler-wiki-build-plan.md` for the full file list, design notes, and a note on a stale dev-server
chunk that looked like a bug but wasn't (the fix was restarting `npm run dev`, not a code change).

**UX6b: the Timeline tab on entry pages (board 10 of the "Story Builder Wireframes" artifact,
`https://claude.ai/artifact/YPgbFm2sRvgpw6HXz8KDAU`).** This is the next and last item in the
UX1-to-UX6 authorized scope. Per the plan's UX6b checklist entry:
- Clicking the Timeline tab (already one of the four tabs added in UX6 -- Overview, Connections,
  Timeline, Writing -- on `components/entry-tabs.tsx` and the generic entry page
  `app/(app)/[entityType]/[slug]/page.tsx`) shows that one entry's own timeline: its span (for a
  story), its events (via `involves`), its planned beats, the era band, an ordered list, and a panel
  for items with no year yet.
- Two buttons: "View in the master timeline" (opens `/timeline` with this entry highlighted, its
  years in view and the rest dimmed, never hidden) and, on stories only, "Open in Story Builder"
  (link to `/story-builder/[code]`).
- Characters and locations show their own events the same way (their own `involves` membership),
  not just stories.
- Keep the four tabs exactly as they are on board 9 (no box around them, per Bobby's 2026-11-23
  note in the old next.md) -- that styling is already in place from UX6, don't touch it.
- Reads from the link index (hard rule 14) -- do not hand-query `involves` columns. Check
  `lib/timeline/` (or wherever the existing `/timeline` page's data layer lives) for a query you can
  reuse or narrow to one entry's codes, rather than writing a new one from scratch (hard rule 10).
- Read board 10 in the wireframe artifact before writing any code, the same way board 6 was read
  for UX4 this session (list its files with the Artifact tool's `list` action, `scope: "files"`,
  then `read` `project/<Timeline board's file>.dc.html` directly -- do not guess the filename from
  the index without checking `project/canvas.json` first).

## Do not
Do not start the Story Builder canvas (SB), story architecture (AR) or Phase 9 without Bobby's
go-ahead -- UX1 to UX6b is the authorized scope for now. After UX6b, stop and check in before
starting SB.
