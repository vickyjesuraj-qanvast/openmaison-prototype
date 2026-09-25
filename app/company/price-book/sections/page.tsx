import type { Metadata } from 'next'
import { fetchPriceBookData } from '@/lib/company/price-book'
import { PriceBookSections } from '@/components/company/price-book/price-book-sections'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'

export const metadata: Metadata = { title: 'My Sections' }
export const dynamic = 'force-dynamic'

/** Company › Price book › My Sections (REG-594): whole sections saved from quotes, editable here. */
export default async function PriceBookSectionsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [data, sp, folders] = await Promise.all([fetchPriceBookData(), searchParams, fetchFolders('book-sections')])
  return <PriceBookSections data={data} from={readFrom(sp.from)} folders={folders} />
}
