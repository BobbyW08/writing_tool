import Link from "next/link";
import { getEventsList, isUnk } from "@/lib/world/queries";

export default async function EventsPage() {
  const { docs } = await getEventsList();
  type Ev = { id: number; code?: string | null; name: string; yearLabel?: string | null; startYear?: number | null; tagIds?: number[] | null };

  const placed = (docs as Ev[]).filter(e => e.startYear != null).sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0));
  const unplaced = (docs as Ev[]).filter(e => e.startYear == null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link href="/events/new" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
          + New
        </Link>
      </div>

      <div className="divide-y rounded-md border">
        {placed.map(e => (
          <Link key={e.id} href={`/events/${e.code ?? e.id}`} className="flex items-center gap-3 p-3 hover:bg-accent">
            <span className="w-20 shrink-0 text-right font-mono text-xs text-muted-foreground">
              {e.yearLabel ?? (e.startYear != null ? `Year ${e.startYear}` : "")}
            </span>
            <span className="flex-1 text-sm font-medium">{e.name}</span>
            {isUnk(e.tagIds ?? null) && (
              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                UNK
              </span>
            )}
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{e.code}</span>
          </Link>
        ))}
      </div>

      {unplaced.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Not yet positioned ({unplaced.length})</h2>
          <div className="divide-y rounded-md border">
            {unplaced.map(e => (
              <Link key={e.id} href={`/events/${e.code ?? e.id}`} className="flex items-center gap-3 p-3 hover:bg-accent">
                <span className="text-sm font-medium">{e.name}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{e.code}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
