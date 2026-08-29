import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session'

/**
 * Route protection is INTENTIONALLY EMPTY.
 *
 * Which routes exist, and which of them require a session, must come from the
 * OpenMaison 2.0 mocks. Populate PROTECTED_PREFIXES as the real routes land.
 *
 * Note this is a redirect optimisation only — the authorisation boundary is
 * lib/auth/dal.ts, which re-checks membership on every request.
 */
const PROTECTED_PREFIXES: string[] = []

export default async function proxy(request: NextRequest) {
  if (PROTECTED_PREFIXES.length === 0) return NextResponse.next()

  const { pathname, search } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (!isProtected) return NextResponse.next()

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  if (session) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = `?next=${encodeURIComponent(pathname + search)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
