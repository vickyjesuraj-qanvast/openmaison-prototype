import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leads, members, priceBookItems, quoteFiles, quoteItems, quotePayments, quoteTextTemplates, quotes, type LeadFile, type Member, type PriceBookItem, type Quote, type QuoteItem, type QuotePayment, type QuoteTextTemplate } from '@/lib/db/schema'
import { fetchQuoteApproval, fetchStudio } from '@/lib/settings/queries'
import { deriveQuoteActivity, type QuoteEvent } from '@/lib/quotes/activity'
import type { QuoteApproval, Studio } from '@/lib/settings/types'
import { fetchBrand, fetchQuoteTemplateState, type QuoteTemplateState } from '@/lib/templates/queries'
import type { BrandKit, StudioDetails } from '@/lib/templates/model'

/* Quote editor (1271:40301) — one loader for the page: the quote, its lead, the lead's other quotes (the title chevron
   switches between them), the studio's members (Prepared by) and the lifecycle setting that decides what Send does. */

export type EditorLead = { id: string; name: string; phone: string; email: string | null; propertyType: string; propertyAddress: string | null; estimatedStartDate: Date | null }
export type QuoteSibling = { id: string; number: string; title: string; status: string }
export type QuoteEditorData = {
  quote: Quote
  lead: EditorLead
  siblings: QuoteSibling[]
  members: Member[]
  me: Member | null
  quoteApproval: QuoteApproval
  /** Items section (REG-415): the quote's lines, the studio's price book ("My Items") and the studio record. */
  items: QuoteItem[]
  priceBook: PriceBookItem[]
  studio: Studio
  /** The lead's files (not trashed) — the Add Image modal's "Your files" (1271:41016). */
  files: LeadFile[]
  /** Payment Schedule (1238:29290, REG-418): the quote's milestones in order. */
  payments: QuotePayment[]
  /** Files section (1238:32938, REG-419): the lead's files this quote carries, in the order they were attached. */
  quoteFiles: LeadFile[]
  /** Terms and Conditions · Additional Notes (REG-420): the studio's template library, both kinds. */
  textTemplates: QuoteTextTemplate[]
  /** Activity (REG-421): the quote's trail, newest first. */
  activity: QuoteEvent[]
  /** (REG-489) The published templates General Info can pick, and the one this quote prints through with its pinned version. */
  templateState: QuoteTemplateState
  /** (REG-497) The brand kit and company details the live client view draws with. */
  brand: BrandKit
  studioDetails: StudioDetails
  now: number
}

export async function fetchQuoteEditor(quoteId: string): Promise<QuoteEditorData | null> {
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
  if (!quote) return null
  const [leadRows, siblings, team, quoteApproval, items, priceBook, studio, files, payments, attachedRows, textTemplates, templateState, brandSetting] = await Promise.all([
    db.select({ id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, estimatedStartDate: leads.estimatedStartDate }).from(leads).where(eq(leads.id, quote.leadId)),
    db.select({ id: quotes.id, number: quotes.number, title: quotes.title, status: quotes.status }).from(quotes)
      .where(and(eq(quotes.leadId, quote.leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt)),
    db.select().from(members),
    fetchQuoteApproval(),
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.position), asc(quoteItems.createdAt)),
    db.select().from(priceBookItems).orderBy(asc(priceBookItems.name)),
    fetchStudio(),
    db.select().from(leadFiles).where(and(eq(leadFiles.leadId, quote.leadId), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt)),
    db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(asc(quotePayments.position), asc(quotePayments.createdAt)),
    db.select({ file: leadFiles, at: quoteFiles.createdAt }).from(quoteFiles).innerJoin(leadFiles, eq(leadFiles.id, quoteFiles.fileId)).where(and(eq(quoteFiles.quoteId, quoteId), isNull(leadFiles.deletedAt))).orderBy(asc(quoteFiles.createdAt)),
    db.select().from(quoteTextTemplates).orderBy(asc(quoteTextTemplates.createdAt)),
    fetchQuoteTemplateState(quote),
    fetchBrand(),
  ])
  const lead = leadRows[0]
  if (!lead) return null
  return { quote, lead, siblings, members: team, me: team.find((m) => m.isYou) ?? null, quoteApproval, items, priceBook, studio, files, payments, quoteFiles: attachedRows.map((r) => r.file), textTemplates, activity: deriveQuoteActivity(quote, items, payments, attachedRows.map((r) => ({ createdAt: r.at })), team), templateState, brand: brandSetting.kit, studioDetails: brandSetting.details, now: Date.now() }
}
