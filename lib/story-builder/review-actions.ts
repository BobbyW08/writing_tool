'use server'

// Server actions for the Review facts lane of step UX4's Review screen. Runs the existing
// continuity check (lib/continuity/run-check.ts) on demand across a story's own pieces, and
// resolves one conflict at a time through the same resolveFlagAction everything else uses --
// this is a thinner front end onto it, not a new decision path (hard rule 14: the data layer is
// the one place canon changes).

import { eq } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { claimCheck, runContinuityCheck } from '@/lib/continuity/run-check'
import { listOpenDecisionsForWritingIds, type FlagRow } from '@/lib/continuity/queries'
import { resolveFlagAction, type ActionResult } from '@/lib/continuity/actions'
import { prefillUpdateCanon } from '@/lib/continuity/text'

// Same per-file table map convention as lib/continuity/queries.ts and lib/continuity/actions.ts.
type AnyWorldTable = typeof schema.characters
const WORLD_TABLE_MAP: Record<string, AnyWorldTable> = {
  characters: schema.characters as unknown as AnyWorldTable,
  locations: schema.locations as unknown as AnyWorldTable,
  items: schema.items as unknown as AnyWorldTable,
  cultures: schema.cultures as unknown as AnyWorldTable,
  factions: schema.factions as unknown as AnyWorldTable,
  races: schema.races as unknown as AnyWorldTable,
  languages: schema.languages as unknown as AnyWorldTable,
  lore: schema.lore as unknown as AnyWorldTable,
}

export async function runReviewFactsCheckAction(writingIds: number[]): Promise<{ ok: boolean; error?: string }> {
  if (writingIds.length === 0) return { ok: false, error: 'Select at least one piece to check.' }
  for (const id of writingIds) {
    const claimed = await claimCheck(id)
    if (claimed) await runContinuityCheck(id)
  }
  return { ok: true }
}

export async function listReviewFactsAction(writingIds: number[]): Promise<{ ok: boolean; flags: FlagRow[] }> {
  const flags = await listOpenDecisionsForWritingIds(writingIds)
  return { ok: true, flags }
}

// The Review screen's compact 3-button version of the full decision form (board 6): "both are
// true" and "changed over time" need a typed context and stay on the full /continuity/[flagCode]
// page, which this never replaces. "Keep my writing" (update_canon) has no text box here, so its
// replacement text is computed the same way the full page prefills its own form.
export async function resolveReviewFactAction(
  flag: Pick<FlagRow, 'code' | 'entryCollection' | 'entryId' | 'fieldLabel' | 'existingExcerpt' | 'newQuote'>,
  choice: 'keep_canon' | 'update_canon' | 'decide_later',
): Promise<ActionResult> {
  if (choice !== 'update_canon') return resolveFlagAction(flag.code, { choice })

  const table = WORLD_TABLE_MAP[flag.entryCollection]
  if (!table) return { ok: false, error: 'The entry this refers to no longer exists.' }
  const [entry] = await appDb.select({ details: table.details }).from(table as never).where(eq(table.id, flag.entryId)).limit(1)
  if (!entry) return { ok: false, error: 'The entry this refers to no longer exists.' }

  const details = ((entry as { details: { label: string; value: string }[] }).details) ?? []
  const fieldRow = details.find((d) => d.label.trim().toLowerCase() === flag.fieldLabel.trim().toLowerCase())
  const newFieldText = prefillUpdateCanon(fieldRow?.value ?? '', flag.existingExcerpt, flag.newQuote)

  return resolveFlagAction(flag.code, { choice, newFieldText })
}
