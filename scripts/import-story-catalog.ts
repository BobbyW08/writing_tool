// Phase 2B: Stage (and apply) the story catalog from Sero_Story_Catalog.md
// Run:   npx payload run scripts/import-story-catalog.ts          (stage only)
// Apply: npx payload run scripts/import-story-catalog.ts -- --apply
import { writeFileSync, readFileSync } from 'fs'
import { getPayload } from 'payload'
import config from '../payload.config'

const APPLY = process.argv.includes('--apply')

// ── Data ────────────────────────────────────────────────────────────────────
interface RawStory {
  seq: number
  catalogNumber: number | null
  name: string
  era: string
  format: string
  yearLabel: string
  startYear: number | null
  endYear: number | null
  floating: boolean
  unk: boolean
  formatNote: string | null
  beats: string[]
}

const RAW: RawStory[] = [
  {
    seq: 1, catalogNumber: 1,
    name: 'Nobody',
    era: 'era_one', format: 'novel',
    yearLabel: 'Age 20–23', startYear: 20, endYear: 23,
    floating: false, unk: false, formatNote: null,
    beats: [
      'Sero works as a junior scribe for a minor lord in Renmark; he meets Giana at the scribe shop and falls for her instantly.',
      "Friends ask Sero to join him on a navy ship to 'see the world'; Sero's father has forbidden him from doing so.",
      'The Asharan fleet is sighted on the horizon; the city knows they will arrive in a few hours. Nobles bicker over how to handle the situation. No one does anything.',
      "Navy ships are destroyed, the port is burned, and Asharan forces make an example of those who do not bow to the empress. They execute the 12 noble lords and their families. Sero's best friend was on one of those navy ships.",
      "Sero and the scribe shop are part of the government complex. People in government buildings are asked to swear fealty immediately; some refuse and are killed. Sero's father had fled to the scribe shop — they all swear fealty.",
      'As Asharan troops move through the city they funnel citizens to the main square — not hurting them, but using routes they clearly knew in advance.',
      "Over the next week the Asharans make vast improvements to city infrastructure: new wells, fixed roads. They begin teaching their language and telling people of Renmark that this land has always been part of Ashram.",
      "The scribe shop has always handled the city's major documentation; the owner spends time with Vashten teaching him the state of local affairs. Sero, Giana, and the owner prove useful helping the empire understand local records. They meet Vashten, the Empress's translator.",
      'The empress has a council of four — head/face coverings, all women — whom no one knows or meets.',
      'Vashten is appointed head of Renmark representing the Ashram empire. He gives speeches in the common tongue.',
      'Time passes. Sero is appointed Chief Historian. He undergoes the blood ritual with the Empress, passes out, wakes confused. No one tells him what it did.',
      "His first assignment: track down a scribe who left the continent hundreds of years ago and hasn't been heard from in over 250 years. At this point Sero does not know about the ritual and forever-long life — but starts noticing strange things.",
    ],
  },
  {
    seq: 2, catalogNumber: 2,
    name: "The Wife He Couldn't Save",
    era: 'era_one', format: 'short_story',
    yearLabel: 'Age 23–25', startYear: 23, endYear: 25,
    floating: false, unk: false, formatNote: null,
    beats: [
      'The second wave of Asharan civilian settlers unknowingly brings a disease Caldor has no immunity to.',
      'Giana falls ill while Sero is away on assignment; he abandons his post and comes home.',
      'Her final days are spent on their porch watching the ocean. She asks him to live a full life.',
      "Vashten tells Sero the truth: he'll never age or sicken and recovers from injuries much more quickly than normal. He was never supposed to tell Sero — he does so after Giana's death, when Sero is trying to understand why he didn't get sick.",
    ],
  },
  {
    seq: 3, catalogNumber: null,
    name: 'The Star-Farers',
    era: 'era_two', format: 'novella',
    yearLabel: 'Age 55–60', startYear: 55, endYear: 60,
    floating: false, unk: true, formatNote: null,
    beats: [
      "Sero investigates ruins in Caldor's interior and finds a sealed underground chamber — technology that makes no sense.",
      'Discovers the photograph: people standing before a metal structure reaching into the sky.',
      'Leaves the photograph locked in the archive; tells no one it exists.',
      'Finds fragmentary references to three more archives, on Caldor, Keth, and Mossend.',
    ],
  },
  {
    seq: 4, catalogNumber: 4,
    name: 'The Drawing Lesson',
    era: 'era_two', format: 'short_story',
    yearLabel: 'Age ~75', startYear: 75, endYear: null,
    floating: false, unk: true, formatNote: null,
    beats: [
      'A stranger on the road teaches Sero to draw, for no larger reason than passing the time.',
      'Sero is terrible at it. Over decades his sketches slowly improve alongside his written records.',
      'Deliberately small and human — a break from the historical sweep.',
    ],
  },
  {
    seq: 5, catalogNumber: 5,
    name: 'Bard',
    era: 'era_two', format: 'novel',
    yearLabel: 'Age 65–160', startYear: 65, endYear: 160,
    floating: false, unk: false, formatNote: null,
    beats: [
      'Bard, a junior scribe, arrives at a roadside inn having heard Sero described as a legend for eighteen months. Shocked by how cynical Sero actually is. Decides to chronicle him anyway.',
      "Over a century of travel together — Geralt-and-Jaskier dynamic. Bard gets sick; Vashten arranges a partial ritual granting extended but not eternal life.",
      "Around Age 120 (~Bard's age 55), Bard identifies a threat Sero refuses to believe. Bard is proven right, exposed in a Socrates-style trial he knows is rigged, and uses his execution as a platform. His final words spread across civilizations for centuries. Sero is with him when he dies.",
      'Sero vows never again to dismiss someone as untrustworthy without cause — and refuses to take another companion for nearly 200 years.',
      'Bard eventually dies of old age at 160, peacefully, with Sero present.',
    ],
  },
  {
    seq: 6, catalogNumber: 6,
    name: 'The Religious War He Watched',
    era: 'era_three', format: 'short_story',
    yearLabel: 'Age 200', startYear: 200, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      'Two sects of the same faith go to war over a doctrinal abstraction. Thousands die.',
      'Decades later, both sides quietly revise the very doctrine that caused the war.',
      'Sero holds the original texts proving how petty the split truly was.',
    ],
  },
  {
    seq: 7, catalogNumber: 7,
    name: 'The Forgotten Road',
    era: 'era_three', format: 'short_story',
    yearLabel: 'Age 280', startYear: 280, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      'Sero stumbles onto an abandoned inland trade route while traveling off his usual path.',
      "It becomes one of Caldor's busiest roads within a generation. No one remembers who actually found it.",
      'Quiet irony piece — his invisible fingerprints on history.',
    ],
  },
  {
    seq: 8, catalogNumber: 8,
    name: "The Merchant's Bargain",
    era: 'era_three', format: 'short_story',
    yearLabel: 'Floating, suggested Age 250–280', startYear: null, endYear: null,
    floating: true, unk: false, formatNote: null,
    beats: [
      'A merchant realizes Sero pays well for historical documents and starts selling him convincing forgeries.',
      "Sero doesn't notice at first — until an original document contradicts one he already bought.",
      'He tracks the merchant down and instead of punishing him, strikes a deal: teach me how you did it.',
      'The merchant becomes his authenticator, helping purge false documents from the archives.',
    ],
  },
  {
    seq: 9, catalogNumber: 9,
    name: 'The Minor King',
    era: 'era_three', format: 'short_story',
    yearLabel: 'Age 310', startYear: 310, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      'A genuinely good ruler implements real reforms; the nobility deposes him for it.',
      'The reforms fall to the wayside; disorder, shortage, and chaos arrive.',
      "The ruler says 'I told you so,' then leaves the land. Many follow and establish new territory. The former kingdom crumbles.",
      'Sero watches and learns: people cannot be swayed by force; change must be evoked from inside a person.',
    ],
  },
  {
    seq: 10, catalogNumber: 10,
    name: "Vashten's Last Assignment / Vashten's Death",
    era: 'era_three', format: 'short_story',
    yearLabel: 'Age ~350–400', startYear: 350, endYear: 400,
    floating: false, unk: true, formatNote: null,
    beats: [
      'Vashten, having served five Empresses, is dying of old age.',
      "His final act: appointing a young scribe, Nyneave, to find Sero and bring him home — possibly told from her POV, arriving expecting a legend or a madman.",
      'On his deathbed he tells Sero what he\'s done. Sero: "Of course you stuck me with someone on your way out."',
      "Vashten is the last living person who knows Sero's original name; that name dies with him.",
    ],
  },
  {
    seq: 11, catalogNumber: 11,
    name: 'First Journey to Keth',
    era: 'era_three', format: 'novella',
    yearLabel: 'Age 380', startYear: 380, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      "Sero travels to the empire's homeland for the first time, seeking the second archive.",
      'Discovers the empire is far older than anyone in Caldor ever knew.',
      "Learns the ritual's full three-element structure and gets the actual words — but confirms he can never provide the third element himself.",
    ],
  },
  {
    seq: 12, catalogNumber: 12,
    name: 'The Second Visit to the Star-Farers Archive',
    era: 'era_three', format: 'short_story',
    yearLabel: 'Age ~400–500', startYear: 400, endYear: 500,
    floating: false, unk: true, formatNote: null,
    beats: [
      'Sero returns to the original Star-Farer archive for the first time since discovering it at Age 55.',
      "He's a different person now — 350+ years, the ritual knowledge from Keth, Nyneave's early research feeding in.",
      "Finds something he missed the first time — something that reframes what the Star-Farers actually were (natural place to seed the 'ecological AI guardian' reveal).",
    ],
  },
  {
    seq: 13, catalogNumber: 13,
    name: 'The Vault Guardian / Nyneave (full arc)',
    era: 'era_four', format: 'novel',
    yearLabel: 'Age 420–650', startYear: 420, endYear: 650,
    floating: false, unk: false, formatNote: null,
    beats: [
      'Sero finds Nyneave and shows her the Renmark archive. Tells her: "There are things in here I do not understand." Her question in response tells him everything he needs to know. She takes the job.',
      "Decades of work together; around Age 500 her aging visibly slows — neither of them understands why (proximity to that specific archive).",
      "Around Age 620, Sero returns after leaving her alone for three years to find she's made discoveries he missed in 200 years of work there.",
      "At Age 650 she retires, wanting to see somewhere warm before the end. Once she leaves the archive's radius her aging catches up rapidly. She dies within months, far to the south.",
    ],
  },
  {
    seq: 14, catalogNumber: 14,
    name: 'The Language That Died While He Watched',
    era: 'era_four', format: 'short_story',
    yearLabel: 'Age ~460–500', startYear: 460, endYear: 500,
    floating: false, unk: true, formatNote: null,
    beats: [
      'A language Sero learned fluently centuries earlier is going extinct; only one native speaker remains, an old woman in a rural village.',
      'He visits her. They speak in a tongue no one nearby understands.',
      'When she dies, he is the last living speaker. He records everything he can remember in the archive.',
    ],
  },
  {
    seq: 15, catalogNumber: 15,
    name: 'The Assassination Attempt',
    era: 'era_four', format: 'short_story',
    yearLabel: 'Age 540', startYear: 540, endYear: null,
    floating: false, unk: true,
    formatNote: 'Catalog lists "Short Story/Novella" — format set to short_story.',
    beats: [
      "A well-organized, nearly successful attempt on Sero's life.",
      'He survives, but it rattles him enough that he disappears from his usual routes and restructures how he operates for two years.',
      "Raises the question of who's organized and patient enough to come this close.",
    ],
  },
  {
    seq: 16, catalogNumber: 16,
    name: 'The Woman Who Remembered',
    era: 'era_four', format: 'short_story',
    yearLabel: 'Floating, suggested Age 650–680', startYear: null, endYear: null,
    floating: true, unk: false, formatNote: null,
    beats: [
      'A woman claims to remember past lives — including events only Sero could know.',
      'He travels with her for years trying to determine if she\'s genuine.',
      "She dies of old age, smiling: \"I'll see you in my next life.\"",
      'He spends years afterward looking for a child who might remember him. Never finds her. Writes: "I don\'t know if she was real. But I wanted her to be."',
    ],
  },
  {
    seq: 17, catalogNumber: 17,
    name: 'The Child Who Asked Too Much',
    era: 'era_four', format: 'short_story',
    yearLabel: 'Age 660', startYear: 660, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      'A ten-year-old girl asks Sero questions that stop him cold — the kind no adult around her would dare ask.',
      'Before he can act to protect or guide her, the empire kills her as a heretic.',
      'One of his sharpest lessons in how little his knowledge can actually prevent.',
    ],
  },
  {
    seq: 18, catalogNumber: 18,
    name: 'Sero Jailed',
    era: 'era_four', format: 'short_story',
    yearLabel: 'Floating, suggested Age 680–700', startYear: null, endYear: null,
    floating: true, unk: false, formatNote: null,
    beats: [
      "Sero speaks a truth the empire doesn't want spread. He's imprisoned, faces execution.",
      "Released only because he's too valuable to lose — not because anyone relents on principle.",
      "He doesn't stop saying the things that got him jailed.",
    ],
  },
  {
    seq: 19, catalogNumber: 19,
    name: 'The Library That Burned',
    era: 'era_five', format: 'short_story',
    yearLabel: 'Age 700', startYear: 700, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      "One of Sero's private archives is burned by a panicking local official during unrest.",
      "He arrives three days too late. Takes inventory of what's gone.",
      'Breaks his core assumption that obscurity was ever enough protection.',
    ],
  },
  {
    seq: 20, catalogNumber: 20,
    name: 'The Vault Guardian (finding a second one)',
    era: 'era_five', format: 'short_story',
    yearLabel: 'Age 720', startYear: 720, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      'With Nyneave gone, Sero finds a new guardian for the Renmark archive.',
      "Shows her everything he can't explain — including the dead languages.",
      'Her question back to him becomes one of the most important lines in the saga.',
    ],
  },
  {
    seq: 21, catalogNumber: 21,
    name: "The King Who Wouldn't Die",
    era: 'era_five', format: 'short_story',
    yearLabel: 'Floating, suggested Age 700–900', startYear: null, endYear: null,
    floating: true, unk: false, formatNote: null,
    beats: [
      "A dying, beloved king's advisors beg Sero for the ritual. He refuses — it was never his to give.",
      "The king dies. His terrible son takes the throne and starts a war that kills thousands.",
      "Sero: even knowing the right answer, his hands are tied by rules that may not matter anymore.",
    ],
  },
  {
    seq: 22, catalogNumber: 22,
    name: 'The Collapse Confrontation',
    era: 'era_five', format: 'short_story',
    yearLabel: 'Age ~820', startYear: 820, endYear: null,
    floating: false, unk: true, formatNote: null,
    beats: [
      'A dying ruler confronts Sero directly: "You could have stopped this. You saw it coming."',
      'Sero\'s answer: "I told your grandmother. She didn\'t listen. Your mother didn\'t listen. You didn\'t listen. I\'m not here to save you. I\'m here to remember you."',
      "He writes it down. It doesn't make him feel better.",
    ],
  },
  {
    seq: 23, catalogNumber: 23,
    name: 'The Failed Retirement',
    era: 'era_five', format: 'short_story',
    yearLabel: 'Age ~825', startYear: 825, endYear: null,
    floating: false, unk: true,
    formatNote: 'Catalog lists "Short Story/Novella" — format set to short_story.',
    beats: [
      "Immediately after the empire's collapse, Sero decides he's done. Tells a groundskeeper he's staying at a hidden archive for good.",
      'Lasts a year. Travelers keep bringing news — a kingdom burning books, a war over a border dispute he\'s already documented six times.',
      "He leaves. Not because he wants to. Because he can't not.",
    ],
  },
  {
    seq: 24, catalogNumber: 24,
    name: 'What the Long Collapse Sounds Like',
    era: 'era_five', format: 'short_story',
    yearLabel: 'Age ~840–900', startYear: 840, endYear: 900,
    floating: false, unk: true,
    formatNote: 'Catalog describes as "Short Story (vignette series)" — format set to short_story.',
    beats: [
      'Not plot-driven — a series of vignettes across the darkest fifty years of the collapse.',
      'What Sero sees, records, and survives. No heroism, just witnessing.',
      'Good vehicle for texture: refugees, famine, disease, small acts of decency and cruelty.',
    ],
  },
  {
    seq: 25, catalogNumber: 25,
    name: 'First Journey to Mossend',
    era: 'era_five', format: 'short_story',
    yearLabel: 'Age 900', startYear: 900, endYear: null,
    floating: false, unk: true,
    formatNote: 'Catalog lists "Short Story/Novella" — format set to short_story.',
    beats: [
      'Sero crosses to the uninhabited third continent alone and finds the third archive.',
      'Months completely alone on an unexplored landmass — forests, wildlife, no other people.',
      'He never writes about this trip in his ledger — the one journey he keeps entirely to himself.',
    ],
  },
  {
    seq: 26, catalogNumber: 26,
    name: 'The City That Chose Death',
    era: 'era_five', format: 'short_story',
    yearLabel: 'Floating, suggested Age 950–1000', startYear: null, endYear: null,
    floating: true, unk: false, formatNote: null,
    beats: [
      'A city chooses to fight a besieging power rather than submit, knowing they will lose.',
      'Sero watches them choose death over survival — and for the first time in centuries, respects a choice he thinks is stupid.',
      '"They chose death over submission. I don\'t understand it. But I honor it."',
    ],
  },
  {
    seq: 27, catalogNumber: 27,
    name: 'The Apathy Years',
    era: 'era_six', format: 'short_story',
    yearLabel: 'Age ~1050–1150', startYear: 1050, endYear: 1150,
    floating: false, unk: true, formatNote: null,
    beats: [
      "Sero at his lowest ebb — not suicidal, just empty. He keeps working because he can't stop, but feels nothing about it.",
      "Possibly told from the outside — someone who meets him during this period and doesn't understand what they're looking at.",
    ],
  },
  {
    seq: 28, catalogNumber: 28,
    name: 'The Rival Chronicler',
    era: 'era_six', format: 'short_story',
    yearLabel: 'Floating, suggested Age 1100–1200', startYear: null, endYear: null,
    floating: true, unk: false, formatNote: null,
    beats: [
      "An aging mortal record-keeper has spent his whole life doing what Sero does — and resents Sero for making that life's work feel small.",
      "Accuses Sero of hoarding knowledge instead of teaching it. He's not wrong.",
      'Sero begins training him. He dies before the training is finished. Sero writes: "Died before knowing where the third archive was hidden."',
    ],
  },
  {
    seq: 29, catalogNumber: 29,
    name: 'The Plague of Truth',
    era: 'era_six', format: 'short_story',
    yearLabel: 'Floating, suggested Age 1100–1200', startYear: null, endYear: null,
    floating: true, unk: false, formatNote: null,
    beats: [
      'A movement arises that treats truth as sacred and lies as punishable by death — and starts burning books of "false history."',
      'They demand Sero open his archives for purging. He refuses and is declared a heretic.',
      'For the first time, Sero lies outright — claims the archives were destroyed, sends them on a false trail.',
      'Realizes: truth without context is just another tyranny.',
    ],
  },
  {
    seq: 30, catalogNumber: 30,
    name: 'The Printing Revolution',
    era: 'era_six', format: 'short_story',
    yearLabel: 'Age ~1100–1200', startYear: 1100, endYear: 1200,
    floating: false, unk: true, formatNote: null,
    beats: [
      'Printing technology reaches Caldor from Keth; literacy climbs fast.',
      'For 1,100 years Sero has been a primary conduit for information — now it moves without him.',
      "He expects relief. He isn't sure what he actually feels instead.",
    ],
  },
  {
    seq: 31, catalogNumber: 31,
    name: "The Cartographer's Lie",
    era: 'era_six', format: 'short_story',
    yearLabel: 'Age 1150', startYear: 1150, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      'A celebrated mapmaker has quietly falsified geographic details to please patrons.',
      'Sero holds the accurate maps and has to decide whether exposing the lie is worth the damage it will do.',
    ],
  },
  {
    seq: 32, catalogNumber: 32,
    name: 'The One Who Lived',
    era: 'era_six', format: 'short_story',
    yearLabel: 'Floating, suggested Age 1200–1350', startYear: null, endYear: null,
    floating: true, unk: false, formatNote: null,
    beats: [
      "A traveling companion doesn't die — they simply choose to leave, build an ordinary life, and thrive.",
      "Decades later Sero hears they're still alive, old but well. He never seeks them out.",
      'Writes their name under a new ledger category: "Lives well without me." Stares at the entry a long time.',
    ],
  },
  {
    seq: 33, catalogNumber: 33,
    name: 'The Long Peace',
    era: 'era_six', format: 'short_story',
    yearLabel: 'Age 1280–1340', startYear: 1280, endYear: 1340,
    floating: false, unk: false, formatNote: null,
    beats: [
      'A region of Caldor enters sixty years of genuine, sustained peace.',
      'Sero documents it meticulously — precisely because he knows it will end.',
    ],
  },
  {
    seq: 34, catalogNumber: 34,
    name: 'The Successor Who Said No',
    era: 'era_six', format: 'novella',
    yearLabel: 'Age 1350', startYear: 1350, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      'The most serious successor candidate Sero has ever found. She listens to everything for three days.',
      "Refuses on philosophical grounds: no single person should hold this much continuity.",
      "Sero can't fully refute her — he thinks about what she said for a century afterward.",
      'Establishes the "pattern and variation" beat: unlike everyone before her, she walks away whole.',
    ],
  },
  {
    seq: 35, catalogNumber: 35,
    name: 'New Lands',
    era: 'era_six', format: 'short_story',
    yearLabel: 'Age 1420', startYear: 1420, endYear: null,
    floating: false, unk: true,
    formatNote: 'Catalog lists "Short Story/Novella" — format set to short_story.',
    beats: [
      'First contact between Caldor and a previously unknown civilization.',
      'Sero serves as intermediary — and, privately, recognizes from the Star-Farer archive that this people were known once and then forgotten by history.',
    ],
  },
  {
    seq: 36, catalogNumber: 36,
    name: 'Third Visit to Keth',
    era: 'era_six', format: 'novella',
    yearLabel: 'Age ~1420–1500', startYear: 1420, endYear: 1500,
    floating: false, unk: true, formatNote: null,
    beats: [
      "Sero returns to the empire's homeland a third time. Keth's empire is visibly beginning its slow decline.",
      "He meets people who remember the glory days, people who don't believe it was ever real, and one person who asks a question about what the empire was actually for — one he can't answer.",
    ],
  },
  {
    seq: 37, catalogNumber: 37,
    name: 'The Invention He Recognized',
    era: 'era_six', format: 'short_story',
    yearLabel: 'Age 1580', startYear: 1580, endYear: null,
    floating: false, unk: false, formatNote: null,
    beats: [
      'A new technology emerges that Sero recognizes from the Star-Farer archive.',
      'He watches its development with quiet dread, weighing how much to share and whether accelerating it is even his role.',
    ],
  },
  {
    seq: 38, catalogNumber: 38,
    name: 'The Truth About the Long Collapse History Book',
    era: 'era_seven', format: 'short_story',
    yearLabel: 'Age ~1750', startYear: 1750, endYear: null,
    floating: false, unk: true, formatNote: null,
    beats: [
      'A historian publishes the "standard" account of the empire\'s fall — almost entirely wrong.',
      "Sero holds every record the historian never had access to.",
      'He goes back and forth on correcting the record; the story is ultimately about why he chooses silence.',
    ],
  },
  {
    seq: 39, catalogNumber: 39,
    name: 'Before the Two Boys',
    era: 'era_seven', format: 'novella',
    yearLabel: 'Age ~1870–1950', startYear: 1870, endYear: 1950,
    floating: false, unk: true, formatNote: null,
    beats: [
      'The 80-year search leading to Boy A and Boy B. Sero has identified that the three ritual pieces may finally be alignable and knows who holds the third element.',
      'He needs a candidate — this is the story of everyone he considered and rejected, or who rejected him, before the final book begins.',
    ],
  },
  {
    seq: 40, catalogNumber: 40,
    name: 'Two Boys and an Old Man',
    era: 'era_seven', format: 'novel',
    yearLabel: 'Age 1950–1985', startYear: 1950, endYear: 1985,
    floating: false, unk: false, formatNote: null,
    beats: [
      'Sero travels with Boy A and Boy B, testing them through stories told over tavern dinners — never his own origin.',
      'Boy A loves the cleverness and strategy in the tales; Boy B fixates on the human cost.',
      'Boy A dies on the road between tavern stops. Only Sero and Boy B continue.',
      'A patron recognizes Sero by an old title; Boy B realizes this man has lived far longer than any normal life.',
      "Sero finally tells his real origin story and offers Boy B the apprenticeship.",
      'Boy B refuses: "I will carry your stories as far as an ordinary life allows, and I will tell people the truth where I can. But I cannot be what you are." He leaves at a crossroads.',
      'Sero keeps moving. No exit. Just the archives and the road.',
    ],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildReviewNote(s: RawStory): string | null {
  const parts: string[] = []
  if (s.unk && s.yearLabel.includes('~')) {
    parts.push(`Year approximate per catalog ('${s.yearLabel}'). Confirm and remove UNK when set exactly.`)
  }
  if (s.formatNote) parts.push(s.formatNote)
  if (s.catalogNumber === null) {
    parts.push('No catalog number in source document; Era Two placement is a best guess from the document section — confirm.')
  }
  return parts.length > 0 ? parts.join(' ') : null
}

function buildReviewMd(records: ReturnType<typeof buildStagedRecords>): string {
  const lines: string[] = [
    '# Story Catalog — Gate 2B Review',
    '',
    '`source-docs/ideas/Sero_Story_Catalog.md`',
    '',
    '| Code | Cat# | Name | Era | Format | Start | End | Float | UNK |',
    '|------|------|------|-----|--------|-------|-----|-------|-----|',
  ]
  for (const s of records) {
    const cat = s.catalog_number ?? '—'
    const yr = s.start_year != null ? String(s.start_year) : '—'
    const end = s.end_year != null ? String(s.end_year) : '—'
    const fl = s.floating ? '✓' : ''
    const unk = s.unk ? '✓' : ''
    lines.push(`| ${s.proposed_code} | ${cat} | ${s.name} | ${s.era} | ${s.format} | ${yr} | ${end} | ${fl} | ${unk} |`)
  }
  lines.push('', '## Detail rows', '')
  for (const s of records) {
    lines.push(`### ${s.proposed_code} — ${s.name}`)
    lines.push(`- **yearLabel:** ${s.year_label ?? '—'}`)
    lines.push(`- **format:** ${s.format}${s.review_note ? ' *(see note)*' : ''}`)
    lines.push(`- **floating:** ${s.floating}  **unk:** ${s.unk}`)
    if (s.review_note) lines.push(`- **Review note:** ${s.review_note}`)
    lines.push(`- **Beats (${s.beats.length}):**`)
    for (const b of s.beats) lines.push(`  - ${b}`)
    lines.push('')
  }
  return lines.join('\n')
}

function buildStagedRecords() {
  return RAW.map(s => ({
    proposed_code: `S${s.seq}`,
    source_doc_id: `sero_story_catalog_${s.seq}`,
    catalog_number: s.catalogNumber,
    collection: 'stories',
    name: s.name,
    era: s.era,
    format: s.format,
    start_year: s.startYear,
    end_year: s.endYear,
    year_label: s.yearLabel,
    floating: s.floating,
    stage: 'idea',
    unk: s.unk,
    review_note: buildReviewNote(s),
    beats: s.beats,
  }))
}

// ── Stage ─────────────────────────────────────────────────────────────────────
if (!APPLY) {
  const staged = buildStagedRecords()
  const json = {
    meta: {
      source: 'source-docs/ideas/Sero_Story_Catalog.md',
      staged_at: new Date().toISOString(),
      count: staged.length,
      unk_count: staged.filter(s => s.unk).length,
      floating_count: staged.filter(s => s.floating).length,
    },
    records: staged,
  }
  writeFileSync('staging/story-catalog.json', JSON.stringify(json, null, 2))
  console.log('Wrote staging/story-catalog.json')
  writeFileSync('staging/story-catalog-review.md', buildReviewMd(staged))
  console.log('Wrote staging/story-catalog-review.md')
  console.log(`\n--- Staging summary ---`)
  console.log(`  Stories:  ${staged.length}`)
  console.log(`  UNK:      ${staged.filter(s => s.unk).length} (approximate years)`)
  console.log(`  Floating: ${staged.filter(s => s.floating).length}`)
  console.log(`\nGate 2B: review staging/story-catalog-review.md, then run with -- --apply`)
  process.exit(0)
}

// ── Apply (skip-existing) ────────────────────────────────────────────────────
const payload = await getPayload({ config })
const pl = payload as any

const unkRes = await pl.find({ collection: 'tags', where: { code: { equals: 'T1' } }, limit: 1, depth: 0 })
const unkTagId = unkRes.docs[0]?.id ?? null

const file = JSON.parse(readFileSync('staging/story-catalog.json', 'utf8'))
let created = 0, skipped = 0

for (const s of file.records) {
  const existing = await pl.find({
    collection: 'stories',
    where: { sourceDocId: { equals: s.source_doc_id } },
    limit: 1,
    depth: 0,
  })

  if (existing.docs.length > 0) {
    process.stdout.write(`  S ${s.proposed_code} ${s.name}\n`)
    skipped++
    continue
  }

  const data: Record<string, unknown> = {
    code: s.proposed_code,
    name: s.name,
    sourceDocId: s.source_doc_id,
    era: s.era,
    format: s.format,
    stage: s.stage,
    yearLabel: s.year_label ?? undefined,
    ...(s.start_year != null ? { startYear: s.start_year } : {}),
    ...(s.end_year != null ? { endYear: s.end_year } : {}),
    floating: s.floating,
    beats: (s.beats as string[]).map((b: string) => ({ beat: b })),
    ...(s.catalog_number != null ? { catalogNumber: s.catalog_number } : {}),
    ...(s.review_note ? { reviewNote: s.review_note } : {}),
    ...(s.unk && unkTagId ? { tags: [unkTagId] } : {}),
  }

  await pl.create({ collection: 'stories', data })
  process.stdout.write(`  + ${s.proposed_code} ${s.name}\n`)
  created++
}

console.log(`\nCreated ${created}, skipped ${skipped} stories`)
const r = await pl.find({ collection: 'stories', limit: 1, depth: 0 })
console.log(`stories total: ${r.totalDocs}`)
await pl.db?.destroy()
