import 'server-only'
import { asc, desc, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, quoteTemplates, quoteTextTemplates, type QuoteTextTemplate } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'

/* Company › Templates › T&Cs & Notes (REG-538): the text library behind the quote editor's My Templates, as a page. */

export type TextTemplateRow = QuoteTextTemplate & { usedBy: number; author: string | null; authorColor: string | null }
export type TextTemplatesData = { templates: TextTemplateRow[]; deleted: TextTemplateRow[]; now: number; /** (REG-646) who is looking — the menus' rename / delete rule */ viewer: { id: string; role: string } }

/** Which quote templates name each text template in their Defaults (published or draft). */
export async function textTemplateUsage(): Promise<Map<string, number>> {
  const rows = await db.select({ defaultsJson: quoteTemplates.defaultsJson, draftJson: quoteTemplates.draftJson }).from(quoteTemplates).where(isNull(quoteTemplates.deletedAt))
  const n = new Map<string, number>()
  for (const r of rows) {
    const ids = new Set<string>()
    const take = (d: { termsTemplateId?: string | null; notesTemplateId?: string | null } | null | undefined) => { if (d?.termsTemplateId) ids.add(d.termsTemplateId); if (d?.notesTemplateId) ids.add(d.notesTemplateId) }
    try { take(r.defaultsJson ? JSON.parse(r.defaultsJson) : null) } catch { /* ignore */ }
    try { take(r.draftJson ? (JSON.parse(r.draftJson) as { defaults?: { termsTemplateId?: string | null; notesTemplateId?: string | null } }).defaults : null) } catch { /* ignore */ }
    for (const id of ids) n.set(id, (n.get(id) ?? 0) + 1)
  }
  return n
}

export async function fetchTextTemplatesData(): Promise<TextTemplatesData> {
  const [all, n, team] = await Promise.all([db.select().from(quoteTextTemplates).orderBy(desc(quoteTextTemplates.updatedAt), asc(quoteTextTemplates.createdAt)), textTemplateUsage(), db.select({ id: members.id, name: members.name, color: members.color }).from(members)])
  const by = new Map(team.map((m) => [m.id, m]))
  const rows: TextTemplateRow[] = all.map((t) => { const m = t.createdBy ? by.get(t.createdBy) : undefined; return { ...t, usedBy: n.get(t.id) ?? 0, author: m?.name ?? null, authorColor: m?.color ?? null } })
  const v = await fetchViewer()
  return { templates: rows.filter((t) => !t.deletedAt), deleted: rows.filter((t) => !!t.deletedAt), now: Date.now(), viewer: { id: v.id, role: v.role } }
}
export type TextTemplateEditorData = { template: TextTemplateRow; now: number }
export async function fetchTextTemplateEditor(id: string): Promise<TextTemplateEditorData | null> {
  const data = await fetchTextTemplatesData()
  const t = data.templates.find((x) => x.id === id)
  return t ? { template: t, now: data.now } : null
}
