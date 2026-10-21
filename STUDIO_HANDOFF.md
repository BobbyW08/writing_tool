# Handoff S1: the Writing Studio

Start this only after Bobby tells you Gate 2C is applied. Read this file fully, then `CLAUDE.md`,
`docs/PLAN_WRITING_AND_AI.md` and `BUILD_GUIDE.md`. Do only what is written here. If something
blocks you, stop and report the exact error. Do not improvise a fix, and do not start anything from
the later steps of the plan.

## Rules for this session

1. Never print secrets. Never write Bobby's login into any file, script, log or commit. If you need
   to log in over REST, Bobby gives the login in his message and it goes only into the login call.
2. The old database (`DATABASE_URL`) is not touched. Payload uses `PAYLOAD_DATABASE_URL` only.
3. Bobby runs the dev server on port 3000. Do not start, restart or kill any dev server or Node
   process. Do not use `Start-Process` or `taskkill`. If a restart is needed, tell Bobby.
4. The old pages under `app/(app)` still read the old database and some throw
   `relation "continuity_flags" does not exist`. That is expected. **The Studio must not import
   anything from `lib/db`, `lib/data`, `lib/actions` or `lib/continuity`.** It uses the Payload Local
   API only (`getPayload({ config })` in server components and server actions).
5. PowerShell 5.1: use `Invoke-RestMethod`, not `curl.exe`. Never name a helper function `Del`,
   `Get`, `Post` or `Patch`.
6. No em dashes in anything you write. `npm run build` must pass before every commit. Never commit
   `.env`, `.env.local` or any secret.
7. Hard rule 1 holds: no AI anywhere in this step. The Studio has no AI features.

## What you are building

A front end for writing: a blank page with almost no chrome, saving to the existing `writing`
collection. The text must look identical in the Payload admin afterward.

## Part 1: the Draft, Canon, Set aside state

1. In `collections/entities.ts`, add a field to `Writing`:
   `canonState`, `select`, default `draft`, options `draft` (label "Draft"), `canon` ("Canon"),
   `set_aside` ("Set aside for later"), `admin.position: 'sidebar'`, with a description:
   "Draft and Canon are included in continuity checks. Set aside is excluded." This is separate
   from the entry `status` field. Do not reuse it.
2. Mirror the change into `payload-starter/src/collections/entities.ts`.
3. Run `npm run generate:types`. Existing writing records take the default `draft`.
4. Do not change the continuity hooks or `syncPlainText`. Using `canonState` in the check is Phase 4.

## Part 2: routes

Under `app/(app)/write/`:

- `/write` lists every writing record: title, kind, story, state badge, word count, last edited.
  Grouped by story with "No story" last. Filter by state. A "New" button creates a Draft and opens
  it. Records in Set aside are shown in a collapsed group at the bottom.
- `/write/[code]` is the editor for one record (code like `W3`). Unknown code shows a not found page.

Put helpers in `lib/studio/` (queries, server actions, converters). Use the existing shadcn
components and theme tokens from `app/(app)/globals.css`. Do not restyle the Payload admin.

## Part 3: the editor

1. **Do not hand roll a text editor.** Use one well maintained editor library that supports
   paragraphs, headings, bold, italic and block quotes, handles markdown shortcuts, and supports a
   custom `@` suggestion. Check what is already installed first and prefer the smallest option. Report
   which you chose and why in two lines.
2. **Storage.** The editor works in Markdown. On load, convert the record's Lexical `text` to
   Markdown. On save, convert Markdown back to Lexical with Payload's Markdown converter and write
   `text`. The existing `syncPlainText` hook fills `plainText`.
3. **Round trip test before relying on it.** For every existing writing record, convert Lexical to
   Markdown and back, then compare `plainText` before and after. Report match or mismatch per record
   and show the first mismatch if any. Do not write the converted text back during this test. If any
   mismatch changes the words (not just whitespace), stop and report.
4. **Fields on the page:** title (the `name`), kind, story, story year (`startYear`), state switch
   (Draft, Canon, Set aside for later). Kind, story and year sit in a small collapsible strip so the
   page itself stays blank.
5. **`@` mentions.** Typing `@` opens a search over every world collection, matching name, alias or
   code, showing the code and collection, 8 results. Choosing one inserts the record's **name as plain
   text** and adds the record to the piece's `mentions` list on save. Typing a code like `C5`
   directly still works in read views and needs no special handling.
6. **Saving.** Autosave about 2 seconds after typing stops. Show "Saved", "Saving" or "Could not save"
   with the time. On failure, keep the text in the editor, retry, and warn before the tab closes if
   anything is unsaved. Never replace the editor's content with a server response while Bobby is typing.
7. **Look.** One centered column about 720px wide, a serif body font, generous line height, light and
   dark following the theme. A focus mode toggle hides everything except the page. A small link goes
   to the record in `/admin`, and a link goes back to `/write`. A live word count sits at the bottom.
8. **State switch.** Changing state saves immediately. Show a one line note when switching away from
   Canon: "Changes already approved from this piece stay in place. Review them in the Continuity
   inbox." (The review list itself is built later. Only show the note.)

## Part 4: verify

1. Use a throwaway script run with `npx payload run` (delete it afterward) or the Local API from a
   server action. Do not hand parse `.env.local`.
2. Before testing, record the current value of the `W` counter. Create one test record through the
   Studio code path named `ZZ test piece`. Check that it saves, `plainText` fills, `mentions` fills, all
   three states save, and the text opens in the admin form. Then delete the test record and PATCH the
   `W` counter back to the value you recorded. Show the counter before and after.
3. `npm run build` passes with zero errors.
4. Ask Bobby to test in the browser. Give him this exact checklist and wait for "studio checks done":
   - Open `/write`, create a new piece, type a few paragraphs, with a heading and some bold.
   - Type `@` and mention a character. Confirm the name appears as plain text.
   - Wait for "Saved". Refresh. The text and formatting are still there.
   - Switch to Canon, then Draft, then Set aside. The state sticks after refresh.
   - Open the same piece in `/admin` and confirm the text shows correctly.
   - Open one imported chapter in the Studio and check nothing about it looks different.
   - Watch the browser console and the dev server terminal for errors.
5. After Bobby confirms, delete any test pieces he created (ask him which), and fix the `W` counter
   the same way.

## Part 5: finish

1. Update `BUILD_GUIDE.md` (Current state, Next up) and tick S1 in `docs/PLAN_WRITING_AND_AI.md`.
2. Add a one line pointer to `docs/PLAN_WRITING_AND_AI.md` under the Phases heading of
   `traveler-wiki-build-plan.md`.
3. `npm run build`, then commit in sensible commits.

**GATE S1.** Stop with a short report: the editor library you chose and why, the round trip result
per record, the counter before and after, the files you added or changed, and anything you could not
do. Do not start S2.
