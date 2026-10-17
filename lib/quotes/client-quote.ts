import 'server-only'   // libSQL never reaches the browser
import { and, eq, isNull, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { quotes } from '@/lib/db/schema'
import { fallbackDesign, type QuotePreviewData } from '@/lib/templates/queries'
import { docEntity, docTotals, type DocData, type DocItem } from '@/lib/templates/data'
import { pricedLineIds, printSums } from '@/lib/templates/item-sections'   // (S44F — NB-03)
import type { BrandKit, TemplateDesign } from '@/lib/templates/model'
import type { ClientView } from '@/lib/templates/client-view'
import { isConfirmKey } from './confirm'
import { cleanRichHtml, sanitizeRichHtml } from '@/lib/rich-html'   // (S44Q, triage §12.1)

/*
 * (pending modules S04 — card held:quotes; S02's and S03's notes) What a client link sends the client's browser about a quote: the print's
 * own fields and nothing of the studio's. Every client page that shows a quote reads through here — the confirmation link (`/confirm/<token>`),
 * the quote an agreement signs (`/sign/<token>/quote`) and the view-only link (`/quote/<token>`). Before S04 the first two sent the studio's
 * whole preview: each line's cost and mark-up apart, its rebate, vendor, website link, price-book id and stamps, the quote's and the lead's
 * ids, every published template's design, the readiness check.
 */

/** The quote as a client link shows it. No id: the page acts through its own link's token. */
export type ClientQuote = {
  quote: { number: string; title: string; status: string; version: number; confirmedAt: number | null; confirmedBy: string | null; kind: string }
  data: DocData
  design: TemplateDesign
  brand: BrandKit
  view: ClientView
}

/**
 * The document data as the client's browser gets it. A line arrives as the print reads it (`DocItem`): its price as one figure (cost and
 * mark-up folded into the cost — `unitPriceMinor` = cost + mark-up, all the print and the totals read), no rebate, none of the row's own record
 * (its quote's id, the vendor, the website link, the price book's id, the client's earlier pick, the stamps). A line the print never shows
 * (hidden from the client, while the client view doesn't list hidden lines without prices) keeps only what the totals need — no name, no words,
 * no picture. Of the studio's entities only the one the quote prints keeps its bank details; the studio's own stays first, for the letterhead.
 */
/*
 * (S44F — NB-03, 1.0 `quotes/port` 4a805a184: what the client view hides never leaves the server) …and a line's price reaches the browser only
 * when the print shows it: with *One amount per section* or *The total only* no line carries a price, nor does a line hidden from the client,
 * shown without a price, printed as a word (FOC · Inclusive …), folded into a section printed as one line, declined or not printed at all. The
 * totals, the section sums and the folded sums the page prints come worked out (`sums` — `docTotals` reads them; never cost or margin), from the
 * same `sections()` the print draws with.
 */
export function clientSafe(doc: DocData, view: ClientView, design: TemplateDesign): DocData {
  const unseen = (i: DocItem) => i.visibility === 'hidden' && view.hiddenItems !== 'no-price'
  const t = docTotals({ ...doc, sums: undefined })
  const sums: NonNullable<DocData['sums']> = { totals: { ...t, costMinor: 0, marginMinor: 0, marginPct: 0 }, print: printSums(design, doc, view) }
  const priced = pricedLineIds(design, doc, view)
  const noMoney = <T extends { unitPriceMinor: number; totalMinor: number }>(w: T | undefined, keep: boolean): T | undefined => (w && !keep ? { ...w, unitPriceMinor: 0, totalMinor: 0 } : w)
  const printed = docEntity(doc)
  const entities = doc.studio.entities
    .filter((e, k) => k === 0 || e === printed)
    .map((e) => (e === printed ? e : { ...e, bankName: '', accountName: '', accountNo: '', payNow: '', payNowQr: null, swift: '', branch: '' }))
  return {
    ...doc,
    /* (S44Q, triage §12.1) the Terms and Notes reach the client's browser through the house allowlist, as the print draws them */
    quote: { ...doc.quote, termsHtml: sanitizeRichHtml(doc.quote.termsHtml), notesHtml: sanitizeRichHtml(doc.quote.notesHtml) },
    studio: { ...doc.studio, entities },
    items: doc.items.map((i): DocItem => {
      const hide = unseen(i)
      const keep = priced.has(i.id)   // (S44F — NB-03) its price prints
      return {
        id: i.id, parentId: i.parentId, kind: i.kind, position: i.position, name: hide ? '' : i.name, description: hide ? null : i.description, qty: i.qty, unit: hide ? null : i.unit,
        costMinor: keep ? i.costMinor + i.markupMinor : 0, markupMinor: 0, discountPct: i.discountPct, gstPct: i.gstPct, room: i.room, category: i.category, section: i.section,
        visibility: i.visibility, status: i.status, thumb: hide ? null : i.thumb, icon: hide ? null : i.icon, rebateMinor: 0, optional: i.optional, printAs: i.printAs, printAsText: hide ? null : i.printAsText,
        highlight: i.highlight, noNumber: i.noNumber, descriptionHtml: hide ? null : cleanRichHtml(i.descriptionHtml), printOneLine: i.printOneLine,   // (S44Q) the allowlist's markup only
        ...(i.change ? { change: i.change } : {}), ...(i.was && !hide ? { was: noMoney(i.was, keep) } : {}),
        ...(i.history && !hide ? { history: { ...i.history, ...(i.history.first ? { first: noMoney(i.history.first, keep) } : {}) } } : {}),   // (S44F — NB-01) every version's marks, their old figures only where the price prints
        ...(i.pricedAfter ? { pricedAfter: true } : {}), ...(i.nameHtml && !hide ? { nameHtml: i.nameHtml } : {}),   // (S44T — calls C1 · C2) estimates stay out of the client's total; a name's emphasis prints (allowlisted at print)
      }
    }),
    sums,
  }
}

/** (S04 · S44F) A link opened before the client may see the quote: the page draws an empty stage — no line, milestone, word or sum of it. */
export const withoutContent = (d: DocData): DocData => ({ ...d, items: [], payments: [], sums: undefined, quote: { ...d.quote, termsHtml: '', notesHtml: '' } })

/** (S44Q) A design whose Text blocks carry only the allowlist's markup. */
const cleanDesignText = (d: TemplateDesign): TemplateDesign => ({ ...d, blocks: d.blocks.map((b) => (b.kind === 'text' ? { ...b, html: sanitizeRichHtml(b.html) } : b)) })

/** The studio's preview, projected for a client link. */
export function clientQuoteOf(p: QuotePreviewData): ClientQuote {
  const q = p.quote
  const design = p.template?.design ?? fallbackDesign()   // (S44F) one design for the sums and the page — the fallback's block ids are new each call
  return {
    quote: { number: q.number, title: q.title, status: q.status, version: q.version, confirmedAt: q.confirmedAt, confirmedBy: q.confirmedBy, kind: q.kind ?? 'quote' },
    data: clientSafe(p.data, p.view, design),
    /* (S44Q, triage §12.1) a Text block's words through the allowlist before they leave the studio */
    design: cleanDesignText(design),
    brand: p.brand,
    view: p.view,
  }
}

/**
 * The quote a confirmation link opens: its token — or, for a quote with no token yet (a port in flight), its id. A quote that has a token is
 * never opened by its id unless its id IS its token (a quote made before S04). Deleted quotes open nothing.
 */
export async function quoteByConfirmKey(key: string): Promise<{ id: string; leadId: string; confirmToken: string | null } | null> {
  if (!isConfirmKey(key)) return null
  const [q] = await db.select({ id: quotes.id, leadId: quotes.leadId, confirmToken: quotes.confirmToken }).from(quotes)
    .where(and(isNull(quotes.deletedAt), or(eq(quotes.confirmToken, key), and(isNull(quotes.confirmToken), eq(quotes.id, key))))).limit(1)
  return q ?? null
}
