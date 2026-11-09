// react-calendar-timeline works in real calendar milliseconds. Our events use an
// abstract numeric `sort_order` ("Sero years"), not a real date — so we map sort_order
// N to (roughly) the year N AD and let the library's date engine do layout/zoom/scroll
// math for us. The mapping is purely a rendering trick; sort_order stays the source of
// truth and nothing here is a real calendar date.
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const EPOCH_MS = Date.UTC(1, 0, 1);

export function sortOrderToMs(sortOrder: number): number {
  return EPOCH_MS + sortOrder * MS_PER_YEAR;
}

export function msToSortOrder(ms: number): number {
  return Math.round((ms - EPOCH_MS) / MS_PER_YEAR);
}

export const ITEM_WIDTH_YEARS = 8; // visual width of each timeline item, in "years"

// ─── Time gaps ──────────────────────────────────────────────────────────────
// A gap visually squeezes a real span of years [fromYear, toYear) down to a narrower
// `collapsedTo` years on screen — a rendering trick on top of the rendering trick above.
// `sort_order` (the real year) never changes; only where it lands on the canvas does.
// Both functions are the identity when `gaps` is empty, so every existing call site behaves
// exactly as it did before this feature existed once no gap is configured.
export interface TimeGap {
  fromYear: number;
  toYear: number;
  collapsedTo: number;
  label: string;
}

function validGaps(gaps: TimeGap[]): TimeGap[] {
  return [...gaps]
    .filter((g) => g.toYear > g.fromYear && g.collapsedTo >= 0 && g.collapsedTo <= g.toYear - g.fromYear)
    .sort((a, b) => a.fromYear - b.fromYear);
}

// Real year -> compressed display year. Monotonic non-decreasing, so drag/zoom ordering holds.
export function compressYear(year: number, gaps: TimeGap[]): number {
  let shift = 0;
  for (const g of validGaps(gaps)) {
    const span = g.toYear - g.fromYear;
    if (year <= g.fromYear) break;
    if (year >= g.toYear) {
      shift += span - g.collapsedTo;
    } else {
      shift += (span - g.collapsedTo) * ((year - g.fromYear) / span);
      break;
    }
  }
  return year - shift;
}

// Inverse of compressYear: compressed display year -> real year.
export function expandYear(compressed: number, gaps: TimeGap[]): number {
  let shift = 0;
  for (const g of validGaps(gaps)) {
    const span = g.toYear - g.fromYear;
    const cFrom = g.fromYear - shift;
    const cTo = cFrom + g.collapsedTo;
    if (compressed <= cFrom) break;
    if (compressed >= cTo) {
      shift += span - g.collapsedTo;
    } else {
      const frac = g.collapsedTo > 0 ? (compressed - cFrom) / g.collapsedTo : 0;
      return g.fromYear + frac * span;
    }
  }
  return compressed + shift;
}

export function yearToMs(year: number, gaps: TimeGap[]): number {
  return sortOrderToMs(compressYear(year, gaps));
}

export function msToYear(ms: number, gaps: TimeGap[]): number {
  return expandYear(msToSortOrder(ms), gaps);
}
