'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, contracts } from '@/lib/db/schema'
import { SESSION_MEMBER_ID, sessionMemberSql } from '@/lib/db/session'
import { AGREEMENT_TITLE, agreementHtml } from '@/lib/contracts/agreement'
import { createContractDoc } from '@/app/contracts/actions'
import { CONTRACT_HTML_MAX, sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { canDeleteTemplateForever } from '@/lib/contracts/policy'
import { fetchViewer } from '@/lib/leads/visibility'
import { changeBlock, changeableIds, defaultBlock, nothingChangeable } from '@/lib/company/template-guard'
import { TEMPLATE_GONE_LINE, refuse, type Refusal } from '@/lib/company/template-rules'
/** (wave E, E7) Why the viewer may not rename or delete this one — its rule, or the template gone from under a stale page — else null. */
const refusalFor = async (id: string) => { const [r] = await db.select({ createdBy: contractTemplates.createdBy }).from(contractTemplates).where(eq(contractTemplates.id, id)); return r ? changeBlock(r.createdBy) : TEMPLATE_GONE_LINE }

/* Company › Templates › Contracts (REG-534): a simple library — create · save · duplicate · rename · soft delete · restore · delete forever. */

const touch = (id?: string) => { revalidatePath('/company/templates/contracts'); revalidatePath('/contracts'); if (id) revalidatePath(`/templates/contracts/${id}`) }
const CONTROL = /[\x00-\x1f]/g
const clean = (s: string | null | undefined, max = 120) => (s ?? '').replace(CONTROL, '').trim().slice(0, max)
/** (REG-631, contracts parity E-130) The contract document's allowlist; a template over the cap is refused whole, never cut mid-tag —
    (wave E, E7) in the contract editor's own words, answered rather than thrown. */
const TOO_LARGE = 'The document is too large to save — use a smaller picture'

/** (REG-632, contracts parity Q-13) The studio's default contract template — one at most; a contract raised from a quote or the Won step starts from it. */
export async function setDefaultContractTemplate(id: string): Promise<void | Refusal> {
  const block = await defaultBlock(); if (block) return refuse(block)   // (REG-646, settings parity Q-07)
  const [t] = await db.select({ id: contractTemplates.id }).from(contractTemplates).where(eq(contractTemplates.id, id))
  if (!t) return refuse(TEMPLATE_GONE_LINE)
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
  await db.insert(contractTemplates).values({ id, title, body, createdBy: sessionMemberSql, updatedBy: sessionMemberSql, createdAt: now, updatedAt: now, requiresScroll: true, requiresAccept: true })
  touch(id)
  return id
}
export async function saveContractTemplate(templateId: string, patch: { title?: string; body?: string; requiresScroll?: boolean; requiresAccept?: boolean; acceptLabel?: string | null }): Promise<number | Refusal> {
  const now = new Date()
  if (patch.title !== undefined) { const block = await refusalFor(templateId); if (block) return refuse(block) }   // (sweep S2 #16) the name is Rename's rule — the field renamed around it
  if (patch.body !== undefined && patch.body.length > CONTRACT_HTML_MAX) return refuse(TOO_LARGE)
  const set: Partial<typeof contractTemplates.$inferInsert> = { updatedAt: now, updatedBy: (await fetchViewer()).id ?? SESSION_MEMBER_ID }   // (REG-634, E-126) who saved it last
  if (patch.title !== undefined) set.title = clean(patch.title) || 'Untitled template'
  if (patch.body !== undefined) set.body = sanitizeContractHtml(patch.body)
  if (patch.requiresScroll !== undefined) set.requiresScroll = !!patch.requiresScroll
  if (patch.requiresAccept !== undefined) set.requiresAccept = !!patch.requiresAccept
  if (patch.acceptLabel !== undefined) set.acceptLabel = clean(patch.acceptLabel, 160) || null
  await db.update(contractTemplates).set(set).where(eq(contractTemplates.id, templateId))
  touch(templateId)
  return now.getTime()
}
export async function renameContractTemplate(templateId: string, title: string): Promise<void | Refusal> { const r = await saveContractTemplate(templateId, { title }); if (typeof r !== 'number') return r }   // the save answers Rename's rule
export async function duplicateContractTemplate(templateId: string): Promise<string> {
  const [t] = await db.select().from(contractTemplates).where(eq(contractTemplates.id, templateId))
  if (!t) throw new Error('template not found')
  const now = new Date()
  const id = randomUUID()
  await db.insert(contractTemplates).values({ id, title: `${t.title} (copy)`, body: t.body, createdBy: sessionMemberSql, updatedBy: sessionMemberSql, createdAt: now, updatedAt: now, requiresScroll: t.requiresScroll, requiresAccept: t.requiresAccept, acceptLabel: t.acceptLabel })
  touch(id)
  return id
}
/** Soft delete (REG-502's rule for templates): contracts already on it keep their own copy of the document. */
export async function deleteContractTemplate(templateId: string): Promise<void | Refusal> {
  const block = await refusalFor(templateId); if (block) return refuse(block)
  await db.update(contractTemplates).set({ deletedAt: new Date() }).where(eq(contractTemplates.id, templateId)); touch(templateId)
}
/** (wave E, E7) What came back and what stayed (someone else's) — or, when none may come back, the rule. */
export async function restoreContractTemplates(ids: string[]): Promise<{ restored: number; kept: number } | Refusal> {
  if (!ids.length) return { restored: 0, kept: 0 }
  const rows = await db.select({ id: contractTemplates.id, createdBy: contractTemplates.createdBy }).from(contractTemplates).where(inArray(contractTemplates.id, ids))
  const none = await nothingChangeable(rows, 'restore'); if (none) return refuse(none)
  const mine = await changeableIds(rows)
  if (mine.length) await db.update(contractTemplates).set({ deletedAt: null }).where(inArray(contractTemplates.id, mine)); touch()
  return { restored: mine.length, kept: ids.length - mine.length }
}
/* (REG-634, contracts parity Q-21 · Q-24) Delete forever keeps a template that live contracts still name — as quote templates keep one a
   quote prints through (REG-502) — and follows the delete rule (its creator, an Owner or an Admin). The others are left and counted back. */
async function removable(ids: string[] | null): Promise<{ ids: string[]; kept: number; rule: string | null }> {
  const viewer = await fetchViewer()
  const rows = await db.select({ id: contractTemplates.id, createdBy: contractTemplates.createdBy }).from(contractTemplates).where(ids ? and(inArray(contractTemplates.id, ids), sql`${contractTemplates.deletedAt} IS NOT NULL`) : sql`${contractTemplates.deletedAt} IS NOT NULL`)
  const named = new Set((await db.select({ id: contracts.templateId }).from(contracts).where(and(isNull(contracts.deletedAt), sql`${contracts.templateId} IS NOT NULL`))).map((r) => r.id))
  const ok = rows.filter((t) => !named.has(t.id) && canDeleteTemplateForever(viewer, t))
  /* (wave E, E7) none of them the viewer's to remove: the rule, not "nothing was deleted" */
  const rule = rows.length && rows.every((t) => !canDeleteTemplateForever(viewer, t)) ? await nothingChangeable(rows, 'purge') : null
  return { ids: ok.map((t) => t.id), kept: rows.length - ok.length, rule }
}
export async function deleteContractTemplatesForever(ids: string[]): Promise<{ done: number; kept: number } | Refusal> {
  if (!ids.length) return { done: 0, kept: 0 }
  const r = await removable(ids)
  if (r.rule) return refuse(r.rule)
  if (r.ids.length) await db.delete(contractTemplates).where(inArray(contractTemplates.id, r.ids))
  touch()
  return { done: r.ids.length, kept: r.kept }
}
export async function emptyContractTemplateTrash(): Promise<{ done: number; kept: number } | Refusal> {
  const r = await removable(null)
  if (r.rule) return refuse(r.rule)
  if (r.ids.length) await db.delete(contractTemplates).where(inArray(contractTemplates.id, r.ids))
  touch()
  return { done: r.ids.length, kept: r.kept }
}
/** The gallery's "New contract from this template": the lead picked, then the editor. */
export async function contractFromTemplate(templateId: string, leadId: string): Promise<string> {
  return createContractDoc({ leadId, templateId })
}
