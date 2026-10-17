import type { Metadata } from 'next'
import { fetchNavigator } from '@/lib/compliance/queries'
import { readFrom } from '@/lib/nav'
import { Navigator } from '@/components/compliance/navigator'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

/** (gaps build I, I-Q12) Tools › Compliance Navigator — the studio's own steps (`/compliance`) and Singapore's rules by home (`?tab=rules`, `?kind=`). */
export const metadata: Metadata = { title: 'Compliance Navigator' }
export const dynamic = 'force-dynamic'

export default async function CompliancePage({ searchParams }: { searchParams: Promise<{ tab?: string; from?: string; kind?: string }> }) {
  if (await refusesPath('/compliance')) return <AccessGate section="Compliance" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp] = await Promise.all([fetchNavigator(), searchParams])
  const kind = sp.kind === 'condo' || sp.kind === 'landed' || sp.kind === 'hdb' ? sp.kind : undefined
  return <Navigator data={data} tab={sp.tab === 'rules' ? 'rules' : 'studio'} from={readFrom(sp.from)} kind={kind} />
}
