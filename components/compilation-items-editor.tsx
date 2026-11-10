'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateFieldAction } from '@/lib/world/actions'
import type { CompilationItem } from '@/lib/world/queries'
import { WORLD_SLUGS, PREFIX_TO_SLUG } from '@/lib/codes'

const ITEM_COLLECTIONS: string[] = [...WORLD_SLUGS, 'events']

// Step Phase 7: drag to reorder a compilation's items (@dnd-kit/sortable, named explicitly in
// traveler-wiki-build-plan.md "Export and compilations"). The row persists as a plain array of
// codes (compilations.items) -- array order is the compile order, so a reorder just rewrites the
// whole array, same pattern as DetailsEditor. DndContext needs a stable, explicit `id` once an app
// has more than one (see BUILD_GUIDE.md's U5/U6 dnd-kit hydration note) -- `compilation-${code}`.
function SortableItem({ item, onRemove }: { item: CompilationItem; onRemove: (code: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.code })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md border bg-background p-2">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        type="button"
        aria-label="Drag to reorder"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="4" cy="3" r="1.2" /><circle cx="10" cy="3" r="1.2" />
          <circle cx="4" cy="7" r="1.2" /><circle cx="10" cy="7" r="1.2" />
          <circle cx="4" cy="11" r="1.2" /><circle cx="10" cy="11" r="1.2" />
        </svg>
      </button>
      <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
      <a href={`/view/${item.collection}/${item.code}`} className="flex-1 text-sm hover:underline">{item.name}</a>
      {item.status !== 'locked' && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">{item.status.replace('_', ' ')}</span>
      )}
      <button
        type="button"
        onClick={() => onRemove(item.code)}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Remove from compilation"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
        </svg>
      </button>
    </div>
  )
}

export function CompilationItemsEditor({ compilationId, code, initial }: {
  compilationId: number
  code: string
  initial: CompilationItem[]
}) {
  const [items, setItems] = useState(initial)
  const [addCode, setAddCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const save = useCallback(async (updated: CompilationItem[]) => {
    setStatus('saving')
    const result = await updateFieldAction('compilations', compilationId, 'items', updated.map(i => i.code))
    if (result.ok) {
      setStatus('idle')
      router.refresh()
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Save failed')
    }
  }, [compilationId, router])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.code === active.id)
    const newIndex = items.findIndex(i => i.code === over.id)
    const updated = arrayMove(items, oldIndex, newIndex)
    setItems(updated)
    save(updated)
  }

  function handleRemove(code: string) {
    const updated = items.filter(i => i.code !== code)
    setItems(updated)
    save(updated)
  }

  async function handleAdd() {
    const upper = addCode.trim().toUpperCase()
    if (!upper || items.some(i => i.code === upper)) { setAddCode(''); return }
    const collection = PREFIX_TO_SLUG[upper[0]]
    if (!collection || !ITEM_COLLECTIONS.includes(collection)) {
      setStatus('error')
      setErrorMsg('Compilations hold events and entries only (not stories, writing or other collections).')
      return
    }
    setStatus('saving')
    const updated = [...items, { code: upper, collection: '', name: '', status: 'in_development' }]
    const result = await updateFieldAction('compilations', compilationId, 'items', updated.map(i => i.code))
    setAddCode('')
    if (result.ok) {
      router.refresh() // re-resolves names/collections server-side; local optimistic row is a placeholder until then
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Could not add that code')
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Items</h2>
        <a
          href={`/api/export/compilation/${code}`}
          download
          className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Export compilation
        </a>
      </div>

      {items.length > 0 ? (
        <DndContext id={`compilation-${code}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.code)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {items.map(item => (
                <SortableItem key={item.code} item={item} onRemove={handleRemove} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm italic text-muted-foreground">No items yet. Add an event or entry by code below.</p>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Add by code</label>
          <input
            type="text"
            value={addCode}
            onChange={(e) => setAddCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            placeholder="e.g. E12, C4"
            className="w-32 rounded border bg-background px-2 py-1 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={status === 'saving' || !addCode.trim()}
          className="rounded border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
        >
          Add
        </button>
        {status === 'error' && <p className="text-xs text-destructive">{errorMsg}</p>}
      </div>
    </section>
  )
}
