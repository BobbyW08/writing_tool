import Link from "next/link";
import { getStoriesList, isUnk } from "@/lib/world/queries";

const ERA_LABELS: Record<string, string> = {
  era_one: "Era One",
  era_two: "Era Two",
  era_three: "Era Three",
  era_four: "Era Four",
  era_five: "Era Five",
  era_six: "Era Six",
  era_seven: "Era Seven",
};

const STAGE_LABELS: Record<string, string> = {
  idea: "Idea",
  outlined: "Outlined",
  drafting: "Drafting",
  written: "Written",
  shelved: "Shelved",
};

export default async function StoriesPage() {
  const { docs } = await getStoriesList();
  type Story = {
    id: number;
    code?: string | null;
    name: string;
    stage?: string | null;
    era?: string | null;
    startYear?: number | null;
    yearLabel?: string | null;
    tags?: (number | { id: number })[] | null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Stories</h1>
        <Link href="/stories/new" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
          + New
        </Link>
      </div>

      <div className="divide-y rounded-md border">
        {(docs as Story[]).map(s => (
          <Link key={s.id} href={`/stories/${s.code ?? s.id}`} className="flex items-center gap-3 p-3 hover:bg-accent">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{s.code}</span>
            <span className="flex-1 text-sm font-medium">{s.name}</span>
            {isUnk(s.tags) && (
              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                UNK
              </span>
            )}
            {s.era && <span className="shrink-0 text-xs text-muted-foreground">{ERA_LABELS[s.era] ?? s.era}</span>}
            {s.stage && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                {STAGE_LABELS[s.stage] ?? s.stage}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
