import 'server-only'
import { and, asc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, members, quotes, stageLogs, type Member } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this browser's member
import type { MemberStats } from '@/lib/leads/suggest'
import { fetchViewer } from '@/lib/leads/visibility'
import { fetchQuoteRules } from '@/lib/settings/queries'
import { runsStudio, type Viewer } from '@/lib/leads/assign-policy'
import { fetchDefaultCapacity } from '@/lib/projects/workload-queries'   // (one-home N-17)
import { fetchInvitationViews } from './invitations-server'   // (pending modules S09)
import type { InviteView } from './invitations'

/* Company › Members (REG-601): the studio's people, their roles and who reports to whom — and (one-home N-17) how many running projects each
   can carry at once (`members.project_capacity`, the Workload view's number; null = the studio's default). */

/** (REG-646) `openLeads` · `openQuotes`: the work a Deactivate names before it is confirmed — leads not yet Won or Lost they are on, quotes they prepared that are not yet signed. */
export type MemberRow = Member & { leadCount: number; reportsTo: string | null; openLeads: number; openQuotes: number }
export type MembersData = { members: MemberRow[]; viewer: Viewer; now: number; /** (sweep S4 #6) the Deactivate confirm names the seat it frees */ backupApproverId: string | null
  /** (one-home N-17) the studio's default project capacity (Settings › Projects › Workload) — what a member with no number of their own runs */
  defaultCapacity: number
  /** (pending modules S09) each member's latest invitation by member id — its link's token only for Owners and Admins, who manage it */
  invites: Record<string, InviteView> }

export async function fetchMembersData(): Promise<MembersData> {
  const [team, counts, open, drafts, viewer, rules, defaultCapacity] = await Promise.all([
    db.select().from(members).orderBy(asc(members.name)).then(withYou),
    db.select({ memberId: leadAssignees.memberId, n: sql<number>`count(*)` }).from(leadAssignees).innerJoin(leads, sql`${leads.id} = ${leadAssignees.leadId}`).where(and(isNull(leads.deletedAt), eq(leads.direct, false))).groupBy(leadAssignees.memberId),   // (fix-G, G-16) the leads the Leads listing counts — a direct project's client is no lead
    db.select({ memberId: leadAssignees.memberId, n: sql<number>`count(*)` }).from(leadAssignees).innerJoin(leads, sql`${leads.id} = ${leadAssignees.leadId}`).where(and(isNull(leads.deletedAt), eq(leads.direct, false), notInArray(leads.stage, ['Won', 'Lost']))).groupBy(leadAssignees.memberId),
    db.select({ memberId: sql<string>`coalesce(${quotes.preparedBy}, ${quotes.createdBy})`, n: sql<number>`count(*)` }).from(quotes).where(and(isNull(quotes.deletedAt), eq(quotes.kind, 'quote'), inArray(quotes.status, ['Draft', 'Sent for Approval', 'Approved', 'Sent to Client']))).groupBy(sql`coalesce(${quotes.preparedBy}, ${quotes.createdBy})`),
    fetchViewer(),
    fetchQuoteRules(),
    fetchDefaultCapacity(),
  ])
  const n = new Map(counts.map((c) => [c.memberId, Number(c.n)]))
  const openN = new Map(open.map((c) => [c.memberId, Number(c.n)]))
  const draftN = new Map(drafts.map((c) => [c.memberId, Number(c.n)]))
  const byId = new Map(team.map((m) => [m.id, m]))
  /* Owners first, then Admins, Managers, Designers; the signed-in member leads their group. */
  const rank: Record<string, number> = { Owner: 0, Admin: 1, Manager: 2, Designer: 3 }
  /* (simplify round 2 · F1 §6.9.3) a member's PayNow reaches whoever may change it — Owners and Admins, and the member themself — never a colleague */
  const seesPayNow = (id: string) => runsStudio(viewer.role) || id === viewer.id
  const rows = team.map((m) => ({ ...m, paynow: seesPayNow(m.id) ? m.paynow : null, leadCount: n.get(m.id) ?? 0, reportsTo: m.managerId ? byId.get(m.managerId)?.name ?? null : null, openLeads: openN.get(m.id) ?? 0, openQuotes: draftN.get(m.id) ?? 0 }))
    .sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || Number(b.isYou) - Number(a.isYou) || a.name.localeCompare(b.name))
  const invites = Object.fromEntries(await fetchInvitationViews(team.map((m) => m.id), runsStudio(viewer.role)))   // (pending modules S09)
  return { members: rows, viewer, now: Date.now(), backupApproverId: rules.backupApproverId ?? null, defaultCapacity, invites }
}

/** (REG-612, parity Q-27 · B-35) Per member, what the suggestion's Performance leg reads — 1.0's close rate · projects in the last 12 months ·
 *  active projects, from 2.0's records: the Won and Lost leads the member is on, Won logs within a year, the open leads they hold. */
export async function fetchMemberStats(now = Date.now()): Promise<MemberStats> {
  const [links, rows, won] = await Promise.all([
    db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees),
    db.select({ id: leads.id, stage: leads.stage }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false))),   // (REG-911) a direct project is no won lead
    db.select({ leadId: stageLogs.leadId, createdAt: stageLogs.createdAt }).from(stageLogs).where(sql`${stageLogs.toStage} = 'Won'`),
  ])
  const stage = new Map(rows.map((r) => [r.id, r.stage]))
  const wonAt = new Map<string, number>()
  for (const w of won) wonAt.set(w.leadId, Math.min(wonAt.get(w.leadId) ?? Infinity, w.createdAt.getTime()))
  const tally = new Map<string, { won: number; lost: number; recent: number; active: number }>()
  const year = 365 * 86_400_000
  for (const l of links) {
    const st = stage.get(l.leadId); if (!st) continue
    const t = tally.get(l.memberId) ?? { won: 0, lost: 0, recent: 0, active: 0 }
    if (st === 'Won') { t.won += 1; if ((wonAt.get(l.leadId) ?? 0) >= now - year) t.recent += 1 }
    else if (st === 'Lost') t.lost += 1
    else t.active += 1
    tally.set(l.memberId, t)
  }
  const out: MemberStats = {}
  for (const [id, t] of tally) out[id] = { closeRate: t.won + t.lost ? Math.round((t.won / (t.won + t.lost)) * 100) : 0, projects12m: t.recent, active: t.active }
  return out
}
