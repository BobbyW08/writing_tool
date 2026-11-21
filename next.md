# Next task

This file holds the instructions for the next task, in line with `traveler-wiki-build-plan.md` and
the rules in `CLAUDE.md`. Do only what is written here. At the end of every session, replace this
file with the instructions for whatever comes after. The repo keeps exactly three instruction files:
`CLAUDE.md`, `next.md` and `traveler-wiki-build-plan.md`.

## Status: S7 is fully done. Waiting on Bobby.

S7 (canon check and change tracking) is complete as of 2026-11-21: the claims ledger, forward check,
label check, "Leaving Canon", the backward check (`stale_claim` flags, surfaced in the `/continuity`
inbox with a Revert action, verified live via Playwright) and the Draft-vs-Locked priority split
(`conflictPriority` in `lib/continuity/priority.ts`, wired in at the query layer, no migration
needed). See "Steps S0 to S7" and the working log in `traveler-wiki-build-plan.md` for detail.
`npm run build` and `npm run test:continuity` are clean.

Roadmap table row 11 (S4 to S7) is marked done; row 12 (UX1 to UX6, the start flow and page redesign)
is marked **Next**, but per the previous task's own instructions this is not yet authorized — ask
Bobby which of UX1 to UX6, the Story Builder canvas (SB), or something else to start next before
doing any of it.

Also outstanding, not yet actioned: the Next.js 16.4.2 → 16.4.6 security upgrade was done and
committed (`18e32a2`) in a separate worktree/branch (`../writing_tool-nextjs-security`,
`chore/nextjs-security-upgrade`), not this working tree. Ask Bobby whether to merge it, and whether
to open a draft PR for it (the repo has a GitHub remote, `BobbyW08/writing_tool`).

## Do not
Do not start UX1 to UX6, the Story Builder canvas (SB), story architecture (AR) or Phase 9 without
Bobby's go-ahead. Do not merge the Next.js upgrade worktree or open a PR for it without asking first.
Do not add any file other than what a task Bobby authorizes needs. Do not commit to Neon anything
except through a migration Bobby applies by hand.
