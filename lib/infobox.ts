// Fixed fields that always appear in the infobox for each collection.
// These are shown even when blank (as "—") so the structure is predictable.
// They come from the collection configs — no invented fields.

export type InfoboxFieldDef = { label: string; field: string }

export const INFOBOX_FIELDS: Record<string, InfoboxFieldDef[]> = {
  characters: [
    { label: 'Role', field: 'role' },
    { label: 'Status', field: 'status' },
    { label: 'Born', field: 'birthYear' },
    { label: 'Died', field: 'deathYear' },
    { label: 'Birthplace', field: 'birthplace' },
    { label: 'Race', field: 'race' },
    { label: 'Culture', field: 'culture' },
  ],
  locations: [
    { label: 'Kind', field: 'kind' },
    { label: 'Status', field: 'status' },
    { label: 'Culture', field: 'culture' },
  ],
  items: [
    { label: 'Type', field: 'itemType' },
    { label: 'Status', field: 'status' },
    { label: 'Created', field: 'createdYear' },
    { label: 'Current owner', field: 'currentOwner' },
    { label: 'Current location', field: 'currentLocation' },
  ],
  cultures: [
    { label: 'Status', field: 'status' },
    { label: 'Emerged', field: 'foundedYear' },
    { label: 'Ended', field: 'endedYear' },
  ],
  factions: [
    { label: 'Kind', field: 'kind' },
    { label: 'Status', field: 'status' },
    { label: 'Culture', field: 'culture' },
    { label: 'Founded', field: 'foundedYear' },
    { label: 'Ended', field: 'endedYear' },
  ],
  races: [
    { label: 'Status', field: 'status' },
  ],
  languages: [
    { label: 'Status', field: 'status' },
  ],
  lore: [
    { label: 'Category', field: 'category' },
    { label: 'Status', field: 'status' },
  ],
  events: [
    { label: 'Year', field: 'startYear' },
    { label: 'End year', field: 'endYear' },
    { label: 'Year label', field: 'yearLabel' },
    { label: 'Location', field: 'location' },
  ],
  stories: [
    { label: 'Stage', field: 'stage' },
    { label: 'Format', field: 'format' },
    { label: 'Era', field: 'era' },
    { label: 'Starts', field: 'startYear' },
    { label: 'Ends', field: 'endYear' },
  ],
}
