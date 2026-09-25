import type { Metadata } from 'next'
import { fetchBrand, fetchTemplates } from '@/lib/templates/queries'
import { ProfileView } from '@/components/company/profile-view'
import { readFrom } from '@/lib/nav'
import { fetchEntityUsage } from '@/lib/company/entities'

export const metadata: Metadata = { title: 'Company · Profile' }
export const dynamic = 'force-dynamic'

/** Company › Profile (REG-487): the brand kit and company details every quote template prints. */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [brand, data, sp, usage] = await Promise.all([fetchBrand(), fetchTemplates(), searchParams, fetchEntityUsage()])
  const preview = data.templates.find((t) => t.isDefault) ?? data.templates.find((t) => t.status === 'published') ?? null
  /* (REG-646) Back to where it was opened from (Settings › Studio, E-95); Owners and Admins change it (Q-07). */
  return <ProfileView brand={brand} previewDesign={preview?.design ?? null} previewName={preview?.name ?? null} sample={data.sample} from={readFrom(sp.from)} canRun={data.canRun} usage={usage} />
}
