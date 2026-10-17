import type { Metadata } from 'next'
import { withFrom } from '@/lib/nav'
import { invoiceOfFile, receiptOfFile } from '@/lib/projects/payments'
import { creditOfFile } from '@/lib/finance/credit-records'   // (gaps build F2)
import { choiceReceiptOfFile } from '@/lib/projects/choice-receipt'
import { notFound, redirect } from 'next/navigation'
import { directProjectOf } from '@/lib/projects/queries'
import { withQuery } from '@/lib/nav'
import { fetchFileView } from '@/lib/leads/files'
import { liveProjectOf } from '@/lib/leads/detail'
import { FileViewer } from '@/components/leads/files/file-viewer'
import { refusesPath } from '@/lib/leads/visibility'   // (parity map, PR-022) the Leads pipeline is never Accounting's
import { AccessGate } from '@/components/shell/access-gate'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; fileId: string }> }): Promise<Metadata> {
  const { id, fileId } = await params
  if (await refusesPath(`/leads/${id}/files/${fileId}`)) return { title: 'File' }   // (parity map, PR-022)
  const data = await fetchFileView(id, fileId)
  return { title: data ? `${data.file.name} · ${data.lead.name}` : 'File' }
}

/**
 * Lead Details › Files › file viewer (931:39831 frames 92–95): a full page — the L2 header carries the file name, the lead
 * frame (tabs, info column) is gone. A missing, trashed or folder id is a 404 (`fetchFileView` returns null for all three).
 * Spec: design-source/context/lead-files/03-viewer-panels.txt.
 */
export default async function FileViewPage({ params, searchParams }: { params: Promise<{ id: string; fileId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id, fileId } = await params
  const [direct, live] = await Promise.all([directProjectOf(id), liveProjectOf(id)])   // (REG-911) a direct project's files open on the project
  /* (one-home N-10) so do a Won lead's once its project is live — Files is the project's tab then; a deleted project gives the lead its files back */
  const home = direct ?? live
  if (home) redirect(withQuery(`/projects/${home}/files/${fileId}`, await searchParams))   // (fix-A, A-08) with its query
  if (await refusesPath(`/leads/${id}/files/${fileId}`)) return <AccessGate section="Leads" />   // (parity map, PR-022) a project's files (above) are Accounting's to open; a lead's are not
  /* (fix-D, D-12 · A-18) a receipt's entry opens the receipt — its page is the paper, and Download prints it */
  const receipt = await receiptOfFile(fileId)
  if (receipt) redirect(withFrom(`/projects/${receipt.projectId}/receipts/${receipt.paymentId}`, `/leads/${id}/files`))
  const invoice = await invoiceOfFile(fileId)   // (gaps build B, item 6) a sent invoice's entry opens the invoice, as a receipt's does
  if (invoice) redirect(withFrom(`/projects/${invoice.projectId}/invoices/${invoice.invoiceId}`, `/leads/${id}/files`))
  const pick = await choiceReceiptOfFile(fileId)   // (gaps build D, item 7) a selection receipt's entry opens the receipt
  if (pick) redirect(withFrom(`/projects/${pick.projectId}/selection-receipts/${pick.selectionId}`, `/leads/${id}/files`))
  const credit = await creditOfFile(fileId)   // (gaps build F2 — F2-Q9) a credit note's entry opens its paper
  if (credit) redirect(withFrom(`/projects/${credit.projectId}/credit-notes/${credit.creditId}`, `/leads/${id}/files`))
  const data = await fetchFileView(id, fileId)
  if (!data) notFound()
  return <FileViewer data={data} />
}
