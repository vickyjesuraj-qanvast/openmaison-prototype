import { redirect } from 'next/navigation'
import { oldPoPaperTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S41b-2) 1.0's purchase-order print preview: the PO's paper on its project, when the member may open the project; else Money out. */
export default async function OldPoPreview({ params }: { params: Promise<{ id: string }> }) {
  redirect(await oldPoPaperTarget(decodeURIComponent((await params).id)))
}
