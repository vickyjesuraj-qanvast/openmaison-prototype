import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { fetchShare, shareMeta, type PublicShare } from '@/lib/visualizer/queries'
import { fetchBrand } from '@/lib/templates/queries'
import { siteConfig } from '@/lib/config'
import { RenderLinkClosed, RenderSharePage } from '@/components/visualizer/share/render-share-page'
import { RenderShareSkeleton } from '@/components/visualizer/skeletons'
import { PageReveal } from '@/components/shell/page-reveal'

export const dynamic = 'force-dynamic'

/** The origin the link was opened on — a WhatsApp preview needs absolute addresses, wherever the prototype is served. */
async function origin(): Promise<URL> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? (host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https')
  try { return new URL(host ? `${proto}://${host}` : siteConfig.url) } catch { return new URL(siteConfig.url) }
}

/**
 * (audit 2026-09-26, critic §2) What WhatsApp unfurls when the studio pastes the link: the studio's name, a line on what is inside and
 * from whom, and the first design's picture — the picture only while the link opens, so a stopped or ended link previews as words alone.
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const [meta, base] = await Promise.all([shareMeta(token), origin()])
  const title = meta?.title ?? 'Design ideas'
  const studio = title.replace(/^Design ideas · /, '')
  /* (round 1) a closed link's preview asks the studio by name, as the page's notice does — never "your designer" */
  const description = meta?.open ? meta.description ?? undefined : `This link is no longer active — ask ${meta ? studio : 'the studio'} for an updated one.`
  const images = meta?.open && meta.image ? [{ url: meta.image, alt: meta.description ?? title }] : undefined
  return {
    metadataBase: base,
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: { type: 'website', title, description, url: `/renders/${encodeURIComponent(token)}`, siteName: studio, images },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, images: images?.map((i) => i.url) },
  }
}

/** A client with no lead behind them — stored under the studio's fallback name; on their own page they are "You". */
const you = (name: string) => (name === 'Your client' || name === 'Client' ? 'You' : name)
/**
 * (round 1) What reaches the client's browser, checked here on the server so it is never in the page's payload — fetchShare reads it so
 * already, and this holds it whatever feeds the page: (D1) only the threads the client started, with the studio's replies in them — the
 * team's own pins stay internal; and no "Note" line (an older link's frozen list) — the studio's typed instruction to the engine is not a
 * finish. A client with no lead reads their own name as "You".
 */
function forClient(data: PublicShare): PublicShare {
  return {
    ...data,
    pins: data.pins.filter((p) => p.authorRole === 'client').map((p) => ({ ...p, authorName: you(p.authorName), comments: p.comments.map((c) => (c.authorRole === 'client' ? { ...c, authorName: you(c.authorName) } : c)) })),
    versions: data.versions.map((v) => ({ ...v, materials: v.materials.filter((m) => m.label !== 'Note') })),
  }
}

/**
 * The link a client opens from WhatsApp (REG-676, Q-14): the renders the studio picked; an ended or stopped link says so, in the sender's
 * name (F112). (F111) A link that was never made — mangled in a copy, a token of the wrong shape — gets the same house notice, never a
 * bare 404. (F094 · F199) The page never counts a view while it renders: the client's browser stamps it once per visit.
 */
export default async function RenderSharePageRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await fetchShare(token)
  const page = await (async () => {
    if (!data) {
      const brand = await fetchBrand()
      return <RenderLinkClosed state="gone" expiresAt={null} sender={null} studio={{ name: brand.details.name, logo: brand.kit.logo, accent: brand.kit.colors.accent, phone: brand.details.phone, email: brand.details.email }} />
    }
    if (data.state !== 'open') return <RenderLinkClosed state={data.state} expiresAt={data.expiresAt} sender={data.sender} studio={data.studio} />
    return <RenderSharePage data={forClient(data)} />
  })()
  /* (F167) the loading ghost holds its beat and crossfades to the page, as on every page in the shell */
  return <PageReveal skeleton={<RenderShareSkeleton />}>{page}</PageReveal>
}
