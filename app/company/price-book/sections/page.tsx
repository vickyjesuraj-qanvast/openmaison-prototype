import type { Metadata } from 'next'
import { fetchPriceBookData } from '@/lib/company/price-book'
import { PriceBookSections } from '@/components/company/price-book/price-book-sections'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'
import { planAllowsNow } from '@/lib/credits/plan-gate'
import { SectionsLocked } from '@/components/company/price-book/sections-locked'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'My Sections' }
export const dynamic = 'force-dynamic'

/** Company › Price book › My Sections (REG-594): whole sections saved from quotes, editable here. */
export default async function PriceBookSectionsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/price-book/sections')) return <AccessGate section="Price book" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp, folders, open] = await Promise.all([fetchPriceBookData(), searchParams, fetchFolders('book-sections'), planAllowsNow('package_creation')])
  if (!open) return <SectionsLocked count={data.sections.length} from={readFrom(sp.from)} />   /* (pending modules S19) My Sections are Pro */
  return <PriceBookSections data={data} from={readFrom(sp.from)} folders={folders} />
}
