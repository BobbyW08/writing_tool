"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Timeline, { type TimelineItemBase, type TimelineGroupBase } from "react-calendar-timeline";
import "react-calendar-timeline/dist/style.css";
import "./timeline-view.css";
import { toast } from "sonner";
import { updateEventSortOrderAction } from "@/lib/actions/events";
import { ITEM_WIDTH_YEARS, msToSortOrder, sortOrderToMs } from "@/lib/timeline-scale";

export interface TimelineEventInput {
  id: string;
  title: string;
  slug: string | null;
  yearLabel: string | null;
  sortOrder: number;
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

// Our fake "years" are the only meaningful unit — bias the ruler toward year-level
// ticks instead of the library's default day/hour granularity, which produced
// thousands of DOM nodes at this zoom level (a real performance problem, not cosmetic).
const TIME_STEPS = { second: 3600, minute: 3600, hour: 24, day: 30, month: 12, year: 1 };

export default function TimelineView({ events }: { events: TimelineEventInput[] }) {
  const router = useRouter();
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

  const defaultTimeStart = useMemo(() => sortOrderToMs(-5), []);
  const defaultTimeEnd = useMemo(() => sortOrderToMs(65), []);
  const minZoom = useMemo(() => sortOrderToMs(20) - sortOrderToMs(0), []); // don't zoom in past ~20 "years"
  const maxZoom = useMemo(() => sortOrderToMs(2200) - sortOrderToMs(-100), []); // full range

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

  function handleItemClick(itemId: string | number) {
    const ev = eventById.get(String(itemId));
    if (ev?.slug) router.push(`/events/${ev.slug}`);
  }

  return (
    <div className="rounded-md border">
      <Timeline
        groups={[GROUP]}
        items={items}
        keys={TIMELINE_KEYS}
        defaultTimeStart={defaultTimeStart}
        defaultTimeEnd={defaultTimeEnd}
        onItemMove={handleItemMove}
        onItemClick={handleItemClick}
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
      />
    </div>
  );
}
