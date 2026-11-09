import Link from "next/link";
import { getGapRecords } from "@/lib/world/queries";
import { EditableField } from "@/components/editable-field";

const COLLECTION_LABELS: Record<string, string> = {
  characters: "Characters",
  locations: "Locations",
  events: "Events",
  items: "Items",
  factions: "Factions",
  cultures: "Cultures",
  races: "Races",
  languages: "Languages",
  lore: "Lore",
  stories: "Stories",
  eras: "Eras",
  maps: "Maps",
  "map-pins": "Map pins",
  chronicles: "Chronicles",
  boards: "Boards",
  tables: "Tables",
};

const STATUS_OPTIONS = [
  { label: "Locked (canon)", value: "locked" },
  { label: "In development", value: "in_development" },
  { label: "Needs a name", value: "needs_name" },
  { label: "Placeholder (still to decide)", value: "placeholder" },
];

const STATUS_LABELS: Record<string, string> = {
  in_development: "In development",
  needs_name: "Needs a name",
  placeholder: "Placeholder",
};

function collectionHref(collection: string, code: string) {
  if (collection === "events") return `/events/${code}`;
  if (collection === "stories") return `/stories/${code}`;
  return `/${collection}/${code}`;
}

type GapDoc = { id: number; code?: string | null; name?: string | null; status: string; gapPrompt: string | null };

export default async function GapsPage() {
  const groups = await getGapRecords();
  const total = groups.reduce((sum, g) => sum + g.totalDocs, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Gaps</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No open gaps. Every entry is locked."
            : `${total} entr${total === 1 ? "y" : "ies"} not yet locked, across ${groups.length} collection${groups.length === 1 ? "" : "s"}.`}
          {" "}Resolve a gap by filling in its prompt and locking the entry once it is settled.
        </p>
      </div>

      {groups.map(({ collection, docs }) => (
        <section key={collection}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {COLLECTION_LABELS[collection] ?? collection} ({docs.length})
          </h2>
          <ul className="divide-y rounded-md border">
            {(docs as unknown as GapDoc[]).map((doc) => {
              const code = doc.code ?? String(doc.id);
              const name = doc.name ?? code;
              return (
                <li key={doc.id} className="space-y-1.5 p-3">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{code}</span>
                    <Link href={collectionHref(collection, code)} className="text-sm font-medium hover:underline">
                      {name}
                    </Link>
                    <span className="ml-auto shrink-0">
                      <EditableField
                        collection={collection}
                        docId={doc.id}
                        fieldName="status"
                        value={doc.status}
                        kind="select"
                        options={STATUS_OPTIONS}
                        className="text-xs"
                      />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{STATUS_LABELS[doc.status] ?? doc.status}</p>
                  <EditableField
                    collection={collection}
                    docId={doc.id}
                    fieldName="gapPrompt"
                    value={doc.gapPrompt}
                    kind="textarea"
                    placeholder="What still needs deciding?"
                    className="text-sm"
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
