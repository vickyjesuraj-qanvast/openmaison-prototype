import type { Metadata } from 'next'
import { readFrom } from '@/lib/nav'
import { fetchXrayData } from '@/lib/xray/queries'
import { XrayWorkspace } from '@/components/xray/xray-workspace'

/** Tools › Quote X-Ray (REG-529): compare a studio quote with another studio's — the setup page. */
export const metadata: Metadata = { title: 'Quote X-Ray' }
export const dynamic = 'force-dynamic'

export default async function XrayPage({ searchParams }: { searchParams: Promise<{ lead?: string; quote?: string; from?: string }> }) {
  const sp = await searchParams
  const data = await fetchXrayData()
  return <XrayWorkspace data={data} leadId={typeof sp.lead === 'string' ? sp.lead : null} quoteId={typeof sp.quote === 'string' ? sp.quote : null} from={readFrom(sp.from)} />
}
