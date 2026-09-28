import type { Metadata } from 'next'
import { fetchBrand, fetchTemplates } from '@/lib/templates/queries'
import { ProfileView } from '@/components/company/profile-view'
import { readFrom } from '@/lib/nav'
import { fetchEntityUsage } from '@/lib/company/entities'

export const metadata: Metadata = { title: 'Company · Profile' }
export const dynamic = 'force-dynamic'

/** Company › Profile (REG-487): the company details and issuing entities every quote template prints. */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [brand, data, sp, usage] = await Promise.all([fetchBrand(), fetchTemplates(), searchParams, fetchEntityUsage()])
  /* (REG-646) Back to where it was opened from (Settings › Studio, E-95); Owners and Admins change it (Q-07).
     (REG-707, owner 2026-09-28) No template preview here: it came with the brand kit, which moved to Templates (REG-554) with its own. */
  return <ProfileView brand={brand} from={readFrom(sp.from)} canRun={data.canRun} usage={usage} />
}
