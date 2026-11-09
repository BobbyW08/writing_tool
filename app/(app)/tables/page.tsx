import Link from "next/link";
import { getTablesList } from "@/lib/world/queries";
import { NewTableForm } from "@/components/new-table-form";

export default async function TablesPage() {
  const { docs } = await getTablesList();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tables</h1>
        <p className="text-sm text-muted-foreground">
          Interactive tables for things like a magic system's tiers or a ruler list. A cell can hold an ID code, which renders as a link.
        </p>
      </div>

      <NewTableForm />

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tables yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {(docs as { id: number; code: string; name: string }[]).map((t) => (
            <li key={t.id}>
              <Link href={`/tables/${t.code}`} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                <span className="text-sm">{t.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
