import { redirect } from 'next/navigation'
import { oldVoPaperTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S41b-2) 1.0's variation-order print preview: a VO is a quote of kind `variation` in 2.0 — its Preview, when the member may
    open its lead; else Money in › Variation orders. */
export default async function OldVoPreview({ params }: { params: Promise<{ id: string }> }) {
  redirect(await oldVoPaperTarget(decodeURIComponent((await params).id)))
}
