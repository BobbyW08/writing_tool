import Link from "next/link";
import { getEventsList } from "@/lib/world/queries";
import { TimelineView } from "@/components/timeline-view";
import type { TimelineEventInput } from "@/components/timeline-view";

export default async function TimelinePage() {
  const { docs } = await getEventsList();
  type Ev = { id: number; code?: string | null; name: string; yearLabel?: string | null; startYear?: number | null; parent?: { id: number } | number | null };

  const placed: TimelineEventInput[] = (docs as Ev[])
    .filter(e => e.startYear != null)
    .map(e => ({
      id: String(e.id),
      title: e.name,
      slug: e.code ?? null,       // used for double-click navigation -> /events/${code}
      yearLabel: e.yearLabel ?? null,
      sortOrder: e.startYear!,    // startYear is the position on the timeline
      parentEventId: typeof e.parent === 'object' && e.parent ? String(e.parent.id) : null,
    }));

  const unplaced = (docs as Ev[]).filter(e => e.startYear == null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Drag to reposition. Scroll to pan, ctrl/pinch-scroll to zoom. Click an event to zoom in; double-click to open it.
        </p>
      </div>

      <TimelineView events={placed} />

      {unplaced.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Not yet positioned ({unplaced.length})</h2>
          <ul className="space-y-1">
            {(unplaced as Ev[]).map(e => (
              <li key={e.id}>
                <Link href={`/events/${e.code ?? e.id}`} className="text-sm hover:underline">
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
