import type { Metadata } from 'next'
import { PortalSetupView } from '@/components/company/portal/portal-setup-view'
import { fetchPortalSetup } from '@/lib/portal/queries'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Company · Client portal' }
export const dynamic = 'force-dynamic'

/** Company › Client portal › Set-up (Projects r4a, board 9): Getting it live, the address, Live or Paused, what a client sees, the clients. */
export default async function PortalSetupPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/portal')) return <AccessGate section="Client portal" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp] = await Promise.all([fetchPortalSetup(), searchParams])
  return <PortalSetupView data={data} from={readFrom(sp.from)} />
}
