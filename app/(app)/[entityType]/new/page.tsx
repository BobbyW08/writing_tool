import Link from "next/link";
import { notFound } from "next/navigation";
import { NewEntityForm } from "@/components/new-entity-form";
import { COLLECTION_FIELDS } from "@/lib/world/fields";

const WORLD_COLLECTIONS: Record<string, { label: string; plural: string }> = {
  characters: { label: 'Character', plural: 'Characters' },
  locations: { label: 'Location', plural: 'Locations' },
  items: { label: 'Item', plural: 'Items' },
  cultures: { label: 'Culture', plural: 'Cultures' },
  factions: { label: 'Faction', plural: 'Factions' },
  races: { label: 'Race', plural: 'Races' },
  languages: { label: 'Language', plural: 'Languages' },
  lore: { label: 'Lore entry', plural: 'Lore' },
}

export default async function NewEntityPage({ params }: { params: Promise<{ entityType: string }> }) {
  const { entityType } = await params;
  const meta = WORLD_COLLECTIONS[entityType];
  if (!meta) notFound();

  const fields = COLLECTION_FIELDS[entityType] ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/${entityType}`} className="text-sm text-muted-foreground hover:underline">
          {meta.plural}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New {meta.label.toLowerCase()}</h1>
      </div>
      <NewEntityForm
        collection={entityType}
        fields={fields}
        redirectBase={`/${entityType}`}
      />
    </div>
  );
}
