'use server'

import { randomUUID } from 'node:crypto'
import { asc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { studioScopeQuestions } from '@/lib/db/schema'
import { isBankType, needsOptions, type BankType } from '@/lib/company/question-bank'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'

/* (REG-612, parity Q-21) Company › Questionnaire — the studio's question bank. Owners and Admins edit; a change reaches every lead's tab. */
const touch = () => { revalidatePath('/company/questionnaire'); revalidatePath('/leads', 'layout') }
const guard = async () => { const v = await fetchViewer(); if (!runsStudio(v.role)) throw new Error('owners and admins only') }
const clean = (type: BankType, options: string[]) => (needsOptions(type) ? [...new Set(options.map((o) => o.trim()).filter(Boolean))].slice(0, 20) : [])

export async function createScopeQuestion(input: { question: string; type: string; options?: string[]; required?: boolean }): Promise<string> {
  await guard()
  if (!isBankType(input.type)) throw new Error('unknown type')
  const question = input.question.trim().slice(0, 200)
  if (!question) throw new Error('question')
  const options = clean(input.type, input.options ?? [])
  if (needsOptions(input.type) && options.length < 1) throw new Error('options')
  const [m] = await db.select({ max: sql<number | null>`max(${studioScopeQuestions.sortOrder})` }).from(studioScopeQuestions)
  const id = randomUUID()
  await db.insert(studioScopeQuestions).values({ id, question, questionType: input.type, options: options.length ? JSON.stringify(options) : null, isRequired: !!input.required, isEnabled: true, sortOrder: (m?.max ?? -1) + 1, createdAt: new Date() })
  touch(); return id
}
export async function updateScopeQuestion(id: string, input: { question: string; type: string; options?: string[]; required?: boolean }): Promise<void> {
  await guard()
  if (!isBankType(input.type)) throw new Error('unknown type')
  const question = input.question.trim().slice(0, 200)
  if (!question) throw new Error('question')
  const options = clean(input.type, input.options ?? [])
  if (needsOptions(input.type) && options.length < 1) throw new Error('options')
  await db.update(studioScopeQuestions).set({ question, questionType: input.type, options: options.length ? JSON.stringify(options) : null, isRequired: !!input.required }).where(eq(studioScopeQuestions.id, id))
  touch()
}
export async function setScopeQuestionFlags(id: string, flags: { enabled?: boolean; required?: boolean }): Promise<void> {
  await guard()
  const patch: { isEnabled?: boolean; isRequired?: boolean } = {}
  if (flags.enabled !== undefined) patch.isEnabled = flags.enabled
  if (flags.required !== undefined) patch.isRequired = flags.required
  if (Object.keys(patch).length) await db.update(studioScopeQuestions).set(patch).where(eq(studioScopeQuestions.id, id))
  touch()
}
export async function deleteScopeQuestion(id: string): Promise<void> {
  await guard()
  await db.delete(studioScopeQuestions).where(eq(studioScopeQuestions.id, id))
  touch()
}
/** Up or down one place; the whole list is renumbered so the order stays dense. */
export async function moveScopeQuestion(id: string, dir: 'up' | 'down'): Promise<void> {
  await guard()
  const list = await db.select({ id: studioScopeQuestions.id }).from(studioScopeQuestions).orderBy(asc(studioScopeQuestions.sortOrder), asc(studioScopeQuestions.createdAt))
  const i = list.findIndex((q) => q.id === id)
  const j = dir === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= list.length) return
  const ids = list.map((q) => q.id); [ids[i], ids[j]] = [ids[j]!, ids[i]!]
  await db.transaction(async (tx) => { for (let k = 0; k < ids.length; k++) await tx.update(studioScopeQuestions).set({ sortOrder: k }).where(eq(studioScopeQuestions.id, ids[k]!)) })
  touch()
}
