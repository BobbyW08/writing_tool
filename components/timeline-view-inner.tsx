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
import { ZoomOut } from "lucide-react";
import { updateEventYearAction, updateEventLaneAction } from "@/lib/world/actions";
import { ITEM_WIDTH_YEARS, msToSortOrder, sortOrderToMs } from "@/lib/timeline-scale";

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
const HEADER_HEIGHT = 30;
const SIDEBAR_WIDTH = 72;

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
}: {
  events: TimelineEventInput[];
  eras: TimelineEraInput[];
  focusEraCode?: string | null;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

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
      start_time: sortOrderToMs(e.sortOrder),
      end_time: sortOrderToMs(e.sortOrder + ITEM_WIDTH_YEARS),
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
        start_time: sortOrderToMs(e.sortOrder),
        end_time: sortOrderToMs(e.sortOrder + ITEM_WIDTH_YEARS),
        canResize: false,
        canMove: true,
      })),
    );
  }, [events]);

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
        start: sortOrderToMs(focusEra.startYear - padding),
        end: sortOrderToMs((focusEra.endYear ?? focusEra.startYear) + padding),
      };
    }
    return { start: sortOrderToMs(DEFAULT_START), end: sortOrderToMs(DEFAULT_END) };
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

  function handleItemMove(itemId: string | number, dragTime: number, newGroupOrder: number) {
    const id = String(itemId);
    const newSortOrder = msToSortOrder(dragTime);
    const newLane = groups[newGroupOrder]?.id as number | undefined;
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              start_time: sortOrderToMs(newSortOrder),
              end_time: sortOrderToMs(newSortOrder + ITEM_WIDTH_YEARS),
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
    if (!ev) return;
    const children = childrenByParent.get(ev.id) ?? [];
    const sortOrders = [ev.sortOrder, ...children.map((c) => c.sortOrder)];
    const min = Math.min(...sortOrders);
    const max = Math.max(...sortOrders);
    const padding = Math.max((max - min) * 0.2, 3);
    goToRange(sortOrderToMs(min - padding), sortOrderToMs(max + ITEM_WIDTH_YEARS + padding));
  }

  function handleItemDoubleClick(itemId: string | number) {
    const ev = eventById.get(String(itemId));
    if (ev?.slug) router.push(`/events/${ev.slug}`);
  }

  // Click empty space to add an event at that year and lane.
  function handleCanvasClick(groupId: string | number, time: number) {
    const year = msToSortOrder(time);
    router.push(`/events/new?startYear=${year}&lane=${groupId}`);
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => goToRange(sortOrderToMs(DEFAULT_START), sortOrderToMs(DEFAULT_END))}
      >
        <ZoomOut className="size-4" /> Reset view
      </Button>
      <div ref={containerRef} className="relative rounded-md border">
        {/* Era bands: positioned behind the timeline's own rows/grid (those sit at z-index 30-88). */}
        <div
          className="pointer-events-none absolute z-0 overflow-hidden"
          style={{ left: SIDEBAR_WIDTH, top: HEADER_HEIGHT, width: canvasWidthPx, height: groups.length * LINE_HEIGHT }}
        >
          {eras.map((era) => {
            if (era.startYear == null) return null;
            const startMs = sortOrderToMs(era.startYear);
            const endMs = sortOrderToMs(era.endYear ?? era.startYear + 1);
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
            const { key, ...itemProps } = getItemProps({
              style: { backgroundColor: "transparent", border: "none" },
            });
            return (
              <div key={key} {...itemProps}>
                <div
                  className="rct-item-content flex items-center"
                  style={{ maxWidth: itemContext.dimensions.width, height: `${scale * 100}%`, margin: "auto 0", backgroundColor: color, borderColor: color, borderRadius: 4, color: "var(--color-primary-foreground)" }}
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
              unit="year"
              height={HEADER_HEIGHT}
              labelFormat={([start]) => `Year ${msToSortOrder(start.valueOf())}`}
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
    </div>
  );
}
