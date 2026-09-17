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
