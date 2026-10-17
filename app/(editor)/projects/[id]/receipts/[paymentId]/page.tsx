import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { moneyHiddenFor } from '@/lib/projects/money-queries'
import { MoneyHiddenPage } from '@/components/projects/money/money-hidden-page'
import { fetchReceiptDoc } from '@/lib/projects/payments'
import { ReceiptPage } from '@/components/projects/money/payments-receipt-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; paymentId: string }> }): Promise<Metadata> {
  const { id, paymentId } = await params
  if (await refusesPath(`/projects/${id}/receipts/${paymentId}`)) return { title: 'Projects' }   // (S44O — C6)
  const d = await fetchReceiptDoc(id, paymentId)
  return { title: d ? `${d.paper.payment.number} · ${d.project.name}` : 'Receipt' }
}

/** (Projects round 6, F-12) A payment's receipt, beside its invoice's page; `?print=1` prints it. Who sees: the project's lead's rule, then money's (F-17). */
export default async function ReceiptPageRoute({ params, searchParams }: { params: Promise<{ id: string; paymentId: string }>; searchParams: Promise<{ from?: string; print?: string }> }) {
  const [{ id, paymentId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/projects/${id}/receipts/${paymentId}`)) return <AccessGate section="Projects" />   // (S44O — call C6) a project's papers are never Marketing's — before a record is read
  const d = await fetchReceiptDoc(id, paymentId)
  if (!d) {
    /* (fix-D, D-35) the project is theirs to see but its money is not: the page says so, as the Money tab does */
    const hidden = await moneyHiddenFor(id)
    if (hidden) return <MoneyHiddenPage project={hidden.project} kind="receipt" />
    notFound()
  }
  return <ReceiptPage d={d} from={readFrom(sp.from)} print={sp.print === '1'} />
}
