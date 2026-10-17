import 'server-only'
import type { Metadata } from 'next'
import { splitPortalSlug } from './model'
import { fetchPortalLook, resolvePortalSlug } from './queries'

/*
 * (pending modules S13 — S02's note: "a second studio would need the slug's own notice") A portal page's browser tab. At this studio's address
 * (or an old one) it reads "{what} · {studio}"; at an address no studio here holds, the page is the notice "This address doesn’t open a portal"
 * and the tab says the same — never this studio's name over someone else's address. Never indexed.
 */
export const NO_PORTAL = 'This address doesn’t open a portal'
const robots = { index: false, follow: false } as const

/** The neutral tab for an address no studio holds — or null when the address is this studio's. */
export async function unknownPortalMeta(slug: string): Promise<Metadata | null> {
  return (await resolvePortalSlug(splitPortalSlug(slug).slug)) ? null : { title: { absolute: NO_PORTAL }, robots }
}

/** "{what} · {studio}" (the studio alone when `what` is null), or the neutral tab. */
export async function portalTitle(params: Promise<{ slug: string }>, what: string | null): Promise<Metadata> {
  const { slug } = await params
  const [unknown, look] = await Promise.all([unknownPortalMeta(slug), fetchPortalLook()])
  return unknown ?? { title: { absolute: what ? `${what} · ${look.studio}` : look.studio }, robots }
}
