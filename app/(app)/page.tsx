import Link from "next/link";
import { getPayload } from "payload";
import config from "@/payload.config";

const WORLD_COLLECTIONS = [
  { slug: "characters", label: "Characters", prefix: "C" },
  { slug: "locations", label: "Locations", prefix: "L" },
  { slug: "items", label: "Items", prefix: "I" },
  { slug: "cultures", label: "Cultures", prefix: "U" },
  { slug: "factions", label: "Factions", prefix: "F" },
  { slug: "races", label: "Races", prefix: "R" },
  { slug: "languages", label: "Languages", prefix: "G" },
  { slug: "lore", label: "Lore", prefix: "K" },
  { slug: "events", label: "Events", prefix: "E" },
  { slug: "stories", label: "Stories", prefix: "S" },
] as const;

function tileHref(slug: string) {
  if (slug === "events" || slug === "stories") return `/${slug}`
  return `/${slug}`
}

function newHref(slug: string) {
  if (slug === "events") return "/events/new"
  if (slug === "stories") return "/stories/new"
  return `/${slug}/new`
}

export default async function HomePage() {
  const payload = await getPayload({ config });

  const [counts, unkCounts, placeholderCounts] = await Promise.all([
    // Record counts per collection
    Promise.all(
      WORLD_COLLECTIONS.map(async ({ slug }) => {
        const { totalDocs } = await payload.find({ collection: slug as never, limit: 0, depth: 0 });
        return totalDocs;
      })
    ),
    // UNK counts
    Promise.all(
      WORLD_COLLECTIONS.map(async ({ slug }) => {
        const { totalDocs } = await payload.find({
          collection: slug as never,
          where: { tags: { equals: 1 } },
          limit: 0,
          depth: 0,
        });
        return totalDocs;
      })
    ),
    // Placeholder counts
    Promise.all(
      WORLD_COLLECTIONS.map(async ({ slug }) => {
        const { totalDocs } = await payload.find({
          collection: slug as never,
          where: { status: { in: ['placeholder', 'needs_name'] } },
          limit: 0,
          depth: 0,
        });
        return totalDocs;
      })
    ),
  ]);

  const totalUnk = unkCounts.reduce((a, b) => a + b, 0);
  const totalPlaceholders = placeholderCounts.reduce((a, b) => a + b, 0);

  // Recent edits: last 10 updated across all collections combined (approximate: query each, merge, sort)
  type RecentItem = { id: number; code?: string | null; name?: string | null; title?: string | null; updatedAt: string; collection: string };
  const recentDocs: RecentItem[] = [];
  await Promise.all(
    WORLD_COLLECTIONS.map(async ({ slug }) => {
      const { docs } = await payload.find({
        collection: slug as never,
        limit: 5,
        depth: 0,
        sort: '-updatedAt',
      });
      for (const d of docs) {
        recentDocs.push({ ...(d as RecentItem), collection: slug });
      }
    })
  );
  const recent = recentDocs
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  function entryHref(item: RecentItem) {
    const code = item.code ?? String(item.id);
    if (item.collection === 'events') return `/events/${code}`;
    if (item.collection === 'stories') return `/stories/${code}`;
    return `/${item.collection}/${code}`;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">The Traveler</h1>
        <p className="text-sm text-muted-foreground">Story wiki and timeline.</p>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap gap-4 text-sm">
        {totalUnk > 0 && (
          <Link href="/review" className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 hover:opacity-80 dark:bg-amber-950/30">
            <span className="font-semibold text-amber-800 dark:text-amber-400">{totalUnk} UNK</span>
            <span className="text-muted-foreground">to review</span>
          </Link>
        )}
        {totalPlaceholders > 0 && (
          <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5">
            <span className="font-semibold">{totalPlaceholders}</span>
            <span className="text-muted-foreground">placeholder{totalPlaceholders !== 1 ? 's' : ''} waiting</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Continuity items — available after Phase 4
        </p>
      </div>

      {/* Collection tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {WORLD_COLLECTIONS.map(({ slug, label }, i) => (
          <div key={slug} className="group rounded-md border bg-card">
            <Link href={tileHref(slug)} className="flex flex-col gap-0.5 p-3 hover:bg-accent/40">
              <span className="font-medium text-sm">{label}</span>
              <span className="text-xs text-muted-foreground">{counts[i]} entries</span>
            </Link>
            <div className="border-t px-3 py-1.5">
              <Link href={newHref(slug)} className="text-xs text-muted-foreground hover:text-foreground">
                + New {label.replace(/s$/, '').toLowerCase()}
              </Link>
            </div>
          </div>
        ))}

        <div className="rounded-md border bg-card">
          <Link href="/write" className="flex flex-col gap-0.5 p-3 hover:bg-accent/40">
            <span className="font-medium text-sm">Writing</span>
            <span className="text-xs text-muted-foreground">Studio</span>
          </Link>
        </div>
      </div>

      {/* Recent edits */}
      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Recently updated</h2>
          <ul className="divide-y rounded-md border">
            {recent.map((item) => {
              const name = item.name ?? item.title ?? item.code ?? String(item.id);
              const relTime = (() => {
                const ms = Date.now() - new Date(item.updatedAt).getTime();
                const mins = Math.floor(ms / 60000);
                if (mins < 60) return `${mins}m ago`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h ago`;
                return `${Math.floor(hrs / 24)}d ago`;
              })();
              return (
                <li key={`${item.collection}-${item.id}`}>
                  <Link href={entryHref(item)} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.code}</span>
                    <span className="flex-1 truncate text-sm">{name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relTime}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
