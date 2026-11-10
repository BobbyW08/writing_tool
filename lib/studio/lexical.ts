// Server-side Lexical <-> Markdown conversion for the round-trip test.
// Not imported by the browser editor.
import 'server-only'

type LexicalJson = Record<string, unknown>

// Lazy import to avoid loading in the browser bundle
async function getHeadlessConverter() {
  const { createHeadlessEditor } = await import('@lexical/headless')
  const { HeadingNode, QuoteNode } = await import('@lexical/rich-text')
  const { ListNode, ListItemNode } = await import('@lexical/list')
  const { CodeNode } = await import('@lexical/code-core')
  const { LinkNode } = await import('@lexical/link')
  const { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS } =
    await import('@lexical/markdown')

  function makeEditor() {
    // CodeNode and LinkNode are required even though nothing here uses code blocks or links
    // directly: the default TRANSFORMERS set's CODE and LINK transformers declare them as
    // dependencies, and $convertFromMarkdownString validates that every transformer's dependency
    // is registered. Same bug and same fix as app/(app)/write/[code]/editor.tsx -- see its comment.
    return createHeadlessEditor({
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode],
      onError: () => {},
    })
  }

  return { makeEditor, $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS }
}

export async function lexicalToMarkdown(lexicalJson: LexicalJson): Promise<string> {
  const { makeEditor, $convertToMarkdownString, TRANSFORMERS } = await getHeadlessConverter()
  const editor = makeEditor()
  const state = editor.parseEditorState(JSON.stringify(lexicalJson))
  let md = ''
  state.read(() => {
    md = $convertToMarkdownString(TRANSFORMERS)
  })
  return md
}

export async function markdownToLexical(markdown: string): Promise<LexicalJson> {
  const { makeEditor, $convertFromMarkdownString, TRANSFORMERS } = await getHeadlessConverter()
  const editor = makeEditor()
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS)
    },
    { discrete: true },
  )
  return JSON.parse(JSON.stringify(editor.getEditorState())) as LexicalJson
}
