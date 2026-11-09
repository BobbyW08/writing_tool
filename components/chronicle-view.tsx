"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapCanvas, type MapData } from "@/components/map-canvas";

export type ChronicleEvent = {
  id: number;
  code: string;
  name: string;
  startYear: number;
  eventType: string | null;
  importance: string | null;
  pins: { id: number; code: string; name: string; mapId: number }[];
};

export type ChronicleEra = {
  id: number;
  code: string;
  name: string;
  startYear: number | null;
  endYear: number | null;
  color: string | null;
};

export type ChronicleMapPeriod = {
  mapId: number;
  fromYear: number | null;
  toYear: number | null;
  isDefault: boolean;
  map: { code: string; name: string } | null;
};

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
  return (eventType && EVENT_TYPE_COLOR[eventType]) || "#6b7280";
}

function sizeForImportance(importance: string | null): number {
  if (importance === "important") return 14;
  if (importance === "minor") return 7;
  return 10;
}

export function ChronicleView({
  events, eras, mapPeriods, maps, startYear, endYear,
}: {
  events: ChronicleEvent[];
  eras: ChronicleEra[];
  mapPeriods: ChronicleMapPeriod[];
  maps: MapData[];
  startYear: number | null;
  endYear: number | null;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(events[0]?.id ?? null);

  const domain = useMemo(() => {
    const years = [
      ...events.map(e => e.startYear),
      ...eras.flatMap(e => [e.startYear, e.endYear]).filter((y): y is number => y != null),
      ...(startYear != null ? [startYear] : []),
      ...(endYear != null ? [endYear] : []),
    ];
    if (years.length === 0) return { min: 0, max: 100 };
    const min = startYear ?? Math.min(...years);
    const max = endYear ?? Math.max(...years);
    const pad = Math.max(1, Math.round((max - min) * 0.05));
    return { min: min - pad, max: max + pad };
  }, [events, eras, startYear, endYear]);

  function posPct(year: number): number {
    const span = domain.max - domain.min;
    if (span <= 0) return 0;
    return ((year - domain.min) / span) * 100;
  }

  const selected = events.find(e => e.id === selectedId) ?? null;

  const activeMap = useMemo(() => {
    if (!selected) return null;
    const pin = selected.pins[0] ?? null;
    if (pin) {
      const map = maps.find(m => m.id === pin.mapId);
      if (map) return { map, pinCode: pin.code };
    }
    // No pin on this event — fall back to the mapPeriod covering its year, preferring isDefault.
    const candidates = mapPeriods.filter(p =>
      (p.fromYear == null || selected.startYear >= p.fromYear) &&
      (p.toYear == null || selected.startYear <= p.toYear)
    );
    const period = candidates.find(p => p.isDefault) ?? candidates[0] ?? mapPeriods.find(p => p.isDefault) ?? null;
    if (!period) return null;
    const map = maps.find(m => m.id === period.mapId);
    return map ? { map, pinCode: null } : null;
  }, [selected, maps, mapPeriods]);

  return (
    <div className="space-y-4">
      <div className="relative h-20 rounded-md border bg-card px-2 pt-2">
        {eras.map(era => {
          if (era.startYear == null || era.endYear == null) return null;
          const left = posPct(era.startYear);
          const width = posPct(era.endYear) - left;
          return (
            <div
              key={era.id}
              title={era.name}
              className="absolute top-0 h-5 overflow-hidden text-ellipsis whitespace-nowrap rounded-sm px-1 text-[10px] font-medium text-white/90"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%`, background: era.color ?? "#64748b" }}
            >
              {era.name}
            </div>
          );
        })}
        <div className="absolute inset-x-2 top-10 h-px bg-border" />
        {events.map(event => (
          <button
            key={event.id}
            title={`${event.name} (Year ${event.startYear})`}
            onClick={() => setSelectedId(event.id)}
            className="absolute top-9 -translate-x-1/2 rounded-full border-2 border-background"
            style={{
              left: `${posPct(event.startYear)}%`,
              width: sizeForImportance(event.importance),
              height: sizeForImportance(event.importance),
              background: colorForEventType(event.eventType),
              outline: selectedId === event.id ? "2px solid var(--color-primary)" : undefined,
              outlineOffset: 2,
            }}
          />
        ))}
      </div>

      {selected && (
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/events/${selected.code}`} className="font-medium text-blue-600 hover:underline">
            {selected.name}
          </Link>
          <span className="text-xs text-muted-foreground">Year {selected.startYear}</span>
          {selected.pins.length === 0 && (
            <span className="text-xs text-muted-foreground italic">No pin set — showing the period's default map, if any</span>
          )}
        </div>
      )}

      {activeMap ? (
        <MapCanvas map={activeMap.map} editable={false} focusPinCode={activeMap.pinCode} />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-md border text-sm text-muted-foreground">
          {selected ? "No map for this event or period." : "Select an event to show its map."}
        </div>
      )}
    </div>
  );
}
