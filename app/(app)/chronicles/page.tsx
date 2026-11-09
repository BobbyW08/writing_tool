import Link from "next/link";
import { getChroniclesList } from "@/lib/world/queries";
import { NewChronicleForm } from "@/components/new-chronicle-form";

export default async function ChroniclesPage() {
  const { docs } = await getChroniclesList();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Chronicles</h1>
        <p className="text-sm text-muted-foreground">
          A timeline strip paired with a map. Selecting an event zooms the map to where it happened.
        </p>
      </div>

      <NewChronicleForm />

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No chronicles yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {(docs as { id: number; code: string; name: string; startYear: number | null; endYear: number | null }[]).map((c) => (
            <li key={c.id}>
              <Link href={`/chronicles/${c.code}`} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                <span className="text-sm">{c.name}</span>
                {(c.startYear != null || c.endYear != null) && (
                  <span className="text-xs text-muted-foreground">
                    (Year {c.startYear ?? "?"} to {c.endYear ?? "?"})
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
