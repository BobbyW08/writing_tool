// Round trip for dragged-in mentions: the text stores the ID code, the editor shows the name,
// and saving writes the code back. Run with: npx tsx scripts/test-mentions.ts
import { createHeadlessEditor } from '@lexical/headless'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode } from '@lexical/code-core'
import { LinkNode } from '@lexical/link'
import { $getRoot, $isElementNode, type LexicalNode } from 'lexical'
import { extractCodes } from '../lib/codes'
import { writingPlainText } from '../lib/studio/plain-text'
import { MentionNode, $createMentionNode, proseTransformers } from '../lib/studio/mention-node'

const codeMap = { C4: { name: 'Bard (Original)', collection: 'characters' }, L1: { name: 'Westmark', collection: 'locations' } }
const transformers = proseTransformers(codeMap)
// The prose says "Bard" and "the old man", not the entry's full name. The code rides along in (...).
const source = "As he walked into the woods, he stumbled upon a man, [Bard](C4), he hadn't seen him in years.\n\nHe thought of [the old man](C4) and of C99, which is not a real entry."

function makeEditor() {
  return createHeadlessEditor({ nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode, MentionNode], onError: (e) => { throw e } })
}

let failed = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + detail}`)
  if (!ok) failed++
}

// 1. Load: codes that resolve become chips showing the name; unknown codes stay as text.
const editor = makeEditor()
editor.update(() => { $convertFromMarkdownString(source, transformers) }, { discrete: true })
const chips: { text: string; code: string }[] = []
let plain = ''
editor.getEditorState().read(() => {
  const walk = (n: LexicalNode) => {
    if (n instanceof MentionNode) chips.push({ text: n.getTextContent(), code: n.__mentionCode })
    if ($isElementNode(n)) n.getChildren().forEach(walk)
  }
  $getRoot().getChildren().forEach(walk)
  plain = $getRoot().getTextContent()
})
check('two chips created', chips.length === 2, JSON.stringify(chips))
check('chip shows the words as written, not the code', chips[0]?.text === 'Bard' && chips[0]?.code === 'C4' && chips[1]?.text === 'the old man' && chips[1]?.code === 'C4', JSON.stringify(chips))
check('unknown bare code stays plain text', plain.includes('C99'), plain)
check('no link syntax is left showing in the text', !plain.includes('](') && !plain.includes('[Bard'), plain)

// 2. Save: the chips export back as codes, so the stored text is unchanged.
let out = ''
editor.getEditorState().read(() => { out = $convertToMarkdownString(transformers) })
check('export gives back the original text', out === source, JSON.stringify(out))

// 3. A chip dropped in live (no code in the saved text yet) exports as its code too.
const live = makeEditor()
live.update(() => {
  $convertFromMarkdownString('He met a man, ', transformers)
  const p = $getRoot().getFirstChild()
  if ($isElementNode(p)) p.append($createMentionNode('Bard (Original)', 'C4', 'characters'))
}, { discrete: true })
let liveOut = ''
live.getEditorState().read(() => { liveOut = $convertToMarkdownString(transformers) })
check('a freshly dropped chip exports with its code', liveOut.trim() === 'He met a man, [Bard (Original)](C4)', JSON.stringify(liveOut))

// 3b. Older text with a bare code loads as a chip and is saved in the new form.
const old = makeEditor()
old.update(() => { $convertFromMarkdownString('He met C4 once.', transformers) }, { discrete: true })
let oldOut = ''
old.getEditorState().read(() => { oldOut = $convertToMarkdownString(transformers) })
check('a bare code from older text is saved as a labeled link', oldOut === 'He met [Bard (Original)](C4) once.', JSON.stringify(oldOut))

// 3c. A labeled link whose entry no longer resolves keeps its words and its code.
const gone = makeEditor()
gone.update(() => { $convertFromMarkdownString('He met [Orin](C77).', transformers) }, { discrete: true })
let goneOut = ''
gone.getEditorState().read(() => { goneOut = $convertToMarkdownString(transformers) })
check('a link to a missing entry keeps its words and code', goneOut === 'He met [Orin](C77).', JSON.stringify(goneOut))

// 4. Codes inside longer words are not touched.
const e4 = makeEditor()
e4.update(() => { $convertFromMarkdownString('ABC4 and C4x and C4.', transformers) }, { discrete: true })
const hits: string[] = []
e4.getEditorState().read(() => {
  const walk = (n: LexicalNode) => { if (n instanceof MentionNode) hits.push(n.__mentionCode); if ($isElementNode(n)) n.getChildren().forEach(walk) }
  $getRoot().getChildren().forEach(walk)
})
check('only the standalone code becomes a chip', hits.length === 1, JSON.stringify(hits))

// 5. Ordinary links and mentions live side by side in one line.
const e5 = makeEditor()
const mixed = 'See [the site](https://example.com) and [Bard](C4).'
e5.update(() => { $convertFromMarkdownString(mixed, transformers) }, { discrete: true })
let mixedOut = ''
e5.getEditorState().read(() => { mixedOut = $convertToMarkdownString(transformers) })
check('an ordinary link and a mention both round-trip', mixedOut === mixed, JSON.stringify(mixedOut))

// 6. The continuity check and the link index both read the saved Markdown.
check('plain text keeps only the words as written', writingPlainText(source) === "As he walked into the woods, he stumbled upon a man, Bard, he hadn't seen him in years. He thought of the old man and of C99, which is not a real entry.", writingPlainText(source))
const marks = '# Title\n\nA **bold** [Bard](C4) move.'
check('plain text still drops other Markdown marks', writingPlainText(marks) === 'Title A bold Bard move.', writingPlainText(marks))
check('link index finds the code inside the labeled form', JSON.stringify(extractCodes('met [Bard](C4) and [Westmark](L1).')) === JSON.stringify(['C4', 'L1']), JSON.stringify(extractCodes('met [Bard](C4) and [Westmark](L1).')))

console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`)
process.exit(failed === 0 ? 0 : 1)
