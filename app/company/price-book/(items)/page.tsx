import type { Metadata } from 'next'
import { fetchPriceBookData } from '@/lib/company/price-book'
import { PriceBookItems } from '@/components/company/price-book/price-book-items'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'

export const metadata: Metadata = { title: 'My Items' }   // (REG-653, Q-18) each tab names itself, as My Sections does
export const dynamic = 'force-dynamic'

/** Company › Price book › My Items (REG-594): every product and service the studio prices, as a library. */
export default async function PriceBookPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [data, sp, folders] = await Promise.all([fetchPriceBookData(), searchParams, fetchFolders('book-items')])
  return <PriceBookItems data={data} from={readFrom(sp.from)} folders={folders} />
}
