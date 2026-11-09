import Link from "next/link";
import { getStoriesList, isUnk } from "@/lib/world/queries";
import { STORY_ERAS, STORY_STAGES, STORY_STAGE_LABELS } from "@/lib/stories";

type Story = {
  id: number;
  code?: string | null;
  name: string;
  stage?: string | null;
  era?: string | null;
  floating?: boolean | null;
  tagIds?: number[] | null;
};

const NONE = "__none__";

function cardsFor(list: Story[], stage: string): Story[] {
  return list.filter((s) => (stage === NONE ? !s.stage : s.stage === stage));
}

function StoryCard({ s }: { s: Story }) {
  return (
    <Link
      href={`/stories/${s.code ?? s.id}`}
      className="block rounded-md border bg-background p-2 text-xs hover:bg-accent"
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">{s.code}</span>
        {isUnk(s.tagIds ?? null) && (
          <span className="rounded bg-amber-100 px-1 text-[9px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
            UNK
          </span>
        )}
      </div>
      <p className="mt-0.5 font-medium leading-snug">{s.name}</p>
    </Link>
  );
}

// Stories grouped by era and stage (traveler-wiki-build-plan.md's "Story board"), floating
// stories (no fixed place on the timeline yet) in their own lane above the era grid.
export default async function StoryBoardPage() {
  const { docs } = await getStoriesList();
  const stories = docs as Story[];

  const floating = stories.filter((s) => s.floating);
  const placed = stories.filter((s) => !s.floating);

  const hasUnstaged = stories.some((s) => !s.stage);
  const stageCols = [...STORY_STAGES.map((s) => s.value), ...(hasUnstaged ? [NONE] : [])];

  const hasNoEra = placed.some((s) => !s.era);
  const eraRows = [...STORY_ERAS.map((e) => ({ value: e.value, label: e.label })), ...(hasNoEra ? [{ value: NONE, label: "No era set" }] : [])];

  const gridCols = `160px repeat(${stageCols.length}, minmax(180px, 1fr))`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Story board</h1>
        <p className="text-sm text-muted-foreground">Stories grouped by era and stage. Floating stories have no fixed place yet.</p>
      </div>

      {floating.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Floating ({floating.length})</h2>
          <div className="grid gap-2" style={{ gridTemplateColumns: gridCols }}>
            <div />
            {stageCols.map((stage) => (
              <p key={stage} className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {stage === NONE ? "No stage" : STORY_STAGE_LABELS[stage]}
              </p>
            ))}
            <div />
            {stageCols.map((stage) => {
              const cards = cardsFor(floating, stage);
              return (
                <div key={stage} className="min-h-12 space-y-1.5 rounded-md border border-dashed bg-muted/10 p-1.5">
                  {cards.map((s) => <StoryCard key={s.id} s={s} />)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="grid gap-2" style={{ gridTemplateColumns: gridCols }}>
          <div />
          {stageCols.map((stage) => (
            <p key={stage} className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {stage === NONE ? "No stage" : STORY_STAGE_LABELS[stage]}
            </p>
          ))}

          {eraRows.map((era) => {
            const eraStories = placed.filter((s) => (era.value === NONE ? !s.era : s.era === era.value));
            return (
              <div key={era.value} className="contents">
                <p className="flex items-center px-1 text-xs font-semibold text-muted-foreground">{era.label}</p>
                {stageCols.map((stage) => {
                  const cards = cardsFor(eraStories, stage);
                  return (
                    <div key={stage} className="min-h-14 space-y-1.5 rounded-md border bg-muted/5 p-1.5">
                      {cards.map((s) => <StoryCard key={s.id} s={s} />)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
