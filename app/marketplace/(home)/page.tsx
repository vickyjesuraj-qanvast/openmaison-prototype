import type { Metadata } from 'next'
import { fetchMarketplace } from '@/lib/marketplace/queries'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'
import { MarketplaceHome } from '@/components/marketplace/marketplace-home'

/** (pending modules S24 — card studio:marketplace) The rail's Marketplace: Qanvast's partner brands and their deals (1.0's /marketplace). */
export const metadata: Metadata = { title: 'Marketplace' }
export const dynamic = 'force-dynamic'

export default async function MarketplacePage() {
  if (await refusesPath('/marketplace')) return <AccessGate section="Marketplace" />
  const data = await fetchMarketplace()
  return <MarketplaceHome data={data} />
}
