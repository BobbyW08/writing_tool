'use client'

import { useState, useRef, useEffect } from 'react'
import { updateFieldAction } from '@/lib/world/actions'

interface Option { label: string; value: string }

interface EditableFieldProps {
  collection: string
  docId: number
  fieldName: string
  value: string | number | boolean | null | undefined
  kind: 'text' | 'textarea' | 'number' | 'select' | 'checkbox'
  options?: Option[]
  placeholder?: string
  className?: string
  onSaved?: (newValue: unknown) => void
  /** Custom read-mode display (e.g. ID-code linkification). Falls back to the raw value. */
  renderValue?: React.ReactNode
}

export function EditableField({
  collection,
  docId,
  fieldName,
  value,
  kind,
  options,
  placeholder,
  className = '',
  onSaved,
  renderValue,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [editing])

  const displayValue = value == null || value === '' ? (
    <span className="text-muted-foreground italic">{placeholder ?? 'Click to add'}</span>
  ) : renderValue ? (
    renderValue
  ) : kind === 'select' ? (
    options?.find(o => o.value === value)?.label ?? String(value)
  ) : kind === 'checkbox' ? (
    value ? 'Yes' : 'No'
  ) : (
    String(value)
  )

  async function save() {
    setEditing(false)
    const parsed: unknown = kind === 'number' ? (draft === '' ? null : Number(draft)) :
                            kind === 'checkbox' ? (draft === 'true') :
                            (draft === '' ? null : draft)
    if (parsed === (value == null ? null : value)) {
      setStatus('idle')
      return
    }
    setStatus('saving')
    const result = await updateFieldAction(collection, docId, fieldName, parsed)
    if (result.ok) {
      setStatus('saved')
      onSaved?.(parsed)
      setTimeout(() => setStatus('idle'), 1500)
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Save failed')
      setEditing(true)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && kind !== 'textarea') { e.preventDefault(); save() }
    if (e.key === 'Escape') { setDraft(value == null ? '' : String(value)); setEditing(false); setStatus('idle') }
  }

  if (kind === 'checkbox') {
    const checked = Boolean(value)
    return (
      <label className={`flex cursor-pointer items-center gap-2 ${className}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={async (e) => {
            const newVal = e.target.checked
            setStatus('saving')
            const result = await updateFieldAction(collection, docId, fieldName, newVal)
            if (result.ok) {
              setStatus('saved')
              onSaved?.(newVal)
              setTimeout(() => setStatus('idle'), 1500)
            } else {
              setStatus('error')
              setErrorMsg(result.error ?? 'Save failed')
            }
          }}
          className="h-4 w-4"
        />
        <span className="text-sm">{status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : status === 'error' ? errorMsg : ''}</span>
      </label>
    )
  }

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => { setEditing(true); setDraft(value == null ? '' : String(value)) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditing(true) }}
        className={`cursor-text rounded px-0.5 hover:bg-accent/60 focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
      >
        {displayValue}
        {status === 'saved' && <span className="ml-1 text-xs text-green-600">Saved</span>}
        {status === 'error' && <span className="ml-1 text-xs text-destructive">{errorMsg}</span>}
      </span>
    )
  }

  if (kind === 'select') {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKey}
        className={`rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
      >
        <option value="">-- none --</option>
        {options?.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }

  if (kind === 'textarea') {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKey}
        rows={3}
        className={`w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
      />
    )
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={kind === 'number' ? 'number' : 'text'}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={handleKey}
      className={`rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
    />
  )
}
