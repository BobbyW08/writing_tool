'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type EditorConfig,
  type LexicalEditor,
  type NodeKey,
  type RangeSelection,
  TextNode,
  type SerializedTextNode,
  type Spread,
} from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { TRANSFORMERS } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { saveWriting, searchEntities, deleteWriting, type SearchResult } from '@/lib/studio/actions'
import { type WritingRecord } from '@/lib/studio/queries'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── MentionNode ──────────────────────────────────────────────────────────────

type SerializedMentionNode = Spread<
  { mentionId: string; mentionCode: string },
  SerializedTextNode
>

export class MentionNode extends TextNode {
  __mentionId: string
  __mentionCode: string

  constructor(text: string, mentionId: string, mentionCode: string, key?: NodeKey) {
    super(text, key)
    this.__mentionId = mentionId
    this.__mentionCode = mentionCode
  }

  static getType() { return 'mention' as const }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__text, node.__mentionId, node.__mentionCode, node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config)
    dom.style.color = 'hsl(var(--primary))'
    dom.style.fontWeight = '600'
    dom.setAttribute('data-mention', this.__mentionCode)
    return dom
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      type: 'mention',
      mentionId: this.__mentionId,
      mentionCode: this.__mentionCode,
    }
  }

  static importJSON(serialized: SerializedMentionNode): MentionNode {
    const node = new MentionNode(
      serialized.text,
      serialized.mentionId,
      serialized.mentionCode,
    )
    node.setFormat(serialized.format)
    node.setDetail(serialized.detail)
    node.setMode(serialized.mode)
    node.setStyle(serialized.style)
    return node
  }

  isToken(): boolean { return true }
}

export function $createMentionNode(text: string, mentionId: string, mentionCode: string): MentionNode {
  return new MentionNode(text, mentionId, mentionCode).setMode('token')
}

// ─── Mention option ───────────────────────────────────────────────────────────

class EntityOption extends MenuOption {
  result: SearchResult
  constructor(result: SearchResult) {
    super(result.name)
    this.result = result
  }
}

// ─── Mention plugin ───────────────────────────────────────────────────────────

function MentionPlugin({ onMentionsChange }: { onMentionsChange: (ids: string[]) => void }) {
  const [editor] = useLexicalComposerContext()
  const [query, setQuery] = useState<string | null>(null)
  const [options, setOptions] = useState<EntityOption[]>([])
  const triggerFn = useBasicTypeaheadTriggerMatch('@', { minLength: 0 })

  // Search when query changes
  useEffect(() => {
    if (query === null) { setOptions([]); return }
    let active = true
    searchEntities(query).then((results) => {
      if (active) setOptions(results.map((r) => new EntityOption(r)))
    })
    return () => { active = false }
  }, [query])

  // Extract mention IDs whenever the editor changes
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const ids: string[] = []
        const root = $getRoot()
        const stack = [...root.getChildren()]
        while (stack.length > 0) {
          const node = stack.pop()!
          if (node instanceof MentionNode) {
            ids.push(node.__mentionId)
          } else if ('getChildren' in node) {
            // @ts-expect-error — ElementNode has getChildren
            stack.push(...node.getChildren())
          }
        }
        onMentionsChange([...new Set(ids)])
      })
    })
  }, [editor, onMentionsChange])

  const onSelectOption = useCallback(
    (option: EntityOption, nodeWithQuery: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        if (nodeWithQuery !== null) {
          const mention = $createMentionNode(`@${option.result.name}`, option.result.id, option.result.code)
          nodeWithQuery.replace(mention)
          // Move cursor after the mention
          mention.selectNext(0, 0)
        }
        closeMenu()
      })
    },
    [editor],
  )

  return (
    <LexicalTypeaheadMenuPlugin<EntityOption>
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
              className="min-w-48 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
            >
              {options.map((opt, i) => (
                <div
                  key={opt.result.id}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onMouseDown={(e) => { e.preventDefault(); selectOptionAndCleanUp(opt) }}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${selectedIndex === i ? 'bg-accent' : ''}`}
                >
                  <span className="font-mono text-xs text-muted-foreground">{opt.result.code}</span>
                  <span>{opt.result.name}</span>
                </div>
              ))}
            </div>
          )
          : null
      }
    />
  )
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
}: {
  record: WritingRecord
  stories: { id: string; code: string; name: string }[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Fields state
  const [name, setName] = useState(record.name)
  const [kind, setKind] = useState(record.kind)
  const [canonState, setCanonState] = useState(record.canonState)
  const [startYear, setStartYear] = useState(record.startYear?.toString() ?? '')
  const [storyId, setStoryId] = useState(record.story?.id ?? '')
  const [focusMode, setFocusMode] = useState(false)

  // Save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [wordCount, setWordCount] = useState(0)

  // Refs for autosave
  const textJsonRef = useRef<Record<string, unknown>>(record.textJson)
  const mentionIdsRef = useRef<string[]>([])
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
        storyId: storyId || null,
        textJson: textJsonRef.current,
        mentionIds: mentionIdsRef.current,
      })
      setSaveStatus(result.ok ? 'saved' : 'error')
      if (result.ok) setSavedAt(new Date())
    }, 2000)
  }, [record.id, name, kind, canonState, startYear, storyId])

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
        storyId: storyId || null,
        textJson: textJsonRef.current,
        mentionIds: mentionIdsRef.current,
        ...overrides,
      })
      setSaveStatus(result.ok ? 'saved' : 'error')
      if (result.ok) setSavedAt(new Date())
    })
  }

  const handleMentionsChange = useCallback((ids: string[]) => {
    mentionIdsRef.current = ids
  }, [])

  const handleWordCount = useCallback((n: number) => setWordCount(n), [])

  // Parse the initial editor state
  const initialConfig = {
    namespace: `writing-${record.id}`,
    theme: {
      root: 'writing-root',
      paragraph: 'writing-p',
      heading: { h1: 'writing-h1', h2: 'writing-h2', h3: 'writing-h3' },
      quote: 'writing-quote',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, MentionNode],
    onError: (err: Error) => console.error('[Writing Editor]', err),
    editorState: () => {
      // Lexical will parse the JSON we pass as the editor state
      // We convert the stored Payload richText JSON to a Lexical state
      try {
        // Payload stores richText as Lexical JSON already
        const stored = record.textJson
        if (stored && typeof stored === 'object' && 'root' in stored) {
          // Valid Lexical JSON — return it as a string for Lexical to parse
          return JSON.stringify(stored)
        }
      } catch {
        // fall through to empty state
      }
      // Empty initial state
      const root = $createParagraphNode()
      $getRoot().append(root)
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
              onChange={(e) => { setStoryId(e.target.value); saveImmediate({ storyId: e.target.value || null }) }}
              className="rounded-md border px-2 py-1 text-sm"
            >
              <option value="">No story</option>
              {stories.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
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
              <Button variant="ghost" size="sm" onClick={() => setFocusMode(true)}>Focus</Button>
              <a
                href={`/admin/collections/writing/${record.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {record.code} ↗
              </a>
            </div>
          </div>
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
          <div className="relative mx-auto max-w-[720px]">
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
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <OnChangePlugin
              ignoreSelectionChange
              onChange={(editorState) => {
                textJsonRef.current = editorState.toJSON() as unknown as Record<string, unknown>
                scheduleAutoSave()
              }}
            />
            <MentionPlugin onMentionsChange={handleMentionsChange} />
            <WordCountPlugin onCount={handleWordCount} />
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
        .writing-surface .writing-quote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1rem;
          color: hsl(var(--muted-foreground));
          font-style: italic;
          margin: 1em 0;
        }
      `}</style>
    </div>
  )
}
