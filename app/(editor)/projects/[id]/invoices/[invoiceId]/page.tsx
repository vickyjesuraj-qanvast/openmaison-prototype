import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { MoneyHiddenPage } from '@/components/projects/money/money-hidden-page'
import { fetchInvoiceDoc, moneyHiddenFor } from '@/lib/projects/money-queries'
import { InvoicePage } from '@/components/projects/money/invoice-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; invoiceId: string }> }): Promise<Metadata> {
  const { id, invoiceId } = await params
  if (await refusesPath(`/projects/${id}/invoices/${invoiceId}`)) return { title: 'Projects' }   // (S44O — C6)
  const d = await fetchInvoiceDoc(id, invoiceId)
  return { title: d ? `${d.invoice.number ?? `${d.invoice.stageName} invoice`} · ${d.project.name}` : 'Invoice' }
}

/** (Projects round 5, F-12 · F-15) An invoice as its client receives it; `?print=1` prints it. Who sees: the project's lead's rule, then money's (F-17). */
export default async function InvoicePageRoute({ params, searchParams }: { params: Promise<{ id: string; invoiceId: string }>; searchParams: Promise<{ from?: string; print?: string }> }) {
  const [{ id, invoiceId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/projects/${id}/invoices/${invoiceId}`)) return <AccessGate section="Projects" />   // (S44O — call C6) a project's papers are never Marketing's — before a record is read
  const d = await fetchInvoiceDoc(id, invoiceId)
  if (!d) {
    /* (fix-D, D-35) the project is theirs to see but its money is not: the page says so, as the Money tab does */
    const hidden = await moneyHiddenFor(id)
    if (hidden) return <MoneyHiddenPage project={hidden.project} kind="invoice" />
    notFound()
  }
  return <InvoicePage d={d} from={readFrom(sp.from)} print={sp.print === '1'} />
}
