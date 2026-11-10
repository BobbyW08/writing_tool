import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same behavior, new file and
// export name) -- see node_modules/next/dist/docs/.../proxy.md. This is the single password gate
// for the whole app (CLAUDE.md hard rule 12).
const PUBLIC_PATHS = ['/login', '/api/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const session = request.cookies.get('session')?.value
  const expected = process.env.APP_SECRET

  if (!expected || session !== expected) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
