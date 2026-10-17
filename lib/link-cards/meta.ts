import 'server-only'
import type { Metadata } from 'next'
import { CARD_SIZE, cardPath, type LinkCard, type LinkCardKind } from './model'
import { linkCard } from './queries'
import { requestOrigin } from './origin'

/**
 * (pending modules S02) A client link's page tags: the tab's title with the studio's name (absolute — the app's "· OpenMaison" template never
 * reaches a client), never indexed, and the chat's preview — the studio as the site's name, the bold line, the grey line and the card's
 * picture at an absolute address on the origin the link was opened on.
 */
export async function linkMetadata(kind: LinkCardKind, key: string, path: string, o: { card?: LinkCard; pageTitle?: string } = {}): Promise<Metadata> {
  const [card, base] = await Promise.all([o.card ? Promise.resolve(o.card) : linkCard(kind, key), requestOrigin()])
  const image = { url: cardPath(kind, key), ...CARD_SIZE, alt: `${card.title} — ${card.studio}` }
  return {
    metadataBase: base,
    title: { absolute: o.pageTitle ?? card.pageTitle },
    description: card.description,
    robots: { index: false, follow: false },
    openGraph: { type: 'website', title: card.headline, description: card.description, url: path, siteName: card.studio, images: [image] },
    twitter: { card: 'summary_large_image', title: card.headline, description: card.description, images: [image.url] },
  }
}
