// How the old app's entity types land in the new collections during the one-time migration.
// "artifact" and "item" merge into Items. "culture" gets its own Cultures collection.

export const LEGACY_TYPE_MAP: Record<string, { collection: string; preset?: Record<string, unknown> }> = {
  character: { collection: 'characters' },
  location: { collection: 'locations' },
  item: { collection: 'items' },
  artifact: { collection: 'items', preset: { itemType: 'artifact' } },
  culture: { collection: 'cultures' },
  race: { collection: 'races' },
  language: { collection: 'languages' },
}
