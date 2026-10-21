'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEntityAction } from '@/lib/world/actions'
import type { FieldDef } from '@/lib/world/fields'

interface NewEntityFormProps {
  collection: string
  fields: FieldDef[]
  redirectBase: string
}

export function NewEntityForm({ collection, fields, redirectBase }: NewEntityFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function set(name: string, value: unknown) {
    setValues(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const result = await createEntityAction(collection, values)
    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      const dest = result.code ? `${redirectBase}/${result.code}` : `${redirectBase}`
      router.push(dest)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(f => (
        <div key={f.name} className="flex flex-col gap-1">
          <label className="text-sm font-semibold">
            {f.label}
            {f.required && <span className="ml-0.5 text-destructive">*</span>}
          </label>
          {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
          {f.kind === 'textarea' && (
            <textarea
              value={(values[f.name] as string) ?? ''}
              onChange={(e) => set(f.name, e.target.value || null)}
              rows={3}
              required={f.required}
              className="rounded border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          {f.kind === 'text' && (
            <input
              type="text"
              value={(values[f.name] as string) ?? ''}
              onChange={(e) => set(f.name, e.target.value || null)}
              required={f.required}
              className="rounded border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          {f.kind === 'number' && (
            <input
              type="number"
              value={(values[f.name] as number) ?? ''}
              onChange={(e) => set(f.name, e.target.value === '' ? null : Number(e.target.value))}
              required={f.required}
              className="rounded border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          {f.kind === 'select' && (
            <select
              value={(values[f.name] as string) ?? ''}
              onChange={(e) => set(f.name, e.target.value || null)}
              required={f.required}
              className="rounded border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">-- none --</option>
              {f.options?.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {f.kind === 'checkbox' && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(values[f.name])}
                onChange={(e) => set(f.name, e.target.checked)}
                className="h-4 w-4"
              />
              {f.label}
            </label>
          )}
          {f.kind === 'relationship' && (
            <input
              type="text"
              placeholder="Code (e.g. C4) or leave blank"
              onChange={async (e) => {
                const val = e.target.value.trim()
                if (!val) { set(f.name, null); return }
                // Defer resolution to save time; the Local API hook resolves the relation
                set(f.name, val.toUpperCase())
              }}
              className="rounded border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-foreground px-4 py-2 text-sm text-background hover:opacity-80 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded border px-4 py-2 text-sm hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
