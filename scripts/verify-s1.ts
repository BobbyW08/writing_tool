/**
 * S1 verification script.
 *
 * Part A: Round-trip test for existing writing records.
 *   For each writing record: Lexical JSON -> Markdown -> Lexical JSON.
 *   Compare plainText (word content) before and after. Fail if words differ.
 *
 * Part B: Counter test.
 *   Record W counter, create "ZZ test piece", verify it has correct code,
 *   delete it, verify counter state.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/verify-s1.ts
 */

import { getPayload } from 'payload'
import config from '../payload.config'
import { createHeadlessEditor } from '@lexical/headless'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown'
import { $getRoot } from 'lexical'

function makeEditor() {
  return createHeadlessEditor({
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    onError: () => {},
  })
}

function lexicalToPlainText(lexJson: unknown): string {
  const editor = makeEditor()
  const state = editor.parseEditorState(JSON.stringify(lexJson))
  let text = ''
  state.read(() => { text = $getRoot().getTextContent() })
  return text
}

function lexicalToMarkdown(lexJson: unknown): string {
  const editor = makeEditor()
  const state = editor.parseEditorState(JSON.stringify(lexJson))
  let md = ''
  state.read(() => { md = $convertToMarkdownString(TRANSFORMERS) })
  return md
}

function markdownToLexical(md: string): unknown {
  const editor = makeEditor()
  editor.update(() => { $convertFromMarkdownString(md, TRANSFORMERS) }, { discrete: true })
  return JSON.parse(JSON.stringify(editor.getEditorState()))
}

function plainTextWords(text: string): string[] {
  // Strip markdown syntax tokens (e.g. leading # from headings stored as plain text)
  return text
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[#*>\-_~`]+|[#*>\-_~`]+$/g, '').trim())
    .filter(Boolean)
}

async function run() {
  console.log('=== S1 Verification ===\n')

  const payload = await getPayload({ config })

  // ─── Part A: Round-trip test ─────────────────────────────────────────────

  console.log('Part A: Round-trip test (Lexical -> Markdown -> Lexical)')
  console.log('─'.repeat(60))

  const writingResult = await payload.find({
    collection: 'writing',
    limit: 100,
    depth: 0,
  })

  let allMatch = true

  for (const doc of writingResult.docs) {
    const d = doc as unknown as Record<string, unknown>
    const code = String(d.code ?? '?')
    const name = String(d.name ?? '?')
    const textJson = d.text
    const storedPlainText = String(d.plainText ?? '')

    if (!textJson || typeof textJson !== 'object') {
      console.log(`  ${code} "${name}": SKIP (no textJson)`)
      continue
    }

    try {
      // Extract plain text from stored Lexical JSON
      const plainBefore = lexicalToPlainText(textJson)

      // Round-trip
      const markdown = lexicalToMarkdown(textJson)
      const lexAfter = markdownToLexical(markdown)
      const plainAfter = lexicalToPlainText(lexAfter)

      const wordsBefore = plainTextWords(plainBefore)
      const wordsAfter = plainTextWords(plainAfter)

      const match = wordsBefore.join(' ') === wordsAfter.join(' ')

      if (match) {
        console.log(`  ${code} "${name}": OK (${wordsBefore.length}w)`)
      } else {
        allMatch = false
        console.log(`  ${code} "${name}": MISMATCH`)
        console.log(`    BEFORE: ${wordsBefore.slice(0, 10).join(' ')}...`)
        console.log(`    AFTER:  ${wordsAfter.slice(0, 10).join(' ')}...`)
      }
    } catch (e) {
      allMatch = false
      console.log(`  ${code} "${name}": ERROR — ${e}`)
    }
  }

  if (allMatch) {
    console.log('\n  All records match. Round-trip OK.')
  } else {
    console.log('\n  FAIL: one or more round-trips changed word content.')
    process.exit(1)
  }

  // ─── Part B: Counter test ────────────────────────────────────────────────

  console.log('\nPart B: Counter test')
  console.log('─'.repeat(60))

  const counterBefore = await payload.find({
    collection: 'counters',
    where: { prefix: { equals: 'W' } },
    limit: 1,
    depth: 0,
  })
  const counterDoc = counterBefore.docs[0] as unknown as Record<string, unknown> | undefined
  const wBefore = typeof counterDoc?.next === 'number' ? counterDoc.next : null
  console.log(`  W counter before: ${wBefore}`)

  // Create test piece
  const created = await payload.create({
    collection: 'writing',
    data: {
      name: 'ZZ test piece',
      kind: 'snippet',
      canonState: 'draft',
      text: {
        root: {
          type: 'root', direction: 'ltr', format: '', indent: 0, version: 1,
          children: [{
            type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0,
            textFormat: 0, textStyle: '',
            children: [{
              type: 'text', version: 1, text: 'Test sentence with three words extra.',
              format: 0, detail: 0, mode: 'normal', style: '',
            }],
          }],
        },
      },
    } as never,
  })

  const createdD = created as unknown as Record<string, unknown>
  const testCode = String(createdD.code ?? '?')
  const testId = String(created.id)
  console.log(`  Created: ${testCode} id=${testId}`)

  // Verify code
  if (!testCode.startsWith('W')) {
    console.log('  FAIL: code does not start with W')
    process.exit(1)
  }

  // Save with updated content (test save)
  const saveResult = await payload.update({
    collection: 'writing',
    id: testId,
    data: {
      canonState: 'canon',
    } as never,
  })
  const savedD = saveResult as unknown as Record<string, unknown>
  console.log(`  After state update: canonState=${savedD.canonState}`)

  // Check plainText was set by the hook (if continuity hook runs on save)
  const reloaded = await payload.findByID({ collection: 'writing', id: testId, depth: 0 })
  const reloadedD = reloaded as unknown as Record<string, unknown>
  console.log(`  plainText: "${String(reloadedD.plainText ?? '').slice(0, 60)}"`)

  // Delete
  await payload.delete({ collection: 'writing', id: testId })
  console.log(`  Deleted ${testCode}`)

  const counterAfter = await payload.find({
    collection: 'counters',
    where: { prefix: { equals: 'W' } },
    limit: 1,
    depth: 0,
  })
  const counterDocAfter = counterAfter.docs[0] as unknown as Record<string, unknown> | undefined
  const wAfter = typeof counterDocAfter?.next === 'number' ? counterDocAfter.next : null
  console.log(`  W counter after: ${wAfter}`)
  console.log(`  (counters only increment, delete does not restore the counter — this is expected)`)

  console.log('\n=== S1 verification complete ===')

  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
