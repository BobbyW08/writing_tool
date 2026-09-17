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
import { updateEventSortOrderAction } from "@/lib/actions/events";
import { ITEM_WIDTH_YEARS, msToSortOrder, sortOrderToMs } from "@/lib/timeline-scale";

export interface TimelineEventInput {
  id: string;
  title: string;
  slug: string | null;
  yearLabel: string | null;
  sortOrder: number;
  parentEventId: string | null;
}

const GROUP: TimelineGroupBase = { id: "timeline", title: "" };

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

export default function TimelineView({ events }: { events: TimelineEventInput[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<TimelineItemBase<number>[]>(() =>
    events.map((e) => ({
      id: e.id,
      group: GROUP.id,
      title: e.title,
      start_time: sortOrderToMs(e.sortOrder),
      end_time: sortOrderToMs(e.sortOrder + ITEM_WIDTH_YEARS),
      canResize: false,
      canMove: true,
    })),
  );

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

  const [visibleRange, setVisibleRange] = useState(() => ({
    start: sortOrderToMs(DEFAULT_START),
    end: sortOrderToMs(DEFAULT_END),
  }));
  // react-calendar-timeline only reads visibleTimeStart/End props once, at mount — they
  // aren't reactive after that. Programmatic zoom (click-to-zoom, reset view) has to call
  // the instance's own updateScrollCanvas method directly. The library's public ref type
  // doesn't expose it, but the underlying class instance has it — cast around the narrow
  // type rather than not zooming at all.
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

  function handleItemMove(itemId: string | number, dragTime: number) {
    const id = String(itemId);
    const newSortOrder = msToSortOrder(dragTime);
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, start_time: sortOrderToMs(newSortOrder), end_time: sortOrderToMs(newSortOrder + ITEM_WIDTH_YEARS) } : it,
      ),
    );

    const ev = eventById.get(id);
    updateEventSortOrderAction(id, newSortOrder).catch(() => {
      toast.error(`Couldn't save the new position for "${ev?.title ?? id}".`);
    });

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
      <div ref={containerRef} className="rounded-md border">
        <Timeline
          ref={timelineRef as never}
          groups={[GROUP]}
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
          canMove
          canResize={false}
          canChangeGroup={false}
          stackItems
          lineHeight={44}
          itemHeightRatio={0.8}
          sidebarWidth={0}
          rightSidebarWidth={0}
          minZoom={minZoom}
          maxZoom={maxZoom}
          timeSteps={TIME_STEPS}
        >
          <TimelineHeaders>
            <DateHeader
              unit="year"
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
