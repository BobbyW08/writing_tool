'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRelationshipAction, deleteRelationshipAction } from '@/lib/world/actions'
import { RELATIONSHIP_TYPES } from '@/lib/relationshipTypes'

interface RelEntry {
  id: number
  code: string
  collection: string
  name: string
  type: string
  direction: 'from' | 'to'
}

interface RelationshipEditorProps {
  myCode: string
  initial: RelEntry[]
}

export function RelationshipEditor({ myCode, initial }: RelationshipEditorProps) {
  const [rels, setRels] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [otherCode, setOtherCode] = useState('')
  const [relType, setRelType] = useState<string>(RELATIONSHIP_TYPES[0].value)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  async function handleAdd() {
    if (!otherCode.trim()) return
    setStatus('saving')
    const result = await createRelationshipAction(myCode, otherCode.trim().toUpperCase(), relType, notes || undefined)
    if (result.ok) {
      setAdding(false)
      setOtherCode('')
      setNotes('')
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
            <li key={`${r.direction}-${r.id}`} className="flex items-center gap-2 p-2.5 text-sm">
              <span className="shrink-0 text-muted-foreground">
                {RELATIONSHIP_TYPES.find(t => t.value === r.type)?.label ?? r.type}
                {r.direction === 'to' && ' (inverse)'}
              </span>
              <a href={`/${r.collection}/${r.code}`} className="flex-1 hover:underline">
                <span className="font-mono text-xs text-muted-foreground">{r.code}</span>{' '}
                {r.name}
              </a>
              <button
                type="button"
                onClick={() => handleRemove(r.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                aria-label="Remove relationship"
              >
                Remove
              </button>
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
