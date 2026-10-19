# Finish Phase 1: fix the CLI, verify, commit

Read this file fully. It answers your questions from the last status report and replaces the
"how do you want to handle it" choice. **Do only what is listed here.** Anything not listed (new
features, refactors, upgrades, extra dependencies, other phases) is out of scope. If something
unexpected blocks you, stop and report it, do not improvise a fix outside this file.

Environment: Windows, PowerShell, Node 24.21. Do not change the Node version. Never print
secrets. Do not use em dashes in anything you write. `npm run build` must pass before the commit.

---

## 1. The generate:importmap / generate:types failure: your three options, decided

**Decision: none of your three options first. Do this instead.**

The error you described (undici `kConstruct` symbol check, `Illegal constructor`) is a known tsx
problem. In the Payload CLI it happens when the project runs as CommonJS, because undici gets
loaded twice and its `new CacheStorage(kConstruct)` check fails. The documented workaround in the
Payload threads (issues 13290 and 15701) is to run the project as ESM by adding
`"type": "module"` to `package.json`. Your repo has no `type` field, and my first handoff said to add
it "if the Payload CLI needs it". It does.

Steps, in this order. Stop at the first one that works.

**A. Add `"type": "module"` to `package.json`.**
I checked the repo: there are no `.js` or `.cjs` config files, no `module.exports`, no `require(`,
no `__dirname` in the root files, `scripts/` or `lib/`. `next.config.mjs` and `postcss.config.mjs`
are already ESM. So this should not break anything. Then run, one at a time:

```
npm run generate:importmap
npm run generate:types
npm run build
```

If `generate:importmap` and `generate:types` both succeed and the build passes, go to step 2.
If adding `"type": "module"` breaks the build or any existing file, undo that one change and go to B.

**B. SWC mode.** Payload documents this as the supported alternative to tsx. Install
`@swc-node/register` as a dev dependency, then run:

```
npx payload generate:importmap --use-swc
npx payload generate:types --use-swc
```

SWC can fail on some imports. If it also fails, stop and go to C.

**C. Stop and report.** Do not downgrade Node, do not write a preload shim, do not patch undici or
tsx, and do not hand-edit generated files. Paste the exact error from A and B (secrets redacted)
and wait for me.

**Do not use a lower Node version and do not write a shim. Do not leave the placeholder
`importMap = {}` in place as a "good enough" result.** Reason: that file is hand-written by you. The real file is
generated, and the rich text editor fields (`body`, `draftText`, `text` on writing) need real entries
in it. Payload also regenerates it on dev startup, so after step A or B the file must contain real
entries (Lexical ones included). Show me the first 15 lines of the generated
`app/(payload)/admin/importMap.js` as proof, and confirm `payload-types.ts` now exists.

---

## 2. Verify (the ten Phase 1D items)

You said the REST calls failed because `autoLogin` only sets a browser cookie. Correct, and
Payload's docs say not to rely on it for scripts. Authenticate like this instead:

1. Start `npm run dev`.
2. Log in over REST with the same dev credentials the config uses and keep the cookie.
   Payload sets an HTTP-only cookie on login. In PowerShell use `curl.exe`, not the `curl` alias:

```
curl.exe -s -c cookies.txt -H "Content-Type: application/json" -d "{\"email\":\"me@traveler.local\",\"password\":\"dev-only-password\"}" http://localhost:3000/api/users/login
curl.exe -s -b cookies.txt http://localhost:3000/api/users/me
```

   Use `-b cookies.txt` on every later call. Delete `cookies.txt` when finished and make sure it is
   not committed (add it to `.gitignore` if needed).
3. If the login returns 401, the dev user does not exist or has a different password. Do not
   change the config to work around it. Report what `/api/users` count says and stop.

Then run the ten items from `NEXT_SESSION_PROMPT.md` section 1D with real output for each:
admin loads without a login screen, sidebar groups and all collections present, one record per
collection with codes C1, L1, E1, I1, U1, F1, R1, G1, K1, S1, W1, X1 and slugs, `UNK` exists as T1
and cannot be deleted, a record tagged UNK appears in `GET /api/unk`, `GET /api/codes/C1`,
`POST /api/codes/resolve` with `{"text":"C1 went to L1 with I1 and Z9"}` (Z9 listed as unknown),
`GET /api/codes/C1/links`, codes permanent (change attempt ignored, delete C2 then next character is
C3), two factions in the same culture, a `writing` record's `plainText` filled in, and the new
database table list and row counts with the old database unchanged (47 entries, 113 events,
38 event links, 4 relationships).

Add three checks that matter for the rich text fields:
- Open the create form for a character in `/admin` and confirm the **Notes** rich text field renders
  and accepts typing. A broken import map shows up here as a "component not found" error.
- Save a record with text in a rich text field and read it back through the API.
- Check the browser console and the dev server output for errors while doing the above, and report
  any that appear.

Watch the known trouble spots from the first handoff: admin form refusing to save before the code
exists, slug generation order, polymorphic relationship fields, Next 16 async params. Fix problems
**inside the starter files** and mirror the fix into `payload-starter/`. Do not redesign anything.

When finished, delete the test records (or tell me which remain).

---

## 3. Commit

1. Add to `.gitignore`: `cookies.txt`, `dev-server.log`, `dev-server-err.log`.
2. `AGENTS.md` is generated by `next dev`. Commit it, as the note at the bottom of `CLAUDE.md` says.
3. Make sure `payload-types.ts` and the generated import map are committed (they are generated
   source files, not secrets).
4. `npm run build`, zero errors. Then commit Phase 1 in sensible commits (route restructure and
   Payload install, starter copy, verification fixes). Do not commit `.env`, `.env.local` or
   anything with a connection string.
5. Update `BUILD_GUIDE.md` ("Current state" and "Next up") and tick the Phase 1 boxes in
   `traveler-wiki-build-plan.md`.

## GATE 1

Stop. Report: what changed, the output proving each of the ten items plus the three rich text
checks (secrets redacted), the first lines of the generated import map, which of A or B fixed the
CLI, and anything you had to change in the starter. Do not start Phase 2.
