import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PortalNotice } from '@/components/portal/portal-notice'
import { PortalSignIn } from '@/components/portal/portal-sign-in'
import { portalPath, safeNext } from '@/lib/portal/model'
import { portalGate } from '@/lib/portal/session'
import { linkMetadata } from '@/lib/link-cards/meta'
import { unknownPortalMeta } from '@/lib/portal/meta'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  /* (pending modules S02) every portal address a client is sent lands here until they sign in — so the studio's card is the portal's, whatever
     page the link names; the tab stays "Sign in · {studio}" */
  const { slug } = await params
  return (await unknownPortalMeta(slug)) ?? linkMetadata('portal', slug, `/my/${slug}/login`)   // (pending modules S13) an address no studio holds: the notice's own tab
}

/** (Projects round 4a, board 5) Signing in at the studio's address — an old address redirects here on the new one; a paused portal says so. */
export default async function PortalLoginPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ next?: string | string[] }> }) {
  const { slug } = await params
  const q = await searchParams
  /* (fix-F, F-20) the page the client asked for before signing in — a path on this address only */
  const next = safeNext(slug, typeof q.next === 'string' ? q.next : null)
  const gate = await portalGate(slug, 'login')
  if (gate.kind === 'missing') return <PortalNotice look={null} kind="missing" />
  if (gate.kind === 'redirect') redirect(gate.to)
  if (gate.kind === 'paused') return <PortalNotice look={gate.look} kind="paused" />
  if (gate.kind === 'in') redirect(next ?? portalPath(slug))
  return <PortalSignIn look={gate.look} slug={slug} next={next} />
}
