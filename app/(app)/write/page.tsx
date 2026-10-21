import Link from 'next/link'
import { getWritingList, type WritingListItem } from '@/lib/studio/queries'
import { Badge } from '@/components/ui/badge'
import { NewWritingButton } from './_new-button'

const STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  canon: 'Canon',
  set_aside: 'Set aside',
}

const KIND_LABELS: Record<string, string> = {
  chapter: 'Ch',
  scene: 'Sc',
  snippet: 'Sn',
}

function shortDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function StateFilter({ current }: { current: string }) {
  const opts = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'canon', label: 'Canon' },
    { value: 'set_aside', label: 'Set aside' },
  ]
  return (
    <div className="flex gap-1">
      {opts.map((o) => (
        <Link
          key={o.value}
          href={o.value ? `/write?state=${o.value}` : '/write'}
          className={`rounded-md px-3 py-1 text-sm ${current === o.value ? 'bg-accent font-medium' : 'hover:bg-accent'}`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}

function WritingRow({ item }: { item: WritingListItem }) {
  return (
    <Link
      href={`/write/${item.code}`}
      className="flex items-center justify-between gap-3 rounded-md border px-4 py-3 hover:bg-accent"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.name}</span>
        <span className="block text-xs text-muted-foreground">
          {[
            item.code,
            item.story ? item.story.code : null,
            shortDate(item.updatedAt),
          ].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Badge variant="outline" className="text-xs">{KIND_LABELS[item.kind] ?? item.kind}</Badge>
        <Badge variant="outline" className="text-xs">{STATE_LABELS[item.canonState] ?? item.canonState}</Badge>
        <span className="min-w-[4rem] text-right text-xs text-muted-foreground">{item.wordCount}w</span>
      </span>
    </Link>
  )
}

export default async function WritePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state = '' } = await searchParams
  const all = await getWritingList()

  const filtered = state ? all.filter((w) => w.canonState === state) : all
  const active = filtered.filter((w) => w.canonState !== 'set_aside')
  const setAside = filtered.filter((w) => w.canonState === 'set_aside')

  // Group active records by story
  const storiesMap = new Map<string, { label: string; items: WritingListItem[] }>()
  for (const w of active) {
    const key = w.story ? w.story.id : '__none__'
    if (!storiesMap.has(key)) {
      storiesMap.set(key, { label: w.story ? `${w.story.code} — ${w.story.name}` : 'No story', items: [] })
    }
    storiesMap.get(key)!.items.push(w)
  }

  // "No story" group last
  const groups = [...storiesMap.entries()].sort(([a], [b]) => {
    if (a === '__none__') return 1
    if (b === '__none__') return -1
    return 0
  })

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Writing</h1>
          <p className="text-sm text-muted-foreground">Chapters, scenes and snippets.</p>
        </div>
        <NewWritingButton />
      </div>

      <StateFilter current={state} />

      {groups.length === 0 && setAside.length === 0 && (
        <p className="text-sm text-muted-foreground">No writing yet.</p>
      )}

      {groups.map(([key, group]) => (
        <div key={key} className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
          <ul className="space-y-1">
            {group.items.map((w) => <li key={w.id}><WritingRow item={w} /></li>)}
          </ul>
        </div>
      ))}

      {setAside.length > 0 && (
        <details className="space-y-1">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Set aside ({setAside.length})
          </summary>
          <ul className="mt-1 space-y-1">
            {setAside.map((w) => <li key={w.id}><WritingRow item={w} /></li>)}
          </ul>
        </details>
      )}
    </div>
  )
}
