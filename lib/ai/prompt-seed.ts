// Seed data for the prompts menu (step S6). Written fresh for this project, not reused from any
// other tool's wording (hard rule 17). Loaded by scripts/seed-prompt-sets.ts, which upserts each
// row keyed on (collection, group, label) so re-running it is safe.
//
// Scope: characters (all ten groups named in the plan) and factions, read as "organization" in
// the plan's example. Other collections have no prompt set yet; see traveler-wiki-build-plan.md.

export type PromptSeed = {
  collection: string
  group: string
  label: string
  question: string
  detailLabel: string
  order: number
}

function group(collection: string, groupName: string, items: [string, string][], startOrder: number): PromptSeed[] {
  return items.map(([label, question], i) => ({
    collection,
    group: groupName,
    label,
    question,
    detailLabel: label,
    order: startOrder + i,
  }))
}

export const PROMPT_SEED: PromptSeed[] = [
  // ─── characters ────────────────────────────────────────────────────────────
  ...group('characters', 'Presentation', [
    ['First impression', 'What does a stranger notice about them in the first ten seconds?'],
    ['How they carry themselves', 'How do they stand, move and take up space in a room?'],
    ['Signature detail', 'Is there one thing (an object, a scar, a habit) people remember them by?'],
  ], 0),
  ...group('characters', 'Origins', [
    ['Where they come from', 'What place, family or circumstance shaped their earliest years?'],
    ['What they left behind', 'What did leaving their origin cost them, if anything?'],
    ['Founding memory', 'Is there one early memory that still shapes how they act now?'],
  ], 0),
  ...group('characters', 'Current state', [
    ['Where they stand now', 'What is true about their life, work and relationships right now?'],
    ['What changed recently', 'What shifted for them not long before the story begins?'],
    ['What they are avoiding', 'Is there a problem they know about but have not faced yet?'],
  ], 0),
  ...group('characters', 'Birth', [
    ['Circumstances of birth', 'What were the circumstances around their birth, and did anything about it matter later?'],
    ['Family reaction', 'How did their family or community receive their birth?'],
  ], 0),
  ...group('characters', 'Death', [
    ['How they expect to die', 'If they ever think about it, how do they picture their own death?'],
    ['Unfinished business', 'What would they regret leaving undone if they died today?'],
  ], 0),
  ...group('characters', 'Naming', [
    ['Meaning of their name', 'Does their name carry a meaning, a namesake, or a story behind it?'],
    ['What they are called', 'Do different people call them something different, and why?'],
  ], 0),
  ...group('characters', 'Mental', [
    ['How they think under pressure', 'Do they freeze, plan, lash out, or something else, when things go wrong?'],
    ['What they believe about themselves', 'What is the one thing they believe about themselves that may not be true?'],
    ['Coping habits', 'What do they do, healthy or not, to manage stress or fear?'],
  ], 0),
  ...group('characters', 'Physical', [
    ['Build and bearing', 'How would someone describe their build, posture and general physical presence?'],
    ['Marks and scars', 'Do they carry any marks, scars or old injuries, and what caused them?'],
    ['Physical limits', 'Is there anything physical they cannot do, or struggle with?'],
  ], 0),
  ...group('characters', 'Personal', [
    ['What they want', 'What do they want more than almost anything else?'],
    ['What they fear', 'What are they most afraid of, and do they know it?'],
    ['Private rule', 'Is there a rule they hold themselves to that most people would not guess?'],
  ], 0),
  ...group('characters', 'Social', [
    ['How others see them', 'How does their reputation differ from how they see themselves, if at all?'],
    ['Who they trust', 'Who, if anyone, do they actually trust, and why them?'],
    ['Role in a group', 'When they are with others, what role do they tend to fall into?'],
  ], 0),

  // ─── factions (read here as "organization") ──────────────────────────────────
  ...group('factions', 'Geopolitical', [
    ['Territory and reach', 'What territory, cities or routes does this organization actually control or influence?'],
    ['Standing with neighbors', 'Are its neighbors allies, rivals, or something more complicated?'],
    ['What it wants from the world', 'What outcome is this organization working toward, beyond its own survival?'],
  ], 0),
  ...group('factions', 'Religious', [
    ['Relationship to belief', 'Does this organization answer to a religion, oppose one, or stay apart from the question?'],
    ['Rites and symbols', 'Does it have its own rites, oaths or symbols that mark who belongs?'],
  ], 0),
  ...group('factions', 'Military', [
    ['Fighting strength', 'What can this organization actually bring to a fight, and how does that compare to its reputation?'],
    ['How it recruits and trains', 'Where do its members come from, and how are they prepared?'],
    ['Its last real conflict', 'What is the most recent conflict that tested it, and how did it come out?'],
  ], 0),
  ...group('factions', 'Economic', [
    ['How it sustains itself', 'Where does its money, food or materiel actually come from?'],
    ['Who depends on it', 'Who outside the organization relies on it economically, and what happens to them if it fails?'],
  ], 0),
  ...group('factions', 'Internal structure', [
    ['Who holds real power', 'Who actually makes the decisions, as opposed to who appears to?'],
    ['How someone rises or falls', 'What does it take to gain standing in this organization, or to lose it?'],
    ['Internal fault line', 'Is there a disagreement or rivalry inside the organization that could split it?'],
  ], 0),
]
