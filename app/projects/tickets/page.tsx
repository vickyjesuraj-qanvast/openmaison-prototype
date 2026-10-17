import type { Metadata } from 'next'
import { readFrom } from '@/lib/nav'
import { fetchStudioTickets } from '@/lib/projects/tickets'
import { StudioTickets } from '@/components/projects/tickets/studio-tickets'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'

/** (gaps build H, H-Q2) Projects › Tickets — every ticket on the projects the viewer sees. */
export const metadata: Metadata = { title: 'Tickets' }
export const dynamic = 'force-dynamic'

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/projects/tickets')) return <AccessGate section="Projects" />   // (parity map, PR-022) Accounting reaches a project through Finance's rows, never the listing
  const [data, params] = await Promise.all([fetchStudioTickets(), searchParams])
  return <StudioTickets data={data} from={readFrom(params.from)} />
}
