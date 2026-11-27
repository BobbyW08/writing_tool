import type { ShelfEntry } from '@/lib/world/queries'

// Board 5's three merge pairings (hard rule 19): everything else is refused with a message rather
// than guessing new relationship semantics. Direction (which role each entry plays) does not
// depend on which box was physically dragged onto the other -- a location dropped onto a story
// means the same thing as a story dropped onto a location.
export type MergePairing =
  | { kind: 'character-character'; a: ShelfEntry; b: ShelfEntry }
  | { kind: 'appears-in'; character: ShelfEntry; story: ShelfEntry }
  | { kind: 'participated-in'; character: ShelfEntry; event: ShelfEntry }
  | { kind: 'places'; actor: ShelfEntry; location: ShelfEntry }

const PLACES_ACTOR_COLLECTIONS: ShelfEntry['collection'][] = ['characters', 'stories', 'events']

export function resolveMergePairing(a: ShelfEntry, b: ShelfEntry): MergePairing | null {
  if (a.collection === 'characters' && b.collection === 'characters') {
    return { kind: 'character-character', a, b }
  }

  if (a.collection === 'characters' && b.collection === 'stories') return { kind: 'appears-in', character: a, story: b }
  if (b.collection === 'characters' && a.collection === 'stories') return { kind: 'appears-in', character: b, story: a }

  // Bobby (2026-11-26): a character onto an event means it's one of their life events, so it
  // shows on the character's own page as a life-event timeline (hard rule 5, getEventsInvolving).
  if (a.collection === 'characters' && b.collection === 'events') return { kind: 'participated-in', character: a, event: b }
  if (b.collection === 'characters' && a.collection === 'events') return { kind: 'participated-in', character: b, event: a }

  if (PLACES_ACTOR_COLLECTIONS.includes(a.collection) && b.collection === 'locations') return { kind: 'places', actor: a, location: b }
  if (PLACES_ACTOR_COLLECTIONS.includes(b.collection) && a.collection === 'locations') return { kind: 'places', actor: b, location: a }

  return null
}
