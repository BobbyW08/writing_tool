import Link from "next/link";
import { listSnippets } from "@/lib/data/snippets";
import { shortDate } from "@/lib/continuity/links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function SnippetsPage() {
  const rows = await listSnippets();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Snippets</h1>
          <p className="text-sm text-muted-foreground">Write a scene or chapter here and it is checked against canon. Every snippet either confirms the lore or adds to it.</p>
        </div>
        <Button asChild>
          <Link href="/snippets/new">New snippet</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No snippets yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => (
            <li key={s.id}>
              <Link href={`/snippets/${s.id}`} className="flex items-center justify-between gap-3 rounded-md border px-4 py-3 hover:bg-accent">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[s.label, shortDate(s.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {s.openDecisions > 0 && (
                    <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">
                      {s.openDecisions} to decide
                    </Badge>
                  )}
                  {s.checkStatus === "checking" && <Badge variant="outline">Checking</Badge>}
                  {s.checkStatus === "failed" && <Badge variant="outline">Check failed</Badge>}
                  {s.checkStatus === "unchecked" && <Badge variant="outline">Not checked</Badge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
