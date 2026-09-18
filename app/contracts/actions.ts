'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, contracts, leads, type Contract } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { revalidateLead } from '@/lib/leads/queries'
import { AGREEMENT_TITLE, agreementHtml } from '@/lib/contracts/agreement'
import { isBlankDoc } from '@/lib/contracts/tokens'

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
const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '').slice(0, 8)
/** The editor's HTML is stored as typed, minus scripts and handlers (the preview prints it back). */
const safeHtml = (h: string) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+="[^"]*"/gi, '').replace(/javascript:/gi, '').slice(0, 400_000)

/** "Interior Design Service Agreement", then "… 2", "… 3" for the lead's later ones (the tab's numbering rule, REG-178). */
async function nextTitle(leadId: string, base: string): Promise<string> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(contracts).where(and(eq(contracts.leadId, leadId), isNull(contracts.deletedAt)))
  const n = row?.n ?? 0
  return n === 0 ? base : `${base} ${n + 1}`
}

export type CreateContractInput = {
  leadId: string
  /** Start from a contract template (its body and title), else the studio's starter agreement. */
  templateId?: string | null
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
  if (input.templateId) {
    const [t] = await db.select().from(contractTemplates).where(and(eq(contractTemplates.id, input.templateId), isNull(contractTemplates.deletedAt)))
    if (t) { title = t.title; body = t.body; templateId = t.id; await db.update(contractTemplates).set({ lastUsedAt: now }).where(eq(contractTemplates.id, t.id)) }
  }
  if (input.upload) { title = clean(input.upload.title) || input.upload.fileName.replace(/\.pdf$/i, ''); body = null }
  const signed = !!input.upload?.signed
  await db.insert(contracts).values({
    id, leadId: lead.id, title: await nextTitle(lead.id, title), status: signed ? 'Signed' : 'Draft', createdAt: now, updatedAt: now,
    body, recipientName: lead.name, recipientPhone: digits(lead.phone), contractDate: now, templateId, fromQuoteId: input.fromQuoteId ?? null,
    source: input.upload ? 'uploaded' : 'composed', fileName: input.upload?.fileName ?? null,
    signedAt: signed ? now : null, signedCopy: signed ? input.upload!.fileName : null, createdBy: SESSION_MEMBER_ID,
  })
  touch(lead.id, id)
  return id
}

export type ContractDocPatch = Partial<Pick<Contract, 'title' | 'body' | 'recipientName' | 'recipientPhone' | 'issuingEntity'>> & { contractDate?: number | null }
/** The editor's autosave: title · body · recipient · date · issuing entity. Returns the new updatedAt. */
export async function saveContractDoc(contractId: string, patch: ContractDocPatch): Promise<number> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  const now = new Date()
  const set: Partial<typeof contracts.$inferInsert> = { updatedAt: now }
  if (patch.title !== undefined) set.title = clean(patch.title) || c.title
  if (patch.body !== undefined) set.body = safeHtml(patch.body ?? '')
  if (patch.recipientName !== undefined) set.recipientName = clean(patch.recipientName, 80) || null
  if (patch.recipientPhone !== undefined) set.recipientPhone = digits(patch.recipientPhone) || null
  if (patch.issuingEntity !== undefined) set.issuingEntity = clean(patch.issuingEntity, 120) || null
  if (patch.contractDate !== undefined) set.contractDate = patch.contractDate ? new Date(patch.contractDate) : null
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
export async function sendContract(contractId: string, recipient: { name: string; phone: string }): Promise<{ status: string; sentAt: number; updatedAt: number }> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  if (c.source === 'composed' && isBlankDoc(c.body)) throw new Error('empty')
  const now = new Date()
  const status = c.status === 'Signed' ? 'Signed' : 'Sent to Client'
  const sentAt = c.sentAt ?? now
  await db.update(contracts).set({ status, sentAt, recipientName: clean(recipient.name, 80) || c.recipientName, recipientPhone: digits(recipient.phone) || c.recipientPhone, updatedAt: now }).where(eq(contracts.id, contractId))
  touch(c.leadId, contractId)
  return { status, sentAt: sentAt.getTime(), updatedAt: now.getTime() }
}

/** The studio marks it signed (a paper copy, or the client signed elsewhere): the date, and the signed copy's name when one is attached. */
export async function markContractSigned(contractId: string, o: { signedOn: number; fileName?: string | null }): Promise<void> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  const now = new Date()
  const signedAt = new Date(o.signedOn)
  await db.update(contracts).set({ status: 'Signed', signedAt, sentAt: c.sentAt ?? signedAt, signedCopy: o.fileName ? clean(o.fileName, 160) : (c.signedCopy ?? `${c.title}.pdf`), updatedAt: now }).where(eq(contracts.id, contractId))
  touch(c.leadId, contractId)
}

/** Back to Draft / Sent from the status pill; leaving Signed clears the signing stamps. */
export async function setContractStatusDoc(contractId: string, status: 'Draft' | 'Sent to Client'): Promise<void> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  const now = new Date()
  const set: Partial<typeof contracts.$inferInsert> = { status, updatedAt: now }
  if (status === 'Sent to Client' && !c.sentAt) set.sentAt = now
  if (c.status === 'Signed') { set.signedAt = null; set.signedBy = null; if (c.source === 'composed') set.signedCopy = null }
  await db.update(contracts).set(set).where(eq(contracts.id, contractId))
  touch(c.leadId, contractId)
}

/** The client signs online (the signing page): the typed name is the signature; Signed with the page's copy as the signed copy. */
export async function signContractOnline(contractId: string, name: string): Promise<{ signedAt: number }> {
  const c = await load(contractId)
  if (!c) throw new Error('contract not found')
  if (c.status === 'Signed') return { signedAt: (c.signedAt ?? new Date()).getTime() }
  const now = new Date()
  const who = clean(name, 80)
  if (!who) throw new Error('name')
  await db.update(contracts).set({ status: 'Signed', signedAt: now, signedBy: who, sentAt: c.sentAt ?? now, signedCopy: `${c.title} — signed online.pdf`, updatedAt: now }).where(eq(contracts.id, contractId))
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
    contractDate: now, templateId: c.templateId, fromQuoteId: c.fromQuoteId, source: c.source, fileName: c.fileName, issuingEntity: c.issuingEntity, reminders: c.reminders, thankYou: c.thankYou, createdBy: SESSION_MEMBER_ID,
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
  await db.insert(contractTemplates).values({ id, title: clean(title) || c.title, body: c.body, createdBy: SESSION_MEMBER_ID, createdAt: now, updatedAt: now })
  revalidatePath('/company/templates/contracts')
  return id
}

/* ── Deleted Contracts (the tab's / the studio list's sheet): restore · delete forever · empty ── */
export async function restoreContracts(ids: string[]): Promise<void> {
  if (!ids.length) return
  const rows = await db.select({ leadId: contracts.leadId }).from(contracts).where(inArray(contracts.id, ids))
  await db.update(contracts).set({ deletedAt: null, updatedAt: new Date() }).where(inArray(contracts.id, ids))
  for (const l of new Set(rows.map((r) => r.leadId))) touch(l)
}
export async function deleteContractsForever(ids: string[]): Promise<void> {
  if (!ids.length) return
  const rows = await db.select({ leadId: contracts.leadId }).from(contracts).where(inArray(contracts.id, ids))
  await db.delete(contracts).where(inArray(contracts.id, ids))
  for (const l of new Set(rows.map((r) => r.leadId))) touch(l)
}
export async function emptyContractTrash(leadId: string | null): Promise<void> {
  const rows = await db.select({ id: contracts.id, leadId: contracts.leadId }).from(contracts).where(leadId ? and(eq(contracts.leadId, leadId), sql`${contracts.deletedAt} IS NOT NULL`) : sql`${contracts.deletedAt} IS NOT NULL`)
  if (!rows.length) return
  await db.delete(contracts).where(inArray(contracts.id, rows.map((r) => r.id)))
  for (const l of new Set(rows.map((r) => r.leadId))) touch(l)
}
