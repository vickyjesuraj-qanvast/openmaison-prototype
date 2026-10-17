import type { Metadata } from 'next'
import { PortalClientsView } from '@/components/company/portal/portal-clients-view'
import { fetchPortalSetup } from '@/lib/portal/queries'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Company · Client portal clients' }
export const dynamic = 'force-dynamic'

/** Company › Client portal › Clients (Projects r4a, Q-46): everyone with access, invited or not, last opened; Invite · Resend · Withdraw. */
export default async function PortalClientsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/portal/clients')) return <AccessGate section="Client portal" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp] = await Promise.all([fetchPortalSetup(), searchParams])
  return <PortalClientsView data={data} from={readFrom(sp.from)} />
}
