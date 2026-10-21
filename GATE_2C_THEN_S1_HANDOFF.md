# Handoff for Claude Code: apply Gate 2C, read the docs, start S1

Scope is strict. Do only what is written here. If anything blocks you, stop and report the exact error. Do not improvise around it.

## Rules

1. Never print secrets. Do not echo `.env` or any `.env.*` file. Do not put Bobby's login in any file, script, log or commit.
2. Do not touch `DATABASE_URL`. Payload uses `PAYLOAD_DATABASE_URL` only.
3. Bobby runs the dev server. Do not start, restart or kill Node or any dev server.
4. PowerShell 5.1: use `Invoke-RestMethod`. Do not use `Start-Process` or `taskkill`.
5. No em dashes and no "--" in any prose you write (docs, comments, reports). Record names that already contain an em dash in the staged data are data, keep them exactly.
6. Hard rule 1: no AI-written prose, ever. All record text is copied verbatim from `staging/story-bible.json`.
7. `npm run build` must pass before any commit. Never commit `.env` files. Do not commit unless Bobby asks.
8. Never edit existing records, with one exception: the single Aldric alias edit in Part A step 8.
9. Do not start S2 or any later step.

## Part A: apply Gate 2C

Inputs: `staging/story-bible.json`, `staging/story-bible-review.md`, `PHASE_2_DATA.md` (2C rules). Pattern to follow: `scripts/import-story-catalog.ts` (`getPayload`, `--apply` flag).

Bobby's approval covers the staged defaults: MAREN as a `locations` record, "The Search for Succession" kept with its note, the 9 cross-referenced overlap pairs, and the single Aldric alias edit on C4. Do not apply the "canon refinements" notes.

1. Read the three input files above fully.
2. Write `scripts/import-story-bible.ts`. Dry run by default, writes only with `--apply`.
3. Key uniqueness check before anything else: the `source_doc_id` is shared across many records, so the idempotency key is (collection, source_doc_id, name or title). Verify these keys are unique inside the staged file. If not, stop and report the duplicates.
4. Pre-apply re-check against the live DB: for every staged record, match name and aliases against existing records in the same collection. Any match is skipped and listed in the report. Do not merge.
5. Create records in source-document order. Expected new story codes are S41 to S73. Read the `counters` rows first and report any mismatch before applying.
6. Field handling:
   - Stories: `format` is null for all 33, leave it unset. Stories use `stage`, not `status`. Handle null `status` on other collections by leaving it unset.
   - Prose goes verbatim into `body` via the same Lexical conversion used in `scripts/migrate-legacy.ts` (`textToLexical`).
   - `writing` records use `text`, and link `linked_story` S1 where the staged data gives it.
   - Every record is tagged UNK with its `reviewNote`.
7. Run order: dry run, show counts. Then `npx tsx scripts/import-story-bible.ts --apply`. Then run `--apply` a second time and prove it creates 0 new records.
8. The one permitted edit to an existing record: add the alias "Aldric Chaudry" to C4 (Bard Original). Record before and after values.
9. Report: counts from both runs; the expected total of 149 (3 characters, 1 location, 5 cultures, 2 factions, 102 lore, 33 stories, 3 writing); any skipped matches; the counter values before and after; five sample records with their tags and `reviewNote`.
10. Check `GET /api/unk` includes the new records (ask Bobby to confirm the dev server is up if it is not).

If the totals do not equal 149 after skips are accounted for, stop and report. Do not proceed to Part B.

## Part B: read the documents

Read fully, in this order: `CLAUDE.md`, `traveler-wiki-build-plan.md` (v3, including Build order), `docs/PLAN_WRITING_AND_AI.md`, `BUILD_GUIDE.md`. Then state in two or three sentences where the project stands and that the current step is S1.

## Part C: start S1 (Writing Studio)

Follow `STUDIO_HANDOFF.md` exactly. Its rule "Start this only after Bobby tells you Gate 2C is applied" is satisfied by this handoff once Part A succeeds and is reported. Build only what `STUDIO_HANDOFF.md` lists: `canonState` on `Writing`, `/write` and `/write/[code]`, the editor, `@` mentions, autosave, the Markdown round trip test. Stop at GATE S1 with the report that file specifies, including the browser checklist for Bobby, and wait for "studio checks done".

## End of session

Update `BUILD_GUIDE.md` Current state and Next up: Gate 2C applied (with the counts), S1 built and awaiting Bobby's checks. Do not commit unless asked.
