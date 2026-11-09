'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DndContext, useDraggable, useDroppable, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core'
import { updateFieldAction } from '@/lib/world/actions'
import { STORY_ERAS, STORY_STAGES, STORY_STAGE_LABELS } from '@/lib/stories'

export type BoardStory = {
  id: number
  code?: string | null
  name: string
  stage?: string | null
  era?: string | null
  floating?: boolean | null
  unk?: boolean
}

const NONE = '__none__'
const FLOATING_LANE = '__floating__'

function cellId(lane: string, stage: string) {
  return `${lane}::${stage}`
}

function parseCellId(id: string): { lane: string; stage: string } {
  const [lane, stage] = id.split('::')
  return { lane, stage }
}

function cardsFor(list: BoardStory[], stage: string): BoardStory[] {
  return list.filter((s) => (stage === NONE ? !s.stage : s.stage === stage))
}

function StoryCard({ s }: { s: BoardStory }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: s.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 10 : undefined } : undefined
  return (
    <div ref={setNodeRef} style={style} className={`rounded-md border bg-background p-2 text-xs ${isDragging ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-1.5">
        <span {...listeners} {...attributes} className="cursor-grab font-mono text-[10px] text-muted-foreground" title="Drag to move">
          {s.code}
        </span>
        {s.code && (
          <Link href={`/view/stories/${s.code}`} className="text-[10px] text-muted-foreground hover:underline">
            Open
          </Link>
        )}
        {s.unk && (
          <span className="rounded bg-amber-100 px-1 text-[9px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
            UNK
          </span>
        )}
      </div>
      <p className="mt-0.5 font-medium leading-snug">{s.name}</p>
    </div>
  )
}

function Cell({ lane, stage, cards, dashed }: { lane: string; stage: string; cards: BoardStory[]; dashed?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId(lane, stage) })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-12 space-y-1.5 rounded-md border p-1.5 ${dashed ? 'border-dashed bg-muted/10' : 'bg-muted/5'} ${isOver ? 'bg-accent/40' : ''}`}
    >
      {cards.map((s) => <StoryCard key={s.id} s={s} />)}
    </div>
  )
}

interface Toast {
  message: string
  undo: () => void
}

export function StoryBoardClient({ stories: initialStories }: { stories: BoardStory[] }) {
  const [stories, setStories] = useState(initialStories)
  const [toast, setToast] = useState<Toast | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  const floating = stories.filter((s) => s.floating)
  const placed = stories.filter((s) => !s.floating)

  const hasUnstaged = stories.some((s) => !s.stage)
  const stageCols = [...STORY_STAGES.map((s) => s.value), ...(hasUnstaged ? [NONE] : [])]

  const hasNoEra = placed.some((s) => !s.era)
  const eraRows = [...STORY_ERAS.map((e) => ({ value: e.value, label: e.label })), ...(hasNoEra ? [{ value: NONE, label: 'No era set' }] : [])]

  const gridCols = `160px repeat(${stageCols.length}, minmax(180px, 1fr))`

  async function applyPatch(id: number, patch: Partial<Pick<BoardStory, 'stage' | 'era' | 'floating'>>) {
    for (const [field, value] of Object.entries(patch)) {
      await updateFieldAction('stories', id, field, value)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const id = active.id as number
    const story = stories.find((s) => s.id === id)
    if (!story) return

    const { lane, stage: rawStage } = parseCellId(String(over.id))
    const nextStage = rawStage === NONE ? null : rawStage
    const patch: Partial<Pick<BoardStory, 'stage' | 'era' | 'floating'>> = {}

    if (lane === FLOATING_LANE) {
      if (!story.floating) patch.floating = true
      if ((story.stage ?? null) !== nextStage) patch.stage = nextStage
    } else {
      const nextEra = lane === NONE ? null : lane
      if (story.floating) patch.floating = false
      if ((story.era ?? null) !== nextEra) patch.era = nextEra
      if ((story.stage ?? null) !== nextStage) patch.stage = nextStage
    }

    if (Object.keys(patch).length === 0) return

    const previous = { stage: story.stage ?? null, era: story.era ?? null, floating: !!story.floating }
    setStories((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    applyPatch(id, patch)

    const label = patch.floating ? 'Floating' : (nextStage ? STORY_STAGE_LABELS[nextStage] ?? nextStage : 'No stage')
    setToast({
      message: `Moved ${story.name} to ${label}`,
      undo: () => {
        setStories((prev) => prev.map((s) => (s.id === id ? { ...s, ...previous } : s)))
        applyPatch(id, previous)
        setToast(null)
      },
    })
  }

  return (
    <DndContext id="story-board" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {floating.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Floating ({floating.length})</h2>
            <div className="grid gap-2" style={{ gridTemplateColumns: gridCols }}>
              <div />
              {stageCols.map((stage) => (
                <p key={stage} className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {stage === NONE ? 'No stage' : STORY_STAGE_LABELS[stage]}
                </p>
              ))}
              <div />
              {stageCols.map((stage) => (
                <Cell key={stage} lane={FLOATING_LANE} stage={stage} cards={cardsFor(floating, stage)} dashed />
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="grid gap-2" style={{ gridTemplateColumns: gridCols }}>
            <div />
            {stageCols.map((stage) => (
              <p key={stage} className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {stage === NONE ? 'No stage' : STORY_STAGE_LABELS[stage]}
              </p>
            ))}

            {eraRows.map((era) => {
              const eraStories = placed.filter((s) => (era.value === NONE ? !s.era : s.era === era.value))
              return (
                <div key={era.value} className="contents">
                  <p className="flex items-center px-1 text-xs font-semibold text-muted-foreground">{era.label}</p>
                  {stageCols.map((stage) => (
                    <Cell key={stage} lane={era.value} stage={stage} cards={cardsFor(eraStories, stage)} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-md border bg-background px-4 py-2 text-sm shadow-lg">
          <span>{toast.message}</span>
          <button type="button" onClick={toast.undo} className="font-semibold text-primary hover:underline">
            Undo
          </button>
        </div>
      )}
    </DndContext>
  )
}
