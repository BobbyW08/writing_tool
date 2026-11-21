"use client";

import { useState } from "react";

export type EntryTab = { id: string; label: string; content: React.ReactNode };

// Step UX6 (board 9): the title and badges sit on their own row (the page itself), and this is the
// separate toolbar row below it -- tabs on the left, the page's own action row (RecordActions,
// passed as `actions`) on the right. Switching tabs only changes which already-fetched content
// shows; nothing here re-fetches or re-renders the server page.
export function EntryTabs({ tabs, actions }: { tabs: EntryTab[]; actions: React.ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
        <div className="flex gap-5 text-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={
                active === t.id
                  ? "border-b-2 border-primary pb-2 font-semibold"
                  : "pb-2 text-muted-foreground hover:text-foreground"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        {actions}
      </div>

      {tabs.map((t) => (
        <div key={t.id} className={t.id === active ? "space-y-8" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
