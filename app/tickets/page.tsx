import type { Metadata } from 'next'
import { readFrom } from '@/lib/nav'
import { fetchStudioTickets } from '@/lib/projects/tickets'
import { StudioTickets } from '@/components/projects/tickets/studio-tickets'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'

/** (gaps build H, H-Q2) Tickets — every ticket on the projects the viewer sees. (S46 — REG-2524) a rail place of its own at /tickets, as Tasks is (his ask 2026-10-19: "in 1.0 the escalations is like the tasks on the sidebar and i want the same in 2.0"); /projects/tickets redirects here. */
export const metadata: Metadata = { title: 'Issues' }   // (the calm UI build 2026-10-27, 3-37) the page reads Issues; the route stays /tickets
export const dynamic = 'force-dynamic'

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/tickets')) return <AccessGate section="Issues" />   // (parity map, PR-022) Accounting reaches a project through Finance's rows, never the listing
  const [data, params] = await Promise.all([fetchStudioTickets(), searchParams])
  return <StudioTickets data={data} from={readFrom(params.from)} />
}
