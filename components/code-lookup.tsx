'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { searchForEntry } from '@/lib/world/actions'

const CODE_RE = /^([CLEIFRGKSWXQTU])(\d{1,6})$/i

// Shell search box: accepts a code (C4) or name and jumps to the entry's page.
export function CodeLookup() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    setError(null)

    startTransition(async () => {
      const result = await searchForEntry(q)
      if (!result) {
        setError('Not found')
        return
      }
      setValue('')
      router.push(`/${result.collection}/${result.code}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        value={value}
        onChange={e => { setValue(e.target.value); setError(null) }}
        placeholder="C4 or name..."
        className={`h-7 text-xs ${error ? 'border-destructive' : ''}`}
        aria-label="Jump to entry"
        disabled={pending}
      />
      {error && <p className="absolute -bottom-4 left-0 text-xs text-destructive">{error}</p>}
    </form>
  )
}
