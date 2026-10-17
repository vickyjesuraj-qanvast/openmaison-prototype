import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { fetchBrandPage } from '@/lib/marketplace/queries'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'
import { BrandPage } from '@/components/marketplace/brand-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ brandId: string }> }): Promise<Metadata> {
  const { brandId } = await params
  if (await refusesPath('/marketplace')) return { title: 'Marketplace' }
  const d = await fetchBrandPage(brandId)
  return { title: d ? `${d.brand.name} · Marketplace` : 'Marketplace' }
}

/** (pending modules S24 — 1.0's /marketplace/[id]) A brand's page; one the feed doesn't have (or withdrew) answers its own notice. */
export default async function BrandRoute({ params, searchParams }: { params: Promise<{ brandId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ brandId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath('/marketplace')) return <AccessGate section="Marketplace" />
  const data = await fetchBrandPage(brandId)
  if (!data) notFound()
  return <BrandPage data={data} from={readFrom(sp.from)} />
}
