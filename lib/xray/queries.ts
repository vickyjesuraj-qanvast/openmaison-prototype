import 'server-only'
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import { nameDirectClients } from '@/lib/projects/direct-clients'   // (fix-A, A-02)
import { db } from '@/lib/db'
import { leads, members, quoteComparisons, quoteItems, quotes } from '@/lib/db/schema'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { canDeleteComparison } from './policy'
import { readResult, type XrayResult, type YourLine } from './compare'
import { linesFingerprint, yourLinesFrom } from './lines'

/** Quote X-Ray (REG-529) — the setup page's data and a stored comparison. */
/** (REG-641, Q-19) No phone: the setup page never showed it, and it has no business in the browser (E-102). */
export type XrayLead = { id: string; name: string; propertyType: string }
export type XrayQuote = { id: string; leadId: string; number: string; title: string; amountMinor: number; status: string; updatedAt: number
  /** (REG-639, Q-11) Lines the quote can be compared on — items not declined, not optional, not an untitled empty line. 0 = nothing to compare. */
  lineCount: number }
export type XrayRecent = { id: string; leadId: string | null; leadName: string | null; yourLabel: string; otherStudio: string; createdAt: number; /** (Q-16) */ sentAt: number | null
  /** (REG-641, Q-20) this viewer may delete it */ canDelete: boolean }
export type XrayData = { leads: XrayLead[]; quotes: XrayQuote[]; recents: XrayRecent[] }
/** (the close-out round 2026-10-31, C-08) A row of Deleted comparisons: its name as Recent wrote it, your side (the quote's number or your
    file), when it went, who ran it, and whether this viewer may restore it or delete it forever (the delete's own rule, lib/xray/policy.ts). */
export type DeletedComparison = { id: string; leadId: string | null; title: string; yours: string; deletedAt: number; madeBy: string; mine: boolean }
export type XrayRecord = { id: string; leadId: string | null; leadName: string | null; leadPhone: string | null; quoteId: string | null; yourLabel: string; otherStudio: string; otherFile: string; result: XrayResult; createdAt: number; createdBy: string
  /** (REG-640) The compared quote as it is now — `live` = neither archived nor deleted (Q-17 · Q-21); (sweep S3) which of the two it is. */
  quote: { id: string; number: string; live: boolean; gone: 'deleted' | 'archived' | null } | null
  /** (Q-15) The quote's counted lines changed after the reading. */
  stale: boolean
  /** (Q-14) The reading keeps its lines, so a match can be corrected; who corrected it last. */
  correctable: boolean
  corrected: { by: string; at: number } | null
  /** (Q-16) The last send. */
  sent: { at: number; by: string; text: string; via: 'whatsapp' | 'copy' } | null
  /** (REG-641, Q-20) this viewer may delete it */
  canDelete: boolean }

/**
 * The setup page's data. (REG-641, parity Q-19) Who sees leads reaches X-Ray: a lead the viewer can't open, its quotes and its
 * comparisons are not listed (a comparison with no lead is the studio's); a deleted lead's comparisons leave Recent and come back
 * with the lead (Q-21).
 */
export async function fetchXrayData(): Promise<XrayData> {
  const viewer = await fetchViewer()
  const visible = await visibleLeadIds(viewer)
  const sees = (leadId: string | null) => !leadId || !visible || visible.has(leadId)
  const [ls, qs, recents] = await Promise.all([
    db.select({ id: leads.id, name: leads.name, propertyType: leads.propertyType }).from(leads).where(isNull(leads.deletedAt)).orderBy(leads.name),
    db.select({ id: quotes.id, leadId: quotes.leadId, number: quotes.number, title: quotes.title, amountMinor: quotes.amountMinor, status: quotes.status, updatedAt: quotes.updatedAt, createdAt: quotes.createdAt,
      lineCount: sql<number>`(SELECT count(*) FROM quote_items i WHERE i.quote_id = "quotes"."id" AND i.kind = 'item' AND i.status <> 'Declined' AND i.optional = 0 AND NOT (trim(coalesce(i.name, '')) IN ('', 'Item') AND i.cost_minor + i.markup_minor = 0 AND i.print_as IS NULL))` })
      .from(quotes).where(and(isNull(quotes.deletedAt), isNull(quotes.archivedAt), eq(quotes.kind, 'quote'))).orderBy(desc(quotes.updatedAt)),
    fetchRecents(),
  ])
  const live = new Set(ls.map((l) => l.id))
  return {
    leads: await nameDirectClients(ls.filter((l) => sees(l.id))),   // (fix-A, A-02) a direct project's client named with its number
    quotes: qs.filter((q) => live.has(q.leadId) && sees(q.leadId)).map(({ createdAt, ...q }) => ({ ...q, lineCount: Number(q.lineCount), updatedAt: (q.updatedAt ?? createdAt).getTime() })),
    recents: recents.filter((r) => sees(r.leadId)).map(({ createdBy, ...r }) => ({ ...r, canDelete: canDeleteComparison(viewer, createdBy) })),
  }
}

/** (REG-639, Q-13) Every comparison, newest first — Recent lists them all (with a search once the list is long), not the 20 newest.
    (C-08) A deleted one waits in Deleted comparisons, not here. */
async function fetchRecents(): Promise<(Omit<XrayRecent, 'canDelete'> & { createdBy: string })[]> {
  const rows = await db.select({ id: quoteComparisons.id, leadId: quoteComparisons.leadId, leadName: leads.name, leadGone: leads.deletedAt, yourLabel: quoteComparisons.yourLabel, otherStudio: quoteComparisons.otherStudio, createdAt: quoteComparisons.createdAt, sentAt: quoteComparisons.sentAt, createdBy: quoteComparisons.createdBy })
    .from(quoteComparisons).leftJoin(leads, eq(leads.id, quoteComparisons.leadId)).where(isNull(quoteComparisons.deletedAt)).orderBy(desc(quoteComparisons.createdAt))
  return rows.filter((r) => !r.leadGone && !(r.leadId && r.leadName === null)).map(({ leadGone: _gone, ...r }) => ({ ...r, leadName: r.leadName ?? null, createdAt: r.createdAt.getTime(), sentAt: r.sentAt ? r.sentAt.getTime() : null }))
}

export async function fetchComparison(id: string): Promise<XrayRecord | null> {
  const [row] = await db.select({ c: quoteComparisons, leadName: leads.name, leadPhone: leads.phone, leadGone: leads.deletedAt, by: members.name })
    .from(quoteComparisons).leftJoin(leads, eq(leads.id, quoteComparisons.leadId)).leftJoin(members, eq(members.id, quoteComparisons.createdBy)).where(eq(quoteComparisons.id, id))
  if (!row || row.c.deletedAt) return null   // (C-08) a deleted reading answers not found, as a deleted lead's does — it waits in Deleted comparisons
  const c = row.c
  /* (REG-641, Q-19 · Q-21) the record answers as its lead does: not your lead, or a deleted lead — not found */
  const viewer = await fetchViewer()
  if (c.leadId && (row.leadGone || row.leadName === null || !(await canOpenLead(viewer, c.leadId)))) return null
  const names = new Map((await db.select({ id: members.id, name: members.name }).from(members)).map((m) => [m.id, m.name]))
  const [q] = c.quoteId ? await db.select({ id: quotes.id, number: quotes.number, deletedAt: quotes.deletedAt, archivedAt: quotes.archivedAt }).from(quotes).where(eq(quotes.id, c.quoteId)) : []
  const live = !!q && !q.deletedAt && !q.archivedAt
  let inputs: { yours: YourLine[] } | null = null
  try { inputs = c.inputsJson ? JSON.parse(c.inputsJson) as { yours: YourLine[] } : null } catch { inputs = null }
  /* (Q-15) stale: the quote's lines as the comparison reads them now, against the lines the reading kept */
  const stale = !!(live && inputs && c.quoteId) && linesFingerprint(await loadYourLines(c.quoteId!)) !== linesFingerprint(inputs!.yours)
  return {
    id: c.id, leadId: c.leadId, leadName: row.leadName ?? null, leadPhone: row.leadPhone ?? null, quoteId: c.quoteId, yourLabel: c.yourLabel, otherStudio: c.otherStudio, otherFile: c.otherFile,
    result: readResult(c.resultJson), createdAt: c.createdAt.getTime(), createdBy: row.by ?? 'You',
    quote: q ? { id: q.id, number: q.number, live, gone: q.deletedAt ? 'deleted' : q.archivedAt ? 'archived' : null } : null, stale, correctable: !!inputs,
    corrected: c.correctedAt ? { by: names.get(c.correctedBy ?? '') ?? 'Someone', at: c.correctedAt.getTime() } : null,
    sent: c.sentAt ? { at: c.sentAt.getTime(), by: names.get(c.sentBy ?? '') ?? 'Someone', text: c.sentText ?? '', via: c.sentVia === 'copy' ? 'copy' : 'whatsapp' } : null,
    canDelete: canDeleteComparison(viewer, c.createdBy),
  }
}

/**
 * (the close-out round 2026-10-31, C-08) Deleted comparisons — the lead's own on its X-Ray page, every one on Tools › Quote X-Ray — newest
 * deletion first. Who sees leads holds here as in Recent: a lead the viewer can't open keeps its readings out, and a deleted lead's readings
 * wait with the lead (they come back with it; its Delete forever takes them).
 */
export async function fetchDeletedComparisons(leadId: string | null): Promise<DeletedComparison[]> {
  const viewer = await fetchViewer()
  const visible = await visibleLeadIds(viewer)
  const rows = await db.select({ c: quoteComparisons, leadName: leads.name, leadGone: leads.deletedAt, by: members.name })
    .from(quoteComparisons).leftJoin(leads, eq(leads.id, quoteComparisons.leadId)).leftJoin(members, eq(members.id, quoteComparisons.createdBy))
    .where(and(isNotNull(quoteComparisons.deletedAt), leadId ? eq(quoteComparisons.leadId, leadId) : undefined)).orderBy(desc(quoteComparisons.deletedAt))
  return rows.filter((r) => !r.c.leadId || (!r.leadGone && r.leadName !== null && (!visible || visible.has(r.c.leadId)))).map(({ c, leadName, by }) => ({
    id: c.id, leadId: c.leadId, title: `${leadName ?? c.yourLabel} · vs ${c.otherStudio}`,
    yours: c.quoteId ? c.yourLabel.split(' · ')[0]! : c.yourFile ?? c.yourLabel,
    deletedAt: c.deletedAt!.getTime(), madeBy: by ?? 'Someone', mine: canDeleteComparison(viewer, c.createdBy),
  }))
}

/** (REG-638, parity Q-02) A studio quote's lines as the comparison reads them — the quote's own count, in its order (lib/xray/lines.ts). */
export async function loadYourLines(quoteId: string): Promise<YourLine[]> {
  return yourLinesFrom(await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)))
}
