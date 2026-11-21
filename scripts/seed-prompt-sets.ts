// Loads lib/ai/prompt-seed.ts into the prompt_sets table. Upserts on (collection, group, label),
// so re-running it is safe and never duplicates rows (plan decision: imports upsert, never
// duplicate, hard rule 8 applied here even though this is seed data, not an import).
//
// Run after migration 0015_prompt_sets.sql is applied:
//   npx tsx --env-file=.env.local scripts/seed-prompt-sets.ts

import { eq, and } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { PROMPT_SEED } from '@/lib/ai/prompt-seed'

async function main() {
  let inserted = 0
  let updated = 0
  for (const seed of PROMPT_SEED) {
    const [existing] = await appDb.select({ id: schema.promptSets.id }).from(schema.promptSets)
      .where(and(
        eq(schema.promptSets.collection, seed.collection),
        eq(schema.promptSets.group, seed.group),
        eq(schema.promptSets.label, seed.label),
      ))
      .limit(1)

    if (existing) {
      await appDb.update(schema.promptSets)
        .set({ question: seed.question, detailLabel: seed.detailLabel, order: seed.order })
        .where(eq(schema.promptSets.id, existing.id))
      updated++
    } else {
      await appDb.insert(schema.promptSets).values({
        collection: seed.collection,
        group: seed.group,
        label: seed.label,
        question: seed.question,
        detailLabel: seed.detailLabel,
        order: seed.order,
        active: true,
      })
      inserted++
    }
  }
  console.log(`prompt_sets: ${inserted} inserted, ${updated} updated, ${PROMPT_SEED.length} total.`)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
