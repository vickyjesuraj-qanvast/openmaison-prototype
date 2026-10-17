import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { MoneyHiddenPage } from '@/components/projects/money/money-hidden-page'
import { moneyHiddenFor } from '@/lib/projects/money-queries'
import { fetchPoDoc } from '@/lib/finance/queries'
import { PoPage } from '@/components/finance/po-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; poId: string }> }): Promise<Metadata> {
  const { id, poId } = await params
  if (await refusesPath(`/projects/${id}/purchase-orders/${poId}`)) return { title: 'Projects' }   // (S44O — C6)
  const d = await fetchPoDoc(id, poId)
  return { title: d ? `${d.po.number} · ${d.project.name}` : 'Purchase order' }
}

/** (gaps build F1 — F1-Q5) A purchase order as its vendor receives it; `?print=1` prints it. Who sees: the project's lead's rule, then its money's (F-17). */
export default async function PoPageRoute({ params, searchParams }: { params: Promise<{ id: string; poId: string }>; searchParams: Promise<{ from?: string; print?: string }> }) {
  const [{ id, poId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/projects/${id}/purchase-orders/${poId}`)) return <AccessGate section="Projects" />   // (S44O — call C6) a project's papers are never Marketing's — before a record is read
  const d = await fetchPoDoc(id, poId)
  if (!d) {
    const hidden = await moneyHiddenFor(id)
    if (hidden) return <MoneyHiddenPage project={hidden.project} kind="po" />
    notFound()
  }
  return <PoPage d={d} from={readFrom(sp.from)} print={sp.print === '1'} />
}
