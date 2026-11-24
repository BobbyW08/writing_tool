"use client";

import type { ShelfCollection, ShelfEntry } from "@/lib/world/queries";

export const SHELF_DRAG_TYPE = "application/x-traveler-shelf-entry";

const GROUPS: { collection: ShelfCollection; label: string }[] = [
  { collection: "characters", label: "Characters" },
  { collection: "stories", label: "Stories" },
  { collection: "locations", label: "Locations" },
  { collection: "events", label: "Events" },
  { collection: "items", label: "Items" },
  { collection: "lore", label: "Lore" },
];

// Board 5's right-hand "Drag onto canvas" shelf: every entry not yet on the canvas, grouped by type
// with a count. Dragging one onto the canvas places that real entry as its own box (it does not
// create a beat). Entries already on the canvas leave the shelf, and dropping one twice is refused
// in the canvas itself.
export function StoryBuilderShelf({ entries }: { entries: ShelfEntry[] }) {
  return (
    <aside className="absolute right-3 top-14 z-20 max-h-[calc(100%-5rem)] w-52 overflow-y-auto rounded-md border-2 border-neutral-800 bg-white p-3 text-xs text-neutral-900 shadow-sm">
      <div className="mb-2 text-sm font-bold">Drag onto canvas</div>
      {GROUPS.map(({ collection, label }) => {
        const items = entries.filter((e) => e.collection === collection);
        return (
          <details key={collection} className="mb-1.5 rounded border border-neutral-800">
            <summary className="cursor-pointer select-none px-2 py-1.5">
              {label} ({items.length})
            </summary>
            <ul className="max-h-48 overflow-y-auto border-t border-neutral-300">
              {items.length === 0 && <li className="px-2 py-1.5 text-neutral-500">Nothing left to place</li>}
              {items.map((e) => (
                <li
                  key={e.code}
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData(SHELF_DRAG_TYPE, e.code);
                    ev.dataTransfer.effectAllowed = "copy";
                  }}
                  className="cursor-grab truncate px-2 py-1 hover:bg-blue-50 active:cursor-grabbing"
                  title={e.name}
                >
                  {e.name}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </aside>
  );
}
