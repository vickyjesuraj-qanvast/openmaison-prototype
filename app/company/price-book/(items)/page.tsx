import type { Metadata } from 'next'
import { fetchPriceBookData } from '@/lib/company/price-book'
import { PriceBookItems } from '@/components/company/price-book/price-book-items'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Price book · Items' }   // (REG-653, Q-18) each tab names itself, as Sections does · (the close-out round 2026-10-31, C-122) the tabs' own names
export const dynamic = 'force-dynamic'

/** Company › Price book › My Items (REG-594): every product and service the studio prices, as a library. */
export default async function PriceBookPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/price-book')) return <AccessGate section="Price book" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp, folders] = await Promise.all([fetchPriceBookData(), searchParams, fetchFolders('book-items')])
  return <PriceBookItems data={data} from={readFrom(sp.from)} folders={folders} />
}
