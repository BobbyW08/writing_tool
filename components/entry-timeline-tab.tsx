import Link from "next/link";

// Step UX6b (board 10): one entry's own timeline, read entirely from already-fetched data (the
// link index / join tables, never re-queried here). The same shape serves a story (span + events +
// planned beats) and a character or location (events only, no span, no beats) -- only the inputs
// differ, per CLAUDE.md hard rule 15 (one shape, no per-view reinvention).

export type EntryTimelineItem = {
  code: string;
  name: string;
  startYear: number | null;
  yearLabel?: string | null;
  kind: "event" | "beat";
};

export type EntryTimelineEra = {
  code: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
  color: string | null;
};

export type EntryTimelineSpan = {
  name: string;
  startYear: number | null;
  endYear: number | null;
  yearLabel: string | null;
};

function yearRangeText(startYear: number | null, endYear: number | null, yearLabel: string | null): string {
  if (yearLabel) return yearLabel;
  if (startYear != null && endYear != null && endYear !== startYear) return `Year ${startYear} to ${endYear}`;
  if (startYear != null) return `Year ${startYear}`;
  return "No year set";
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function EntryTimelineTab({
  entryName,
  span,
  items,
  eras,
  masterTimelineHref,
  storyBuilderHref,
  eventHref,
  beatsHref,
}: {
  entryName: string;
  span?: EntryTimelineSpan | null;
  items: EntryTimelineItem[];
  eras: EntryTimelineEra[];
  masterTimelineHref: string;
  storyBuilderHref?: string | null;
  eventHref: (code: string) => string;
  beatsHref?: string | null;
}) {
  const dated = items.filter((i) => i.startYear != null);
  const undated = items.filter((i) => i.startYear == null);

  const anchorYears = [
    ...(span?.startYear != null ? [span.startYear] : []),
    ...(span?.endYear != null ? [span.endYear] : []),
    ...dated.map((i) => i.startYear as number),
  ];

  const hasStrip = anchorYears.length > 0;
  const minYear = hasStrip ? Math.min(...anchorYears) : 0;
  const maxYear = hasStrip ? Math.max(...anchorYears) : 0;
  const pad = Math.max(1, (maxYear - minYear) * 0.15 || 5);
  const domainMin = minYear - pad;
  const domainMax = maxYear + pad;
  const domainSpan = Math.max(domainMax - domainMin, 1);
  const pct = (year: number) => clampPct(((year - domainMin) / domainSpan) * 100);

  const overlappingEras = hasStrip
    ? eras.filter((e) => e.startYear != null && e.endYear != null && e.endYear >= domainMin && e.startYear <= domainMax)
    : [];

  const tickCount = 6;
  const ticks = hasStrip
    ? [...new Set(Array.from({ length: tickCount + 1 }, (_, i) => Math.round(domainMin + (domainSpan * i) / tickCount)))]
    : [];

  const orderedList = [...dated].sort((a, b) => (a.startYear as number) - (b.startYear as number));

  const hrefFor = (item: EntryTimelineItem) => (item.kind === "event" ? eventHref(item.code) : beatsHref ?? "#");
  const typeLabel = (item: EntryTimelineItem) => (item.kind === "event" ? "Event" : "Beat");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Timeline for {entryName}</div>
          <p className="text-xs text-muted-foreground">
            Only this entry: {span ? "its span, its events and its planned beats." : "its own events."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={masterTimelineHref}
            className="rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            View in the master timeline
          </Link>
          {storyBuilderHref && (
            <Link href={storyBuilderHref} className="rounded-md border px-3.5 py-2 text-sm hover:bg-accent/40">
              Open in Story Builder
            </Link>
          )}
        </div>
      </div>

      {!hasStrip && undated.length === 0 && (
        <p className="text-sm italic text-muted-foreground">Nothing on the timeline yet.</p>
      )}

      {hasStrip && (
        <div className="relative rounded-md border bg-muted/20 px-3 pb-10 pt-7">
          {overlappingEras.length > 0 && (
            <div className="relative mb-2 h-6">
              {overlappingEras.map((e) => (
                <div
                  key={e.code}
                  className="absolute top-0 flex h-5 items-center truncate rounded px-1.5 text-[11px] font-medium text-white"
                  style={{
                    left: `${pct(e.startYear as number)}%`,
                    width: `${Math.max(pct(e.endYear as number) - pct(e.startYear as number), 2)}%`,
                    backgroundColor: e.color ?? "#3d3560",
                  }}
                  title={e.name}
                >
                  {e.name}
                </div>
              ))}
            </div>
          )}

          <div className="relative h-5 border-b text-[11px] text-muted-foreground">
            {ticks.map((y, i) => (
              <span key={i} className="absolute -translate-x-1/2" style={{ left: `${pct(y)}%` }}>
                {y}
              </span>
            ))}
          </div>

          {span && (
            <div className="relative mt-4 h-7">
              <div
                className="absolute flex h-7 items-center truncate rounded bg-primary px-2 text-xs font-semibold text-primary-foreground"
                style={{
                  left: `${pct(span.startYear ?? minYear)}%`,
                  width: `${Math.max(pct(span.endYear ?? span.startYear ?? minYear) - pct(span.startYear ?? minYear), 3)}%`,
                }}
              >
                {entryName}, {yearRangeText(span.startYear, span.endYear, span.yearLabel)}
              </div>
            </div>
          )}

          {dated.some((i) => i.kind === "event") && (
            <div className="relative mt-5 h-16">
              <p className="absolute -top-4 left-0 text-[11px] text-muted-foreground">Events</p>
              {dated.filter((i) => i.kind === "event").map((i, idx) => (
                <div
                  key={i.code}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${pct(i.startYear as number)}%`, top: idx % 2 === 0 ? 0 : "1.75rem" }}
                >
                  <div className="h-3.5 w-3.5 rounded-full bg-foreground" title={i.name} />
                  <Link href={eventHref(i.code)} className="mt-1 block w-24 truncate text-[11px] hover:underline">
                    {i.name}
                  </Link>
                </div>
              ))}
            </div>
          )}

          {dated.some((i) => i.kind === "beat") && (
            <div className="relative mt-5 h-16">
              <p className="absolute -top-4 left-0 text-[11px] text-muted-foreground">Planned beats</p>
              {dated.filter((i) => i.kind === "beat").map((i, idx) => (
                <div
                  key={i.code}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${pct(i.startYear as number)}%`, top: idx % 2 === 0 ? "0.1rem" : "1.85rem" }}
                >
                  <div className="h-3 w-3 rotate-45 border-2 border-blue-400" title={i.name} />
                  <Link href={beatsHref ?? "#"} className="mt-1 block w-24 truncate text-[11px] text-blue-500 hover:underline">
                    {i.name}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(orderedList.length > 0 || undated.length > 0) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {orderedList.length > 0 && (
            <section className="flex-1 overflow-hidden rounded-md border">
              <div className="px-3 py-2 text-xs text-muted-foreground">In order</div>
              {orderedList.map((i) => (
                <div key={i.code} className="flex items-center gap-4 border-t px-3 py-2 text-sm">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">
                    {i.yearLabel ?? `Year ${i.startYear}`}
                  </span>
                  <Link href={hrefFor(i)} className="flex-1 hover:underline">
                    {i.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{typeLabel(i)}</span>
                </div>
              ))}
            </section>
          )}

          {undated.length > 0 && (
            <aside className="w-full shrink-0 rounded-md border border-dashed p-3 text-sm sm:w-64">
              <div className="font-medium">No year yet: {undated.length} item{undated.length === 1 ? "" : "s"}</div>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {undated.map((i) => (
                  <li key={i.code}>
                    <Link href={hrefFor(i)} className="hover:underline">{i.name}</Link> ({typeLabel(i)})
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      )}

      <div className="rounded-md border border-dashed border-blue-300 bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:border-blue-700 dark:text-blue-300">
        View in the master timeline opens the full timeline with this entry highlighted, its years in
        view and everything else dimmed but still there, so you can see what else happens around it.
      </div>
    </div>
  );
}
