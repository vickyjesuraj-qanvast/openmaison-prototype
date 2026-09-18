import 'server-only'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, members, quoteComparisons, quoteItems, quotes } from '@/lib/db/schema'
import { fetchBrand } from '@/lib/templates/queries'
import { lineTotalMinor } from '@/lib/quotes/math'
import type { XrayResult, YourLine } from './compare'

/** Quote X-Ray (REG-529) — the setup page's data and a stored comparison. */
export type XrayLead = { id: string; name: string; propertyType: string; phone: string }
export type XrayQuote = { id: string; leadId: string; number: string; title: string; amountMinor: number; status: string; updatedAt: number }
export type XrayRecent = { id: string; leadId: string | null; leadName: string | null; yourLabel: string; otherStudio: string; createdAt: number }
export type XrayData = { leads: XrayLead[]; quotes: XrayQuote[]; recents: XrayRecent[]; studio: string; now: number }
export type XrayRecord = { id: string; leadId: string | null; leadName: string | null; leadPhone: string | null; quoteId: string | null; yourLabel: string; otherStudio: string; otherFile: string; result: XrayResult; createdAt: number; createdBy: string }

export async function fetchXrayData(): Promise<XrayData> {
  const [ls, qs, recents, brand] = await Promise.all([
    db.select({ id: leads.id, name: leads.name, propertyType: leads.propertyType, phone: leads.phone }).from(leads).where(isNull(leads.deletedAt)).orderBy(leads.name),
    db.select({ id: quotes.id, leadId: quotes.leadId, number: quotes.number, title: quotes.title, amountMinor: quotes.amountMinor, status: quotes.status, updatedAt: quotes.updatedAt, createdAt: quotes.createdAt }).from(quotes).where(and(isNull(quotes.deletedAt), isNull(quotes.archivedAt))).orderBy(desc(quotes.updatedAt)),
    fetchRecents(),
    fetchBrand(),
  ])
  return {
    leads: ls,
    quotes: qs.map(({ createdAt, ...q }) => ({ ...q, updatedAt: (q.updatedAt ?? createdAt).getTime() })),
    recents,
    studio: brand.details.name,
    now: Date.now(),
  }
}

export async function fetchRecents(): Promise<XrayRecent[]> {
  const rows = await db.select({ id: quoteComparisons.id, leadId: quoteComparisons.leadId, leadName: leads.name, yourLabel: quoteComparisons.yourLabel, otherStudio: quoteComparisons.otherStudio, createdAt: quoteComparisons.createdAt })
    .from(quoteComparisons).leftJoin(leads, eq(leads.id, quoteComparisons.leadId)).orderBy(desc(quoteComparisons.createdAt)).limit(20)
  return rows.map((r) => ({ ...r, leadName: r.leadName ?? null, createdAt: r.createdAt.getTime() }))
}

export async function fetchComparison(id: string): Promise<XrayRecord | null> {
  const [row] = await db.select({ c: quoteComparisons, leadName: leads.name, leadPhone: leads.phone, by: members.name })
    .from(quoteComparisons).leftJoin(leads, eq(leads.id, quoteComparisons.leadId)).leftJoin(members, eq(members.id, quoteComparisons.createdBy)).where(eq(quoteComparisons.id, id))
  if (!row) return null
  return { id: row.c.id, leadId: row.c.leadId, leadName: row.leadName ?? null, leadPhone: row.leadPhone ?? null, quoteId: row.c.quoteId, yourLabel: row.c.yourLabel, otherStudio: row.c.otherStudio, otherFile: row.c.otherFile, result: JSON.parse(row.c.resultJson) as XrayResult, createdAt: row.c.createdAt.getTime(), createdBy: row.by ?? 'You' }
}

/** A studio quote's lines as the engine reads them: every counted item (not groups, not optional), its trade from the category or its group. */
export async function loadYourLines(quoteId: string): Promise<YourLine[]> {
  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId))
  const groups = new Map(items.filter((i) => i.kind === 'group').map((g) => [g.id, g]))
  return items.filter((i) => i.kind === 'item' && i.status !== 'Declined').map((i) => {
    const g = i.parentId ? groups.get(i.parentId) : undefined
    return { id: i.id, name: i.name, description: i.description, trade: i.category ?? g?.category ?? g?.name ?? null, room: i.room ?? g?.room ?? null, qty: i.qty, unit: i.unit, amountMinor: lineTotalMinor(i), optional: i.optional }
  })
}
