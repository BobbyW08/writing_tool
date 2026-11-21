import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionList, getTagsList, isUnk } from "@/lib/world/queries";
import { StatusBadge } from "@/components/status-badge";
import { CollectionViewSwitch } from "@/components/collection-view-switch";
import { listViewConfigFor } from "@/lib/world/listViews";
import type { TableRow } from "@/components/collection-table-view";
import { GapRecommender } from "@/components/gap-recommender";

const WORLD_COLLECTIONS: Record<string, string> = {
  characters: "Characters",
  locations: "Locations",
  items: "Items",
  cultures: "Cultures",
  factions: "Factions",
  races: "Races",
  languages: "Languages",
  lore: "Lore",
};

export default async function CollectionListPage({ params }: { params: Promise<{ entityType: string }> }) {
  const { entityType } = await params;
  const label = WORLD_COLLECTIONS[entityType];
  if (!label) notFound();

  const { docs } = await getCollectionList(entityType);
  const allTags = await getTagsList();
  type Doc = { id: number; code?: string | null; name: string; status?: string | null; tagIds?: number[] | null; tags?: { id: number; name: string }[]; image?: { url?: string; sizes?: { thumbnail?: { url?: string } } } | null };
  const typedDocs = docs as unknown as Doc[];
  const config = listViewConfigFor(entityType);
  const rows: TableRow[] = typedDocs.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    status: d.status,
    tagIds: d.tagIds ?? [],
    tags: d.tags ?? [],
  }));

  const listView = (
    <>
      {typedDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {label.toLowerCase()} yet.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {typedDocs.map((doc) => (
            <Link
              key={doc.id}
              href={`/${entityType}/${doc.code ?? doc.id}`}
              className="flex items-center justify-between gap-4 p-3 hover:bg-accent"
            >
              <div className="flex items-center gap-2 min-w-0">
                {typeof doc.image === 'object' && doc.image && (doc.image.sizes?.thumbnail?.url ?? doc.image.url) && (
                  <img src={(doc.image.sizes?.thumbnail?.url ?? doc.image.url)!} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
                )}
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{doc.code}</span>
                <span className="truncate font-medium">{doc.name}</span>
                {isUnk(doc.tagIds ?? null) && (
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                    UNK
                  </span>
                )}
              </div>
              {doc.status && <StatusBadge status={doc.status} className="shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{label}</h1>
        <Link href={`/${entityType}/new`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
          + New
        </Link>
      </div>

      <GapRecommender collection={entityType} />

      <CollectionViewSwitch collection={entityType} listView={listView} rows={rows} config={config} allTags={allTags} />
    </div>
  );
}
