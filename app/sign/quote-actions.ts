'use server'

import { fetchSigning } from '@/lib/contracts/queries'
import { fetchQuotePreview } from '@/lib/templates/queries'
import { clientQuoteOf, type ClientQuote } from '@/lib/quotes/client-quote'
import type { LinkState } from '@/lib/contracts/policy'

/**
 * (Contracts on the move, C3 — P-05 · A-16 · A-17) The quote an agreement signs, read by the signing page itself: on a phone "As cards"
 * opens it IN PLACE (a layer over the agreement, never a new tab), and the layer asks for it only when it opens — the agreement's first load
 * stays light. The same read as /sign/<token>/quote: by the link's token (never a quote id), the client view only (S04 — no cost, mark-up,
 * rebate, vendor or record ids), and only while the link opens or is signed; any other state answers no quote. A client has no role — the
 * token is the key.
 */
export async function fetchSignQuoteDoc(token: string): Promise<{ state: LinkState; quote: ClientQuote | null }> {
  const data = await fetchSigning(typeof token === 'string' ? token : '')
  if (!data) return { state: 'inactive', quote: null }
  const quoteId = data.state === 'open' || data.state === 'signed' ? data.contract.fromQuoteId : null
  const preview = quoteId ? await fetchQuotePreview(quoteId) : null
  return { state: data.state, quote: preview ? clientQuoteOf(preview) : null }
}
