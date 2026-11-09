import Link from "next/link";
import { getMapsList } from "@/lib/world/queries";
import { NewMapForm } from "@/components/new-map-form";

export default async function MapsPage() {
  const { docs } = await getMapsList();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Maps</h1>
        <p className="text-sm text-muted-foreground">
          An uploaded image made interactive: pan, zoom, pins, and shapes drawn on top of it.
        </p>
      </div>

      <NewMapForm />

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No maps yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {(docs as { id: number; code: string; name: string; kind: string }[]).map((m) => (
            <li key={m.id}>
              <Link href={`/maps/${m.code}`} className="flex items-center gap-2 p-2.5 hover:bg-accent">
                <span className="font-mono text-xs text-muted-foreground">{m.code}</span>
                <span className="text-sm">{m.name}</span>
                <span className="text-xs capitalize text-muted-foreground">({m.kind})</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
