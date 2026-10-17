import { redirect } from 'next/navigation'
import { viewPath } from '@/lib/quotes/view-link'

export const dynamic = 'force-dynamic'

/** (pending modules S02) 1.0's live preview link (`/quote-preview/<token>`): the quote's view-only link — the same token (`quotes.view_token`). */
export default async function OldQuotePreview({ params }: { params: Promise<{ token: string }> }) {
  redirect(viewPath(encodeURIComponent((await params).token)))
}
