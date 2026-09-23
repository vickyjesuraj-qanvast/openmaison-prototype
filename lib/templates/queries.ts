import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, members, quoteItems, quotePayments, quoteTemplateVersions, quoteTemplates, quoteTextTemplates, quoteVersions, quotes, settings, type Member, type Quote, type QuoteItem, type QuotePayment, type QuoteTemplate } from '@/lib/db/schema'
import { fetchStudio, fetchTemplateApproval, isApprover } from '@/lib/settings/queries'
import type { TemplateApproval } from '@/lib/settings/types'
import { fetchPaymentSplits } from '@/lib/company/payment-templates'
import { isPaper, parseDefaults, parseDesign, isTemplateStatus, type BrandKit, type StudioDetails, type TemplateDefaults, type TemplateDesign, type TemplateRecord, type TemplateSummary, type TemplateVersion } from './model'
import { BRAND_KEY, DEFAULT_BRAND_SETTING, parseBrandSetting, type BrandSetting } from './brand'
import { presetByKey } from './presets'
import { clientViewFromDesign, parseClientView, type ClientView } from './client-view'
import { docDataFromRecords, SAMPLE_DATA, type DocData, toDocItem } from './data'
import type { PickerExtras } from './picker'

/** (REG-538) What every picker names beside a template's defaults: the payment library's names and the live text templates' titles. */
export async function pickerExtras(): Promise<PickerExtras> {
  const [splits, texts] = await Promise.all([
    fetchPaymentSplits(),
    db.select({ id: quoteTextTemplates.id, kind: quoteTextTemplates.kind, title: quoteTextTemplates.title }).from(quoteTextTemplates).where(isNull(quoteTextTemplates.deletedAt)).orderBy(asc(quoteTextTemplates.createdAt)),
  ])
  return { splits: splits.map((s) => ({ id: s.id, name: s.name })), texts }
}
import { readiness, type Readiness } from './readiness'
import { pickerTemplates, type PickerData } from './picker'
import { diffQuoteItems, withRemoved } from '@/lib/quotes/diff'

/* Company › Templates › Quote templates (REG-485): the studio's templates, one template with its draft and versions, and
   the document data the preview and the thumbnails render through them. A template whose design was never saved (the
   three seeded rows before `npm run db:repair`) wears the Letter house style. */

/** The design a template without a saved one prints — the Letter house style. */
export const fallbackDesign = (): TemplateDesign => presetByKey('letter').design()

/** The brand kit (settings key `brand`) with the studio record's name and phone on top — those two live in Settings already. */
export async function fetchBrand(): Promise<BrandSetting> {
  const [row, studio] = await Promise.all([db.select().from(settings).where(eq(settings.key, BRAND_KEY)).limit(1), fetchStudio()])
  let setting = DEFAULT_BRAND_SETTING
  if (row[0]) { try { setting = parseBrandSetting(JSON.parse(row[0].value)) } catch { setting = DEFAULT_BRAND_SETTING } }
  return { kit: setting.kit, details: { ...setting.details, name: studio.name, phone: studio.phone || setting.details.phone } }
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
    deletedAt: stamp(row.deletedAt), deletedBy: who(row.deletedBy, team),
  }
}

export type TemplatesData = { templates: TemplateSummary[]; /** (REG-502) the soft-deleted ones, for the Deleted templates sheet */ deleted: TemplateSummary[]; brand: BrandKit; studio: StudioDetails; sample: DocData; now: number; /** (REG-501) the studio's approval setting — the gallery hides an empty Awaiting filter when it is off */ approval: TemplateApproval }

/** The gallery: every template that is not archived first, archived last; usage = live quotes that started from it. */
export async function fetchTemplates(): Promise<TemplatesData> {
  const [rows, team, uses, brand, approval] = await Promise.all([
    db.select().from(quoteTemplates).orderBy(desc(quoteTemplates.isDefault), desc(quoteTemplates.updatedAt), asc(quoteTemplates.createdAt)),
    db.select().from(members),
    db.select({ templateId: quotes.templateId, n: sql<number>`count(*)` }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId)).where(and(isNull(quotes.deletedAt), isNull(quotes.archivedAt), isNull(leads.deletedAt))).groupBy(quotes.templateId),   // (REG-538) quotes on a deleted lead do not count
    fetchBrand(),
    fetchTemplateApproval(),
  ])
  const usedBy = new Map(uses.map((u) => [u.templateId, u.n]))
  const blank = usedBy.get(null) ?? 0   // (REG-538) a quote with no template prints through the studio default: it counts for it
  const all = rows.map((r) => summary(r, (usedBy.get(r.id) ?? 0) + (r.isDefault && !r.deletedAt ? blank : 0), team))
  const templates = all.filter((t) => !t.deletedAt)
  const deleted = all.filter((t) => !!t.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
  return { approval,  templates, deleted, brand: brand.kit, studio: brand.details, sample: { ...SAMPLE_DATA, studio: brand.details }, now: Date.now() }
}

export async function fetchTemplate(id: string): Promise<TemplateRecord | null> {
  const [row] = await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, id))
  if (!row) return null
  const [team, versions, uses] = await Promise.all([
    db.select().from(members),
    db.select().from(quoteTemplateVersions).where(eq(quoteTemplateVersions.templateId, id)).orderBy(desc(quoteTemplateVersions.version)),
    db.select({ n: sql<number>`count(*)` }).from(quotes).where(and(eq(quotes.templateId, id), isNull(quotes.deletedAt), isNull(quotes.archivedAt))),
  ])
  const s = summary(row, uses[0]?.n ?? 0, team)
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
  textTemplates: { id: string; kind: string; title: string }[]
  paymentPresets: { key: string; label: string }[]
  me: { id: string; name: string; role: string } | null
  /** (REG-501) The studio's approval policy and whether the viewer can approve (Owner / Admin). */
  approval: TemplateApproval
  canApprove: boolean
  now: number
}

export async function fetchTemplateEditor(id: string): Promise<TemplateEditorData | null> {
  const template = await fetchTemplate(id)
  if (!template) return null
  const [brand, recent, texts, team, approval] = await Promise.all([
    fetchBrand(),
    db.select({ id: quotes.id, number: quotes.number, title: quotes.title, leadName: leads.name, status: quotes.status }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
      .where(and(isNull(quotes.deletedAt), isNull(quotes.archivedAt), isNull(leads.deletedAt))).orderBy(desc(quotes.updatedAt), desc(quotes.createdAt)).limit(12),
    db.select({ id: quoteTextTemplates.id, kind: quoteTextTemplates.kind, title: quoteTextTemplates.title }).from(quoteTextTemplates).where(isNull(quoteTextTemplates.deletedAt)).orderBy(asc(quoteTextTemplates.createdAt)),
    db.select().from(members),
    fetchTemplateApproval(),
  ])
  const splits = await fetchPaymentSplits()   // (REG-538) the Payment schedule select reads the library
  const me = team.find((m) => m.isYou) ?? null
  return {
    approval, canApprove: await isApprover(me?.id, me?.role),   // (REG-590) the backup approver counts
    template, brand: brand.kit, studio: brand.details, sample: { ...SAMPLE_DATA, studio: brand.details }, quotes: recent, textTemplates: texts,
    paymentPresets: splits.map((p) => ({ key: p.id, label: p.name })), me: me ? { id: me.id, name: me.name, role: me.role } : null, now: Date.now(),
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
    return { quote: revive(raw.quote) as unknown as Quote, items: raw.items.map((i) => revive(i) as unknown as QuoteItem), payments: raw.payments.map((p) => revive(p) as unknown as QuotePayment) }
  } catch { return null }
}
export type KeptVersion = { version: number; current: number; at: Date; by: { name: string; color: string } | null; note: string | null; status: string; amountMinor: number }
/** (REG-565) A quote's kept versions, newest first — Version History. */
export async function fetchQuoteVersions(quoteId: string): Promise<{ id: string; version: number; at: Date; by: { name: string; color: string } | null; note: string | null; status: string; amountMinor: number }[]> {
  const [rows, team] = await Promise.all([db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quoteId)).orderBy(desc(quoteVersions.version)), db.select().from(members)])
  return rows.map((r) => { const snap = reviveSnapshot(r.snapshotJson); return { id: r.id, version: r.version, at: r.createdAt, by: who(r.createdBy, team), note: r.note, status: snap?.quote.status ?? '', amountMinor: snap?.quote.amountMinor ?? 0 } })
}

/** One quote's document data from its records (the preview, the thumbnails, the editor's "Preview with") — or, with `version`, from the kept snapshot of that version (REG-565). */
export async function fetchQuoteDocData(quoteId: string, version?: number): Promise<DocData | null> {
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
  if (!quote) return null
  const [leadRows, team, liveItems, livePayments, brand] = await Promise.all([
    db.select({ name: leads.name, phone: leads.phone, email: leads.email }).from(leads).where(eq(leads.id, quote.leadId)),
    db.select().from(members),
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.position), asc(quoteItems.createdAt)),
    db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(asc(quotePayments.position), asc(quotePayments.createdAt)),
    fetchBrand(),
  ])
  const lead = leadRows[0]
  if (!lead) return null
  if (version && version < quote.version) {
    const [row] = await db.select().from(quoteVersions).where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.version, version)))
    const snap = row ? reviveSnapshot(row.snapshotJson) : null
    if (snap) return docDataFromRecords({ quote: snap.quote, lead, studio: brand.details, members: team, items: snap.items, payments: snap.payments })
  }
  return docDataFromRecords({ quote, lead, studio: brand.details, members: team, items: liveItems, payments: livePayments })
}

export type QuotePreviewData = {
  quote: { id: string; number: string; title: string; status: string; leadId: string; leadName: string; templateId: string | null; templateVersion: number | null; visibility: string; version: number; /** (REG-587) */ confirmedAt: number | null; confirmedBy: string | null }
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
}

/** The quote as its client sees it (REG-490): the template's design at the quote's pinned version, the client view on top — or (REG-565) a kept earlier version, read-only. */
export async function fetchQuotePreview(quoteId: string, version?: number): Promise<QuotePreviewData | null> {
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
  if (!quote) return null
  const keptRow = version && version < quote.version ? (await db.select().from(quoteVersions).where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.version, version))))[0] ?? null : null
  const [data, brand, leadRows, all, team] = await Promise.all([
    fetchQuoteDocData(quoteId, keptRow ? version : undefined), fetchBrand(),
    db.select({ name: leads.name }).from(leads).where(eq(leads.id, quote.leadId)),
    db.select().from(quoteTemplates).where(and(eq(quoteTemplates.status, 'published'), isNull(quoteTemplates.deletedAt))).orderBy(desc(quoteTemplates.isDefault), asc(quoteTemplates.name)),
    db.select().from(members),
  ])
  if (!data) return null
  const keptSnap = keptRow ? reviveSnapshot(keptRow.snapshotJson) : null
  /* (REG-595) A revision prints what changed since the version it kept: the removed lines back in their places, struck through; the new
     and the changed ones marked. The renderer shows the marks only while the quote's "Show changes" is on. */
  let changes: QuotePreviewData['changes'] = null
  if (!keptRow && quote.version > 1) {
    const [prevRow] = await db.select().from(quoteVersions).where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.version, quote.version - 1)))
    const prev = prevRow ? reviveSnapshot(prevRow.snapshotJson) : null
    if (prev) {
      const diff = diffQuoteItems(prev.items, data.items)
      data.items = withRemoved(data.items.map((i) => (diff.added.has(i.id) ? { ...i, change: 'added' as const } : diff.changed.has(i.id) ? { ...i, change: 'changed' as const, was: diff.changed.get(i.id) } : i)), diff.removed, prev.items, (r, position) => ({ ...toDocItem(r), position, change: 'removed' as const, noNumber: true }))
      changes = diff.counts
    }
  }
  const kept: KeptVersion | null = keptRow ? { version: keptRow.version, current: quote.version, at: keptRow.createdAt, by: who(keptRow.createdBy, team), note: keptRow.note, status: keptSnap?.quote.status ?? '', amountMinor: keptSnap?.quote.amountMinor ?? 0 } : null
  const row = quote.templateId ? all.find((t) => t.id === quote.templateId) ?? (await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, quote.templateId)))[0] : all.find((t) => t.isDefault)
  let template: QuotePreviewData['template'] = null
  if (row) {
    let design = parseDesign(row.designJson, fallbackDesign())
    let defaults = parseDefaults(row.defaultsJson)
    if (quote.templateVersion && quote.templateVersion < row.version) {
      const [pinned] = await db.select().from(quoteTemplateVersions).where(and(eq(quoteTemplateVersions.templateId, row.id), eq(quoteTemplateVersions.version, quote.templateVersion)))
      if (pinned) { design = parseDesign(pinned.designJson, design); defaults = parseDefaults(pinned.defaultsJson) }
    }
    template = { id: row.id, name: row.name, version: quote.templateVersion ?? row.version, latest: row.version, design, defaults, isDefault: row.isDefault, deleted: !!row.deletedAt }
  }
  const design = template?.design ?? fallbackDesign()
  /* (REG-538) Terms / Notes visibility belongs to the quote's own switches (the editor's "Show in client view"): both the base and the view read them, so the panel never disagrees with the editor. */
  const baseView = { ...clientViewFromDesign(design), terms: quote.termsVisible, notes: quote.notesVisible }
  const view = { ...parseClientView(quote.clientViewJson, baseView), terms: quote.termsVisible, notes: quote.notesVisible }
  return {
    quote: { id: quote.id, number: quote.number, title: quote.title, status: kept ? kept.status : quote.status, leadId: quote.leadId, leadName: leadRows[0]?.name ?? '', templateId: quote.templateId, templateVersion: quote.templateVersion, visibility: quote.visibility, version: quote.version, confirmedAt: quote.confirmedAt ? quote.confirmedAt.getTime() : null, confirmedBy: quote.confirmedBy ?? null },
    kept, changes,
    data, template, templates: all.map((t) => ({ id: t.id, name: t.name, version: t.version, isDefault: t.isDefault })), picker: { ...(await pickerExtras()), templates: pickerTemplates(all), brand: brand.kit, sample: { ...SAMPLE_DATA, studio: brand.details } }, brand: brand.kit, baseView, view, readiness: readiness(data, design, view), now: Date.now(),
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
  return { templates: list, current, picker: { ...(await pickerExtras()), templates: pickerTemplates(rows), brand: brand.kit, sample: { ...SAMPLE_DATA, studio: brand.details } } }
}

/** (REG-501) Templates awaiting an Owner's approval — the rail's Company badge and the panel's "n awaiting". */
export async function countPendingTemplates(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(quoteTemplates).where(sql`${quoteTemplates.submittedAt} IS NOT NULL AND ${quoteTemplates.deletedAt} IS NULL`)
  return row?.n ?? 0
}
