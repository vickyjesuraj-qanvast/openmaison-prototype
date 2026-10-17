import type { Metadata } from 'next'
import { fetchPublicLayout } from '@/lib/planner/queries'
import { fetchBrand } from '@/lib/templates/queries'
import { RenderLinkClosed } from '@/components/visualizer/share/render-share-page'
import { LayoutSharePage } from '@/components/planner/viewer/layout-share-page'
import { LayoutViewerGhost } from '@/components/planner/planner-ghosts'
import { PageReveal } from '@/components/shell/page-reveal'
import { linkMetadata } from '@/lib/link-cards/meta'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  return linkMetadata('space', token, `/space/${token}`)   // (pending modules S02) the same words, with the studio's card
}

/**
 * (gaps build J, J-Q15) The 3D link a client opens from WhatsApp — no sign-in. A stopped link (the studio's Stop sharing, the layout or its
 * project deleted) or a token that was never made answers with the render link's own notice, in the studio's name. No expiry (J-Q14).
 */
export default async function LayoutSharePageRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await fetchPublicLayout(token)
  const page = await (async () => {
    if (!data) {
      const brand = await fetchBrand()
      return <RenderLinkClosed state="gone" expiresAt={null} sender={null} studio={{ name: brand.details.name, logo: brand.kit.logo, accent: brand.kit.colors.accent, phone: brand.details.phone, email: brand.details.email }} />
    }
    if (data.state !== 'open') return <RenderLinkClosed state="stopped" expiresAt={null} sender={data.sender} studio={data.studio} />
    return <LayoutSharePage data={data} />
  })()
  return <PageReveal skeleton={<LayoutViewerGhost />}>{page}</PageReveal>
}
