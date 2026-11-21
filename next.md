# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Task: P0, audit, verify, commit and push what is built

Read "Where things stand" and "Step P0" in `traveler-wiki-build-plan.md` first.

The working tree on branch `claude/writing-drives-world` holds uncommitted work: the writing drives the
world port (done 2026-11-11) and S4 to S7 (AI foundation, beats, prompts menu, claims). The progress log
for it was lost, so nothing in it counts as done until this task checks it. GitHub master is 25 commits
behind Bobby's machine.

### 1. Audit, read-only first
1. `git status`, `git log -5`, and the list of files that differ from the last commit (f488683).
2. Run `npx tsc --noEmit`, `npm run test:mentions`, `npm run test:names`, `npm run test:continuity` and
   `npm run build`. Report each result. Fix only what fails, scoped to the failure.
3. Run `scripts/rebuild-links.ts` as a dry run and report the link count.
4. Check which of migrations `0011` to `0016` are applied to Neon, read-only (`scripts/verify-db.ts` or a
   table check). Never apply a migration. Report which are pending.
5. Audit S4 to S7 against "Steps S0 to S7" and "The AI layer" in the plan. For each checklist item write
   done, partial or missing, with the file that proves it. Update the plan's checklist and working log.
   Do not build anything that is missing.
6. Tell Bobby the result in a few lines.

### 2. Bobby does by hand (give him these as a numbered list after the audit)
Use the "Bobby does by hand" list under step P0 in the plan. Fill in the real migration state from the
audit. Include the Neon backup branch before any migration, the browser checklist, the commit and push
commands, and the pull request on GitHub.

### 3. When this is done
1. Check off the P0 items in the plan and log any error found or fixed in its error log.
2. Re-read the changes and recheck this task and `CLAUDE.md`.
3. Run `npm run build`, zero errors.
4. Replace this file with the next task: finish whatever the audit found missing in S4 to S7. Ask Bobby
   before starting the Story Builder canvas (step SB).

## Also, once the task above is finished
Vercel should deploy automatically on every push to GitHub: Vercel, this project, Settings, Git, connect
`BobbyW08/writing_tool`. Confirm with a trivial commit and push, then wait for a deployment to start on its
own on the Deployments tab.

Also still open from Phase 8: switch from dev schema push to real migrations before deploy.

## Do not
Do not start the Story Builder canvas, story architecture (AR) or Phase 9. Do not add any file other than
what this task needs. Do not commit `_to_delete/` or `writing-drives-world.patch`.
