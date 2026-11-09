"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Timeline, {
  TimelineHeaders,
  DateHeader,
  type TimelineItemBase,
  type TimelineGroupBase,
} from "react-calendar-timeline";
import "react-calendar-timeline/dist/style.css";
import "./timeline-view.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomOut, Search } from "lucide-react";
import { updateEventYearAction, updateEventLaneAction } from "@/lib/world/actions";
import { ITEM_WIDTH_YEARS, msToSortOrder, sortOrderToMs, yearToMs, msToYear, type TimeGap } from "@/lib/timeline-scale";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { TimelineMinimap } from "@/components/timeline-minimap";

export interface TimelineEventInput {
  id: string;
  title: string;
  slug: string | null;
  yearLabel: string | null;
  sortOrder: number;
  parentEventId: string | null;
  lane: number;
  eventType: string | null;
  importance: string | null;
}

export interface TimelineEraInput {
  code: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
  color: string | null;
}

const TIMELINE_KEYS = {
  groupIdKey: "id",
  groupTitleKey: "title",
  groupRightTitleKey: "rightTitle",
  groupLabelKey: "title",
  itemIdKey: "id",
  itemTitleKey: "title",
  itemDivTitleKey: "title",
  itemGroupKey: "group",
  itemTimeStartKey: "start_time",
  itemTimeEndKey: "end_time",
};

const TIME_STEPS = { second: 3600, minute: 3600, hour: 24, day: 30, month: 12, year: 1 };

const DEFAULT_START = -5;
const DEFAULT_END = 65;
const LINE_HEIGHT = 44;
const PRIMARY_HEADER_HEIGHT = 22;
const YEAR_HEADER_HEIGHT = 30;
const HEADER_HEIGHT = PRIMARY_HEADER_HEIGHT + YEAR_HEADER_HEIGHT;
const SIDEBAR_WIDTH = 72;

const EVENT_TYPE_OPTIONS: MultiSelectOption[] = [
  { value: "celestial", label: "Celestial" },
  { value: "political", label: "Political" },
  { value: "battle", label: "Battle" },
  { value: "discovery", label: "Discovery" },
  { value: "death", label: "Death" },
  { value: "birth", label: "Birth" },
  { value: "journey", label: "Journey" },
  { value: "other", label: "Other" },
];

const EVENT_TYPE_COLOR: Record<string, string> = {
  celestial: "#7c3aed",
  political: "#2563eb",
  battle: "#dc2626",
  discovery: "#059669",
  death: "#44403c",
  birth: "#db2777",
  journey: "#d97706",
  other: "#6b7280",
};

function colorForEventType(eventType: string | null): string {
  return (eventType && EVENT_TYPE_COLOR[eventType]) || "var(--color-primary)";
}

function heightForImportance(importance: string | null): number {
  if (importance === "important") return 0.95;
  if (importance === "minor") return 0.55;
  return 0.78;
}

// A colored band's left-edge and width, as a percentage of the time axis currently on screen
// (clamped to [0, 100] so a band that only partly overlaps the visible range still renders).
function bandPercent(startMs: number, endMs: number, visibleStart: number, visibleEnd: number) {
  const span = visibleEnd - visibleStart;
  const left = Math.max(0, Math.min(100, ((startMs - visibleStart) / span) * 100));
  const right = Math.max(0, Math.min(100, ((endMs - visibleStart) / span) * 100));
  return { left, width: Math.max(0, right - left) };
}

export default function TimelineView({
  events,
  eras,
  focusEraCode,
  gaps = [],
}: {
  events: TimelineEventInput[];
  eras: TimelineEraInput[];
  focusEraCode?: string | null;
  gaps?: TimeGap[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Gap-aware mapping: identity when `gaps` is empty, so every call site below behaves exactly
  // as it did before this feature existed. See lib/timeline-scale.ts.
  const toMs = useMemo(() => (year: number) => yearToMs(year, gaps), [gaps]);
  const toYear = useMemo(() => (ms: number) => msToYear(ms, gaps), [gaps]);

  const lanes = useMemo(() => {
    const used = new Set<number>([0, ...events.map((e) => e.lane)]);
    return [...used].sort((a, b) => a - b);
  }, [events]);

  const groups: TimelineGroupBase[] = useMemo(
    () => lanes.map((lane) => ({ id: lane, title: `Lane ${lane}` })),
    [lanes],
  );

  const [items, setItems] = useState<TimelineItemBase<number>[]>(() =>
    events.map((e) => ({
      id: e.id,
      group: e.lane,
      title: e.title,
      start_time: toMs(e.sortOrder),
      end_time: toMs(e.sortOrder + ITEM_WIDTH_YEARS),
      canResize: false,
      canMove: true,
    })),
  );

  useEffect(() => {
    setItems(
      events.map((e) => ({
        id: e.id,
        group: e.lane,
        title: e.title,
        start_time: toMs(e.sortOrder),
        end_time: toMs(e.sortOrder + ITEM_WIDTH_YEARS),
        canResize: false,
        canMove: true,
      })),
    );
  }, [events, toMs]);

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, TimelineEventInput[]>();
    for (const e of events) {
      if (!e.parentEventId) continue;
      const list = map.get(e.parentEventId) ?? [];
      list.push(e);
      map.set(e.parentEventId, list);
    }
    return map;
  }, [events]);

  const focusEra = useMemo(
    () => (focusEraCode ? eras.find((e) => e.code === focusEraCode) ?? null : null),
    [eras, focusEraCode],
  );

  const [visibleRange, setVisibleRange] = useState(() => {
    if (focusEra && focusEra.startYear != null) {
      const padding = Math.max(((focusEra.endYear ?? focusEra.startYear) - focusEra.startYear) * 0.25, 10);
      return {
        start: toMs(focusEra.startYear - padding),
        end: toMs((focusEra.endYear ?? focusEra.startYear) + padding),
      };
    }
    return { start: toMs(DEFAULT_START), end: toMs(DEFAULT_END) };
  });
  // react-calendar-timeline only reads visibleTimeStart/End props once, at mount — they
  // aren't reactive after that. Programmatic zoom (click-to-zoom, reset view, jump-to-era)
  // has to call the instance's own updateScrollCanvas method directly. The library's public
  // ref type doesn't expose it, but the underlying class instance has it — cast around the
  // narrow type rather than not zooming at all.
  const timelineRef = useRef<{ updateScrollCanvas?: (start: number, end: number) => void } | null>(null);

  function goToRange(start: number, end: number) {
    setVisibleRange({ start, end });
    timelineRef.current?.updateScrollCanvas?.(start, end);
  }

  const minZoom = useMemo(() => sortOrderToMs(2) - sortOrderToMs(0), []); // don't zoom in past ~2 "years"
  const maxZoom = useMemo(() => sortOrderToMs(2200) - sortOrderToMs(-100), []); // full range

  // Ctrl/pinch-to-zoom on the timeline scrolls the page behind it unless we stop the
  // wheel event ourselves — react-calendar-timeline's own handler doesn't prevent the
  // browser's default scroll, and React's onWheel is passive by default so e.preventDefault()
  // there is a no-op. A native, non-passive listener is the only way to actually stop it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Era bands are a custom overlay, not a react-calendar-timeline feature — the library has no
  // concept of a full-height colored background span. Positioned in the same percent-of-visible-
  // range space the library itself scrolls/zooms in, so it tracks onTimeChange exactly.
  const [canvasWidthPx, setCanvasWidthPx] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setCanvasWidthPx(Math.max(0, el.clientWidth - SIDEBAR_WIDTH));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Search and filter (W2 polish): search zooms to a matching event, the type filter dims
  // non-matching items without changing the layout (so lanes/groups never shift under a filter).
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  const searchMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return events.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 8);
  }, [search, events]);

  function zoomToEvent(ev: TimelineEventInput) {
    const children = childrenByParent.get(ev.id) ?? [];
    const sortOrders = [ev.sortOrder, ...children.map((c) => c.sortOrder)];
    const min = Math.min(...sortOrders);
    const max = Math.max(...sortOrders);
    const padding = Math.max((max - min) * 0.2, 3);
    goToRange(toMs(min - padding), toMs(max + ITEM_WIDTH_YEARS + padding));
  }

  // Mini-map: the full navigable range (padded a little past the earliest/latest event) and a
  // tick per event, in the same compressed-ms space the main canvas scrolls in.
  const { totalStart, totalEnd } = useMemo(() => {
    const years = events.map((e) => e.sortOrder);
    const minYear = Math.min(DEFAULT_START, ...years) - 10;
    const maxYear = Math.max(DEFAULT_END, ...years.map((y) => y + ITEM_WIDTH_YEARS)) + 10;
    return { totalStart: toMs(minYear), totalEnd: toMs(maxYear) };
  }, [events, toMs]);
  const tickPositions = useMemo(() => events.map((e) => toMs(e.sortOrder)), [events, toMs]);

  function handleItemMove(itemId: string | number, dragTime: number, newGroupOrder: number) {
    const id = String(itemId);
    const newSortOrder = Math.round(toYear(dragTime));
    const newLane = groups[newGroupOrder]?.id as number | undefined;
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              start_time: toMs(newSortOrder),
              end_time: toMs(newSortOrder + ITEM_WIDTH_YEARS),
              group: newLane ?? it.group,
            }
          : it,
      ),
    );

    const ev = eventById.get(id);
    updateEventYearAction(id, newSortOrder).catch(() => {
      toast.error(`Couldn't save the new position for "${ev?.title ?? id}".`);
    });
    if (newLane != null && newLane !== ev?.lane) {
      updateEventLaneAction(id, newLane).catch(() => {
        toast.error(`Couldn't save the new lane for "${ev?.title ?? id}".`);
      });
    }

    if (ev?.yearLabel) {
      toast(`Moved "${ev.title}" to position ~${newSortOrder}`, {
        description: `Its label still says "${ev.yearLabel}" — update it if that no longer fits.`,
        action: { label: "Edit event", onClick: () => router.push(`/events/${ev.slug}`) },
      });
    }
  }

  // Single click zooms to fit the event (and its sub-events, if any); double click opens it.
  function handleItemClick(itemId: string | number) {
    const ev = eventById.get(String(itemId));
    if (ev) zoomToEvent(ev);
  }

  function handleItemDoubleClick(itemId: string | number) {
    const ev = eventById.get(String(itemId));
    if (ev?.slug) router.push(`/events/${ev.slug}`);
  }

  // Click empty space to add an event at that year and lane.
  function handleCanvasClick(groupId: string | number, time: number) {
    const year = Math.round(toYear(time));
    router.push(`/events/new?startYear=${year}&lane=${groupId}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => goToRange(toMs(DEFAULT_START), toMs(DEFAULT_END))}>
          <ZoomOut className="size-4" /> Reset view
        </Button>

        <div className="relative w-56">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Jump to an event..."
              className="h-9 pl-7 text-sm"
            />
          </div>
          {searchOpen && searchMatches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
              {searchMatches.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    className="block w-full truncate px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                    onMouseDown={(e) => { e.preventDefault(); zoomToEvent(ev); setSearch(ev.title); setSearchOpen(false); }}
                  >
                    {ev.title}
                    {ev.yearLabel && <span className="ml-1.5 text-xs text-muted-foreground">{ev.yearLabel}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="w-64">
          <MultiSelect options={EVENT_TYPE_OPTIONS} selected={typeFilter} onChange={setTypeFilter} placeholder="Filter by event type" />
        </div>
      </div>

      <div ref={containerRef} className="relative rounded-md border">
        {/* Era bands: positioned behind the timeline's own rows/grid (those sit at z-index 30-88). */}
        <div
          className="pointer-events-none absolute z-0 overflow-hidden"
          style={{ left: SIDEBAR_WIDTH, top: HEADER_HEIGHT, width: canvasWidthPx, height: groups.length * LINE_HEIGHT }}
        >
          {eras.map((era) => {
            if (era.startYear == null) return null;
            const startMs = toMs(era.startYear);
            const endMs = toMs(era.endYear ?? era.startYear + 1);
            const { left, width } = bandPercent(startMs, endMs, visibleRange.start, visibleRange.end);
            if (width <= 0) return null;
            return (
              <div
                key={era.code}
                className="absolute top-0 h-full border-x border-black/10"
                style={{ left: `${left}%`, width: `${width}%`, backgroundColor: era.color ?? "var(--color-muted)", opacity: 0.25 }}
                title={era.name}
              >
                <span className="absolute left-1 top-0.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
                  {era.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Gap markers: a thin torn-looking divider over each compressed span, same overlay
            technique as era bands. Drawn above era bands (z-10) since a gap matters more. */}
        <div
          className="pointer-events-none absolute z-10 overflow-hidden"
          style={{ left: SIDEBAR_WIDTH, top: HEADER_HEIGHT, width: canvasWidthPx, height: groups.length * LINE_HEIGHT }}
        >
          {gaps.map((gap, i) => {
            const startMs = toMs(gap.fromYear);
            const endMs = toMs(gap.toYear);
            const { left, width } = bandPercent(startMs, endMs, visibleRange.start, visibleRange.end);
            if (width <= 0) return null;
            return (
              <div
                key={i}
                className="absolute top-0 flex h-full items-center justify-center border-x-2 border-dashed border-amber-500/60 bg-amber-500/10"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${gap.label} (${gap.fromYear}–${gap.toYear})`}
              >
                <span className="rotate-90 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  {gap.label}
                </span>
              </div>
            );
          })}
        </div>

        <Timeline
          ref={timelineRef as never}
          groups={groups}
          items={items}
          keys={TIMELINE_KEYS}
          visibleTimeStart={visibleRange.start}
          visibleTimeEnd={visibleRange.end}
          onTimeChange={(start, end, updateScrollCanvas) => {
            setVisibleRange({ start, end });
            updateScrollCanvas(start, end);
          }}
          onItemMove={handleItemMove}
          onItemClick={handleItemClick}
          onItemDoubleClick={handleItemDoubleClick}
          onCanvasClick={handleCanvasClick}
          itemRenderer={({ item, itemContext, getItemProps }) => {
            const ev = eventById.get(String(item.id));
            const color = colorForEventType(ev?.eventType ?? null);
            // getItemProps computes and owns the outer wrapper's top/height (its row-stacking
            // math) — any top/height passed in here gets silently overwritten back to its own
            // value. Importance-driven sizing has to live on an inner div instead, which the
            // library never touches.
            const scale = heightForImportance(ev?.importance ?? null);
            const dimmed = typeFilter.length > 0 && !(ev?.eventType && typeFilter.includes(ev.eventType));
            const { key, ...itemProps } = getItemProps({
              style: { backgroundColor: "transparent", border: "none" },
            });
            return (
              <div key={key} {...itemProps}>
                <div
                  className="rct-item-content flex items-center"
                  style={{
                    maxWidth: itemContext.dimensions.width, height: `${scale * 100}%`, margin: "auto 0",
                    backgroundColor: color, borderColor: color, borderRadius: 4, color: "var(--color-primary-foreground)",
                    opacity: dimmed ? 0.25 : 1,
                  }}
                >
                  {itemContext.title}
                </div>
              </div>
            );
          }}
          canMove
          canResize={false}
          canChangeGroup
          stackItems
          lineHeight={LINE_HEIGHT}
          itemHeightRatio={1}
          sidebarWidth={SIDEBAR_WIDTH}
          rightSidebarWidth={0}
          minZoom={minZoom}
          maxZoom={maxZoom}
          timeSteps={TIME_STEPS}
        >
          <TimelineHeaders>
            <DateHeader
              unit="primaryHeader"
              height={PRIMARY_HEADER_HEIGHT}
              intervalRenderer={(props) => {
                if (!props) return null;
                const { key, ...intervalProps } = props.getIntervalProps();
                const startYear = Math.round(toYear(props.intervalContext.interval.startTime.valueOf()));
                const endYear = Math.round(toYear(props.intervalContext.interval.endTime.valueOf()));
                return (
                  <div key={key} {...intervalProps} className="rct-dateHeader rct-dateHeader-primary">
                    {`Year ${startYear}–${endYear}`}
                  </div>
                );
              }}
            />
            <DateHeader
              unit="year"
              height={YEAR_HEADER_HEIGHT}
              labelFormat={([start]) => `Year ${Math.round(toYear(start.valueOf()))}`}
              intervalRenderer={(props) => {
                if (!props) return null;
                const { key, ...intervalProps } = props.getIntervalProps();
                return (
                  <div key={key} {...intervalProps} className="rct-dateHeader">
                    {props.intervalContext.intervalText}
                  </div>
                );
              }}
            />
          </TimelineHeaders>
        </Timeline>
      </div>

      <div style={{ marginLeft: SIDEBAR_WIDTH }}>
        <TimelineMinimap
          totalStart={totalStart}
          totalEnd={totalEnd}
          visibleStart={visibleRange.start}
          visibleEnd={visibleRange.end}
          tickPositions={tickPositions}
          onNavigate={goToRange}
        />
      </div>
    </div>
  );
}
