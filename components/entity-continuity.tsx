import Link from "next/link";
import { listEntityHistory, listOpenFlagsForEntity } from "@/lib/data/continuity";
import { KIND_LABELS } from "@/lib/continuity/constants";
import { shortDate } from "@/lib/continuity/links";
import { Badge } from "@/components/ui/badge";

const ACTION_LABELS: Record<string, string> = {
  created: "Created from snippet",
  added: "Added from snippet",
  updated: "Updated by decision",
  both_true: "Kept alongside original",
  changed_over_time: "Recorded as a change over time",
  undone: "Undone",
};

function clip(text: string | null, max = 160): string {
  if (!text) return "(blank)";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

// Shows what still needs a decision on this entry, and where every continuity change to it
// came from.
export async function EntityContinuity({ entityId }: { entityId: string }) {
  const [flags, history] = await Promise.all([listOpenFlagsForEntity(entityId), listEntityHistory(entityId)]);
  if (flags.length === 0 && history.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">Continuity</h2>
      {flags.length > 0 && (
        <ul className="space-y-1">
          {flags.map((f) => (
            <li key={f.id}>
              <Link href={`/continuity/${f.id}`} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                <Badge variant="outline" className={f.kind === "conflict" || f.kind === "possible_change" ? "border-red-500 text-red-700 dark:text-red-400" : "border-amber-500 text-amber-700 dark:text-amber-400"}>
                  {KIND_LABELS[f.kind]}
                </Badge>
                <span>
                  {f.fieldLabel} <span className="text-muted-foreground">from {f.snippetTitle}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <details className="rounded-md border px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Field history ({history.length})</summary>
          <ul className="mt-3 space-y-3">
            {history.map((h) => (
              <li key={h.id}>
                <div>
                  <span className="font-medium">{h.fieldLabel}</span>{" "}
                  <span className="text-muted-foreground">
                    {ACTION_LABELS[h.action] ?? h.action} · {shortDate(h.createdAt)}
                    {h.snippetId && h.snippetTitle && (
                      <>
                        {" · "}
                        <Link href={`/snippets/${h.snippetId}`} className="hover:underline">
                          {h.snippetTitle}
                        </Link>
                      </>
                    )}
                  </span>
                </div>
                {h.oldValue !== null && <p className="text-muted-foreground">Before: {clip(h.oldValue)}</p>}
                <p className="text-muted-foreground">After: {clip(h.newValue)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
