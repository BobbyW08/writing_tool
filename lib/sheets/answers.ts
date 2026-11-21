import { SHEET_ROW_PREFIX } from '@/lib/sheets/templates'

type DetailRow = { label: string; value?: string | null; id?: string | null }

// Pulls the sheet answers out of an entry's details rows as { key: answer }.
export function sheetAnswers(details: DetailRow[] | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of details ?? []) {
    if (typeof row.id === 'string' && row.id.startsWith(SHEET_ROW_PREFIX) && row.value) {
      out[row.id.slice(SHEET_ROW_PREFIX.length)] = row.value
    }
  }
  return out
}

// The rows the free-form details editor should show: everything except sheet answers.
export function nonSheetRows<T extends DetailRow>(details: T[] | null | undefined): T[] {
  return (details ?? []).filter((r) => !(typeof r.id === 'string' && r.id.startsWith(SHEET_ROW_PREFIX)))
}
