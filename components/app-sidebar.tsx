import Link from "next/link";
import { ENTITY_TYPES } from "@/lib/data/entity-types";

export function AppSidebar() {
  return (
    <nav className="w-56 shrink-0 border-r p-4">
      <Link href="/" className="mb-6 block text-lg font-semibold">
        The Traveler
      </Link>
      <div className="space-y-1">
        <Link href="/timeline" className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          Timeline
        </Link>
        <Link href="/events" className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          Events
        </Link>
        {ENTITY_TYPES.map((t) => (
          <Link key={t.urlSlug} href={`/${t.urlSlug}`} className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent">
            {t.pluralLabel}
          </Link>
        ))}
      </div>
    </nav>
  );
}
