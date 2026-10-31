import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { readFrom } from '@/lib/nav'
import { fetchXrayData } from '@/lib/xray/queries'
import { XrayWorkspace } from '@/components/xray/xray-workspace'

/** Tools › Quote X-Ray (REG-529): compare a studio quote with another studio's — the setup page. */
export const metadata: Metadata = { title: 'Quote X-Ray' }
export const dynamic = 'force-dynamic'

export default async function XrayPage({ searchParams }: { searchParams: Promise<{ lead?: string; quote?: string; from?: string; /** (the close-out round 2026-10-31, C-08) opens Deleted comparisons */ deleted?: string }> }) {
  if (await refusesPath('/quote-x-ray')) return <AccessGate section="Quote X-Ray" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const sp = await searchParams
  const data = await fetchXrayData()
  return <XrayWorkspace data={data} leadId={typeof sp.lead === 'string' ? sp.lead : null} quoteId={typeof sp.quote === 'string' ? sp.quote : null} from={readFrom(sp.from)} openDeleted={sp.deleted === '1'} />
}
