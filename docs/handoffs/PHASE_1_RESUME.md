# Phase 1 resume: finish verification

This replaces your open question from the last report. Same scope fence as `PHASE_1_FINISH.md`:
do only what is listed here, nothing else. If something unexpected blocks you, stop and report
the exact error message and code. Never print secrets. No em dashes.

## What is already done (do not redo)

`"type": "module"` fixed the CLI. `generate:importmap`, `generate:types` and `npm run build` all
pass, and the import map has real Lexical entries. Keep the `"type": "module"` change.

## Your two errors, explained

**Error 1 (login says incorrect): the dev user does not exist yet.** Payload's docs never say that
`autoLogin` creates a user, and the evidence says it does not. `/admin` returning 200 proves
nothing, because the "create first user" screen also returns 200. I (Bobby) will create the user
myself in the browser before you continue. See "My part" below. Do not create it from code, do not
change `payload.config.ts`, and do not touch `autoLogin`.

**Error 2 (neon() rejects the URL): you used the wrong tool.** `@neondatabase/serverless` is not
part of this stack. Payload talks to Postgres through `@payloadcms/db-postgres`. The most likely
cause is how your script parsed `.env.local` by hand (quotes or Windows line endings around the
value), which Next and Payload do not suffer from because they load env files themselves. The loop
of fixing the URL string was a rabbit hole. Stop it.

## Cleanup first

1. Delete `scripts/check-users.mjs`. Do not commit it.
2. Do not install or use `@neondatabase/serverless` for anything in this task. If you added it to
   `package.json`, remove it and its lockfile entry.
3. Port 3000 is held by an older dev server from before the `"type": "module"` change (PID 31388 in
   your last output). Stop it and start one fresh `npm run dev` so it picks up the change. Confirm it
   is on port 3000, not 3001. If it lands on another port, stop and tell me.

## My part (Bobby, in the browser)

Open `http://localhost:3000/admin`.
- If it shows a "create first user" form: email `me@traveler.local`, password
  `dev-only-password` (this must match the config default, because `DEV_PASSWORD` is not set).
- If it shows the dashboard instead, a user exists with an unknown password. Open Users, open
  `me@traveler.local`, and set the password to `dev-only-password`.

I will tell you when this is done. **Do not continue past this point until I say so.**

## Update: what actually happened with the user

The admin Users list shows exactly one user: `robwashburn@fastmail.com` (ID 1), created today
when Bobby went through the create-first-user screen. So no `me@traveler.local` user exists, and
the config's `autoLogin` (hard-coded to that email) points at a user that does not exist. Bobby is
signed in right now only because of the normal session cookie from creating the account.

**One small config fix is approved, and it is the only code change in this resume file.** In
`payload.config.ts`, make `autoLogin` use an environment variable instead of the fake email:

```ts
autoLogin: isDev && process.env.DEV_LOGIN_EMAIL
  ? { email: process.env.DEV_LOGIN_EMAIL }
  : false,
```

The password is only needed for `prefillOnly`, so it is removed. Remove the `DEV_PASSWORD` use.
Add `DEV_LOGIN_EMAIL=` (no value) to `.env.example`, and add `DEV_LOGIN_EMAIL=robwashburn@fastmail.com`
to `.env.local` (git-ignored). Mirror the same change into `payload-starter/src/payload.config.ts`
so the two stay identical. Update the autoLogin lines in `CLAUDE.md` and
`traveler-wiki-build-plan.md` only if they mention `me@traveler.local` or `DEV_PASSWORD`. Restart
the dev server afterward. Then tell Bobby to open `http://localhost:3000/admin` in a private
window to confirm it signs in with no login screen, and wait for his answer.

For the REST login in the steps below, use the credentials Bobby gives you in his message
(email `robwashburn@fastmail.com`). Use them only in the login call: never write them into a file,
script, log or commit, never print them back, and delete `cookies.txt` afterward.

## Then continue (after I confirm)

1. Log in over REST and confirm the cookie works, using the body-from-file approach that avoided
   the PowerShell quoting problem, and `curl.exe`:
   `POST /api/users/login` then `GET /api/users/me` with `-b cookies.txt`. Show the status and the
   user email only (no token).
2. Run the ten items and the three rich text checks from `PHASE_1_FINISH.md` section 2. Real output
   for each.
3. For item 10 (proof the data lives in the new database, old database untouched), do not hand-parse
   `.env.local`. Use `payload run`, which loads env files the same way Next does (this is documented
   Payload behavior). Write one throwaway script outside the repo's committed paths (for example
   `scripts/_tmp-dbcheck.ts`), run it with `npx payload run scripts/_tmp-dbcheck.ts`, then delete it:
   - New database: `getPayload({ config })`, then list the tables in schema `public` and the row
     count of each Payload table, using `payload.db.drizzle.execute(sql\`...\`)` with `sql` imported
     from `@payloadcms/db-postgres/drizzle`.
   - Old database: use the `pg` package that `@payloadcms/db-postgres` already installed, with
     `process.env.DATABASE_URL`, read-only `SELECT count(*)` queries only. Expect 47 entities,
     113 events, 38 event_links, 4 relationships.
   - Print table names and counts only. Never print either connection string. Show the two host
     names only if you need to prove they differ.
   If `payload run` fails, report the exact error and stop. Do not fall back to another driver.
4. Delete the test records afterward (or list which remain).

## Commit and report

Same as `PHASE_1_FINISH.md` section 3 (gitignore additions, commit `AGENTS.md`, commit
`payload-types.ts` and the generated import map, build clean, update `BUILD_GUIDE.md` and the plan
checkboxes, no secrets, no `cookies.txt`). Then stop at GATE 1 with the report described there.
