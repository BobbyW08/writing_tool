import Link from "next/link";
import { getCompilationsList } from "@/lib/world/queries";
import { NewCompilationForm } from "@/components/new-compilation-form";
import { GenerateAgeCompilationsButton } from "@/components/generate-age-compilations-button";

const KIND_LABELS: Record<string, string> = { age: "Age", chapter: "Chapter", custom: "Custom" };

export default async function CompilationsPage() {
  const { docs } = await getCompilationsList();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compilations</h1>
        <p className="text-sm text-muted-foreground">
          An ordered set of events and entries, typed as an age, a chapter, or custom. Export each one as a single combined Markdown file.
        </p>
      </div>

      <NewCompilationForm />
      <GenerateAgeCompilationsButton />

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No compilations yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {(docs as { id: number; code: string; name: string; kind: string; items: unknown }[]).map((c) => (
            <li key={c.id}>
              <Link href={`/compilations/${c.code}`} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                <span className="text-sm">{c.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{KIND_LABELS[c.kind] ?? c.kind}</span>
                <span className="text-xs text-muted-foreground">
                  {Array.isArray(c.items) ? c.items.length : 0} item{Array.isArray(c.items) && c.items.length === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
