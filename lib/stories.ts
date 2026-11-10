// The fixed option sets for `stories.era` and `stories.stage` (lib/world/fields.ts has the same
// values as select options). One place for the ordered list + label, so the stories list page and
// the story board grid can't drift apart. `era` here is the stories table's own free-text field
// ("the seven eras from the story catalog") -- unrelated to the Y-coded `eras` timeline collection.

export const STORY_ERAS = [
  { value: 'era_one', label: 'Era One: The Ordinary Life' },
  { value: 'era_two', label: 'Era Two: The Awakening' },
  { value: 'era_three', label: 'Era Three: Traveling Alone' },
  { value: 'era_four', label: 'Era Four: The Archive Years' },
  { value: 'era_five', label: 'Era Five: The Long Collapse' },
  { value: 'era_six', label: 'Era Six: New Orders' },
  { value: 'era_seven', label: 'Era Seven: The Search' },
] as const

export const STORY_ERA_LABELS: Record<string, string> = Object.fromEntries(
  STORY_ERAS.map(e => [e.value, e.label.split(':')[0]]),
)

export const STORY_STAGES = [
  { value: 'idea', label: 'Idea' },
  { value: 'outlined', label: 'Outlined' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'written', label: 'Written' },
  { value: 'shelved', label: 'Shelved' },
] as const

export const STORY_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  STORY_STAGES.map(s => [s.value, s.label]),
)

// Year 0 is the year SERO is born (CLAUDE.md hard rule 3), so a story's startYear/endYear already
// read as an in-universe age. A floating story (no fixed place on the timeline) still carries these
// as its suggested range from the migration ("Floating, suggested Age 250-280").
export function floatingRangeText(startYear?: number | null, endYear?: number | null): string | null {
  if (startYear == null && endYear == null) return null
  if (startYear != null && endYear != null) return `Suggested Age ${startYear}–${endYear}`
  return `Suggested Age ${startYear ?? endYear}`
}
