import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { NameSearch } from "@/components/name-search";
import { WorldTree } from "@/components/world-tree";
import { MainNav } from "@/components/main-nav";
import { getWorldTreeNodes } from "@/lib/world/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Traveler",
  description: "Story wiki and timeline for The Traveler",
};

export default async function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const treeNodes = await getWorldTreeNodes();

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          {/* Nav panel */}
          <nav className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r bg-background px-2 py-3">
            <Link href="/" className="px-1 text-sm font-semibold tracking-wide">
              The Traveler
            </Link>

            <div>
              <NameSearch />
            </div>

            <Link
              href="/story-builder"
              className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
            >
              Story Builder
            </Link>

            <MainNav />
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
