import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: the page hands the client plain facts
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, quotes, stageLogs, type Quote } from '@/lib/db/schema'
import { runsStudio } from '@/lib/settings/roles'
import { quoteNetsOf, signedNetBy } from '@/lib/projects/money-queries'
import { fetchInsights, type InsightsData } from './insights'
import { fetchLeadRows, type LeadRow } from './queries'
import { fetchViewer, visibleLeadIds } from './visibility'
import { JOURNEY, WON, type SalesData, type SalesFacts, type SalesMoney } from './sales'

/*
 * (pending modules S45A — H-UHD-1) Reports › Leads › Sales on the server: the facts each lead's figures derive from, for an Owner or an Admin
 * (1.0's sales reports were theirs — null for anyone else, the tab's gate). Who sees leads is honoured (`visibleLeadIds`), the turnaround facts
 * are Response time's own (`fetchInsights`), the last contact is the listing's (`fetchLeadRows` → `lastContactOf`) and money is the projects'
 * one rule before GST (`signedNetBy` · `quoteNetsOf`). The report itself is pure (lib/leads/sales.ts). Nothing is written.
 */

/** A quote's place when it values an OPEN lead: with the client, then approved, then waiting for approval, then a draft — newest first. */
const RANK: Record<string, number> = { Signed: 5, Confirmed: 4, 'Sent to Client': 4, Approved: 3, 'Sent for Approval': 2, Draft: 1 }
/** The quote went to the client: stamped when it first did, or a status only the client's side gives it. */
const sentToClient = (q: Pick<Quote, 'clientSentAt' | 'status'>) => !!q.clientSentAt || q.status === 'Sent to Client' || q.status === 'Confirmed' || q.status === 'Signed'

/** Owners and Admins: the Sales report's facts (null for anyone else). `rows` / `insights` — reads a caller already made (the Dashboard's). */
export async function fetchSales(o: { rows?: LeadRow[]; insights?: InsightsData } = {}): Promise<SalesData | null> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return null
  const [ins, rows, seen] = await Promise.all([o.insights ?? fetchInsights(), o.rows ?? fetchLeadRows().then((r) => r.rows), visibleLeadIds(viewer)])
  const facts0 = ins.facts.filter((f) => !seen || seen.has(f.id))
  const ids = facts0.map((f) => f.id)
  const none = <T,>() => Promise.resolve([] as T[])
  const [logs, qs, ps] = await Promise.all([
    ids.length ? db.select({ leadId: stageLogs.leadId, toStage: stageLogs.toStage }).from(stageLogs).where(inArray(stageLogs.leadId, ids)) : none<{ leadId: string; toStage: string }>(),
    ids.length ? db.select().from(quotes).where(and(inArray(quotes.leadId, ids), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt), isNull(quotes.archivedAt))) : none<Quote>(),
    ids.length ? db.select({ id: projects.id, leadId: projects.leadId, quoteId: projects.quoteId, agreedValueMinor: projects.agreedValueMinor }).from(projects).where(and(inArray(projects.leadId, ids), isNull(projects.deletedAt))) : none<{ id: string; leadId: string; quoteId: string | null; agreedValueMinor: number | null }>(),
  ])
  const byRow = new Map(rows.map((r) => [r.id, r]))
  const signed = await signedNetBy(ps)
  /* the open leads' best quote and the won leads with no project: valued from their own quote, read in one go */
  const best = new Map<string, Quote>()
  for (const q of qs) {
    const was = best.get(q.leadId)
    if (!was || (RANK[q.status] ?? 0) > (RANK[was.status] ?? 0) || ((RANK[q.status] ?? 0) === (RANK[was.status] ?? 0) && q.createdAt > was.createdAt)) best.set(q.leadId, q)
  }
  const nets = await quoteNetsOf([...best.values()])
  const facts: SalesFacts[] = facts0.map((f) => {
    const row = byRow.get(f.id)
    const mine = logs.filter((g) => g.leadId === f.id)
    const sent = qs.some((q) => q.leadId === f.id && sentToClient(q))
    const stageAt = (s: string) => JOURNEY.indexOf(s as (typeof JOURNEY)[number])
    const reached = Math.max(stageAt(f.stage), ...mine.map((g) => stageAt(g.toStage)), f.outreachAt !== null ? 1 : 0, sent ? 3 : 0, f.wonAt !== null ? WON : 0, 0)
    const budget = row?.budgetMinor && row.budgetMinor > 0 ? row.budgetMinor : null
    const project = ps.find((p) => p.leadId === f.id)
    const q = best.get(f.id), qn = q ? nets.get(q.id) : undefined
    let won: SalesMoney | null = null, open: SalesMoney | null = null
    if (reached >= WON) {
      const s = project ? signed.get(project.id) : undefined
      won = s ? { minor: s.netMinor, from: s.from } : q?.status === 'Signed' && qn ? { minor: qn.netMinor, from: 'quote' } : budget ? { minor: budget, from: 'budget' } : null
    } else if (f.stage !== 'Lost') {
      open = qn ? { minor: qn.netMinor, from: 'quote' } : budget ? { minor: budget, from: 'budget' } : null
    }
    return {
      ...f, source: row?.source ?? '', reached, everOnHold: f.stage === 'On Hold' || mine.some((g) => g.toStage === 'On Hold'),
      won, open, lastContactAt: row?.lastContact?.at.getTime() ?? null,
    }
  })
  return { facts, team: ins.team.map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color })), now: ins.now }
}
