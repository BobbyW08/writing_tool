// Shared pixel-per-year scale for the Story Builder canvas (step SB). A box's horizontal React Flow
// x position is always `year * YEAR_WIDTH` (hard rule 18: horizontal position is the record's year,
// never stored itself) -- SB2's ruler and SB3's boxes both read this so they always agree.
export const YEAR_WIDTH = 160 // px per year at zoom 1, in React Flow's own (unscaled) coordinate space
export const DEFAULT_START_YEAR = 0 // Year 0 is when SERO is born (hard rule 3)
export const DEFAULT_END_YEAR = 5

export function yearToX(year: number): number {
  return year * YEAR_WIDTH
}

export function xToYear(x: number): number {
  return x / YEAR_WIDTH
}
