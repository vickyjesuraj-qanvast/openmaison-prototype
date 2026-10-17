import type { Metadata } from 'next'
import { fetchPlatformStudios } from '@/lib/platform-studios'
import { QanvastStudios } from '@/components/qanvast/qanvast-studios'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

/** (parity map, CP-148 · CP-149 · UC-082's operator pause) Qanvast Ops › Studios — OpenMaison's switches for each studio and its portal's usage. */
export const metadata: Metadata = { title: 'Studios · Qanvast Ops' }
export const dynamic = 'force-dynamic'

export default async function QanvastStudiosPage() {
  if (await refusesPath('/qanvast-ops/studios')) return <AccessGate section="Qanvast Ops" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  return <QanvastStudios studios={await fetchPlatformStudios()} />
}
