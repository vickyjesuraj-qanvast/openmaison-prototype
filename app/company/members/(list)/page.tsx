import type { Metadata } from 'next'
import { fetchMembersData } from '@/lib/company/members'
import { MembersView } from '@/components/company/members-view'
import { readFrom } from '@/lib/nav'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Company · Members' }
export const dynamic = 'force-dynamic'

/** Company › Members (REG-601): the studio's people, their roles and who reports to whom. */
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/members')) return <AccessGate section="Members" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp] = await Promise.all([fetchMembersData(), searchParams])
  return <MembersView data={data} from={readFrom(sp.from)} />
}
