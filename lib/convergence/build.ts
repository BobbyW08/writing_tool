// Turns a set of selected entry codes and the event list into the JSON story-script that
// i-storyline-js expects (see node_modules/i-storyline-js/src/js/utils/io.js's parseJSONFile,
// and src/js/index.js's loadJSON — not documented anywhere the package itself ships, this was
// read directly from the library's source since loadJSON's schema isn't in its README/wiki).
//
// Two or more selected entries "braid together" at any event whose `involves` contains two or
// more of them (per traveler-wiki-build-plan.md's "Multi-lane convergence view"): their lines
// share a session ID for the span starting at that event's year, then diverge back to their own
// session for the next span. Lines that never share an event stay in their own session for the
// entire timeline, so they never touch.

export interface ConvergenceEvent {
  code: string
  name: string
  startYear: number
  involvesCodes: string[]
}

interface StorySpan { Start: number; End: number; Session: number }
export interface ConvergenceStoryJSON { Story: { Characters: Record<string, StorySpan[]> } }
export interface ConvergencePoint { year: number; eventCode: string; eventName: string }

export interface ConvergenceBuild {
  storyJSON: ConvergenceStoryJSON
  points: ConvergencePoint[]
}

export function buildConvergenceStory(
  selectedCodes: string[],
  events: ConvergenceEvent[],
  padding = 10,
): ConvergenceBuild | null {
  const selected = new Set(selectedCodes)

  const touch = events
    .filter(e => e.involvesCodes.filter(c => selected.has(c)).length >= 2)
    .sort((a, b) => a.startYear - b.startYear)
  if (touch.length === 0) return null

  const touchYears = [...new Set(touch.map(t => t.startYear))].sort((a, b) => a - b)
  const minYear = touchYears[0] - padding
  const maxYear = touchYears[touchYears.length - 1] + padding
  const boundaries = [...new Set([minYear, ...touchYears, maxYear])].sort((a, b) => a - b)

  // Which selected codes converge at each touch year (union, in case two events share a year).
  const convergingAt = new Map<number, Set<string>>()
  for (const t of touch) {
    const set = convergingAt.get(t.startYear) ?? new Set<string>()
    for (const c of t.involvesCodes) if (selected.has(c)) set.add(c)
    convergingAt.set(t.startYear, set)
  }

  const baseSessionOf = new Map<string, number>()
  selectedCodes.forEach((code, i) => baseSessionOf.set(code, 100 + i))

  const characters: Record<string, StorySpan[]> = {}
  for (const code of selectedCodes) characters[code] = []

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i]
    const end = boundaries[i + 1]
    const convergingSet = convergingAt.get(start)
    for (const code of selectedCodes) {
      const session = convergingSet?.has(code)
        ? 1000 + touchYears.indexOf(start)
        : baseSessionOf.get(code)!
      characters[code].push({ Start: start, End: end, Session: session })
    }
  }

  return {
    storyJSON: { Story: { Characters: characters } },
    points: touch.map(t => ({ year: t.startYear, eventCode: t.code, eventName: t.name })),
  }
}
