// Sheets are sets of prompts shown on an entry page. Answers are stored in the entry's `details`
// column as rows whose id starts with `sheet:`, so there is no table per sheet and no migration
// per question. Typed ID codes (C4, L2, I12) inside any answer render as links to those entries.
//
// A field key is permanent once answers exist. For the questionnaire the key comes from the
// question wording, so rewording a question means its old answer needs moving by hand.

export type SheetField = {
  key: string
  label: string
  hint?: string
  rows?: number
}

export type SheetGroup = { title?: string; fields: SheetField[] }

export type SheetSection = {
  id: string
  title: string
  intro?: string
  groups: SheetGroup[]
}

export type SheetTemplate = {
  title: string
  credit?: string
  sections: SheetSection[]
}

export const SHEET_ROW_PREFIX = 'sheet:'

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

// ─── Character sheet ─────────────────────────────────────────────────────────

function fields(prefix: string, items: (string | [string, string])[]): SheetField[] {
  return items.map((item) => {
    const [label, hint] = Array.isArray(item) ? item : [item, undefined]
    return { key: `${prefix}.${slug(label)}`, label, hint }
  })
}

const CHARACTER_SHEET: SheetTemplate = {
  title: 'Character sheet',
  sections: [
    {
      id: 'basics',
      title: 'Character basics',
      intro: 'The name is at the top of the page. Race, culture and birthplace are linked in Relationships.',
      groups: [{
        fields: fields('char.basics', [
          'Nickname and aliases',
          'Age',
          'Gender',
          'Background',
          'Social class',
          'Occupation',
          'Religious beliefs',
          'Reputation',
          'Voice and communication style',
          'Other notes',
        ]),
      }],
    },
    {
      id: 'appearance',
      title: 'Appearance',
      intro: 'The portrait goes in the box at the top right.',
      groups: [{
        fields: fields('char.appearance', [
          'Height',
          'Weight',
          'Body build',
          'Eye color',
          'Hair color and style',
          'Skin color',
          'Distinguishing features',
          'Physical disabilities',
          'Unusual physical traits',
        ]),
      }],
    },
    {
      id: 'clothing',
      title: 'Clothing and accessories',
      intro: 'What they wear says a lot about their world and their status.',
      groups: [{
        fields: fields('char.clothing', [
          'Day-to-day wear',
          'Work attire',
          'Formal wear',
          'Sleepwear and undergarments',
          'Accessories',
          ['Weapons', 'Type an item code like I12 to link the actual item.'],
        ]),
      }],
    },
    {
      id: 'personality',
      title: 'Personality and behavior',
      intro: 'The small, specific, odd details are what make a character feel real.',
      groups: [{
        fields: fields('char.personality', [
          'Core personality traits',
          'Strengths',
          'Weaknesses',
          'Moral alignment',
          'General attitude',
          'Fears and phobias',
          'Likes',
          'Dislikes',
          'Quirks and habits',
          'Favorite sayings and catchphrases',
        ]),
      }],
    },
    {
      id: 'backstory',
      title: 'Backstory and history',
      intro: 'What do they show the world, and what are they carrying?',
      groups: [{
        fields: fields('char.backstory', [
          'Family background',
          'Significant ancestors',
          'Childhood',
          'Teenage years',
          'Adulthood',
          'Current internal conflict',
          'Current external conflict',
          ['Main misbelief', 'The deep, unconscious false belief behind their worst decisions.'],
          ['Secrets they keep concealed', 'What they hide, and from whom.'],
        ]),
      }],
    },
    {
      id: 'health',
      title: 'Health and wellbeing',
      intro: 'Anything that affects how they move through the world, kept here so it stays consistent.',
      groups: [{
        fields: fields('char.health', [
          'Physical health',
          'Mental health',
          'Diet and exercise',
          'Sleeping patterns',
        ]),
      }],
    },
    {
      id: 'skills',
      title: 'Skills and abilities',
      intro: 'Keeps them from being overpowered in one scene and helpless in the next.',
      groups: [{
        fields: fields('char.skills', [
          'Natural abilities and innate skills',
          'Learned skills',
          ['Special abilities', 'Type, origin, limits and cost.'],
          'Combat style',
          'Preferred weapons',
          'Combat experience',
        ]),
      }],
    },
    {
      id: 'relationships',
      title: 'Relationships',
      intro: 'Add the actual links in Relationships below, so allies, rivals, love interests and family show on both pages. Use these for how the bonds feel and how they shift over the story.',
      groups: [{
        fields: fields('char.relationships', [
          'Allies and friends',
          'Enemies and rivals',
          'Love interests',
          'Family dynamics',
          'How these relationships change over the story',
        ]),
      }],
    },
    {
      id: 'goals',
      title: 'Goals and motivations',
      intro: 'What they want against what they actually need. Keep this in view while drafting.',
      groups: [{
        fields: fields('char.goals', [
          'What they want (external goal)',
          'What they need (internal need)',
          'Long-term personal goals',
          'Short-term personal goals',
          ['Core motivations', 'Revenge, love, power, identity, survival, or something else.'],
        ]),
      }],
    },
  ],
}

// ─── Location questionnaire ──────────────────────────────────────────────────

function qgroup(title: string, questions: string[]): SheetGroup {
  return { title, fields: questions.map((q) => ({ key: `loc.${slug(q)}`, label: q, rows: 2 })) }
}

const LOCATION_QUESTIONNAIRE: SheetTemplate = {
  title: 'Location questionnaire',
  credit: "Questions adapted from The Novel Factory's World Building Questionnaire.",
  sections: [
    {
      id: 'geography',
      title: 'Geography and nature',
      groups: [
        qgroup('Landscape', [
          'Are there forests?',
          'Are there tropical areas?',
          'Are there grasslands / plains?',
          'Describe the night sky.',
          'Describe the sky during the day.',
          'Are there multiple suns / moons?',
        ]),
        qgroup('Continents and countries', [
          'How are the continents laid out?',
          'How are the countries laid out?',
          'How much land is temperate, equatorial or polar?',
        ]),
        qgroup('Climate', [
          'What is the climate like?',
          'Is the climate consistent or changeable?',
        ]),
        qgroup('Natural resources', [
          'What natural resources are available in different regions?',
          'Which natural resources are scarce?',
        ]),
        qgroup('Seasons', [
          'How many seasons are there?',
          'How long are the seasons?',
          'What seasons are there? (spring / summer / autumn / winter or dry and wet? Something else?)',
        ]),
        qgroup('Weather', [
          'What is the weather like?',
          'Is the weather consistent or changeable?',
          'How does the weather affect people’s way of life?',
        ]),
        qgroup('Animals', [
          'Are there any unusual animals?',
          'What are the birds like?',
          'What are the small animals like?',
          'What are the large animals like?',
          'What are the reptiles like?',
          'What are the insects like?',
          'What are the sea creatures like?',
        ]),
        qgroup('Plants', [
          'What are the plants like?',
          'Are there many plants or just a few types?',
        ]),
      ],
    },
    {
      id: 'population',
      title: 'Population and politics',
      groups: [
        qgroup('Races', [
          'Are there non-human sentient species? Describe them.',
          'Did the people evolve on this planet or come from elsewhere?',
          'What is the relationship between the different species?',
          'What is the total population (of the planet / the country / the city, etc.)',
        ]),
        qgroup('Governance and economics', [
          'What titles / formalities are used?',
          'What is the system of government? Democracy? Dictatorship? Administration? Something else?',
          'Is it a matriarchy or a patriarchy?',
          'Does the leader have special protection (Kingsguard, secret service)?',
          'How long has the system of government been in place?',
          'What calendar is used?',
          'Does the government provide social assistance?',
          'Is there any centralised healthcare?',
          'Is there public transport?',
          'Are there publicly run communications systems?',
          'Do people trust the government?',
          'Do the majority of people approve of or disapprove of the government?',
          'What is the system or taxation?',
          'Does the government spy on its enemies? Its people?',
        ]),
        qgroup('Socio-economic classes', [
          'Are the people diverse or uniform?',
          'How big is the gap between rich and poor?',
          'Where and when did civilization begin?',
          'Do most people live in rural or urban areas?',
          'Is there a class system? Different levels of citizenship?',
          'Is there slavery?',
          'Is social mobility easy or hard?',
        ]),
        qgroup('Education', [
          'Is there any formal education?',
          'At what age do children start school?',
          'Is education available to all or only certain groups?',
          'Are different groups of people educated separately?',
          'Is there a written language?',
          'Are most people literate or illiterate?',
          'What are schools like?',
          'What are the different types of school for?',
        ]),
        qgroup('Employment', [
          'What is a highly desirable job?',
          'What is a lowly job?',
          'What are some common jobs?',
          'Are there professional guilds / institutes/ etc?',
          'How do you get into a professional guild?',
          'What benefits do you gain from being a member of a guild?',
        ]),
        qgroup('Agriculture', [
          'Are there any domesticated animals?',
          'What are the main crops?',
          'Are crops mostly consumed locally or traded?',
          'Is agriculture mostly local or industrially scaled?',
        ]),
        qgroup('Trade', [
          'What is the monetary system?',
          'Are there multiple currencies?',
          'Is there widespread trade?',
          'What goods and services are traded?',
        ]),
        qgroup('Conflict', [
          'Is there a form of police?',
          'Is there a formal army?',
          'How are wrongdoers tried and punished?',
          'Are criminals common or rare?',
          'Is there a military? What is it like?',
          'Are relations with neighbouring regions friendly or hostile?',
          'Is there any risk of civil war?',
          'Is there widespread conflict?',
          'How long ago was the most recent war?',
          'How damaging was the most recent war?',
          'What was the cause of the most recent war?',
        ]),
      ],
    },
    {
      id: 'culture',
      title: 'Culture',
      groups: [
        qgroup('Family and friendships', [
          'What is a normal family unit?',
          'Do people marry for love or other reasons? What reasons?',
          'Are the genders treated differently?',
          'Who raises the children?',
        ]),
        qgroup('Social rules', [
          'What is a gesture of respect (bowing, saluting)?',
          'What is considered a rude gesture?',
          'How do they curse? Gods? Body parts?',
          'What topics of conversation are controversial?',
          'Which topics of conversation are safe?',
          'What constitutes a social faux pas?',
          'Do people live in happiness or fear?',
          'Does the culture value strength or compassion more highly?',
          'Does the culture value wealth or generosity more highly?',
        ]),
        qgroup('Food', [
          'What does a feast look like?',
          'What does a basic pauper’s meal look like?',
          'Do people mostly eat meat, fish or vegetables?',
          'Do people eat plain or heavily flavoured food?',
          'Do people eat together or separately?',
          'Do people eat in small or large groups?',
          'What utensils do people use to eat?',
          'Are there many restaurants? Who goes to them?',
          'Are there street food sellers?',
          'What do people drink?',
          'Is the water generally clean enough to drink?',
          'Are some foods poisonous to certain people?',
          'What are the tables like? Shape? High or low?',
        ]),
        qgroup('Art', [
          'What forms of art are there?',
          'Do people value art?',
          'Can everyone afford art, or only the wealthy?',
          'What subjects does art concern itself with?',
        ]),
        qgroup('Religion', [
          'Do people believe in one God, many or none?',
          'Is there more than one religion?',
          'Do people make sacrifices to Gods?',
          'Do an elite control religion or is it accessible to all?',
          'What are temples like?',
          'What are the common superstitions?',
        ]),
        qgroup('Languages', [
          'What languages do people speak?',
          'Do most people speak more than one language?',
          'Is there a common language for trade?',
        ]),
        qgroup('Architecture', [
          'What are the cities like, if any?',
          'What are the houses like?',
          'Is architecture indulgent or functional?',
        ]),
        qgroup('Clothing and fashion', [
          'What do people wear?',
          'What is in fashion this year?',
          'What was in fashion last year?',
        ]),
        qgroup('Entertainment, celebrations and festivals', [
          'Is there theatre? Is it common or reserved for the wealthy?',
          'What’s the most popular form of entertainment?',
          'What are the major festivals?',
          'Describe a wedding.',
          'Describe a funeral.',
          'What are special celebratory foods?',
          'What sort of clothes do people wear on special occasions?',
        ]),
      ],
    },
    {
      id: 'technology',
      title: 'Science and technology',
      groups: [
        qgroup('Science and technology', [
          'Are the laws of nature / physics different to earth? Elaborate.',
          'What is the level of technology (stone age, hi tech)?',
          'Is technology use restricted?',
        ]),
      ],
    },
  ],
}

// Sheets by collection. Collections not listed here have no sheet.
export const SHEET_TEMPLATES: Record<string, SheetTemplate> = {
  characters: CHARACTER_SHEET,
  locations: LOCATION_QUESTIONNAIRE,
}

// ─── Story plot outlines ─────────────────────────────────────────────────────

export type PlotTemplate = {
  id: string
  title: string
  summary: string
  credit?: string
  stages: { name: string; hint: string }[]
}

export const PLOT_TEMPLATES: PlotTemplate[] = [
  {
    id: 'three_act',
    title: 'Three acts',
    summary: 'Beginning, middle and end. The simplest skeleton.',
    stages: [
      { name: 'Beginning', hint: 'Who the protagonist is and what their life is like at the start.' },
      { name: 'Middle', hint: 'What they run into and how the stakes grow.' },
      { name: 'End', hint: 'How it resolves and who they are by the end.' },
    ],
  },
  {
    id: 'five_stage',
    title: 'Five stages',
    summary: 'Status quo, rising action, climax, falling action, final outcome.',
    stages: [
      { name: 'Status quo', hint: 'The normal life before anything changes.' },
      { name: 'Rising action', hint: 'The pressure builds and the complications stack up.' },
      { name: 'Climax', hint: 'The moment everything turns on.' },
      { name: 'Falling action', hint: 'The fallout from the climax.' },
      { name: 'Final outcome', hint: 'Where everyone and everything ends up.' },
    ],
  },
  {
    id: 'heros_journey',
    title: "Hero's Journey",
    summary: 'Twelve stages that follow the protagonist out into the unknown and back.',
    stages: [
      { name: 'Ordinary world', hint: 'The protagonist in their everyday life.' },
      { name: 'Call to adventure', hint: 'What shakes that life up.' },
      { name: 'Refusal of the call', hint: 'Their doubts, and why they would rather stay safe.' },
      { name: 'Meeting the mentor', hint: 'Who gives them advice for what is coming.' },
      { name: 'Crossing the threshold', hint: 'The point where they cannot simply go back.' },
      { name: 'Tests, allies, enemies', hint: 'The challenges they face and who they meet.' },
      { name: 'Approach the innermost cave', hint: 'Preparing for the real danger or inner conflict.' },
      { name: 'The ordeal', hint: 'The great test, internal, external or both.' },
      { name: 'Reward', hint: 'What they gain for facing it.' },
      { name: 'Road back', hint: 'The start of the return to everyday life.' },
      { name: 'Resurrection', hint: 'The greatest battle and most dangerous encounter.' },
      { name: 'Return with the elixir', hint: 'What they bring home, and how they are changed.' },
    ],
  },
  {
    id: 'character_driven',
    title: "Character Driven Hero's Journey",
    summary: 'Twelve stages that follow the protagonist’s flaw, change and choice.',
    credit: 'Structure by Allen Palmer, as described by The Novel Factory.',
    stages: [
      { name: 'Incomplete', hint: 'What the protagonist is missing at the start.' },
      { name: 'Unsettled', hint: 'The outside force that challenges them.' },
      { name: 'Resistant', hint: 'How they refuse to do the right thing.' },
      { name: 'Encouraged', hint: 'What pushes them in the right direction.' },
      { name: 'Committed', hint: 'The bridges they burn so there is no going back.' },
      { name: 'Disoriented', hint: 'The unfamiliar challenges they face.' },
      { name: 'Inauthentic', hint: 'Their flaw comes into view and they still avoid it.' },
      { name: 'Confronted', hint: 'The point they can no longer ignore the flaw.' },
      { name: 'Reborn', hint: 'How they show they have changed.' },
      { name: 'Desperate', hint: 'The complications that ruin everything.' },
      { name: 'Decisive', hint: 'The climax choice between what they want and what they need.' },
      { name: 'Complete', hint: 'The outcome, and why it is morally just.' },
    ],
  },
]

export const PLOT_TEMPLATE_KEY = 'plot.template'

export function plotTemplateById(id: string | null | undefined): PlotTemplate | null {
  return PLOT_TEMPLATES.find((t) => t.id === id) ?? null
}

export function plotStageKey(templateId: string, stageName: string): string {
  return `plot.${templateId}.${slug(stageName)}`
}

// The sections a template shows once it is chosen. Answers are keyed by template, so switching
// templates never throws away what was written under the other one.
export function plotSections(template: PlotTemplate): SheetSection[] {
  return [{
    id: template.id,
    title: template.title,
    groups: [{
      fields: template.stages.map((s) => ({
        key: plotStageKey(template.id, s.name),
        label: s.name,
        hint: s.hint,
        rows: 3,
      })),
    }],
  }]
}
