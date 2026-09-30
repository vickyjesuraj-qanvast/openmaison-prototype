import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadFiles, leads, members, priceBookItems, priceBookSections, quoteFiles, quoteItemComments, quoteItems, quotePayments, quoteTextTemplates, quoteVersions, quotes, type LeadFile, type Member, type PriceBookItem, type PriceBookSection, type Quote, type QuoteItem, type QuoteItemComment, type QuotePayment, type QuoteTextTemplate, type QuoteVersion } from '@/lib/db/schema'
import { fetchQuoteApproval, fetchQuoteRules, fetchStudio, fetchTrades, isApprover } from '@/lib/settings/queries'
import { deriveQuoteActivity, type QuoteEvent } from '@/lib/quotes/activity'
import type { QuoteApproval, QuoteRules, Studio } from '@/lib/settings/types'
import { fetchBrand, fetchQuoteTemplateState, type QuoteTemplateState, reviveSnapshot } from '@/lib/templates/queries'
import type { BrandKit, StudioDetails } from '@/lib/templates/model'
import { fetchPaymentSplits } from '@/lib/company/payment-templates'
import type { PaymentSplit } from '@/lib/quotes/payments'
import { diffQuoteItems, type Diffable } from '@/lib/quotes/diff'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { itemPickable, runsBook } from '@/lib/company/price-book-rules'
import { fetchQuoteContract, type QuoteContract } from './contract-link'
import { fetchFolders } from '@/lib/company/folders'
import type { FolderNode } from '@/lib/folders'

/* Quote editor (1271:40301) — one loader for the page: the quote, its lead, the lead's other quotes (the title chevron
   switches between them), the studio's members (Prepared by) and the lifecycle setting that decides what Send does. */

export type EditorLead = { id: string; name: string; phone: string; email: string | null; propertyType: string; propertyAddress: string | null; estimatedStartDate: Date | null; /** (UX audit Q1) the lead's stage — a quote with the client on a lead before Quote Sent offers the move */ stage: string }
export type QuoteSibling = { id: string; number: string; title: string; status: string }
export type { QuoteContract }
export type QuoteEditorData = {
  contract: QuoteContract | null
  /** (REG-652, price book parity Q-03) Whether the viewer changes the price book — My Sections are theirs to save to. */
  runsBook: boolean
  /** (REG-627, parity Q-30) The team's comments on the quote's lines, oldest first. */
  lineComments: QuoteItemComment[]
  quote: Quote
  lead: EditorLead
  siblings: QuoteSibling[]
  members: Member[]
  me: Member | null
  quoteApproval: QuoteApproval
  /** (REG-584 · 589 · 590) The studio's quote rules, and whether the signed-in member may approve. */
  rules: QuoteRules
  canApprove: boolean
  /** (REG-595) Since the last kept version: how many lines were added, removed and changed — Version History's word. */
  changes: { added: number; removed: number; changed: number } | null
  /** (UX audit Q10) The last kept version's lines (what the diff reads) — the Items table tints what changed since, live as it is edited. */
  prevLines: Diffable[] | null
  /** Items section (REG-415): the quote's lines, the studio's price book ("My Items") and the studio record. */
  items: QuoteItem[]
  priceBook: PriceBookItem[]
  /** (REG-566) The studio's saved sections — the Add Item popover's My Sections. */
  priceBookSections: PriceBookSection[]
  /** (REG-561) The studio's trades (Settings › Quotes) — the Category menu's base list. */
  trades: string[]
  /** (REG-618, parity Q-25) The lead's members — "Prepared by: every member on the lead" in the live client view. */
  teamIds: string[]
  /** (REG-565) The quote's earlier versions, newest first — the header's Version History. */
  versions: QuoteVersion[]
  studio: Studio
  /** The lead's files (not trashed) — the Add Image modal's "Your files" (1271:41016). */
  files: LeadFile[]
  /** Payment Schedule (1238:29290, REG-418): the quote's milestones in order. */
  payments: QuotePayment[]
  /** Files section (1238:32938, REG-419): the lead's files this quote carries, in the order they were attached. */
  quoteFiles: LeadFile[]
  /** Terms and Conditions · Additional Notes (REG-420): the studio's template library, both kinds — the live ones (REG-538). */
  textTemplates: QuoteTextTemplate[]
  /** (REG-538) The Payment Schedule's presets ▾: the studio's payment templates (Company › Templates › Payments), presets first. */
  paymentSplits: PaymentSplit[]
  /** Activity (REG-421): the quote's trail, newest first. */
  activity: QuoteEvent[]
  /** (REG-489) The published templates General Info can pick, and the one this quote prints through with its pinned version. */
  templateState: QuoteTemplateState
  /** (REG-497) The brand kit and company details the live client view draws with. */
  brand: BrandKit
  studioDetails: StudioDetails
  /** (REG-664) The folders of the libraries this page picks from — My Templates (T&Cs & Notes), the payment presets, the Price book's two tabs. */
  libraryFolders: { texts: FolderNode[]; payments: FolderNode[]; bookItems: FolderNode[]; bookSections: FolderNode[] }
  now: number
}

export async function fetchQuoteEditor(quoteId: string): Promise<QuoteEditorData | null> {
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
  if (!quote) return null
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, quote.leadId))) return null   /* (REG-625, parity §8.2 · E-135) Who sees leads reaches the quote's own URL: not your lead, not your quote */
  const [leadRows, siblings, team, quoteApproval, items, priceBook, studio, files, payments, attachedRows, textTemplates, templateState, brandSetting, paymentSplits, sections, trades, versions, rules] = await Promise.all([
    db.select({ id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, estimatedStartDate: leads.estimatedStartDate, stage: leads.stage }).from(leads).where(eq(leads.id, quote.leadId)),
    db.select({ id: quotes.id, number: quotes.number, title: quotes.title, status: quotes.status }).from(quotes)
      .where(and(eq(quotes.leadId, quote.leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt)),
    db.select().from(members),
    fetchQuoteApproval(),
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.position), asc(quoteItems.createdAt)),
    db.select().from(priceBookItems).where(isNull(priceBookItems.deletedAt)).orderBy(asc(priceBookItems.name)),
    fetchStudio(),
    db.select().from(leadFiles).where(and(eq(leadFiles.leadId, quote.leadId), isNull(leadFiles.deletedAt))).orderBy(asc(leadFiles.createdAt)),
    db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(asc(quotePayments.position), asc(quotePayments.createdAt)),
    db.select({ file: leadFiles, at: quoteFiles.createdAt }).from(quoteFiles).innerJoin(leadFiles, eq(leadFiles.id, quoteFiles.fileId)).where(and(eq(quoteFiles.quoteId, quoteId), isNull(leadFiles.deletedAt))).orderBy(asc(quoteFiles.createdAt)),
    db.select().from(quoteTextTemplates).where(isNull(quoteTextTemplates.deletedAt)).orderBy(asc(quoteTextTemplates.createdAt)),
    fetchQuoteTemplateState(quote),
    fetchBrand(),
    fetchPaymentSplits(),
    db.select().from(priceBookSections).where(isNull(priceBookSections.deletedAt)).orderBy(asc(priceBookSections.name)),
    fetchTrades(),
    db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quoteId)).orderBy(asc(quoteVersions.version)),
    fetchQuoteRules(),
  ])
  const assignees = await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, quote.leadId))
  const lead = leadRows[0]
  if (!lead) return null
  const me = team.find((m) => m.isYou) ?? null
  const canApprove = await isApprover(me?.id, me?.role)
  const lastKept = versions[versions.length - 1]
  const prev = lastKept ? reviveSnapshot(lastKept.snapshotJson) : null
  const changes = prev ? diffQuoteItems(prev.items, items).counts : null
  const lineComments = await db.select().from(quoteItemComments).where(eq(quoteItemComments.quoteId, quoteId)).orderBy(asc(quoteItemComments.createdAt))   // (REG-627)
  const contract = await fetchQuoteContract(quoteId)
  const node = (f: { id: string; name: string; parentId: string | null }) => ({ id: f.id, name: f.name, parentId: f.parentId })
  const [fTexts, fPayments, fItems, fSections] = await Promise.all([fetchFolders('texts'), fetchFolders('payments'), fetchFolders('book-items'), fetchFolders('book-sections')])   // (REG-664)
  const libraryFolders = { texts: fTexts.map(node), payments: fPayments.map(node), bookItems: fItems.map(node), bookSections: fSections.map(node) }
  /* (REG-652, price book parity Q-04) The Add Item popover offers the live book and the viewer's own proposals. */
  const prevLines: Diffable[] | null = prev ? prev.items.map((i) => ({ id: i.id, parentId: i.parentId, kind: i.kind, status: i.status, name: i.name, qty: i.qty, costMinor: i.costMinor, markupMinor: i.markupMinor, discountPct: i.discountPct, position: i.position })) : null
  return { prevLines, libraryFolders, contract, lineComments, quote, lead, siblings, members: team, me, quoteApproval, rules, canApprove, changes, items, priceBook: priceBook.filter((p) => itemPickable(viewer, p)), priceBookSections: sections, runsBook: runsBook(viewer), trades: trades.trades, teamIds: assignees.map((a) => a.memberId), versions: [...versions].reverse(), studio, files, payments, quoteFiles: attachedRows.map((r) => r.file), textTemplates, paymentSplits, activity: deriveQuoteActivity(quote, items, payments, attachedRows.map((r) => ({ createdAt: r.at })), team, versions), templateState, brand: brandSetting.kit, studioDetails: brandSetting.details, now: Date.now() }
}

