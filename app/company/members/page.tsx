import type { Metadata } from 'next'
import { fetchMembersData } from '@/lib/company/members'
import { MembersView } from '@/components/company/members-view'
import { readFrom } from '@/lib/nav'

export const metadata: Metadata = { title: 'Company · Members' }
export const dynamic = 'force-dynamic'

/** Company › Members (REG-601): the studio's people, their roles and who reports to whom. */
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [data, sp] = await Promise.all([fetchMembersData(), searchParams])
  return <MembersView data={data} from={readFrom(sp.from)} />
}
