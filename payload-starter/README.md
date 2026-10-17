# payload-starter: collections for The Traveler

Starter code for the Payload CMS build. It typechecks against Payload 3.x. It has not been run
against a database yet. Phase 1 of `traveler-wiki-build-plan.md` is where it gets installed.

## Install

Copy the folders inside `src/` to the **repo root** (the app has no `src/` directory):

| From | To |
|---|---|
| `src/payload.config.ts` | `payload.config.ts` |
| `src/collections/` | `collections/` |
| `src/fields/` | `fields/` |
| `src/endpoints/` | `endpoints/` |
| `src/lib/codes.ts`, `relationshipTypes.ts`, `legacy.ts` | `lib/` (alongside existing files) |

Then set `PAYLOAD_DATABASE_URL` (a new Neon database used only by Payload) and `PAYLOAD_SECRET`.

## What is in it

- **IDs.** Every record gets a permanent code: C characters, L locations, E events, I items,
  F factions, U cultures, R races, G languages, K lore, S stories (ideas), W writing,
  X relationships, Q continuity items, T tags. Assigned on create, never edited, never reused.
  A record created with a code already filled in keeps it (used by the migration).
- **Collections.** Characters, locations, items, cultures, factions (each sits inside a culture, and many
  factions can share one), races, languages, lore, events, stories, writing, relationships, tags, plus the
  continuity collections.
- **Tags and UNK.** Every record has `tags` and a `reviewNote`. `UNK` is created on startup, cannot be deleted,
  and means "applied on a best guess, double check it". `GET /api/unk` lists everything tagged UNK.
- **Lookups.** `GET /api/codes/C10`, `POST /api/codes/resolve`, `GET /api/codes/C10/links`, `GET /api/unk`.
- **Time.** Plain whole-number years. Year 0 is the year SERO is born. Negative years for prequels.
- **Status.** Same four values as the old app: `locked`, `in_development`, `needs_name`, `placeholder`.

## Notes

- `collections/continuity.ts` attaches a hook to the Writing collection that keeps a plain text copy
  of the prose for the continuity check, so it must be imported by `payload.config.ts` (it is).
- Local development signs in automatically. A deployed copy needs a real login.
- Before the first deploy, switch from dev auto-push to migrations.
