export interface EntityTypeConfig {
  urlSlug: string; // used in routes, e.g. /characters
  dbType: string; // stored in entities.type
  label: string; // singular display label
  pluralLabel: string;
}

export const ENTITY_TYPES: EntityTypeConfig[] = [
  { urlSlug: "characters", dbType: "character", label: "Character", pluralLabel: "Characters" },
  { urlSlug: "locations", dbType: "location", label: "Location", pluralLabel: "Locations" },
  { urlSlug: "items", dbType: "item", label: "Item", pluralLabel: "Items" },
  { urlSlug: "cultures", dbType: "culture", label: "Culture", pluralLabel: "Cultures" },
  { urlSlug: "races", dbType: "race", label: "Race", pluralLabel: "Races" },
  { urlSlug: "languages", dbType: "language", label: "Language", pluralLabel: "Languages" },
  { urlSlug: "artifacts", dbType: "artifact", label: "Artifact", pluralLabel: "Artifacts" },
];

export function entityTypeByUrlSlug(urlSlug: string): EntityTypeConfig | undefined {
  return ENTITY_TYPES.find((t) => t.urlSlug === urlSlug);
}

export function entityTypeByDbType(dbType: string): EntityTypeConfig | undefined {
  return ENTITY_TYPES.find((t) => t.dbType === dbType);
}

export const STATUS_OPTIONS = ["locked", "in_development", "needs_name", "placeholder"] as const;
export type EntityStatus = (typeof STATUS_OPTIONS)[number];

export function statusLabel(status: string): string {
  switch (status) {
    case "locked":
      return "Locked";
    case "in_development":
      return "In development";
    case "needs_name":
      return "Needs a name";
    case "placeholder":
      return "Placeholder";
    default:
      return status;
  }
}
