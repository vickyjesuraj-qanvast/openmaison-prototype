import type { Metadata } from 'next'
import { fetchBrand, fetchTemplates } from '@/lib/templates/queries'
import { ProfileView } from '@/components/company/profile-view'

export const metadata: Metadata = { title: 'Company · Profile' }
export const dynamic = 'force-dynamic'

/** Company › Profile (REG-487): the brand kit and company details every quote template prints. */
export default async function ProfilePage() {
  const [brand, data] = await Promise.all([fetchBrand(), fetchTemplates()])
  const preview = data.templates.find((t) => t.isDefault) ?? data.templates.find((t) => t.status === 'published') ?? null
  return <ProfileView brand={brand} previewDesign={preview?.design ?? null} previewName={preview?.name ?? null} sample={data.sample} />
}
