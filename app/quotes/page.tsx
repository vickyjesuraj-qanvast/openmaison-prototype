import type { Metadata } from 'next'
import { fetchStudioQuotes } from '@/lib/quotes/list'
import { QuotesWorkspace } from '@/components/quotes/list/quotes-workspace'

/** Tools › Quotes — every quote in the studio (REG-422). Frame copied from app/leads/page.tsx. */
export const metadata: Metadata = { title: 'Quotes' }
export const dynamic = 'force-dynamic'

export default async function QuotesPage() {
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  const data = await fetchStudioQuotes()
  return <QuotesWorkspace data={data} />
}
