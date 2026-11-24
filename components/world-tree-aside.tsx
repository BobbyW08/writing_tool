"use client";

import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { WorldTree } from "@/components/world-tree";

// The whole Story Builder flow (picker, actions, canvas, review -- boards 1, 3, 4, 5, 6 of the
// approved wireframes) is drawn as nav + content only, with no middle tree column, consistently
// across every one of those boards. The canvas especially needs the width: it's meant to be an
// endless pan/zoom surface, not a panel squeezed next to a 280px-wide tree.
export function WorldTreeAside({ nodes }: { nodes: ComponentProps<typeof WorldTree>["nodes"] }) {
  const pathname = usePathname();
  if (pathname.startsWith("/story-builder")) return null;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-background px-2 py-3">
      <WorldTree nodes={nodes} />
    </aside>
  );
}
