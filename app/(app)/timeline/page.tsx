import Link from "next/link";
import { getEventsList, getErasList, getConvergenceCandidates, getTimelineSettings } from "@/lib/world/queries";
import { TimelineView } from "@/components/timeline-view";
import { EraManager } from "@/components/era-manager";
import { ConvergenceView } from "@/components/convergence-view";
import { TimelineGapsManager } from "@/components/timeline-gaps-manager";
import type { TimelineEventInput, TimelineEraInput, TimeGap } from "@/components/timeline-view";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ era?: string }>;
}) {
  const { era } = await searchParams;
  const { docs } = await getEventsList();
  const { docs: eraDocs } = await getErasList();
  const candidates = await getConvergenceCandidates();
  const settings = await getTimelineSettings();
  const gaps = (settings.gaps ?? []) as TimeGap[];

  type Ev = {
    id: number; code?: string | null; name: string; yearLabel?: string | null; startYear?: number | null;
    parent?: { id: number } | number | null; lane?: number | null; eventType?: string | null; importance?: string | null;
  };
  type Era = {
    id: number; code: string; name: string; startYear?: number | null; endYear?: number | null;
    yearLabel?: string | null; color?: string | null; kind: string;
  };

  const placed: TimelineEventInput[] = (docs as Ev[])
    .filter(e => e.startYear != null)
    .map(e => ({
      id: String(e.id),
      title: e.name,
      slug: e.code ?? null,       // used for double-click navigation -> /events/${code}
      yearLabel: e.yearLabel ?? null,
      sortOrder: e.startYear!,    // startYear is the position on the timeline
      parentEventId: typeof e.parent === 'object' && e.parent ? String(e.parent.id) : null,
      lane: e.lane ?? 0,
      eventType: e.eventType ?? null,
      importance: e.importance ?? null,
    }));

  const unplaced = (docs as Ev[]).filter(e => e.startYear == null);

  const eras: TimelineEraInput[] = (eraDocs as Era[]).map(e => ({
    code: e.code,
    name: e.name,
    startYear: e.startYear ?? null,
    endYear: e.endYear ?? null,
    color: e.color ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="text-sm text-muted-foreground">
          Drag to reposition or change lane. Scroll to pan, ctrl/pinch-scroll to zoom. Click an
          event to zoom in, double-click to open it, or click empty space to add one.
        </p>
      </div>

      <EraManager
        eras={(eraDocs as Era[]).map(e => ({
          id: e.id, code: e.code, name: e.name, startYear: e.startYear ?? null,
          endYear: e.endYear ?? null, yearLabel: e.yearLabel ?? null, color: e.color ?? null, kind: e.kind,
        }))}
      />

      <TimelineGapsManager gaps={gaps} />

      <TimelineView events={placed} eras={eras} focusEraCode={era ?? null} gaps={gaps} />

      <ConvergenceView candidates={candidates} />

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
