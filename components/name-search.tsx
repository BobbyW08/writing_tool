'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { findNames } from '@/lib/studio/name-actions'

const COLLECTION_LABEL: Record<string, string> = {
  characters: 'Character', locations: 'Location', items: 'Item', cultures: 'Culture', factions: 'Faction',
  races: 'Race', languages: 'Language', lore: 'Lore', events: 'Event', stories: 'Story',
}

// Shell search box. Type a name (or an alias) and pick the entry to open it. Codes are not searchable.
export function NameSearch() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [results, setResults] = useState<Awaited<ReturnType<typeof findNames>>>([])
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) { setResults([]); return }
    const mine = ++seq.current
    const t = setTimeout(async () => {
      const found = await findNames(q)
      if (mine === seq.current) { setResults(found); setActive(0) }
    }, 150)
    return () => clearTimeout(t)
  }, [value])

  function go(entry: { code: string; collection: string }) {
    setValue('')
    setResults([])
    setOpen(false)
    router.push(`/${entry.collection}/${entry.code}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length) }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder="Find by name"
        className="h-7 text-xs"
        aria-label="Find an entry by name"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {results.map((r, i) => (
            <div
              key={r.code}
              onMouseDown={(e) => { e.preventDefault(); go(r) }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-2 px-2 py-1.5 text-xs ${i === active ? 'bg-accent' : ''}`}
            >
              <span className="truncate">{r.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{COLLECTION_LABEL[r.collection] ?? ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
