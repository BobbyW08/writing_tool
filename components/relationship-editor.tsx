'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createRelationshipAction, deleteRelationshipAction, updateRelationshipAction } from '@/lib/world/actions'
import { RELATIONSHIP_TYPES } from '@/lib/relationshipTypes'

interface RelEntry {
  id: number
  code: string
  collection: string
  name: string
  type: string
  direction: 'from' | 'to'
  startYear: number | null
  endYear: number | null
  notes: string | null
}

interface RelationshipEditorProps {
  myCode: string
  initial: RelEntry[]
}

function yearRangeText(startYear: number | null, endYear: number | null): string | null {
  if (startYear == null && endYear == null) return null
  if (startYear != null && endYear != null) return `Year ${startYear} to ${endYear}`
  if (startYear != null) return `Year ${startYear} on`
  return `Until year ${endYear}`
}

export function RelationshipEditor({ myCode, initial }: RelationshipEditorProps) {
  const [rels, setRels] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [otherCode, setOtherCode] = useState('')
  const [relType, setRelType] = useState<string>(RELATIONSHIP_TYPES[0].value)
  const [notes, setNotes] = useState('')
  const [startYear, setStartYear] = useState('')
  const [endYear, setEndYear] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const router = useRouter()

  // handleAdd and the edit-row's onSaved both call router.refresh(), which refetches the server
  // component tree but does not remount this client component -- so without this, `rels` would
  // keep showing its stale useState(initial) snapshot from first mount forever.
  useEffect(() => { setRels(initial) }, [initial])

  async function handleAdd() {
    if (!otherCode.trim()) return
    setStatus('saving')
    const result = await createRelationshipAction(
      myCode,
      otherCode.trim().toUpperCase(),
      relType,
      notes || undefined,
      startYear === '' ? null : Number(startYear),
      endYear === '' ? null : Number(endYear)
    )
    if (result.ok) {
      setAdding(false)
      setOtherCode('')
      setNotes('')
      setStartYear('')
      setEndYear('')
      setStatus('idle')
      router.refresh()
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Failed to add relationship')
    }
  }

  async function handleRemove(id: number) {
    const result = await deleteRelationshipAction(id)
    if (result.ok) {
      setRels(prev => prev.filter(r => r.id !== id))
      // Other sections on the page (Places, What links here, the relationship graph) are server
      // components computed from this same relationship, so they need a refresh too, not just
      // this component's own local list.
      router.refresh()
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Relationships</h2>
        <button
          type="button"
          onClick={() => setAdding(a => !a)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Other entry code</label>
            <input
              type="text"
              value={otherCode}
              onChange={(e) => setOtherCode(e.target.value)}
              placeholder="e.g. C4, L12"
              className="rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Type</label>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value)}
              className="rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {RELATIONSHIP_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-semibold">Start year</label>
              <input
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                placeholder="Optional"
                className="rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-semibold">End year</label>
              <input
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                placeholder="Optional"
                className="rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {status === 'error' && <p className="text-xs text-destructive">{errorMsg}</p>}
          <button
            type="button"
            onClick={handleAdd}
            disabled={status === 'saving'}
            className="rounded bg-foreground px-3 py-1.5 text-xs text-background hover:opacity-80 disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving...' : 'Add'}
          </button>
        </div>
      )}

      {rels.length > 0 && (
        <ul className="divide-y rounded-md border">
          {rels.map(r => (
            <li key={`${r.direction}-${r.id}`} className="p-2.5 text-sm">
              {editingId === r.id ? (
                <RelationshipEditRow
                  myCode={myCode}
                  entry={r}
                  onSaved={(patch) => {
                    setRels(prev => prev.map(x => x.id === r.id ? {
                      ...x,
                      type: patch.type ?? x.type,
                      code: patch.otherCode ?? x.code,
                      name: patch.otherCode ?? x.name,
                      startYear: patch.startYear === undefined ? x.startYear : patch.startYear,
                      endYear: patch.endYear === undefined ? x.endYear : patch.endYear,
                      notes: patch.notes === undefined ? x.notes : patch.notes,
                    } : x))
                    setEditingId(null)
                    router.refresh()
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    {RELATIONSHIP_TYPES.find(t => t.value === r.type)?.label ?? r.type}
                    {r.direction === 'to' && ' (inverse)'}
                  </span>
                  <a href={`/${r.collection}/${r.code}`} className="flex-1 hover:underline">
                    <span className="font-mono text-xs text-muted-foreground">{r.code}</span>{' '}
                    {r.name}
                  </a>
                  {yearRangeText(r.startYear, r.endYear) && (
                    <span className="shrink-0 text-xs text-muted-foreground">{yearRangeText(r.startYear, r.endYear)}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(r.id)}
                    className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(r.id)}
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                    aria-label="Remove relationship"
                  >
                    Remove
                  </button>
                </div>
              )}
              {r.notes && editingId !== r.id && (
                <p className="mt-1 pl-0 text-xs text-muted-foreground">{r.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {rels.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground italic">No relationships yet.</p>
      )}
    </section>
  )
}

interface EditPatch {
  type?: string
  otherCode?: string
  startYear?: number | null
  endYear?: number | null
  notes?: string | null
}

function RelationshipEditRow({ myCode, entry, onSaved, onCancel }: {
  myCode: string
  entry: RelEntry
  onSaved: (patch: EditPatch) => void
  onCancel: () => void
}) {
  const [otherCode, setOtherCode] = useState(entry.code)
  const [relType, setRelType] = useState(entry.type)
  const [startYear, setStartYear] = useState(entry.startYear == null ? '' : String(entry.startYear))
  const [endYear, setEndYear] = useState(entry.endYear == null ? '' : String(entry.endYear))
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSave() {
    setStatus('saving')
    const patch: EditPatch = {
      type: relType,
      otherCode: otherCode.trim().toUpperCase(),
      startYear: startYear === '' ? null : Number(startYear),
      endYear: endYear === '' ? null : Number(endYear),
      notes: notes === '' ? null : notes,
    }
    const result = await updateRelationshipAction(entry.id, myCode, patch)
    if (result.ok) {
      onSaved(patch)
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Failed to save')
    }
  }

  return (
    <div className="space-y-2 rounded-md border bg-accent/30 p-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={otherCode}
          onChange={(e) => setOtherCode(e.target.value)}
          className="w-24 rounded border bg-background px-2 py-1 text-sm"
        />
        <select
          value={relType}
          onChange={(e) => setRelType(e.target.value)}
          className="flex-1 rounded border bg-background px-2 py-1 text-sm"
        >
          {RELATIONSHIP_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={startYear}
          onChange={(e) => setStartYear(e.target.value)}
          placeholder="Start year"
          className="w-28 rounded border bg-background px-2 py-1 text-sm"
        />
        <input
          type="number"
          value={endYear}
          onChange={(e) => setEndYear(e.target.value)}
          placeholder="End year"
          className="w-28 rounded border bg-background px-2 py-1 text-sm"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="flex-1 rounded border bg-background px-2 py-1 text-sm"
        />
      </div>
      {status === 'error' && <p className="text-xs text-destructive">{errorMsg}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'saving'}
          className="rounded bg-foreground px-3 py-1 text-xs text-background hover:opacity-80 disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-3 py-1 text-xs hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
