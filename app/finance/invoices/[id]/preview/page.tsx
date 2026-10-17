import { redirect } from 'next/navigation'
import { oldInvoicePaperTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S41b-2) 1.0's invoice print preview: the invoice's paper on its project, when the member may open the project; else Money in. */
export default async function OldInvoicePreview({ params }: { params: Promise<{ id: string }> }) {
  redirect(await oldInvoicePaperTarget(decodeURIComponent((await params).id)))
}
