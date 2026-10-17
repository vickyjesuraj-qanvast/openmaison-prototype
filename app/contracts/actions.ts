'use server'

import { fetchCaseTrust } from '@/lib/contracts/casetrust-queries'   // (gaps build D, item 6)

import { isNric, maskNric, phoneDigits, phoneDisplay } from '@/lib/format'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, contracts, leadTasks, leads, quotes, type Contract, contractBundles } from '@/lib/db/schema'
import { defaultQuote } from '@/lib/contracts/snapshot'
import { fetchBrand } from '@/lib/templates/queries'
import { issuerChoices } from '@/lib/contracts/issuer'
import { sessionMemberId } from '@/lib/db/session'
import { revalidateLead } from '@/lib/leads/queries'
import { AGREEMENT_TITLE, agreementHtml } from '@/lib/contracts/agreement'
import { bundleSigningPath } from '@/lib/contracts/model'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'
import { signQuoteThrough } from '@/lib/quotes/sign'
import { CONTRACT_HTML_MAX, sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { deviceOf, DRAWN_PATH, linkState, MASKED_NRIC, quoteHoldsSigningRule, type LinkState } from '@/lib/contracts/policy'
import { fingerprintOf, liveValuesFor, namedQuoteBlock, namedQuoteHold, setHashOf, signedSnapshot } from '@/lib/contracts/queries'
import { approveNamedQuote, contractSender } from '@/lib/contracts/approve-named'   // (S44Q — row 334) an approver's send approves the named quote
import { moveStageHref } from '@/lib/leads/move-link'
import { applyContractStatus } from '@/lib/contracts/status'
import { sendBlock } from '@/lib/contracts/readiness'
import { actingMember, afterSent, afterSigned, freshContract } from '@/lib/contracts/automation'
import { canDeleteContract } from '@/lib/contracts/policy'
import { fetchViewer } from '@/lib/leads/visibility'
import { isSgPhone } from '@/lib/format'
import { tellToAnswer } from '@/lib/portal/client-tells'   // (gaps build H)
import { bundleName, tellSigned } from '@/lib/portal/signed-tell'   // (parity map, CP-118 · FR-095)
import { contractIdForToken, newSignToken, windowFrom } from '@/lib/contracts/link-server'   // (pending modules S03)
import { notStartedWords, startedWords, wonOnSigning, type WonOnSigning } from '@/lib/leads/won-on-signing'   // (S44R, C7)
import { depositOptions } from '@/lib/contracts/deposit'
import { depositWhy } from '@/lib/contracts/deposit-model'
import { keepContractPdf } from '@/lib/contracts/files'
import { checkPickedPdf, pdfNameOf, type PickedPdf } from '@/lib/contracts/pdf'
import { canOpenLead } from '@/lib/leads/visibility'
import { contractTemplateFiles, leadEvents } from '@/lib/db/schema'
import { logLeadEvent } from '@/lib/leads/events'
import { dataUrlSize } from '@/lib/leads/file-store'
import { isStandInProvider, signInProvider } from '@/lib/auth/provider'   // (S42 B-03) the one code provider — sign-in's, the portal's, the signing pages'
import { takeTry } from '@/lib/auth/limit'
import { visitorTry } from '@/lib/auth/visitor'
import { deskRefusal, keepOffDesk } from '@/lib/quotes/desk'   // (S44Z) the editors' role rule on the server
import { orThrow, type Refusal } from '@/lib/company/template-rules'

/* Contracts (REG-534): the editor's, the signing page's and the tab's new writes. Every action revalidates the lead's pages,
   the studio list and the editor's own routes. */

const touch = (leadId: string, contractId?: string) => {
  revalidateLead(leadId)
  revalidatePath('/contracts')
  if (contractId) { revalidatePath(`/contracts/${contractId}`); revalidatePath(`/contracts/${contractId}/preview`); revalidatePath('/sign/[id]', 'page') }   // (pending modules S03) the signing page is keyed on its token
}
/** (pending modules S03) Who may touch a contract's link or its PDF: whoever sees its lead (Who sees leads). */
const mayOpen = async (leadId: string) => canOpenLead(await fetchViewer(), leadId)
/** The contract as stored — the client's signing pages read it through here: they ask no role. */
const loadAny = async (id: string) => (await db.select().from(contracts).where(eq(contracts.id, id)))[0] ?? null
/** (S44Z) The studio's actions read their contract through here — the role first (lib/quotes/desk.ts): nothing is read for Marketing. */
const load = async (id: string) => { await keepOffDesk(); return loadAny(id) }
const CONTROL = /[\x00-\x1f]/g
const clean = (s: string | null | undefined, max = 120) => (s ?? '').replace(CONTROL, '').trim().slice(0, max)
/** (REG-631, D-49) A phone keeps its last eight digits after the +65 is dropped — "+65 9123 4567" is 91234567, never 65912345. */
const digits = (s: string | null | undefined) => phoneDigits(s).slice(-8)
/** (REG-631, E-130) The editor's HTML through the allowlist; a document over the cap is refused whole, never cut mid-tag. */
const safeHtml = (h: string) => { if (h.length > CONTRACT_HTML_MAX) throw new Error('too-large'); return sanitizeContractHtml(h) }
/** (REG-631, REG-563) The NRIC the page sends is already masked; a whole number is masked here, anything else dropped. */
const maskedNric = (v: string | null | undefined) => { const t = (v ?? '').trim().toUpperCase(); return MASKED_NRIC.test(t) ? t : t && isNric(t) ? maskNric(t) : null }
const leadGone = async (leadId: string) => !!(await db.select({ deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, leadId)))[0]?.deletedAt

/** "Interior Design Service Agreement", then "… 2", "… 3" for the lead's later ones (the tab's numbering rule, REG-178). (UX audit C10)
 *  Numbered against the same title only — a lead's first Variation Order is "Variation Order", never "Variation Order 2" because an
 *  agreement came before it. */
async function nextTitle(leadId: string, base: string): Promise<string> {
  const rows = await db.select({ title: contracts.title }).from(contracts).where(and(eq(contracts.leadId, leadId), isNull(contracts.deletedAt)))
  const same = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: (\\d+))?$`)
  let top = 0
  for (const r of rows) { const m = same.exec(r.title.trim()); if (m) top = Math.max(top, m[1] ? Number(m[1]) : 1) }
  return top === 0 ? base : `${base} ${top + 1}`
}
/** (UX audit C1) A signed contract's next step, when its lead isn't Won yet: the Move stage window at Won with this contract picked. */
async function wonNext(leadId: string, contractId: string): Promise<{ href: string; line: string } | null> {
  const [l] = await db.select({ stage: leads.stage }).from(leads).where(eq(leads.id, leadId))
  return l && l.stage !== 'Won' ? { href: moveStageHref(leadId, 'won', { contract: contractId }), line: `The lead is still in ${l.stage} — move it to Won` } : null
}

export type CreateContractInput = {
  leadId: string
  /** Start from a contract template (its body and title); `'default'` = the studio's default template when one is set (REG-632, Q-13);
   *  none = the studio's starter agreement. */
  templateId?: string | 'default' | null
  /** Raised from the quote editor: the agreement's Quote chips read this quote. */
  fromQuoteId?: string | null
  /** Import from File: an uploaded PDF, no editable body. `signed` marks it Signed with the file as the signed copy. (pending modules S03)
   *  `file` is the PDF itself, kept in the lead's Files › Contract & VOs — inside this one object, as every long string travels (F205). */
  upload?: { fileName: string; signed: boolean; title?: string; file?: PickedPdf | null } | null
  /** (pending modules S03) A standard document added to a signing (Send together): it goes with the agreement and signs no quote itself. */
  standard?: boolean
}
/** One contract, Draft (or Signed for an already-signed upload) — the recipient is the lead's client; returns the id. */
export async function createContractDoc(input: CreateContractInput): Promise<string | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const [lead] = await db.select({ id: leads.id, name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, input.leadId))
  if (!lead) throw new Error('lead not found')
  const now = new Date()
  const id = randomUUID()
  let title = AGREEMENT_TITLE, body: string | null = agreementHtml(), templateId: string | null = null
  /* (REG-633, contracts parity Q-15) the gates: a template's own, else both on (1.0's library default); a PDF can only be accepted */
  let gates: { requiresScroll: boolean; requiresAccept: boolean; acceptLabel: string | null } = { requiresScroll: true, requiresAccept: true, acceptLabel: null }
  /* (pending modules S03) a standard PDF from the library: the lead gets its own copy of the file, kept with its contract */
  let pdfTemplate: { name: string; data: string; thumb: string | null } | null = null
  if (input.templateId) {
    const [t] = await db.select().from(contractTemplates).where(and(input.templateId === 'default' ? eq(contractTemplates.isDefault, true) : eq(contractTemplates.id, input.templateId), isNull(contractTemplates.deletedAt)))
    if (t) { title = t.title; body = t.body; templateId = t.id; gates = { requiresScroll: t.requiresScroll, requiresAccept: t.requiresAccept, acceptLabel: t.acceptLabel }; await db.update(contractTemplates).set({ lastUsedAt: now }).where(eq(contractTemplates.id, t.id))
      if (t.kind === 'pdf') { const [f] = await db.select().from(contractTemplateFiles).where(eq(contractTemplateFiles.templateId, t.id)); if (!f) throw new Error('The PDF isn’t in the library any more'); pdfTemplate = { name: pdfNameOf(t.fileName ?? t.title), data: f.data, thumb: f.thumb }; body = null; gates = { ...gates, requiresScroll: false } } }
  }
  if (input.upload) gates = { ...gates, requiresScroll: false }
  if (input.upload?.file) { const why = checkPickedPdf(input.upload.file, dataUrlSize); if (why) throw new Error(why) }
  /* (REG-632, parity Q-08 · Q-10) A contract names its quote from the start — the one it was raised from, else the lead's Signed quote,
     else its latest — and is issued by that quote's entity. Stored, so it never reads another quote in its place. */
  const qs = await db.select({ id: quotes.id, status: quotes.status, issuingEntity: quotes.issuingEntity, archivedAt: quotes.archivedAt, deletedAt: quotes.deletedAt }).from(quotes).where(and(eq(quotes.leadId, lead.id), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt))   /* (REG-1079) never a variation order */
  const quote = input.fromQuoteId ? qs.find((q) => q.id === input.fromQuoteId) ?? null : input.standard ? null : defaultQuote(qs.filter((q) => !q.archivedAt))
  if (input.upload) { title = clean(input.upload.title) || input.upload.fileName.replace(/\.pdf$/i, ''); body = null }
  const signed = !!input.upload?.signed
  /* (pending modules S03) the PDF itself, in the lead's Files › Contract & VOs — the import's, or the library's copy */
  const picked: PickedPdf | null = input.upload?.file ?? (pdfTemplate ? { name: pdfTemplate.name, data: pdfTemplate.data, thumb: pdfTemplate.thumb } : null)
  const fileId = picked ? await keepContractPdf(db, lead.id, picked, now) : null
  if (fileId && typeof fileId !== 'string') throw new Error(fileId.error)
  const fileName = input.upload ? (picked ? pdfNameOf(picked.name) : input.upload.fileName) : pdfTemplate ? pdfTemplate.name : null
  await db.insert(contracts).values({
    id, leadId: lead.id, title: await nextTitle(lead.id, title), status: signed ? 'Signed' : 'Draft', createdAt: now, updatedAt: now,
    body, recipientName: lead.name, recipientPhone: digits(lead.phone), contractDate: now, templateId, fromQuoteId: quote?.id ?? null, issuingEntity: quote?.issuingEntity ?? null,
    source: input.upload || pdfTemplate ? 'uploaded' : 'composed', fileName, fileId: fileId ?? null,
    signedAt: signed ? now : null, signedCopy: signed ? fileName : null, createdBy: stampBy, ...gates,
    signToken: newSignToken(),   // (pending modules S03) the link's own key
  })
  if (signed) { const c = await load(id); if (c) { await db.update(contracts).set({ ...await signedSnapshot(c, now), markedBy: await actingMember() }).where(eq(contracts.id, id)); const f = await freshContract(id); if (f) await afterSigned(f, now, { marked: true }) } }   // (REG-631, Q-05 · REG-634)
  touch(lead.id, id)
  return id
}

export type ContractDocPatch = Partial<Pick<Contract, 'title' | 'body' | 'recipientName' | 'recipientPhone' | 'issuingEntity' | 'fromQuoteId' | 'requiresScroll' | 'requiresAccept' | 'acceptLabel'>> & { contractDate?: number | null }
/** The editor's autosave: title · body · recipient · date · issuing entity · the quote it names. Returns the new updatedAt. */
export async function saveContractDoc(contractId: string, patch: ContractDocPatch): Promise<number | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  if (c.status === 'Signed') throw new Error('signed')   // (REG-631, parity Q-04) a signed contract's title, recipient, date and text stay as signed
  const now = new Date()
  const set: Partial<typeof contracts.$inferInsert> = { updatedAt: now }
  if (patch.title !== undefined) set.title = clean(patch.title) || c.title
  if (patch.body !== undefined) set.body = safeHtml(patch.body ?? '')
  if (patch.recipientName !== undefined) set.recipientName = clean(patch.recipientName, 80) || null
  if (patch.recipientPhone !== undefined) set.recipientPhone = digits(patch.recipientPhone) || null
  /* (REG-632, parity Q-08) The quote it names: one of the lead's quotes, or none; picking a quote takes its issuing entity too (Q-10). */
  if (patch.fromQuoteId !== undefined) {
    if (patch.fromQuoteId) {
      const [q] = await db.select({ id: quotes.id, issuingEntity: quotes.issuingEntity }).from(quotes).where(and(eq(quotes.id, patch.fromQuoteId), eq(quotes.leadId, c.leadId), isNull(quotes.deletedAt)))
      if (!q) throw new Error('quote not found')
      set.fromQuoteId = q.id
      if (patch.issuingEntity === undefined) set.issuingEntity = q.issuingEntity ?? null
    } else set.fromQuoteId = null
  }
  /* (REG-632, parity Q-10) Issued by one of Company › Profile's entities; the first is the studio itself (stored as none). */
  if (patch.issuingEntity !== undefined) {
    const name = clean(patch.issuingEntity, 120)
    const choices = issuerChoices((await fetchBrand()).details, c.issuingEntity)   // (REG-647) a retired entity stays only on what already names it
    if (name && !choices.includes(name)) throw new Error('entity not found')
    set.issuingEntity = name && name !== choices[0] ? name : null
  }
  if (patch.contractDate !== undefined) set.contractDate = patch.contractDate ? new Date(patch.contractDate) : null
  /* (REG-633, contracts parity Q-15) Before the client signs: read to the end · tick to accept, with the tick's words */
  if (patch.requiresScroll !== undefined) set.requiresScroll = !!patch.requiresScroll && c.source !== 'uploaded'
  if (patch.requiresAccept !== undefined) set.requiresAccept = !!patch.requiresAccept
  if (patch.acceptLabel !== undefined) set.acceptLabel = clean(patch.acceptLabel, 160) || null
  /* (S44R, C7) the deposit follows the quote it names: another quote that has no first payment to ask for (or none named) lets the ask go */
  if (c.askDeposit && (set.fromQuoteId !== undefined || set.issuingEntity !== undefined)) {
    const qid = set.fromQuoteId !== undefined ? set.fromQuoteId : c.fromQuoteId
    const [q] = qid ? await db.select({ id: quotes.id, number: quotes.number, amountMinor: quotes.amountMinor, signedAmountMinor: quotes.signedAmountMinor, issuingEntity: quotes.issuingEntity, leadId: quotes.leadId }).from(quotes).where(and(eq(quotes.id, qid), isNull(quotes.deletedAt))) : []
    if (!q || (await depositOptions([q], set.issuingEntity !== undefined ? set.issuingEntity ?? null : c.issuingEntity))[q.id]?.why) set.askDeposit = false
  }
  await db.update(contracts).set(set).where(eq(contracts.id, contractId))
  touch(c.leadId, contractId)
  return now.getTime()
}

/** Automation: the two switches. */
export async function setContractAutomation(contractId: string, patch: { reminders?: boolean; thankYou?: boolean }): Promise<void | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  await db.update(contracts).set({ ...(patch.reminders !== undefined ? { reminders: patch.reminders } : {}), ...(patch.thankYou !== undefined ? { thankYou: patch.thankYou } : {}), updatedAt: new Date() }).where(eq(contracts.id, contractId))
  touch(c.leadId, contractId)
}

/**
 * (S44R — UAT row 358, call C7, as recommended — her UAT ask 2026-10-15) Send for digital signature's *Ask for the deposit*: saved as it is
 * ticked (every way the link goes out — Send, Copy link, Send together — then carries it). The signing page ends on "Pay the deposit": the named
 * quote's first payment stage, to its issuing entity's PayNow. A signed contract stays as it was signed; the deposit needs a quote with a first
 * payment and somewhere to pay it.
 */
export async function setContractDeposit(contractId: string, o: { on: boolean }): Promise<{ on: boolean } | { error: string }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c || c.deletedAt) return { error: 'This contract is gone' }
  if (!(await mayOpen(c.leadId))) return { error: 'You can’t open this lead' }
  if (c.status === 'Signed') return { error: 'A signed contract stays as it was signed' }
  const on = o?.on === true
  if (on) {
    if (!c.fromQuoteId) return { error: depositWhy.noQuote }
    const [q] = await db.select({ id: quotes.id, number: quotes.number, amountMinor: quotes.amountMinor, signedAmountMinor: quotes.signedAmountMinor, issuingEntity: quotes.issuingEntity, leadId: quotes.leadId }).from(quotes).where(and(eq(quotes.id, c.fromQuoteId), isNull(quotes.deletedAt)))
    if (!q) return { error: depositWhy.noQuote }
    const opt = (await depositOptions([q], c.issuingEntity))[q.id]
    if (opt?.why) return { error: opt.why }
  }
  await db.update(contracts).set({ askDeposit: on, updatedAt: new Date() }).where(eq(contracts.id, contractId))
  touch(c.leadId, contractId)
  return { on }
}

/** Send for digital signature: the recipient as confirmed in the dialog, status Sent to Client, the Sent date stamped once. */
export async function sendContract(contractId: string, recipient: { name: string; phone: string }): Promise<{ status: string; sentAt: number; updatedAt: number; /** (pending modules S03) when the link stops opening */ expiresAt: number | null } | { error: string }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  const block = sendBlock(c); if (block) throw new Error(block)   // (REG-634, parity Q-22) empty, or nowhere for the client to sign
  const who = await contractSender()   // (S44Q — row 334)
  if (c.status !== 'Signed') { const why = await namedQuoteBlock(c, who.approver); if (why) return { error: why } }   // (UX audit C2) the quote it signs is still a Draft
  if (c.deletedAt || c.archivedAt) throw new Error('inactive')
  if (!isSgPhone(digits(recipient.phone) || c.recipientPhone || '')) throw new Error('phone')
  const now = new Date()
  const status = c.status === 'Signed' ? 'Signed' : 'Sent to Client'
  const sentAt = c.sentAt ?? now
  /* (pending modules S03) each send opens the link for the studio's window (Signing links, 7 days by default) */
  const window = status === 'Sent to Client' ? { signExpiresAt: c.toRead ? null : await windowFrom(now), signToken: c.signToken ?? newSignToken() } : {}   // (S44R, C9) a letter to read never runs out
  /* (REG-633, E-118) Sent on its own, it leaves any bundle: its link is its own again. */
  await db.update(contracts).set({ status, sentAt, sentBy: await actingMember(), recipientName: clean(recipient.name, 80) || c.recipientName, recipientPhone: digits(recipient.phone) || c.recipientPhone, bundleId: null, bundlePosition: null, updatedAt: now, ...window }).where(eq(contracts.id, contractId))
  { const fresh = await freshContract(contractId); if (fresh && status === 'Sent to Client' && !c.toRead) await afterSent(fresh, now) }   // (REG-634, Q-23 · Q-25) · (S44R, C9) a letter to read is followed up by nobody
  if (status === 'Sent to Client' && !c.toRead) await tellToAnswer({ kind: 'agreement', id: contractId })   // (gaps build H, H-Q17)
  if (status === 'Sent to Client') await approveNamedQuote(c, who)   // (S44Q — row 334) the approver's send is the approval
  touch(c.leadId, contractId)
  return { status, sentAt: sentAt.getTime(), updatedAt: now.getTime(), expiresAt: 'signExpiresAt' in window && window.signExpiresAt ? window.signExpiresAt.getTime() : null }
}

/**
 * (REG-631, contracts parity Q-07) Copying a Draft's signing link shares it, so the contract is Sent to Client from that moment — a
 * link pasted into any chat opens, and the lists say it is out. A blank document is not shared. Returns the status now.
 */
export async function shareContractLink(contractId: string): Promise<{ status: string; sentAt: number | null } | { error: string }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  if (c.deletedAt || c.archivedAt) throw new Error('inactive')
  if (c.status !== 'Draft') return { status: c.status, sentAt: c.sentAt?.getTime() ?? null }
  const block = sendBlock(c); if (block) throw new Error(block)   // (REG-634, parity Q-22)
  const who = await contractSender()   // (S44Q — row 334)
  { const why = await namedQuoteBlock(c, who.approver); if (why) return { error: why } }   // (UX audit C2)
  if (!isSgPhone(c.recipientPhone ?? '')) throw new Error('phone')
  const now = new Date()
  await db.update(contracts).set({ status: 'Sent to Client', sentAt: c.sentAt ?? now, sentBy: await actingMember(), updatedAt: now, signExpiresAt: c.toRead ? null : await windowFrom(now), signToken: c.signToken ?? newSignToken() }).where(eq(contracts.id, contractId))   // (pending modules S03) the window opens · (S44R, C9) a letter to read never runs out
  if (!c.toRead) { const fresh = await freshContract(contractId); if (fresh) await afterSent(fresh, now) }
  if (!c.toRead) await tellToAnswer({ kind: 'agreement', id: contractId })   // (gaps build H, H-Q17)
  await approveNamedQuote(c, who)   // (S44Q — row 334)
  touch(c.leadId, contractId)
  return { status: 'Sent to Client', sentAt: (c.sentAt ?? now).getTime() }
}

/** The studio marks it signed (a paper copy, or the client signed elsewhere): the date, and the signed copy's name when one is attached.
 *  (pending modules S03) `file` — the signed copy itself, kept in the lead's Files › Contract & VOs; the contract opens it from then on. */
export async function markContractSigned(contractId: string, o: { signedOn: number; fileName?: string | null; file?: PickedPdf | null }): Promise<void | { error: string } | { /** (S44R, C7) the project the signature started */ started: { projectId: string; number: string; words: string } }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  if (c.status === 'Signed') return
  { const held = await namedQuoteHold(c); if (held) return { error: quoteHoldsSigningRule(held) } }   // (S42 B-01) the studio's own mark waits as the client's signature does
  const now = new Date()
  const signedAt = new Date(o.signedOn)
  let signedFileId: string | null = null
  if (o.file) {
    if (!(await mayOpen(c.leadId))) return { error: 'You can’t open this lead' }
    const kept = await keepContractPdf(db, c.leadId, o.file, now)
    if (typeof kept !== 'string') return kept
    signedFileId = kept
  }
  const copyName = o.file ? pdfNameOf(o.file.name) : o.fileName ? clean(o.fileName, 160) : null
  await db.update(contracts).set({ status: 'Signed', signedAt, sentAt: c.sentAt ?? signedAt, markedBy: await actingMember(), signedCopy: copyName ?? (c.signedCopy ?? `${c.title}.pdf`), signedFileId, ...await signedSnapshot(c, signedAt), updatedAt: now }).where(eq(contracts.id, contractId))   // (REG-631, Q-05) kept as marked
  await signQuoteThrough(c, signedAt)   // (REG-626, parity Q-31) the quote it was raised from is signed with it
  /* (S44R — UAT row 358, call C7) a signed agreement may start the project — Settings › Projects › When a project starts, through the Won step's rules */
  const fresh = await freshContract(contractId)
  const started = fresh ? await wonOnSigning(fresh, { at: new Date(), signer: null }) : null
  if (fresh) await afterSigned(fresh, signedAt, { marked: true, started })   // (REG-634, Q-23 · Q-25)
  await tellSigned({ leadId: c.leadId, ref: `contract:${contractId}`, document: c.title })   // (parity map, CP-118) the client hears it is signed
  touch(c.leadId, contractId)
  if (started?.moved) return { started: { projectId: started.projectId, number: started.number, words: startedWords(started) } }
}

/** Back to Draft / Sent from the status pill — the one rule for every screen (REG-631, parity Q-04). */
export async function setContractStatusDoc(contractId: string, status: 'Draft' | 'Sent to Client'): Promise<void | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  await applyContractStatus(c, status)
  touch(c.leadId, contractId)
}

/**
 * The client signs online (the signing page): the typed name is the signature; Signed with the page's copy as the signed copy.
 * (REG-631) Only an open link signs (Q-07); `fingerprint` is the text the page showed, and a document changed since is refused so the
 * page can show the new one (Q-06, 1.0's hash check); the text as signed is kept (Q-05); the NRIC arrives masked (REG-563).
 */
export type SignResult = { signedAt: number } | { changed: true } | { refused: LinkState | 'accept' | 'casetrust' | 'code' }   // (gaps build D, item 6) the CaseTrust tick · (S42 B-03) the code
/** (REG-633, contracts parity Q-15 · Q-18 · Q-19) How the client signed: typed or drawn, when each document's words were ticked, the device. */
export type SigningInput = { kind?: 'type' | 'draw'; drawing?: string | null; acceptedAt?: Record<string, number>; userAgent?: string; timezone?: string
  /** (S42 B-03) the one-time code the client typed — checked by the sign-in provider against the number it went to */ code?: string
  /** (gaps build D, item 6) when the client ticked the CaseTrust deposit-protection disclosure (a CaseTrust-accredited studio asks it) */ caseTrustAt?: number | null }
/** (gaps build D, item 6 — 1.0's `casetrust_acknowledged`) The CaseTrust tick, capped at the server's clock — null when the studio isn't
    CaseTrust-accredited; `false` when it is and the client never ticked it (the sign is refused). */
async function caseTrustFor(s: SigningInput | undefined, now: Date): Promise<Date | null | false> {
  if (!(await fetchCaseTrust())) return null
  const t = s?.caseTrustAt
  return typeof t === 'number' && t > 0 ? new Date(Math.min(t, now.getTime())) : false
}
/** The signing record's columns from what the page sends — the drawing only as the pad stores it, the device summarised, the phone masked. */
function recordOf(s: SigningInput | undefined, phone: string | null) {
  const kind = s?.kind === 'draw' && s.drawing && DRAWN_PATH.test(s.drawing) ? 'draw' : 'type'
  const tz = (s?.timezone ?? '').replace(/[^A-Za-z0-9_/+-]/g, '').slice(0, 60)
  const masked = phone ? phoneDisplay(phone).replace(/^(\+65 )?(\d{4}) (\d{4})$/, (_m, cc: string | undefined, _a: string, b: string) => `${cc ?? '+65 '}•••• ${b}`) : null
  return { signatureKind: kind, signatureData: kind === 'draw' ? s!.drawing! : null, signerUserAgent: s?.userAgent ? deviceOf(s.userAgent).slice(0, 80) : null, signerTimezone: tz || null, signerPhone: masked, verificationMethod: isStandInProvider() ? 'demo_code' : 'phone_code' }   // (S42 B-03) the record says when no code really went
}
/* (sweep S2 #15) The tick is the client's; its time is capped at the server's — a phone clock running fast could never sign before. */
const acceptedFor = (c: Contract, s: SigningInput | undefined, now: Date): Date | null => { const t = s?.acceptedAt?.[c.id]; return typeof t === 'number' && t > 0 ? new Date(Math.min(t, now.getTime())) : null }
/* ── (S42 B-03 — the audit's Major: the signing pages said a code was sent when none was) The code step goes through the one provider ──
   (lib/auth/provider.ts — sign-in's and the portal's): Send code asks it to send one to the number the link went to; the signature carries the
   code and the provider checks it. The prototype's stand-in sends nothing and takes any six digits, and the pages say so (`demo`). With a real
   provider 1.0's limits hold too — five tries a minute for a number and for a visitor (never on the stand-in, as the portal's). */
const SIGN_TOO_MANY = 'Too many tries — wait a minute and try again'
async function signTry(step: 'send' | 'check', phone: string): Promise<boolean> {
  if (isStandInProvider()) return true
  return takeTry(`sign-${step}:${phone}`) && (await visitorTry(step))
}
async function codeOk(phone: string | null, code: string | undefined): Promise<boolean> {
  const p = digits(phone), c = String(code ?? '').replace(/\D/g, '')
  if (c.length !== 6) return false
  if (!(await signTry('check', p))) return false
  return signInProvider().checkCode({ kind: 'phone', value: p }, c).catch(() => false)
}
/** Send code: to the number the signing link (or the set's link) went to — only while it opens for signing. `demo`: no text goes, any six digits sign. */
export async function sendSigningCode(o: { token?: string; bundleId?: string }): Promise<{ demo: boolean } | { error: string }> {
  let phone: string | null = null
  if (typeof o?.token === 'string') {
    const id = await contractIdForToken(o.token); const c = id ? await loadAny(id) : null
    if (!c || c.toRead || linkState(c, await leadGone(c.leadId), Date.now()) !== 'open') return { error: 'This link isn’t open for signing' }   // (S44R, C9) a letter to read has nothing to sign
    phone = c.recipientPhone
  } else if (typeof o?.bundleId === 'string') {
    const [b] = await db.select().from(contractBundles).where(eq(contractBundles.id, o.bundleId))
    if (!b || b.signedAt || b.cancelledAt || (b.signExpiresAt && b.signExpiresAt.getTime() <= Date.now())) return { error: 'This link isn’t open for signing' }
    phone = b.recipientPhone
  } else return { error: 'This link isn’t open for signing' }
  const p = digits(phone)
  if (!(await signTry('send', p))) return { error: SIGN_TOO_MANY }
  if (!isStandInProvider() && !isSgPhone(p)) return { error: 'There’s no mobile number on this link — ask the studio to send it again' }
  const sent = await signInProvider().sendCode({ kind: 'phone', value: p }).catch(() => ({ error: 'unsent' }))
  if ('error' in sent) return { error: 'Couldn’t send the code — please try again' }
  return { demo: isStandInProvider() }
}

/* (pending modules S03) The page signs through its link's token — the contract's id signs nothing. */
export async function signContractOnline(token: string, name: string, nric?: string | null, fingerprint?: string, signing?: SigningInput): Promise<SignResult> {
  const contractId = await contractIdForToken(token)
  const c = contractId ? await loadAny(contractId) : null
  if (!c || !contractId || c.toRead) return { refused: 'inactive' }   // (S44R, C9) a letter to read has nothing to sign
  if (c.status === 'Signed') return { signedAt: (c.signedAt ?? new Date()).getTime() }
  const state = linkState(c, await leadGone(c.leadId), Date.now())
  if (state !== 'open') return { refused: state }
  if (await namedQuoteHold(c)) return { refused: 'quote-updating' }   // (S42 B-01) never a signature over a quote the studio is revising
  const now = new Date()
  const who = clean(name, 80)
  if (!who) throw new Error('name')
  const live = await liveValuesFor(c, now.getTime())
  if (!live || (fingerprint !== undefined && fingerprint !== live.fingerprint)) return { changed: true }
  if (!(await codeOk(c.recipientPhone, signing?.code))) return { refused: 'code' }   // (S42 B-03) the provider checks the code
  const accepted = acceptedFor(c, signing, now)
  if (c.requiresAccept && !accepted) return { refused: 'accept' }   // (REG-633, parity Q-15) the document's words were never ticked
  const caseTrust = await caseTrustFor(signing, now)
  if (caseTrust === false) return { refused: 'casetrust' }   // (gaps build D, item 6) the disclosure was never ticked
  // (REG-563, owner 2026-09-23: "masked only when customer enters it") The number the client types is never stored whole: the
  // last four characters are kept ("•••••567A") and that is what prints under their signature.
  const masked = maskedNric(nric)
  await db.update(contracts).set({ status: 'Signed', signedAt: now, signedBy: who, signedNric: masked, sentAt: c.sentAt ?? now, signedCopy: `${c.title} — signed online.pdf`, ...await signedSnapshot(c, now), acceptedAt: accepted, ...recordOf(signing, c.recipientPhone), caseTrustAt: caseTrust || null, updatedAt: now }).where(eq(contracts.id, contractId))
  await signQuoteThrough(c, now)   // (REG-626, parity Q-31)
  /* (S44R — UAT row 358, call C7) the agreement may start the project — Settings › Projects › When a project starts, through the Won step's rules */
  const signedNow = await freshContract(contractId)
  const started = signedNow ? await wonOnSigning(signedNow, { at: now, signer: who }) : null
  /* (REG-604) (UX audit C1) the bell's row leads on to Won while the lead isn't there — the Move stage window with this contract picked; (S44R) or
     to the project the signature made, or says why it couldn't */
  { const won = started?.moved ? null : await wonNext(c.leadId, c.id)
    await notify('quote_signed', [...await leadMemberIds(c.leadId), ...await studioRunnerIds()], { title: `${who} signed ${c.title}`,
      body: started?.moved ? `${startedWords(started)} — the signed copy is on the lead` : won ? `${started?.why ? notStartedWords(started.why) : won.line} — the signed copy is on the lead` : 'The signed copy is on the lead',
      href: started?.moved ? `/projects/${started.projectId}/money` : won?.href ?? `/leads/${c.leadId}/contracts`, leadId: c.leadId, actorId: null }) }
  if (signedNow) await afterSigned(signedNow, now)   // (REG-634, Q-25)
  await tellSigned({ leadId: c.leadId, ref: `contract:${contractId}`, document: c.title })   // (parity map, CP-118 · FR-095) the signing confirmation
  touch(c.leadId, contractId)
  return { signedAt: now.getTime() }
}

/** Duplicate and Edit: a fresh Draft with the same document, "(copy)" on the title. */
export async function duplicateContract(contractId: string): Promise<string | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  const now = new Date()
  const id = randomUUID()
  await db.insert(contracts).values({
    id, leadId: c.leadId, title: `${c.title} (copy)`, status: 'Draft', createdAt: now, updatedAt: now, body: c.body, recipientName: c.recipientName, recipientPhone: c.recipientPhone,
    contractDate: now, templateId: c.templateId, fromQuoteId: c.fromQuoteId, source: c.source, fileName: c.fileName, issuingEntity: c.issuingEntity, reminders: c.reminders, thankYou: c.thankYou, createdBy: stampBy,
    requiresScroll: c.requiresScroll, requiresAccept: c.requiresAccept, acceptLabel: c.acceptLabel,
    signToken: newSignToken(), fileId: c.source === 'uploaded' ? c.fileId : null,   // (pending modules S03) its own link; an uploaded PDF is the same file
  })
  touch(c.leadId, id)
  return id
}

/** Save as Template: the document as a contract template in the library (chips kept as chips). */
export async function saveContractAsTemplate(contractId: string, title: string): Promise<string | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const c = await load(contractId)
  if (!c || !c.body) throw new Error('contract not found')
  const now = new Date()
  const id = randomUUID()
  await db.insert(contractTemplates).values({ id, title: clean(title) || c.title, body: c.body, createdBy: stampBy, createdAt: now, updatedAt: now, requiresScroll: c.requiresScroll, requiresAccept: c.requiresAccept, acceptLabel: c.acceptLabel })
  revalidatePath('/company/templates/contracts')
  return id
}

/* ── Deleted Contracts (the tab's / the studio list's sheet): restore · delete forever · empty ── */
/* (REG-634, contracts parity Q-21) Restore, Delete forever and Empty Trash follow the delete rule: the contract's creator, an Owner or an
   Admin — the others in a list are left and counted back, as Deleted Quotes does (REG-625). */
const mineOf = async <R extends { id: string; createdBy: string | null }>(rows: R[]): Promise<R[]> => { const v = await fetchViewer(); return rows.filter((r) => canDeleteContract(v, r)) }
export async function restoreContracts(ids: string[]): Promise<{ done: number; refused: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  if (!ids.length) return { done: 0, refused: 0 }
  const rows = await db.select({ id: contracts.id, leadId: contracts.leadId, createdBy: contracts.createdBy }).from(contracts).where(inArray(contracts.id, ids))
  const mine = await mineOf(rows)
  if (mine.length) await db.update(contracts).set({ deletedAt: null, deletedBy: null, updatedAt: new Date() }).where(inArray(contracts.id, mine.map((r) => r.id)))
  for (const l of new Set(rows.map((r) => r.leadId))) touch(l)
  return { done: mine.length, refused: rows.length - mine.length }
}
async function removeForever(rows: { id: string; leadId: string }[]): Promise<void> {
  const ids = rows.map((r) => r.id)
  if (!ids.length) return
  await db.update(leadTasks).set({ contractId: null }).where(inArray(leadTasks.contractId, ids))   // their tasks stay, unlinked
  await db.delete(contracts).where(inArray(contracts.id, ids))
  for (const l of new Set(rows.map((r) => r.leadId))) touch(l)
}
export async function deleteContractsForever(ids: string[]): Promise<{ done: number; refused: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  if (!ids.length) return { done: 0, refused: 0 }
  const rows = await db.select({ id: contracts.id, leadId: contracts.leadId, createdBy: contracts.createdBy }).from(contracts).where(and(inArray(contracts.id, ids), sql`${contracts.deletedAt} IS NOT NULL`))
  const mine = await mineOf(rows)
  await removeForever(mine)
  return { done: mine.length, refused: rows.length - mine.length }
}
export async function emptyContractTrash(leadId: string | null): Promise<{ done: number; refused: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const rows = await db.select({ id: contracts.id, leadId: contracts.leadId, createdBy: contracts.createdBy }).from(contracts).where(leadId ? and(eq(contracts.leadId, leadId), sql`${contracts.deletedAt} IS NOT NULL`) : sql`${contracts.deletedAt} IS NOT NULL`)
  const mine = await mineOf(rows)
  await removeForever(mine)
  return { done: mine.length, refused: rows.length - mine.length }
}

/**
 * (REG-591) Send together: the picked documents of one lead go out under one bundle and one link; each is marked Sent to Client with
 * the recipient. The id comes from the caller so the link is known before the round trip (the WhatsApp window opens on the press).
 */
export async function sendBundle(bundleId: string, contractIds: string[], recipient: { name: string; phone: string }, o: { /** (pending modules S03) standard PDFs from the library, each added to the lead as a document of its own and sent with the set */ templateIds?: string[] } = {}): Promise<{ bundleId: string; count: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  if (!/^[0-9a-f-]{8,64}$/i.test(bundleId)) throw new Error('bad id')
  const who = await contractSender()   // (S44Q — row 334) an approver's send approves the quotes the documents name
  /* (pending modules S03 — 1.0's "Documents to include" from the signing library) a standard document joins the lead before it goes, in the
     order ticked after the lead's own; a second press (Copy link, then WhatsApp) finds the one the first made instead of adding it twice */
  const picks = [...new Set(contractIds)].slice(0, 20)
  const tpls = [...new Set(o.templateIds ?? [])].slice(0, 10)
  if (tpls.length) {
    /* checked before anything is added to the lead: the number, the one lead, at least two documents that can go, the standard ones real */
    if (!isSgPhone(digits(recipient.phone))) throw new Error('phone')
    const own = picks.length ? await db.select().from(contracts).where(and(inArray(contracts.id, picks), isNull(contracts.deletedAt))) : []
    const leadOf = own[0]?.leadId
    if (!leadOf || own.some((c) => c.leadId !== leadOf)) throw new Error('one lead')
    const ready = []; for (const c of own) if (c.status !== 'Signed' && !c.toRead && !sendBlock(c) && !(await namedQuoteBlock(c, who.approver))) ready.push(c)
    const std = await db.select({ id: contractTemplates.id }).from(contractTemplates).where(and(inArray(contractTemplates.id, tpls), eq(contractTemplates.kind, 'pdf'), isNull(contractTemplates.deletedAt)))
    if (!ready.length || ready.length + std.length < 2) throw new Error('pick two or more documents')
    for (const t of tpls.filter((x) => std.some((r) => r.id === x))) {
      const [had] = await db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.leadId, leadOf), eq(contracts.templateId, t), eq(contracts.bundleId, bundleId), isNull(contracts.deletedAt)))
      picks.push(had?.id ?? await orThrow(createContractDoc({ leadId: leadOf, templateId: t, standard: true })))   // (S44Z) a refusal thrown on
    }
  }
  const ids = picks
  const found = ids.length ? await db.select().from(contracts).where(and(inArray(contracts.id, ids), isNull(contracts.deletedAt))) : []
  const rows = ids.map((id) => found.find((c) => c.id === id)).filter((c): c is Contract => !!c)   // (REG-633, parity Q-16) the order the studio ticked them
  const quoteHeld = new Set<string>()
  for (const c of rows) if (c.status !== 'Signed' && await namedQuoteBlock(c, who.approver)) quoteHeld.add(c.id)   // (UX audit C2) nor a Draft quote under approval
  const live = rows.filter((c) => c.status !== 'Signed' && !c.toRead && !sendBlock(c) && !quoteHeld.has(c.id))   // (REG-634, parity Q-22) each with something to sign · (S44R, C9) never a letter to read
  if (live.length < 2) throw new Error('pick two or more documents')
  const leadId = live[0]!.leadId
  if (live.some((c) => c.leadId !== leadId)) throw new Error('one lead')
  const now = new Date()
  const name = clean(recipient.name, 80), phone = digits(recipient.phone)
  /* (sweep S2 #8) Checked before anything is written (a refused phone left a bundle row behind), and a second press — Copy link, then
     WhatsApp — updates the same bundle instead of inserting its id twice ("Couldn’t send" over a link that worked). */
  if (!isSgPhone(phone || live[0]!.recipientPhone || '')) throw new Error('phone')
  const [had] = await db.select({ id: contractBundles.id, leadId: contractBundles.leadId, signedAt: contractBundles.signedAt }).from(contractBundles).where(eq(contractBundles.id, bundleId))
  if (had && (had.leadId !== leadId || had.signedAt)) throw new Error('bundle taken')
  const until = await windowFrom(now)   // (pending modules S03) the set's window, as a single link's
  if (had) await db.update(contractBundles).set({ recipientName: name || null, recipientPhone: phone || null, sentAt: now, signExpiresAt: until, cancelledAt: null }).where(eq(contractBundles.id, bundleId))
  else await db.insert(contractBundles).values({ id: bundleId, leadId, recipientName: name || null, recipientPhone: phone || null, createdAt: now, sentAt: now, createdBy: stampBy, signExpiresAt: until })
  for (const [i, c] of live.entries()) {
    await db.update(contracts).set({ bundleId, bundlePosition: i, status: 'Sent to Client', sentAt: c.sentAt ?? now, sentBy: await actingMember(), ...(name ? { recipientName: name } : {}), ...(phone ? { recipientPhone: phone } : {}), updatedAt: now, signExpiresAt: until }).where(eq(contracts.id, c.id))
    const fresh = await freshContract(c.id); if (fresh) await afterSent(fresh, now, { quiet: true })   // (REG-634) the follow-ups; one notification below
  }
  await notify('contract_sent', [...await studioRunnerIds(), ...await leadMemberIds(leadId)], { title: `${live.length} documents went out for signature together`, body: live.map((c) => c.title).join(' · '), href: `/leads/${leadId}/contracts`, leadId })
  await tellToAnswer({ kind: 'bundle', id: bundleId, contractIds: live.map((c) => c.id) })   // (gaps build H, H-Q17)
  for (const c of live) await approveNamedQuote(c, who)   // (S44Q — row 334)
  touch(leadId); for (const c of live) touch(leadId, c.id)
  revalidatePath(bundleSigningPath(bundleId))
  return { bundleId, count: live.length }
}

/**
 * (REG-591) The client's one signature on the bundle's page signs every document in it. (REG-631) Only while the link is open (Q-07);
 * the set's fingerprint must match the page's (Q-06); each document keeps its signed copy (Q-05).
 */
export async function signBundleOnline(bundleId: string, name: string, nric?: string | null, fingerprint?: string, signing?: SigningInput): Promise<SignResult & { count?: number }> {
  const [b] = await db.select().from(contractBundles).where(eq(contractBundles.id, bundleId))
  if (!b) throw new Error('bundle not found')
  const who = clean(name, 80)
  if (!who) throw new Error('name')
  if (b.signedAt) return { signedAt: b.signedAt.getTime() }
  if (await leadGone(b.leadId) || b.cancelledAt) return { refused: 'inactive' }   // (pending modules S03) a set the studio stopped
  if (b.signExpiresAt && b.signExpiresAt.getTime() <= Date.now()) return { refused: 'expired' }   // (pending modules S03) past its window
  const masked = maskedNric(nric)
  const now = new Date()
  // (REG-633) the bundle's reading order — the page's fingerprint is taken over the documents in this order
  const rows = await db.select().from(contracts).where(and(eq(contracts.bundleId, bundleId), isNull(contracts.deletedAt), isNull(contracts.archivedAt))).orderBy(asc(contracts.bundlePosition), asc(contracts.createdAt))
  const open = rows.filter((x) => x.status === 'Sent to Client')
  if (!open.length) return { refused: rows.some((x) => x.status === 'Signed') ? 'signed' : 'inactive' }
  for (const c of open) if (await namedQuoteHold(c)) return { refused: 'quote-updating' }   // (S42 B-01) the set waits for the revised quote
  const lives = await Promise.all(open.map((c) => liveValuesFor(c, now.getTime())))
  const setHash = setHashOf(open.map((c, i) => fingerprintOf(c, lives[i]!.values)))
  if (lives.some((l) => !l) || (fingerprint !== undefined && fingerprint !== setHash)) return { changed: true }
  if (open.some((c) => c.requiresAccept && !acceptedFor(c, signing, now))) return { refused: 'accept' }   // (REG-633, parity Q-15)
  if (!(await codeOk(b.recipientPhone ?? open[0]!.recipientPhone, signing?.code))) return { refused: 'code' }   // (S42 B-03)
  const caseTrust = await caseTrustFor(signing, now)
  if (caseTrust === false) return { refused: 'casetrust' }   // (gaps build D, item 6)
  const record = recordOf(signing, b.recipientPhone)
  for (const c of open) {
    await db.update(contracts).set({ status: 'Signed', signedAt: now, signedBy: who, signedNric: masked, sentAt: c.sentAt ?? now, signedCopy: `${c.title} — signed online.pdf`, ...await signedSnapshot(c, now), acceptedAt: acceptedFor(c, signing, now), ...record, caseTrustAt: caseTrust || null, updatedAt: now }).where(eq(contracts.id, c.id))
    await signQuoteThrough(c, now)   // (REG-626)
    const fresh = await freshContract(c.id); if (fresh) await afterSigned(fresh, now)   // (REG-634, Q-25)
  }
  const { verificationMethod: _vm, ...bundleRecord } = record
  await db.update(contractBundles).set({ signedAt: now, signedBy: who, signedNric: masked, signingHash: setHash, ...bundleRecord }).where(eq(contractBundles.id, bundleId))
  /* (S44R — UAT row 358, call C7) the set's first agreement may start the project (a standard PDF never does) — through the Won step's rules */
  let started: WonOnSigning | null = null
  for (const c of open) { const f = await freshContract(c.id); if (!f) continue; started = await wonOnSigning(f, { at: now, signer: who }); if (started.moved || started.why) break }
  /* (REG-604) (UX audit C1) on to Won with the first document picked — the agreement, in the order the studio ticked them */
  { const won = started?.moved ? null : await wonNext(b.leadId, open[0]!.id)
    await notify('quote_signed', [...await leadMemberIds(b.leadId), ...await studioRunnerIds()], { title: `${who} signed ${open.length} documents`,
      body: started?.moved ? `${startedWords(started)} — the signed copies are on the lead` : won ? `${started?.why ? notStartedWords(started.why) : won.line} — the signed copies are on the lead` : 'The signed copies are on the lead',
      href: started?.moved ? `/projects/${started.projectId}/money` : won?.href ?? `/leads/${b.leadId}/contracts`, leadId: b.leadId, actorId: null }) }
  await tellSigned({ leadId: b.leadId, ref: `bundle:${bundleId}`, document: bundleName(open.map((c) => c.title)) })   // (parity map, CP-118) one confirmation for the set
  touch(b.leadId); for (const c of rows) touch(b.leadId, c.id)
  return { signedAt: now.getTime(), count: open.length }
}

/* ── (pending modules S03 — 1.0's resend-signature · cancel-signature · regenerate) the signing link's life ──────────────────────────── */

/** What Stop's Undo puts back: each document as it was out — its token, its window, its bundle place — and the trail line Stop wrote. */
export type LinkUndo = { leadId: string; bundleId: string | null; eventId: string | null
  docs: { id: string; token: string | null; rotated: string; expiresAt: number | null; bundleId: string | null; bundlePosition: number | null }[] }

/**
 * Renew — the link opens for the studio's window again, from now (Send a reminder renews it as it goes; an expired link offers Renew).
 * A document sent together renews its set. The same address: the client's old message works again. `via` says how it reached them.
 */
export async function renewSigningLink(contractId: string, via: 'whatsapp' | 'copy' = 'whatsapp'): Promise<{ expiresAt: number } | { error: string }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c || c.deletedAt) return { error: 'This contract is gone' }
  if (!(await mayOpen(c.leadId))) return { error: 'You can’t open this lead' }
  if (c.status !== 'Sent to Client') return { error: c.status === 'Signed' ? 'It is signed — the link shows the signed copy' : 'It isn’t out for signature — send it first' }
  const now = new Date(), until = await windowFrom(now)
  if (c.bundleId) {
    await db.update(contractBundles).set({ signExpiresAt: until, cancelledAt: null }).where(eq(contractBundles.id, c.bundleId))
    await db.update(contracts).set({ signExpiresAt: until, updatedAt: now }).where(and(eq(contracts.bundleId, c.bundleId), eq(contracts.status, 'Sent to Client'), isNull(contracts.deletedAt)))
  } else await db.update(contracts).set({ signExpiresAt: until, signToken: c.signToken ?? newSignToken(), updatedAt: now }).where(eq(contracts.id, contractId))
  await logLeadEvent(db, c.leadId, via === 'whatsapp' ? 'parity_s03_contract_reminded' : 'parity_s03_contract_renewed', { id: c.id, title: c.title, when: String(until.getTime()), name: c.recipientName ?? undefined })
  touch(c.leadId, contractId)
  return { expiresAt: until.getTime() }
}

/**
 * Stop the link (1.0's cancel): the contract goes back to Draft and gets a new token — the address the client has stops opening and stays
 * dead; the next send makes a new one. A document sent together stops its whole set (one link, one stop). Answers what Undo needs.
 */
export async function stopSigningLink(contractId: string): Promise<LinkUndo | { error: string }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c || c.deletedAt) return { error: 'This contract is gone' }
  if (!(await mayOpen(c.leadId))) return { error: 'You can’t open this lead' }
  if (c.status !== 'Sent to Client') return { error: c.status === 'Signed' ? 'It is signed — a signed contract’s link stays' : 'Its link isn’t out — there is nothing to stop' }
  const now = new Date()
  const docs = c.bundleId ? await db.select().from(contracts).where(and(eq(contracts.bundleId, c.bundleId), eq(contracts.status, 'Sent to Client'), isNull(contracts.deletedAt))) : [c]
  const undo: LinkUndo = { leadId: c.leadId, bundleId: c.bundleId, eventId: null, docs: [] }
  for (const d of docs) {
    const rotated = newSignToken()
    undo.docs.push({ id: d.id, token: d.signToken, rotated, expiresAt: d.signExpiresAt?.getTime() ?? null, bundleId: d.bundleId, bundlePosition: d.bundlePosition })
    await db.update(contracts).set({ status: 'Draft', signToken: rotated, signExpiresAt: null, updatedAt: now }).where(eq(contracts.id, d.id))
  }
  if (c.bundleId) await db.update(contractBundles).set({ cancelledAt: now }).where(eq(contractBundles.id, c.bundleId))
  undo.eventId = await logLeadEvent(db, c.leadId, 'parity_s03_contract_link_stopped', { id: c.id, title: c.title, n: docs.length })
  touch(c.leadId); for (const d of docs) touch(c.leadId, d.id)
  return undo
}

/** Stop's Undo: the same link back, open until the day it was (past that it shows as expired, and Renew is there) — unless it went out again since. */
export async function reopenSigningLink(undo: LinkUndo): Promise<{ ok: true } | { error: string }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const ids = (undo?.docs ?? []).map((d) => d.id).slice(0, 20)
  if (!ids.length) return { error: 'Nothing to put back' }
  const rows = await db.select().from(contracts).where(inArray(contracts.id, ids))
  if (!rows.length || !(await mayOpen(rows[0]!.leadId))) return { error: 'You can’t open this lead' }
  if (rows.some((r) => { const d = undo.docs.find((x) => x.id === r.id)!; return r.status !== 'Draft' || r.signToken !== d.rotated || r.deletedAt })) return { error: 'It went out again since — that link stays stopped' }
  const now = new Date(), fresh = await windowFrom(now)
  for (const d of undo.docs) await db.update(contracts).set({ status: 'Sent to Client', signToken: d.token ?? d.rotated, signExpiresAt: d.expiresAt ? new Date(d.expiresAt) : fresh, bundleId: d.bundleId, bundlePosition: d.bundlePosition, updatedAt: now }).where(eq(contracts.id, d.id))
  if (undo.bundleId) await db.update(contractBundles).set({ cancelledAt: null }).where(eq(contractBundles.id, undo.bundleId))
  if (undo.eventId) await db.delete(leadEvents).where(eq(leadEvents.id, undo.eventId))
  touch(rows[0]!.leadId); for (const r of rows) touch(r.leadId, r.id)
  return { ok: true }
}

/**
 * (pending modules S03) An uploaded contract's PDF, attached or replaced: a contract recorded before files were kept gets its file; a Draft's
 * PDF can be swapped before it goes out (a sent one would change under the client — it is stopped first). Kept in Files › Contract & VOs;
 * a replaced file stays in Files.
 */
export async function attachContractPdf(contractId: string, f: { file: PickedPdf }): Promise<{ fileId: string; name: string } | { error: string }> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the contract is read
  const c = await load(contractId)
  if (!c || c.deletedAt) return { error: 'This contract is gone' }
  if (!(await mayOpen(c.leadId))) return { error: 'You can’t open this lead' }
  if (c.source !== 'uploaded') return { error: 'A written contract has no PDF of its own' }
  if (c.fileId && c.status !== 'Draft') return { error: c.status === 'Signed' ? 'A signed contract keeps the PDF it was signed on' : 'It is out for signature — stop the link first, then replace the PDF' }
  const now = new Date()
  const kept = await keepContractPdf(db, c.leadId, f?.file, now)
  if (typeof kept !== 'string') return kept
  const name = pdfNameOf(f.file.name)
  await db.update(contracts).set({ fileId: kept, fileName: name, ...(c.status === 'Signed' && !c.signedFileId ? { signedCopy: c.signedCopy ?? name } : {}), updatedAt: now }).where(eq(contracts.id, contractId))
  touch(c.leadId, contractId)
  return { fileId: kept, name }
}
