'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DndContext, useDraggable, useDroppable, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core'
import { bulkSetFieldAction, createEntityAction } from '@/lib/world/actions'
import { EditableField } from './editable-field'
import type { ListViewConfig } from '@/lib/world/listViews'
import type { TableRow } from './collection-table-view'

interface CollectionBoardViewProps {
  collection: string
  rows: TableRow[]
  config: ListViewConfig
}

function cellHref(collection: string, code: string | null | undefined) {
  if (!code) return '#'
  if (collection === 'events') return `/events/${code}`
  if (collection === 'stories') return `/stories/${code}`
  return `/${collection}/${code}`
}

function Card({ row, collection }: { row: TableRow; collection: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 10 : undefined } : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border bg-background p-2 text-sm shadow-sm ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <span {...listeners} {...attributes} className="cursor-grab font-mono text-xs text-muted-foreground" title="Drag to move">
          {row.code}
        </span>
        <Link href={cellHref(collection, row.code)} className="shrink-0 text-xs text-muted-foreground hover:underline">
          Open
        </Link>
      </div>
      <div className="mt-0.5">
        <EditableField collection={collection} docId={row.id} fieldName="name" value={row.name} kind="text" className="text-sm" />
      </div>
      {row.tags && row.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {row.tags.map(t => (
            <span key={t.id} className="rounded bg-accent px-1 py-0.5 text-[10px]">{t.name}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function Column({ value, label, rows, collection, onCreate }: {
  value: string
  label: string
  rows: TableRow[]
  collection: string
  onCreate: (value: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: value })
  return (
    <div ref={setNodeRef} className={`flex w-56 shrink-0 flex-col gap-2 rounded-md border p-2 ${isOver ? 'bg-accent/40' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground">{label} ({rows.length})</h3>
        <button type="button" onClick={() => onCreate(value)} className="rounded px-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground" title="New record in this column">
          +
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(r => <Card key={r.id} row={r} collection={collection} />)}
      </div>
    </div>
  )
}

export function CollectionBoardView({ collection, rows: initialRows, config }: CollectionBoardViewProps) {
  const [rows, setRows] = useState(initialRows)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const knownValues = new Set(config.statusOptions.map(o => o.value))
  const otherRows = rows.filter(r => !knownValues.has(String(r[config.statusField] ?? '')))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const id = active.id as number
    const newValue = String(over.id)
    const row = rows.find(r => r.id === id)
    if (!row || row[config.statusField] === newValue) return
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [config.statusField]: newValue } : r)))
    await bulkSetFieldAction(collection, [id], config.statusField, newValue)
  }

  async function handleCreate(value: string) {
    const result = await createEntityAction(collection, { name: 'New card', [config.statusField]: value })
    if (result.id) {
      setRows(prev => [...prev, {
        id: result.id!, code: result.code ?? '', name: 'New card', tagIds: [], tags: [], [config.statusField]: value,
      } as TableRow])
    }
  }

  return (
    <DndContext id={`board-${collection}`} sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {config.statusOptions.map(opt => (
          <Column
            key={opt.value}
            value={opt.value}
            label={opt.label}
            rows={rows.filter(r => r[config.statusField] === opt.value)}
            collection={collection}
            onCreate={handleCreate}
          />
        ))}
        {otherRows.length > 0 && (
          <Column value="__other__" label="Other" rows={otherRows} collection={collection} onCreate={handleCreate} />
        )}
      </div>
    </DndContext>
  )
}
