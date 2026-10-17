import 'server-only'   // libSQL never reaches the browser
import { and, count, eq, isNull, max } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, quoteItems, quotePayments, quotes } from '@/lib/db/schema'
import { fallbackDesign, fetchBrand, fetchQuotePreview } from '@/lib/templates/queries'
import type { DocData } from '@/lib/templates/data'
import type { BrandKit, TemplateDesign } from '@/lib/templates/model'
import type { ClientView } from '@/lib/templates/client-view'
import { leadClosed } from '@/lib/visualizer/queries'
import { fetchQuoteApproval } from '@/lib/settings/queries'
import { isViewToken, offersViewLink, viewShows } from './view-link'
import { clientSafe, withoutContent } from './client-quote'

/*
 * (pending modules S02) The view-only link's records: which quote a token names, what the page shows, and the stamp the open page polls.
 * 1.0 refused a rejected, cancelled or archived quote (`REVOKED_STATUSES`); 2.0 ends the link the way its other client links end — the quote
 * deleted or archived, its lead deleted or returned (LEAD_CLOSED_SHARE), or the studio's Stop. The token is the only key: the page never
 * carries the quote's id, so it opens no other link of the quote's.
 */

/** The quote a token opens, while it may — else null (never why: a stopped link and one never made read alike). */
export async function quoteByViewToken(token: string): Promise<{ quoteId: string; leadId: string } | null> {
  if (!isViewToken(token)) return null
  const [q] = await db.select({ id: quotes.id, leadId: quotes.leadId, kind: quotes.kind, archivedAt: quotes.archivedAt, deletedAt: quotes.deletedAt }).from(quotes).where(eq(quotes.viewToken, token)).limit(1)
  if (!q || q.deletedAt || q.archivedAt || !offersViewLink(q.kind)) return null
  if (await leadClosed(q.leadId)) return null
  return { quoteId: q.id, leadId: q.leadId }
}

/** What changed last: the quote's own stamp, its lines' and its payment rows' (`at`) — and, in `stamp`, how many of each too, so a removed
    line changes it as well. The open page compares `stamp`; its "Last changed" line reads `at`. */
export async function viewStampOf(quoteId: string): Promise<{ stamp: number; at: number }> {
  const [[q], [items], [pays]] = await Promise.all([
    db.select({ at: quotes.updatedAt, status: quotes.status }).from(quotes).where(eq(quotes.id, quoteId)),
    db.select({ at: max(quoteItems.updatedAt), n: count() }).from(quoteItems).where(eq(quoteItems.quoteId, quoteId)),
    db.select({ at: max(quotePayments.updatedAt), n: count() }).from(quotePayments).where(eq(quotePayments.quoteId, quoteId)),
  ])
  const ms = (d: Date | number | null | undefined) => (d instanceof Date ? d.getTime() : typeof d === 'number' ? d * (d < 1e12 ? 1000 : 1) : 0)
  const at = Math.max(ms(q?.at), ms(items?.at), ms(pays?.at))
  /* the status too: a quote signed, confirmed or sent back to Draft changes what the page shows even when no stamp moved */
  const st = [...(q?.status ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7)
  return { stamp: at + (items?.n ?? 0) + (pays?.n ?? 0) * 1000 + st * 1_000_000, at }
}

export type QuoteViewData = {
  token: string
  /** (S02) the quote is the client's to see now — false while it waits for the studio's approval (a revision): the page says "Not ready yet" and
      carries none of it */
  ready: boolean
  quote: { number: string; title: string; status: string; version: number; confirmedAt: number | null; confirmedBy: string | null }
  clientName: string
  studio: string
  design: TemplateDesign
  brand: BrandKit
  data: DocData
  view: ClientView
  /** Who "Message …" writes to on WhatsApp: whoever prepared the quote, on their own number — else the studio's. */
  designer: { name: string; phone: string; /** a member prepared it — else the studio itself answers (its name, its number) */ member: boolean }
  stamp: number
  /** When the quote last changed — the card's "Last changed …". */
  changedAt: number
  now: number
}

/* (S04) `clientSafe` — the print's fields only — moved to lib/quotes/client-quote.ts, shared with the confirmation link and the signing page's quote. */

export async function fetchQuoteView(token: string): Promise<QuoteViewData | null> {
  const hit = await quoteByViewToken(token)
  if (!hit) return null
  const [preview, [q], stamp, approval] = await Promise.all([
    fetchQuotePreview(hit.quoteId),
    db.select({ preparedBy: quotes.preparedBy, createdBy: quotes.createdBy }).from(quotes).where(and(eq(quotes.id, hit.quoteId), isNull(quotes.deletedAt))),
    viewStampOf(hit.quoteId),
    fetchQuoteApproval(),
  ])
  if (!preview || !q) return null
  const ready = viewShows({ status: preview.quote.status, approval })
  const who = q.preparedBy ?? q.createdBy
  const [[m], brand] = await Promise.all([who ? db.select({ name: members.name, phone: members.phone }).from(members).where(eq(members.id, who)) : Promise.resolve([]), fetchBrand()])
  const p = preview.quote
  const design = preview.template?.design ?? fallbackDesign()   // (S44F) one design for the sums and the page — the fallback's block ids are new each call
  return {
    token,
    ready,
    quote: { number: p.number, title: preview.data.quote.title || p.title, status: p.status, version: p.version, confirmedAt: p.confirmedAt, confirmedBy: p.confirmedBy },
    clientName: preview.data.client.name || p.leadName,
    studio: preview.data.studio.name || brand.details.name,
    design,
    brand: preview.brand,
    data: ready ? clientSafe(preview.data, preview.view, design) : withoutContent(clientSafe(withoutContent(preview.data), preview.view, design)),   // not ready: none of its content reaches the browser · (S44F — NB-03) no sum of it either
    view: preview.view,
    designer: { name: m?.name ?? brand.details.name, phone: (m?.phone ?? '').trim() || brand.details.phone, member: !!m },
    stamp: stamp.stamp,
    changedAt: stamp.at,
    now: Date.now(),
  }
}
