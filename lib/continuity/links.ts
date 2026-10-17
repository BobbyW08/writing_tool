import { entityTypeByDbType } from "@/lib/data/entity-types";

export function entityHref(dbType: string, slug: string): string {
  const type = entityTypeByDbType(dbType);
  return type ? `/${type.urlSlug}/${slug}` : "/";
}

export function shortDate(value: Date | string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
