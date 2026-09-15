'use server'

import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { quoteTextTemplates, quotes, type QuoteTextTemplate } from '@/lib/db/schema'
import { isBlankHtml, isTextKind, type TextKind } from '@/lib/quotes/text'
import { stampQuote } from '@/lib/quotes/stamp'

/* Terms and Conditions · Additional Notes (1238:33502 · 1238:33503, REG-420): the quote's two rich-text bodies, their
   client-view switches and the studio-wide template library behind "My Templates". */

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
/** The body is HTML the in-house editor wrote: scripts, handlers and foreign tags are stripped before it is stored (a public endpoint). */
function cleanHtml(v: unknown): string {
  let s = str(v, 60_000)
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '').replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '')
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"')
  return isBlankHtml(s) ? '' : s
}
const kindOf = (k: string): TextKind => { if (!isTextKind(k)) throw new Error(`Unknown text kind: ${k}`); return k }

export async function saveQuoteText(quoteId: string, kind: TextKind, html: string): Promise<{ updatedAt: number }> {
  const k = kindOf(kind)
  await db.update(quotes).set(k === 'terms' ? { termsHtml: cleanHtml(html) } : { notesHtml: cleanHtml(html) }).where(eq(quotes.id, quoteId))
  return stampQuote(quoteId)
}

export async function setQuoteTextVisible(quoteId: string, kind: TextKind, visible: boolean): Promise<{ updatedAt: number }> {
  const k = kindOf(kind)
  await db.update(quotes).set(k === 'terms' ? { termsVisible: !!visible } : { notesVisible: !!visible }).where(eq(quotes.id, quoteId))
  return stampQuote(quoteId)
}

export async function listTextTemplates(kind: TextKind): Promise<QuoteTextTemplate[]> {
  return db.select().from(quoteTextTemplates).where(eq(quoteTextTemplates.kind, kindOf(kind))).orderBy(asc(quoteTextTemplates.createdAt))
}

/** New Template › Save / Save and Add (1238:33173). */
export async function createTextTemplate(kind: TextKind, title: string, body: string): Promise<QuoteTextTemplate> {
  const k = kindOf(kind)
  const id = randomUUID(); const now = new Date()
  await db.insert(quoteTextTemplates).values({ id, kind: k, title: str(title, 120).trim() || 'Untitled template', body: cleanHtml(body), createdAt: now, updatedAt: now })
  const [row] = await db.select().from(quoteTextTemplates).where(eq(quoteTextTemplates.id, id))
  return row!
}

/** Card kebab › Edit Template. */
export async function updateTextTemplate(id: string, title: string, body: string): Promise<QuoteTextTemplate> {
  await db.update(quoteTextTemplates).set({ title: str(title, 120).trim() || 'Untitled template', body: cleanHtml(body), updatedAt: new Date() }).where(eq(quoteTextTemplates.id, id))
  const [row] = await db.select().from(quoteTextTemplates).where(eq(quoteTextTemplates.id, id))
  if (!row) throw new Error('template not found')
  return row
}

/** Card kebab › Delete. */
export async function deleteTextTemplate(id: string): Promise<void> {
  await db.delete(quoteTextTemplates).where(eq(quoteTextTemplates.id, id))
}
