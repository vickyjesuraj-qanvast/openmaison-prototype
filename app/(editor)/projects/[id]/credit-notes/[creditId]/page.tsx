import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { moneyHiddenFor } from '@/lib/projects/money-queries'
import { MoneyHiddenPage } from '@/components/projects/money/money-hidden-page'
import { fetchCreditDoc } from '@/lib/finance/credit-paper'
import { CreditNotePage } from '@/components/finance/books/credit-note-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; creditId: string }> }): Promise<Metadata> {
  const { id, creditId } = await params
  if (await refusesPath(`/projects/${id}/credit-notes/${creditId}`)) return { title: 'Projects' }   // (S44O — C6)
  const d = await fetchCreditDoc(id, creditId)
  return { title: d ? `${d.paper.credit.number} · ${d.project.name}` : 'Credit note' }
}

/** (gaps build F2 — F2-Q9) A credit note's page, beside its invoice's; `?print=1` prints. Who sees: the project's lead's rule, then money's (F-17). */
export default async function CreditNotePageRoute({ params, searchParams }: { params: Promise<{ id: string; creditId: string }>; searchParams: Promise<{ from?: string; print?: string }> }) {
  const [{ id, creditId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/projects/${id}/credit-notes/${creditId}`)) return <AccessGate section="Projects" />   // (S44O — call C6) a project's papers are never Marketing's — before a record is read
  const d = await fetchCreditDoc(id, creditId)
  if (!d) {
    const hidden = await moneyHiddenFor(id)
    if (hidden) return <MoneyHiddenPage project={hidden.project} kind="credit_note" />
    notFound()
  }
  return <CreditNotePage d={d} from={readFrom(sp.from)} print={sp.print === '1'} />
}
