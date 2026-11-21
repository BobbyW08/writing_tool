import {
  type EditorConfig,
  type NodeKey,
  TextNode,
  type SerializedTextNode,
  type Spread,
} from 'lexical'
import { TRANSFORMERS, type TextMatchTransformer, type Transformer } from '@lexical/markdown'
import { PREFIX_TO_SLUG } from '@/lib/codes'

// ─── MentionNode ──────────────────────────────────────────────────────────────
// A chip that shows an entry's name inside the text. The saved Markdown holds the entry's ID code
// (C4) in its place, so the code stays the one permanent reference to the entry.

type SerializedMentionNode = Spread<
  { mentionCode: string; mentionCollection: string },
  SerializedTextNode
>

export class MentionNode extends TextNode {
  __mentionCode: string
  __mentionCollection: string

  constructor(text: string, mentionCode: string, mentionCollection: string, key?: NodeKey) {
    super(text, key)
    this.__mentionCode = mentionCode
    this.__mentionCollection = mentionCollection
  }

  static getType() { return 'mention' as const }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__text, node.__mentionCode, node.__mentionCollection, node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add('writing-mention')
    dom.setAttribute('data-mention', this.__mentionCode)
    dom.title = this.__mentionCode
    return dom
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      type: 'mention',
      mentionCode: this.__mentionCode,
      mentionCollection: this.__mentionCollection,
    }
  }

  static importJSON(serialized: SerializedMentionNode): MentionNode {
    const node = new MentionNode(serialized.text, serialized.mentionCode, serialized.mentionCollection)
    node.setFormat(serialized.format)
    node.setDetail(serialized.detail)
    node.setMode(serialized.mode)
    node.setStyle(serialized.style)
    return node
  }

  isToken(): boolean { return true }
}

export function $createMentionNode(name: string, code: string, collection: string): MentionNode {
  return new MentionNode(name, code, collection).setMode('token')
}

// ─── Markdown: a mention is stored as [words as written](ID code) ──────────────

export type CodeMap = Record<string, { name: string; collection: string } | null>

// Export writes a chip as [Bard](C4), so the prose keeps the words as written and still points at
// the entry. Import turns that back into a chip. A bare code from older text (C4 on its own) also
// becomes a chip when it points at a real entry, and is saved in the new form from then on.
export function makeMentionTransformer(codeMap: CodeMap): TextMatchTransformer {
  const known = Object.keys(codeMap).filter((c) => codeMap[c])
  const labeled = String.raw`\[([^\]\n]+)\]\(([A-Z]\d{1,6})\)`
  const bare = known.length > 0 ? String.raw`(?<![A-Za-z0-9])(?:${known.join('|')})(?![A-Za-z0-9])` : null
  const importRegExp = new RegExp(bare ? `${labeled}|${bare}` : labeled)
  return {
    dependencies: [MentionNode],
    export: (node) => {
      if (!(node instanceof MentionNode)) return null
      return `[${node.getTextContent().replace(/[[\]]/g, '')}](${node.__mentionCode})`
    },
    importRegExp,
    regExp: importRegExp,
    replace: (textNode, match) => {
      if (match[2]) {
        const code = match[2]
        const collection = codeMap[code]?.collection ?? PREFIX_TO_SLUG[code[0]] ?? ''
        textNode.replace($createMentionNode(match[1], code, collection))
        return
      }
      const info = codeMap[match[0]]
      if (!info) return
      textNode.replace($createMentionNode(info.name, match[0], info.collection))
    },
    type: 'text-match',
  }
}

// The default rules stay as they are, including Lexical's Markdown link rule: the mention rule is
// listed first, so [Bard](C4) is taken as a chip and an ordinary [text](https://...) link still works.
export const SHORTCUT_TRANSFORMERS: Transformer[] = TRANSFORMERS

// Everything the editor reads and writes Markdown with: mentions first, then the usual rules.
export function proseTransformers(codeMap: CodeMap): Transformer[] {
  return [makeMentionTransformer(codeMap), ...SHORTCUT_TRANSFORMERS]
}
