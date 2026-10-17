import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { fetchStudioQuotes } from '@/lib/quotes/list'
import { QuotesWorkspace } from '@/components/quotes/list/quotes-workspace'

/** Tools › Quotes — every quote in the studio (REG-422). Frame copied from app/leads/page.tsx. */
export const metadata: Metadata = { title: 'Quotes' }
export const dynamic = 'force-dynamic'

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ new?: string; template?: string; todo?: string }> }) {
  if (await refusesPath('/quotes')) return <AccessGate section="Quotes" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const sp = await searchParams
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  const data = await fetchStudioQuotes()
  return <QuotesWorkspace data={data} newTemplateId={typeof sp.new === 'string' ? sp.new : null} templateId={typeof sp.template === 'string' ? sp.template : null} todo={typeof sp.todo === 'string' ? sp.todo : null} />   // (pending modules S22) the Dashboard's door lands on its to-do chip
}
