import Link from "next/link";
import { getEventsList, getErasList, getConvergenceCandidates, getTimelineSettings, getEntryByCode, getEventsInvolving, getEventsForStory } from "@/lib/world/queries";
import { PREFIX_TO_SLUG } from "@/lib/codes";
import { TimelineView } from "@/components/timeline-view";
import { EraManager } from "@/components/era-manager";
import { ConvergenceView } from "@/components/convergence-view";
import { TimelineGapsManager } from "@/components/timeline-gaps-manager";
import type { TimelineEventInput, TimelineEraInput, TimeGap } from "@/components/timeline-view";

// Step UX6b (board 10): "View in the master timeline" from an entry's own Timeline tab. Resolves
// the highlighted entry's own events (a story's via storyDramatizes, anything else's via
// eventInvolves -- both already-reviewed queries, nothing new here) plus, for a story, its own
// span, so the page can zoom there and dim every other event without hiding it.
async function resolveHighlight(code: string | undefined): Promise<{ name: string; eventIds: string[]; range: { start: number; end: number } | null } | null> {
  if (!code) return null
  const collection = PREFIX_TO_SLUG[code[0]?.toUpperCase() ?? '']
  if (!collection) return null
  const entry = await getEntryByCode(collection, code) as { id: number; name: string; startYear?: number | null; endYear?: number | null } | null
  if (!entry) return null

  const events = collection === 'stories' ? await getEventsForStory(entry.id) : await getEventsInvolving(collection, entry.id)
  const years = [
    ...(entry.startYear != null ? [entry.startYear] : []),
    ...(entry.endYear != null ? [entry.endYear] : []),
    ...(events as { startYear: number | null }[]).map(e => e.startYear).filter((y): y is number => y != null),
  ]
  return {
    name: entry.name,
    eventIds: (events as { id: number }[]).map(e => String(e.id)),
    range: years.length > 0 ? { start: Math.min(...years), end: Math.max(...years) } : null,
  }
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ era?: string; highlight?: string }>;
}) {
  const { era, highlight } = await searchParams;
  const { docs } = await getEventsList();
  const { docs: eraDocs } = await getErasList();
  const candidates = await getConvergenceCandidates();
  const settings = await getTimelineSettings();
  const gaps = (settings.gaps ?? []) as TimeGap[];
  const highlighted = await resolveHighlight(highlight);

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

      {highlighted && (
        <div className="flex items-center justify-between rounded-md border border-dashed border-blue-300 bg-blue-500/5 px-3 py-2 text-sm text-blue-700 dark:border-blue-700 dark:text-blue-300">
          <span>Highlighting {highlighted.name}. Everything else is dimmed, not hidden.</span>
          <Link href="/timeline" className="hover:underline">Clear</Link>
        </div>
      )}

      <EraManager
        eras={(eraDocs as Era[]).map(e => ({
          id: e.id, code: e.code, name: e.name, startYear: e.startYear ?? null,
          endYear: e.endYear ?? null, yearLabel: e.yearLabel ?? null, color: e.color ?? null, kind: e.kind,
        }))}
      />

      <TimelineGapsManager gaps={gaps} />

      <TimelineView
        events={placed}
        eras={eras}
        focusEraCode={era ?? null}
        gaps={gaps}
        highlightEventIds={highlighted ? highlighted.eventIds : null}
        highlightRange={highlighted?.range ?? null}
      />

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
