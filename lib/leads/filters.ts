import type { LeadRow } from '@/lib/leads/queries'
import { isOverdue, startOfDay } from '@/lib/format'

/** Filters modal model (780:94580) — Sort · Property type · Source · Assignees · Date. */
export type DatePreset = 'today' | '7d' | '30d' | 'month' | 'custom'   // (REG-610, parity L-27) 'month' = 1.0's "This month"
/** (REG-608, parity L-22) 1.0's quick filters, minus Hot (no temperature, Q-10) and Needs attention (no 2.0 meaning); every ticked one must hold. */
export type QuickFilter = 'overdue' | 'unassigned' | 'unseen'
export const QUICK_FILTERS: { key: QuickFilter; label: string; help: string }[] = [
  { key: 'overdue', label: 'Overdue follow-ups', help: 'An open task past its due date (not On Hold or Lost, and not yet a project)' },
  { key: 'unassigned', label: 'Unassigned', help: 'No member yet (not Lost)' },
  { key: 'unseen', label: 'Not opened yet', help: 'Nobody has opened it' },   // (the calm UI build 2026-10-27 — W-418) not software's "Unseen"
]

/**
 * (UX audit L3, supersedes the pane-only reach of REG-608) Morning triage where the eye is: the scope pill's menu carries these beside the
 * stages — "Mine", then the To do group (the three quick filters with their counts; it was "Needs attention" — a project's word, REG-914). One of them, or a stage, scopes the listing;
 * the pill names it ("Overdue follow-ups (4)") and wears the applied dot.
 */
export type AttentionScope = QuickFilter | 'mine' | 'today'
export const ATTENTION_LABEL: Record<AttentionScope, string> = { mine: 'Mine', overdue: 'Overdue follow-ups', unassigned: 'Unassigned', unseen: 'Not opened yet', today: 'To call today' }

/** (UX audit L3) ONE rule for an overdue lead — the pill's count, its list and the Filters modal's quick filter: an open task due before
 *  today (the red Overdue tag's own rule, `isOverdue`) on a lead still being worked. Parked (On Hold) and Lost leads are left out.
 *  (the Dashboard redesigned, 2026-10-26 — P-13 "one fact, one number", his Build mark) …and so is a lead that has handed over to its project
 *  (S42 D-11 · REG-1360's one home: a Won lead's tasks carry on as its project's, REG-920 — counted on the project, never as a lead's
 *  follow-up). Maison AI kept that rule alone, so the Dashboard said "3 leads have an overdue follow-up" beside its "2". */
export const handedOver = (r: Pick<LeadRow, 'project'>): boolean => !!r.project
export const isOverdueLead = (r: LeadRow, now: number): boolean =>
  r.stage !== 'On Hold' && r.stage !== 'Lost' && !handedOver(r) && r.tasks.some((t) => isOverdue(t.dueAt, now))

/** (leads on the move, P-05 — his marks 2026-10-23) "To call today": an open task due by the end of today — overdue or due today — on a lead
 *  still being worked (On Hold, Lost and — the Dashboard redesigned, P-13 — one handed over to its project left out, as `isOverdueLead`). The
 *  phone listing's chip and the pill's To do row on a phone. */
export const isCallTodayLead = (r: LeadRow, now: number): boolean =>
  r.stage !== 'On Hold' && r.stage !== 'Lost' && !handedOver(r) && r.tasks.some((t) => !!t.dueAt && startOfDay(t.dueAt) <= startOfDay(new Date(now)))

/** (the Dashboard redesigned, 2026-10-26 — P-13 "one fact, one number"; B's ST-12, "no member yet" three ways) ONE rule for a lead with no member
 *  yet — the listing's Unassigned scope and quick filter, the Dashboard's row, Maison AI: nobody on it, and not Lost (a lost lead is no one's to
 *  pick up — Maison AI already left it out; the listing and the Dashboard asked to assign it). A Won lead always has its owner (REG-334). */
export const isUnassignedLead = (r: Pick<LeadRow, 'assignees' | 'stage'>): boolean => r.assignees.length === 0 && r.stage !== 'Lost'

/** (the Dashboard redesigned, 2026-10-26 — P-13 "one 'not contacted'"; B's ST-13) ONE rule for a new lead nobody has contacted in time — the
 *  bell's "{name} has had no contact yet" (lib/notifications/queries.ts `derivedDue`) and the Dashboard's row: still New, no contact by the
 *  listing's own rule (`lastContactOf` — a log, a Contacted entry, a meeting held), and older than the studio's delay (Settings › Notifications,
 *  `NotificationRules.untouchedMinutes`). */
export const isUntouchedLead = (r: { stage: string; createdAt: Date; contacted: boolean }, now: number, minutes: number): boolean =>
  r.stage === 'New' && !r.contacted && r.createdAt.getTime() <= now - minutes * 60_000

/** (the Dashboard redesigned, 2026-10-26 — P-13) "Added in the last 7 days" — the listing's own Last 7 days (today and the six days before it,
 *  by calendar day: the Date filter's preset), the ONE week every count of new leads reads: the Dashboard, Maison AI, the Leads listing. Maison
 *  AI counted a rolling 7 × 24 hours, so it said 5 where the page said 4. */
export const addedInLast7Days = <T extends Pick<LeadRow, 'createdAt'>>(rows: T[], now: number): T[] => {
  const today = startOfDay(new Date(now))
  return rows.filter((r) => { const t = r.createdAt.getTime(); return t >= today - 6 * 86_400_000 && t < today + 86_400_000 })
}

/** Does the row belong to the attention scope? `unseen` is the caller's (the listing's band: nobody has opened it, here or on the server). */
export function inAttention(r: LeadRow, key: AttentionScope, ctx: { now: number; viewerId: string; unseen: (r: LeadRow) => boolean }): boolean {
  switch (key) {
    case 'mine': return r.assignees.some((m) => m.id === ctx.viewerId)
    case 'overdue': return isOverdueLead(r, ctx.now)
    case 'unassigned': return isUnassignedLead(r)
    case 'unseen': return ctx.unseen(r)
    case 'today': return isCallTodayLead(r, ctx.now)
  }
}
export type LeadFilters = {
  sort: 'newest' | 'oldest'
  quick: QuickFilter[]
  propertyTypes: string[]
  sources: string[]
  assignees: string[]      // member ids
  datePreset: DatePreset | null
  from: string             // d/m/yyyy (custom)
  to: string               // d/m/yyyy (custom)
}

export const EMPTY_FILTERS: LeadFilters = {
  sort: 'newest', quick: [], propertyTypes: [], sources: [], assignees: [], datePreset: null, from: '', to: '',
}

/** Inverse of parseDMY — the d/m/yyyy the date fields accept. */
export function toDMY(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export function parseDMY(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim())
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null
}

/** Which filter groups carry a selection (drives the rail dots and the toolbar badge). */
export function activeGroups(f: LeadFilters): { sort: boolean; quick: boolean; propertyTypes: boolean; sources: boolean; assignees: boolean; date: boolean } {
  return {
    sort: f.sort !== 'newest',
    quick: f.quick.length > 0,
    propertyTypes: f.propertyTypes.length > 0,
    sources: f.sources.length > 0,
    assignees: f.assignees.length > 0,
    date: f.datePreset === 'custom' ? !!(parseDMY(f.from) || parseDMY(f.to)) : f.datePreset !== null,
  }
}
export const activeFilterCount = (f: LeadFilters) => Object.values(activeGroups(f)).filter(Boolean).length

export function applyFilters(rows: LeadRow[], f: LeadFilters, now: number): LeadRow[] {
  let out = rows
  /* (REG-608) Quick filters AND together, as 1.0's do. */
  if (f.quick.includes('overdue')) out = out.filter((r) => isOverdueLead(r, now))   /* (UX audit L3) the one rule — parked and Lost leads out */
  if (f.quick.includes('unassigned')) out = out.filter(isUnassignedLead)
  if (f.quick.includes('unseen')) out = out.filter((r) => r.seenAt === null)
  if (f.propertyTypes.length) out = out.filter((r) => f.propertyTypes.includes(r.propertyType))
  if (f.sources.length) out = out.filter((r) => f.sources.includes(r.source))
  if (f.assignees.length) out = out.filter((r) => r.assignees.some((m) => f.assignees.includes(m.id)))
  if (f.datePreset) {
    const day = 86_400_000
    const today = startOfDay(new Date(now))
    let from: number | null = null, to: number | null = null
    if (f.datePreset === 'today') { from = today; to = today + day }
    else if (f.datePreset === '7d') { from = today - 6 * day; to = today + day }
    else if (f.datePreset === '30d') { from = today - 29 * day; to = today + day }
    else if (f.datePreset === 'month') { const d = new Date(now); from = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); to = today + day }   /* (REG-610) the 1st … today */
    else {
      const a = parseDMY(f.from), b = parseDMY(f.to)
      from = a ? a.getTime() : null
      to = b ? b.getTime() + day : null
    }
    out = out.filter((r) => {
      const t = r.createdAt.getTime()
      return (from === null || t >= from) && (to === null || t < to)
    })
  }
  if (f.sort === 'oldest') out = [...out].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  return out
}
