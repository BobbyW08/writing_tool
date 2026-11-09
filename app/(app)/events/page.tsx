import Link from "next/link";
import { getCollectionList, getTagsList, isUnk } from "@/lib/world/queries";
import { CollectionViewSwitch } from "@/components/collection-view-switch";
import { listViewConfigFor } from "@/lib/world/listViews";
import type { TableRow } from "@/components/collection-table-view";

export default async function EventsPage() {
  const { docs } = await getCollectionList('events');
  const allTags = await getTagsList();
  type Ev = { id: number; code?: string | null; name: string; yearLabel?: string | null; startYear?: number | null; eventType?: string | null; status?: string | null; tagIds?: number[] | null; tags?: { id: number; name: string }[] };
  const typedDocs = docs as unknown as Ev[];
  const config = listViewConfigFor('events');
  const rows: TableRow[] = typedDocs.map((e) => ({
    id: e.id,
    code: e.code,
    name: e.name,
    status: e.status,
    startYear: e.startYear,
    eventType: e.eventType,
    tagIds: e.tagIds ?? [],
    tags: e.tags ?? [],
  }));

  const placed = typedDocs.filter(e => e.startYear != null).sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0));
  const unplaced = typedDocs.filter(e => e.startYear == null);

  const listView = (
    <>
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
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link href="/events/new" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
          + New
        </Link>
      </div>

      <CollectionViewSwitch collection="events" listView={listView} rows={rows} config={config} allTags={allTags} />
    </div>
  );
}
