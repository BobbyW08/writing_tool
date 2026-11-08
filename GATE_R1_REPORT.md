# Gate R1 Report

Build and data layer rebuild, Parts 1 to 6.

---

## 1. Build result

`npm run build` passes with zero TypeScript errors. All routes compile and type-check.
Verified after every part. Final check after Part 6 is also clean.

---

## 2. Schema design choice: separate table per collection

The world entry types (characters, locations, items, cultures, factions, races, languages, lore)
each get their own table. This is the "many tables" path.

**Why:** Each type carries unique fixed columns
(characters: `birth_year`, `race_id`, `culture_id`; locations: `kind`, `culture_id`; items:
`item_type`, `created_year`, `current_owner_id`, `current_location_id`; etc.). A single-table
approach would require all those columns to be nullable on every row, with no type-level
guarantee that a locations row never has a `birth_year`. The many-tables approach lets each
type own only its own columns while sharing everything common through the `sharedCols()` and
`worldSharedCols()` helper functions in `db/schema.ts`. Those helpers emit the shared columns
once; adding a shared column in one place adds it to all eight tables.

---

## 3. Verify scripts

All verify scripts use the new data layer only. None import from `payload` or
`payload.config`. All call `appDb` and `db/schema` directly, with no
`'use server'` or `'server-only'` guards (those are Next.js directives that do
not apply in plain tsx scripts). `npx tsc --noEmit` reports zero errors across
all three scripts and the full project.

`scripts/verify-db.ts` was already correct. The other three were rewritten:

- `verify-world-edit.ts`: create two characters, edit a scalar field, add detail
  rows with inInfobox, create a relationship, confirm the conflict check blocks
  a delete while the relationship exists, apply and read back the UNK tag, delete
  all test rows, and report counter and row counts.
- `verify-s1.ts`: Markdown round-trip (heading, bold, italics, list, @mention)
  using `@lexical/headless` without any server-only guard, verify the text is
  stored as Markdown (not Lexical JSON), change canonState draft to canon, delete,
  and report counter and row count.
- `verify-w1.ts`: create a character with role, birthYear and two detail rows
  (one inInfobox), insert two media rows directly via appDb, attach the first
  imageId, verify all fields, check INFOBOX_FIELDS, replace with the second
  imageId, remove imageId, delete all rows, and report counter and row counts.

None can be run yet because the migration has not been applied to APP_DATABASE_URL.

**Required before any verify script will work:**

```
npx tsx --env-file=.env.local db/migrate.ts
```

Once that runs, verify scripts can be run in order:

| Script | Purpose |
|---|---|
| `scripts/verify-db.ts` | Code assignment, slug permanence, cycle check, conflict check, UNK queue |
| `scripts/verify-world-edit.ts` | World data layer: create, edit, detail rows, relationship, delete conflict, UNK tag |
| `scripts/verify-s1.ts` | Writing Studio: Markdown round-trip, canonState change |
| `scripts/verify-w1.ts` | Media: insert, attach, replace, remove from infobox |

Run each with:

```
npx tsx --env-file=.env.local scripts/verify-db.ts
npx tsx --env-file=.env.local scripts/verify-world-edit.ts
npx tsx --env-file=.env.local scripts/verify-s1.ts
npx tsx --env-file=.env.local scripts/verify-w1.ts
```

---

## 4. Dry run counts (Part 6)

Source: `PAYLOAD_DATABASE_URL`. No data was written.

### Main collection tables

| Table | Rows |
|---|---|
| tags | 1 |
| characters | 39 |
| locations | 12 |
| items | 0 |
| cultures | 5 |
| factions | 2 |
| races | 0 |
| languages | 0 |
| lore | 102 |
| events | 113 |
| stories | 73 |
| writing | 3 |
| relationships | 6 |
| media | 0 |

### Join and array tables (non-empty only)

| Table | Rows |
|---|---|
| characters_aliases | 1 |
| characters_rels | 3 |
| locations_rels | 1 |
| cultures_rels | 5 |
| factions_rels | 2 |
| lore_rels | 102 |
| events_rels | 44 |
| stories_beats | 137 |
| stories_rels | 49 |
| writing_rels | 3 |
| relationships_rels | 16 |

Total records: 39 characters + 12 locations + 5 cultures + 2 factions + 102 lore + 113 events + 73 stories + 3 writing + 6 relationships = 355 content records (plus tags and join rows).

Note: items, races, languages and media are empty in the Payload DB. The copy script handles
them correctly; they will copy zero rows without error.

---

## 5. Blocked items

### Migration (Bobby must run manually)

The sandbox cannot run the migration. Bobby runs this once in his terminal:

```
npx tsx --env-file=.env.local db/migrate.ts
```

This creates all tables in APP_DATABASE_URL. All verify scripts are blocked until it runs.

### Copy script (Part 6, waiting for approval)

`scripts/copy-from-payload.ts -apply` is written and the dry run passed (counts above). It waits
for Bobby's "copy approved" before running. Re-running is safe; the script is idempotent on code.

### Parts 7, 8, 9

Not started. These wait for Bobby's "r1 checks done", "copy approved" and "remove payload
approved" in that order.

---

## 6. Bobby's checklist

Before saying "r1 checks done", verify each item on a running dev server:

- [ ] Apply the migration: `npx tsx --env-file=.env.local db/migrate.ts`
- [ ] Run the verify scripts and confirm all pass (see section 3 above)
- [ ] The app loads on a restarted dev server with no errors in the browser console or the dev server window
- [ ] Create a character from the frontend. It gets the next code in its prefix. Edit its name, summary and status in place, refresh, and the changes stuck
- [ ] Edit a long body field in place, with an `@` mention. It is rich text, saves, and shows once, not twice
- [ ] Add a detail row, tick Show in infobox, reorder, remove. Upload and remove an image
- [ ] Add and remove a relationship. Tag a record UNK, find it on `/review`, clear it
- [ ] Delete a record that other records point to: it refuses and lists them
- [ ] Create a piece in `/write`, type with a heading, bold and an `@` mention, refresh, and switch Draft, Canon, Set aside
- [ ] Move around the tree and the home hub. It should feel fast
- [ ] `/admin` is no longer needed for anything

Once all boxes are checked: say "r1 checks done".
Then say "copy approved" to run the data copy (Part 6 with -apply).
Then say "remove payload approved" to start Part 7.
