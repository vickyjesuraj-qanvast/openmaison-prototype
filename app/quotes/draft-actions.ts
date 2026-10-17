'use server'

import { planAllowsNow } from '@/lib/credits/plan-gate'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, priceBookItems, priceBookSections, quotes } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { revalidateLead } from '@/lib/leads/queries'
import { isAccounting } from '@/lib/settings/roles'
import { itemPickable } from '@/lib/company/price-book-rules'
import { parseSavedSection, parseSectionTags } from '@/lib/quotes/items-model'
import { lineTotalMinor } from '@/lib/quotes/math'
import { BRIEF_MAX, draftPlan, type DraftBookSection, type DraftPlan } from '@/lib/quotes/draft'
import { createQuote } from '@/app/leads/quotes-actions'
import { createQuoteItem, createQuoteItems, insertPriceBookSection } from '@/app/quotes/items-actions'
import { orThrow, type Refusal } from '@/lib/company/template-rules'
import { deskRefusal } from '@/lib/quotes/desk'   // (S44Z) the editors' role rule on the server

/*
 * (pending modules S04 — 1.0's Draft with AI; card held:quotes, "Draft with Maison AI as a rule-built first cut") Create Quote › More ways to
 * start › Draft with Maison AI. The brief is read by rule (lib/quotes/draft.ts) over the studio's own My Sections and My Items — nothing calls a
 * model and nothing is metered (1.0 charged nothing for its drafter). `draftQuote` answers the plan for the window to show; `createQuoteFromDraft`
 * reads the brief again on the server (never the browser's lines or prices) and makes the quote: the default template's settings (a Blank
 * Quote's), each saved section in whole, each trade a section of its own with its My Items (their figures, kept linked to the book) or its
 * scope at S$0 to price. The brief travels inside one object.
 */

const cleanBrief = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, BRIEF_MAX) : '')

async function forLead(leadId: unknown): Promise<Refusal | { leadId: string; propertyType: string | null; viewer: Awaited<ReturnType<typeof fetchViewer>> }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) Marketing never prepares a quote — ON_DESK's words
  const viewer = await fetchViewer()
  if (isAccounting(viewer.role)) return { error: 'Only the studio’s team prepares quotes' }
  const id = typeof leadId === 'string' ? leadId : ''
  const [lead] = await db.select({ id: leads.id, propertyType: leads.propertyType }).from(leads).where(and(eq(leads.id, id), isNull(leads.deletedAt))).limit(1)
  if (!lead) return { error: 'This lead is gone' }
  if (!(await canOpenLead(viewer, lead.id))) return { error: 'This lead isn’t one you can open' }
  return { leadId: lead.id, propertyType: lead.propertyType ?? null, viewer }
}

async function planFor(brief: string, propertyType: string | null, viewer: Awaited<ReturnType<typeof fetchViewer>>): Promise<DraftPlan> {
  const [items, sections] = await Promise.all([
    db.select().from(priceBookItems).where(isNull(priceBookItems.deletedAt)),
    db.select().from(priceBookSections).where(isNull(priceBookSections.deletedAt)),
  ])
  const book = items.filter((i) => itemPickable(viewer, i)).map((i) => ({ id: i.id, name: i.name, description: i.description, category: i.category, unit: i.unit, costMinor: i.costMinor, markupMinor: i.markupMinor }))
  const saved: DraftBookSection[] = sections.flatMap((s) => {
    const body = parseSavedSection(s.linesJson)
    if (!body) return []
    const lines = [...body.lines, ...body.subs.flatMap((x) => x.lines)]
    return [{ id: s.id, name: s.name, description: s.description, propertyType: s.propertyType, tags: parseSectionTags(s.tags), lineCount: lines.length,
      totalMinor: lines.reduce((n, l) => n + lineTotalMinor(l), 0), categories: [...new Set(lines.map((l) => l.category).filter((c): c is string => !!c))] }]
  })
  /* (pending modules S19 — 1.0's plan gating: Packages are Pro) on Free the draft reads My Items alone — My Sections are kept for Pro */
  return draftPlan(brief, { propertyType, book, sections: (await planAllowsNow('package_creation')) ? saved : [] })
}

/** The draft for the window to show — nothing is written. */
export async function draftQuote(o: { leadId: string; brief: string }): Promise<Refusal | { plan: DraftPlan }> {
  const got = await forLead(o?.leadId); if ('error' in got) return got
  const brief = cleanBrief(o?.brief)
  if (!brief) return { error: 'Describe the works first' }
  return { plan: await planFor(brief, got.propertyType, got.viewer) }
}

/** Create the quote from the brief. Answers the new quote's id and its counts, for the snackbar. */
export async function createQuoteFromDraft(o: { leadId: string; brief: string }): Promise<Refusal | { id: string; lines: number; toPrice: number }> {
  const got = await forLead(o?.leadId); if ('error' in got) return got
  const brief = cleanBrief(o?.brief)
  if (!brief) return { error: 'Describe the works first' }
  const plan = await planFor(brief, got.propertyType, got.viewer)
  if (!plan.groups.length) return { error: 'Name the rooms or the works — like “kitchen cabinets” or “paint the whole flat”' }
  const id = await orThrow(createQuote(got.leadId, null))
  for (const g of plan.groups) {
    if (g.kind === 'section') { await orThrow(insertPriceBookSection(id, g.sectionId)); continue }   // (S44Z) the editors' answers, refusals thrown on
    const host = await orThrow(createQuoteItem(id, { kind: 'group', name: g.name }))
    for (const l of g.lines.filter((x) => x.priceBookItemId)) await orThrow(createQuoteItem(id, { priceBookItemId: l.priceBookItemId!, parentId: host.id, category: g.name, qty: l.qty }))   // (S42 B-15) the brief's number
    const unpriced = g.lines.filter((x) => !x.priceBookItemId)
    if (unpriced.length) await orThrow(createQuoteItems(id, unpriced.map((l) => ({ name: l.name, unit: l.unit, qty: l.qty, costMinor: 0, markupMinor: 0, category: g.name })), { parentId: host.id }))
  }
  await db.update(quotes).set({ draftBrief: brief }).where(eq(quotes.id, id))
  revalidateLead(got.leadId)
  return { id, lines: plan.lines, toPrice: plan.toPrice }
}
