import 'server-only'   // libSQL must never reach the browser bundle: `RETURN_FILTERS` / `returnTags` live in lib/leads/return-tags.ts
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadReturns, leads, type Lead, type LeadReturn } from '@/lib/db/schema'
import { RETURN_FILTERS, returnTags, type ReturnTag } from './return-tags'
import { returnWindow, type ReturnWindow } from './return-model'
import { creditsByQanvastLead } from '@/lib/qanvast-account/queries'

/* Qanvast Ops › Leads (931:49232) — the Qanvast-sourced leads with their return state. */

export type QanvastLeadRow = Lead & {
  /** Qanvast credits spent on the lead — (pending modules S41b-5) what Qanvast says it took for it (lib/qanvast-account: the same answer Lead credits'
      statement reads; the demo's stand-in takes REG-193's 200 for each lead Qanvast sent). Null: Qanvast took none for it (a lead the studio
      typed in itself), or didn't answer — the column reads "—". */
  credits: number | null
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

/** `visible` — the leads this viewer sees (`visibleLeadIds`; null = every lead). (pending modules S14 — the survey's note "its Leads list applies
    no Who sees leads rule") Qanvast Ops' list follows Who sees leads as the listing does: a Designer who sees only their own leads sees only
    their own Qanvast leads here, and the counts count those. */
export async function fetchQanvastLeads(visible: Set<string> | null = null): Promise<QanvastLeadsData> {
  const rows = (await db.select().from(leads).where(and(eq(leads.source, 'Qanvast'), isNull(leads.deletedAt))).orderBy(asc(leads.createdAt)))
    .filter((l) => !visible || visible.has(l.id))
  const ids = rows.map((l) => l.id)
  const rets = ids.length ? await db.select().from(leadReturns).where(inArray(leadReturns.leadId, ids)).orderBy(asc(leadReturns.returnedAt)) : []
  const latest = new Map<string, LeadReturn>()
  const retCounts = new Map<string, number>()
  for (const r of rets) { latest.set(r.leadId, r); retCounts.set(r.leadId, (retCounts.get(r.leadId) ?? 0) + 1) }
  const now = Date.now()
  const charged = await creditsByQanvastLead(rows.map((l) => l.qanvastLeadId).filter((x): x is string => !!x))
  const out: QanvastLeadRow[] = rows.map((l) => {
    const ret = latest.get(l.id) ?? null
    const returnsCount = retCounts.get(l.id) ?? 0
    return { ...l, credits: (l.qanvastLeadId && charged?.[l.qanvastLeadId]) || null, ret, tags: ret ? returnTags(ret) : [{ label: l.stage, color: 'default' }], window: returnWindow(l.createdAt, returnsCount, now), returnsCount }
  })
  const counts: Record<string, number> = { 'All Leads': out.length }
  for (const r of out) {
    if (!r.ret) counts[r.stage] = (counts[r.stage] ?? 0) + 1
    for (const t of r.tags) if ((RETURN_FILTERS as readonly string[]).includes(t.label)) counts[t.label] = (counts[t.label] ?? 0) + 1
  }
  return { rows: out, counts, now }
}
