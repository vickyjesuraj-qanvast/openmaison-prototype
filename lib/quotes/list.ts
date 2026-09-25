import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, priceBookItems, quoteTemplates, quotes, type Quote, type QuoteTemplate, members } from '@/lib/db/schema'
import type { Member } from '@/lib/db/schema'
import { fetchQuoteApproval, isApprover } from '@/lib/settings/queries'
import type { QuoteApproval } from '@/lib/settings/types'
import { fetchBrand, pickerExtras } from '@/lib/templates/queries'
import type { PickerExtras } from '@/lib/templates/picker'
import { SAMPLE_DATA, type DocData } from '@/lib/templates/data'
import type { BrandKit } from '@/lib/templates/model'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'

/* Tools › Quotes (REG-422): every live quote in the studio with the lead it belongs to — the Quotes tab's table plus a
   Client column — and the leads the Create Quote modal's Client field can choose from. */

export type StudioQuoteRow = Quote & { leadName: string; creator: Member | null }   /* creator: REG-471 */
export type StudioQuotesData = {
  quotes: StudioQuoteRow[]
  leads: { id: string; name: string }[]
  templates: QuoteTemplate[]
  priceBookCount: number
  approval: QuoteApproval
  /** (REG-624) Whether the signed-in member may mark a quote Approved. */
  canApprove: boolean
  /** (REG-625) Who is looking — Delete follows its rule. */
  viewer: { id: string; role: string }
  brand: BrandKit
  sample: DocData
  /** (REG-538) The picker's facts: the payment library's names and the text templates' titles. */
  extras: PickerExtras
  now: number
}

export async function fetchStudioQuotes(): Promise<StudioQuotesData> {
  const [rows, clients, templates, approval, book, team, brand, extras] = await Promise.all([
    db.select({ quote: quotes, leadName: leads.name }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
      .where(and(isNull(quotes.archivedAt), isNull(quotes.deletedAt), isNull(leads.deletedAt))).orderBy(asc(quotes.createdAt)),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
    db.select().from(quoteTemplates).orderBy(desc(quoteTemplates.isDefault), desc(quoteTemplates.lastUsedAt), asc(quoteTemplates.createdAt)),
    fetchQuoteApproval(),
    db.select({ n: count() }).from(priceBookItems).where(and(isNull(priceBookItems.deletedAt), eq(priceBookItems.status, 'live'))),   // (REG-653, price book parity Q-11) the live book — not the trash, not proposals
    db.select().from(members),
    fetchBrand(),
    pickerExtras(),
  ])
  const byMember = new Map(team.map((m) => [m.id, m]))
  const me = team.find((m) => m.isYou) ?? null
  /* (REG-625, parity §8.2 · E-135) Tools › Quotes lists the quotes on the leads this member sees (Who sees leads), and offers only those leads. */
  const viewer = await fetchViewer()
  const seen = await visibleLeadIds(viewer)
  if (seen) { rows.splice(0, rows.length, ...rows.filter((r) => seen.has(r.quote.leadId))); clients.splice(0, clients.length, ...clients.filter((c) => seen.has(c.id))) }
  const canApprove = await isApprover(me?.id, me?.role)   // (REG-624)
  return { quotes: rows.map((r) => ({ ...r.quote, leadName: r.leadName, creator: r.quote.createdBy ? byMember.get(r.quote.createdBy) ?? null : null })), leads: clients, templates, priceBookCount: book[0]?.n ?? 0, approval, canApprove, viewer: { id: viewer.id, role: viewer.role }, extras, brand: brand.kit, sample: { ...SAMPLE_DATA, studio: brand.details }, now: Date.now() }
}
