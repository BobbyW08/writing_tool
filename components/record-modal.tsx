'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Step U5: the popup wrapper for a record read page, used by the intercepted @modal/(.)view
// route. Renders the exact same read-page components as the real page (see view-dispatch.tsx) --
// this is just the chrome around them. Closing goes through router.back() so browser back/forward
// and the @modal slot's own state stay in sync, per Next's documented intercepting-routes pattern.
export function RecordModal({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') router.back()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [router])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={() => router.back()}
    >
      <div
        className="flex h-[85vh] w-[80vw] max-w-5xl flex-col overflow-hidden rounded-lg border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <Link href={href} className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">
            Open full page
          </Link>
          <button type="button" onClick={() => router.back()} className="rounded px-2 py-1 text-sm hover:bg-accent">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}
