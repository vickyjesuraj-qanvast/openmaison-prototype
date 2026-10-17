import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SECURE, PATH_HEADER, REMEMBER_DAYS, SEEN_COOKIE, SEEN_DAYS, SESSION_COOKIE, SIGN_IN_PATH, SIGN_UP_PATH, STUDIO_VISIT_COOKIE, cookieState, isPublicPath, safeStudioNext, signInHref } from '@/lib/auth/paths'
import { oldQueryTarget } from '@/lib/links/old-addresses'
import { devPreviewsOpen } from '@/lib/services/dev-previews'

/*
 * (pending modules S30 — her "build all of them" 2026-10-11; card onboarding:studio-sign-in; 1.0's src/proxy.ts) Before any studio route runs:
 * a browser whose cookies say it is signed out goes to sign-in (a page) or is refused (a file, a picture, a save — 401), the address it asked
 * for riding along so sign-in brings it back. The client links (the portal, signing, quotes, invoices…) and sign-in itself are open to anyone,
 * each with its own permission (lib/auth/paths.ts `PUBLIC_PATHS`). A remembered session's cookie renews on every page (1.0's sliding 30 days).
 * Cookies only — what only the record knows (a session ended elsewhere, a member deactivated) is the shell's check (lib/auth/session.ts).
 */
export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  /* (pending modules S41b-2) an address 1.0 printed whose landing only its query can place — `/leads?leadId=` in every notification, a
     project's `?tab=management&milestone=`, `/accounts?tab=`, `/inbox?…` — goes to its 2.0 home first (pure rules, lib/links/old-addresses.ts;
     the fixed old addresses are next.config.ts's, the record lookups small routes). The page it lands on keeps its own permission, and a
     signed-out visit then goes to sign-in from there, carrying the 2.0 address. */
  if (req.method === 'GET' || req.method === 'HEAD') {
    const old = oldQueryTarget(pathname, searchParams)
    if (old) return NextResponse.redirect(new URL(old, req.url))
  }
  /* (S42 D-19 — REG-2079's gate, before routing) the developers' AI bench, while shut, is answered as an address that doesn't exist: the
     layout's notFound() came after the route had matched, so its 404 still carried the bench's segments in the page's data */
  if ((pathname === '/dev/ai-bench' || pathname.startsWith('/dev/ai-bench/')) && !devPreviewsOpen()) return NextResponse.rewrite(new URL('/_shut', req.url))
  /* the address as the person asked for it — never the router's own cache-buster (`_rsc`) */
  const q = new URLSearchParams(searchParams); q.delete('_rsc')
  const search = q.size ? `?${q.toString()}` : ''
  const raw = req.cookies.get(SESSION_COOKIE)?.value
  const state = cookieState(raw, req.cookies.get(SEEN_COOKIE)?.value)
  const page = (req.method === 'GET' || req.method === 'HEAD') && !req.headers.has('next-action')
    && (req.headers.has('rsc') || (req.headers.get('accept') ?? '').includes('text/html'))
  if ((state.kind === 'out' || state.kind === 'none') && !isPublicPath(pathname, searchParams.has('t'))) {
    if (page) return NextResponse.redirect(new URL(signInHref({ next: `${pathname}${search}`, reason: state.kind === 'out' && state.reason === 'ended' ? 'ended' : null }), req.url))
    return NextResponse.json({ error: 'Sign in again to carry on' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  /* already signed in (1.0's "already-signed-in guard"): sign-in is never shown — straight to the page asked for, else home (the front door
     picks it by role). With a reason the page decides: what only the record knows (a session that ended, an account deactivated) shows there,
     and the Qanvast line's "session expired" asks to sign in again over a live session (1.0's escape). */
  /* (pending modules S31) …and so is signing up: someone signed in already has a studio — signing up is for a browser that signed out */
  if ((pathname === SIGN_IN_PATH || pathname === SIGN_UP_PATH) && page && (state.kind === 'standing' || state.kind === 'session') && !searchParams.has('reason')) {
    return NextResponse.redirect(new URL(safeStudioNext(searchParams.get('next')) ?? '/', req.url))
  }
  const headers = new Headers(req.headers)
  headers.set(PATH_HEADER, `${pathname}${search}`)
  const res = NextResponse.next({ request: { headers } })
  if (state.kind === 'session' && state.remember && page && raw) res.cookies.set(SESSION_COOKIE, raw, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: REMEMBER_DAYS * 86_400, secure: COOKIE_SECURE })
  /* (S42 B-02) a studio page marks this browser as the studio's: a client link it opens later never stamps "Viewed" as the client */
  if (page && (state.kind === 'standing' || state.kind === 'session') && !isPublicPath(pathname, searchParams.has('t')) && req.cookies.get(STUDIO_VISIT_COOKIE)?.value !== '1')
    res.cookies.set(STUDIO_VISIT_COOKIE, '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: SEEN_DAYS * 86_400, secure: COOKIE_SECURE })
  return res
}

export const config = {
  /* every route but Next's own files and the public folder's (a path ending in a file's extension: fonts, pictures, the pdf.js worker) */
  matcher: ['/((?!_next/static|_next/image|.*\\.[A-Za-z0-9]{2,5}$).*)'],
}
