import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import type { IssuingEntity } from '@/lib/templates/model'
import { DEFAULT_PAPER_SETTINGS, INVOICE_PAPER_KEY, paperFor, paperHasWords, parsePaperSettings, type InvoicePaperLayout, type PaperSettings } from './invoices-paper'

/*
 * (gaps build B, item 14) The studio's invoice paper on the server — read with no other money module, so the quote's renderer (a variation order
 * prints it) and the money pages read it without importing each other.
 */
export async function readInvoicePaper(): Promise<PaperSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, INVOICE_PAPER_KEY)).limit(1)
  if (!row) return DEFAULT_PAPER_SETTINGS
  try { return parsePaperSettings(JSON.parse(row.value)) } catch { return DEFAULT_PAPER_SETTINGS }
}
/** The paper a document raised under this entity (by its name; null = the studio's first) prints. */
export async function paperForEntity(entities: IssuingEntity[], entityName: string | null): Promise<InvoicePaperLayout> {
  const s = await readInvoicePaper()
  const e = (entityName ? entities.find((x) => x.name === entityName) : null) ?? entities[0] ?? null
  return paperFor(s, e?.id ?? null)
}
/** A variation order's notes from the paper — null when the paper says nothing of its own. (parity map, MI-065) With its acceptance block
    (1.0's "Show acceptance terms" on a VO) and its own accent, for the VO's renderer to print — `acceptance` is null while the block is off. */
export async function variationPaperFor(entities: IssuingEntity[], entityName: string | null): Promise<{ header: string; footer: string; termsTitle: string; terms: string
  acceptance: { title: string; text: string } | null; accent: string | null } | null> {
  const p = await paperForEntity(entities, entityName)
  return paperHasWords(p) ? { header: p.header, footer: p.footer, termsTitle: p.termsTitle, terms: p.terms, acceptance: p.acceptance ? { title: p.acceptanceTitle, text: p.acceptanceText } : null, accent: p.accent || null } : null
}
