# Master handoff: clean up, finish Phase 1, then load the data

This file replaces every earlier handoff. Read it fully, then `CLAUDE.md`,
`traveler-wiki-build-plan.md` and `BUILD_GUIDE.md`. Work in the order below and **stop at every
GATE** until Bobby says go. Do only what is written here. If something unexpected blocks you, stop
and report the exact error and code. Do not improvise a fix, and do not start a later part early.

## Rules for the whole session

1. Never print secrets: connection strings, tokens, passwords, the secret key. Never write Bobby's
   login into any file, script, log or commit. Bobby gives you his login in his message when you
   need it. Use it only in the login call.
2. The old database (`DATABASE_URL`) is read-only. Never run Payload, a migration or a push
   against it. Payload uses `PAYLOAD_DATABASE_URL` only.
3. **Bobby runs the dev server** in his own VS Code terminal on port 3000. Do not start, restart or
   kill any dev server or Node process, and do not use `Start-Process` or `taskkill`. If a restart
   is needed, tell Bobby.
4. Expected and harmless: the old pages (for example `/`) throw `relation "continuity_flags" does
   not exist`, because the old frontend reads the old database, which never had migration 0003.
   Do not apply any migration, do not edit those pages, do not try to fix it. It goes away when the
   frontend is rewired later. Verify through `/admin` and `/api` only.
5. PowerShell 5.1 notes: use `Invoke-RestMethod`, not `curl.exe`. Build bodies as hashtables piped
   to `ConvertTo-Json -Compress`. Keep the session in memory with `-SessionVariable` and
   `-WebSession` inside one script block, and log in again in each new script block. Never name a
   helper function `Del`, `Get`, `Post` or `Patch`: PowerShell aliases hijack those names.
   Use distinct names such as `Api-Delete`.
6. No em dashes in anything you write. `npm run build` must pass before every commit.

---

## Part A: clean up first (do all of it before anything else)

1. Delete `cookies.txt` and the two dev server log files (`dev-server.log`, `dev-server-err.log`).
2. Add `cookies.txt`, `dev-server.log` and `dev-server-err.log` to `.gitignore`. (`.env.backup.local`
   is already covered by `.env*.local`.)
3. Create `docs/handoffs/` and move `PHASE_1_FINISH.md` and `PHASE_1_RESUME.md` into it. They are
   superseded by this file. Keep `PHASE_2_DATA.md` at the repo root.
4. Confirm no throwaway scripts remain in `scripts/` (only `ingest.ts` and `test-continuity.ts`
   should be there) and that `@neondatabase/serverless` is only present because the old frontend
   already used it. Do not add it to anything new.
5. Check nothing sensitive is about to be committed: search every changed and untracked file for
   connection strings (`postgres://`, `postgresql://`), the secret key value, and the login. Show me
   the result as "none found" or the file names only (never the values).
6. Run `npm run build`. It must pass. If building conflicts with the running dev server, tell Bobby
   to stop the server, run the build, and ask Bobby to start the server again.
7. Commit the Phase 1 work in sensible commits (Next and Payload install, route restructure,
   starter copy and fixes, generated `payload-types.ts` and import map, `AGENTS.md`, docs). Do not
   commit anything ignored.

Report Part A in a few lines and continue straight into Part B (no gate here).

---

## Part B: finish the Phase 1 verification

Already proven (do not redo): the CLI works after `"type": "module"`, the build passes, `autoLogin`
signs Bobby in through `DEV_LOGIN_EMAIL`, REST login works, one record was created in every
collection with codes C1, L1, E1, I1, U1, F1, R1, G1, K1, S1, W1, X1, the second faction shares the
culture, code changes are ignored, deleting C2 then creating a character gave C3, `plainText` is
filled on writing, `/api/unk`, `/api/codes/C1` and `/api/codes/C1/links` work.

Still to do, in order:

1. Confirm the server answers on port 3000 (Bobby started it). Then log in (rule 5).
2. **UNK delete.** Try to delete the UNK tag. Expect HTTP 400 with the message "UNK is a built-in
   tag and cannot be deleted." Show the status and message.
3. **Code resolve.** `POST /api/codes/resolve` with text `C1 went to L1 with I1 and C999`. Expect
   C1, L1, I1 in `found` and `C999` in `unknown`. (`Z9` is not a valid prefix, so it is ignored by
   design.)
4. **Database proof (item 10).** Use `npx payload run` on a throwaway script, which loads env files
   the same way Next does, and delete the script afterward. New database: list the tables in
   schema `public` and the row count of each Payload table, using `payload.db.drizzle.execute` with
   `sql` from `@payloadcms/db-postgres/drizzle`. Old database: use the `pg` package with
   `process.env.DATABASE_URL`, read-only `SELECT count(*)` only. Expect 47 entities, 113 events,
   38 event_links, 4 relationships, and no continuity tables. Print table names and counts only.
5. **Wait for Bobby.** He is checking the rich text fields in the admin by hand. Do not delete
   anything until he says "browser checks done".
6. **Reset to a clean start.** After he says so: delete every test record in reverse dependency
   order (relationships, writing, stories, events, factions, cultures, items, lore, languages,
   races, locations, characters). Keep the `UNK` tag (T1) and Bobby's user. Then, last, show the
   counters table, PATCH `next` back to `1` for every prefix except `T`, and show the table again.
   Do not delete counters rows. Confirm every collection is empty apart from tags (1) and users (1).
7. Update `BUILD_GUIDE.md` ("Current state", "Next up") and tick the Phase 1 boxes in
   `traveler-wiki-build-plan.md`. `npm run build`, commit.

**GATE 1.** Stop with a short report: output for steps 2 to 6 (secrets redacted), the first lines
of the generated import map, and every change you made to the starter files. Wait for Bobby.

---

## Part C: load the data (only after Bobby says Gate 1 passed)

Do exactly what `PHASE_2_DATA.md` says. In short: stage, report, gate, apply, with every record
idempotent and every guess tagged `UNK`.

- **2A** migrate the old database (47 entries, 113 events, 38 event links, 4 relationships). Sero
  must come out as C1, which is why Part B resets the counters. **GATE 2A.**
- **2B** import the story catalog (40 stories). **GATE 2B.**
- **2C** mine the Consolidated Story Bible, the Gap Analysis and the draft files, skip the AI-written
  parts of the chat transcript and the RPG files, and run the canonical coverage check.
  **GATE 2C.**

At each gate show the staging files and review reports first. Apply only after approval, then run
again to prove nothing duplicates.

---

## Not in this session

The timeline view, node map, relationship views, frontend rewire, continuity port, creative
assistant, export and deploy are later sessions. Do not start them. When Part C is finished, update
`BUILD_GUIDE.md` and list the exact next steps.
