import Link from "next/link";
import { Suspense } from "react";
import { ENTITY_TYPES } from "@/lib/data/entity-types";
import { ContinuityBadge } from "@/components/continuity-badge";

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
        <Link href="/write" className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          Writing
        </Link>
        <Link href="/snippets" className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          Snippets
        </Link>
        <Link href="/continuity" className="flex items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          Continuity
          <Suspense fallback={null}>
            <ContinuityBadge />
          </Suspense>
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
