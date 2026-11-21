import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { NameSearch } from "@/components/name-search";
import { WorldTree } from "@/components/world-tree";
import { ContinuityBadge } from "@/components/continuity-badge";
import { getWorldTreeNodes } from "@/lib/world/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Traveler",
  description: "Story wiki and timeline for The Traveler",
};

const WORLD_NAV = [
  { href: "/characters", label: "Characters" },
  { href: "/locations", label: "Locations" },
  { href: "/items", label: "Items" },
  { href: "/cultures", label: "Cultures" },
  { href: "/factions", label: "Factions" },
  { href: "/races", label: "Races" },
  { href: "/languages", label: "Languages" },
  { href: "/lore", label: "Lore" },
];

const STORY_NAV = [
  { href: "/events", label: "Events" },
  { href: "/stories", label: "Stories" },
  { href: "/story-board", label: "Story board" },
  { href: "/timeline", label: "Timeline" },
  { href: "/node-map", label: "Node map" },
  { href: "/maps", label: "Maps" },
  { href: "/chronicles", label: "Chronicles" },
  { href: "/boards", label: "Boards" },
  { href: "/tables", label: "Tables" },
  { href: "/compilations", label: "Compilations" },
];

export default async function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const treeNodes = await getWorldTreeNodes();

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          {/* Nav panel */}
          <nav className="flex w-44 shrink-0 flex-col gap-3 overflow-y-auto border-r bg-background px-2 py-3">
            <Link href="/" className="px-1 text-sm font-semibold tracking-wide">
              The Traveler
            </Link>

            <div>
              <NameSearch />
            </div>

            <section>
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">World</p>
              <ul className="space-y-0.5">
                {WORLD_NAV.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="block rounded px-2 py-1 text-xs hover:bg-accent">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Story</p>
              <ul className="space-y-0.5">
                {STORY_NAV.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="block rounded px-2 py-1 text-xs hover:bg-accent">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tools</p>
              <ul className="space-y-0.5">
                <li>
                  <Link href="/write" className="block rounded px-2 py-1 text-xs hover:bg-accent">
                    Writing
                  </Link>
                </li>
                <li>
                  <Link href="/continuity" className="flex items-center rounded px-2 py-1 text-xs hover:bg-accent">
                    Continuity
                    <ContinuityBadge />
                  </Link>
                </li>
                <li>
                  <Link href="/ai-inbox" className="block rounded px-2 py-1 text-xs hover:bg-accent">
                    AI suggestions
                  </Link>
                </li>
                <li>
                  <Link href="/review" className="block rounded px-2 py-1 text-xs hover:bg-accent">
                    Review (UNK)
                  </Link>
                </li>
                <li>
                  <Link href="/gaps" className="block rounded px-2 py-1 text-xs hover:bg-accent">
                    Gaps
                  </Link>
                </li>
                <li>
                  <Link href="/link-health" className="block rounded px-2 py-1 text-xs hover:bg-accent">
                    Link health
                  </Link>
                </li>
              </ul>
            </section>

            <div className="mt-auto">
              <Link href="/admin" className="block rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
                Admin
              </Link>
            </div>
          </nav>

          {/* World tree panel */}
          <aside className="flex w-56 shrink-0 flex-col border-r bg-background px-2 py-3">
            <WorldTree nodes={treeNodes} />
          </aside>

          {/* Main canvas */}
          <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        {modal}
        <Toaster />
      </body>
    </html>
  );
}
