import type { Metadata } from 'next'
import { fetchPriceBookData } from '@/lib/company/price-book'
import { PriceBookItems } from '@/components/company/price-book/price-book-items'
import { readFrom } from '@/lib/nav'

export const metadata: Metadata = { title: 'Price book' }
export const dynamic = 'force-dynamic'

/** Company › Price book › My Items (REG-594): every product and service the studio prices, as a library. */
export default async function PriceBookPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [data, sp] = await Promise.all([fetchPriceBookData(), searchParams])
  return <PriceBookItems data={data} from={readFrom(sp.from)} />
}
