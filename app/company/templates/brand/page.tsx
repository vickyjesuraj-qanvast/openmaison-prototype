import type { Metadata } from 'next'
import { fetchBrand, fetchTemplates } from '@/lib/templates/queries'
import { BrandKitView } from '@/components/company/templates/brand-kit-view'
import { readFrom } from '@/lib/nav'

export const metadata: Metadata = { title: 'Templates · Brand kit' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Brand kit (REG-554): the kit every template starts from, first in the Templates strip. */
export default async function BrandKitPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [brand, data, sp] = await Promise.all([fetchBrand(), fetchTemplates(), searchParams])
  const preview = data.templates.find((t) => t.isDefault) ?? data.templates.find((t) => t.status === 'published') ?? null
  return <BrandKitView brand={brand} previewDesign={preview?.design ?? null} previewName={preview?.name ?? null} sample={data.sample} from={readFrom(sp.from)} canRun={data.canRun} />
}
