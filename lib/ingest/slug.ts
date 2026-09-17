export function slugify(name: string): string {
  // Headers like "SERO — THE TRAVELER" are referenced in [[wiki-links]] by their
  // short form ("Sero") elsewhere in the docs — drop an em-dash subtitle before
  // slugifying so both the entity's own slug and inbound link targets agree.
  const withoutSubtitle = name.split(" — ")[0];
  return withoutSubtitle
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
