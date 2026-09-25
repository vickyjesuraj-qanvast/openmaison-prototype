import 'server-only'   // (REG-286) libSQL never reaches the browser bundle
import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, contracts, leads, members, quotes, type Contract, type ContractTemplate, type Member, contractBundles, type ContractBundle } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { fetchBrand } from '@/lib/templates/queries'
import type { BrandKit, StudioDetails } from '@/lib/templates/model'
import { longDate } from './model'
import type { TokenValues } from './tokens'
import { fingerprintOf, letterheadOf, pickQuote, setHashOf, snapshotColumns, studioSignatureFor as signatureOf, tokenValuesFor, type ContractLead, type ContractQuote } from './snapshot'
import { linkState, signedCopyOf, type ContractViewer, type LinkState, type SignedCopy, type SignedLetterhead, type SignedStudioSignature } from './policy'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { canDeleteContract } from './policy'

/* Contracts (REG-534): the editor, the preview, the signing page, Tools › Contracts and Company › Templates › Contracts. */

export type { ContractLead, ContractQuote }
export { fingerprintOf, setHashOf, tokenValuesFor }
export type ContractSibling = { id: string; title: string; status: string }
const studioSignatureFor = (createdBy: string | null, team: Member[]) => signatureOf(createdBy, team, SESSION_MEMBER_ID)
export type ContractEditorData = {
  contract: Contract
  lead: ContractLead
  siblings: ContractSibling[]
  studio: StudioDetails
  brand: BrandKit
  /** (REG-632, parity Q-08) The quote the contract names — kept even when it was archived or deleted (`quoteGone` says which). */
  quote: ContractQuote | null
  quoteGone: 'archived' | 'deleted' | null
  /** Every live quote of the lead — the Quote field's choices. */
  quotes: (ContractQuote & { issuingEntity: string | null })[]
  /** (REG-632, parity Q-10) The letterhead it prints: the kept one once signed, else its issuer's. */
  letterhead: SignedLetterhead
  me: Member | null
  values: TokenValues
  /** (REG-631, Q-05 · E-117) The studio signature every view prints — the contract's creator's, else the signed-in member's (one rule for Preview and the signing page). */
  studioSignature: SignedStudioSignature
  /** (REG-631, Q-05) The copy kept at signing, for a Signed contract. */
  signed: SignedCopy | null
  now: number
}

const LEAD_COLS = { id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress }
const QUOTE_COLS = { id: quotes.id, number: quotes.number, title: quotes.title, amountMinor: quotes.amountMinor, validUntil: quotes.validUntil, projectRef: quotes.projectRef, status: quotes.status }

/** (REG-632, parity Q-08) The quote a contract names, archived or deleted included — it is never replaced by another. */
async function namedQuote(c: Contract): Promise<(ContractQuote & { gone: 'archived' | 'deleted' | null }) | null> {
  if (!c.fromQuoteId) return null
  const [q] = await db.select({ ...QUOTE_COLS, archivedAt: quotes.archivedAt, deletedAt: quotes.deletedAt }).from(quotes).where(and(eq(quotes.id, c.fromQuoteId), eq(quotes.leadId, c.leadId)))
  if (!q) return null
  const { archivedAt, deletedAt, ...rest } = q
  return { ...rest, gone: deletedAt ? 'deleted' : archivedAt ? 'archived' : null }
}
const quoteList = async (c: Contract) => { const q = await namedQuote(c); return q ? [q] : [] }
/** The contract's chips resolved as the client sees them now — the signing page's values and its fingerprint. */
export async function liveValuesFor(c: Contract, now: number): Promise<{ values: TokenValues; fingerprint: string } | null> {
  const [[lead], qs, brand] = await Promise.all([db.select(LEAD_COLS).from(leads).where(eq(leads.id, c.leadId)), quoteList(c), fetchBrand()])
  if (!lead) return null
  const values = tokenValuesFor(c, lead, brand.details, pickQuote(c, qs), now)
  return { values, fingerprint: fingerprintOf(c, values) }
}

/**
 * The columns that keep a contract as signed: the resolved text (Today's date = the signing day), the letterhead, the studio signature it
 * printed and the fingerprint. Written by every path that makes a contract Signed — online, in a bundle, Mark as signed, a list's Signed,
 * an already-signed import.
 */
export async function signedSnapshot(c: Contract, at: Date): Promise<Pick<typeof contracts.$inferInsert, 'signedBody' | 'signedLetterhead' | 'signedStudioSignature' | 'documentHash'>> {
  const [[lead], qs, brand, team] = await Promise.all([db.select(LEAD_COLS).from(leads).where(eq(leads.id, c.leadId)), quoteList(c), fetchBrand(), db.select().from(members)])
  return snapshotColumns(c, { lead: lead ?? null, studio: brand.details, quotes: qs, team, sessionId: SESSION_MEMBER_ID, at })
}
/** Un-signing (a studio-marked signature moved back) lets go of the kept copy with the rest of the signing stamps. */
export const UNSIGNED: Partial<typeof contracts.$inferInsert> = {
  signedAt: null, signedBy: null, signedNric: null, signedCopy: null, signedBody: null, signedLetterhead: null, signedStudioSignature: null, documentHash: null,
  acceptedAt: null, signatureKind: null, signatureData: null, signerPhone: null, signerUserAgent: null, signerTimezone: null, verificationMethod: null,   // (REG-633) the record goes with the signature
  markedBy: null,   // (REG-634)
}

export async function fetchContractEditor(contractId: string): Promise<ContractEditorData | null> {
  const [c] = await db.select().from(contracts).where(and(eq(contracts.id, contractId), isNull(contracts.deletedAt)))
  if (!c) return null
  if (!(await canOpenLead(await fetchViewer(), c.leadId))) return null   /* (REG-634, parity §8.2 · E-98) Who sees leads reaches a contract's own URL and its Preview */
  const [[lead], sibs, qs, named, brand, team] = await Promise.all([
    db.select(LEAD_COLS).from(leads).where(eq(leads.id, c.leadId)),
    db.select({ id: contracts.id, title: contracts.title, status: contracts.status }).from(contracts).where(and(eq(contracts.leadId, c.leadId), isNull(contracts.archivedAt), isNull(contracts.deletedAt))).orderBy(asc(contracts.createdAt)),
    db.select({ ...QUOTE_COLS, issuingEntity: quotes.issuingEntity }).from(quotes).where(and(eq(quotes.leadId, c.leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt)),
    namedQuote(c),
    fetchBrand(),
    db.select().from(members),
  ])
  if (!lead) return null
  const now = Date.now()
  const quote = named ? (({ gone: _gone, ...q }) => q)(named) : null
  const me = team.find((m) => m.isYou) ?? team.find((m) => m.id === SESSION_MEMBER_ID) ?? null   // (REG-634) the acting member, as the lists' viewer
  const signed = signedCopyOf(c)
  return {
    contract: c, lead, siblings: sibs, studio: brand.details, brand: brand.kit, quote, quoteGone: named?.gone ?? null, quotes: qs, me,
    values: tokenValuesFor(c, lead, brand.details, quote, now), studioSignature: studioSignatureFor(c.createdBy, team), signed,
    letterhead: signed?.letterhead ?? letterheadOf(c, brand.details), now,
  }
}

/**
 * The signing page (the client's side): the same document, resolved, plus the studio's signature to print. (REG-631, Q-07) The link's
 * state decides what the page may show: only an open or signed contract carries its document; a Draft or a dead link carries none.
 */
export type SigningData = {
  state: LinkState
  contract: Contract; lead: ContractLead; studio: StudioDetails; brand: BrandKit; values: TokenValues
  studioSignature: SignedStudioSignature
  /** (Q-06) The fingerprint of the text on the page; Sign sends it back and is refused if the document changed meanwhile. */
  fingerprint: string
  /** (Q-05) The copy kept at signing. */
  signed: SignedCopy | null
  /** (REG-632, Q-10) The letterhead the page prints: the kept one once signed, else the issuer's. */
  letterhead: SignedLetterhead
  /** (REG-633, parity Q-20) The quote the agreement signs — the client can open it from the page. */
  /** (sweep S2 #14) `gone`: the quote was deleted — the agreement still names it, the page offers no link to it. */
  quote: { number: string; title: string; gone?: boolean } | null
  now: number
}
export async function fetchSigning(contractId: string): Promise<SigningData | null> {
  const [c] = await db.select().from(contracts).where(eq(contracts.id, contractId))
  if (!c) return null
  const [[lead], qs, brand, team] = await Promise.all([
    db.select({ ...LEAD_COLS, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, c.leadId)), quoteList(c), fetchBrand(), db.select().from(members),
  ])
  if (!lead) return null
  const now = Date.now()
  const state = linkState(c, !!lead.deletedAt)
  const shows = state === 'open' || state === 'signed'
  const values = shows ? tokenValuesFor(c, lead, brand.details, pickQuote(c, qs), now) : { 'studio.name': c.issuingEntity?.trim() || brand.details.name }
  const signed = state === 'signed' ? signedCopyOf(c) : null
  return {
    state, contract: shows ? c : { ...c, body: null, signedBody: null }, lead, studio: brand.details, brand: brand.kit, values,
    studioSignature: studioSignatureFor(c.createdBy, team), fingerprint: state === 'open' ? fingerprintOf(c, values) : '', signed,
    letterhead: signed?.letterhead ?? letterheadOf(c, brand.details), quote: shows && qs[0] ? { number: qs[0].number, title: qs[0].title, gone: qs[0].gone === 'deleted' } : null, now,
  }
}

/* ── Tools › Contracts: every live contract in the studio with its lead ── */
export type StudioContractRow = Contract & { leadName: string }
export type StudioContractsData = { contracts: StudioContractRow[]; leads: { id: string; name: string }[]; viewer: ContractViewer; /** (REG-634) Send together's WhatsApp draft */ studioName: string; now: number }
export async function fetchStudioContracts(): Promise<StudioContractsData> {
  const viewer = await fetchViewer()
  const [rows, clients, visible, brand] = await Promise.all([
    db.select({ contract: contracts, leadName: leads.name }).from(contracts).innerJoin(leads, eq(leads.id, contracts.leadId))
      .where(and(isNull(contracts.archivedAt), isNull(contracts.deletedAt), isNull(leads.deletedAt))).orderBy(asc(contracts.createdAt)),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
    visibleLeadIds(viewer),
    fetchBrand(),
  ])
  /* (REG-634, parity §8.2 · E-98) Who sees leads: the studio list, and the lead picker behind New Contract, hold only the leads the member sees. */
  const sees = (leadId: string) => !visible || visible.has(leadId)
  return { contracts: rows.filter((r) => sees(r.contract.leadId)).map((r) => ({ ...r.contract, leadName: r.leadName })), leads: clients.filter((l) => sees(l.id)), viewer: { id: viewer.id, role: viewer.role }, studioName: brand.details.name, now: Date.now() }
}

/** Deleted Contracts (the tab's kebab; the studio list's): the lead's, or every lead's when `leadId` is null. */
/* (REG-634, parity §8.2 · E-124) Deleted Quotes' rules: `mine` = its creator, an Owner or an Admin may restore or delete it forever; who
   deleted it; a deleted lead's contracts leave the list (restoring one would land on a lead nobody can open); Who sees leads applies. */
export type DeletedContractRow = Contract & { leadName: string; mine: boolean; deletedByName: string | null }
export async function fetchDeletedContracts(leadId: string | null): Promise<DeletedContractRow[]> {
  const viewer = await fetchViewer()
  const where = and(leadId ? eq(contracts.leadId, leadId) : undefined, isNotNull(contracts.deletedAt), isNull(leads.deletedAt))
  const [rows, team, visible] = await Promise.all([
    db.select({ contract: contracts, leadName: leads.name }).from(contracts).innerJoin(leads, eq(leads.id, contracts.leadId)).where(where).orderBy(desc(contracts.deletedAt)),
    db.select({ id: members.id, name: members.name }).from(members),
    visibleLeadIds(viewer),
  ])
  return rows.filter((r) => !visible || visible.has(r.contract.leadId))
    .map((r) => ({ ...r.contract, leadName: r.leadName, mine: canDeleteContract(viewer, r.contract), deletedByName: team.find((m) => m.id === r.contract.deletedBy)?.name ?? null }))
}

/* ── Company › Templates › Contracts ── */
export type ContractTemplateRow = ContractTemplate & { usedBy: number; author: string | null; authorColor: string | null }
export type ContractTemplatesData = { templates: ContractTemplateRow[]; deleted: ContractTemplateRow[]; leads: { id: string; name: string }[]; viewer: ContractViewer; now: number }
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
  /* (REG-634, parity §8.2 · E-126) "Updated by" is whoever saved it last (older rows: whoever made it). */
  const rows = all.map((t) => { const m = by.get(t.updatedBy ?? t.createdBy ?? ''); return { ...t, usedBy: n.get(t.id) ?? 0, author: m?.name ?? null, authorColor: m?.color ?? null } })
  const viewer = await fetchViewer(); const visible = await visibleLeadIds(viewer)
  return { templates: rows.filter((t) => !t.deletedAt), deleted: rows.filter((t) => !!t.deletedAt), leads: clients.filter((l) => !visible || visible.has(l.id)), viewer: { id: viewer.id, role: viewer.role }, now: Date.now() }
}
export type ContractTemplateEditorData = { template: ContractTemplate; studio: StudioDetails; brand: BrandKit; usedBy: number; values: TokenValues; now: number; /** (sweep S2 #16) why this viewer may not rename or delete it (its author, an Owner or an Admin may), else null */ changeBlock: string | null }
export async function fetchContractTemplateEditor(templateId: string): Promise<ContractTemplateEditorData | null> {
  const [t] = await db.select().from(contractTemplates).where(and(eq(contractTemplates.id, templateId), isNull(contractTemplates.deletedAt)))
  if (!t) return null
  const [brand, uses] = await Promise.all([fetchBrand(), db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.templateId, templateId), isNull(contracts.deletedAt)))])
  const now = Date.now()
  /* A template previews with the studio's own details and placeholder client values (no lead). */
  const values: TokenValues = {
    'client.name': 'Client name', 'client.phone': 'Client phone', 'client.email': 'client@email.com', 'lead.address': 'Property address', 'lead.propertyType': 'Property type', 'lead.projectRef': 'Project ref',
    'studio.name': brand.details.name, 'studio.address': brand.details.address, 'studio.phone': brand.details.phone, 'studio.email': brand.details.email, 'studio.uen': brand.details.uen, 'studio.gst': brand.details.gstReg || 'GST reg. no.',
    'quote.number': 'OM-00000', 'quote.total': 'S$0.00', 'quote.validUntil': 'Quote valid until', 'date.today': longDate(new Date(now)), 'date.contract': 'Contract date',
  }
  const { templateChangeBlock } = await import('@/lib/company/template-rules')
  return { template: t, studio: brand.details, brand: brand.kit, usedBy: uses.length, values, now, changeBlock: templateChangeBlock(await fetchViewer(), t.createdBy) }
}
/** The contract picker (New Contract › From Template): the live templates, light. */
export type ContractTemplateOption = { id: string; title: string; body: string; updatedAt: Date; isDefault: boolean; /** (REG-664) */ folderId: string | null }
/** (REG-664) The picker's data: the live templates and Templates › Contracts' folders, browsed as the gallery files them. */
export type ContractPickerData = { templates: ContractTemplateOption[]; folders: { id: string; name: string; parentId: string | null }[] }
/** (REG-632, Q-13) The default first, then the most recently used. */
export async function fetchContractTemplateOptions(): Promise<ContractTemplateOption[]> {
  return db.select({ id: contractTemplates.id, title: contractTemplates.title, body: contractTemplates.body, updatedAt: contractTemplates.updatedAt, isDefault: contractTemplates.isDefault, folderId: contractTemplates.folderId }).from(contractTemplates).where(isNull(contractTemplates.deletedAt)).orderBy(desc(contractTemplates.isDefault), desc(contractTemplates.lastUsedAt), asc(contractTemplates.title))
}
/** (REG-538) New template › From a contract…: every composed contract with a document, newest first. */
export async function fetchContractOptions(): Promise<{ id: string; title: string; leadName: string; updatedAt: Date }[]> {
  const rows = await db.select({ id: contracts.id, title: contracts.title, leadName: leads.name, updatedAt: contracts.updatedAt, createdAt: contracts.createdAt }).from(contracts).innerJoin(leads, eq(leads.id, contracts.leadId))
    .where(and(isNull(contracts.deletedAt), eq(contracts.source, 'composed'), isNotNull(contracts.body))).orderBy(desc(contracts.updatedAt))
  return rows.map((r) => ({ id: r.id, title: r.title, leadName: r.leadName, updatedAt: r.updatedAt ?? r.createdAt }))
}

/** (REG-591) The bundle's signing page: every document under the link, each resolved as its own page would be. */
export type BundleSigningData = {
  state: LinkState
  bundle: ContractBundle; documents: { contract: Contract; values: TokenValues; signed: SignedCopy | null; letterhead: SignedLetterhead }[]; lead: ContractLead; studio: StudioDetails; brand: BrandKit
  studioSignature: SignedStudioSignature
  /** (REG-631, Q-06) The whole set's fingerprint (1.0's whole-set hash, B-29) over the documents still to sign. */
  fingerprint: string
  now: number
}
export async function fetchBundleSigning(bundleId: string): Promise<BundleSigningData | null> {
  const [b] = await db.select().from(contractBundles).where(eq(contractBundles.id, bundleId))
  if (!b) return null
  const [[lead], docs, qs, brand, team] = await Promise.all([
    db.select({ ...LEAD_COLS, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, b.leadId)),
    db.select().from(contracts).where(and(eq(contracts.bundleId, bundleId), isNull(contracts.deletedAt), isNull(contracts.archivedAt))).orderBy(asc(contracts.bundlePosition), asc(contracts.createdAt)),   // (REG-633, parity Q-16) as ticked
    db.select(QUOTE_COLS).from(quotes).where(eq(quotes.leadId, b.leadId)), fetchBrand(), db.select().from(members),
  ])
  if (!lead) return null
  const now = Date.now()
  /* (REG-631, Q-07) A document moved back to Draft leaves the link; no live document, or a deleted lead, and the link is dead. */
  const live = docs.filter((c) => c.status !== 'Draft')
  const state: LinkState = lead.deletedAt || !live.length ? 'inactive' : live.some((c) => c.status === 'Sent to Client') && !b.signedAt ? 'open' : 'signed'
  const documents = state === 'inactive' ? [] : live.map((c) => { const values = tokenValuesFor(c, lead, brand.details, pickQuote(c, qs), now); const signed = signedCopyOf(c); return { contract: c, values, signed, letterhead: signed?.letterhead ?? letterheadOf(c, brand.details) } })
  const open = documents.filter((d) => d.contract.status === 'Sent to Client')
  return {
    state, bundle: b, documents, lead, studio: brand.details, brand: brand.kit, studioSignature: studioSignatureFor(b.createdBy, team),
    fingerprint: state === 'open' ? setHashOf(open.map((d) => fingerprintOf(d.contract, d.values))) : '', now,
  }
}
