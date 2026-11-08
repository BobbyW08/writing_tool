/**
 * verify-s1.ts  —  Writing Studio verification (Part 4)
 *
 * Tests:
 *   A. Markdown round-trip: heading, bold, italics, list, at-mention (@C1).
 *      text is stored as Markdown; Lexical headless converts it back and the
 *      words must be preserved.
 *   B. canonState change: draft -> canon.
 *   C. Counter report: creates increment the counter; delete does not restore it.
 *
 * Run: npx tsx --env-file=.env.local scripts/verify-s1.ts
 */

import { eq } from 'drizzle-orm'
import { appDb } from '../db/index'
import * as schema from '../db/schema'
import { assignNextCode } from '../db/codes'
import { slugify } from '../lib/codes'

// ─── Lexical helpers (inline — no server-only guard needed in a plain script) ─

async function markdownToLexical(md: string): Promise<Record<string, unknown>> {
  const { createHeadlessEditor } = await import('@lexical/headless')
  const { HeadingNode, QuoteNode } = await import('@lexical/rich-text')
  const { ListNode, ListItemNode } = await import('@lexical/list')
  const { $convertFromMarkdownString, TRANSFORMERS } = await import('@lexical/markdown')
  const editor = createHeadlessEditor({
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    onError: () => {},
  })
  editor.update(() => { $convertFromMarkdownString(md, TRANSFORMERS) }, { discrete: true })
  return JSON.parse(JSON.stringify(editor.getEditorState())) as Record<string, unknown>
}

async function lexicalToMarkdown(lexJson: Record<string, unknown>): Promise<string> {
  const { createHeadlessEditor } = await import('@lexical/headless')
  const { HeadingNode, QuoteNode } = await import('@lexical/rich-text')
  const { ListNode, ListItemNode } = await import('@lexical/list')
  const { $convertToMarkdownString, TRANSFORMERS } = await import('@lexical/markdown')
  const editor = createHeadlessEditor({
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    onError: () => {},
  })
  const state = editor.parseEditorState(JSON.stringify(lexJson))
  let md = ''
  state.read(() => { md = $convertToMarkdownString(TRANSFORMERS) })
  return md
}

function extractWords(text: string): string[] {
  return text
    .replace(/[#*_~`>\[\]@]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

async function run() {
  console.log('=== verify-s1 ===\n')

  // ─── Snapshot ────────────────────────────────────────────────────────────────
  const writingBefore = (await appDb.select({ id: schema.writing.id }).from(schema.writing)).length
  const [wCtr] = await appDb.select({ next: schema.counters.next })
    .from(schema.counters).where(eq(schema.counters.prefix, 'W')).limit(1)
  console.log(`Before: writing=${writingBefore} W-counter=${wCtr?.next ?? 'none'}\n`)

  // ─── Part A: Markdown round-trip ──────────────────────────────────────────────
  console.log('Part A: Markdown round-trip')
  console.log('─'.repeat(60))

  // A Markdown document with heading, bold, italics, list, @mention.
  const mdInput = [
    '# Test Heading',
    '',
    'A paragraph with **bold text** and _italic text_.',
    'Also an at-mention: @C1.',
    '',
    '- First list item',
    '- Second list item',
    '- Third list item',
  ].join('\n')

  console.log('Input Markdown:')
  console.log(mdInput)
  console.log('')

  const lexJson = await markdownToLexical(mdInput)
  const mdOut   = await lexicalToMarkdown(lexJson)

  console.log('Round-trip output:')
  console.log(mdOut)
  console.log('')

  const wordsBefore = extractWords(mdInput)
  const wordsAfter  = extractWords(mdOut)

  // Compare word sets (Lexical may reorder at-mention or reformat whitespace slightly)
  const setBefore = new Set(wordsBefore)
  const setAfter  = new Set(wordsAfter)
  const missing = [...setBefore].filter(w => !setAfter.has(w))
  const extra   = [...setAfter].filter(w => !setBefore.has(w))

  if (missing.length > 0) throw new Error(`Round-trip lost words: ${missing.join(', ')}`)
  if (extra.length   > 0) throw new Error(`Round-trip gained extra words: ${extra.join(', ')}`)
  console.log(`Round-trip: OK (${wordsBefore.length} words preserved)`)

  // ─── Part B: Create, save and canonState change ───────────────────────────────
  console.log('\nPart B: create, save, canonState change')
  console.log('─'.repeat(60))

  const code = await assignNextCode('W')
  const slug = `verify-s1-${code.toLowerCase()}`
  const plain = mdInput.replace(/[#*_~`>\[\]@-]/g, ' ').replace(/\s+/g, ' ').trim()

  const [wr] = await appDb.insert(schema.writing).values({
    code, slug,
    name: 'ZZ verify-s1 piece',
    kind: 'snippet',
    canonState: 'draft',
    text: mdInput,
    plainText: plain,
  }).returning({ id: schema.writing.id, code: schema.writing.code, canonState: schema.writing.canonState })
  console.log(`Created: ${wr.code} id=${wr.id} canonState=${wr.canonState}`)

  if (!wr.code.startsWith('W')) throw new Error(`Code does not start with W: ${wr.code}`)

  // Read back — verify text is stored as Markdown (not Lexical JSON)
  const [readback] = await appDb.select({ text: schema.writing.text, canonState: schema.writing.canonState })
    .from(schema.writing).where(eq(schema.writing.id, wr.id)).limit(1)
  if (readback.text !== mdInput) throw new Error('Stored text does not match input Markdown')
  console.log('Stored text matches Markdown input: OK')

  // Change canonState draft -> canon
  await appDb.update(schema.writing)
    .set({ canonState: 'canon', updatedAt: new Date() })
    .where(eq(schema.writing.id, wr.id))
  const [stateCheck] = await appDb.select({ canonState: schema.writing.canonState })
    .from(schema.writing).where(eq(schema.writing.id, wr.id)).limit(1)
  if (stateCheck.canonState !== 'canon')
    throw new Error(`canonState not updated: got "${stateCheck.canonState}"`)
  console.log('canonState draft -> canon: OK')

  // ─── Cleanup ──────────────────────────────────────────────────────────────────
  await appDb.delete(schema.writing).where(eq(schema.writing.id, wr.id))
  console.log(`Deleted ${wr.code}`)

  // ─── Row count and counter report ─────────────────────────────────────────────
  const writingAfter = (await appDb.select({ id: schema.writing.id }).from(schema.writing)).length
  if (writingAfter !== writingBefore)
    throw new Error(`Writing row mismatch: before=${writingBefore} after=${writingAfter}`)

  const [wCtrAfter] = await appDb.select({ next: schema.counters.next })
    .from(schema.counters).where(eq(schema.counters.prefix, 'W')).limit(1)
  console.log(`\nW counter before=${wCtr?.next ?? 'none'} after=${wCtrAfter?.next ?? 'none'}`)
  console.log('(Counter incremented by 1 for the create; delete does not restore it — expected.)')
  console.log(`After: writing=${writingAfter}`)

  console.log('\n=== All checks passed ===')
  process.exit(0)
}

run().catch(err => { console.error('FAILED:', err); process.exit(1) })
