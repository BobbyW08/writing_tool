import Link from "next/link";
import { getCollectionList, getTagsList, isUnk } from "@/lib/world/queries";
import { STORY_ERA_LABELS, STORY_STAGE_LABELS } from "@/lib/stories";
import { CollectionViewSwitch } from "@/components/collection-view-switch";
import { listViewConfigFor } from "@/lib/world/listViews";
import type { TableRow } from "@/components/collection-table-view";

export default async function StoriesPage() {
  const { docs } = await getCollectionList('stories');
  const allTags = await getTagsList();
  type Story = {
    id: number;
    code?: string | null;
    name: string;
    stage?: string | null;
    era?: string | null;
    startYear?: number | null;
    yearLabel?: string | null;
    floating?: boolean | null;
    tagIds?: number[] | null;
    tags?: { id: number; name: string }[];
  };
  const typedDocs = docs as unknown as Story[];
  const config = listViewConfigFor('stories');
  const rows: TableRow[] = typedDocs.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    stage: s.stage,
    era: s.era,
    floating: s.floating,
    tagIds: s.tagIds ?? [],
    tags: s.tags ?? [],
  }));

  const listView = (
    <div className="divide-y rounded-md border">
      {typedDocs.map(s => (
        <Link key={s.id} href={`/stories/${s.code ?? s.id}`} className="flex items-center gap-3 p-3 hover:bg-accent">
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{s.code}</span>
          <span className="flex-1 text-sm font-medium">{s.name}</span>
          {isUnk(s.tagIds ?? null) && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
              UNK
            </span>
          )}
          {s.era && <span className="shrink-0 text-xs text-muted-foreground">{STORY_ERA_LABELS[s.era] ?? s.era}</span>}
          {s.stage && (
            <span className="shrink-0 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
              {STORY_STAGE_LABELS[s.stage] ?? s.stage}
            </span>
          )}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stories</h1>
        <Link href="/stories/new" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
          + New
        </Link>
      </div>

      <CollectionViewSwitch collection="stories" listView={listView} rows={rows} config={config} allTags={allTags} />
    </div>
  );
}
