import 'server-only'
import { and, eq } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { assignNextCode } from '@/db/codes'
import { findStaleClaims, staleClaimKey, type ChangedField, type ClaimRef } from './backward'

// Step S7, the backward check: called by the data layer whenever a canon field's wording is
// replaced (never just appended to), so a piece of writing that quoted the old wording does not
// go stale silently. One continuity flag (kind 'stale_claim') per claim that assumed the old
// wording, each paired with a continuity_history row (action 'changed') so it can be reverted
// independently of the others, the same way undoNewDetailAction and revertHistoryRowAction work.
export async function flagStaleClaims(entryCollection: string, entryId: number, changed: ChangedField[]): Promise<void> {
  if (changed.length === 0) return

  const claims: ClaimRef[] = await appDb.select({
    writingId: schema.claims.writingId,
    fieldLabel: schema.claims.fieldLabel,
    quote: schema.claims.quote,
  }).from(schema.claims).where(and(
    eq(schema.claims.entryCollection, entryCollection),
    eq(schema.claims.entryId, entryId),
  ))

  const flaggedRows = await appDb.select({
    writingId: schema.continuity.writingId,
    fieldLabel: schema.continuity.fieldLabel,
    newQuote: schema.continuity.newQuote,
  }).from(schema.continuity).where(and(
    eq(schema.continuity.entryCollection, entryCollection),
    eq(schema.continuity.entryId, entryId),
    eq(schema.continuity.kind, 'stale_claim'),
  ))
  const alreadyFlagged = new Set(flaggedRows.map((r) => staleClaimKey(r.writingId, r.fieldLabel, r.newQuote)))

  const stale = findStaleClaims({ changed, claims, alreadyFlagged })
  for (const flag of stale) {
    const flagCode = await assignNextCode('Q')
    const [created] = await appDb.insert(schema.continuity).values({
      code: flagCode,
      writingId: flag.writingId,
      entryCollection,
      entryId,
      kind: 'stale_claim',
      fieldLabel: flag.fieldLabel,
      existingExcerpt: flag.oldValue,
      newQuote: flag.quote,
      explanation: `${flag.fieldLabel} now says: "${flag.newValue}".`,
      status: 'open',
    }).returning({ id: schema.continuity.id })

    await appDb.insert(schema.continuityHistory).values({
      entryCollection,
      entryId,
      fieldLabel: flag.fieldLabel,
      action: 'changed',
      oldValue: flag.oldValue,
      newValue: flag.newValue,
      writingId: flag.writingId,
      flagId: created.id,
    })
  }
}
