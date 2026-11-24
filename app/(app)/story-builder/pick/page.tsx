import Link from "next/link";
import { getStoryPickerList, getAllStoryStats } from "@/lib/story-builder/queries";
import { StoryBuilderNewForm } from "@/components/story-builder-new-form";

// Step UX3, board 3: "New story" or "pick one you already have." Distinct from /stories (the full
// world-collection browser, kept as-is for the world tree and table/board views). Moved here from
// the bare /story-builder route in step SB2, once that route became the actual canvas (board 5) --
// the per-story actions screen's "Stories" breadcrumb (app/(app)/story-builder/[code]/page.tsx) is
// what reaches this page now.
export default async function StoryBuilderPickerPage() {
  const [stories, stats] = await Promise.all([getStoryPickerList(), getAllStoryStats()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Stories</h1>

      <div className="flex flex-wrap gap-5">
        <StoryBuilderNewForm />

        <section className="flex flex-1 min-w-[320px] flex-col gap-2.5 rounded-lg border p-5">
          <div className="text-lg font-semibold">Or pick one you already have</div>
          {stories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stories yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stories.map((s) => {
                const stat = stats.get(s.id);
                return (
                  <Link
                    key={s.id}
                    href={`/story-builder/${s.code}`}
                    className="flex items-center justify-between gap-4 rounded-md border px-3.5 py-3 text-sm hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {(stat?.wordCount ?? 0).toLocaleString()} words written, {stat?.beatCount ?? 0} beats
                      </div>
                    </div>
                    <span className="shrink-0 text-sm text-blue-500">Choose</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
