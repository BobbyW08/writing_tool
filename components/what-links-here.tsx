import Link from "next/link";
import { getLinksForCode, type LinkEntry } from "@/lib/graph/queries";
import { hrefForNode } from "@/lib/graph/href";

const SOURCE_ORDER = ["relationship", "field", "parent", "text", "pin"] as const;
const SOURCE_LABEL: Record<string, string> = {
  relationship: "Relationships",
  field: "Fields",
  parent: "Part of / has part",
  text: "Mentions",
  pin: "Map pins",
};

// Every live connection touching a record, read from the link index (lib/graph/queries.ts).
// `sources` narrows to a subset of SOURCE_ORDER (the entry page's tabs use this to split
// "Mentions" from writing out from the rest, without a second query).
export async function WhatLinksHere({ code, sources, heading, emptyText }: { code: string; sources?: string[]; heading?: string; emptyText?: string }) {
  const all = await getLinksForCode(code);
  const entries = sources ? all.filter((e) => sources.includes(e.edge.source)) : all;
  const title = heading ?? "What links here";

  if (entries.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        <p className="text-sm italic text-muted-foreground">{emptyText ?? "Nothing links here yet."}</p>
      </section>
    );
  }

  const bySource = new Map<string, LinkEntry[]>();
  for (const entry of entries) {
    const list = bySource.get(entry.edge.source) ?? [];
    list.push(entry);
    bySource.set(entry.edge.source, list);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="space-y-4">
        {SOURCE_ORDER.filter((s) => bySource.has(s)).map((source) => (
          <div key={source} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {SOURCE_LABEL[source] ?? source}
            </p>
            <ul className="divide-y rounded-md border">
              {bySource.get(source)!.map((entry) => (
                <li key={entry.edge.id}>
                  <Link
                    href={hrefForNode(entry.other.collection, entry.other.code)}
                    className="flex items-center justify-between gap-2 p-2.5 hover:bg-accent"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.other.color }}
                      />
                      {entry.other.name}
                      <span className="font-mono text-xs text-muted-foreground">{entry.other.code}</span>
                      {entry.other.unk && (
                        <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                          UNK
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{entry.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
