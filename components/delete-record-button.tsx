'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkDeleteConflictsAction, deleteEntityAction } from '@/lib/world/actions'

interface DeleteRecordButtonProps {
  collection: string
  id: number
  code: string
  name: string
}

export function DeleteRecordButton({ collection, id, code, name }: DeleteRecordButtonProps) {
  const [phase, setPhase] = useState<'idle' | 'checking' | 'confirm' | 'conflicts' | 'deleting'>('idle')
  const [conflicts, setConflicts] = useState<{ collection: string; code: string; name: string }[]>([])
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleClick() {
    setPhase('checking')
    const result = await checkDeleteConflictsAction(collection, id, code)
    if (result.conflicts.length > 0) {
      setConflicts(result.conflicts)
      setPhase('conflicts')
    } else {
      setPhase('confirm')
    }
  }

  async function handleConfirm() {
    setPhase('deleting')
    const result = await deleteEntityAction(collection, id)
    if (result.ok) {
      router.push(`/${collection}`)
    } else {
      setError(result.error ?? 'Delete failed')
      setPhase('idle')
    }
  }

  if (phase === 'idle' || phase === 'checking') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={phase === 'checking'}
        className="rounded border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {phase === 'checking' ? 'Checking...' : 'Delete'}
      </button>
    )
  }

  if (phase === 'conflicts') {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <p className="font-semibold text-destructive">Cannot delete: other records still reference this one.</p>
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {conflicts.map((c, i) => (
            <li key={i}><span className="font-mono">{c.code}</span> — {c.name} ({c.collection})</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setPhase('idle')}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (phase === 'confirm') {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <p>Delete <strong>{name}</strong> (<span className="font-mono">{code}</span>)? This cannot be undone.</p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded bg-destructive px-3 py-1 text-xs text-destructive-foreground hover:opacity-80"
          >
            Yes, delete
          </button>
          <button
            type="button"
            onClick={() => setPhase('idle')}
            className="rounded border px-3 py-1 text-xs hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return <span className="text-xs text-muted-foreground">Deleting...</span>
}
