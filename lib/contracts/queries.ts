import 'server-only'   // (REG-286) libSQL never reaches the browser bundle
import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, contracts, leads, members, quotes, type Contract, type ContractTemplate, type Member } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { fetchBrand } from '@/lib/templates/queries'
import type { BrandKit, StudioDetails } from '@/lib/templates/model'
import { phoneDisplay } from '@/lib/format'
import { longDate } from './model'
import { money2 } from '@/lib/quotes/math'
import type { TokenValues } from './tokens'

/* Contracts (REG-534): the editor, the preview, the signing page, Tools › Contracts and Company › Templates › Contracts. */

export type ContractLead = { id: string; name: string; phone: string; email: string | null; propertyType: string; propertyAddress: string | null; leadAddress: string | null }
export type ContractSibling = { id: string; title: string; status: string }
export type ContractQuote = { id: string; number: string; title: string; amountMinor: number; validUntil: Date | null; projectRef: string | null; status: string }
export type ContractEditorData = {
  contract: Contract
  lead: ContractLead
  siblings: ContractSibling[]
  studio: StudioDetails
  brand: BrandKit
  /** The quote the agreement refers to — the one it was raised from, else the lead's signed quote, else its latest. */
  quote: ContractQuote | null
  /** Every live quote of the lead. */
  quotes: ContractQuote[]
  me: Member | null
  templates: { id: string; title: string }[]
  values: TokenValues
  now: number
}

const LEAD_COLS = { id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress }
const QUOTE_COLS = { id: quotes.id, number: quotes.number, title: quotes.title, amountMinor: quotes.amountMinor, validUntil: quotes.validUntil, projectRef: quotes.projectRef, status: quotes.status }

/** The chips' values for one contract — the records as Preview, the signing page and the PDF print them. */
export function tokenValuesFor(c: Contract, lead: ContractLead, studio: StudioDetails, quote: ContractQuote | null, now: number): TokenValues {
  return {
    'client.name': c.recipientName?.trim() || lead.name,
    'client.phone': phoneDisplay(c.recipientPhone?.trim() || lead.phone),
    'client.email': lead.email ?? '',
    'lead.address': lead.propertyAddress ?? lead.leadAddress ?? '',
    'lead.propertyType': lead.propertyType,
    'lead.projectRef': quote?.projectRef ?? '',
    'studio.name': c.issuingEntity?.trim() || studio.name,
    'studio.address': studio.address,
    'studio.phone': studio.phone,
    'studio.email': studio.email,
    'studio.uen': studio.uen,
    'quote.number': quote?.number ?? '',
    'quote.total': quote ? money2(quote.amountMinor) : '',
    'quote.validUntil': quote?.validUntil ? longDate(quote.validUntil) : '',
    'date.today': longDate(new Date(now)),
    'date.contract': longDate(c.contractDate ?? c.createdAt),
  }
}

async function leadQuotes(leadId: string): Promise<ContractQuote[]> {
  return db.select(QUOTE_COLS).from(quotes).where(and(eq(quotes.leadId, leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt))
}
const pickQuote = (c: Contract, qs: ContractQuote[]): ContractQuote | null =>
  (c.fromQuoteId ? qs.find((q) => q.id === c.fromQuoteId) : null) ?? qs.find((q) => q.status === 'Signed') ?? qs[qs.length - 1] ?? null

export async function fetchContractEditor(contractId: string): Promise<ContractEditorData | null> {
  const [c] = await db.select().from(contracts).where(and(eq(contracts.id, contractId), isNull(contracts.deletedAt)))
  if (!c) return null
  const [[lead], sibs, qs, brand, [me], tpls] = await Promise.all([
    db.select(LEAD_COLS).from(leads).where(eq(leads.id, c.leadId)),
    db.select({ id: contracts.id, title: contracts.title, status: contracts.status }).from(contracts).where(and(eq(contracts.leadId, c.leadId), isNull(contracts.archivedAt), isNull(contracts.deletedAt))).orderBy(asc(contracts.createdAt)),
    leadQuotes(c.leadId),
    fetchBrand(),
    db.select().from(members).where(eq(members.id, SESSION_MEMBER_ID)),
    db.select({ id: contractTemplates.id, title: contractTemplates.title }).from(contractTemplates).where(isNull(contractTemplates.deletedAt)).orderBy(asc(contractTemplates.title)),
  ])
  if (!lead) return null
  const now = Date.now()
  const quote = pickQuote(c, qs)
  return { contract: c, lead, siblings: sibs, studio: brand.details, brand: brand.kit, quote, quotes: qs, me: me ?? null, templates: tpls, values: tokenValuesFor(c, lead, brand.details, quote, now), now }
}

/** The signing page (the client's side): the same document, resolved, plus the studio's signature to print. */
export type SigningData = { contract: Contract; lead: ContractLead; studio: StudioDetails; brand: BrandKit; values: TokenValues; studioSignature: { kind: 'draw' | 'type'; name: string; data: string | null } | null; now: number }
export async function fetchSigning(contractId: string): Promise<SigningData | null> {
  const [c] = await db.select().from(contracts).where(and(eq(contracts.id, contractId), isNull(contracts.deletedAt)))
  if (!c) return null
  const [[lead], qs, brand, team] = await Promise.all([
    db.select(LEAD_COLS).from(leads).where(eq(leads.id, c.leadId)), leadQuotes(c.leadId), fetchBrand(), db.select().from(members),
  ])
  if (!lead) return null
  const now = Date.now()
  const signer = team.find((m) => m.id === (c.createdBy ?? SESSION_MEMBER_ID)) ?? team.find((m) => m.id === SESSION_MEMBER_ID) ?? null
  const studioSignature: SigningData['studioSignature'] = signer && (signer.signatureKind === 'draw' || signer.signatureKind === 'type') ? { kind: signer.signatureKind === 'draw' ? 'draw' : 'type', name: signer.signatureName ?? signer.name, data: signer.signatureData } : null
  return { contract: c, lead, studio: brand.details, brand: brand.kit, values: tokenValuesFor(c, lead, brand.details, pickQuote(c, qs), now), studioSignature, now }
}

/* ── Tools › Contracts: every live contract in the studio with its lead ── */
export type StudioContractRow = Contract & { leadName: string }
export type StudioContractsData = { contracts: StudioContractRow[]; leads: { id: string; name: string }[]; templates: { id: string; title: string }[]; now: number }
export async function fetchStudioContracts(): Promise<StudioContractsData> {
  const [rows, clients, tpls] = await Promise.all([
    db.select({ contract: contracts, leadName: leads.name }).from(contracts).innerJoin(leads, eq(leads.id, contracts.leadId))
      .where(and(isNull(contracts.archivedAt), isNull(contracts.deletedAt), isNull(leads.deletedAt))).orderBy(asc(contracts.createdAt)),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
    db.select({ id: contractTemplates.id, title: contractTemplates.title }).from(contractTemplates).where(isNull(contractTemplates.deletedAt)).orderBy(asc(contractTemplates.title)),
  ])
  return { contracts: rows.map((r) => ({ ...r.contract, leadName: r.leadName })), leads: clients, templates: tpls, now: Date.now() }
}

/** Deleted Contracts (the tab's kebab; the studio list's): the lead's, or every lead's when `leadId` is null. */
export type DeletedContractRow = Contract & { leadName: string }
export async function fetchDeletedContracts(leadId: string | null): Promise<DeletedContractRow[]> {
  const where = leadId ? and(eq(contracts.leadId, leadId), isNotNull(contracts.deletedAt)) : isNotNull(contracts.deletedAt)
  const rows = await db.select({ contract: contracts, leadName: leads.name }).from(contracts).innerJoin(leads, eq(leads.id, contracts.leadId)).where(where).orderBy(desc(contracts.deletedAt))
  return rows.map((r) => ({ ...r.contract, leadName: r.leadName }))
}

/* ── Company › Templates › Contracts ── */
export type ContractTemplateRow = ContractTemplate & { usedBy: number; author: string | null; authorColor: string | null }
export type ContractTemplatesData = { templates: ContractTemplateRow[]; deleted: ContractTemplateRow[]; leads: { id: string; name: string }[]; now: number }
export async function fetchContractTemplates(): Promise<ContractTemplatesData> {
  const [all, uses, team, clients] = await Promise.all([
    db.select().from(contractTemplates).orderBy(desc(contractTemplates.updatedAt)),
    db.select({ templateId: contracts.templateId }).from(contracts).where(and(isNotNull(contracts.templateId), isNull(contracts.deletedAt))),
    db.select({ id: members.id, name: members.name, color: members.color }).from(members),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
  ])
  const n = new Map<string, number>()
  for (const u of uses) if (u.templateId) n.set(u.templateId, (n.get(u.templateId) ?? 0) + 1)
  const by = new Map(team.map((m) => [m.id, m]))
  const rows = all.map((t) => { const m = t.createdBy ? by.get(t.createdBy) : undefined; return { ...t, usedBy: n.get(t.id) ?? 0, author: m?.name ?? null, authorColor: m?.color ?? null } })
  return { templates: rows.filter((t) => !t.deletedAt), deleted: rows.filter((t) => !!t.deletedAt), leads: clients, now: Date.now() }
}
export type ContractTemplateEditorData = { template: ContractTemplate; studio: StudioDetails; brand: BrandKit; usedBy: number; values: TokenValues; now: number }
export async function fetchContractTemplateEditor(templateId: string): Promise<ContractTemplateEditorData | null> {
  const [t] = await db.select().from(contractTemplates).where(and(eq(contractTemplates.id, templateId), isNull(contractTemplates.deletedAt)))
  if (!t) return null
  const [brand, uses] = await Promise.all([fetchBrand(), db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.templateId, templateId), isNull(contracts.deletedAt)))])
  const now = Date.now()
  /* A template previews with the studio's own details and placeholder client values (no lead). */
  const values: TokenValues = {
    'client.name': 'Client name', 'client.phone': 'Client phone', 'client.email': 'client@email.com', 'lead.address': 'Property address', 'lead.propertyType': 'Property type', 'lead.projectRef': 'Project ref',
    'studio.name': brand.details.name, 'studio.address': brand.details.address, 'studio.phone': brand.details.phone, 'studio.email': brand.details.email, 'studio.uen': brand.details.uen,
    'quote.number': 'OM-00000', 'quote.total': 'S$0.00', 'quote.validUntil': 'Quote valid until', 'date.today': longDate(new Date(now)), 'date.contract': 'Contract date',
  }
  return { template: t, studio: brand.details, brand: brand.kit, usedBy: uses.length, values, now }
}
/** The contract picker (New Contract › From Template): the live templates, light. */
export type ContractTemplateOption = { id: string; title: string; body: string; updatedAt: Date }
export async function fetchContractTemplateOptions(): Promise<ContractTemplateOption[]> {
  return db.select({ id: contractTemplates.id, title: contractTemplates.title, body: contractTemplates.body, updatedAt: contractTemplates.updatedAt }).from(contractTemplates).where(isNull(contractTemplates.deletedAt)).orderBy(desc(contractTemplates.lastUsedAt), asc(contractTemplates.title))
}
