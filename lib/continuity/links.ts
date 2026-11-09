// The continuity check's EntityDbType values are the world collection slugs themselves
// (characters, locations, ...), which are also the route segments — no indirection needed.
export function entityHref(collection: string, slug: string): string {
  return `/${collection}/${slug}`;
}

export function shortDate(value: Date | string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
