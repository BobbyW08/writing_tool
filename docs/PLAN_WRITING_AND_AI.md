# Writing Studio and AI layer: plan

Written 2026-10-20 with Bobby. This adds to `traveler-wiki-build-plan.md`. For the features below,
this file wins where the two differ. The one change to `CLAUDE.md` is the hard rule 1 amendment in
the section "The rule that changes", made when step S4 starts.

The master build order, the link index (step G1) and the World features (steps W1 to W6) are in
`traveler-wiki-build-plan.md`. This file covers steps S1 to S7: the Writing Studio, the AI layer
and the canon check.

## Goal

Bobby writes the story in a front end built for writing. He plans beats on a board, gets AI
proposals he decides on one at a time, and has contradictions caught and tracked as canon changes.
The Payload admin stays the back office for bulk entry and repairs. The front end is where the work
feels good.

## Decisions already made

1. Two surfaces, one database. All creating, editing and writing happens in the frontend. `/admin` is the fallback back office. `app/(app)` is the front end. Both read
   and write through Payload. The front end uses the Local API on the server only.
2. Writing gets a state: **Draft** (the default), **Canon**, **Set aside for later**.
   - Draft and Canon are both included in continuity checks.
   - Set aside is excluded from every check and from AI context.
   - A piece can be switched between states, or deleted, at any time.
3. New facts spread to other records only from Canon writing, and only as proposals Bobby approves.
   Draft writing is checked and flagged but never spreads.
4. Every approved change remembers the writing it came from. Switching a piece away from Canon, or
   deleting it, opens a review list of the changes it caused, each with a one click revert.
5. AI proposes. Bobby decides. Nothing is applied automatically, and AI never writes chapters,
   scenes or snippets.
6. Accepted AI text is tagged `UNK` and `AI suggested` until Bobby clears them.
7. A chosen story beat is saved as a **beat** (a story plan). It becomes an **event** when Bobby
   promotes it to canon. Events stay a clean canon timeline.
8. All AI runs on Claude, through the Vercel AI SDK and Vercel AI Gateway, with plain `anthropic/...`
   model strings. The model can be chosen per task. All AI calls go through one module, `lib/ai/`.
9. The front end layout is a slim icon rail, a side panel (the world tree) for the selected item,
   and a main canvas. It uses the existing shadcn components and theme.
10. Every connection between records lives in the link index (`links`, step G1). The AI context
    builder, the canon check and every visual feature read connections from it.
11. The prompts menu (step S6) asks the questions worth answering for each kind of entry. Its prompt
    text is written for this project. An answer goes into a `details` row labeled by the prompt.

## The rule that changes

`CLAUDE.md` hard rule 1 gains a second exception, worded exactly like this:

> The suggestion features (the beat tray and Ask AI) may propose beats and field text. A proposal
> lives only in the `ai-proposals` collection until Bobby clicks Accept on that one proposal.
> Accepted text is written to the target field, tagged `UNK` and `AI suggested`, and logged in
> Field history with an Undo. Nothing is auto-applied, nothing is accepted in bulk without showing
> each item, and nothing is ever written into `writing` (chapters, scenes, snippets), which stays
> human only.

The existing exception (the continuity check adding verbatim quotes of Bobby's own words) is
unchanged.

## New and changed data

| Change | What it is |
|---|---|
| `writing.canonState` | select: `draft` (default), `canon`, `set_aside`. Separate from the existing entry `status`. |
| `beats` collection (code prefix `B`, already added to `lib/codes.ts` in step G1) | A story plan item: name, story, order, optional `startYear` and `yearLabel`, `involves` (any record), `summary`, `state` (`idea`, `planned`, `promoted`), `promotedTo` (an event). Its place on the story map is stored on a board (step W5), not on the beat. |
| `claims` collection (system group) | One checkable fact found in a piece of writing: the writing, the verbatim passage, the record and field it depends on, and the value it implies. Metadata, not canon. |
| `ai-proposals` collection (system group) | One suggestion: task, target record and field (or a new beat), proposed value, model used, state (`pending`, `accepted`, `rejected`), and the context codes it was built from. |
| Built-in tag `AI suggested` | Protected like `UNK` (cannot be deleted). |
| `ai-settings` global | Which Claude model each task uses (quick suggestions, deep suggestions, canon check). |
| `prompt-sets` collection (system group) | The prompts menu: `collection`, `group`, `label`, `question`, `detailLabel`, `order`, `active`. Spec in `traveler-wiki-build-plan.md`. |

## The AI layer (`lib/ai/`)

- One function, `askAI({ task, input, schema })`. It reads the model for the task from
  `ai-settings`, calls it through the Vercel AI SDK and AI Gateway, and returns parsed,
  schema-checked output.
- The key is `AI_GATEWAY_API_KEY`, already in the environment, and it is never printed.
- **Context builder.** Given a record or a beat, it gathers: the record, everything linked to it
  (read from the link index: relationships, relationship fields, `parent`, events, mentions in
  writing and in text), and the record's own `details`. Each fact
  is labeled with its standing: Locked canon, in development, UNK, or from Draft writing. Set aside
  writing is never included. Context is referenced by code.
- **Output.** Always a list of discrete proposals in a fixed JSON shape. Never finished prose.
- **First task of the AI phase is a spike.** Confirm structured JSON output through the AI SDK and
  Gateway for the Claude models in use, and the real per-call cost, before anything is built on it.
  The Vercel AI SDK is already installed (`ai`).

## Features

### Writing Studio
A blank page. One centered column, serif text, no fields. A state switch (Draft, Canon, Set aside),
a story and kind picker, autosave, and `@` to mention any record by name, alias or code. Mentions
insert the name as plain text and fill the piece's `mentions` list. Focus mode hides everything
except the page. It saves to `writing` records, so the admin shows the same text.

### Story Builder
A vertical lane of beats with a side panel for the selected beat. Type a beat and three "what could
happen next" cards appear. Pick one and it becomes the next beat and three new cards appear based
on it. Type your own and the cards regenerate from it. Cards are never saved until chosen. A beat
can be promoted to an event. The story map view of the same beats is a board (step W5) built on React Flow.

### Ask AI anywhere
One button, always present. Scoped to the current page. "Help me build Vashten's background"
gathers everything about him, then returns proposals per section (summary, details, relationships,
open questions). Each proposal shows the target field and the labeled facts it was based on.
Accept or reject one at a time. The same suggestion tray component appears on character, location
and event forms.

### Prompts menu
A button on every entry page opens a menu of prompts grouped by topic, as a list to scan. A
character has groups such as Presentation, Origins, Current state, Birth, Death, Naming, Mental,
Physical, Personal and Social. An organization has Geopolitical, Religious, Military and others.
Each collection has its own groups. The text is written for this project and is editable in the
`prompt-sets` collection.

Each prompt has two actions:
- **Answer it myself.** Adds a blank `details` row labeled by the prompt, ready to fill in.
- **Ask AI.** Builds context from the record and everything linked to it, then returns three
  options as proposals. Accept one and it fills that `details` row, tagged `UNK` and `AI suggested`.
  Reject all and nothing changes.

A prompt already answered shows its answer. The menu has a search box. The AI never answers a
prompt on its own, and never writes prose for a chapter or scene.

### Canon check and change tracking
Builds on the existing continuity check (`lib/continuity/`, the Continuity inbox, Field history,
Confirmations).
- **Claims ledger.** Each time a Draft or Canon piece is saved, only the changed passages are
  re-read. Every checkable fact becomes a claim tied to the record and field it depends on.
- **Forward check.** A new claim that contradicts a record opens a Continuity inbox item. A Draft
  that contradicts a Locked record is a flag. Two Drafts that disagree is a lower priority flag.
- **Backward check.** A hook on every collection compares old and new values. When a field with
  dependent claims changes (an event year from 22 to 21), it opens a flag listing every passage that
  assumed the old value. For each: edit the passage, accept it as outdated, or revert the change.
- **Label check.** No AI needed. A record whose `yearLabel` disagrees with its `startYear` is
  flagged.
- **Relative timing.** "Two years after the arrival" can only be tracked if the link is a recorded
  relationship between events. The check proposes recording it when it finds one.
- **Leaving Canon.** Switching a piece away from Canon, or deleting it, lists the changes it caused
  and offers a one click revert for each. Nothing reverts silently.
- **Honest limit.** The AI can miss indirect claims. Each piece shows how many claims were found, so
  a gap in coverage is visible.

## Order of work

The master order is in `traveler-wiki-build-plan.md` ("Build order"). These are the steps this
file owns, with where each sits in that list.

- [ ] **S0.** Finish Gate 2C and apply the data (build order item 1). Staged: 149 records, none
      applied, waiting for approval. See `PHASE_2_DATA.md` and `staging/story-bible-review.md`.
- [x] **S1. Writing Studio** (item 2). Complete 2026-10-20. Editor: Lexical via `@lexical/react` (zero new deps). Routes: `/write` list + `/write/[code]` editor. Round-trip OK on W1-W3. `canonState` field live.
- [ ] **S2. Front end shell and rewire** (item 3). Icon rail, side panel, canvas layout, dashboard.
      Delivered with Phase 3 of the build plan (read pages on the Local API, retire the old data
      layer) and step W1 (world tree, infobox, home hub).
- [ ] **S3. Timeline and node map** (item 6). Phase 5 of the build plan (timeline, convergence, node
      map, relationship view), delivered with step W2 (eras, lanes). The node map reads the link index (step G1).
- [ ] **S4. AI foundation** (item 7). Spike, `lib/ai/`, context builder on the link index,
      `ai-proposals`, `ai-settings`, the Accept and Reject inbox, the `AI suggested` tag, hard rule 1 amendment.
- [ ] **S5. Story Builder** (item 8). `beats` collection, lane view, suggestion tray, promote to event.
- [ ] **S6. Ask AI anywhere and the prompts menu** (item 9). The button, per-section proposals, the
      tray on entry forms, `prompt-sets` and the prompts menu.
- [ ] **S7. Canon check and change tracking** (item 10). Phase 4 of the build plan (continuity port,
      item 5) comes first, then the claims ledger, backward check and revert by source.

Steps G1 and W1 to W6 are in `traveler-wiki-build-plan.md`. S1 comes first among these because it is the
cheapest big win and unblocks writing now.

## To verify before building

- AI SDK through the Gateway: structured output with the chosen Claude models, and real pricing.
- Whether the Studio editor can round trip Bobby's existing writing through Markdown with no loss
  (tested in S1 on the imported pieces).
- That the existing Continuity inbox and Field history collections fit the new flag kinds, or what
  fields they need.
- That the link index sync hooks run when the continuity check and accepted AI proposals write to
  records (they write through the Local API, so the hooks should fire; confirm in step G1).
- That the code pattern in `lib/codes.ts` takes the new prefixes (B, Y, M, P, H, D, N, A), added in step G1.

## Out of scope

Multi-user, public access, AI written chapters or scenes, automatic acceptance of any proposal.
