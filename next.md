# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Task: step UX0, fix the five browser-checklist defects

Read "Start flow and page redesign (step UX)", "Step P0" and the error log in
`traveler-wiki-build-plan.md` first. Before touching any code, read the relevant guide in
`node_modules/next/dist/docs/` (CLAUDE.md says this Next.js has breaking changes). Do only the five
fixes below, in this order, one commit each. Do not start UX1 or later, and do not start S7 or the
Story Builder.

### The defects, with what is already known

1. **Linked names are not links, and autocomplete ranks badly.** `MentionNode` in
   `lib/studio/mention-node.ts` is a text node with a `writing-mention` class and no click behavior.
   Make a linked name clearly styled, with hover showing its type and name, click opening the entry and
   Ctrl-click opening a new tab. The saved Markdown must stay `[words as written](C4)` (hard rule 9).
   Rank autocomplete by exact name match first, then by type: Characters, Locations, Events, Factions,
   Cultures, Items, Lore last. Write the ranking as a pure function with a test first.
2. **Dragging from the world tree breaks neighbouring links.** `DropEntryPlugin` inserts at the cursor.
   Insert at the drop point instead, snap to the nearest word boundary, add spaces around the new link,
   and never land inside an existing linked name. Write the position logic as a pure function with tests
   first, including a drop in the middle of a word and a drop on a linked name.
3. **Hydration mismatch** from the `RichTextPlugin` placeholder in `app/(app)/write/[code]/editor.tsx`
   (the "Start writing..." div). Find the actual cause first (use `superpowers:systematic-debugging`),
   then fix it. Do not guess. Confirm the console is clean on a story page.
4. **Entry page header overlap.** The title collides with the Export as Markdown button and the UNK badge.
   Give the title its own row, put badges beside it, and put the actions on a separate toolbar row with
   tabs. Rarely used actions go under More. Match board 9 of the wireframes.
5. **Ask AI quality.** Proposals ran on claude-haiku-4-5 and came back as vague restatements. Set the
   suggestion task to a Sonnet-class model in `ai_settings` (through the existing settings path, not a
   hard-coded model) and rewrite its prompt so each proposal is a concrete question, option or tension
   grounded in Bobby's own text and linked entries. It must never contain a written scene or paragraph
   (hard rule 1).

### Constraints
- Keep hard rules 1, 9 and 13. Nothing is applied to an entry without Bobby accepting it.
- Follow `superpowers:test-driven-development` for the two pure functions.
- Do not touch `lib/continuity/backward.ts` or `scripts/test-continuity.ts`. They are uncommitted on
  purpose and belong to the S7 task. Do not stage them.
- Run `npm run build`, `npm run test:continuity`, `npm run test:mentions` and `npm run test:names` after
  each fix. If Next.js shows its security-advisory nudge, retry the same build once.
- No migration is needed. If one seems necessary, stop and ask.

### When this is done
1. Check off UX0 in the plan, move each of the five error log rows to fixed with the date and the fix, and
   add a working log entry.
2. Re-read the changes and recheck this task and `CLAUDE.md`'s hard rules.
3. Run `npm run build`, zero errors.
4. Replace this file with the next task, which is the rest of S7 (see below). Ask Bobby before starting
   UX1 or anything after it.

### Bobby retests by hand (PowerShell, then the browser)
1. `cd C:\dev\writing_tool`, then `npm run dev`, and open `http://localhost:3000`.
2. Open a story, then its editor. Type "ser", watch the list, press Tab. The Character should come first.
3. Click the linked name. The entry opens. Hover shows its type.
4. Drag a character from the world tree into the middle of a word and next to a linked name. Nothing
   breaks and no link is split.
5. Type a full character name and press Escape. The "Names that look like entries" panel appears under
   the page. Try Link and Link all.
6. Open the story page and check the browser console. There is no hydration warning.
7. Open "Third Companion". The title, badges and buttons no longer overlap.
8. Use Ask AI on an entry. The proposals are specific questions or tensions.
Wait for each step to pass before the next.

## After this: finish S7 (next task, not this one)
`lib/continuity/backward.ts` already holds the pure comparison (`fieldWasReplaced`, `findStaleClaims`,
tested). Still to build: call it from the data layer write function for every coded table when a canon field
is replaced, open a Continuity inbox flag per stale claim (edit the passage, accept as outdated, or revert
the change), and add the Draft-vs-Locked priority split to `buildPlan` and `compareSchema`. Relative timing
stays optional. Full detail is in "Steps S0 to S7", item S7.

## Do not
Do not start UX1 to UX6, the Story Builder canvas (SB), story architecture (AR) or Phase 9. Do not add any
file other than what this task needs. Do not commit to Neon anything except through a migration Bobby
applies by hand.
