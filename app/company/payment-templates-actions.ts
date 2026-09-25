'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { assertMayChangeTemplate, changeableIds } from '@/lib/company/template-guard'
import { db } from '@/lib/db'
import { paymentTemplates, quotePayments, quotes, quoteTemplates } from '@/lib/db/schema'
import { sessionMemberSql } from '@/lib/db/session'
import { DEFAULT_SPLIT_ID, PRESET_SPLITS, parseSplitRows, type SplitRow } from '@/lib/quotes/payments'

/* Company › Templates › Payments (REG-538): the splits as a library — create · save · rename · duplicate · soft delete · restore · forever. */

const touch = (id?: string) => { revalidatePath('/company/templates/payments'); revalidatePath('/company', 'layout'); if (id) revalidatePath(`/templates/payments/${id}`) }
const clean = (s: string | null | undefined, max = 80) => (s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max)
/** Rows as the editor sends them: names trimmed, shares clamped to 0–100 with two decimals, at most twelve. */
function cleanRows(rows: SplitRow[]): SplitRow[] {
  return rows.slice(0, 12).map((r) => ({ name: clean(r.name, 60) || 'Payment', description: clean(r.description, 120) || null, pct: Math.max(0, Math.min(100, Math.round((Number.isFinite(r.pct) ? r.pct : 0) * 100) / 100)) }))
}
const row = async (id: string) => { const [r] = await db.select().from(paymentTemplates).where(eq(paymentTemplates.id, id)); if (!r) throw new Error('template not found'); return r }

export type CreatePaymentTemplateInput = { name?: string; source: { kind: 'blank' } | { kind: 'copy'; id: string } | { kind: 'quote'; quoteId: string } }
/** Blank (a deposit and a completion), a copy of another split, or the schedule a quote has right now. Returns the id. */
export async function createPaymentTemplate(input: CreatePaymentTemplateInput): Promise<string> {
  const now = new Date()
  const id = randomUUID()
  let name = clean(input.name) || 'Untitled split'
  let rows: SplitRow[] = [{ name: 'Deposit', description: 'Upon signing', pct: 50 }, { name: 'Completion', description: 'Handover', pct: 50 }]
  if (input.source.kind === 'copy') {
    const src = await row(input.source.id)
    rows = parseSplitRows(src.rowsJson); if (!clean(input.name)) name = `${src.name.replace(/^Default: /, '')} (copy)`
  } else if (input.source.kind === 'quote') {
    const pays = await db.select().from(quotePayments).where(eq(quotePayments.quoteId, input.source.quoteId)).orderBy(asc(quotePayments.position))
    if (!pays.length) throw new Error('no schedule')
    rows = pays.map((p) => ({ name: p.name, description: p.description, pct: p.pct }))
    if (!clean(input.name)) { const [q] = await db.select({ title: quotes.title }).from(quotes).where(eq(quotes.id, input.source.quoteId)); name = `${q?.title ?? 'Quote'} split` }
  }
  await db.insert(paymentTemplates).values({ id, name, rowsJson: JSON.stringify(cleanRows(rows)), isPreset: false, createdBy: sessionMemberSql, createdAt: now, updatedAt: now })
  touch(id)
  return id
}
/** The editor's autosave: the name and the rows. */
export async function savePaymentTemplate(id: string, patch: { name?: string; rows?: SplitRow[] }): Promise<number> {
  await row(id)
  const now = new Date()
  const set: Partial<typeof paymentTemplates.$inferInsert> = { updatedAt: now }
  if (patch.name !== undefined) set.name = clean(patch.name) || 'Untitled split'
  if (patch.rows !== undefined) set.rowsJson = JSON.stringify(cleanRows(patch.rows))
  await db.update(paymentTemplates).set(set).where(eq(paymentTemplates.id, id))
  touch(id)
  return now.getTime()
}
export async function renamePaymentTemplate(id: string, name: string): Promise<void> { await assertMayChangeTemplate((await row(id)).createdBy); await savePaymentTemplate(id, { name }) }   // (REG-646)
export async function duplicatePaymentTemplate(id: string): Promise<string> { return createPaymentTemplate({ source: { kind: 'copy', id } }) }
/** Soft delete; the studio default (the seeded 10/30/30/30) stays — every fallback lands on it. */
export async function deletePaymentTemplate(id: string): Promise<void> {
  if (id === DEFAULT_SPLIT_ID) throw new Error('default')
  await assertMayChangeTemplate((await row(id)).createdBy)
  await db.update(paymentTemplates).set({ deletedAt: new Date() }).where(eq(paymentTemplates.id, id))
  /* (REG-581) Every quote template that started quotes on it falls back to the studio default in writing, not silently. */
  const rows = await db.select({ id: quoteTemplates.id, defaultsJson: quoteTemplates.defaultsJson, draftJson: quoteTemplates.draftJson }).from(quoteTemplates)
  for (const r of rows) {
    const set: { defaultsJson?: string; draftJson?: string } = {}
    try { if (r.defaultsJson) { const d = JSON.parse(r.defaultsJson) as { paymentPreset?: string | null }; if (d.paymentPreset === id) { d.paymentPreset = DEFAULT_SPLIT_ID; set.defaultsJson = JSON.stringify(d) } } } catch { /* ignore */ }
    try { if (r.draftJson) { const j = JSON.parse(r.draftJson) as { defaults?: { paymentPreset?: string | null } }; if (j.defaults?.paymentPreset === id) { j.defaults.paymentPreset = DEFAULT_SPLIT_ID; set.draftJson = JSON.stringify(j) } } } catch { /* ignore */ }
    if (Object.keys(set).length) await db.update(quoteTemplates).set(set).where(eq(quoteTemplates.id, r.id))
  }
  touch(id)
}
export async function restorePaymentTemplates(ids: string[]): Promise<void> {
  if (!ids.length) return
  const mine = await changeableIds(await db.select({ id: paymentTemplates.id, createdBy: paymentTemplates.createdBy }).from(paymentTemplates).where(inArray(paymentTemplates.id, ids)))
  if (mine.length) await db.update(paymentTemplates).set({ deletedAt: null }).where(inArray(paymentTemplates.id, mine)); touch()
}
/** How many live quote templates start quotes on the split — the Deleted sheet's guard. */
async function usedBy(id: string): Promise<number> {
  const rows = await db.select({ defaultsJson: quoteTemplates.defaultsJson, draftJson: quoteTemplates.draftJson }).from(quoteTemplates).where(isNull(quoteTemplates.deletedAt))
  let n = 0
  for (const r of rows) {
    try { if ((JSON.parse(r.defaultsJson ?? 'null') as { paymentPreset?: string } | null)?.paymentPreset === id) { n++; continue } } catch { /* ignore */ }
    try { if ((JSON.parse(r.draftJson ?? 'null') as { defaults?: { paymentPreset?: string } } | null)?.defaults?.paymentPreset === id) n++ } catch { /* ignore */ }
  }
  return n
}
export async function deletePaymentTemplatesForever(ids: string[]): Promise<{ removed: number; kept: number }> {
  let removed = 0, kept = 0
  const mine = new Set(await changeableIds(ids.length ? await db.select({ id: paymentTemplates.id, createdBy: paymentTemplates.createdBy }).from(paymentTemplates).where(inArray(paymentTemplates.id, ids)) : []))   // (REG-646)
  for (const id of ids) {
    const [r] = await db.select({ deletedAt: paymentTemplates.deletedAt }).from(paymentTemplates).where(eq(paymentTemplates.id, id))
    if (!r?.deletedAt || id === DEFAULT_SPLIT_ID || !mine.has(id) || (await usedBy(id)) > 0) { kept++; continue }
    await db.delete(paymentTemplates).where(eq(paymentTemplates.id, id)); removed++
  }
  touch()
  return { removed, kept }
}
export async function emptyPaymentTemplateTrash(): Promise<{ removed: number; kept: number }> {
  const rows = await db.select({ id: paymentTemplates.id }).from(paymentTemplates).where(sql`${paymentTemplates.deletedAt} is not null`)
  return deletePaymentTemplatesForever(rows.map((r) => r.id))
}
/** The Payment Schedule's presets ▾ › "Save this split as a template": the quote's rows, named. */
export async function saveQuoteScheduleAsTemplate(quoteId: string, name: string): Promise<string> {
  const id = await createPaymentTemplate({ name, source: { kind: 'quote', quoteId } })
  revalidatePath(`/quotes/${quoteId}`)
  return id
}
/** Repair / first run: the four presets as templates with their old keys as ids (idempotent). */
export async function seedPaymentPresets(): Promise<void> {
  const now = new Date()
  for (const p of PRESET_SPLITS) {
    const [exists] = await db.select({ id: paymentTemplates.id }).from(paymentTemplates).where(and(eq(paymentTemplates.id, p.id)))
    if (!exists) await db.insert(paymentTemplates).values({ id: p.id, name: p.name, rowsJson: JSON.stringify(p.rows), isPreset: true, createdBy: null, createdAt: now, updatedAt: now })
  }
}
