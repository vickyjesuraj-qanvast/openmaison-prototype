import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { fetchSelectionReceipt } from '@/lib/projects/choice-receipt'
import { SelectionReceiptPage } from '@/components/projects/choices/selection-receipt-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; selectionId: string }> }): Promise<Metadata> {
  const { id, selectionId } = await params
  if (await refusesPath(`/projects/${id}/selection-receipts/${selectionId}`)) return { title: 'Projects' }   // (S44O — C6)
  const d = await fetchSelectionReceipt(id, selectionId)
  return { title: d ? `Selection receipt · ${d.choice.title} · ${d.project.name}` : 'Selection receipt' }
}

/** (gaps build D, item 7) A confirmed pick's selection receipt; its Files › Choices entry opens here; `?print=1` prints. Who sees: the lead's rule. */
export default async function SelectionReceiptRoute({ params, searchParams }: { params: Promise<{ id: string; selectionId: string }>; searchParams: Promise<{ from?: string; print?: string }> }) {
  const [{ id, selectionId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/projects/${id}/selection-receipts/${selectionId}`)) return <AccessGate section="Projects" />   // (S44O — call C6) a project's papers are never Marketing's — before a record is read
  const d = await fetchSelectionReceipt(id, selectionId)
  if (!d) notFound()
  return <SelectionReceiptPage d={d} from={readFrom(sp.from)} print={sp.print === '1'} />
}
