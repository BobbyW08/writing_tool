# Handoff for Claude Code: Phase 3, S2 and W1 (frontend shell, read and edit pages, world tree, infobox, home hub, retire old code)

Start only after Bobby has said "studio checks done" (S1 browser checks passed). Scope is strict. Do only what is written here. If anything blocks you, stop and report the exact error. Do not improvise a fix and do not start G1 or any later step.

Bobby's decision: **all creating, editing and writing happens in the frontend.** The Payload admin is a fallback only. No routine task may require it.

## Rules

1. Never print secrets. Do not echo `.env` or `.env.*`. Never put Bobby's login in a file, script, log or commit.
2. Payload uses `PAYLOAD_DATABASE_URL` only. The old database (`DATABASE_URL`) is read only until Part 7 is approved.
3. Bobby runs the dev server on port 3000. Do not start, restart or kill Node or any dev server. Do not use `Start-Process` or `taskkill`. If a restart is needed, tell Bobby.
4. PowerShell 5.1: use `Invoke-RestMethod`. Never name a helper `Del`, `Get`, `Post` or `Patch`.
5. No em dashes and no "--" in anything you write.
6. Hard rule 1: no AI anywhere in this step. Record text is never generated or rewritten.
7. New or rewritten pages and actions use the Payload Local API only (`getPayload({ config })`, on the server). They must not import `lib/db`, `lib/data`, `lib/actions` (old files) or `lib/continuity`. New server actions go in new files under `lib/world/`.
8. `npm run build` must pass before every commit. Do not commit unless Bobby asks. Never commit `.env` files.
9. Our own look. Do not copy World Anvil's style, colors, icons or gamification (hard rule 17).
10. Existing records' content is never rewritten by scripts. Edits happen only through the new UI, by Bobby, or in test records you create and delete.
11. Nothing is deleted before Part 7, and Part 7 starts only when Bobby says "retire approved".
12. Validation and hooks: every frontend write goes through the Local API with `overrideAccess: false` semantics matching admin behavior where the project uses access control, so the `assignCode`, slug, tag and sync hooks fire exactly as they do from the admin. Never write to the database directly.

## Part 0: setup (no code yet)

1. Read this file, then `CLAUDE.md`, `traveler-wiki-build-plan.md` (Editing model, Frontend views, Phase 3, Step W1, Build order, ID codes), `docs/PLAN_WRITING_AND_AI.md` and `BUILD_GUIDE.md` (section "Retire after the migration is verified").
2. Delete any S1 test pieces only if Bobby lists them. Confirm the W counter value and report it.
3. Write Parts 1 to 6 as a task list. Do not ask Bobby anything unless blocked.

## Part 1: schema additions for W1

1. Add the `media` upload collection exactly as specified in the build plan ("media"): file, `alt`, `kind` select with the nine listed values, image sizes via `sharp` (already installed). No code prefix. Local disk storage for now, in a git-ignored folder.
2. Add `image` (upload relation to `media`) to every world collection and to `events`. Not to `writing`. Use a shared field helper in `fields/` the way `tags` and `code` are shared.
3. Add `inInfobox` (checkbox, default false) to each row of `details`.
4. Add `lib/infobox.ts`: for each collection, the fixed fields that always appear in the infobox. Pull the field names from the collection configs. Do not invent fields.
5. Mirror changes into `payload-starter/src/collections/...` as S1 did, run `npm run generate:types`, and report whether a migration file was needed.
6. Counters, codes and existing records must be unchanged. Verify with a count of records per collection before and after.

## Part 2: shell and read pages (S2)

Replace the chrome in `app/(app)/layout.tsx` with the shell: a slim icon rail, a side panel (the world tree, Part 5) and a main canvas.

1. Read pages for every world collection and for events, on the Local API. Reuse `components/entity-read-view.tsx`, `event-read-view.tsx` and `wiki-text.tsx` where they fit, rewritten to read Payload data.
2. ID codes found in any text (rich text, textareas, detail values) render as links showing the entry's name. Unknown codes render as plain text, muted. Use `lib/codes.ts` for the pattern and prefix map.
3. Each read page shows: details, notes, linked events, relationships read from both ends (by `involves`), sub-items (via `parent`), and a small "Open in admin" link. Leave a clearly marked empty slot for "What links here" (G1 fills it).
4. UNK marker on every read page and list, with its `reviewNote`.
5. `/review`: everything tagged UNK across collections in one list, grouped by collection, each row linking to its read page. Reuse the data behind `GET /api/unk`. Clearing the UNK tag happens in Part 3 (in place).
6. Code lookup box in the shell: takes a code (C10) or a name or alias and jumps to the entry.
7. `/timeline` reads events from the Local API by `startYear`. Keep `components/timeline-view*` and `lib/timeline-scale.ts`. Dragging changes `startYear` only (server action on the Local API). No new timeline features: eras, lanes and convergence are step W2.
8. List pages per collection: name, code, status, tags, UNK marker.
9. Do not touch `/write`, `lib/studio/*`, or any continuity file.

## Part 3: create and edit in the frontend

This is the editor. There is no separate view mode and edit mode: the read page is edited in place.

1. **Create.** A "New" flow for every world collection and for events, reachable from the tree, the home hub tiles and each list page. A single reusable form component driven by a field definition per collection (`lib/world/fields.ts`), not eleven hand-written forms. The code is assigned by the existing hook. The slug is set once from the name.
2. **Edit in place on the read page.** Click a field to edit it; save on blur or Enter; Escape cancels. Show "Saved" or the exact error beside the field. Fields to cover for every collection: `name`, `aliases`, `summary`, `status`, `gapPrompt`, `tags` (including adding and clearing UNK and editing `reviewNote`), `parent`, `image`, the collection's own fixed fields, and `body` (rich text, reuse the Lexical editor and `lib/studio/lexical.ts` from S1, with `@` mentions).
3. **Details rows.** Add, remove, reorder (`@dnd-kit/sortable`) and edit label and value, plus the `inInfobox` checkbox on each row.
4. **Relationships.** On a read page, add a relationship (type from `lib/relationshipTypes.ts`, the other entry by code or name search, optional notes) and remove one. Both write the `relationships` collection through the Local API so codes (X) are assigned by the hook.
5. **Events.** Create and edit events including `startYear`, `yearLabel`, `involves`, and location. Convert-to-event from a story or note is not in scope.
6. **Delete.** A delete action with a confirmation dialog on every read page. It must refuse, and say why, when other records still point at the record (relationships, `parent`, `involves`), listing them.
7. **Writing and stories.** Writing already edits in the Studio. Add a stories read page with in-place edit of `stage`, `format`, era, years, characters involved and events dramatized.
8. All forms use `shadcn` components already in `components/ui/`. Keyboard friendly. No page reloads on save.
9. Verification script `scripts/verify-world-edit.ts` using the same server actions: create a test record in each collection, edit a field, add a relationship, add a detail row, delete, and confirm the counters return to their prior values and no orphan rows remain. Report the results.

## Gate P3a

Stop here and report: routes and actions added, any old-code imports in new files (must be none), `npm run build` result, the `verify-world-edit.ts` output, and this browser checklist for Bobby:

- [ ] `/` loads with no errors in the browser console or dev server terminal.
- [ ] Open a character, a location, a culture, a faction, a lore entry, an event and a story read page. Each looks right.
- [ ] Create a new character from the frontend. It gets the next C code. Edit its name, summary and status in place, refresh, and the changes stuck.
- [ ] Add a detail row, tick Show in infobox, reorder two rows, remove one. Refresh and it persisted.
- [ ] Write notes with `@` mention and an ID code. The code renders as a named link on the read page.
- [ ] Add a relationship between two entries and see it on both read pages. Remove it.
- [ ] Clear the UNK tag on a test record and edit its Check this note. `/review` updates.
- [ ] Delete the test character. Try deleting a record that others point to and confirm it refuses and lists them.
- [ ] Code lookup: C4 and a character name both jump correctly.
- [ ] `/timeline`: drag one event, refresh, position persisted; only `startYear` changed.
- [ ] The Writing link and `/write` still work.

Wait for "p3a checks done" before Part 4.

## Part 4: infobox and images (W1)

1. Infobox at the top right of every read page, above the text, encyclopedia style: image, the fixed fields from `lib/infobox.ts`, then any `details` rows with `inInfobox` checked. Empty fixed fields are omitted, not shown blank. The infobox is editable in place like the rest of the page.
2. **Image upload from the frontend.** Click the image slot to upload or replace: a file picker and drag and drop, `alt` text and `kind` fields, written to `media` through the Local API, then attached to the record. Remove image detaches it without deleting the media item.
3. Small image on list rows and on tree rows.
4. Verification in `scripts/verify-w1.ts`: create a test media item and test character through the Local API, confirm the infobox data resolves, then delete both and confirm counters are restored.

## Part 5: world tree (left panel)

1. Searchable tree of everything. Four modes at the top: by type (collection, then `parent` hierarchy), by story, by culture, by era. If a mode has no data to group on yet (eras arrive in W2), show it labeled "Available after eras are added" and keep it inert. Do not invent grouping data.
2. Filter box matching name, aliases and code.
3. An Add button opening the Part 3 create flow for the chosen collection, in the canvas. No admin pages.
4. Drag to re-parent within a collection using `@dnd-kit/sortable`. A drop changes `parent` only. Block cycles with a visible message. No cross-collection drops.
5. Tree state (open nodes, mode) remembered per browser with `localStorage` in try/catch.

## Part 6: home hub

`/`: quick-create tiles per collection (open the Part 3 create flow), record counts, open continuity items (count only, linking to the existing continuity page; if reading it needs the old database show "Available after Phase 4"), placeholders waiting (status `placeholder`), the UNK count linking to `/review`, and recent edits (last 10 updated records across collections).

## Gate P3b

Stop and report: build result, old-code imports in new files (must be none), `verify-w1.ts` output, and this checklist for Bobby:

- [ ] Upload an image to a character from the frontend, mark a detail row for the infobox, and see the infobox render correctly. Replace the image, then remove it.
- [ ] World tree: switch the four modes; filter by a name, a code and an alias.
- [ ] Add a record from the tree's Add button.
- [ ] Drag a test character under another, confirm the new parent on its read page, then drag it back. Try a drop that would create a cycle and confirm it is refused.
- [ ] Home hub shows tiles, counts, placeholders, UNK count and recent edits. Each tile opens the create flow.
- [ ] You can do a full session (create, edit, relate, delete, upload) without opening `/admin`.
- [ ] Browser console and dev server terminal show no errors through all of this.

Wait for "p3b checks done". Then wait for "retire approved" before Part 7.

## Part 7: retire the old code (only after "retire approved")

1. Produce the list first. Using `BUILD_GUIDE.md` ("Retire after the migration is verified"), build an import graph and mark each candidate: no remaining importers (safe to delete) or still imported (keep, name the importer). Put the list in the report, then proceed with the safe ones.
2. Kept until Phase 4: `lib/continuity/*`, `lib/actions/continuity.ts`, `lib/data/continuity.ts`, `lib/actions/snippets.ts`, `lib/data/snippets.ts`, `lib/db/`, `drizzle/`, `drizzle.config.ts`, the `app/(app)/continuity/**` pages and the components they use, `lib/ingest/markdown.ts` and `wikilinks.ts`.
3. Retire the old hand-built CRUD pages (old `[entityType]/new`, `[entityType]/[slug]`, `events/new`, `events/[slug]`, `snippets/**`), the old form components named in the guide, `lib/actions/entities.ts`, `lib/actions/events.ts`, `lib/data/entities.ts`, `lib/data/events.ts`, `lib/data/entity-types.ts`, `scripts/ingest.ts`, `lib/ingest/*` (except the two kept files). Remove the dead `import:drive` script. Only after the new Part 3 equivalents are confirmed working at Gate P3b.
4. Do not uninstall dependencies. List the ones now unused for Phase 4.
5. Remove the Snippets link and any dead nav links. Check every remaining nav link loads.
6. `npm run build` must pass. Report deleted files, kept files with reasons, and unused dependencies.

## End of session

Update `BUILD_GUIDE.md` (Current state, Next up, any gotchas) and the Phase 3, S2 and W1 checkboxes in `traveler-wiki-build-plan.md` and `docs/PLAN_WRITING_AND_AI.md`. Next after this is G1, the link index. Do not start it.
