import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadFiles, leads, members, priceBookItems, priceBookSections, quoteFiles, quoteItemComments, quoteItems, quotePayments, quoteTextTemplates, quoteVersions, quotes, type LeadFile, type Member, type PriceBookItem, type PriceBookSection, type Quote, type QuoteItem, type QuoteItemComment, type QuotePayment, type QuoteTextTemplate, type QuoteVersion } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member
import { fetchQuoteApproval, fetchQuoteRules, fetchStudio, fetchTrades, fetchUnits, isApprover } from '@/lib/settings/queries'
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
import { projects } from '@/lib/db/schema'
import { moneySummaryOf } from '@/lib/projects/money-queries'
import { isApprovedVariation } from '@/lib/projects/money'
import { marksVariationApproved } from '@/lib/projects/invoices-model'
import { completedBlock } from '@/lib/projects/handover-model'
import type { FolderNode } from '@/lib/folders'
import { bookItemsFor, linesFor, pricedFor, sectionFor, sightOf, snapshotFor } from '@/lib/quotes/cost-sight'   // (pending modules S41b-1)
import { parseSavedSection } from '@/lib/quotes/items-model'

/* Quote editor (1271:40301) — one loader for the page: the quote, its lead, the lead's other quotes (the title chevron
   switches between them), the studio's members (Prepared by) and the lifecycle setting that decides what Send does. */

export type EditorLead = { id: string; name: string; phone: string; email: string | null; propertyType: string; propertyAddress: string | null; estimatedStartDate: Date | null; /** (UX audit Q1) the lead's stage — a quote with the client on a lead before Quote Sent offers the move */ stage: string; /** (pending modules S05) a commercial client's company and UEN — the client pane prints them */ companyName?: string | null; companyUen?: string | null }
export type QuoteSibling = { id: string; number: string; title: string; status: string }
/** (Projects round 5, F-06) A variation order's project: the editor's crumb, its words ("Change to the contract") and the contract it moves. */
export type QuoteVariation = {
  projectId: string; projectName: string; projectNumber: string; /** the contract value without this order */ contractMinor: number; approved: boolean
  /** (fix-D, D-08) the signed quote's number it changes — its print says "to contract OM-…" */ contractNumber?: string | null
  /** (REG-1066, F-07) Whether the viewer records a client's approval given outside the link (an Owner or an Admin) — the status pill's
      Confirmed opens *Mark as approved by the client* for them and says the rule to anyone else. */
  marks: boolean
  /** (REG-1066 · REG-1022) The project is completed — its money, and so this order's approval, stay as they are (the rule's words). */
  locked: string | null
  /** (gaps build B, item 7 — 1.0 G-149) the order's "Reason for the change", printed under its title */
  reason?: string | null
  /** (gaps build B, item 14) the studio's invoice paper the order prints (its notes and terms block), null when it says nothing */
  paper?: { header: string; footer: string; termsTitle: string; terms: string; /* (parity map, MI-065) */ acceptance?: { title: string; text: string } | null; accent?: string | null } | null
}
export type { QuoteContract }
export type QuoteEditorData = {
  /** (pending modules S41b-1 — 1.0's Cost & Margin Visibility) Whether the viewer sees cost, mark-up and margin (Settings › Roles & access ›
      Who sees costs and margins). When not, every line, book item, saved section and kept version below was sent with its cost folded into
      its price (lib/quotes/cost-sight.ts) and the screens leave out what they would draw from cost. */
  costs: boolean
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
  /** (S44I — M9) the studio's own units (Settings › Quotes & pricing › Units) */
  units: string[]
  /** (S44I — NB-06) the project this quote is the base of — its issuing entity stays */
  billsProject: { number: string; from: string } | null
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
  /** (Projects round 5) Set when the quote is a variation order (`quotes.kind` 'variation'); null for every other quote. */
  variation?: QuoteVariation | null
  now: number
}

export async function fetchQuoteEditor(quoteId: string): Promise<QuoteEditorData | null> {
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
  if (!quote) return null
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, quote.leadId))) return null   /* (REG-625, parity §8.2 · E-135) Who sees leads reaches the quote's own URL: not your lead, not your quote */
  const [leadRows, siblings, team, quoteApproval, items, priceBook, studio, files, payments, attachedRows, textTemplates, templateState, brandSetting, paymentSplits, sections, trades, versions, rules] = await Promise.all([
    db.select({ id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, estimatedStartDate: leads.estimatedStartDate, stage: leads.stage, companyName: leads.companyName, companyUen: leads.companyUen }).from(leads).where(eq(leads.id, quote.leadId)),
    db.select({ id: quotes.id, number: quotes.number, title: quotes.title, status: quotes.status }).from(quotes)
      .where(and(eq(quotes.leadId, quote.leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt), eq(quotes.kind, quote.kind === 'variation' ? 'variation' : 'quote'))).orderBy(asc(quotes.createdAt)),   // (Projects round 5) a variation order switches among its project's
    db.select().from(members).then(withYou),
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
  const units = (await fetchUnits()).units   // (S44I — M9) the studio's own units, every unit picker's list
  const bills = quote.kind === 'variation' ? null : await (await import('@/lib/quotes/bills-project')).billsProjectOf(quote)   // (S44I — NB-06)
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
  /* (Projects round 5, F-06) a variation order knows its project and the contract it changes (lib/projects/money.ts reads the same) */
  let variation: QuoteVariation | null = null
  if (quote.kind === 'variation' && quote.projectId) {
    const [p] = await db.select().from(projects).where(eq(projects.id, quote.projectId)).limit(1)
    if (p) {
      const m = await moneySummaryOf(p)
      const approved = isApprovedVariation(quote.status)
      const contractNumber = p.quoteId ? (await db.select({ n: quotes.number }).from(quotes).where(eq(quotes.id, p.quoteId)).limit(1))[0]?.n ?? null : null   // (fix-D, D-08) what the print says it changes
      variation = { projectId: p.id, projectName: p.name, projectNumber: p.number, contractMinor: m.contractMinor - (approved ? quote.amountMinor : 0), approved, marks: marksVariationApproved(viewer.role), locked: completedBlock(p.stage, 'money'), contractNumber, reason: quote.changeReason ?? null,
        paper: await (await import('@/lib/projects/invoices-paper-queries')).variationPaperFor(brandSetting.details.entities, quote.issuingEntity ?? null) }
    }
  }
  /* (pending modules S41b-1) what this member's browser is sent: a hidden member's lines, book items, saved sections and kept versions carry
     their cost folded into their price; a rebate goes to an Owner alone (REG-596) */
  const sight = sightOf(viewer)
  const prevLines: Diffable[] | null = prev ? prev.items.map((i0) => { const i = pricedFor(i0, sight); return { id: i.id, parentId: i.parentId, kind: i.kind, status: i.status, name: i.name, qty: i.qty, costMinor: i.costMinor, markupMinor: i.markupMinor, discountPct: i.discountPct, position: i.position } }) : null
  return { costs: sight.costs, prevLines, libraryFolders, contract, lineComments, quote, lead, siblings, members: team, me, quoteApproval, rules, canApprove, changes, items: linesFor(items, sight), priceBook: bookItemsFor(priceBook.filter((p) => itemPickable(viewer, p)), sight), priceBookSections: sections.map((x) => sectionFor(x, sight, parseSavedSection)), runsBook: runsBook(viewer), trades: trades.trades, units, billsProject: bills ? { number: bills.number, from: bills.from } : null, teamIds: assignees.map((a) => a.memberId), versions: [...versions].reverse().map((v) => ({ ...v, snapshotJson: snapshotFor(v.snapshotJson, sight) })), studio, files, payments, quoteFiles: attachedRows.map((r) => r.file), textTemplates, paymentSplits, activity: deriveQuoteActivity(quote, items, payments, attachedRows.map((r) => ({ createdAt: r.at })), team, versions), templateState, brand: brandSetting.kit, studioDetails: brandSetting.details, variation, now: Date.now() }
}

