import type { Metadata } from 'next'
import { fetchHangouts } from '@/lib/hangouts/queries'
import { HangoutsHome } from '@/components/hangouts/hangouts-home'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

/** (pending modules S27 — public:hangouts) Qanvast Ops › Hangouts — Qanvast's meet-the-designers events, the studio's side of them. */
export const metadata: Metadata = { title: 'Hangouts · Qanvast Ops' }
export const dynamic = 'force-dynamic'

export default async function HangoutsPage() {
  if (await refusesPath('/qanvast-ops/hangouts')) return <AccessGate section="Qanvast Ops" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  return <HangoutsHome data={await fetchHangouts()} />
}
