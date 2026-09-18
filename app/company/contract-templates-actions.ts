'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, contracts } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { AGREEMENT_TITLE, agreementHtml } from '@/lib/contracts/agreement'
import { createContractDoc } from '@/app/contracts/actions'

/* Company › Templates › Contracts (REG-534): a simple library — create · save · duplicate · rename · soft delete · restore · delete forever. */

const touch = (id?: string) => { revalidatePath('/company/templates/contracts'); revalidatePath('/contracts'); if (id) revalidatePath(`/templates/contracts/${id}`) }
const CONTROL = /[\x00-\x1f]/g
const clean = (s: string | null | undefined, max = 120) => (s ?? '').replace(CONTROL, '').trim().slice(0, max)
const safeHtml = (h: string) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+="[^"]*"/gi, '').replace(/javascript:/gi, '').slice(0, 400_000)

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
  await db.insert(contractTemplates).values({ id, title, body, createdBy: SESSION_MEMBER_ID, createdAt: now, updatedAt: now })
  touch(id)
  return id
}
export async function saveContractTemplate(templateId: string, patch: { title?: string; body?: string }): Promise<number> {
  const now = new Date()
  const set: Partial<typeof contractTemplates.$inferInsert> = { updatedAt: now }
  if (patch.title !== undefined) set.title = clean(patch.title) || 'Untitled template'
  if (patch.body !== undefined) set.body = safeHtml(patch.body)
  await db.update(contractTemplates).set(set).where(eq(contractTemplates.id, templateId))
  touch(templateId)
  return now.getTime()
}
export async function renameContractTemplate(templateId: string, title: string): Promise<void> { await saveContractTemplate(templateId, { title }) }
export async function duplicateContractTemplate(templateId: string): Promise<string> {
  const [t] = await db.select().from(contractTemplates).where(eq(contractTemplates.id, templateId))
  if (!t) throw new Error('template not found')
  const now = new Date()
  const id = randomUUID()
  await db.insert(contractTemplates).values({ id, title: `${t.title} (copy)`, body: t.body, createdBy: SESSION_MEMBER_ID, createdAt: now, updatedAt: now })
  touch(id)
  return id
}
/** Soft delete (REG-502's rule for templates): contracts already on it keep their own copy of the document. */
export async function deleteContractTemplate(templateId: string): Promise<void> {
  await db.update(contractTemplates).set({ deletedAt: new Date() }).where(eq(contractTemplates.id, templateId)); touch(templateId)
}
export async function restoreContractTemplates(ids: string[]): Promise<void> {
  if (!ids.length) return
  await db.update(contractTemplates).set({ deletedAt: null }).where(inArray(contractTemplates.id, ids)); touch()
}
export async function deleteContractTemplatesForever(ids: string[]): Promise<void> {
  if (!ids.length) return
  await db.delete(contractTemplates).where(inArray(contractTemplates.id, ids)); touch()
}
export async function emptyContractTemplateTrash(): Promise<void> {
  await db.delete(contractTemplates).where(sql`${contractTemplates.deletedAt} IS NOT NULL`); touch()
}
/** The gallery's "New contract from this template": the lead picked, then the editor. */
export async function contractFromTemplate(templateId: string, leadId: string): Promise<string> {
  return createContractDoc({ leadId, templateId })
}
