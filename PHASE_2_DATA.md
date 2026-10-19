# Phase 2: bring all the data in

**Do not start this until Bobby says Gate 1 is passed.** Same rules as before: do only what this
file says, stop at every gate, never print secrets, no em dashes, `npm run build` clean before any
commit. Read `CLAUDE.md` and `traveler-wiki-build-plan.md` (legacy migration and story catalog
sections) first. Hard rule 1 applies to everything below: **no AI-written prose enters the
database.** You read and sort. You never rewrite.

Goal: get as much of the existing material into Payload as possible, with every guess tagged `UNK`
so Bobby can review it from `GET /api/unk` and the admin.

---

## How every import in this phase works (the pattern)

1. **Stage.** Parse or read the source and write a staging file, `staging/<source>.json`, listing
   each proposed record: collection, name, the verbatim source text, `sourceDocId`, matched
   existing record (if any), proposed tags, and the reason for any guess. Nothing touches the
   database yet.
2. **Report.** Write `staging/<source>-review.md` so Bobby can read it in a few minutes: counts per
   collection, every guess, every match, everything skipped and why.
3. **Gate.** Stop. Bobby approves or corrects.
4. **Apply.** Only after approval, run the apply script. It is idempotent: records are keyed on
   `sourceDocId` (format `<file>#<heading-slug>`), so a second run changes nothing. Show the counts
   from the first and second run.

Rules for the records themselves:
- Text is copied **verbatim** from the source into `body` (through the Lexical Markdown converter) or
  `details`. Do not paraphrase, summarize, clean up or "improve" it. Leave `summary` empty unless the
  source has its own one-line description.
- Classification is a guess (is this a culture, a faction, a piece of lore, a location?). Every
  classified record gets `UNK` plus a `reviewNote` that says what you decided and why, and names the
  source file and heading.
- Never overwrite or edit an existing record. If a name matches an existing record (name or alias,
  ignoring case), do not create a duplicate and do not change the existing one. List it in the
  review report as a match with the differences, and let Bobby decide.
- New records you create from sources default to status `in_development`. Records that are only a
  name or a placeholder get `placeholder` or `needs_name` and a generated `gapPrompt`.
- Codes are assigned automatically in the order records are created. Create in source-document
  order.
- Reuse tags: only `UNK` unless an obvious tag already exists. Do not invent a tag system.

---

## 2A: the old database (as already specified)

Do exactly what section "Phase 2" of `NEXT_SESSION_PROMPT.md` says for `scripts/migrate-legacy.ts`,
with these corrections: the old database has **38** event links, not 36, and it has no culture or
faction entries, so those collections start empty and are filled by 2C. Sero must be C1, so the
test records and the counters must have been cleared first (check the counters table before
running). Follow the stage, report, gate, apply pattern above. **GATE 2A.**

## 2B: the story catalog (as already specified)

`scripts/import-story-catalog.ts` for `source-docs/ideas/Sero_Story_Catalog.md` exactly as in
`NEXT_SESSION_PROMPT.md`. Run it after 2A so character names can match migrated characters. **GATE 2B.**

## 2C: mine the rest of the documents

These files hold material the old database does not:

| File | What it holds | What to do |
|---|---|---|
| `ideas/Consolidated-Story-Bible.md` (2,567 lines) | Section 1 timeline, 2.1 locations, 2.2 people, 2.3 events and history, 2.4 beliefs, cultures, societies and religions, 3 gaps, 4 ideas, then a long chat transcript | See below |
| `ideas/Sero-Worldbuilding-Gap-Analysis.md` | A checklist where each line is marked decided, not applicable, or "?" needs a decision | See below |
| `drafts/The-Traveler-1-Origins.md`, `drafts/The-Traveler-Introduction.md` | Bobby's own draft prose | Import as `writing` records |
| `canonical/*.md` | Already loaded into the old database | Coverage check only |
| `rpg-ai-game-concept/*` | Game design material, not canon | Skip. List the files in the report. Do not decode the `.b64` file |

**Consolidated Story Bible, sections 1 to 4** (everything before the chat transcript begins at
the heading "Add to Story Bible"):
- 2.4 is the main source for **cultures, factions and lore** that the old database lacks. Make one
  record per clearly named group or belief system. A culture goes in `cultures` (U). A faction,
  organization, order or government goes in `factions` (F) with `culture` set only when the text
  states the connection. Beliefs and religions with no group attached go in `lore` (K) with a
  `category`. Every one of these is a guess, so every one is `UNK`.
- 2.1 locations, 2.2 people and 2.3 events: create records only for items the old database does
  not already have. Use the match rule above. Events keep `startYear` empty unless the source gives
  an unambiguous number, and keep the source's wording in `yearLabel` exactly as written (for
  example "Year ~150-350"). Never convert a vague label into a number without `UNK`.
- Section 3 (gaps) and section 4 (ideas): gaps become `placeholder` records with the question in
  `gapPrompt`. Story ideas follow the same rules as the catalog import, and any that duplicate a
  catalog story are listed as matches, not created.

**Gap Analysis.** Lines marked decided become `lore` records with the decision text verbatim.
Lines marked "?" become `placeholder` records whose `gapPrompt` is the question text verbatim. Lines
marked not applicable are skipped but listed. All `UNK`.

**The chat transcript at the end of the Bible.** It is a recorded conversation with an AI. Treat it
carefully:
- Everything under a heading that starts "Claude responded" is AI-written. **Do not import any of
  it.** List the headings you skipped.
- Everything under "You said" is Bobby's own words. Most are notes or instructions: skip those. Text
  that is clearly his draft narrative (for example quoted opening lines) becomes a `writing` record
  of kind `snippet`, `UNK`, with the surrounding context in `reviewNote`.
- Names the AI suggested as placeholders in that conversation (the father, the shop owner) are
  created as characters with status `placeholder`, `UNK`, and a `reviewNote` that says the name was
  suggested in the chat and Bobby has not confirmed it. Do not treat them as canon.

**Drafts.** One `writing` record per file, kind `chapter`, `text` imported through the Markdown
converter, no edits. Link to a `stories` record only if there is an obvious match, and tag `UNK` if
you do.

**Canonical coverage check.** For each `canonical/*.md` file, list every heading that has no
matching record after 2A. Report only. Do not create anything from it unless Bobby asks.

**Relationships.** Do not extract relationships in 2C. Report how many explicit relationship
statements you noticed (for example "X is Y's father") so Bobby can decide whether to run a
separate, reviewed relationships pass.

**GATE 2C:** stop with the staging files, the review reports, and these counts: records proposed
per collection, matches to existing records, records that would be tagged `UNK`, chat headings
skipped, files skipped. Wait for Bobby. After approval, apply, re-run to prove nothing duplicates,
and show the counts and a sample of five created records with their tags and `reviewNote`.

---

## Not in this phase

The timeline view, node map, relationship views, frontend rewire and continuity port are later
phases. Do not start them. At the end update `BUILD_GUIDE.md` and list the exact next steps.
