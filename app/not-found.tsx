import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { AppShell } from '@/components/shell/app-shell'
import { PageNotFound } from '@/components/shell/page-not-found'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PATH_HEADER, isPublicPath } from '@/lib/auth/paths'
import { backLabel, notFoundSection, readFrom } from '@/lib/nav'
import { railBadges } from '@/lib/leads/tasks'
import { portalGate } from '@/lib/portal/session'
import { portalPath } from '@/lib/portal/model'
import { fetchPortalLook } from '@/lib/portal/queries'
import { CLIENT_PAGE_METADATA } from '@/lib/links/client-page'

/* one answer for every frame: a neutral title, and — as a client's page might be the one asked for — no OpenMaison mark (lib/links/client-page.ts) */
export const metadata: Metadata = { title: { absolute: 'Page not found' }, robots: { index: false }, ...CLIENT_PAGE_METADATA }

/** The page that linked here — the address's own `?from=` (REG-465: a link from a list carries it), else the referring page when it is one of
    this app's and not this address itself — the way back's address. */
async function cameFrom(path: string | null): Promise<string | null> {
  const from = readFrom(new URLSearchParams((path ?? '').split('?')[1] ?? '').get('from'))
  if (from) return from
  const h = await headers()
  const ref = h.get('referer')
  if (!ref) return null
  try {
    const u = new URL(ref)
    if (u.host !== h.get('host')) return null
    const back = `${u.pathname}${u.search}`
    return back === path || u.pathname === (path ?? '').split('?')[0] ? null : back
  } catch { return null }
}

/**
 * (pending modules S41b-2 — her "nothing left behind" 2026-10-12; the S41b pages sweep's M2; 1.0's src/app/not-found.tsx) The app-wide "page
 * not found": every address no route answers, and every `notFound()` no closer not-found page catches — on the house pieces, never Next's bare
 * page, and with its 404 status (Next answers an address no route matches with 404 and noindex). Which frame is the address's:
 *   · a studio address — the shell (the rail, the bell, ⌘K), the part of OpenMaison it named, and one way on: back to the page that linked
 *     here, else the Dashboard. Signed out, the shell itself sends the visit to sign-in (proxy.ts does before it, from the cookies alone);
 *   · a client's address (lib/auth/paths.ts `PUBLIC_PATHS`) — a client never sees the studio's shell: the portal's notice, in the studio's
 *     look on a portal address (`/my/<address>/…`, with the way back to their page), else the calm notice with no studio named;
 *   · an address the proxy never saw (a file's, `/favicon.ico`) — the calm notice: nothing is read for it.
 */
export default async function NotFound() {
  const path = (await headers()).get(PATH_HEADER)
  const pathname = (path ?? '').split('?')[0] ?? ''
  if (!path) return <PortalNotice look={null} kind="not-found" />
  const back = await cameFrom(path)
  if (isPublicPath(pathname)) {
    const seg = pathname.split('/').filter(Boolean)
    if (seg[0] === 'my' && seg[1] && !['login', 'projects', 'engagement'].includes(seg[1])) {
      const gate = await portalGate(decodeURIComponent(seg[1]))
      if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
      if (gate.kind === 'redirect') return <PortalNotice look={await fetchPortalLook()} kind="gone" back={{ href: gate.to, label: 'Back to your page' }} />   // an old or re-cased address: its page is at the current one
      if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
      return <PortalNotice look={gate.look} kind="gone" back={{ href: portalPath(gate.slug), label: 'Back to your page' }} />
    }
    return <PortalNotice look={null} kind="not-found" back={back ? { href: back, label: 'Go back' } : undefined} />
  }
  const way = back ? { label: backLabel(back, { fallback: 'Back to where you were' }), href: back } : { label: 'Go to the Dashboard', href: '/dashboard' }
  return (
    <AppShell railBadges={await railBadges()} ungated>
      <PageNotFound section={notFoundSection(pathname)} way={way} />   {/* (S42 audit A-14) a header only where the address can be that part's */}
    </AppShell>
  )
}
