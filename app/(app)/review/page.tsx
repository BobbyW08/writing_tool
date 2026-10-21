import Link from "next/link";
import { getUnkRecords } from "@/lib/world/queries";

const COLLECTION_LABELS: Record<string, string> = {
  characters: "Characters",
  locations: "Locations",
  items: "Items",
  cultures: "Cultures",
  factions: "Factions",
  races: "Races",
  languages: "Languages",
  lore: "Lore",
  events: "Events",
  stories: "Stories",
  writing: "Writing",
  relationships: "Relationships",
};

function collectionHref(collection: string, code: string) {
  if (collection === "events") return `/events/${code}`;
  if (collection === "stories") return `/stories/${code}`;
  if (collection === "relationships") return `/admin/collections/relationships`;
  if (collection === "writing") return `/write`;
  return `/${collection}/${code}`;
}

export default async function ReviewPage() {
  const groups = await getUnkRecords();
  const total = groups.reduce((sum, g) => sum + g.totalDocs, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0 ? "Nothing to review." : `${total} record${total === 1 ? "" : "s"} tagged UNK across ${groups.length} collection${groups.length === 1 ? "" : "s"}.`}
          {" "}Clear the UNK tag on a record once you have confirmed it.
        </p>
      </div>

      {groups.map(({ collection, docs }) => (
        <section key={collection}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {COLLECTION_LABELS[collection] ?? collection} ({docs.length})
          </h2>
          <ul className="divide-y rounded-md border">
            {(docs as { id: number; code?: string | null; name?: string | null; title?: string | null; reviewNote?: string | null }[]).map(doc => {
              const code = doc.code ?? String(doc.id);
              const name = doc.name ?? doc.title ?? code;
              return (
                <li key={doc.id} className="p-3">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{code}</span>
                    <Link href={collectionHref(collection, code)} className="text-sm font-medium hover:underline">
                      {name}
                    </Link>
                  </div>
                  {doc.reviewNote && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{doc.reviewNote}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
