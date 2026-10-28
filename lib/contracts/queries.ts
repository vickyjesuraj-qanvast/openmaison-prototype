import 'server-only'   // (REG-286) libSQL never reaches the browser bundle
import { and, asc, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { nameDirectClients } from '@/lib/projects/direct-clients'   // (fix-A, A-02)
import { db } from '@/lib/db'
import { contractTemplateFiles, contractTemplates, contracts, leads, leadFiles, members, quotes, type Contract, type ContractTemplate, type Member, contractBundles, type ContractBundle } from '@/lib/db/schema'
import { SESSION_MEMBER_ID, withYou } from '@/lib/db/session'
import { fetchBrand } from '@/lib/templates/queries'
import type { BrandKit, StudioDetails } from '@/lib/templates/model'
import { longDate } from './model'
import type { TokenValues } from './tokens'
import { fingerprintOf, letterheadOf, pickQuote, setHashOf, snapshotColumns, studioSignatureFor as signatureOf, studioSignatureState, tokenValuesFor, type ContractLead, type ContractQuote } from './snapshot'
import { contractIdForToken, fetchContractRules } from './link-server'
import { signedFileOf } from './files'
import { linkState, quoteHoldsSigning, signedCopyOf, type ContractViewer, type LinkState, type SignedCopy, type SignedLetterhead, type SignedStudioSignature } from './policy'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { canDeleteContract } from './policy'
import { fetchQuoteApproval, isApprover } from '@/lib/settings/queries'
import { quoteSendBlock, type QuoteForSend } from './readiness'
import { AGREEMENT_TITLE, agreementHtml } from './agreement'
import { depositOf, depositOptions, withDeposits, withProject } from './deposit'   // (S44R, C7 · C9)
import type { DepositOption, DepositView } from './deposit-model'

/* Contracts (REG-534): the editor, the preview, the signing page, Tools › Contracts and Company › Templates › Contracts. */

export type { ContractLead, ContractQuote }
export { fingerprintOf, setHashOf, tokenValuesFor }
export type ContractSibling = { id: string; title: string; status: string }
const studioSignatureFor = (createdBy: string | null, team: Member[]) => signatureOf(createdBy, team, SESSION_MEMBER_ID)
/** (pending modules S03) A kept PDF as the pages show it: the file, the picture of its first page when one was drawn, its name. */
export type KeptPdf = { fileId: string; name: string; thumb: boolean; /** (Contracts on the move, C4 — P-12, Q-04) a photo of the signed paper, not a PDF */ picture?: boolean }
async function keptPdfs(ids: (string | null)[]): Promise<Map<string, KeptPdf>> {
  const want = [...new Set(ids.filter((x): x is string => !!x))]
  const rows = want.length ? await db.select({ id: leadFiles.id, name: leadFiles.name, thumb: leadFiles.thumb, kind: leadFiles.kind }).from(leadFiles).where(and(inArray(leadFiles.id, want), isNull(leadFiles.deletedAt))) : []
  return new Map(rows.map((r) => [r.id, { fileId: r.id, name: r.name, thumb: !!r.thumb, ...(r.kind === 'image' ? { picture: true } : {}) }]))
}
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
  /** (UX audit C2) Settings › quote approval — a Draft quote blocks the send where approval is required. */
  approvalRequired: boolean
  /** (S44Q — row 334) the member approves quotes — their send approves the Draft quote it names, so it never blocks them */
  canApprove: boolean
  /** (UX audit C1) The lead's stage — a signed contract offers Move to Won until the lead is there. */
  leadStage: string
  /** (pending modules S03) An uploaded contract's own PDF, and the signed copy it opens — kept files of the lead's (Files › Contract & VOs). */
  pdf: KeptPdf | null
  signedFile: KeptPdf | null
  /** (pending modules S03) Whose studio signature the paper prints, and whether they allowed it: none saved · saved, not allowed · on. */
  signatureState: 'none' | 'off' | 'on'
  /** (pending modules S03) The studio's Signing links window (days), and how many standard PDFs the library holds (Send together offers them). */
  linkDays: number
  standardDocs: number
  /** (pending modules S29) The template the writing help draws on for Add what's missing and Back to the template's wording: the contract's
      own template, else the studio's default, else the starter agreement — its text only. */
  writingTemplate: { title: string; html: string }
  /** (S44R — UAT row 358, call C7) Send's "Ask for the deposit": each live quote's first payment stage, or why it can't be asked for */
  deposits: Record<string, DepositOption>
  now: number
}

const LEAD_COLS = { id: leads.id, name: leads.name, phone: leads.phone, email: leads.email, propertyType: leads.propertyType, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress, companyName: leads.companyName, companyUen: leads.companyUen }
const QUOTE_COLS = { id: quotes.id, number: quotes.number, title: quotes.title, amountMinor: quotes.amountMinor, validUntil: quotes.validUntil, projectRef: quotes.projectRef, status: quotes.status, signedAmountMinor: quotes.signedAmountMinor }
/* (S44R, C7 · C9) the lead with its project (the Handover fields), a quote with its first payment (the Deposit field) */
const leadOf = async (leadId: string) => { const [l] = await db.select(LEAD_COLS).from(leads).where(eq(leads.id, leadId)); return l ? withProject(l) : undefined }

/** (REG-632, parity Q-08) The quote a contract names, archived or deleted included — it is never replaced by another. */
async function namedQuote(c: Contract): Promise<(ContractQuote & { gone: 'archived' | 'deleted' | null }) | null> {
  if (!c.fromQuoteId) return null
  const [q] = await db.select({ ...QUOTE_COLS, archivedAt: quotes.archivedAt, deletedAt: quotes.deletedAt }).from(quotes).where(and(eq(quotes.id, c.fromQuoteId), eq(quotes.leadId, c.leadId)))
  if (!q) return null
  const { archivedAt, deletedAt, ...rest } = q
  const [withDep] = await withDeposits([rest])   // (S44R, C7)
  return { ...withDep!, gone: deletedAt ? 'deleted' : archivedAt ? 'archived' : null }
}
const quoteList = async (c: Contract) => { const q = await namedQuote(c); return q ? [q] : [] }
/** The contract's chips resolved as the client sees them now — the signing page's values and its fingerprint. */
export async function liveValuesFor(c: Contract, now: number): Promise<{ values: TokenValues; fingerprint: string } | null> {
  const [lead, qs, brand] = await Promise.all([leadOf(c.leadId), quoteList(c), fetchBrand()])
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
  const [lead, qs, brand, team] = await Promise.all([leadOf(c.leadId), quoteList(c), fetchBrand(), db.select().from(members).then(withYou)])
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
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, c.leadId))) return null   /* (REG-634, parity §8.2 · E-98) Who sees leads reaches a contract's own URL and its Preview */
  const [lead, sibs, qsRaw, named, brand, team, approval, [stage]] = await Promise.all([
    leadOf(c.leadId),
    db.select({ id: contracts.id, title: contracts.title, status: contracts.status }).from(contracts).where(and(eq(contracts.leadId, c.leadId), isNull(contracts.archivedAt), isNull(contracts.deletedAt))).orderBy(asc(contracts.createdAt)),
    db.select({ ...QUOTE_COLS, issuingEntity: quotes.issuingEntity, signedAmountMinor: quotes.signedAmountMinor, leadId: quotes.leadId }).from(quotes).where(and(eq(quotes.leadId, c.leadId), isNull(quotes.archivedAt), isNull(quotes.deletedAt), eq(quotes.kind, 'quote'))).orderBy(asc(quotes.createdAt)),
    namedQuote(c),
    fetchBrand(),
    db.select().from(members).then(withYou),
    fetchQuoteApproval(),
    db.select({ stage: leads.stage }).from(leads).where(eq(leads.id, c.leadId)),
  ])
  if (!lead) return null
  const qs = await withDeposits(qsRaw)   // (S44R, C7) the Deposit field follows the quote picked
  const now = Date.now()
  const quote = named ? (({ gone: _gone, ...q }) => q)(named) : null
  const me = team.find((m) => m.isYou) ?? team.find((m) => m.id === SESSION_MEMBER_ID) ?? null   // (REG-634) the acting member, as the lists' viewer
  const signed = signedCopyOf(c)
  const files = await keptPdfs([c.fileId, signedFileOf(c)])
  return {
    contract: c, lead, siblings: sibs, studio: brand.details, brand: brand.kit, quote, quoteGone: named?.gone ?? null, quotes: qs, me,
    values: tokenValuesFor(c, lead, brand.details, quote, now), studioSignature: studioSignatureFor(c.createdBy, team), signed,
    letterhead: signed?.letterhead ?? letterheadOf(c, brand.details), approvalRequired: approval === 'required', canApprove: await isApprover(viewer.id, viewer.role), leadStage: stage?.stage ?? '',
    pdf: c.source === 'uploaded' && c.fileId ? files.get(c.fileId) ?? null : null, signedFile: (() => { const id = signedFileOf(c); return id ? files.get(id) ?? null : null })(),
    signatureState: studioSignatureState(c.createdBy, team, SESSION_MEMBER_ID), linkDays: (await fetchContractRules()).linkDays, standardDocs: await countStandardDocs(),
    writingTemplate: await writingTemplateFor(c.templateId), deposits: await depositOptions(qs, c.issuingEntity), now,   // (S44R, C7)
  }
}
/** (pending modules S29) The words a contract's writing help may draw on: its own template's, else the default template's, else the starter
    agreement's (a PDF template has no words to give). */
async function writingTemplateFor(templateId: string | null): Promise<{ title: string; html: string }> {
  const live = and(isNull(contractTemplates.deletedAt), eq(contractTemplates.kind, 'document'))
  const [own] = templateId ? await db.select({ title: contractTemplates.title, html: contractTemplates.body }).from(contractTemplates).where(and(eq(contractTemplates.id, templateId), live)) : []
  if (own?.html) return own
  const [def] = await db.select({ title: contractTemplates.title, html: contractTemplates.body }).from(contractTemplates).where(and(eq(contractTemplates.isDefault, true), live))
  if (def?.html) return def
  return { title: AGREEMENT_TITLE, html: agreementHtml() }
}

/**
 * (UX audit 2026-09-30, C2) The server's side of the named-quote check: why the quote a contract names keeps it from going out — a Draft,
 * or a quote waiting for approval, where Settings requires approval — else null. Send, Copy link, a list's status menu and Send together
 * all ask it.
 */
export async function namedQuoteBlock(c: Pick<Contract, 'fromQuoteId'>, /** (S44Q — row 334) the sender approves quotes: their send approves it */ approver = false): Promise<string | null> {
  if (!c.fromQuoteId) return null
  const [q] = await db.select({ number: quotes.number, status: quotes.status }).from(quotes).where(eq(quotes.id, c.fromQuoteId))
  return q ? quoteSendBlock(q, (await fetchQuoteApproval()) === 'required', approver) : null
}
/**
 * (S42 B-01) Why the quote a contract names keeps it from being signed right now — it is being revised (or, with approval required, isn't
 * approved yet) — else null. A deleted quote holds nothing (the agreement still names it; the page says it is gone). The signing pages, both
 * sign actions, Mark as signed and a list's Signed all ask it.
 */
export async function namedQuoteHold(c: Pick<Contract, 'fromQuoteId'>): Promise<{ number: string; version: number } | null> {
  if (!c.fromQuoteId) return null
  const [q] = await db.select({ number: quotes.number, status: quotes.status, version: quotes.version, deletedAt: quotes.deletedAt }).from(quotes).where(eq(quotes.id, c.fromQuoteId))
  if (!q || q.deletedAt) return null
  return quoteHoldsSigning(q, (await fetchQuoteApproval()) === 'required') ? { number: q.number, version: q.version } : null
}
/** (UX audit C2 · C5) The quotes a list's contracts name — number and status, for the send checks a list runs before the server does.
    (Contracts on the move, C4 — P-07) …and the amount each signs, for the phone card's first line ("the amount 18 right"). */
export type NamedQuote = QuoteForSend & { amountMinor: number }
export async function namedQuotesOf(rows: Pick<Contract, 'fromQuoteId'>[]): Promise<Record<string, NamedQuote>> {
  const ids = [...new Set(rows.map((r) => r.fromQuoteId).filter((x): x is string => !!x))]
  if (!ids.length) return {}
  const qs = await db.select({ id: quotes.id, number: quotes.number, status: quotes.status, amountMinor: quotes.amountMinor, signedAmountMinor: quotes.signedAmountMinor }).from(quotes).where(inArray(quotes.id, ids))
  return Object.fromEntries(qs.map((q) => [q.id, { number: q.number, status: q.status, amountMinor: q.signedAmountMinor ?? q.amountMinor }]))
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
  /** (pending modules S03) The address the page was opened on — the page signs through it, never through the contract's id. */
  token: string
  /** (pending modules S03) An uploaded contract's PDF, served to the client through the link's own address while it opens. */
  pdf: { name: string; thumb: boolean } | null
  /** (S44R — UAT row 358, call C7) the deposit the agreement asks for — the page ends on "Pay the deposit" once it is signed */
  deposit: DepositView | null
  now: number
}
/** (pending modules S03) The signing page's record, by the link's token. */
export async function fetchSigning(token: string): Promise<SigningData | null> {
  const contractId = await contractIdForToken(token)
  if (!contractId) return null
  const [c] = await db.select().from(contracts).where(eq(contracts.id, contractId))
  if (!c) return null
  const [[leadRow], qs, brand, team] = await Promise.all([
    db.select({ ...LEAD_COLS, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, c.leadId)), quoteList(c), fetchBrand(), db.select().from(members).then(withYou),
  ])
  if (!leadRow) return null
  const lead = await withProject(leadRow)   // (S44R, C9) the Handover fields
  const now = Date.now()
  /* (S42 B-01) out for signature while the quote it signs is being revised: the link waits — no document, no signature */
  const base = linkState(c, !!lead.deletedAt, now)
  const state: LinkState = base === 'open' && (await namedQuoteHold(c)) ? 'quote-updating' : base
  const shows = state === 'open' || state === 'signed'
  const values = shows ? tokenValuesFor(c, lead, brand.details, pickQuote(c, qs), now) : { 'studio.name': c.issuingEntity?.trim() || brand.details.name }
  const signed = state === 'signed' ? signedCopyOf(c) : null
  return {
    state, contract: shows ? c : { ...c, body: null, signedBody: null }, lead, studio: brand.details, brand: brand.kit, values,
    studioSignature: studioSignatureFor(c.createdBy, team), fingerprint: state === 'open' ? fingerprintOf(c, values) : '', signed,
    letterhead: signed?.letterhead ?? letterheadOf(c, brand.details), quote: shows && qs[0] ? { number: qs[0].number, title: qs[0].title, gone: qs[0].gone === 'deleted' } : null,
    token, pdf: shows && c.source === 'uploaded' && c.fileId ? (({ name, thumb }) => ({ name, thumb }))((await keptPdfs([c.fileId])).get(c.fileId) ?? { name: '', thumb: false }) : null,
    deposit: shows ? await depositOf(c) : null,   // (S44R, C7)
    now,
  }
}
/** (pending modules S03) The bytes of the PDF the signing link shows — only while the link opens (out for signature, or signed). */
export async function signingPdfFile(token: string): Promise<{ fileId: string; name: string } | null> {
  const d = await fetchSigning(token)
  if (!d || (d.state !== 'open' && d.state !== 'signed') || d.contract.source !== 'uploaded' || !d.contract.fileId || !d.pdf?.name) return null
  return { fileId: d.contract.fileId, name: d.pdf.name }
}

/* ── Tools › Contracts: every live contract in the studio with its lead ── */
export type StudioContractRow = Contract & { leadName: string; /** (UX audit C1) Mark as signed's next step */ leadStage: string }
export type StudioContractsData = {
  contracts: StudioContractRow[]; leads: { id: string; name: string }[]; viewer: ContractViewer; /** (REG-634) Send together's WhatsApp draft */ studioName: string
  /** (UX audit C2) the quotes the contracts name, by id, and Settings' quote approval — the list's send checks (C4: with the amount each signs) */ quotes: Record<string, NamedQuote>; approvalRequired: boolean
  /** (S44Q — row 334) the member approves quotes: their send approves a Draft quote a contract names */ canApprove: boolean
  /** (pending modules S03) the Signing links window and how many standard PDFs the library holds */ linkDays: number; standardDocs: number
  now: number
}
export async function fetchStudioContracts(): Promise<StudioContractsData> {
  const viewer = await fetchViewer()
  const [rows, clients, visible, brand, approval] = await Promise.all([
    db.select({ contract: contracts, leadName: leads.name, leadStage: leads.stage }).from(contracts).innerJoin(leads, eq(leads.id, contracts.leadId))
      .where(and(isNull(contracts.archivedAt), isNull(contracts.deletedAt), isNull(leads.deletedAt))).orderBy(asc(contracts.createdAt)),
    db.select({ id: leads.id, name: leads.name }).from(leads).where(isNull(leads.deletedAt)).orderBy(asc(leads.name)),
    visibleLeadIds(viewer),
    fetchBrand(),
    fetchQuoteApproval(),
  ])
  /* (REG-634, parity §8.2 · E-98) Who sees leads: the studio list, and the lead picker behind New Contract, hold only the leads the member sees. */
  const sees = (leadId: string) => !visible || visible.has(leadId)
  const list = rows.filter((r) => sees(r.contract.leadId)).map((r) => ({ ...r.contract, leadName: r.leadName, leadStage: r.leadStage }))
  return { contracts: list, leads: await nameDirectClients(clients.filter((l) => sees(l.id))), viewer: { id: viewer.id, role: viewer.role }, studioName: brand.details.name, quotes: await namedQuotesOf(list), approvalRequired: approval === 'required', canApprove: await isApprover(viewer.id, viewer.role), linkDays: (await fetchContractRules()).linkDays, standardDocs: await countStandardDocs(), now: Date.now() }
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
export type ContractTemplateRow = ContractTemplate & { usedBy: number; author: string | null; authorColor: string | null; /** (verify round 3) whoever wrote it — the Deleted sheet's rule names them (`author` is whoever saved it last) */ maker: string | null }
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
  const rows = all.map((t) => { const m = by.get(t.updatedBy ?? t.createdBy ?? ''); return { ...t, usedBy: n.get(t.id) ?? 0, author: m?.name ?? null, authorColor: m?.color ?? null, maker: t.createdBy ? by.get(t.createdBy)?.name ?? null : null } })
  const viewer = await fetchViewer(); const visible = await visibleLeadIds(viewer)
  return { templates: rows.filter((t) => !t.deletedAt), deleted: rows.filter((t) => !!t.deletedAt), leads: await nameDirectClients(clients.filter((l) => !visible || visible.has(l.id))), viewer: { id: viewer.id, role: viewer.role }, now: Date.now() }
}
export type ContractTemplateEditorData = { template: ContractTemplate; studio: StudioDetails; brand: BrandKit; usedBy: number; values: TokenValues; now: number; /** (sweep S2 #16) why this viewer may not rename or delete it (its author, an Owner or an Admin may), else null */ changeBlock: string | null }
export async function fetchContractTemplateEditor(templateId: string): Promise<ContractTemplateEditorData | null> {
  const [t] = await db.select().from(contractTemplates).where(and(eq(contractTemplates.id, templateId), isNull(contractTemplates.deletedAt)))
  if (!t) return null
  const [brand, uses] = await Promise.all([fetchBrand(), db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.templateId, templateId), isNull(contracts.deletedAt)))])
  const now = Date.now()
  /* A template previews with the studio's own details and placeholder client values (no lead). */
  const values: TokenValues = {
    'client.name': 'Client name', 'client.phone': 'Client phone', 'client.email': 'client@email.com', 'client.company': 'Company', 'client.uen': 'Company UEN', 'lead.address': 'Property address', 'lead.propertyType': 'Property type', 'lead.projectRef': 'Project ref',
    'studio.name': brand.details.name, 'studio.address': brand.details.address, 'studio.phone': brand.details.phone, 'studio.email': brand.details.email, 'studio.uen': brand.details.uen, 'studio.gst': brand.details.gstReg || 'GST reg. no.',
    'quote.number': 'OM-00000', 'quote.total': 'S$0.00', 'quote.validUntil': 'Quote valid until', 'date.today': longDate(new Date(now)), 'date.contract': 'Contract date',
    'quote.deposit': 'S$0.00', 'project.number': 'P-0000-000', 'project.completedOn': 'Completion date', 'project.defectsPeriod': '12 months', 'project.defectsUntil': 'Defects period ends',   // (S44R, C7 · C9)
  }
  const { templateChangeBlock } = await import('@/lib/company/template-rules')
  return { template: t, studio: brand.details, brand: brand.kit, usedBy: uses.length, values, now, changeBlock: templateChangeBlock(await fetchViewer(), t.createdBy) }
}
/** The contract picker (New Contract › From Template): the live templates, light. */
export type ContractTemplateOption = { id: string; title: string; body: string; updatedAt: Date; isDefault: boolean; /** (REG-664) */ folderId: string | null; /** (UX audit C6) the picker opens on the last-used one when no default is set */ lastUsedAt: Date | null
  /** (pending modules S03) a standard PDF, and its file's name */ kind: string; fileName: string | null }
/** (REG-664) The picker's data: the live templates and Templates › Contracts' folders, browsed as the gallery files them. */
export type ContractPickerData = { templates: ContractTemplateOption[]; folders: { id: string; name: string; parentId: string | null }[]
  /** (the calm UI build 2026-10-27, 4-38) the studio's letterhead, so the picker's cards draw each template's own page as the gallery does */
  paper?: { brand: BrandKit; studio: StudioDetails } }
/** (REG-632, Q-13) The default first, then the most recently used. */
export async function fetchContractTemplateOptions(): Promise<ContractTemplateOption[]> {
  return db.select({ id: contractTemplates.id, title: contractTemplates.title, body: contractTemplates.body, updatedAt: contractTemplates.updatedAt, isDefault: contractTemplates.isDefault, folderId: contractTemplates.folderId, lastUsedAt: contractTemplates.lastUsedAt, kind: contractTemplates.kind, fileName: contractTemplates.fileName }).from(contractTemplates).where(isNull(contractTemplates.deletedAt)).orderBy(desc(contractTemplates.isDefault), desc(contractTemplates.lastUsedAt), asc(contractTemplates.title))
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
  bundle: ContractBundle; documents: { contract: Contract; values: TokenValues; signed: SignedCopy | null; letterhead: SignedLetterhead; /** (pending modules S03) an uploaded document's PDF */ pdf: { name: string; thumb: boolean } | null }[]; lead: ContractLead; studio: StudioDetails; brand: BrandKit
  studioSignature: SignedStudioSignature
  /** (REG-631, Q-06) The whole set's fingerprint (1.0's whole-set hash, B-29) over the documents still to sign. */
  fingerprint: string
  /** (S44R — UAT row 358, call C7) the deposit the set's agreement asks for — the page ends on "Pay the deposit" once it is signed */
  deposit: DepositView | null
  now: number
}
export async function fetchBundleSigning(bundleId: string): Promise<BundleSigningData | null> {
  const [b] = await db.select().from(contractBundles).where(eq(contractBundles.id, bundleId))
  if (!b) return null
  const [[leadRow], docs, qsRaw, brand, team] = await Promise.all([
    db.select({ ...LEAD_COLS, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, b.leadId)),
    db.select().from(contracts).where(and(eq(contracts.bundleId, bundleId), isNull(contracts.deletedAt), isNull(contracts.archivedAt))).orderBy(asc(contracts.bundlePosition), asc(contracts.createdAt)),   // (REG-633, parity Q-16) as ticked
    db.select(QUOTE_COLS).from(quotes).where(eq(quotes.leadId, b.leadId)), fetchBrand(), db.select().from(members).then(withYou),
  ])
  if (!leadRow) return null
  const lead = await withProject(leadRow)   // (S44R, C9)
  const qs = await withDeposits(qsRaw)   // (S44R, C7)
  const now = Date.now()
  /* (REG-631, Q-07) A document moved back to Draft leaves the link; no live document, or a deleted lead, and the link is dead. */
  const live = docs.filter((c) => c.status !== 'Draft')
  /* (pending modules S03) a set stopped by the studio is no longer active; one out for signature past its window has expired */
  const out = live.some((c) => c.status === 'Sent to Client') && !b.signedAt
  const base: LinkState = lead.deletedAt || !live.length || (b.cancelledAt && out) ? 'inactive' : out ? (b.signExpiresAt && b.signExpiresAt.getTime() <= now ? 'expired' : 'open') : 'signed'
  /* (S42 B-01) a set waits while the quote any document still to sign names is being revised — one signature signs them all */
  let state: LinkState = base
  if (base === 'open') for (const c of live) if (c.status === 'Sent to Client' && await namedQuoteHold(c)) { state = 'quote-updating'; break }
  const pdfs = await keptPdfs(live.map((c) => (c.source === 'uploaded' ? c.fileId : null)))
  const documents = state === 'inactive' || state === 'expired' || state === 'quote-updating' ? [] : live.map((c) => { const values = tokenValuesFor(c, lead, brand.details, pickQuote(c, qs), now); const signed = signedCopyOf(c); const p = c.source === 'uploaded' && c.fileId ? pdfs.get(c.fileId) : null; return { contract: c, values, signed, letterhead: signed?.letterhead ?? letterheadOf(c, brand.details), pdf: p ? { name: p.name, thumb: p.thumb } : null } })
  const open = documents.filter((d) => d.contract.status === 'Sent to Client')
  return {
    state, bundle: b, documents, lead, studio: brand.details, brand: brand.kit, studioSignature: studioSignatureFor(b.createdBy, team),
    fingerprint: state === 'open' ? setHashOf(open.map((d) => fingerprintOf(d.contract, d.values))) : '',
    deposit: await (async () => { for (const d of documents) { if (!d.contract.askDeposit) continue; const v = await depositOf(d.contract); if (v) return v } return null })(),   // (S44R, C7) the first that asks
    now,
  }
}
/** (pending modules S03) A bundled document's PDF, through the set's link — only while the link opens. */
export async function bundlePdfFile(bundleId: string, contractId: string): Promise<{ fileId: string; name: string } | null> {
  const d = await fetchBundleSigning(bundleId)
  const doc = d && (d.state === 'open' || d.state === 'signed') ? d.documents.find((x) => x.contract.id === contractId) : null
  return doc && doc.contract.fileId && doc.pdf?.name ? { fileId: doc.contract.fileId, name: doc.pdf.name } : null
}

/** (pending modules S03 — 1.0's signing library, Q-26 revisited) The standard PDFs a studio adds to signings: its live PDF templates, newest
    first — Send together lists them under the lead's own documents. */
export type StandardDoc = { id: string; title: string; fileName: string | null; thumb: boolean }
export async function fetchStandardDocs(): Promise<StandardDoc[]> {
  const rows = await db.select({ id: contractTemplates.id, title: contractTemplates.title, fileName: contractTemplates.fileName, thumb: contractTemplateFiles.thumb }).from(contractTemplates)
    .leftJoin(contractTemplateFiles, eq(contractTemplateFiles.templateId, contractTemplates.id))
    .where(and(eq(contractTemplates.kind, 'pdf'), isNull(contractTemplates.deletedAt))).orderBy(desc(contractTemplates.updatedAt))
  return rows.map((r) => ({ id: r.id, title: r.title, fileName: r.fileName, thumb: !!r.thumb }))
}
export async function countStandardDocs(): Promise<number> { return (await fetchStandardDocs()).length }
