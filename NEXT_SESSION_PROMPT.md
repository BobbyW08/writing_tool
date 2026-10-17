# Handoff for Claude Code: move The Traveler onto Payload

Read this whole file before doing anything. Then read `CLAUDE.md`, `BUILD_GUIDE.md`, and
`traveler-wiki-build-plan.md`, in that order. The plan has the full collection specs, the ID codes,
the UNK tag, the migration rules and the phases. This file is the ordered work for this session.

Work in phases. **Stop at each GATE, show me the evidence, and wait for my go-ahead.** Do not start
a later phase on your own.

---

## Ground rules for this whole session

1. The hard rules in `CLAUDE.md` apply. In particular: Payload gets its own database, codes are
   permanent, imports upsert and never duplicate, and any guess gets the `UNK` tag plus a
   `reviewNote`.
2. **The old database is read-only.** `DATABASE_URL` in `.env` points at the old Neon database that
   holds all the real canon. Never run Payload against it, never run a migration or push against it,
   and never change it. Payload uses the new Neon project only, through `PAYLOAD_DATABASE_URL`.
3. **Never print secrets.** Redact connection strings, passwords and keys in everything you show me
   (show the host name at most). Never commit `.env`, `.env.local` or anything that holds a secret.
4. Do not use em dashes anywhere in files or messages you write. Use periods, commas, or "and".
5. `npm run build` must pass with zero errors before every commit.
6. Update `BUILD_GUIDE.md` ("Current state" and "Next up") at the end of each phase.

---

## Phase 0: preserve the current state

1. Run `npm run build` on the working tree as it is. If it fails, tell me what broke before touching
   anything.
2. Check `.gitignore`. Add `.claude/settings.local.json` and `docs-archive-pre-payload/` is fine to
   commit (it is the old docs). Make sure `.env`, `.env.local` and `.env*.local` stay ignored.
3. Commit everything in the working tree in sensible commits: the continuity feature
   (`app/continuity/`, `app/snippets/`, the six components, `lib/continuity/`, the new actions and
   data files, migration `0003` files), the rewritten docs, `payload-starter/`, and
   `docs-archive-pre-payload/`. Then tag the final commit `pre-payload`.
4. Check the old database (read-only queries only): does the `snippets` table exist, and how many rows
   are in `snippets`, `continuity_flags`, `field_history`, `snippet_confirmations`? **Do not apply
   migration `0003`.** If the tables do not exist there is nothing to migrate for them, and the
   migration script will skip them. Report what you find.

**GATE 0:** show me the commit list, the tag, and the table check.

---

## Phase 1: Neon, Payload, and a working admin

### 1A. Neon (new project, Payload only)

My new Neon project: org `org-wandering-waterfall-25323772`, project `young-bar-40697402`,
branch `production`, service `postgres`.

Before you run anything from Neon, protect the old connection:
- Copy `.env` to `.env.backup.local` (this name is already git-ignored).
- Neon's tooling writes env vars into `.env` when that file exists. `.env` currently holds the OLD
  `DATABASE_URL` and `AI_GATEWAY_API_KEY`. Do not let the new project overwrite them.

Then run, in order:
1. `npm i -g neon@latest`. If that fails, use `npx neon@latest` in place of `neon`. If a command opens
   a browser sign-in, tell me to finish it there. If that times out or fails, ask me to run
   `neon login`, then retry.
2. In the project root:
   `neon init -y --org-id org-wandering-waterfall-25323772 --project-id young-bar-40697402 --branch production --services postgres`
3. `neon deploy`. It provisions the services in `neon.ts` and pulls env vars into `.env.local`, or
   into `.env` if it exists.

After step 3, fix the environment so nothing is mixed up:
- Diff `.env` against `.env.backup.local`. If anything changed, restore the old `DATABASE_URL` and
  `AI_GATEWAY_API_KEY` exactly.
- Whatever variable names Neon wrote for the new database (in `.env` or `.env.local`), rename them so
  the new connection is `PAYLOAD_DATABASE_URL` (and keep an unpooled variant under a `PAYLOAD_`
  name if Neon provides one and a tool needs it). Make sure **no** `DATABASE_URL` for the new project
  remains in `.env.local`, because Next loads `.env.local` over `.env` and would silently point the
  old app and the migration at the wrong database.
- Prove the two are different databases by comparing host names only. Show me both hosts, nothing else.
- Update `.env.example` with the new names (no values).
- Commit `neon.ts` if Neon created it (it holds no secrets). Check it before committing.

Wire Neon into the app **only through Payload's database adapter** (next section). Use the installed
Neon agent skills and the Payload docs to decide the driver and connection style (pooled string for
the app, unpooled for migrations if needed). Tell me what you chose and why.

### 1B. Next.js and Payload packages

- Update Next.js to **16.3.3 or newer** (the latest patched 16.x). Confirm `react`, `react-dom` and
  `typescript` still satisfy it.
- Install the latest **stable 3.x** of Payload: `payload`, `@payloadcms/next`,
  `@payloadcms/db-postgres` (or `@payloadcms/db-vercel-postgres` if the Neon skills and Payload docs
  point to it for Neon on Vercel), `@payloadcms/richtext-lexical`, plus `sharp` and `graphql`. Every
  `@payloadcms/*` package must be at exactly the same version as `payload`. Do not install any
  canary, beta or 4.x build. Check `npm view payload dist-tags` and the Payload installation docs for
  the supported Next range.
- Add npm scripts: `payload`, `generate:types`, `generate:importmap`.

### 1C. Route restructure and starter

- Use the Payload blank template as the reference for the `(payload)` route group (layout, admin
  catch-all page, API route, not-found, import map, styles). Adapt it for Next 16 (async params).
- Create `app/(payload)/` from it. Move the existing frontend (`app/layout.tsx`, `app/page.tsx`,
  `app/globals.css`, and every existing route folder) into `app/(app)/`. No top-level
  `app/layout.tsx` may remain. Keep every existing page working against the old database for now.
- Wrap `next.config.mjs` with `withPayload`. Add `"@payload-config": ["./payload.config.ts"]` to the
  `tsconfig.json` paths. If the Payload CLI needs it, add `"type": "module"` to `package.json` and
  make sure nothing else breaks.
- Copy `payload-starter/src/*` to the repo root: `payload.config.ts`, `collections/`, `fields/`,
  `endpoints/`, and the three files in `lib/` (`codes.ts`, `relationshipTypes.ts`, `legacy.ts`).
  This starter typechecks but has never run against a database, so expect to fix small things. Fix
  them in the root copy, and mirror any change back into `payload-starter/` so the two match.
- Set `PAYLOAD_SECRET` to a generated random value in `.env.local` (generate it with node, never
  print it).
- Dev auto-push is allowed in this phase because the new database is empty. Once real writing or
  migrated data exists, switch to migrations (plan, Phase 8) and never run a push that could drop data.
- Run `npm run generate:types` and `npm run generate:importmap`.

### 1D. Prove it works

Run `npm run build` (must pass), start the app, then show real evidence for each of these:

1. `/admin` loads with no login screen in development.
2. The sidebar groups appear (World, Story, Continuity, System) with every collection.
3. Create one record in each collection and show the assigned codes: C1, L1, E1, I1, U1, F1, R1,
   G1, K1, S1, W1, X1. Confirm slugs were generated.
4. The `UNK` tag exists automatically (code T1) and **cannot be deleted** (try it).
5. Tag a record `UNK`, fill its "Check this" note, then call `GET /api/unk` and show it in the result.
6. `GET /api/codes/C1` returns the character. `POST /api/codes/resolve` with
   `{"text":"C1 went to L1 with I1 and Z9"}` returns the three entries and lists `Z9` as unknown.
   `GET /api/codes/C1/links` returns the link you created.
7. Codes are permanent: try to change C1's code through the API and show it is ignored. Create C2,
   delete it, create another character, and show it is C3 (a code is never reused).
8. A new faction can be placed inside a culture (U1), and a second faction can be placed in the same
   culture.
9. A `writing` record with text gets its hidden `plainText` filled in.
10. Prove the data really lives in the new Neon database: run a query through the Neon CLI or a short
    script against `PAYLOAD_DATABASE_URL` and show the table list and the row counts. Then show the old
    database is untouched (same table list and counts as before).

Likely trouble spots to watch: the admin form refusing to save a new record before its ID exists
(the ID field is deliberately not marked required), hook order for slug generation, polymorphic
relationship fields, and Next 16 async params in the Payload route files. Fix, do not work around.

Delete the test records when finished (or tell me they are still there), so I start clean.

**GATE 1: the admin is usable for writing.** Stop here and report. Include: what changed, the exact
command output that proves each item above (secrets redacted), and anything that failed or that you
had to change in the starter.

---

## Phase 2: bring the data across (only after I say go)

Full rules are in the plan under "Migration from the old database" and "Story catalog import". Build
both scripts, always dry run first, and wait for my review before `--apply`.

`scripts/migrate-legacy.ts`
- Reads the old database (read-only, via `DATABASE_URL`) and writes to Payload through the Local API.
  Load env files so both `.env` and `.env.local` are read, and fail loudly if the two database hosts
  are the same.
- Maps old types to new collections (`lib/legacy.ts`): culture entries go to `cultures`, artifact and
  item entries go to `items`, factions start empty.
- `fields` become `details` rows in the same order. `sort_order` becomes `startYear`. `year_label`
  stays `yearLabel`. `event_links` become `involves`. Parents are resolved in a second pass.
- Idempotent: every record stores `legacyId`. Re-running updates and never duplicates.
- Numbering: in source-document order (Sero is C1), then anything created in-app alphabetically.
  The dry run prints the full old-name to new-code list and writes `legacy-code-map.json`.
- Wiki-links `[[Characters#Giana|Giana]]` become `Giana (C2)` using the same slug logic as the old
  ingestion. Any record whose text was rewritten gets `UNK` plus a `reviewNote` listing the changed
  links. Unresolvable links (the known "Bard (The Traveler - Novel)" typo) stay as plain text and are
  listed in the report.
- Long text moving into rich text fields goes through the Lexical Markdown converter.
- Skips snippets, flags, history and compilations if their tables do not exist or are empty.
- Verification: counts must match the old database (47 entries, 113 events, 36 links, 4
  relationships) and five entries plus five events must match field by field. Show me the comparison.

`scripts/import-story-catalog.ts`
- Reads `source-docs/ideas/Sero_Story_Catalog.md`: 40 stories, seven eras, the `Age` and `Floating`
  metadata lines, bullets as `beats`, the `Characters:` line as `involves`.
- Matches placeholder names against existing characters first. Unmatched names become new characters
  with status `needs_name` and a generated `gapPrompt`.
- Every guess (a name matched to an existing character, an era or format interpretation, a floating
  story's suggested range, `Short Story/Novella`) gets `UNK` plus a `reviewNote`.
- Dry run writes `story-import-review.md`: each story with its matched and unmatched names, plus any
  existing event whose title closely matches a story, so I can decide what links with `dramatizes`.
- Idempotent on `sourceDocId` and `catalogNumber`.

**GATE 2:** show me the dry-run output, `legacy-code-map.json`, and `story-import-review.md`. After I
approve, run with `--apply`, run it a second time to prove nothing duplicates, and show the counts.

---

## Not this session

Phase 3 onward (rewire the frontend, retire the old code, port the continuity check, views, export,
deploy) are separate sessions. Do not start them. At the end, update `BUILD_GUIDE.md` and list the
exact next steps.
