import 'server-only'
import { asc, desc, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, paymentTemplates, quoteTemplates, type PaymentTemplate } from '@/lib/db/schema'
import { parseSplitRows, PRESET_SPLITS, type PaymentSplit } from '@/lib/quotes/payments'
import { fetchViewer } from '@/lib/leads/visibility'

/* Company › Templates › Payments (REG-538): the studio's milestone splits as a library. */

export type PaymentTemplateRow = PaymentTemplate & { rows: ReturnType<typeof parseSplitRows>; usedBy: number; author: string | null; authorColor: string | null }
export type PaymentTemplatesData = { templates: PaymentTemplateRow[]; deleted: PaymentTemplateRow[]; now: number; /** (REG-646) who is looking — the menus' rename / delete rule */ viewer: { id: string; role: string } }

/** Which quote templates start quotes on each split (their published or draft defaults' `paymentPreset`). */
async function usage(): Promise<Map<string, number>> {
  const rows = await db.select({ defaultsJson: quoteTemplates.defaultsJson, draftJson: quoteTemplates.draftJson }).from(quoteTemplates).where(isNull(quoteTemplates.deletedAt))
  const n = new Map<string, number>()
  for (const r of rows) {
    const keys = new Set<string>()
    try { const d = r.defaultsJson ? (JSON.parse(r.defaultsJson) as { paymentPreset?: string }) : null; if (d?.paymentPreset) keys.add(d.paymentPreset) } catch { /* ignore */ }
    try { const d = r.draftJson ? (JSON.parse(r.draftJson) as { defaults?: { paymentPreset?: string } }) : null; if (d?.defaults?.paymentPreset) keys.add(d.defaults.paymentPreset) } catch { /* ignore */ }
    for (const k of keys) n.set(k, (n.get(k) ?? 0) + 1)
  }
  return n
}
const withMeta = (t: PaymentTemplate, n: Map<string, number>, by: Map<string, { name: string; color: string }>): PaymentTemplateRow => {
  const m = t.createdBy ? by.get(t.createdBy) : undefined
  return { ...t, rows: parseSplitRows(t.rowsJson), usedBy: n.get(t.id) ?? 0, author: m?.name ?? null, authorColor: m?.color ?? null }
}

export async function fetchPaymentTemplatesData(): Promise<PaymentTemplatesData> {
  const [all, n, team] = await Promise.all([db.select().from(paymentTemplates).orderBy(desc(paymentTemplates.isPreset), asc(paymentTemplates.createdAt)), usage(), db.select({ id: members.id, name: members.name, color: members.color }).from(members)])
  const by = new Map(team.map((m) => [m.id, { name: m.name, color: m.color }]))
  const rows = all.map((t) => withMeta(t, n, by))
  const v = await fetchViewer()
  return { templates: rows.filter((t) => !t.deletedAt), deleted: rows.filter((t) => !!t.deletedAt), now: Date.now(), viewer: { id: v.id, role: v.role } }
}
export type PaymentTemplateEditorData = { template: PaymentTemplateRow; now: number }
export async function fetchPaymentTemplateEditor(id: string): Promise<PaymentTemplateEditorData | null> {
  const data = await fetchPaymentTemplatesData()
  const t = data.templates.find((x) => x.id === id)
  return t ? { template: t, now: data.now } : null
}
/** The live splits every schedule surface offers (the presets ▾, the Defaults pane, `createQuote`); the seeded four when the table is empty. */
export async function fetchPaymentSplits(): Promise<PaymentSplit[]> {
  const rows = await db.select().from(paymentTemplates).where(isNull(paymentTemplates.deletedAt)).orderBy(desc(paymentTemplates.isPreset), asc(paymentTemplates.createdAt))
  if (!rows.length) return PRESET_SPLITS
  return rows.map((t) => ({ id: t.id, name: t.name, rows: parseSplitRows(t.rowsJson), isPreset: t.isPreset, folderId: t.folderId ?? null }))
}
