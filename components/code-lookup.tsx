'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { searchForEntry } from '@/lib/world/actions'

// Shell search box: accepts a code (C4) or name and jumps to the entry's page.
export function CodeLookup() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return

    startTransition(async () => {
      const result = await searchForEntry(q)
      if (!result) {
        // No single direct hit (exact code or an exact name match) -- hand off to /search, which
        // also checks aliases and shows every match instead of a dead end.
        setValue('')
        router.push(`/search?q=${encodeURIComponent(q)}`)
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
        onChange={e => setValue(e.target.value)}
        placeholder="C4 or name..."
        className="h-7 text-xs"
        aria-label="Jump to entry"
        disabled={pending}
      />
    </form>
  )
}
