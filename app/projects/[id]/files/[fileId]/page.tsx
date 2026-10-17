import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound, redirect } from 'next/navigation'
import { isDeletedProject } from '@/lib/projects/handover'
import { withFrom } from '@/lib/nav'
import { invoiceOfFile, receiptOfFile } from '@/lib/projects/payments'
import { creditOfFile } from '@/lib/finance/credit-records'   // (gaps build F2)
import { choiceReceiptOfFile } from '@/lib/projects/choice-receipt'
import { fetchFileView } from '@/lib/leads/files'
import { fetchProjectDetail } from '@/lib/projects/queries'
import { projectBase } from '@/lib/projects/tabs'
import { FileViewer } from '@/components/leads/files/file-viewer'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; fileId: string }> }): Promise<Metadata> {
  const { id, fileId } = await params
  if (await refusesPath(`/projects/${id}/files/${fileId}`)) return { title: 'Projects' }   // (S44O — C6) no record's name in a tab that is not theirs
  const d = await fetchProjectDetail(id)
  const data = d ? await fetchFileView(d.lead.id, fileId) : null
  return { title: data ? `${data.file.name} · ${d!.project.name}` : 'File' }
}

/** (REG-913) A project's file — the lead's file viewer, its Back and its neighbours on the project's Files. Who sees: the project's lead's rule. */
export default async function ProjectFilePage({ params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params
  if (await refusesPath(`/projects/${id}/files/${fileId}`)) return <AccessGate section="Projects" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const d = await fetchProjectDetail(id)
  if (!d) { if (await isDeletedProject(id)) redirect(`/projects?deleted=${encodeURIComponent(id)}`); notFound() }   // (fix-E, E-28) a deleted project's file lands where its tabs do
  /* (fix-D, D-12 · A-18) a receipt's entry opens the receipt — its page is the paper, and Download prints it */
  const receipt = await receiptOfFile(fileId)
  if (receipt) redirect(withFrom(`/projects/${receipt.projectId}/receipts/${receipt.paymentId}`, `/projects/${id}/files`))
  const invoice = await invoiceOfFile(fileId)   // (gaps build B, item 6) a sent invoice's entry opens the invoice, as a receipt's does
  if (invoice) redirect(withFrom(`/projects/${invoice.projectId}/invoices/${invoice.invoiceId}`, `/projects/${id}/files`))
  const pick = await choiceReceiptOfFile(fileId)   // (gaps build D, item 7) a selection receipt's entry opens the receipt
  if (pick) redirect(withFrom(`/projects/${pick.projectId}/selection-receipts/${pick.selectionId}`, `/projects/${id}/files`))
  const credit = await creditOfFile(fileId)   // (gaps build F2 — F2-Q9) a credit note's entry opens its paper
  if (credit) redirect(withFrom(`/projects/${credit.projectId}/credit-notes/${credit.creditId}`, `/projects/${id}/files`))
  const data = await fetchFileView(d.lead.id, fileId)
  if (!data) notFound()
  return <FileViewer data={data} base={projectBase(id)} />
}
