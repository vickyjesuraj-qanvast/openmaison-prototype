'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { changeBlock, changeableIds, nothingChangeable } from '@/lib/company/template-guard'
import { TEMPLATE_GONE_LINE, refuse, type Refusal } from '@/lib/company/template-rules'
import { db } from '@/lib/db'
import { libraryFolders, quoteTextTemplates, quotes, type QuoteTextTemplate, quoteTemplates } from '@/lib/db/schema'
import { sessionMemberSql } from '@/lib/db/session'
import { isBlankHtml, isTextKind, type TextKind } from '@/lib/quotes/text'
import { stampQuote } from '@/lib/quotes/stamp'
import { textTemplateUsage } from '@/lib/company/text-templates'

/* Terms and Conditions · Additional Notes (1238:33502 · 1238:33503, REG-420): the quote's two rich-text bodies, their
   client-view switches and the studio-wide template library behind "My Templates" — which is also Company › Templates ›
   T&Cs & Notes (REG-538): the library deletes softly with a Deleted sheet, and a template a quote template names in its
   Defaults can be restored but never removed for good. */

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
/** The body is HTML the in-house editor wrote: scripts, handlers and foreign tags are stripped before it is stored (a public endpoint). */
function cleanHtml(v: unknown): string {
  let s = str(v, 60_000)
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '').replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '')
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"')
  return isBlankHtml(s) ? '' : s
}
const kindOf = (k: string): TextKind => { if (!isTextKind(k)) throw new Error(`Unknown text kind: ${k}`); return k }
const touch = (id?: string) => { revalidatePath('/company/templates/terms'); revalidatePath('/company', 'layout'); if (id) revalidatePath(`/templates/terms/${id}`) }

/* (audit 2026-09-26, F205) a long string travels inside an object: React's action decoder counts a bare string argument against a
   1,000,000 limit whenever the action takes more than one argument, so a ~730 KB photo failed with a 500 */
export async function saveQuoteText(quoteId: string, kind: TextKind, o: { html: string }): Promise<{ updatedAt: number }> {
  const { html } = o
  const k = kindOf(kind)
  await db.update(quotes).set(k === 'terms' ? { termsHtml: cleanHtml(html) } : { notesHtml: cleanHtml(html) }).where(eq(quotes.id, quoteId))
  return stampQuote(quoteId)
}

/** (REG-538) "Show in client view" — the one switch Preview and the client view read too (lib/templates/queries.ts folds it into the view). */
export async function setQuoteTextVisible(quoteId: string, kind: TextKind, visible: boolean): Promise<{ updatedAt: number }> {
  const k = kindOf(kind)
  await db.update(quotes).set(k === 'terms' ? { termsVisible: !!visible } : { notesVisible: !!visible }).where(eq(quotes.id, quoteId))
  return stampQuote(quoteId)
}

/** The live library of one kind, oldest first. */
export async function listTextTemplates(kind: TextKind): Promise<QuoteTextTemplate[]> {
  return db.select().from(quoteTextTemplates).where(and(eq(quoteTextTemplates.kind, kindOf(kind)), isNull(quoteTextTemplates.deletedAt))).orderBy(asc(quoteTextTemplates.createdAt))
}

/** New Template › Save / Save and Add (1238:33173) — and the library page's New template. */
/* (F205) the text inside an object — pasted pictures make it long */
export async function createTextTemplate(kind: TextKind, o: { title: string; body: string }, folderId: string | null = null): Promise<QuoteTextTemplate> {
  const { title, body } = o
  const k = kindOf(kind)
  const id = randomUUID(); const now = new Date()
  /* (REG-664) Made inside a folder of My Templates, it is filed there — when that folder is still one of T&Cs & Notes'. */
  const [folder] = folderId ? await db.select({ id: libraryFolders.id }).from(libraryFolders).where(and(eq(libraryFolders.id, folderId), eq(libraryFolders.library, 'texts'), isNull(libraryFolders.deletedAt))) : []
  await db.insert(quoteTextTemplates).values({ id, kind: k, title: str(title, 120).trim() || 'Untitled template', body: cleanHtml(body), createdAt: now, updatedAt: now, createdBy: sessionMemberSql, folderId: folder?.id ?? null })
  const [row] = await db.select().from(quoteTextTemplates).where(eq(quoteTextTemplates.id, id))
  touch(id)
  return row!
}

/** Card kebab › Edit Template, and the library editor's autosave. */
export async function updateTextTemplate(id: string, o: { title: string; body: string }): Promise<QuoteTextTemplate> {
  const { title, body } = o
  await db.update(quoteTextTemplates).set({ title: str(title, 120).trim() || 'Untitled template', body: cleanHtml(body), updatedAt: new Date() }).where(eq(quoteTextTemplates.id, id))
  const [row] = await db.select().from(quoteTextTemplates).where(eq(quoteTextTemplates.id, id))
  if (!row) throw new Error('template not found')
  touch(id)
  return row
}
/** (wave E, E7) Why the viewer may not rename or delete this one — its rule, or the template gone from under a stale page — else null. */
const refusalFor = async (id: string) => { const [r] = await db.select({ createdBy: quoteTextTemplates.createdBy }).from(quoteTextTemplates).where(eq(quoteTextTemplates.id, id)); return r ? changeBlock(r.createdBy) : TEMPLATE_GONE_LINE }
export async function renameTextTemplate(id: string, title: string): Promise<void | Refusal> {
  const block = await refusalFor(id); if (block) return refuse(block)   // (REG-646) · (wave E, E7) the rule answered, never thrown
  await db.update(quoteTextTemplates).set({ title: str(title, 120).trim() || 'Untitled template', updatedAt: new Date() }).where(eq(quoteTextTemplates.id, id)); touch(id)
}
export async function duplicateTextTemplate(id: string): Promise<string> {
  const [t] = await db.select().from(quoteTextTemplates).where(eq(quoteTextTemplates.id, id))
  if (!t) throw new Error('template not found')
  const row = await createTextTemplate(kindOf(t.kind), { title: `${t.title} (copy)`, body: t.body })
  return row.id
}
/** Delete is soft (REG-538): the template leaves the modal and the Defaults selects and waits in Deleted Templates. */
export async function deleteTextTemplate(id: string): Promise<void | Refusal> {
  const block = await refusalFor(id); if (block) return refuse(block)
  await db.update(quoteTextTemplates).set({ deletedAt: new Date() }).where(eq(quoteTextTemplates.id, id))
  await clearTextFromTemplateDefaults(id)   // (REG-581) no quote template keeps naming it — what the delete dialog promises
  touch(id)
}
/** (REG-581) A deleted text leaves every quote template's New quotes — published and draft — so no new quote is seeded from it. */
async function clearTextFromTemplateDefaults(id: string): Promise<void> {
  type D = { termsTemplateId?: string | null; notesTemplateId?: string | null }
  const drop = (d: D | undefined | null) => { let hit = false; if (d?.termsTemplateId === id) { d.termsTemplateId = null; hit = true } if (d?.notesTemplateId === id) { d.notesTemplateId = null; hit = true } return hit }
  const rows = await db.select({ id: quoteTemplates.id, defaultsJson: quoteTemplates.defaultsJson, draftJson: quoteTemplates.draftJson }).from(quoteTemplates)
  for (const r of rows) {
    const set: { defaultsJson?: string; draftJson?: string } = {}
    try { if (r.defaultsJson) { const d = JSON.parse(r.defaultsJson) as D; if (drop(d)) set.defaultsJson = JSON.stringify(d) } } catch { /* ignore */ }
    try { if (r.draftJson) { const j = JSON.parse(r.draftJson) as { defaults?: D }; if (drop(j.defaults)) set.draftJson = JSON.stringify(j) } } catch { /* ignore */ }
    if (Object.keys(set).length) await db.update(quoteTemplates).set(set).where(eq(quoteTemplates.id, r.id))
  }
}
/** (wave E, E7) What came back and what stayed (someone else's) — or, when none may come back, the rule. */
export async function restoreTextTemplates(ids: string[]): Promise<{ restored: number; kept: number } | Refusal> {
  if (!ids.length) return { restored: 0, kept: 0 }
  const rows = await db.select({ id: quoteTextTemplates.id, createdBy: quoteTextTemplates.createdBy }).from(quoteTextTemplates).where(inArray(quoteTextTemplates.id, ids))
  const none = await nothingChangeable(rows, 'restore'); if (none) return refuse(none)
  const mine = await changeableIds(rows)
  if (mine.length) await db.update(quoteTextTemplates).set({ deletedAt: null }).where(inArray(quoteTextTemplates.id, mine)); touch()
  return { restored: mine.length, kept: ids.length - mine.length }
}
/** Delete forever: skipped while a quote template's Defaults still name it (the sheet says so). */
export async function deleteTextTemplatesForever(ids: string[]): Promise<{ removed: number; kept: number } | Refusal> {
  const usage = await textTemplateUsage()
  let removed = 0, kept = 0
  const rows = ids.length ? await db.select({ id: quoteTextTemplates.id, createdBy: quoteTextTemplates.createdBy }).from(quoteTextTemplates).where(inArray(quoteTextTemplates.id, ids)) : []
  const none = await nothingChangeable(rows, 'purge'); if (none) return refuse(none)   // (wave E, E7) none of them the viewer's: the rule, not "nothing was deleted"
  const mine = new Set(await changeableIds(rows))   // (REG-646)
  for (const id of ids) {
    const [r] = await db.select({ deletedAt: quoteTextTemplates.deletedAt }).from(quoteTextTemplates).where(eq(quoteTextTemplates.id, id))
    if (!r?.deletedAt || !mine.has(id) || (usage.get(id) ?? 0) > 0) { kept++; continue }
    await db.delete(quoteTextTemplates).where(eq(quoteTextTemplates.id, id)); removed++
  }
  touch()
  return { removed, kept }
}
export async function emptyTextTemplateTrash(): Promise<{ removed: number; kept: number } | Refusal> {
  const rows = await db.select({ id: quoteTextTemplates.id }).from(quoteTextTemplates).where(sql`${quoteTextTemplates.deletedAt} is not null`)
  return deleteTextTemplatesForever(rows.map((r) => r.id))
}
