import type { Metadata } from 'next'
import { fetchBrand, fetchTemplates } from '@/lib/templates/queries'
import { BrandKitView } from '@/components/company/templates/brand-kit-view'
import { readFrom } from '@/lib/nav'
import { fetchStudioFonts } from '@/lib/company/studio-fonts'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Templates · Brand kit' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Brand kit (REG-554): the kit every template starts from, first in the Templates strip. */
export default async function BrandKitPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/templates/brand')) return <AccessGate section="Templates" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [brand, data, sp] = await Promise.all([fetchBrand(), fetchTemplates(), searchParams])
  const preview = data.templates.find((t) => t.isDefault) ?? data.templates.find((t) => t.status === 'published') ?? null
  const ownFonts = await fetchStudioFonts(brand.kit)   // (pending modules S11) the studio's uploaded fonts and where each is named
  return <BrandKitView brand={brand} previewDesign={preview?.design ?? null} previewName={preview?.name ?? null} sample={data.sample} from={readFrom(sp.from)} canRun={data.canRun} ownFonts={ownFonts} />
}
