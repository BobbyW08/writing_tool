"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Step SB1 (board 1): the flattened left menu -- Story Builder, highlighted, then this fixed list.
// Matches the approved "Story Builder Wireframes" artifact's Main.dc.html exactly. Everything this
// list doesn't carry (Cultures, Factions, Races, Languages, Continuity, AI suggestions, Review (UNK),
// Gaps, Link health, Admin) keeps its route -- nothing was deleted -- it's just not pinned in the nav
// any more. World collections not listed here stay reachable from Home's "Also here" row.
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/characters", label: "Characters" },
  { href: "/locations", label: "Locations" },
  { href: "/events", label: "Events" },
  { href: "/stories", label: "Stories" },
  { href: "/items", label: "Items and Lore" },
  { href: "/timeline", label: "Master Timeline" },
  { href: "/compilations", label: "Manuscript" },
  { href: "/stories", label: "Ideas" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {NAV_ITEMS.map(({ href, label }, i) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={`${href}-${label}-${i}`}>
            <Link
              href={href}
              className={`block rounded-md px-3 py-2 ${active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
