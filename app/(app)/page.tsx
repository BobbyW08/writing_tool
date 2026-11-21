import Link from 'next/link'
import {
  getCollectionCount, getCollectionNeedsAttentionCount, getRecentEdits,
} from '@/lib/world/queries'
import { GapRecommender } from '@/components/gap-recommender'

// Step UX1: "What do you want to work on?" (board 1). The old per-collection card gallery that
// used to live here moves onto each type page (step UX2); Home is one question with five big
// answers, not a wall of cards.
const HOME_CARDS = [
  { slug: 'characters', label: 'Characters', blurb: 'People, creatures, companions', href: '/characters' },
  { slug: 'locations', label: 'Locations', blurb: 'Places, maps, regions', href: '/locations' },
  { slug: 'stories', label: 'Stories', blurb: 'Write, build, review, or get ideas', href: '/stories' },
  { slug: 'events', label: 'Events', blurb: 'What happens, and when', href: '/events' },
  { slug: 'timeline', label: 'Timeline', blurb: 'Eras, lanes, the master timeline', href: '/timeline' },
] as const

const SMALL_LINKS = [
  { label: 'Items', href: '/items' },
  { label: 'Lore', href: '/lore' },
  { label: 'Factions', href: '/factions' },
  { label: 'Cultures', href: '/cultures' },
  { label: 'Manuscript', href: '/compilations' },
  { label: 'Ideas', href: '/stories' },
] as const

function entryHref(item: { collection: string; code: string }) {
  if (item.collection === 'events') return `/events/${item.code}`
  if (item.collection === 'stories') return `/stories/${item.code}`
  return `/${item.collection}/${item.code}`
}

function relativeTime(updatedAt: string): string {
  const ms = Date.now() - new Date(updatedAt).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function HomePage() {
  const countable = HOME_CARDS.filter((c) => c.slug !== 'timeline')
  const [counts, attentionCounts, recent, eraCount] = await Promise.all([
    Promise.all(countable.map((c) => getCollectionCount(c.slug))),
    Promise.all(countable.map((c) => getCollectionNeedsAttentionCount(c.slug))),
    getRecentEdits(1),
    getCollectionCount('eras'),
  ])
  const latest = recent[0]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">What do you want to work on?</h1>

      <div className="flex flex-wrap gap-3.5">
        {HOME_CARDS.map((card) => {
          const i = countable.findIndex((c) => c.slug === card.slug)
          return (
            <Link
              key={card.slug}
              href={card.href}
              className="flex h-[150px] flex-1 min-w-[180px] flex-col gap-1.5 rounded-lg border bg-card p-5 hover:bg-accent/40"
            >
              <span className="text-xl font-bold">{card.label}</span>
              <span className="text-sm text-muted-foreground">{card.blurb}</span>
              <span className="mt-auto text-xs text-muted-foreground">
                {i >= 0 ? `${counts[i]} entries, ${attentionCounts[i]} need attention` : `${eraCount} eras`}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
        <GapRecommender />

        <section className="flex flex-1 min-w-[260px] flex-col gap-3 rounded-lg border bg-card p-5">
          <div className="text-lg font-semibold">Continue where you left off</div>
          {latest ? (
            <div className="rounded-md border border-dashed p-3 text-sm">
              <Link href={entryHref(latest)} className="font-medium hover:underline">
                {latest.name}
              </Link>
              <div className="mt-1 text-xs text-muted-foreground">
                {latest.collection}, edited {relativeTime(latest.updatedAt)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing edited yet.</p>
          )}
          <div className="mt-auto flex gap-2.5">
            <Link href="/story-builder">
              <span className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                Open Story Builder
              </span>
            </Link>
            {latest && (
              <Link href={entryHref(latest)}>
                <span className="inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-accent">
                  Open last entry
                </span>
              </Link>
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        Also here:
        {SMALL_LINKS.map((l) => (
          <Link key={l.label} href={l.href} className="rounded-full bg-muted px-2.5 py-0.5 text-xs hover:bg-accent">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
