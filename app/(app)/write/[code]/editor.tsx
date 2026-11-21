'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  $createRangeSelection,
  $createTextNode,
  $flushSyncAfterUpdate,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type LexicalNode,
  type RangeSelection,
  TextNode,
} from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LexicalTypeaheadMenuPlugin, MenuOption, type MenuTextMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $convertFromMarkdownString, $convertToMarkdownString, type Transformer } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode } from '@lexical/code-core'
import { LinkNode } from '@lexical/link'
import { saveWriting } from '@/lib/studio/actions'
import { listLinkableNames, type NameEntry } from '@/lib/studio/name-actions'
import { buildIndex, findMatches, suggestForAt, suggestForTyping, type NameIndex, type Suggestion } from '@/lib/studio/name-index'
import { ENTRY_DRAG_TYPE, type EntryDragPayload } from '@/lib/studio/drag'
import { snapToWordBoundary, nearerSide, needsSpace } from '@/lib/studio/drop-position'
import { MentionNode, $createMentionNode, proseTransformers, SHORTCUT_TRANSFORMERS, COLLECTION_LABEL, type CodeMap } from '@/lib/studio/mention-node'
import { type WritingRecord } from '@/lib/studio/queries'
import { recheckWritingAction } from '@/lib/continuity/actions'
import { SnippetCheckStatus, type CheckSummary } from '@/components/snippet-check-status'
import { WritingHistoryPanel, type WritingHistoryRowView } from '@/components/writing-history-panel'
import { Button } from '@/components/ui/button'

// ─── Linking by name ──────────────────────────────────────────────────────────

class NameOption extends MenuOption {
  suggestion: Suggestion
  constructor(suggestion: Suggestion) {
    super(suggestion.entry.code)
    this.suggestion = suggestion
  }
}

// Type a name and a short list of matching entries appears under the cursor. Tab or Enter links
// the highlighted one, and keep typing to ignore it. Typing @ opens the whole list instead.
function NameLinkPlugin({ index }: { index: NameIndex | null }) {
  const [editor] = useLexicalComposerContext()
  const [query, setQuery] = useState<string | null>(null)

  const triggerFn = useCallback(
    (text: string): MenuTextMatch | null => {
      if (!index) return null
      const at = /(?:^|\s)(@[^\s@]*)$/.exec(text)
      if (at) return { leadOffset: text.length - at[1].length, matchingString: at[1], replaceableString: at[1] }
      const typing = suggestForTyping(index, text)
      if (!typing) return null
      return { leadOffset: typing.start, matchingString: typing.typed, replaceableString: typing.typed }
    },
    [index],
  )

  const options = useMemo(() => {
    if (!index || query === null) return []
    const list = query.startsWith('@') ? suggestForAt(index, query.slice(1)) : (suggestForTyping(index, query)?.suggestions ?? [])
    return list.map((s) => new NameOption(s))
  }, [index, query])

  const onSelectOption = useCallback(
    (option: NameOption, nodeWithQuery: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        if (nodeWithQuery !== null) {
          const { entry, insertText } = option.suggestion
          const chip = $createMentionNode(insertText, entry.code, entry.collection)
          nodeWithQuery.replace(chip)
          chip.selectNext(0, 0)
        }
        closeMenu()
      })
    },
    [editor],
  )

  return (
    <LexicalTypeaheadMenuPlugin<NameOption>
      options={options}
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchorElementRef.current && options.length > 0
          ? (
            <div
              style={{
                position: 'fixed',
                left: anchorElementRef.current.getBoundingClientRect().left,
                top: anchorElementRef.current.getBoundingClientRect().bottom + 4,
                zIndex: 50,
              }}
              className="min-w-56 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
            >
              {options.map((opt, i) => (
                <div
                  key={opt.suggestion.entry.code}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onMouseDown={(e) => { e.preventDefault(); selectOptionAndCleanUp(opt) }}
                  className={`flex cursor-pointer items-baseline justify-between gap-4 px-3 py-2 text-sm ${selectedIndex === i ? 'bg-accent' : ''}`}
                >
                  <span>{opt.suggestion.entry.name}</span>
                  <span className="text-xs text-muted-foreground">{COLLECTION_LABEL[opt.suggestion.entry.collection] ?? ''}</span>
                </div>
              ))}
              <div className="border-t px-3 py-1 text-[11px] text-muted-foreground">Tab or Enter to link, keep typing to skip</div>
            </div>
          )
          : null
      }
    />
  )
}

// ─── Names typed out but not linked yet ──────────────────────────────────────

function $plainTextNodes(): TextNode[] {
  const out: TextNode[] = []
  const walk = (node: LexicalNode) => {
    if ($isTextNode(node) && !(node instanceof MentionNode)) out.push(node)
    else if ($isElementNode(node)) node.getChildren().forEach(walk)
  }
  $getRoot().getChildren().forEach(walk)
  return out
}

// Lists names that appear in the writing as plain words, with a button to link each one or all of
// them. A link keeps the words exactly as written. It only adds the connection behind them.
function UnlinkedNamesPanel({ index }: { index: NameIndex | null }) {
  const [editor] = useLexicalComposerContext()
  const [found, setFound] = useState<{ entry: NameEntry; count: number }[]>([])

  useEffect(() => {
    if (!index) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const scan = () => {
      editor.getEditorState().read(() => {
        const counts = new Map<string, { entry: NameEntry; count: number }>()
        for (const node of $plainTextNodes()) {
          for (const m of findMatches(index, node.getTextContent())) {
            const cur = counts.get(m.entry.code)
            if (cur) cur.count += 1
            else counts.set(m.entry.code, { entry: m.entry, count: 1 })
          }
        }
        setFound([...counts.values()].sort((a, b) => a.entry.name.localeCompare(b.entry.name)))
      })
    }
    scan()
    const off = editor.registerUpdateListener(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(scan, 500)
    })
    return () => { off(); if (timer) clearTimeout(timer) }
  }, [editor, index])

  const link = useCallback(
    (code?: string) => {
      if (!index) return
      editor.update(() => {
        for (const node of $plainTextNodes()) {
          const text = node.getTextContent()
          const matches = findMatches(index, text).filter((m) => !code || m.entry.code === code)
          if (matches.length === 0) continue
          const offsets = [...new Set(matches.flatMap((m) => [m.start, m.end]))].filter((o) => o > 0 && o < text.length).sort((a, b) => a - b)
          const parts = offsets.length > 0 ? node.splitText(...offsets) : [node]
          const bounds = [0, ...offsets, text.length]
          parts.forEach((part, i) => {
            const m = matches.find((x) => x.start === bounds[i] && x.end === bounds[i + 1])
            if (m) part.replace($createMentionNode(m.text, m.entry.code, m.entry.collection))
          })
        }
      })
    },
    [editor, index],
  )

  if (found.length === 0) return null
  return (
    <div className="mt-6 rounded-md border border-dashed px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">Names in the text that are not linked yet</span>
        <Button variant="ghost" size="sm" onClick={() => link()}>Link all</Button>
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        {found.map((f) => (
          <button
            key={f.entry.code}
            type="button"
            onClick={() => link(f.entry.code)}
            className="rounded border px-2 py-0.5 text-xs hover:bg-accent"
          >
            Link {f.entry.name}{f.count > 1 ? ` (${f.count})` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Drop plugin (drag an entry from the world tree into the text) ───────────

type CaretDocument = Document & {
  caretRangeFromPoint?: (x: number, y: number) => Range | null
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
}

function caretRangeAt(x: number, y: number): Range | null {
  const doc = document as CaretDocument
  if (doc.caretRangeFromPoint) return doc.caretRangeFromPoint(x, y)
  const pos = doc.caretPositionFromPoint?.(x, y)
  if (!pos) return null
  const range = document.createRange()
  range.setStart(pos.offsetNode, pos.offset)
  range.collapse(true)
  return range
}

// The characters immediately either side of a (collapsed) selection point, so the caller can tell
// whether a space is already there without re-deriving it from node/offset bookkeeping twice.
function charsAroundSelection(selection: RangeSelection): { before?: string; after?: string } {
  const anchor = selection.anchor
  const node = anchor.getNode()
  if (anchor.type === 'text' && $isTextNode(node)) {
    const text = node.getTextContent()
    return { before: text[anchor.offset - 1], after: text[anchor.offset] }
  }
  if ($isElementNode(node)) {
    const children = node.getChildren()
    const before = children[anchor.offset - 1]
    const after = children[anchor.offset]
    return {
      before: before && $isTextNode(before) ? before.getTextContent().slice(-1) : undefined,
      after: after && $isTextNode(after) ? after.getTextContent().slice(0, 1) : undefined,
    }
  }
  return {}
}

function DropEntryPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const hasEntry = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes(ENTRY_DRAG_TYPE)

    const onDragOver = (e: DragEvent) => {
      if (!hasEntry(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      ;(e.currentTarget as HTMLElement).dataset.dropping = 'true'
    }
    const onDragLeave = (e: DragEvent) => {
      delete (e.currentTarget as HTMLElement).dataset.dropping
    }
    const onDrop = (e: DragEvent) => {
      delete (e.currentTarget as HTMLElement).dataset.dropping
      if (!hasEntry(e)) return
      e.preventDefault()
      e.stopPropagation()
      let entry: Partial<EntryDragPayload>
      try { entry = JSON.parse(e.dataTransfer?.getData(ENTRY_DRAG_TYPE) ?? '') } catch { return }
      if (!entry.code || !entry.name || !entry.collection) return
      const { code, name, collection } = entry
      const range = caretRangeAt(e.clientX, e.clientY)
      const dropX = e.clientX

      editor.update(() => {
        if (range) {
          const domSelection = $createRangeSelection()
          domSelection.applyDOMRange(range)
          $setSelection(domSelection)
        }
        let selectionOrNull = $getSelection()
        if (!$isRangeSelection(selectionOrNull)) {
          $getRoot().selectEnd()
          selectionOrNull = $getSelection()
        }
        if (!$isRangeSelection(selectionOrNull)) return
        let selection: RangeSelection = selectionOrNull

        // Never drop inside a linked name: land just before or after it instead, whichever side
        // the pointer is nearer to.
        const anchorNode = selection.anchor.getNode()
        if (anchorNode instanceof MentionNode) {
          const dom = editor.getElementByKey(anchorNode.getKey())
          const rect = dom?.getBoundingClientRect()
          const side = rect ? nearerSide(dropX, rect.left, rect.width) : 'before'
          selection = side === 'before' ? anchorNode.selectPrevious() : anchorNode.selectNext()
        } else if (selection.anchor.type === 'text') {
          const node = selection.anchor.getNode()
          if ($isTextNode(node)) {
            const snapped = snapToWordBoundary(node.getTextContent(), selection.anchor.offset)
            if (snapped !== selection.anchor.offset) {
              selection.anchor.set(node.getKey(), snapped, 'text')
              selection.focus.set(node.getKey(), snapped, 'text')
            }
          }
        }

        const { before, after } = charsAroundSelection(selection)
        const nodes: LexicalNode[] = [$createMentionNode(name, code, collection)]
        if (needsSpace(after)) nodes.push($createTextNode(' '))
        if (needsSpace(before)) nodes.unshift($createTextNode(' '))
        selection.insertNodes(nodes)
      })
      editor.focus()
    }

    return editor.registerRootListener((root, prev) => {
      prev?.removeEventListener('dragover', onDragOver)
      prev?.removeEventListener('dragleave', onDragLeave)
      prev?.removeEventListener('drop', onDrop)
      root?.addEventListener('dragover', onDragOver)
      root?.addEventListener('dragleave', onDragLeave)
      root?.addEventListener('drop', onDrop)
    })
  }, [editor])

  return null
}

// ─── Word count plugin ────────────────────────────────────────────────────────

function WordCountPlugin({ onCount }: { onCount: (n: number) => void }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent()
        onCount(text.trim() ? text.trim().split(/\s+/).length : 0)
      })
    })
  }, [editor, onCount])
  return null
}

// ─── Main editor component ────────────────────────────────────────────────────

const KIND_OPTIONS = [
  { value: 'chapter', label: 'Chapter' },
  { value: 'scene', label: 'Scene' },
  { value: 'snippet', label: 'Snippet' },
]

const STATE_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'canon', label: 'Canon' },
  { value: 'set_aside', label: 'Set aside' },
]

export function WritingEditor({
  record,
  stories,
  summary,
  codeMap,
  history,
  onFieldsSaved,
}: {
  record: WritingRecord
  stories: { id: number; code: string; name: string }[]
  summary: CheckSummary
  // Names for the codes already in the saved text, so they load as chips.
  codeMap: CodeMap
  // Every change this piece of writing has caused (step S7, "Leaving Canon"). Optional so other
  // embeddings of this editor (none yet) are not forced to fetch it.
  history?: WritingHistoryRowView[]
  // Called after a successful save with the fields that changed. Lets an embedding page (the
  // story's "keep writing" section, step U3) keep its own list of this story's writing records
  // in sync without a full page reload.
  onFieldsSaved?: (patch: { name?: string; kind?: string; canonState?: string; wordCount?: number }) => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Fields state
  const [name, setName] = useState(record.name)
  const [kind, setKind] = useState(record.kind)
  const [canonState, setCanonState] = useState(record.canonState)
  const [startYear, setStartYear] = useState(record.startYear?.toString() ?? '')
  const [storyId, setStoryId] = useState(record.storyId?.toString() ?? '')
  const [focusMode, setFocusMode] = useState(false)

  // Save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [wordCount, setWordCount] = useState(0)

  // Refs for autosave — text is stored as Markdown
  const textRef = useRef<string>(record.text)
  const [nameIndex, setNameIndex] = useState<NameIndex | null>(null)
  useEffect(() => {
    let active = true
    listLinkableNames().then((names) => { if (active) setNameIndex(buildIndex(names)) })
    return () => { active = false }
  }, [])
  const transformers = useMemo<Transformer[]>(() => proseTransformers(codeMap), [codeMap])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleAutoSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      const result = await saveWriting(record.id, {
        name,
        kind,
        canonState,
        startYear: startYear ? parseInt(startYear, 10) : null,
        storyId: storyId ? parseInt(storyId, 10) : null,
        text: textRef.current,
      })
      setSaveStatus(result.ok ? 'saved' : 'error')
      if (result.ok) {
        setSavedAt(new Date())
        router.refresh()
        onFieldsSaved?.({ name, kind, canonState, wordCount })
      }
    }, 2000)
  }, [record.id, name, kind, canonState, startYear, storyId, router, wordCount, onFieldsSaved])

  // Save immediately when non-text fields change
  function saveImmediate(overrides: Partial<Parameters<typeof saveWriting>[1]> = {}) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    startTransition(async () => {
      const result = await saveWriting(record.id, {
        name,
        kind,
        canonState,
        startYear: startYear ? parseInt(startYear, 10) : null,
        storyId: storyId ? parseInt(storyId, 10) : null,
        text: textRef.current,
        ...overrides,
      })
      setSaveStatus(result.ok ? 'saved' : 'error')
      if (result.ok) {
        setSavedAt(new Date())
        router.refresh()
        onFieldsSaved?.({
          name: overrides.name ?? name,
          kind: overrides.kind ?? kind,
          canonState: overrides.canonState ?? canonState,
          wordCount,
        })
      }
    })
  }

  const handleWordCount = useCallback((n: number) => setWordCount(n), [])

  // Parse the initial editor state
  const initialConfig = {
    namespace: `writing-${record.id}`,
    theme: {
      root: 'writing-root',
      paragraph: 'writing-p',
      heading: { h1: 'writing-h1', h2: 'writing-h2', h3: 'writing-h3' },
      quote: 'writing-quote',
      code: 'writing-code',
      link: 'writing-link',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
    },
    // CodeNode and LinkNode are required here even though this surface has no code/link toolbar
    // button: the default Markdown transformer set (used by both $convertFromMarkdownString below and
    // MarkdownShortcutPlugin) includes the CODE and LINK transformers, and each declares the node
    // type it produces as a `dependencies` entry. Lexical checks those dependencies against
    // initialConfig.nodes at registration time and throws "missing dependency ... for transformer"
    // if a referenced node type isn't registered -- which crashed every /write/[code] page (the
    // pre-existing Lexical #173 / React #418 bug, Phase 4 gap #2) before these two were added.
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode, MentionNode],
    onError: (err: Error) => console.error('[Writing Editor]', err),
    editorState: () => {
      $convertFromMarkdownString(record.text ?? '', transformers)
      // Lexical's own initializer wraps this call in a non-discrete editor.update(), whose commit
      // is deferred to a microtask. RichTextPlugin's placeholder reads the *committed* state
      // without flushing pending updates, so on the server the synchronous render pass serializes
      // before that microtask runs (placeholder shown even for non-empty text) while the client,
      // hydrating slightly later, sees the already-committed state (placeholder hidden) --
      // a hydration mismatch on every piece of writing that already has text. Forcing a synchronous
      // commit here keeps the two passes consistent.
      $flushSyncAfterUpdate()
    },
  }

  const statusText =
    saveStatus === 'saving'
      ? 'Saving...'
      : saveStatus === 'error'
        ? 'Could not save'
        : savedAt
          ? `Saved ${savedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
          : 'Saved'

  return (
    <div className={`flex min-h-screen flex-col ${focusMode ? '-mx-8 -mt-8' : ''}`}>
      {/* Top bar */}
      {!focusMode && (
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <input
              className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground"
              value={name}
              onChange={(e) => { setName(e.target.value); scheduleAutoSave() }}
              placeholder="Title"
            />
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span>{wordCount}w</span>
              <span className={saveStatus === 'error' ? 'text-destructive' : ''}>{statusText}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Kind */}
            <select
              value={kind}
              onChange={(e) => { setKind(e.target.value); saveImmediate({ kind: e.target.value }) }}
              className="rounded-md border px-2 py-1 text-sm"
            >
              {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Canon state */}
            <select
              value={canonState}
              onChange={(e) => { setCanonState(e.target.value); saveImmediate({ canonState: e.target.value }) }}
              className="rounded-md border px-2 py-1 text-sm"
            >
              {STATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {canonState === 'canon' && (
              <span className="text-xs text-muted-foreground">Included in continuity checks.</span>
            )}

            {/* Story */}
            <select
              value={storyId}
              onChange={(e) => { setStoryId(e.target.value); saveImmediate({ storyId: e.target.value ? parseInt(e.target.value, 10) : null }) }}
              className="rounded-md border px-2 py-1 text-sm"
            >
              <option value="">No story</option>
              {stories.map((s) => <option key={s.id} value={s.id.toString()}>{s.code} — {s.name}</option>)}
            </select>

            {/* Story year */}
            <input
              type="number"
              value={startYear}
              onChange={(e) => { setStartYear(e.target.value); scheduleAutoSave() }}
              placeholder="Year"
              className="w-24 rounded-md border px-2 py-1 text-sm"
            />

            <div className="ml-auto flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{record.code}</span>
              <Button variant="ghost" size="sm" onClick={() => setFocusMode(true)}>Focus</Button>
            </div>
          </div>

          {canonState !== 'set_aside' && (
            <SnippetCheckStatus
              status={record.checkStatus}
              summary={summary}
              error={record.checkError}
              notes={record.checkNotes}
              recheckAction={recheckWritingAction.bind(null, record.id)}
            />
          )}

          {history && history.length > 0 && (
            <WritingHistoryPanel canonState={canonState} history={history} />
          )}
        </div>
      )}

      {/* Focus mode bar */}
      {focusMode && (
        <div className="flex items-center justify-between px-8 py-3">
          <span className="text-sm font-medium">{name}</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{wordCount}w</span>
            <span>{statusText}</span>
            <Button variant="ghost" size="sm" onClick={() => setFocusMode(false)}>Exit focus</Button>
          </div>
        </div>
      )}

      {/* Editor surface */}
      <div className={`flex-1 ${focusMode ? 'px-8 py-4' : ''}`}>
        <LexicalComposer initialConfig={initialConfig}>
          <div className="mx-auto max-w-[720px]">
            <div className="relative">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    className="writing-surface min-h-[60vh] outline-none"
                    aria-label="Writing surface"
                  />
                }
                placeholder={
                  <div className="pointer-events-none absolute left-0 top-0 text-muted-foreground">
                    Start writing...
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <ListPlugin />
              <MarkdownShortcutPlugin transformers={SHORTCUT_TRANSFORMERS} />
              <OnChangePlugin
                ignoreSelectionChange
                onChange={(editorState) => {
                  editorState.read(() => {
                    textRef.current = $convertToMarkdownString(transformers)
                  })
                  scheduleAutoSave()
                }}
              />
              <NameLinkPlugin index={nameIndex} />
              <DropEntryPlugin />
              <WordCountPlugin onCount={handleWordCount} />
            </div>
            <UnlinkedNamesPanel index={nameIndex} />
            {!focusMode && (
              <p className="mt-3 text-xs text-muted-foreground">
                Drag an entry from the world tree on the left into the text, or type its name and press
                Tab to link it. Linked names act like links: click opens the entry, Ctrl-click opens a
                new tab.
              </p>
            )}
          </div>
        </LexicalComposer>
      </div>

      <style>{`
        .writing-surface {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 1.0625rem;
          line-height: 1.8;
          color: inherit;
        }
        .writing-surface .writing-p {
          margin-bottom: 1em;
        }
        .writing-surface .writing-h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1.5em 0 0.5em;
        }
        .writing-surface .writing-h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.25em 0 0.4em;
        }
        .writing-surface .writing-h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 1em 0 0.3em;
        }
        .writing-surface .writing-mention {
          color: var(--primary);
          font-weight: 600;
          text-decoration: underline;
          text-decoration-color: color-mix(in srgb, var(--primary) 40%, transparent);
          text-underline-offset: 2px;
          cursor: pointer;
        }
        .writing-surface .writing-mention:hover {
          text-decoration-color: var(--primary);
        }
        .writing-surface[data-dropping='true'] {
          outline: 2px dashed var(--ring);
          outline-offset: 8px;
        }
        .writing-surface .writing-quote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1rem;
          color: hsl(var(--muted-foreground));
          font-style: italic;
          margin: 1em 0;
        }
        .writing-surface .writing-code {
          display: block;
          font-family: ui-monospace, monospace;
          font-size: 0.9em;
          background: hsl(var(--muted));
          border-radius: 0.375rem;
          padding: 0.75rem 1rem;
          margin: 1em 0;
          white-space: pre-wrap;
        }
        .writing-surface .writing-link {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}
