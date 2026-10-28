import type { ProjectRow } from '@/lib/projects/model'

/**
 * (REG-924 · REG-926) The listing's scopes — what the scope pill picks and the tiles press, kept in the address (`?scope=`). The stage scopes
 * (Open is the default: Setting up and In progress; Completed hidden until asked, Q-25) and the to-do scopes the tiles name (Needs attention ·
 * Waiting on client · Completing this month). Client-safe and pure.
 *
 * (parity P-20, Q-07) The Leads listing's menu order and its groups: the default · All projects · Mine · the "To do" group · the stages under
 * the lead's Active / Inactive labels (Completed is the journey's last stage, as Won is the lead's; On hold is the inactive one, as On Hold).
 */
export type ProjectScope = 'open' | 'setting_up' | 'in_progress' | 'completed' | 'all' | 'attention' | 'waiting' | 'month'
  | 'review'   // (REG-956, round 3) updates waiting for this Owner's or Admin's approval
  | 'on_hold'   // (gaps build, package A — M-01) the projects on hold
  | 'mine'   // (parity P-20) the projects whose members include the viewer — the lead's Mine
/** What a scope's test reads besides the row: the day, and who is looking (Mine). */
export type ScopeContext = { now: number; me?: string }
export type ScopeGroup = 'top' | 'todo' | 'active' | 'inactive'
/* (the calm UI build 2026-10-27, 3-24 · 1-02 · T-01 · T-05) one line of help under a row — `full`, every reason it counts, in the row's tooltip;
   "Needs your attention" and "Approvals" as everywhere else (the keys, the address and the tests are as they were) */
export const SCOPES: { key: ProjectScope; label: string; group: ScopeGroup; help?: string; full?: string; test: (r: ProjectRow, ctx: ScopeContext) => boolean }[] = [
  { key: 'open', label: 'Open projects', group: 'top', test: (r) => r.stage !== 'completed' },
  { key: 'all', label: 'All projects', group: 'top', test: () => true },
  /* (parity P-20) the lead's Mine: a project the viewer is a member of (its lead's members, `lead_assignees`) */
  { key: 'mine', label: 'Mine', group: 'top', test: (r, { me }) => !!me && r.team.some((m) => m.id === me) },
  { key: 'attention', label: 'Needs your attention', group: 'todo', help: 'Late, stuck or quiet', full: 'Overdue tasks, milestones, choices or payments; a client who says something is not right; a long wait; no recent update; a set-up that stalled',   /* (REG-1058) every reason it counts (lib/projects/attention.ts) */ test: (r) => r.attention.length > 0 },
  { key: 'waiting', label: 'Waiting on client', group: 'todo', help: 'Something for them to answer', full: 'A quote, contract, variation order, invoice, payment or choice for them to answer; questions, designs or the portal invite not opened; a milestone that waits on them',   /* (REG-1058) every line it counts */ test: (r) => r.waitingOn.length > 0 },
  { key: 'month', label: 'Completing this month', group: 'todo', help: 'The target end falls this month', test: (r, { now }) => completingThisMonth(r, now) },
  /* (REG-956 · Projects rounds 5 · 6 · 7) · (simplify S-20, a deliberate change) every kind an Owner or an Admin approves on a project — the
     schedule's asks (Done, more time, a share) and the POs and expenses waiting join the updates, invoices, payments and handovers */
  { key: 'review', label: 'Approvals', group: 'todo', help: 'Waiting for your approval', full: 'Updates, invoices, handovers, schedule asks, purchase orders and expenses waiting for your approval, and payments to confirm', test: (r) => reviewCount(r) > 0 },
  { key: 'setting_up', label: 'Setting up', group: 'active', test: (r) => r.stage === 'setting_up' },
  { key: 'in_progress', label: 'In progress', group: 'active', test: (r) => r.stage === 'in_progress' },
  { key: 'completed', label: 'Completed', group: 'active', test: (r) => r.stage === 'completed' },
  /* (gaps build, package A — M-01) a mark, not a stage: Open projects keeps them; this scope shows them alone */
  { key: 'on_hold', label: 'On hold', group: 'inactive', test: (r) => !!r.hold && r.stage !== 'completed' },
]
export const isScope = (v: string | null | undefined): v is ProjectScope => !!v && SCOPES.some((s) => s.key === v)
export function completingThisMonth(r: ProjectRow, now: number): boolean {
  if (r.stage === 'completed' || !r.targetEndDate) return false
  const d = new Date(now), t = r.targetEndDate
  return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth()
}
export const inScope = (r: ProjectRow, s: ProjectScope, ctx: ScopeContext) => (SCOPES.find((x) => x.key === s)?.test(r, ctx) ?? true)

/** (simplify S-20) How many things wait for this viewer's OK on the row — every kind Needs my review counts. */
export function reviewCount(r: ProjectRow): number {
  const a = r.approvals
  return r.updatesToReview + (r.invoicesToReview ?? 0) + (r.paymentsToConfirm ?? 0) + (r.ends?.runs && r.ends.requested ? 1 : 0)
    + (a ? a.more.length + a.done.length + (a.share ? 1 : 0) + a.pos + a.expenses : 0)
}

/** (fix-E, E-21) Why a row is in Needs my review — its line names what waits for this viewer, where it showed only the attention reason
    ("No update for 14 days") of a project whose handover was waiting. (simplify S-20) Every kind, the schedule's asks and the costs too. */
export function reviewLine(r: ProjectRow): string | null {
  const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`
  const a = r.approvals
  const parts = [
    r.ends?.runs && r.ends.requested ? `Handover to review${r.ends.requestedBy ? ` — ${r.ends.requestedBy} asked` : ''}` : null,
    a?.done.length ? (a.done.length === 1 ? `${a.done[0]} to approve as done` : `${a.done.length} milestones to approve as done`) : null,
    a?.more.length ? (a.more.length === 1 ? `More time asked on ${a.more[0]}` : `More time asked on ${a.more.length} milestones`) : null,
    a?.share ? 'Schedule changes to share' : null,
    r.updatesToReview ? `${n(r.updatesToReview, 'update')} to review` : null,
    r.invoicesToReview ? `${n(r.invoicesToReview, 'invoice')} to approve` : null,
    r.paymentsToConfirm ? `${n(r.paymentsToConfirm, 'payment')} to confirm` : null,
    a?.pos ? `${n(a.pos, 'purchase order')} to approve` : null,
    a?.expenses ? `${n(a.expenses, 'expense')} to approve` : null,
  ].filter((x): x is string => !!x)
  return parts.length ? parts.join(' · ') : null
}
