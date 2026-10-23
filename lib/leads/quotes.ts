import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { asc, and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { count } from 'drizzle-orm'
import { leads, priceBookItems, quoteTemplates, quotes, type Quote, type QuoteTemplate, members } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member
import { sentToClientDates } from '@/lib/quotes/sent-to-client'
import type { Member } from '@/lib/db/schema'
import { fetchBrand, pickerExtras } from '@/lib/templates/queries'
import type { PickerExtras } from '@/lib/templates/picker'
import { sampleFor, type DocData } from '@/lib/templates/data'
import type { BrandKit } from '@/lib/templates/model'

/* Lead Details › Quotes (910-36240) — one loader for the tab. Archived / deleted quotes leave the list. The studio's
   design templates ride along for the Create Quote modal (REG-412): default first, then most recently used. */

/** A quote with the member who created it (REG-471) — the Quotes tables' Creator column. */
export type QuoteRow = Quote & { creator: Member | null; /** (UX audit Q5) the day it went to the client — the "Sent to client" column */ sentToClientAt: Date | null }
export type LeadQuotesData = {
  quotes: QuoteRow[]
  templates: QuoteTemplate[]
  /** The studio's My Items count — the Create Quote modal's "n-item price book" (REG-412). */
  priceBookCount: number
  /** (REG-489) The brand kit and the sample quote the Create Quote modal draws each template's first page with. */
  brand: BrandKit
  sample: DocData
  /** (REG-538) The picker's facts: the payment library's names and the text templates' titles. */
  extras: PickerExtras
  /** (UX audit Q1) The lead's stage — a quote marked with the client on a lead before Quote Sent offers the move. */
  leadStage: string
  /** (Quotes on the move, K4 — P-06) The lead's phone: the phone card's Remind drafts a WhatsApp nudge on the press (REG-534's rule). */
  leadPhone: string
  /** (K4) The studio's name, as the nudge names it. */
  studioName: string
  now: number
}

export async function fetchLeadQuotes(leadId: string): Promise<LeadQuotesData> {
  const [rows, templates, book, team, brand, extras, leadRow] = await Promise.all([
    db.select().from(quotes)
      .where(and(eq(quotes.leadId, leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt), eq(quotes.kind, 'quote')))   // (Projects round 5) variation orders live on the project's Money tab
      .orderBy(asc(quotes.createdAt)),
    db.select().from(quoteTemplates).orderBy(desc(quoteTemplates.isDefault), desc(quoteTemplates.lastUsedAt), asc(quoteTemplates.createdAt)),
    db.select({ n: count() }).from(priceBookItems).where(and(isNull(priceBookItems.deletedAt), eq(priceBookItems.status, 'live'))),   // (REG-653, price book parity Q-11) the live book — not the trash, not proposals
    db.select().from(members).then(withYou),
    fetchBrand(),
    pickerExtras(),
    db.select({ stage: leads.stage, phone: leads.phone }).from(leads).where(eq(leads.id, leadId)),
  ])
  const byMember = new Map(team.map((m) => [m.id, m]))
  const sent = await sentToClientDates(rows)
  return { leadStage: leadRow[0]?.stage ?? 'New', leadPhone: leadRow[0]?.phone ?? '', studioName: brand.details.name, quotes: rows.map((q) => ({ ...q, preparedJson: null /* (pending modules S04) the kept preparer (a signature picture) stays out of the list */, creator: q.createdBy ? byMember.get(q.createdBy) ?? null : null, sentToClientAt: sent.get(q.id) ?? null })), templates, priceBookCount: book[0]?.n ?? 0, extras, brand: brand.kit, sample: sampleFor(brand.details), now: Date.now() }
}
