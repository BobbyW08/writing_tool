import Link from "next/link";
import { listDecisionLog, listOpenDecisions, listOpenUpdates, type FlagRow } from "@/lib/data/continuity";
import { acknowledgeAllUpdatesAction, acknowledgeFlagAction } from "@/lib/actions/continuity";
import { CHOICE_LABELS, KIND_LABELS } from "@/lib/continuity/constants";
import { entityHref, shortDate } from "@/lib/continuity/links";
import { UndoDetailButton } from "@/components/undo-detail-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tab = "decisions" | "updates" | "log";

export default async function ContinuityPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "updates" || rawTab === "log" ? rawTab : "decisions";

  const [decisions, updates, log] = await Promise.all([listOpenDecisions(), listOpenUpdates(), tab === "log" ? listDecisionLog() : Promise.resolve([] as FlagRow[])]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "decisions", label: "Needs your decision", count: decisions.length },
    { id: "updates", label: "Added to canon", count: updates.length },
    { id: "log", label: "Decision log" },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Continuity</h1>
        <p className="text-sm text-muted-foreground">What your writing confirmed, changed, or added. Conflicts wait here until you decide.</p>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.id === "decisions" ? "/continuity" : `/continuity?tab=${t.id}`}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm", tab === t.id ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{t.count}</span>}
          </Link>
        ))}
      </div>

      {tab === "decisions" &&
        (decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is waiting for a decision.</p>
        ) : (
          <ul className="space-y-2">
            {decisions.map((f) => (
              <li key={f.id}>
                <Link href={`/continuity/${f.id}`} className="block rounded-md border border-red-500/50 px-4 py-3 text-sm hover:bg-accent">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">
                      {KIND_LABELS[f.kind]}
                    </Badge>
                    <span className="font-medium">
                      {f.entityName}, {f.fieldLabel}
                    </span>
                    <span className="text-muted-foreground">from {f.snippetTitle}</span>
                  </div>
                  {f.explanation && <p className="mt-1 text-muted-foreground">{f.explanation}</p>}
                  <p className="mt-2 break-words">&ldquo;{f.newQuote}&rdquo;</p>
                </Link>
              </li>
            ))}
          </ul>
        ))}

      {tab === "updates" && (
        <div className="space-y-3">
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing new to look over.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">These were added to canon automatically, using your own words. Open an entry to edit it, or undo a detail.</p>
                <form action={acknowledgeAllUpdatesAction}>
                  <Button type="submit" size="sm" variant="outline">
                    Mark all as seen
                  </Button>
                </form>
              </div>
              <ul className="space-y-2">
                {updates.map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                          {KIND_LABELS[f.kind]}
                        </Badge>
                        <Link href={entityHref(f.entityType, f.entitySlug)} className="font-medium hover:underline">
                          {f.entityName}
                        </Link>
                        {f.kind === "new_detail" && <span className="text-muted-foreground">{f.fieldLabel}</span>}
                        <span className="text-muted-foreground">
                          from <Link href={`/snippets/${f.snippetId}`} className="hover:underline">{f.snippetTitle}</Link>
                        </span>
                      </div>
                      <p className="mt-1 break-words">&ldquo;{f.newQuote}&rdquo;</p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      {f.kind === "new_detail" && <UndoDetailButton flagId={f.id} />}
                      <form action={acknowledgeFlagAction.bind(null, f.id)}>
                        <Button type="submit" size="sm" variant="ghost">
                          Got it
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === "log" &&
        (log.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {log.map((f) => (
              <li key={f.id}>
                <Link href={`/continuity/${f.id}`} className="block rounded-md border px-4 py-3 text-sm hover:bg-accent">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{CHOICE_LABELS[f.choice ?? ""] ?? f.choice}</Badge>
                    <span className="font-medium">
                      {f.entityName}, {f.fieldLabel}
                    </span>
                    <span className="text-muted-foreground">
                      {shortDate(f.resolvedAt)} · {f.snippetTitle}
                    </span>
                  </div>
                  {f.reason && <p className="mt-1 text-muted-foreground">{f.reason}</p>}
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
