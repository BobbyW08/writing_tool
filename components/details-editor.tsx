'use client'

import { useState, useCallback } from 'react'
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
import { updateDetailsAction } from '@/lib/world/actions'

export interface DetailRow {
  id?: string
  label: string
  value: string
  inInfobox: boolean
}

interface DetailsEditorProps {
  collection: string
  docId: number
  initial: DetailRow[]
}

function SortableRow({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: DetailRow & { uid: string }
  index: number
  onChange: (uid: string, patch: Partial<DetailRow>) => void
  onRemove: (uid: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.uid })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 rounded-md border bg-background p-2">
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab text-muted-foreground active:cursor-grabbing"
        type="button"
        aria-label="Drag to reorder"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="4" cy="3" r="1.2" /><circle cx="10" cy="3" r="1.2" />
          <circle cx="4" cy="7" r="1.2" /><circle cx="10" cy="7" r="1.2" />
          <circle cx="4" cy="11" r="1.2" /><circle cx="10" cy="11" r="1.2" />
        </svg>
      </button>
      <div className="flex flex-1 flex-col gap-1.5">
        <input
          type="text"
          placeholder="Label"
          value={row.label}
          onChange={(e) => onChange(row.uid, { label: e.target.value })}
          className="rounded border bg-transparent px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <textarea
          placeholder="Value"
          value={row.value}
          onChange={(e) => onChange(row.uid, { value: e.target.value })}
          rows={2}
          className="rounded border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={row.inInfobox}
            onChange={(e) => onChange(row.uid, { inInfobox: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          Show in infobox
        </label>
      </div>
      <button
        type="button"
        onClick={() => onRemove(row.uid)}
        className="mt-0.5 text-muted-foreground hover:text-destructive"
        aria-label="Remove row"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
        </svg>
      </button>
    </div>
  )
}

let uidCounter = 0
function makeUid() { return `d${++uidCounter}` }

export function DetailsEditor({ collection, docId, initial }: DetailsEditorProps) {
  const [rows, setRows] = useState<(DetailRow & { uid: string })[]>(
    () => initial.map(r => ({ ...r, uid: r.id ?? makeUid() }))
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const save = useCallback(async (updated: (DetailRow & { uid: string })[]) => {
    setStatus('saving')
    const result = await updateDetailsAction(collection, docId, updated.map(r => ({
      label: r.label,
      value: r.value,
      inInfobox: r.inInfobox,
      id: r.id,
    })))
    if (result.ok) {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Save failed')
    }
  }, [collection, docId])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex(r => r.uid === active.id)
    const newIndex = rows.findIndex(r => r.uid === over.id)
    const updated = arrayMove(rows, oldIndex, newIndex)
    setRows(updated)
    save(updated)
  }

  function handleChange(uid: string, patch: Partial<DetailRow>) {
    setRows(prev => prev.map(r => r.uid === uid ? { ...r, ...patch } : r))
  }

  function handleRemove(uid: string) {
    const updated = rows.filter(r => r.uid !== uid)
    setRows(updated)
    save(updated)
  }

  function handleAdd() {
    const updated = [...rows, { uid: makeUid(), label: '', value: '', inInfobox: false }]
    setRows(updated)
  }

  function handleBlurSave() {
    save(rows)
  }

  return (
    <div className="space-y-2" onBlur={handleBlurSave}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">Details</span>
        <div className="flex items-center gap-2">
          {status === 'saving' && <span className="text-xs text-muted-foreground">Saving...</span>}
          {status === 'saved' && <span className="text-xs text-green-600">Saved</span>}
          {status === 'error' && <span className="text-xs text-destructive">{errorMsg}</span>}
        </div>
      </div>

      <DndContext id={`details-${collection}-${docId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map(r => r.uid)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {rows.map((row, i) => (
              <SortableRow
                key={row.uid}
                row={row}
                index={i}
                onChange={handleChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={handleAdd}
        className="rounded border border-dashed px-3 py-1.5 text-xs text-muted-foreground hover:border-solid hover:text-foreground"
      >
        + Add detail row
      </button>
    </div>
  )
}
