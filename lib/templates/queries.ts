import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { docDataFor, sightOf } from '@/lib/quotes/cost-sight'   // (pending modules S41b-1)
import { leadAssignees, leads, members, projects, quoteItems, quotePayments, quoteTemplateVersions, quoteTemplates, quoteTextTemplates, quoteVersions, quotes, settings, type Member, type Quote, type QuoteItem, type QuotePayment, type QuoteTemplate } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member
import { fetchQuoteRules, fetchStudio, fetchTemplateApproval, fetchTradeNotes, fetchTrades, isApprover } from '@/lib/settings/queries'
import type { TemplateApproval } from '@/lib/settings/types'
import { fetchPaymentSplits } from '@/lib/company/payment-templates'
import type { PaymentSplit } from '@/lib/quotes/payments'
import { isPaper, parseDefaults, parseDesign, isTemplateStatus, type BrandKit, type StudioDetails, type TemplateDefaults, type TemplateDesign, type TemplateRecord, type TemplateSummary, type TemplateVersion } from './model'
import { BRAND_KEY, DEFAULT_BRAND_SETTING, parseBrandSetting, type BrandSetting } from './brand'
import { presetByKey } from './presets'
import { clientViewFromDesign, parseClientView, type ClientView } from './client-view'
import { docDataFromRecords, sampleFor, type DocData, toDocItem } from './data'
import type { PickerExtras } from './picker'

/** (REG-538) What every picker names beside a template's defaults: the payment library's names and the live text templates' titles. */
export async function pickerExtras(): Promise<PickerExtras> {
  const [splits, texts, folders] = await Promise.all([
    fetchPaymentSplits(),
    db.select({ id: quoteTextTemplates.id, kind: quoteTextTemplates.kind, title: quoteTextTemplates.title }).from(quoteTextTemplates).where(isNull(quoteTextTemplates.deletedAt)).orderBy(asc(quoteTextTemplates.createdAt)),
    fetchFolders('quotes'),   // (REG-664)
  ])
  return { splits: splits.map((s) => ({ id: s.id, name: s.name })), texts, folders: folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })) }
}
import { readiness, type Readiness } from './readiness'
import { pickerTemplates, type PickerData } from './picker'
import { changeSummary, diffChain, diffPayments, diffQuoteItems, paymentChain, paymentsForDiff, summaryText, versionState, withRemoved, type DiffPayment, type SummaryState } from '@/lib/quotes/diff'
import { fetchQuoteContract } from '@/lib/quotes/contract-link'
import { fetchFolders } from '@/lib/company/folders'
import { fetchFontFaces } from '@/lib/company/studio-fonts'

/* Company › Templates › Quote templates (REG-485): the studio's templates, one template with its draft and versions, and
   the document data the preview and the thumbnails render through them. A template whose design was never saved (the
   three seeded rows before `npm run db:repair`) wears the Letter house style. */

/** The design a template without a saved one prints — the Letter house style. */
export const fallbackDesign = (): TemplateDesign => presetByKey('letter').design()

/** The brand kit (settings key `brand`) with the studio record's name and phone on top — those two live in Settings already. */
export async function fetchBrand(): Promise<BrandSetting> {
  const [row, studio, tradeNotes, rules, faces] = await Promise.all([db.select().from(settings).where(eq(settings.key, BRAND_KEY)).limit(1), fetchStudio(), fetchTradeNotes(), fetchQuoteRules(), fetchFontFaces()])
  let setting = DEFAULT_BRAND_SETTING
  if (row[0]) { try { setting = parseBrandSetting(JSON.parse(row[0].value)) } catch { setting = DEFAULT_BRAND_SETTING } }
  // (REG-617, parity Q-08) The trades' notes ride with the details so every renderer — preview, PDF, client view, the editor's sample — prints them.
  // (pending modules S11) The studio's own fonts ride with the kit, so every renderer can print them.
  return { kit: faces.length ? { ...setting.kit, faces } : setting.kit, details: { ...setting.details, name: studio.name, phone: studio.phone || setting.details.phone, tradeNotes, preparedByMode: rules.preparedBy, gstRegistered: studio.gstRegistered, gstPct: studio.gstPct } }   // (REG-618, parity Q-25) · (REG-645) the studio's GST registration · (S44Q, row 256) and its rate
}

const stamp = (d: Date | null | undefined) => (d ? d.getTime() : null)
const who = (id: string | null | undefined, team: Member[]) => { const m = id ? team.find((x) => x.id === id) : null; return m ? { name: m.name, color: m.color } : null }

function summary(row: QuoteTemplate, usedBy: number, team: Member[]): TemplateSummary {
  const published = parseDesign(row.designJson, fallbackDesign())
  let draft: { design: TemplateDesign; defaults: string } | null = null
  if (row.draftJson) { try { const j = JSON.parse(row.draftJson) as { design?: unknown; defaults?: unknown }; draft = { design: parseDesign(JSON.stringify(j.design ?? null), published), defaults: JSON.stringify(parseDefaults(JSON.stringify(j.defaults ?? null))) } } catch { draft = null } }
  const status = isTemplateStatus(row.status) ? row.status : 'published'
  // (REG-577) "Edited since vN" only when the draft differs from what is published — a draft equal to it is none.
  const hasDraft = !!draft && (status === 'draft' || JSON.stringify(draft.design) !== JSON.stringify(published) || draft.defaults !== JSON.stringify(parseDefaults(row.defaultsJson)))
  return {
    id: row.id, name: row.name, status, version: row.version, isDefault: row.isDefault, paper: isPaper(row.paper) ? row.paper : 'A4',
    updatedAt: stamp(row.updatedAt) ?? stamp(row.publishedAt) ?? stamp(row.createdAt), updatedBy: who(row.updatedBy, team), publishedAt: stamp(row.publishedAt), lastUsedAt: stamp(row.lastUsedAt),
    usedBy, hasDraft, sourceFile: row.sourceFile, design: status === 'draft' && draft ? draft.design : published,
    submitted: row.submittedAt ? { by: who(row.submittedBy, team), at: row.submittedAt.getTime(), note: row.submitNote ?? '' } : null, reviewNote: row.reviewNote,
    deletedAt: stamp(row.deletedAt), deletedBy: who(row.deletedBy, team), folderId: row.folderId ?? null, createdAt: row.createdAt.getTime(),
  }
}

export type TemplatesData = { templates: TemplateSummary[]; /** (REG-502) the soft-deleted ones, for the Deleted templates sheet */ deleted: TemplateSummary[]; brand: BrandKit; studio: StudioDetails; sample: DocData; now: number; /** (REG-501) the studio's approval setting — the gallery hides an empty Awaiting filter when it is off */ approval: TemplateApproval
  /** (REG-646, settings parity Q-07) Whether the viewer runs the studio: the default, rename and delete are theirs, as are Profile and the brand kit. */
  canRun: boolean }

/** The gallery: every template that is not archived first, archived last; usage = live quotes that started from it. */
export async function fetchTemplates(): Promise<TemplatesData> {
  const [rows, team, uses, brand, approval, viewer] = await Promise.all([
    db.select().from(quoteTemplates).orderBy(desc(quoteTemplates.isDefault), desc(quoteTemplates.updatedAt), asc(quoteTemplates.createdAt)),
    db.select().from(members).then(withYou),
    db.select({ templateId: quotes.templateId, n: sql<number>`count(*)` }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId)).where(and(isNull(quotes.deletedAt), isNull(quotes.archivedAt), isNull(leads.deletedAt), eq(quotes.kind, 'quote'))).groupBy(quotes.templateId),   // (REG-538) quotes on a deleted lead do not count
    fetchBrand(),
    fetchTemplateApproval(),
    fetchViewer(),
  ])
  const usedBy = new Map(uses.map((u) => [u.templateId, u.n]))
  const blank = usedBy.get(null) ?? 0   // (REG-538) a quote with no template prints through the studio default: it counts for it
  const all = rows.map((r) => summary(r, (usedBy.get(r.id) ?? 0) + (r.isDefault && !r.deletedAt ? blank : 0), team))
  const templates = all.filter((t) => !t.deletedAt)
  const deleted = all.filter((t) => !!t.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
  const me = team.find((m) => m.id === viewer.id) ?? null   // (pending modules S31) the sample is prepared by who looks at it (another studio's)
  return { approval, canRun: viewer.role === 'Owner' || viewer.role === 'Admin', templates, deleted, brand: brand.kit, studio: brand.details, sample: sampleFor(brand.details, me), now: Date.now() }
}

export async function fetchTemplate(id: string): Promise<TemplateRecord | null> {
  const [row] = await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, id))
  if (!row) return null
  /* (S42 D-02) one number for one fact: the editor counts what the gallery's card counts (REG-538) — live quotes on a live lead, and for the
     studio's default the quotes with no template too, which print through it */
  const printsWith = (r: QuoteTemplate) => db.select({ n: sql<number>`count(*)` }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(r.isDefault && !r.deletedAt ? or(eq(quotes.templateId, r.id), isNull(quotes.templateId)) : eq(quotes.templateId, r.id), isNull(quotes.deletedAt), isNull(quotes.archivedAt), isNull(leads.deletedAt), eq(quotes.kind, 'quote')))
  const [team, versions, uses] = await Promise.all([
    db.select().from(members).then(withYou),
    db.select().from(quoteTemplateVersions).where(eq(quoteTemplateVersions.templateId, id)).orderBy(desc(quoteTemplateVersions.version)),
    printsWith(row),   // (fix-G, G-41) "used by n quotes" counts quotes (REG-1000)
  ])
  const s = summary(row, Number(uses[0]?.n ?? 0), team)
  const published = parseDesign(row.designJson, fallbackDesign())
  const defaults = parseDefaults(row.defaultsJson)
  let draft: TemplateRecord['draft'] = null
  if (row.draftJson) {
    try {
      const j = JSON.parse(row.draftJson) as { design?: unknown; defaults?: unknown }
      draft = { design: parseDesign(JSON.stringify(j.design ?? null), published), defaults: parseDefaults(JSON.stringify(j.defaults ?? null)), updatedAt: stamp(row.draftUpdatedAt) ?? Date.now() }
    } catch { draft = null }
  }
  const history: TemplateVersion[] = versions.map((v) => ({ version: v.version, note: v.note ?? '', publishedAt: v.publishedAt.getTime(), publishedBy: who(v.publishedBy, team) }))
  return { ...s, design: published, draft, defaults, versions: history, note: row.note ?? '' }
}

export type QuotePick = { id: string; number: string; title: string; leadName: string; status: string }
export type TemplateEditorData = {
  template: TemplateRecord
  brand: BrandKit
  studio: StudioDetails
  sample: DocData
  /** Recent live quotes the canvas can render with ("Preview with"). */
  quotes: QuotePick[]
  /** (Dane UAT 3.30) with their bodies: the canvas lays the chosen Terms and Notes over the sample quote */
  textTemplates: { id: string; kind: string; title: string; body: string }[]
  paymentPresets: { key: string; label: string }[]
  /** (Dane UAT 3.30) the Payments library's splits with their milestones — the canvas prices the chosen one on the sample's total */
  paymentSplits: PaymentSplit[]
  /** (Dane UAT, Figma 1517:21) the studio's trades (Settings › Quotes & pricing), named under "Group the items by" */
  trades: string[]
  me: { id: string; name: string; role: string } | null
  /** (REG-501) The studio's approval policy and whether the viewer can approve (Owner / Admin). */
  approval: TemplateApproval
  canApprove: boolean
  now: number
}

export async function fetchTemplateEditor(id: string): Promise<TemplateEditorData | null> {
  const template = await fetchTemplate(id)
  if (!template) return null
  const [brand, recent, texts, team, approval, trades] = await Promise.all([
    fetchBrand(),
    /* (pending modules S41b-1 — found on the way) Preview with offers the quotes this member may open (Who sees leads), not every studio quote */
    fetchViewer().then(visibleLeadIds).then((seen) => db.select({ id: quotes.id, number: quotes.number, title: quotes.title, leadName: leads.name, status: quotes.status, leadId: quotes.leadId }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
      .where(and(isNull(quotes.deletedAt), isNull(quotes.archivedAt), isNull(leads.deletedAt), eq(quotes.kind, 'quote'))).orderBy(desc(quotes.updatedAt), desc(quotes.createdAt)).limit(seen ? 200 : 12)
      .then((rows) => rows.filter((r) => !seen || seen.has(r.leadId)).slice(0, 12).map(({ leadId: _l, ...r }) => r))),
    db.select({ id: quoteTextTemplates.id, kind: quoteTextTemplates.kind, title: quoteTextTemplates.title, body: quoteTextTemplates.body }).from(quoteTextTemplates).where(isNull(quoteTextTemplates.deletedAt)).orderBy(asc(quoteTextTemplates.createdAt)),
    db.select().from(members).then(withYou),
    fetchTemplateApproval(),
    fetchTrades(),
  ])
  const splits = await fetchPaymentSplits()   // (REG-538) the Payment schedule select reads the library
  const me = team.find((m) => m.isYou) ?? null
  return {
    approval, canApprove: await isApprover(me?.id, me?.role),   // (REG-590) the backup approver counts
    template, brand: brand.kit, studio: brand.details, sample: sampleFor(brand.details, me), quotes: recent, textTemplates: texts,
    paymentPresets: splits.map((p) => ({ key: p.id, label: p.name })), paymentSplits: splits, trades: trades.trades, me: me ? { id: me.id, name: me.name, role: me.role } : null, now: Date.now(),
  }
}

/** (REG-495) The quote or lead the template editor was opened from — names for the origin chip and Back. */
export async function fetchEditorOrigin(o: { quoteId?: string; leadId?: string }): Promise<{ quote?: { id: string; number: string; leadName: string; status: string; templateId: string | null }; lead?: { id: string; name: string } }> {
  if (o.quoteId) {
    const [row] = await db.select({ id: quotes.id, number: quotes.number, status: quotes.status, templateId: quotes.templateId, leadName: leads.name }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId)).where(and(eq(quotes.id, o.quoteId), isNull(quotes.deletedAt)))
    return row ? { quote: row } : {}
  }
  if (o.leadId) {
    const [row] = await db.select({ id: leads.id, name: leads.name }).from(leads).where(and(eq(leads.id, o.leadId), isNull(leads.deletedAt)))
    return row ? { lead: row } : {}
  }
  return {}
}

/** (REG-565) A kept version's snapshot, its dates revived (JSON turned them into ISO strings). */
export function reviveSnapshot(json: string): { quote: Quote; items: QuoteItem[]; payments: QuotePayment[] } | null {
  try {
    const revive = (o: Record<string, unknown>) => { for (const k of Object.keys(o)) { const v = o[k]; if ((k.endsWith('At') || k === 'validUntil') && typeof v === 'string') { const d = new Date(v); if (Number.isFinite(d.getTime())) o[k] = d } } return o }
    const raw = JSON.parse(json) as { quote?: Record<string, unknown>; items?: Record<string, unknown>[]; payments?: Record<string, unknown>[] }
    if (!raw.quote || !Array.isArray(raw.items) || !Array.isArray(raw.payments)) return null
    /* (S44O — call C3) a version kept before the GST rule was stamped went out with its GST rounded per line — it prints as it went */
    if (!('gstRule' in raw.quote)) raw.quote.gstRule = 'line'
    return { quote: revive(raw.quote) as unknown as Quote, items: raw.items.map((i) => revive(i) as unknown as QuoteItem), payments: raw.payments.map((p) => revive(p) as unknown as QuotePayment) }
  } catch { return null }
}
export type KeptVersion = { version: number; current: number; at: Date; by: { name: string; color: string } | null; note: string | null; status: string; amountMinor: number }
/** (REG-565) A quote's kept versions, newest first — Version History. */
export async function fetchQuoteVersions(quoteId: string): Promise<{ id: string; version: number; at: Date; by: { name: string; color: string } | null; note: string | null; status: string; amountMinor: number }[]> {
  const [rows, team] = await Promise.all([db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quoteId)).orderBy(desc(quoteVersions.version)), db.select().from(members).then(withYou)])
  return rows.map((r) => { const snap = reviveSnapshot(r.snapshotJson); return { id: r.id, version: r.version, at: r.createdAt, by: who(r.createdBy, team), note: r.note, status: snap?.quote.status ?? '', amountMinor: snap?.quote.amountMinor ?? 0 } })
}

/** (pending modules S41b-1) The template editor's Preview with: one quote's document data for the signed-in member — only a quote whose lead
    they may open (Who sees leads), its lines as they may see them (no cost, mark-up or rebate for whoever doesn't see costs). */
export async function fetchQuoteDocDataForViewer(quoteId: string): Promise<DocData | null> {
  const [q] = await db.select({ leadId: quotes.leadId }).from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt))).limit(1)
  if (!q) return null
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, q.leadId))) return null
  const d = await fetchQuoteDocData(quoteId)
  return d ? docDataFor(d, sightOf(viewer)) : null
}

/** One quote's document data from its records (the preview, the thumbnails, the editor's "Preview with") — or, with `version`, from the kept snapshot of that version (REG-565). */
export async function fetchQuoteDocData(quoteId: string, version?: number): Promise<DocData | null> {
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
  if (!quote) return null
  const [leadRows, team, liveItems, livePayments, brand, assignees] = await Promise.all([
    db.select({ name: leads.name, phone: leads.phone, email: leads.email, companyName: leads.companyName, companyUen: leads.companyUen, propertyType: leads.propertyType }).from(leads).where(eq(leads.id, quote.leadId)),   // (S42 B-05)   // (pending modules S05) the company prints
    db.select().from(members).then(withYou),
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.position), asc(quoteItems.createdAt)),
    db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(asc(quotePayments.position), asc(quotePayments.createdAt)),
    fetchBrand(),
    db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, quote.leadId)),   // (REG-618, parity Q-25)
  ])
  const lead = leadRows[0]
  if (!lead) return null
  const teamIds = assignees.map((a) => a.memberId)
  const signer = quote.status === 'Signed' ? (await fetchQuoteContract(quoteId))?.signer ?? null : null   // (REG-632, contracts parity Q-09)
  /* (fix-D, D-08 · G-12) a variation order prints the contract it changes */
  const variationOf = quote.kind === 'variation' && quote.projectId ? (await db.select({ n: quotes.number }).from(projects).innerJoin(quotes, eq(quotes.id, projects.quoteId)).where(eq(projects.id, quote.projectId)).limit(1))[0]?.n ?? null : null
  /* (gaps build B, item 14) a variation order prints the studio's invoice paper — its entity's own, else the studio's */
  const variationPaper = quote.kind === 'variation' ? await (await import('@/lib/projects/invoices-paper-queries')).variationPaperFor(brand.details.entities, quote.issuingEntity ?? null) : null
  if (version && version < quote.version) {
    const [row] = await db.select().from(quoteVersions).where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.version, version)))
    const snap = row ? reviveSnapshot(row.snapshotJson) : null
    if (snap) return docDataFromRecords({ quote: snap.quote, lead, studio: brand.details, members: team, items: snap.items, payments: snap.payments, teamIds, variationOf, variationPaper })
  }
  return docDataFromRecords({ quote, lead, studio: brand.details, members: team, items: liveItems, payments: livePayments, teamIds, signer, variationOf, variationPaper })
}

export type QuotePreviewData = {
  quote: { id: string; number: string; title: string; status: string; leadId: string; leadName: string; templateId: string | null; templateVersion: number | null; visibility: string; version: number; /** (REG-587) */ confirmedAt: number | null; confirmedBy: string | null; /** (Projects round 5) quote | variation */ kind?: string; amountMinor?: number
    /** (pending modules S04) the confirmation link's token — the studio's Send reads it; a client page never gets it (`clientQuoteOf`) */ confirmToken?: string | null
    /** (fix-D, D-44) a variation order's project — its crumb is the editor's: Projects / the project / Money */ project?: { id: string; name: string } | null }
  data: DocData
  /** The template the quote prints through: its pinned version's design when it is behind, else the published one. */
  template: { id: string; name: string; version: number; latest: number; design: TemplateDesign; defaults: TemplateDefaults; isDefault: boolean; deleted: boolean } | null
  templates: { id: string; name: string; version: number; isDefault: boolean }[]
  /** (REG-496) The picker behind the template chip. */
  picker: PickerData
  brand: BrandKit
  baseView: ClientView
  view: ClientView
  readiness: Readiness
  now: number
  /** (REG-565) Set when the preview shows a kept version (`?version=n`): read-only, with the way to the current one. */
  kept: KeptVersion | null
  /** (REG-595) On a revision: how many lines were added, removed and changed since the kept version — the panel's word. */
  changes: { added: number; removed: number; changed: number } | null
  /** (S44F — NB-01) On a revision past version 2: what carries a mark since version 1 — the panel's word for "Every version". */
  chain?: { added: number; removed: number; changed: number } | null
  /** (S44F — NB-02 (c)) `?against=m`: the version shown compared with an earlier one — read-only, the marks always on. `options` = the versions it
      can be compared with (the earlier ones). */
  compare?: { version: number; against: number; options: number[]; counts: { added: number; removed: number; changed: number; schedule: number } } | null
  /** (S44F — NB-02 (b)) On a revision: what changed since the last version, in the client's words — the confirmation's WhatsApp message carries it. */
  summary?: string | null
}

/** (S44F — NB-02) A version's milestones as two versions compare them. */
const diffPaymentsOf = (rows: QuotePayment[], totalMinor: number): DiffPayment[] => paymentsForDiff(rows, totalMinor)
/** (S44F — NB-02 (b)) A version as the change summary reads it. */
const summaryStateOf = (version: number, q: Quote, items: QuoteItem[], payments: QuotePayment[]): SummaryState =>
  versionState(version, items, payments, { totalMinor: q.amountMinor, additionalDiscountMode: q.additionalDiscountMode, additionalDiscountValue: q.additionalDiscountValue, gstEnabled: q.gstEnabled, discounts: q.discountsJson })

/** The quote as its client sees it (REG-490): the template's design at the quote's pinned version, the client view on top — or (REG-565) a kept earlier version, read-only. */
/** (S44F — NB-02 (c)) `against` — a kept version to compare the one shown with (`?against=m`): the marks against it, read-only. */
export async function fetchQuotePreview(quoteId: string, version?: number, against?: number): Promise<QuotePreviewData | null> {
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
  if (!quote) return null
  const keptRow = version && version < quote.version ? (await db.select().from(quoteVersions).where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.version, version))))[0] ?? null : null
  const [data, brand, leadRows, all, team] = await Promise.all([
    fetchQuoteDocData(quoteId, keptRow ? version : undefined), fetchBrand(),
    db.select({ name: leads.name }).from(leads).where(eq(leads.id, quote.leadId)),
    db.select().from(quoteTemplates).where(and(eq(quoteTemplates.status, 'published'), isNull(quoteTemplates.deletedAt))).orderBy(desc(quoteTemplates.isDefault), asc(quoteTemplates.name)),
    db.select().from(members).then(withYou),
  ])
  if (!data) return null
  const keptSnap = keptRow ? reviveSnapshot(keptRow.snapshotJson) : null
  /* (REG-595) A revision prints what changed since the version it kept: the removed lines back in their places, struck through; the new
     and the changed ones marked. The renderer shows the marks only while the quote's "Show changes" is on.
     (S44F — NB-01) …and every version's marks since version 1 (the client view's Changes › Every version): each line's history, every line
     removed along the way back in its place. (NB-02 (a)) The schedule's milestones are marked the same way. (NB-02 (c)) `against` compares the
     version shown with an earlier kept one instead. */
  let changes: QuotePreviewData['changes'] = null, chainCounts: QuotePreviewData['chain'] = null, compare: QuotePreviewData['compare'] = null
  let summaryInputs: [SummaryState, SummaryState] | null = null
  const shownVersion = keptRow ? keptRow.version : quote.version
  const vs = shownVersion > 1 ? await db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quoteId)).orderBy(asc(quoteVersions.version)) : []
  const snaps = vs.flatMap((r) => { const sn = r.version < shownVersion ? reviveSnapshot(r.snapshotJson) : null; return sn ? [{ version: r.version, snap: sn }] : [] })
  const shownPays = keptSnap ? keptSnap.payments : await db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(asc(quotePayments.position), asc(quotePayments.createdAt))
  const shownDiffPays: DiffPayment[] = paymentsForDiff(shownPays, 0).map((p, i) => ({ ...p, amountMinor: data.payments[i]?.amountMinor ?? 0 }))   // the rows as stored, the amounts the page prints
  const snapPays = (sn: (typeof snaps)[number]['snap']) => diffPaymentsOf(sn.payments, sn.quote.amountMinor)
  const removedItem = (r: QuoteItem, position: number) => ({ ...toDocItem(r), position, change: 'removed' as const, noNumber: true })
  /** The schedule's marks since one version: the changed and new milestones marked, the removed ones back in their places, struck. */
  const markPayments = (prevPays: DiffPayment[]) => {
    const pd = diffPayments(prevPays, shownDiffPays)
    const out = data.payments.map((p, i) => (pd.added.has(i) ? { ...p, change: 'added' as const } : pd.changed.has(i) ? { ...p, change: 'changed' as const, was: pd.changed.get(i) } : p))
    for (const r of [...pd.removed].reverse()) out.splice(Math.min(r.at, out.length), 0, { name: r.row.label, description: null, pct: r.row.pct, amountMinor: r.row.amountMinor, due: '', ...(r.row.fixedMinor != null ? { fixed: true } : {}), change: 'removed' as const })
    data.payments = out
    return pd.counts.added + pd.counts.removed + pd.counts.changed
  }
  const againstSnap = against && against < shownVersion ? snaps.find((x) => x.version === against) ?? null : null
  if (againstSnap) {
    /* (NB-02 (c)) the version shown against an earlier one: one baseline, the marks always on */
    const diff = diffQuoteItems(againstSnap.snap.items, data.items)
    data.items = withRemoved(data.items.map((i) => (diff.added.has(i.id) ? { ...i, change: 'added' as const } : diff.changed.has(i.id) ? { ...i, change: 'changed' as const, was: diff.changed.get(i.id) } : i)), diff.removed, againstSnap.snap.items, removedItem)
    const schedule = markPayments(snapPays(againstSnap.snap))
    compare = { version: shownVersion, against: againstSnap.version, options: snaps.map((x) => x.version), counts: { ...diff.counts, schedule } }
  } else if (!keptRow && quote.version > 1) {
    const prev = snaps.find((x) => x.version === quote.version - 1)?.snap ?? null
    if (prev) {
      const diff = diffQuoteItems(prev.items, data.items)
      const chain = diffChain(snaps.map((x) => ({ version: x.version, items: x.snap.items })), { version: quote.version, items: data.items })
      const mark = <T extends { id: string }>(i: T) => { const h = chain.lines.get(i.id); return h ? { ...i, history: h } : i }
      /* this version's removals first, exactly as before (REG-595); then each earlier version's, newest first, each in the place it left */
      let items = withRemoved(data.items.map((i) => mark(diff.added.has(i.id) ? { ...i, change: 'added' as const } : diff.changed.has(i.id) ? { ...i, change: 'changed' as const, was: diff.changed.get(i.id) } : i)), diff.removed, prev.items, (r, position) => ({ ...removedItem(r, position), history: { removedIn: quote.version } }))
      const earlier = chain.removed.filter((x) => x.removedIn < quote.version && !items.some((i) => i.id === x.line.id)).sort((a, b) => b.removedIn - a.removedIn)
      for (const x of earlier) items = withRemoved(items, [x.line], x.prev, (r, position) => ({ ...removedItem(r, position), history: { removedIn: x.removedIn } }))
      data.items = items
      changes = diff.counts
      chainCounts = quote.version > 2 ? chain.counts : null
      /* (NB-02 (a)) the schedule since the last version, and every version's marks on it */
      const prevPays = snapPays(prev)
      markPayments(prevPays)
      const pc = paymentChain(snaps.map((x) => ({ version: x.version, items: snapPays(x.snap) })), { version: quote.version, items: shownDiffPays })
      let at = 0
      const pays: typeof data.payments = []
      for (const p of data.payments) {
        if (p.change === 'removed') { pays.push({ ...p, history: { removedIn: quote.version } }); continue }
        const h = pc.rows[at++] ?? null
        pays.push(h ? { ...p, history: h } : p)
      }
      for (const r of pc.removed.filter((x) => x.removedIn < quote.version).sort((a, b) => b.removedIn - a.removedIn)) pays.splice(Math.min(r.at, pays.length), 0, { name: r.row.label, description: null, pct: r.row.pct, amountMinor: r.row.amountMinor, due: '', ...(r.row.fixedMinor != null ? { fixed: true } : {}), change: 'removed' as const, history: { removedIn: r.removedIn } })
      data.payments = pays
      /* (NB-02 (b)) what the revised quote's message says changed — in the client's words once the view is known (below) */
      const liveItems = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId))
      summaryInputs = [summaryStateOf(prev.quote.version, prev.quote, prev.items, prev.payments), summaryStateOf(quote.version, quote, liveItems, shownPays)]
    }
  }
  const kept: KeptVersion | null = keptRow ? { version: keptRow.version, current: quote.version, at: keptRow.createdAt, by: who(keptRow.createdBy, team), note: keptRow.note, status: keptSnap?.quote.status ?? '', amountMinor: keptSnap?.quote.amountMinor ?? 0 } : null
  /* (S44T — UAT row 294) A kept version prints as it went out: through the template, the template version and the client view it was sent with,
     never the live quote's — a revision that changed its template or its view used to redraw the old version in the new look. */
  const printed = keptSnap ? { ...quote, ...keptSnap.quote } : quote   // a snapshot from before a column existed reads that column live
  const row = printed.templateId ? all.find((t) => t.id === printed.templateId) ?? (await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, printed.templateId)))[0] : all.find((t) => t.isDefault)
  let template: QuotePreviewData['template'] = null
  if (row) {
    let design = parseDesign(row.designJson, fallbackDesign())
    let defaults = parseDefaults(row.defaultsJson)
    if (printed.templateVersion && printed.templateVersion < row.version) {
      const [pinned] = await db.select().from(quoteTemplateVersions).where(and(eq(quoteTemplateVersions.templateId, row.id), eq(quoteTemplateVersions.version, printed.templateVersion)))
      if (pinned) { design = parseDesign(pinned.designJson, design); defaults = parseDefaults(pinned.defaultsJson) }
    }
    template = { id: row.id, name: row.name, version: printed.templateVersion ?? row.version, latest: row.version, design, defaults, isDefault: row.isDefault, deleted: !!row.deletedAt }
  }
  const design = template?.design ?? fallbackDesign()
  /* (REG-538) Terms / Notes visibility belongs to the quote's own switches (the editor's "Show in client view"): both the base and the view read them, so the panel never disagrees with the editor. */
  const baseView = { ...clientViewFromDesign(design), terms: printed.termsVisible, notes: printed.notesVisible }
  const voProject = quote.kind === 'variation' && quote.projectId ? (await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, quote.projectId)).limit(1))[0] ?? null : null   // (fix-D, D-44)
  const view = { ...parseClientView(printed.clientViewJson, baseView), terms: printed.termsVisible, notes: printed.notesVisible }
  const summary = summaryInputs ? summaryText(changeSummary(summaryInputs[0], summaryInputs[1], { client: { prices: view.amounts === 'lines', schedule: view.paymentSchedule } }), { limit: 6 }) : null   // (S44F — NB-02 (b))
  return {
    quote: { id: quote.id, number: quote.number, title: quote.title, status: kept ? kept.status : quote.status, leadId: quote.leadId, leadName: leadRows[0]?.name ?? '', templateId: quote.templateId, templateVersion: quote.templateVersion, visibility: quote.visibility, version: quote.version, confirmedAt: quote.confirmedAt ? quote.confirmedAt.getTime() : null, confirmedBy: quote.confirmedBy ?? null, kind: quote.kind, amountMinor: quote.amountMinor, project: voProject, confirmToken: quote.confirmToken },
    kept, changes, chain: chainCounts, compare, summary,
    data, template, templates: all.map((t) => ({ id: t.id, name: t.name, version: t.version, isDefault: t.isDefault })), picker: { ...(await pickerExtras()), templates: pickerTemplates(all), brand: brand.kit, sample: sampleFor(brand.details) }, brand: brand.kit, baseView, view, readiness: readiness(data, design, view), now: Date.now(),
  }
}

/** What the quote editor shows about its template (REG-489): the name, the pinned version and whether a newer one is published. */
export type QuoteTemplateState = {
  templates: { id: string; name: string; version: number; isDefault: boolean; status: string }[]
  /** The template the quote prints through, its pinned version's design (REG-489 / REG-497) and what it started the quote with. */
  current: { id: string; name: string; pinned: number; latest: number; note: string; design: TemplateDesign; defaults: TemplateDefaults; /** (REG-502) deleted since — it still prints its pinned version */ deleted: boolean } | null
  /** (REG-494) The picker: the published templates with their designs, the kit and the sample quote. */
  picker: PickerData
}
export async function fetchQuoteTemplateState(quote: { templateId: string | null; templateVersion: number | null }): Promise<QuoteTemplateState> {
  const [rows, brand] = await Promise.all([db.select().from(quoteTemplates).where(and(eq(quoteTemplates.status, 'published'), isNull(quoteTemplates.deletedAt))).orderBy(desc(quoteTemplates.isDefault), asc(quoteTemplates.name)), fetchBrand()])
  const list = rows.map((t) => ({ id: t.id, name: t.name, version: t.version, isDefault: t.isDefault, status: t.status }))
  let current: QuoteTemplateState['current'] = null
  if (quote.templateId) {
    const row = rows.find((t) => t.id === quote.templateId) ?? (await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, quote.templateId)))[0]
    if (row) {
      let design = parseDesign(row.designJson, fallbackDesign()), defaults = parseDefaults(row.defaultsJson)
      if (quote.templateVersion && quote.templateVersion < row.version) {
        const [pinned] = await db.select().from(quoteTemplateVersions).where(and(eq(quoteTemplateVersions.templateId, row.id), eq(quoteTemplateVersions.version, quote.templateVersion)))
        if (pinned) { design = parseDesign(pinned.designJson, design); defaults = parseDefaults(pinned.defaultsJson) }
      }
      current = { id: row.id, name: row.name, pinned: quote.templateVersion ?? row.version, latest: row.version, note: row.note ?? '', design, defaults, deleted: !!row.deletedAt }
      if (!rows.some((t) => t.id === row.id)) list.push({ id: row.id, name: row.name, version: row.version, isDefault: row.isDefault, status: row.status })
    }
  }
  return { templates: list, current, picker: { ...(await pickerExtras()), templates: pickerTemplates(rows), brand: brand.kit, sample: sampleFor(brand.details) } }
}

/** (REG-501) Templates awaiting an Owner's approval — the rail's Company badge and the panel's "n awaiting". */
export async function countPendingTemplates(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(quoteTemplates).where(sql`${quoteTemplates.submittedAt} IS NOT NULL AND ${quoteTemplates.deletedAt} IS NULL`)
  return row?.n ?? 0
}
