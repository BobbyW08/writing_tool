# Gate 2C Review Report — Story Bible, Gap Analysis, Drafts

**Status:** STAGED — not applied  
**Staged:** 2026-10-20 (corrected pass 2026-10-20)  
**Apply script:** not yet written (Gate 2C: stage and review only)

---

## Sources processed

| File | Lines | Status |
|---|---|---|
| `source-docs/ideas/Consolidated-Story-Bible.md` | 2,567 | Fully read (sections 1–4 + chat transcript) |
| `source-docs/ideas/Sero-Worldbuilding-Gap-Analysis.md` | ~318 | Fully read |
| `source-docs/drafts/The-Traveler-Introduction.md` | 46 | Fully read |
| `source-docs/drafts/The-Traveler-1-Origins.md` | 15 | Fully read |
| `source-docs/canonical/Characters.md` | ~420 | Fully read (coverage check) |
| `source-docs/canonical/Events.md` | ~317 | Fully read (coverage check) |
| `source-docs/rpg-ai-game-concept/OPENING_SCENES_ACTUAL_DIALOGUE.md` | — | **SKIPPED** (RPG file per spec) |
| `source-docs/rpg-ai-game-concept/SERO_OPENING_NARRATIVE_MINDMAP.md.b64` | — | **SKIPPED** (RPG file; .b64 not decoded) |

**Chat transcript headings skipped:** 23 "Claude responded" headings in Bible lines 2077–2567.

---

## Record counts

### Proposed new records by collection

| Collection | Count | Notes |
|---|---|---|
| `characters` | 3 | Eron, Menas, Local Lord of Renmark |
| `locations` | 1 | Maren (world name) |
| `cultures` | 5 | 4 named + 1 post-collapse placeholder |
| `factions` | 2 | Asharan Priesthood, Caeldrath Ruling Family |
| `lore` | 102 | Breakdown below |
| `stories` | 33 | S41–S73 (24 from first pass + 9 missing added) |
| `writing` | 3 | Introduction, Origins Ch.1, early chat fragment |
| **Total new** | **149** | All 149 tagged UNK |

### Lore breakdown (102 records)

| Source | Status | Count |
|---|---|---|
| Bible Section 2.4 (cultures/society/technology) | in_development | 5 |
| Gap Analysis ✓ decided | in_development | 28 |
| Gap Analysis ? still needed | placeholder | 29 |
| Bible Section 3 gaps | placeholder | 40 |
| **Total lore** | | **102** |

### Count reconciliation note

Earlier review report said 119 records (lore=76, stories=29). The JSON had 140 records (lore=102, stories=24). Both were wrong. Correct count is **149** (lore=102, stories=33). Discrepancies:
- Lore 76 vs 102: report undercounted GA-GAP (22 vs 29) and Bible S3 gaps (21 vs 40)
- Stories 29 vs 33: 9 Section 4 stories were missing (Caeldrath's International Role, The Asharan Language as Bridge, World-Building Through Daily Life, The Archive Keepers (Modern), New Religions & Philosophies, Technological Advancement (Present Day), International Politics & Conflicts, The Boy A Mystery, Unknown Continents)

### Existing records confirmed as matches (no new record needed)

| Collection | Count | Notes |
|---|---|---|
| `characters` | 36 | All canonical Characters.md entries match DB (C1–C36) |
| `locations` | 11 | All canonical Locations.md named locations match DB (L1–L11) |
| `events` | 113 | All events from Phase 2A match |
| `stories` | 40 | S1–S40 from Phase 2B match |
| `relationships` | 4 | X1–X4 from Phase 2A match (counter=5, so X1–X4 exist) |

---

## DB query results for proposed characters and locations

Run: `scripts/probe-2c.ts` (2026-10-20)

| Name | Collection | DB result | Decision |
|---|---|---|---|
| Eron | characters | 0 results — NOT in DB | Include in staging ✓ |
| Menas | characters | 0 results — NOT in DB | Include in staging ✓ |
| Local Lord | characters | 0 results — NOT in DB | Include in staging ✓ |
| Maren | locations | 0 results — NOT in DB | Include in staging ✓ |

---

## Writing records

| Record | Char count | First 60 chars | Last 60 chars |
|---|---|---|---|
| Introduction | 4,859 | `# Tab 1\n\nMonth/Year\n\nI awoke this morning to the sound of` | `never breathed a word of that meeting to another living soul.` |
| Origins Ch.1 | 1,663 | `"The sea", his father said, not even bothering to look up fr` | `Nevertheless, Sero proceeded down this main thoroughfare` |
| Chat fragment | 564 | `Father, I wish you would at least allow me some say in my l` | `You see, Sero never wanted to be a scribe in the first place.` |

All three writing records have full verbatim text in `body`. The Origins draft ends mid-sentence ("Nevertheless, Sero proceeded down this main thoroughfare") — preserved as-is per instruction. The chat fragment includes original typos ("follow you friends", incomplete sentence "could never have hoped to").

---

## Notes by collection

### Characters (3 new)

**ERON** — Sero's father. Name was suggested by Claude in the story-bible chat session; Bobby adopted it; now appears in canonical Characters.md ("Father: Eron"). DB confirmed: no standalone record. UNK — reviewNote documents AI-origin of name.

**MENAS** — Giana's uncle, scribe shop owner. Same AI-origin note as Eron. DB confirmed: no standalone record. UNK — reviewNote documents AI-origin of name.

**LOCAL LORD OF RENMARK** — Mentioned in Sero's canonical entry ("junior scribe for a minor lord in Renmark"). DB confirmed: no standalone record. Created as placeholder per Bobby's instruction.

### Locations (1 new)

**MAREN** — World name. Canonical Locations.md header reads "World: Maren." Phase 2A migrated individual named locations but not the world-level record. Created as in_development per Bobby's instruction.

### Cultures (5 new)

None existed in old DB or Phase 2A/2B. All new. Body field: verbatim text from Bible Section 2.4. POST_COLLAPSE_FRAGMENTED_CULTURES is a placeholder pending naming of the 5–6 kingdoms.

### Factions (2 new)

**ASHARAN PRIESTHOOD** — The institution (one shaman/priest at a time, lineage of ritual knowledge). Distinct from C7 (The Shaman / Priest) which is one individual. Body: verbatim from Bible Section 2.4.

**CAELDRATH RULING FAMILY** — Placeholder. No name anywhere in sources. Body: verbatim Caeldrath governance text from Bible Section 2.4.

### Lore (102 new)

Four groups:
1. **Bible Section 2.4 (5)** — in_development. Body: verbatim from Section 2.4 (Asharan Empire Ideology, Archive Culture, Asharan Language, Social Organization, Technology Level). Review_note: editorial classification only.
2. **GA decided (28)** — in_development. Body: Bobby's verbatim answers extracted from Gap Analysis. Review_note: editorial notes only (verbatim moved out of review_note).
3. **GA-GAP (29)** — placeholder. Body: verbatim gap question from Gap Analysis. Also in gap_prompt. Cross-reference notes added where a GA-GAP overlaps with a Bible Section 3 gap.
4. **Bible Section 3 gaps (40)** — placeholder. Body: verbatim gap statement from Section 3. Also in gap_prompt. Cross-reference notes added where a Bible S3 gap overlaps with a GA-GAP.

**Overlapping pairs** (cross-reference reviewNote added to both records in each pair):

| GA-GAP record | Bible S3 record |
|---|---|
| Caldor Internal Geography | Rough sketch of Caldor's internal geography |
| Currency Systems | Currency Systems Across Eras |
| Most Valuable Trade Goods | Inter-Continental Trade Goods |
| Major Technological Jumps | Technology Jumps Across 2,000 Years |
| Literacy Rates Across Eras | Literacy Rates Across Eras and Regions |
| Merchant Class vs Nobility | Merchant Class Power |
| Warfare Technology Evolution | Warfare Technology Evolution |
| Asharan Governance Structure Below Empress | Empire Continental Control Mechanisms |
| Sero's Appearance and Cover Identities | Sero's Cover Identity System (related but distinct) |

Recommendation: review each pair before applying. Keep both — add a note to consolidate if Bobby confirms they are the same question.

### Stories (33 new — S41 through S73)

24 from first pass + 9 added in correction pass. All Section 4 story ideas. Body field: verbatim bullet-point descriptions from Bible Section 4. Review_note: editorial notes only.

A few items worth reviewing before applying:
- **The Search for Succession** vs. S34 and S40 — partial overlap. reviewNote added pointing to both. Keep as own record per Bobby's instruction.
- **Archive Keepers and Guardians** (empire era, in_development) vs. **The Archive Keepers (Modern)** (present day, new record) — these are two distinct stories, different eras. Keep both.
- **The Asharan Language as Bridge** (new story) — related to lore record "Asharan Language as Lingua Franca." Keep both.

Codes assigned as placeholders only (S?). Apply script must use the S counter (currently at 41 after Phase 2B) to assign real codes S41–S73.

### Writing (3 new)

All three have full verbatim `body` text. Character counts and first/last 60 chars reported above. Body includes typos and unfinished ending preserved verbatim.

---

## Canonical coverage check

### canonical/Characters.md vs DB

**All 36 canonical characters are in the DB (C1–C36).** No canonical characters missing.

Characters proposed as new in 2C staging (Eron, Menas, Local Lord of Renmark) are mentioned in canonical entries but have no standalone records — confirmed by DB query.

### canonical/Locations.md vs DB

**All 11 canonical named locations are in the DB (L1–L11).**

Items in canonical/Locations.md that are NOT standalone DB records:
- MAREN (world name — proposed as new in 2C staging)
- "Regional Locations — To Be Developed" table: Northern mountains, Eastern regions, Southern fishing villages, The forgotten road, Site of the Religious War, The Rival Chronicler's city — explicitly listed as "To Be Developed" in canonical, not proposed here
- "Archive Network — Full Map" table: Lost Archive, Underground Archive — not standalone location records (Lost Archive has an E record for its burning)

### canonical/Events.md vs DB

All events spot-checked in first coverage pass match Phase 2A DB records. Full read completed; no missing events found.

### DB counts (corrected)

- Locations in DB: **11** (L1–L11, not 12 as some earlier notes said)
- Relationships in DB: **4** (X1–X4; counter=5 means next code is X5, so X1–X4 exist)

---

## Relationship statements in 2C sources (not staged)

~8–12 relationship statements present in 2C sources. None are staged as X records here. Recommend staging as a separate 2D relationships import after 2C records are applied and codes assigned:

| From | To | Type | Source |
|---|---|---|---|
| ERON | SERO | father/son | Characters.md + Bible + Origins draft |
| MENAS | GIANA | uncle/niece | Characters.md + Bible |
| MENAS | SERO | employer/apprentice | Bible Section 2.2 |
| VASHTEN | ALDRIC CHAUDRY (Bard) | hired/tasked | Introduction draft + Bible chat |
| ALDRIC CHAUDRY | SERO | search assignment | Introduction draft |
| ASHARAN CULTURE | ASHARAN PRIESTHOOD | culture/faction | Bible Section 2.4 |
| CAELDRATH RULING FAMILY | CAELDRATH CULTURE | faction/culture | Bible Section 2.4 |
| CAELDRATH RULING FAMILY | CAELDRATH (location) | faction/location | canonical/Locations.md |

---

## Notes on AI-suggested content

- **ERON**: name suggested by Claude in chat at ~line 2244. Bobby adopted it; now in canonical Characters.md. UNK + reviewNote documenting origin.
- **MENAS**: name suggested by Claude in chat at ~line 2268. Same situation. UNK + reviewNote.
- **ALDRIC CHAUDRY** (Bard's full name): Bobby adopted it. Exists in DB as C4 (Bard Original). No new record — add as alias/reviewNote to existing Bard record. Do not create a new record.

---

## Canon refinements from chat transcript (not new records — reference notes)

These are facts established in the chat transcript that refine existing records. No records proposed for these:

1. **Sero's marriage age** — empire arrives ~Age 20; ritual at ~Age 25. Check E records for sequence.
2. **"Ashari" rejected** — Bobby explicitly rejected "Ashari" (Critical Role). Correct demonym is "Asharan." Check all existing records.
3. **Vashten's final act** — Vashten appointed Aldric by his own decision, not purely following orders.
4. **Sero's legendary name** — traveled under a legendary name Years 3–50 (name TBD).
5. **Aldric's assignment terms** — 6-month advance on 100 silver/month for 1 year, reporting through any Asharan soldier or official.

---

## 3 Sample records per collection

### characters

```json
{
  "collection": "characters",
  "name": "Eron",
  "status": "in_development",
  "unk": true,
  "review_note": "Name 'Eron' was suggested by Claude in the story-bible chat session. Bobby adopted it; now in canonical Characters.md as 'Father: Eron'. DB confirmed: 0 results. UNK — AI-origin name."
}
```

```json
{
  "collection": "characters",
  "name": "Menas",
  "status": "in_development",
  "unk": true,
  "review_note": "Name 'Menas' was suggested by Claude in the story-bible chat session. Bobby adopted it. DB confirmed: 0 results. UNK — AI-origin name."
}
```

```json
{
  "collection": "characters",
  "name": "Local Lord of Renmark",
  "status": "placeholder",
  "gap_prompt": "Who is the local lord that Sero worked under as a junior scribe in Renmark? Does this character have a name, a role in the conquest, or a fate?",
  "unk": true,
  "review_note": "Mentioned in Sero's canonical entry ('junior scribe for a minor lord in Renmark'). No standalone record anywhere. DB confirmed: 0 results."
}
```

### locations

```json
{
  "collection": "locations",
  "name": "Maren",
  "status": "in_development",
  "unk": true,
  "review_note": "World name. Canonical Locations.md header reads 'World: Maren'. Phase 2A migrated individual locations only. DB confirmed: 0 results. Bobby confirmed: create as locations record."
}
```

### cultures

```json
{
  "collection": "cultures",
  "name": "Caeldrath Culture",
  "status": "in_development",
  "unk": true,
  "body": "CAELDRATH CULTURE (The Resisting Kingdom)\n\nGovernance:\n- Ruled by one family for generations\n- Genuinely good governance...",
  "review_note": "Source: Bible Section 2.4. Culture of the walled independent kingdom. Distinct from CAELDRATH location record (L5) already in DB."
}
```

```json
{
  "collection": "cultures",
  "name": "Keth Culture",
  "status": "in_development",
  "unk": true,
  "body": "KETH CULTURE (Asharan Homeland)\n\nGeography as Culture:\n- Hot, dry climate shapes values...",
  "review_note": "Source: Bible Section 2.4. Distinct from KETH location record (L7) already in DB."
}
```

```json
{
  "collection": "cultures",
  "name": "Post-Collapse Fragmented Cultures",
  "status": "placeholder",
  "gap_prompt": "What are the 5-6 kingdoms that emerge from the Long Collapse (~Year 700-1100)? What are their names, locations, ruling styles, and cultural identities?",
  "unk": true,
  "body": "POST-COLLAPSE FRAGMENTED CULTURES (Year 1100+)\n\nCultural Chaos During Collapse:\n- Loss of unified trade..."
}
```

### factions

```json
{
  "collection": "factions",
  "name": "Asharan Priesthood",
  "status": "in_development",
  "unk": true,
  "body": "RELIGIOUS/SPIRITUAL BELIEFS — The Asharan Priesthood:\n- Priests/shamans perform the immortality ritual\n- Understand it intellectually—not spiritual mystery...",
  "review_note": "Source: Bible Section 2.4. The institution — one shaman/priest at a time. Distinct from C7 (The Shaman / Priest) which is one individual."
}
```

```json
{
  "collection": "factions",
  "name": "Caeldrath Ruling Family",
  "status": "placeholder",
  "gap_prompt": "What is the name of the ruling family that has governed Caeldrath for the entirety of Sero's known timeline?",
  "unk": true,
  "body": "CAELDRATH CULTURE — Governance:\n- Ruled by one family for generations\n- Genuinely good governance..."
}
```

### lore

```json
{
  "collection": "lore",
  "name": "Ritual Mechanics — Bobby's Account",
  "status": "in_development",
  "unk": true,
  "body": "The ritual is performed by the empire. The empress, our other main character who helps Sero, some type of priest/shaman. He was forced to drink blood of the empress and his own and he has no idea what was in the cup originally...",
  "review_note": "Gap Analysis ✓ decided (Bobby answered)."
}
```

```json
{
  "collection": "lore",
  "name": "Caldor Internal Geography",
  "status": "placeholder",
  "unk": true,
  "body": "Define the major geographical zones of Caldor — coast, mountains, plains, forest, desert...",
  "gap_prompt": "Define the major geographical zones of Caldor...",
  "review_note": "Gap Analysis ? still needed. May overlap with lore record 'Rough sketch of Caldor's internal geography' — review for consolidation before applying."
}
```

```json
{
  "collection": "lore",
  "name": "Asharan Empire Ideology",
  "status": "in_development",
  "unk": true,
  "body": "ASHARAN EMPIRE IDEOLOGY\n\nCore Belief System:\n- Paternalistic imperialism disguised as liberation...",
  "review_note": "Source: Bible Section 2.4. Classification as lore: worldbuilding fact about the universe, not a character or event. UNK because derived from story-bible document, not from canonical files."
}
```

### stories

```json
{
  "collection": "stories",
  "name": "The Search for Succession",
  "era": "era_seven",
  "year_label": "Age ~1700-2000",
  "stage": "idea",
  "unk": true,
  "body": "The Search for Succession:\n- Story: Other people who are being considered as Sero's potential successor...",
  "review_note": "Source: Bible Section 4. Keep as own record per Bobby instruction. May partially overlap with S34 and S40 in the DB — review before applying but do not merge or delete."
}
```

```json
{
  "collection": "stories",
  "name": "Caeldrath's Defiance",
  "era": "era_one",
  "year_label": "Age 0-700",
  "stage": "idea",
  "unk": true,
  "body": "Caeldrath's Defiance:\n- Story: How one kingdom resisted the Asharan Empire\n- Focus: The strategic, military, and diplomatic efforts to stay free...",
  "review_note": "Source: Bible Section 4. Related to S? (The Rise of Caeldrath, Fractured Kingdoms era) — different eras, keep both."
}
```

```json
{
  "collection": "stories",
  "name": "Caeldrath's International Role",
  "era": "era_five",
  "year_label": "Age ~1100-1600",
  "stage": "idea",
  "unk": true,
  "body": "Caeldrath's International Role:\n- Story: Caeldrath's diplomacy and relationships with surrounding kingdoms...",
  "review_note": "Source: Bible Section 4, Fractured Kingdoms era. World story (not Sero-centric). UNK — staged from Bible Section 4 source doc."
}
```

### writing

```json
{
  "collection": "writing",
  "title": "The Traveler — Introduction (Aldric Chaudry Draft)",
  "kind": "chapter",
  "unk": true,
  "body": "# Tab 1\n\nMonth/Year\n\nI awoke this morning to the sound of the tavern mistress...",
  "review_note": "Source: source-docs/drafts/The-Traveler-Introduction.md. Character count: 4859. Bobby locked this draft. Import verbatim; do not edit."
}
```

```json
{
  "collection": "writing",
  "title": "The Traveler — Chapter 1 (Origins Draft)",
  "kind": "chapter",
  "unk": true,
  "body": "\"The sea\", his father said, not even bothering to look up from his nets...",
  "review_note": "Source: source-docs/drafts/The-Traveler-1-Origins.md. Character count: 1663. Unfinished — ends mid-sentence. Import verbatim; do not edit the unfinished ending."
}
```

```json
{
  "collection": "writing",
  "title": "Early Chapter 1 Fragment (Chat Draft)",
  "kind": "snippet",
  "unk": true,
  "body": "Father, I wish you would at least allow me some say in my life...",
  "review_note": "Source: Consolidated-Story-Bible.md chat transcript, ~lines 2144-2149. Character count: 564. Import verbatim including original errors: 'follow you friends', incomplete sentence 'could never have hoped to'."
}
```

---

## Gate 2C checklist

- [x] All 2C sources fully read
- [x] `staging/story-bible.json` written with all proposed records (149 records)
- [x] `staging/story-bible-review.md` written (this file)
- [x] RPG files skipped and listed
- [x] "Claude responded" headings skipped (23 skipped)
- [x] All records tagged UNK = true
- [x] Text in `body` field is verbatim from source (not paraphrased)
- [x] review_note contains editorial decisions only
- [x] Name prefixes removed (GA:, GA-GAP:, BIBLE-GAP:)
- [x] Writing records have full verbatim text, char counts, first/last 60 chars
- [x] Overlapping gap pairs: both records kept, cross-reference reviewNote added to each
- [x] Maren created as locations record tagged UNK
- [x] "The Search for Succession" kept as own story record, reviewNote pointing to S34 and S40
- [x] Existing Bard record (C4) not edited
- [x] S34 and S40 not edited
- [x] DB queried for Eron, Menas, Local Lord, Maren — all confirmed absent
- [x] Coverage check: canonical Characters.md vs DB — all 36 match
- [x] Coverage check: canonical Locations.md vs DB — all 11 match
- [x] Count reconciliation documented
- [x] 9 missing Section 4 stories added
- [ ] Bobby reviews this report and the JSON
- [ ] Bobby approves before apply script is written

---

## Next step after gate

Once Bobby approves, write `scripts/import-story-bible.ts` following the pattern of `scripts/import-story-catalog.ts`:
- Idempotent: key on `sourceDocId` — skip existing records
- Apply UNK tag to every new record
- Write W (writing) records: import body text verbatim from `body` field
- Run the counters for C, L, U, F, K, S, W
- Gate rule: two runs must produce identical results (second run skips all)
