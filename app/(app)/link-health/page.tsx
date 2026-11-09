import Link from "next/link";
import { getBrokenLinks, getOrphanCodes, codeStillExists } from "@/lib/graph/queries";
import type { Edge } from "@/lib/graph/types";

const COLLECTION_LABELS: Record<string, string> = {
  characters: "Characters",
  locations: "Locations",
  items: "Items",
  cultures: "Cultures",
  factions: "Factions",
  races: "Races",
  languages: "Languages",
  lore: "Lore",
  events: "Events",
  stories: "Stories",
  writing: "Writing",
};

function collectionHref(collection: string, code: string) {
  if (collection === "events") return `/events/${code}`;
  if (collection === "stories") return `/stories/${code}`;
  if (collection === "writing") return `/write/${code}`;
  return `/${collection}/${code}`;
}

async function annotateBroken(edges: Edge[]) {
  const codes = new Set<string>();
  for (const e of edges) { codes.add(e.from); codes.add(e.to); }
  const existence = new Map<string, boolean>();
  await Promise.all([...codes].map(async (c) => existence.set(c, await codeStillExists(c))));
  return edges.map((e) => ({
    edge: e,
    fromExists: existence.get(e.from) ?? false,
    toExists: existence.get(e.to) ?? false,
  }));
}

export default async function LinkHealthPage() {
  const [brokenRaw, orphans] = await Promise.all([getBrokenLinks(), getOrphanCodes()]);
  const broken = await annotateBroken(brokenRaw);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Link health</h1>
        <p className="text-sm text-muted-foreground">
          {broken.length === 0 ? "No broken connections." : `${broken.length} broken connection${broken.length === 1 ? "" : "s"}.`}
          {" "}
          {orphans.length === 0 ? "No orphaned records." : `${orphans.length} record${orphans.length === 1 ? "" : "s"} with no connections.`}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Broken connections ({broken.length})</h2>
        {broken.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Nothing broken.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {broken.map(({ edge, fromExists, toExists }) => (
              <li key={edge.id} className="flex items-center gap-2 p-2.5 text-sm">
                <span className={`font-mono text-xs ${fromExists ? "" : "text-destructive line-through"}`}>
                  {edge.from}
                </span>
                <span className="text-xs text-muted-foreground">{edge.label}</span>
                <span className={`font-mono text-xs ${toExists ? "" : "text-destructive line-through"}`}>
                  {edge.to}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {edge.source} · owned by {edge.ownerCode}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Orphaned records ({orphans.length})</h2>
        {orphans.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Everything is connected to something.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {orphans.map((o) => (
              <li key={o.code}>
                <Link href={collectionHref(o.collection, o.code)} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                  <span className="font-mono text-xs text-muted-foreground">{o.code}</span>
                  <span className="text-sm">{o.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{COLLECTION_LABELS[o.collection] ?? o.collection}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
