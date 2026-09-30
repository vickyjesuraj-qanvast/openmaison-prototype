'use server'

import { isNric, maskNric, phoneDigits, phoneDisplay } from '@/lib/format'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, contracts, leadTasks, leads, quotes, type Contract, contractBundles } from '@/lib/db/schema'
import { defaultQuote } from '@/lib/contracts/snapshot'
import { fetchBrand } from '@/lib/templates/queries'
import { issuerChoices } from '@/lib/contracts/issuer'
import { sessionMemberSql } from '@/lib/db/session'
import { revalidateLead } from '@/lib/leads/queries'
import { AGREEMENT_TITLE, agreementHtml } from '@/lib/contracts/agreement'
import { bundleSigningPath } from '@/lib/contracts/model'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'
import { signQuoteThrough } from '@/lib/quotes/sign'
import { CONTRACT_HTML_MAX, sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { deviceOf, DRAWN_PATH, linkState, MASKED_NRIC, type LinkState } from '@/lib/contracts/policy'
import { fingerprintOf, liveValuesFor, namedQuoteBlock, setHashOf, signedSnapshot } from '@/lib/contracts/queries'
import { moveStageHref } from '@/lib/leads/move-link'
import { applyContractStatus } from '@/lib/contracts/status'
import { sendBlock } from '@/lib/contracts/readiness'
import { actingMember, afterSent, afterSigned, freshContract } from '@/lib/contracts/automation'
import { canDeleteContract } from '@/lib/contracts/policy'
import { fetchViewer } from '@/lib/leads/visibility'
import { isSgPhone } from '@/lib/format'

/* Contracts (REG-534): the editor's, the signing page's and the tab's new writes. Every action revalidates the lead's pages,
   the studio list and the editor's own routes. */

const touch = (leadId: string, contractId?: string) => {
  revalidateLead(leadId)
  revalidatePath('/contracts')
  if (contractId) { revalidatePath(`/contracts/${contractId}`); revalidatePath(`/contracts/${contractId}/preview`); revalidatePath(`/sign/${contractId}`) }
}
const load = async (id: string) => (await db.select().from(contracts).where(eq(contracts.id, id)))[0] ?? null
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
  /** Import from File: an uploaded PDF, no editable body. `signed` marks it Signed with the file as the signed copy. */
  upload?: { fileName: string; signed: boolean; title?: string } | null
}
/** One contract, Draft (or Signed for an already-signed upload) — the recipient is the lead's client; returns the id. */
export async function createContractDoc(input: CreateContractInput): Promise<string> {
  const [lead] = await db.select({ id: leads.id, name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, input.leadId))
  if (!lead) throw new Error('lead not found')
  const now = new Date()
  const id = randomUUID()
  let title = AGREEMENT_TITLE, body: string | null = agreementHtml(), templateId: string | null = null
  /* (REG-633, contracts parity Q-15) the gates: a template's own, else both on (1.0's library default); a PDF can only be accepted */
  let gates: { requiresScroll: boolean; requiresAccept: boolean; acceptLabel: string | null } = { requiresScroll: true, requiresAccept: true, acceptLabel: null }
  if (input.templateId) {
    const [t] = await db.select().from(contractTemplates).where(and(input.templateId === 'default' ? eq(contractTemplates.isDefault, true) : eq(contractTemplates.id, input.templateId), isNull(contractTemplates.deletedAt)))
    if (t) { title = t.title; body = t.body; templateId = t.id; gates = { requiresScroll: t.requiresScroll, requiresAccept: t.requiresAccept, acceptLabel: t.acceptLabel }; await db.update(contractTemplates).set({ lastUsedAt: now }).where(eq(contractTemplates.id, t.id)) }
  }
  if (input.upload) gates = { ...gates, requiresScroll: false }
  /* (REG-632, parity Q-08 · Q-10) A contract names its quote from the start — the one it was raised from, else the lead's Signed quote,
     else its latest — and is issued by that quote's entity. Stored, so it never reads another quote in its place. */
  const qs = await db.select({ id: quotes.id, status: quotes.status, issuingEntity: quotes.issuingEntity, archivedAt: quotes.archivedAt, deletedAt: quotes.deletedAt }).from(quotes).where(and(eq(quotes.leadId, lead.id), isNull(quotes.deletedAt))).orderBy(asc(quotes.createdAt))
  const quote = input.fromQuoteId ? qs.find((q) => q.id === input.fromQuoteId) ?? null : defaultQuote(qs.filter((q) => !q.archivedAt))
  if (input.upload) { title = clean(input.upload.title) || input.upload.fileName.replace(/\.pdf$/i, ''); body = null }
  const signed = !!input.upload?.signed
  await db.insert(contracts).values({
    id, leadId: lead.id, title: await nextTitle(lead.id, title), status: signed ? 'Signed' : 'Draft', createdAt: now, updatedAt: now,
    body, recipientName: lead.name, recipientPhone: digits(lead.phone), contractDate: now, templateId, fromQuoteId: quote?.id ?? null, issuingEntity: quote?.issuingEntity ?? null,
    source: input.upload ? 'uploaded' : 'composed', fileName: input.upload?.fileName ?? null,
    signedAt: signed ? now : null, signedCopy: signed ? input.upload!.fileName : null, createdBy: sessionMemberSql, ...gates,
  })
  if (signed) { const c = await load(id); if (c) { await db.update(contracts).set({ ...await signedSnapshot(c, now), markedBy: await actingMember() }).where(eq(contracts.id, id)); const f = await freshContract(id); if (f) await afterSigned(f, now, { marked: true }) } }   // (REG-631, Q-05 · REG-634)
  touch(lead.id, id)
  return id
}

export type ContractDocPatch = Partial<Pick<Contract, 'title' | 'body' | 'recipientName' | 'recipientPhone' | 'issuingEntity' | 'fromQuoteId' | 'requiresScroll' | 'requiresAccept' | 'acceptLabel'>> & { contractDate?: number | null }
/** The editor's autosave: title · body · recipient · date · issuing entity · the quote it names. Returns the new updatedAt. */
export async function saveContractDoc(contractId: string, patch: ContractDocPatch): Promise<number> {
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
  await db.update(contracts).set(set).where(eq(contracts.id, contractId))
  touch(c.leadId, contractId)
  return now.getTime()
}

/** Automation: the two switches. */
export async function setContractAutomation(contractId: string, patch: { reminders?: boolean; thankYou?: boolean }): Promise<void> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  await db.update(contracts).set({ ...(patch.reminders !== undefined ? { reminders: patch.reminders } : {}), ...(patch.thankYou !== undefined ? { thankYou: patch.thankYou } : {}), updatedAt: new Date() }).where(eq(contracts.id, contractId))
  touch(c.leadId, contractId)
}

/** Send for digital signature: the recipient as confirmed in the dialog, status Sent to Client, the Sent date stamped once. */
export async function sendContract(contractId: string, recipient: { name: string; phone: string }): Promise<{ status: string; sentAt: number; updatedAt: number } | { error: string }> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  const block = sendBlock(c); if (block) throw new Error(block)   // (REG-634, parity Q-22) empty, or nowhere for the client to sign
  if (c.status !== 'Signed') { const why = await namedQuoteBlock(c); if (why) return { error: why } }   // (UX audit C2) the quote it signs is still a Draft
  if (c.deletedAt || c.archivedAt) throw new Error('inactive')
  if (!isSgPhone(digits(recipient.phone) || c.recipientPhone || '')) throw new Error('phone')
  const now = new Date()
  const status = c.status === 'Signed' ? 'Signed' : 'Sent to Client'
  const sentAt = c.sentAt ?? now
  /* (REG-633, E-118) Sent on its own, it leaves any bundle: its link is its own again. */
  await db.update(contracts).set({ status, sentAt, sentBy: await actingMember(), recipientName: clean(recipient.name, 80) || c.recipientName, recipientPhone: digits(recipient.phone) || c.recipientPhone, bundleId: null, bundlePosition: null, updatedAt: now }).where(eq(contracts.id, contractId))
  { const fresh = await freshContract(contractId); if (fresh && status === 'Sent to Client') await afterSent(fresh, now) }   // (REG-634, Q-23 · Q-25)
  touch(c.leadId, contractId)
  return { status, sentAt: sentAt.getTime(), updatedAt: now.getTime() }
}

/**
 * (REG-631, contracts parity Q-07) Copying a Draft's signing link shares it, so the contract is Sent to Client from that moment — a
 * link pasted into any chat opens, and the lists say it is out. A blank document is not shared. Returns the status now.
 */
export async function shareContractLink(contractId: string): Promise<{ status: string; sentAt: number | null } | { error: string }> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  if (c.deletedAt || c.archivedAt) throw new Error('inactive')
  if (c.status !== 'Draft') return { status: c.status, sentAt: c.sentAt?.getTime() ?? null }
  const block = sendBlock(c); if (block) throw new Error(block)   // (REG-634, parity Q-22)
  { const why = await namedQuoteBlock(c); if (why) return { error: why } }   // (UX audit C2)
  if (!isSgPhone(c.recipientPhone ?? '')) throw new Error('phone')
  const now = new Date()
  await db.update(contracts).set({ status: 'Sent to Client', sentAt: c.sentAt ?? now, sentBy: await actingMember(), updatedAt: now }).where(eq(contracts.id, contractId))
  { const fresh = await freshContract(contractId); if (fresh) await afterSent(fresh, now) }
  touch(c.leadId, contractId)
  return { status: 'Sent to Client', sentAt: (c.sentAt ?? now).getTime() }
}

/** The studio marks it signed (a paper copy, or the client signed elsewhere): the date, and the signed copy's name when one is attached. */
export async function markContractSigned(contractId: string, o: { signedOn: number; fileName?: string | null }): Promise<void> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  if (c.status === 'Signed') return
  const now = new Date()
  const signedAt = new Date(o.signedOn)
  await db.update(contracts).set({ status: 'Signed', signedAt, sentAt: c.sentAt ?? signedAt, markedBy: await actingMember(), signedCopy: o.fileName ? clean(o.fileName, 160) : (c.signedCopy ?? `${c.title}.pdf`), ...await signedSnapshot(c, signedAt), updatedAt: now }).where(eq(contracts.id, contractId))   // (REG-631, Q-05) kept as marked
  await signQuoteThrough(c, signedAt)   // (REG-626, parity Q-31) the quote it was raised from is signed with it
  { const fresh = await freshContract(contractId); if (fresh) await afterSigned(fresh, signedAt, { marked: true }) }   // (REG-634, Q-23 · Q-25)
  touch(c.leadId, contractId)
}

/** Back to Draft / Sent from the status pill — the one rule for every screen (REG-631, parity Q-04). */
export async function setContractStatusDoc(contractId: string, status: 'Draft' | 'Sent to Client'): Promise<void> {
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
export type SignResult = { signedAt: number } | { changed: true } | { refused: LinkState | 'accept' }
/** (REG-633, contracts parity Q-15 · Q-18 · Q-19) How the client signed: typed or drawn, when each document's words were ticked, the device. */
export type SigningInput = { kind?: 'type' | 'draw'; drawing?: string | null; acceptedAt?: Record<string, number>; userAgent?: string; timezone?: string }
/** The signing record's columns from what the page sends — the drawing only as the pad stores it, the device summarised, the phone masked. */
function recordOf(s: SigningInput | undefined, phone: string | null) {
  const kind = s?.kind === 'draw' && s.drawing && DRAWN_PATH.test(s.drawing) ? 'draw' : 'type'
  const tz = (s?.timezone ?? '').replace(/[^A-Za-z0-9_/+-]/g, '').slice(0, 60)
  const masked = phone ? phoneDisplay(phone).replace(/^(\+65 )?(\d{4}) (\d{4})$/, (_m, cc: string | undefined, _a: string, b: string) => `${cc ?? '+65 '}•••• ${b}`) : null
  return { signatureKind: kind, signatureData: kind === 'draw' ? s!.drawing! : null, signerUserAgent: s?.userAgent ? deviceOf(s.userAgent).slice(0, 80) : null, signerTimezone: tz || null, signerPhone: masked, verificationMethod: 'phone_code' }
}
/* (sweep S2 #15) The tick is the client's; its time is capped at the server's — a phone clock running fast could never sign before. */
const acceptedFor = (c: Contract, s: SigningInput | undefined, now: Date): Date | null => { const t = s?.acceptedAt?.[c.id]; return typeof t === 'number' && t > 0 ? new Date(Math.min(t, now.getTime())) : null }
export async function signContractOnline(contractId: string, name: string, nric?: string | null, fingerprint?: string, signing?: SigningInput): Promise<SignResult> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  if (c.status === 'Signed') return { signedAt: (c.signedAt ?? new Date()).getTime() }
  const state = linkState(c, await leadGone(c.leadId))
  if (state !== 'open') return { refused: state }
  const now = new Date()
  const who = clean(name, 80)
  if (!who) throw new Error('name')
  const live = await liveValuesFor(c, now.getTime())
  if (!live || (fingerprint !== undefined && fingerprint !== live.fingerprint)) return { changed: true }
  const accepted = acceptedFor(c, signing, now)
  if (c.requiresAccept && !accepted) return { refused: 'accept' }   // (REG-633, parity Q-15) the document's words were never ticked
  // (REG-563, owner 2026-09-23: "masked only when customer enters it") The number the client types is never stored whole: the
  // last four characters are kept ("•••••567A") and that is what prints under their signature.
  const masked = maskedNric(nric)
  await db.update(contracts).set({ status: 'Signed', signedAt: now, signedBy: who, signedNric: masked, sentAt: c.sentAt ?? now, signedCopy: `${c.title} — signed online.pdf`, ...await signedSnapshot(c, now), acceptedAt: accepted, ...recordOf(signing, c.recipientPhone), updatedAt: now }).where(eq(contracts.id, contractId))
  await signQuoteThrough(c, now)   // (REG-626, parity Q-31)
  /* (REG-604) (UX audit C1) the bell's row leads on to Won while the lead isn't there — the Move stage window with this contract picked */
  { const won = await wonNext(c.leadId, c.id); await notify('quote_signed', [...await leadMemberIds(c.leadId), ...await studioRunnerIds()], { title: `${who} signed ${c.title}`, body: won ? `${won.line} — the signed copy is on the lead` : 'The signed copy is on the lead', href: won?.href ?? `/leads/${c.leadId}/contracts`, leadId: c.leadId, actorId: null }) }
  { const fresh = await freshContract(contractId); if (fresh) await afterSigned(fresh, now) }   // (REG-634, Q-25)
  touch(c.leadId, contractId)
  return { signedAt: now.getTime() }
}

/** Duplicate and Edit: a fresh Draft with the same document, "(copy)" on the title. */
export async function duplicateContract(contractId: string): Promise<string> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  const now = new Date()
  const id = randomUUID()
  await db.insert(contracts).values({
    id, leadId: c.leadId, title: `${c.title} (copy)`, status: 'Draft', createdAt: now, updatedAt: now, body: c.body, recipientName: c.recipientName, recipientPhone: c.recipientPhone,
    contractDate: now, templateId: c.templateId, fromQuoteId: c.fromQuoteId, source: c.source, fileName: c.fileName, issuingEntity: c.issuingEntity, reminders: c.reminders, thankYou: c.thankYou, createdBy: sessionMemberSql,
    requiresScroll: c.requiresScroll, requiresAccept: c.requiresAccept, acceptLabel: c.acceptLabel,
  })
  touch(c.leadId, id)
  return id
}

/** Save as Template: the document as a contract template in the library (chips kept as chips). */
export async function saveContractAsTemplate(contractId: string, title: string): Promise<string> {
  const c = await load(contractId)
  if (!c || !c.body) throw new Error('contract not found')
  const now = new Date()
  const id = randomUUID()
  await db.insert(contractTemplates).values({ id, title: clean(title) || c.title, body: c.body, createdBy: sessionMemberSql, createdAt: now, updatedAt: now, requiresScroll: c.requiresScroll, requiresAccept: c.requiresAccept, acceptLabel: c.acceptLabel })
  revalidatePath('/company/templates/contracts')
  return id
}

/* ── Deleted Contracts (the tab's / the studio list's sheet): restore · delete forever · empty ── */
/* (REG-634, contracts parity Q-21) Restore, Delete forever and Empty Trash follow the delete rule: the contract's creator, an Owner or an
   Admin — the others in a list are left and counted back, as Deleted Quotes does (REG-625). */
const mineOf = async <R extends { id: string; createdBy: string | null }>(rows: R[]): Promise<R[]> => { const v = await fetchViewer(); return rows.filter((r) => canDeleteContract(v, r)) }
export async function restoreContracts(ids: string[]): Promise<{ done: number; refused: number }> {
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
export async function deleteContractsForever(ids: string[]): Promise<{ done: number; refused: number }> {
  if (!ids.length) return { done: 0, refused: 0 }
  const rows = await db.select({ id: contracts.id, leadId: contracts.leadId, createdBy: contracts.createdBy }).from(contracts).where(and(inArray(contracts.id, ids), sql`${contracts.deletedAt} IS NOT NULL`))
  const mine = await mineOf(rows)
  await removeForever(mine)
  return { done: mine.length, refused: rows.length - mine.length }
}
export async function emptyContractTrash(leadId: string | null): Promise<{ done: number; refused: number }> {
  const rows = await db.select({ id: contracts.id, leadId: contracts.leadId, createdBy: contracts.createdBy }).from(contracts).where(leadId ? and(eq(contracts.leadId, leadId), sql`${contracts.deletedAt} IS NOT NULL`) : sql`${contracts.deletedAt} IS NOT NULL`)
  const mine = await mineOf(rows)
  await removeForever(mine)
  return { done: mine.length, refused: rows.length - mine.length }
}

/**
 * (REG-591) Send together: the picked documents of one lead go out under one bundle and one link; each is marked Sent to Client with
 * the recipient. The id comes from the caller so the link is known before the round trip (the WhatsApp window opens on the press).
 */
export async function sendBundle(bundleId: string, contractIds: string[], recipient: { name: string; phone: string }): Promise<{ bundleId: string; count: number }> {
  if (!/^[0-9a-f-]{8,64}$/i.test(bundleId)) throw new Error('bad id')
  const ids = [...new Set(contractIds)].slice(0, 20)
  const found = ids.length ? await db.select().from(contracts).where(and(inArray(contracts.id, ids), isNull(contracts.deletedAt))) : []
  const rows = ids.map((id) => found.find((c) => c.id === id)).filter((c): c is Contract => !!c)   // (REG-633, parity Q-16) the order the studio ticked them
  const quoteHeld = new Set<string>()
  for (const c of rows) if (c.status !== 'Signed' && await namedQuoteBlock(c)) quoteHeld.add(c.id)   // (UX audit C2) nor a Draft quote under approval
  const live = rows.filter((c) => c.status !== 'Signed' && !sendBlock(c) && !quoteHeld.has(c.id))   // (REG-634, parity Q-22) each with something to sign
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
  if (had) await db.update(contractBundles).set({ recipientName: name || null, recipientPhone: phone || null, sentAt: now }).where(eq(contractBundles.id, bundleId))
  else await db.insert(contractBundles).values({ id: bundleId, leadId, recipientName: name || null, recipientPhone: phone || null, createdAt: now, sentAt: now, createdBy: sessionMemberSql })
  for (const [i, c] of live.entries()) {
    await db.update(contracts).set({ bundleId, bundlePosition: i, status: 'Sent to Client', sentAt: c.sentAt ?? now, sentBy: await actingMember(), ...(name ? { recipientName: name } : {}), ...(phone ? { recipientPhone: phone } : {}), updatedAt: now }).where(eq(contracts.id, c.id))
    const fresh = await freshContract(c.id); if (fresh) await afterSent(fresh, now, { quiet: true })   // (REG-634) the follow-ups; one notification below
  }
  await notify('contract_sent', [...await studioRunnerIds(), ...await leadMemberIds(leadId)], { title: `${live.length} documents went out for signature together`, body: live.map((c) => c.title).join(' · '), href: `/leads/${leadId}/contracts`, leadId })
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
  if (await leadGone(b.leadId)) return { refused: 'inactive' }
  const masked = maskedNric(nric)
  const now = new Date()
  // (REG-633) the bundle's reading order — the page's fingerprint is taken over the documents in this order
  const rows = await db.select().from(contracts).where(and(eq(contracts.bundleId, bundleId), isNull(contracts.deletedAt), isNull(contracts.archivedAt))).orderBy(asc(contracts.bundlePosition), asc(contracts.createdAt))
  const open = rows.filter((x) => x.status === 'Sent to Client')
  if (!open.length) return { refused: rows.some((x) => x.status === 'Signed') ? 'signed' : 'inactive' }
  const lives = await Promise.all(open.map((c) => liveValuesFor(c, now.getTime())))
  const setHash = setHashOf(open.map((c, i) => fingerprintOf(c, lives[i]!.values)))
  if (lives.some((l) => !l) || (fingerprint !== undefined && fingerprint !== setHash)) return { changed: true }
  if (open.some((c) => c.requiresAccept && !acceptedFor(c, signing, now))) return { refused: 'accept' }   // (REG-633, parity Q-15)
  const record = recordOf(signing, b.recipientPhone)
  for (const c of open) {
    await db.update(contracts).set({ status: 'Signed', signedAt: now, signedBy: who, signedNric: masked, sentAt: c.sentAt ?? now, signedCopy: `${c.title} — signed online.pdf`, ...await signedSnapshot(c, now), acceptedAt: acceptedFor(c, signing, now), ...record, updatedAt: now }).where(eq(contracts.id, c.id))
    await signQuoteThrough(c, now)   // (REG-626)
    const fresh = await freshContract(c.id); if (fresh) await afterSigned(fresh, now)   // (REG-634, Q-25)
  }
  const { verificationMethod: _vm, ...bundleRecord } = record
  await db.update(contractBundles).set({ signedAt: now, signedBy: who, signedNric: masked, signingHash: setHash, ...bundleRecord }).where(eq(contractBundles.id, bundleId))
  /* (REG-604) (UX audit C1) on to Won with the first document picked — the agreement, in the order the studio ticked them */
  { const won = await wonNext(b.leadId, open[0]!.id); await notify('quote_signed', [...await leadMemberIds(b.leadId), ...await studioRunnerIds()], { title: `${who} signed ${open.length} documents`, body: won ? `${won.line} — the signed copies are on the lead` : 'The signed copies are on the lead', href: won?.href ?? `/leads/${b.leadId}/contracts`, leadId: b.leadId, actorId: null }) }
  touch(b.leadId); for (const c of rows) touch(b.leadId, c.id)
  return { signedAt: now.getTime(), count: open.length }
}
