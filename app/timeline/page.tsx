import Link from "next/link";
import { listEvents } from "@/lib/data/events";
import { TimelineView } from "@/components/timeline-view";

export default async function TimelinePage() {
  const events = await listEvents();

  const placed = events
    .filter((e): e is typeof e & { sortOrder: string } => e.sortOrder !== null)
    .map((e) => ({ id: e.id, title: e.title, slug: e.slug, yearLabel: e.yearLabel, sortOrder: Number(e.sortOrder) }));
  const unplaced = events.filter((e) => e.sortOrder === null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="text-sm text-muted-foreground">Drag an event to reposition it. Scroll to pan, pinch/ctrl-scroll to zoom.</p>
      </div>

      <TimelineView events={placed} />

      {unplaced.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Not yet positioned ({unplaced.length})</h2>
          <ul className="space-y-1">
            {unplaced.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.slug}`} className="text-sm hover:underline">
                  {e.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
