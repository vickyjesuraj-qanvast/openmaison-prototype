import 'server-only'   // libSQL must never reach the browser bundle: `RETURN_FILTERS` / `returnTags` live in lib/leads/return-tags.ts
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadReturns, leads, type Lead, type LeadReturn } from '@/lib/db/schema'
import { RETURN_FILTERS, returnTags, type ReturnTag } from './return-tags'
import { returnWindow, type ReturnWindow } from './return-model'

/* Qanvast Ops › Leads (931:49232) — the Qanvast-sourced leads with their return state. */

export type QanvastLeadRow = Lead & {
  /** Qanvast credits spent on the lead — the mock's "200" on every row (no credit model yet, REG-193). */
  credits: number
  ret: LeadReturn | null
  /** Status column: return tags when returned, else the stage ("Active" is not a stage — the stage name is shown). */
  tags: ReturnTag[]
  /** (REG-609, parity Q-44) Where the lead stands against Qanvast's return rules — display only. */
  window: ReturnWindow
  returnsCount: number
}
export type QanvastLeadsData = {
  rows: QanvastLeadRow[]
  /** Counts for the "All Leads" dropdown (931:49435): stages + the five return states. */
  counts: Record<string, number>
  now: number
}

export async function fetchQanvastLeads(): Promise<QanvastLeadsData> {
  const rows = await db.select().from(leads).where(and(eq(leads.source, 'Qanvast'), isNull(leads.deletedAt))).orderBy(asc(leads.createdAt))
  const ids = rows.map((l) => l.id)
  const rets = ids.length ? await db.select().from(leadReturns).where(inArray(leadReturns.leadId, ids)).orderBy(asc(leadReturns.returnedAt)) : []
  const latest = new Map<string, LeadReturn>()
  const retCounts = new Map<string, number>()
  for (const r of rets) { latest.set(r.leadId, r); retCounts.set(r.leadId, (retCounts.get(r.leadId) ?? 0) + 1) }
  const now = Date.now()
  const out: QanvastLeadRow[] = rows.map((l) => {
    const ret = latest.get(l.id) ?? null
    const returnsCount = retCounts.get(l.id) ?? 0
    return { ...l, credits: 200, ret, tags: ret ? returnTags(ret) : [{ label: l.stage, color: 'default' }], window: returnWindow(l.createdAt, returnsCount, now), returnsCount }
  })
  const counts: Record<string, number> = { 'All Leads': out.length }
  for (const r of out) {
    if (!r.ret) counts[r.stage] = (counts[r.stage] ?? 0) + 1
    for (const t of r.tags) if ((RETURN_FILTERS as readonly string[]).includes(t.label)) counts[t.label] = (counts[t.label] ?? 0) + 1
  }
  return { rows: out, counts, now }
}
