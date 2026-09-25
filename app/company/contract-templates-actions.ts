'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, contracts } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { AGREEMENT_TITLE, agreementHtml } from '@/lib/contracts/agreement'
import { createContractDoc } from '@/app/contracts/actions'
import { CONTRACT_HTML_MAX, sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { canDeleteTemplateForever } from '@/lib/contracts/policy'
import { fetchViewer } from '@/lib/leads/visibility'
import { assertMayChangeTemplate, assertMaySetDefault, changeableIds } from '@/lib/company/template-guard'
const authorOf = async (id: string) => (await db.select({ createdBy: contractTemplates.createdBy }).from(contractTemplates).where(eq(contractTemplates.id, id)))[0]?.createdBy ?? null

/* Company › Templates › Contracts (REG-534): a simple library — create · save · duplicate · rename · soft delete · restore · delete forever. */

const touch = (id?: string) => { revalidatePath('/company/templates/contracts'); revalidatePath('/contracts'); if (id) revalidatePath(`/templates/contracts/${id}`) }
const CONTROL = /[\x00-\x1f]/g
const clean = (s: string | null | undefined, max = 120) => (s ?? '').replace(CONTROL, '').trim().slice(0, max)
/** (REG-631, contracts parity E-130) The contract document's allowlist; a template over the cap is refused whole, never cut mid-tag. */
const safeHtml = (h: string) => { if (h.length > CONTRACT_HTML_MAX) throw new Error('too-large'); return sanitizeContractHtml(h) }

/** (REG-632, contracts parity Q-13) The studio's default contract template — one at most; a contract raised from a quote or the Won step starts from it. */
export async function setDefaultContractTemplate(id: string): Promise<void> {
  await assertMaySetDefault()   // (REG-646, settings parity Q-07)
  const [t] = await db.select({ id: contractTemplates.id }).from(contractTemplates).where(eq(contractTemplates.id, id))
  if (!t) throw new Error('template not found')
  await db.update(contractTemplates).set({ isDefault: false }).where(eq(contractTemplates.isDefault, true))
  await db.update(contractTemplates).set({ isDefault: true }).where(eq(contractTemplates.id, id))
  touch(id)
}

export type CreateContractTemplateInput = { title?: string; source: { kind: 'blank' } | { kind: 'starter' } | { kind: 'contract'; contractId: string } }
/** Blank (an empty page), the starter agreement, or a copy of a contract's document. Returns the id. */
export async function createContractTemplate(input: CreateContractTemplateInput): Promise<string> {
  const now = new Date()
  const id = randomUUID()
  let title = clean(input.title) || 'Untitled template', body = ''
  if (input.source.kind === 'starter') { title = clean(input.title) || AGREEMENT_TITLE; body = agreementHtml() }
  if (input.source.kind === 'contract') {
    const [c] = await db.select().from(contracts).where(eq(contracts.id, input.source.contractId))
    if (!c?.body) throw new Error('contract has no document')
    title = clean(input.title) || c.title; body = c.body
  }
  /* (REG-633, contracts parity Q-15) a new template asks the client to read to the end and tick to accept — 1.0's library default */
  await db.insert(contractTemplates).values({ id, title, body, createdBy: SESSION_MEMBER_ID, updatedBy: SESSION_MEMBER_ID, createdAt: now, updatedAt: now, requiresScroll: true, requiresAccept: true })
  touch(id)
  return id
}
export async function saveContractTemplate(templateId: string, patch: { title?: string; body?: string; requiresScroll?: boolean; requiresAccept?: boolean; acceptLabel?: string | null }): Promise<number> {
  const now = new Date()
  if (patch.title !== undefined) await assertMayChangeTemplate(await authorOf(templateId))   // (sweep S2 #16) the name is Rename's rule — the field renamed around it
  const set: Partial<typeof contractTemplates.$inferInsert> = { updatedAt: now, updatedBy: (await fetchViewer()).id ?? SESSION_MEMBER_ID }   // (REG-634, E-126) who saved it last
  if (patch.title !== undefined) set.title = clean(patch.title) || 'Untitled template'
  if (patch.body !== undefined) set.body = safeHtml(patch.body)
  if (patch.requiresScroll !== undefined) set.requiresScroll = !!patch.requiresScroll
  if (patch.requiresAccept !== undefined) set.requiresAccept = !!patch.requiresAccept
  if (patch.acceptLabel !== undefined) set.acceptLabel = clean(patch.acceptLabel, 160) || null
  await db.update(contractTemplates).set(set).where(eq(contractTemplates.id, templateId))
  touch(templateId)
  return now.getTime()
}
export async function renameContractTemplate(templateId: string, title: string): Promise<void> { await assertMayChangeTemplate(await authorOf(templateId)); await saveContractTemplate(templateId, { title }) }
export async function duplicateContractTemplate(templateId: string): Promise<string> {
  const [t] = await db.select().from(contractTemplates).where(eq(contractTemplates.id, templateId))
  if (!t) throw new Error('template not found')
  const now = new Date()
  const id = randomUUID()
  await db.insert(contractTemplates).values({ id, title: `${t.title} (copy)`, body: t.body, createdBy: SESSION_MEMBER_ID, updatedBy: SESSION_MEMBER_ID, createdAt: now, updatedAt: now, requiresScroll: t.requiresScroll, requiresAccept: t.requiresAccept, acceptLabel: t.acceptLabel })
  touch(id)
  return id
}
/** Soft delete (REG-502's rule for templates): contracts already on it keep their own copy of the document. */
export async function deleteContractTemplate(templateId: string): Promise<void> {
  await assertMayChangeTemplate(await authorOf(templateId))
  await db.update(contractTemplates).set({ deletedAt: new Date() }).where(eq(contractTemplates.id, templateId)); touch(templateId)
}
export async function restoreContractTemplates(ids: string[]): Promise<void> {
  if (!ids.length) return
  const mine = await changeableIds(await db.select({ id: contractTemplates.id, createdBy: contractTemplates.createdBy }).from(contractTemplates).where(inArray(contractTemplates.id, ids)))
  if (mine.length) await db.update(contractTemplates).set({ deletedAt: null }).where(inArray(contractTemplates.id, mine)); touch()
}
/* (REG-634, contracts parity Q-21 · Q-24) Delete forever keeps a template that live contracts still name — as quote templates keep one a
   quote prints through (REG-502) — and follows the delete rule (its creator, an Owner or an Admin). The others are left and counted back. */
async function removable(ids: string[] | null): Promise<{ ids: string[]; kept: number }> {
  const viewer = await fetchViewer()
  const rows = await db.select({ id: contractTemplates.id, createdBy: contractTemplates.createdBy }).from(contractTemplates).where(ids ? and(inArray(contractTemplates.id, ids), sql`${contractTemplates.deletedAt} IS NOT NULL`) : sql`${contractTemplates.deletedAt} IS NOT NULL`)
  const named = new Set((await db.select({ id: contracts.templateId }).from(contracts).where(and(isNull(contracts.deletedAt), sql`${contracts.templateId} IS NOT NULL`))).map((r) => r.id))
  const ok = rows.filter((t) => !named.has(t.id) && canDeleteTemplateForever(viewer, t))
  return { ids: ok.map((t) => t.id), kept: rows.length - ok.length }
}
export async function deleteContractTemplatesForever(ids: string[]): Promise<{ done: number; kept: number }> {
  if (!ids.length) return { done: 0, kept: 0 }
  const r = await removable(ids)
  if (r.ids.length) await db.delete(contractTemplates).where(inArray(contractTemplates.id, r.ids))
  touch()
  return { done: r.ids.length, kept: r.kept }
}
export async function emptyContractTemplateTrash(): Promise<{ done: number; kept: number }> {
  const r = await removable(null)
  if (r.ids.length) await db.delete(contractTemplates).where(inArray(contractTemplates.id, r.ids))
  touch()
  return { done: r.ids.length, kept: r.kept }
}
/** The gallery's "New contract from this template": the lead picked, then the editor. */
export async function contractFromTemplate(templateId: string, leadId: string): Promise<string> {
  return createContractDoc({ leadId, templateId })
}
