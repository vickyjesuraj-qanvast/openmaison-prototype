'use server'

import { and, desc, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, projects, quoteItems, quotes } from '@/lib/db/schema'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { counts, lineTotalMinor } from '@/lib/quotes/math'

/*
 * (parity P-33 · Q-02, the owner's pick 2026-10-08) What Maison AI reads on a lead's page — the projects' contract (app/projects/maison-actions.ts,
 * gaps build I-Q16) on the lead side. Read-only: every answer comes from the studio's own records, nothing is metered (Q-30), and Who sees leads
 * decides what a member is shown (the lead itself, and every other lead a row names). A refusal answers `{ error }`.
 */
type Refusal = { error: string }
const NOT_FOUND = 'This lead is not there any more'
/** (S44O — call C6) The studio's quotes and projects are not Marketing's — the three readers below answer with the role's line. */
async function deskRefusal(): Promise<Refusal | null> {
  const { isMarketing } = await import('@/lib/settings/roles')
  const { ON_DESK } = await import('@/lib/maison-ai/answers/common')
  return isMarketing((await fetchViewer()).role) ? { error: ON_DESK } : null
}

async function readable(leadId: string) {
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return null
  const [lead] = await db.select({ id: leads.id, propertyType: leads.propertyType }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).limit(1)
  return lead ? { viewer, lead, visible: await visibleLeadIds(viewer) } : null
}

export type SimilarProject = { id: string; name: string; number: string; stage: string }

/** The studio's projects on the same property type as this lead — completed ones first (what a studio shows a client), then the running ones. */
export async function similarProjects(leadId: string): Promise<{ propertyType: string; rows: SimilarProject[] } | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S44O — C6)
  const r = await readable(leadId)
  if (!r) return { error: NOT_FOUND }
  const rows = await db.select({ id: projects.id, name: projects.name, number: projects.number, stage: projects.stage, leadId: projects.leadId, createdAt: projects.createdAt })
    .from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(leads.propertyType, r.lead.propertyType), ne(projects.leadId, leadId), isNull(projects.deletedAt), isNull(leads.deletedAt)))
    .orderBy(desc(projects.createdAt))
  const order = (s: string) => (s === 'completed' ? 0 : s === 'in_progress' ? 1 : 2)
  const seen = rows.filter((p) => !r.visible || r.visible.has(p.leadId)).sort((a, b) => order(a.stage) - order(b.stage))
  return { propertyType: r.lead.propertyType, rows: seen.slice(0, 6).map(({ id, name, number, stage }) => ({ id, name, number: number ?? '', stage })) }
}

export type PastQuote = { id: string; number: string; client: string; amountMinor: number; status: string }

/** The studio's quotes on other leads of the same property type that reached the client — the newest six, and the median of them all. */
export async function pastQuotes(leadId: string): Promise<{ propertyType: string; medianMinor: number | null; count: number; rows: PastQuote[] } | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S44O — C6) a quote's money is never Marketing's
  const r = await readable(leadId)
  if (!r) return { error: NOT_FOUND }
  const rows = await db.select({ id: quotes.id, number: quotes.number, amountMinor: quotes.amountMinor, status: quotes.status, leadId: quotes.leadId, client: leads.name })
    .from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(eq(leads.propertyType, r.lead.propertyType), ne(quotes.leadId, leadId), eq(quotes.kind, 'quote'), inArray(quotes.status, ['Sent to Client', 'Confirmed', 'Signed']),
      isNull(quotes.archivedAt), isNull(quotes.deletedAt), isNull(leads.deletedAt)))
    .orderBy(desc(quotes.createdAt))
  const seen = rows.filter((q) => (!r.visible || r.visible.has(q.leadId)) && q.amountMinor > 0)
  const sorted = seen.map((q) => q.amountMinor).sort((a, b) => a - b)
  const mid = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2]! : Math.round((sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2)) : null
  return { propertyType: r.lead.propertyType, medianMinor: mid, count: seen.length, rows: seen.slice(0, 6).map(({ id, number, client, amountMinor, status }) => ({ id, number, client, amountMinor, status })) }
}

export type TrimLine = { id: string; name: string; amountMinor: number }

/** The lead's latest quote, read for trims: the lines already marked Optional (out of the total) and the three largest lines that count. */
export async function quoteTrims(leadId: string): Promise<{ quote: { id: string; number: string } | null; optional: TrimLine[]; largest: TrimLine[] } | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S44O — C6) a quote's money is never Marketing's
  const r = await readable(leadId)
  if (!r) return { error: NOT_FOUND }
  const [q] = await db.select({ id: quotes.id, number: quotes.number }).from(quotes)
    .where(and(eq(quotes.leadId, leadId), eq(quotes.kind, 'quote'), isNull(quotes.archivedAt), isNull(quotes.deletedAt))).orderBy(desc(quotes.createdAt)).limit(1)
  if (!q) return { quote: null, optional: [], largest: [] }
  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, q.id))
  const line = (i: (typeof items)[number]): TrimLine => ({ id: i.id, name: i.name, amountMinor: lineTotalMinor(i) })
  const optional = items.filter((i) => i.kind === 'item' && i.optional).map(line)
  const largest = items.filter((i) => counts(i)).map(line).filter((l) => l.amountMinor > 0).sort((a, b) => b.amountMinor - a.amountMinor).slice(0, 3)
  return { quote: q, optional: optional.slice(0, 6), largest }
}
