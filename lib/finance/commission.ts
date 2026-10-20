/**
 * (gaps build F2 — the books, F2-Q4…Q8; 1.0 G-318 · G-492, `commissions-fan-out.ts`, `commission-summary.ts`) Commission — pure and client-safe.
 * WORKED OUT, never stored per payment: 1.0 wrote an accrual row on each payment and never took it back when the payment was reversed, its profit
 * rule read another revenue base (G-458 · G-475 · G-483), and splits not adding to 100% were "honoured as-is". Here one function,
 * `commissionsOf`, reads the rules (kept as versions), a project's shares, the payments that count, the project's profit and the payouts, and
 * every surface — Finance › Commissions, a member's own view, the reports — reads it.
 *
 * - **The rule** for a member on a project, on a day: the first in force in the order member on the project → project → member → studio (1.0's
 *   order). A rule version is in force from its day until it ends; a change applies from its day, so earlier payments keep the rate they earned.
 * - **% of what the client pays**: each payment that counts on the contract's invoices (a one-off is outside the contract and earns none), before
 *   GST, × the rate × the member's share.
 * - **% of the profit**: the rate × the profit before GST (never below zero) × the share of the contract that payment brought in × the share — an
 *   estimate that moves with the costs until the project is Completed.
 * - **A fixed amount**: once per project, with its first payment under that rule, × the share.
 * - **Shares**: the project's own (set by an Owner or an Admin, always 10,000 bp), else equal between the team, the last taking the odd point.
 */
import { money2 } from '@/lib/quotes/math'

export type CommissionBasis = 'none' | 'payments' | 'profit' | 'fixed'
export const COMMISSION_BASES: { value: CommissionBasis; label: string; help: string }[] = [
  { value: 'none', label: 'No commission', help: 'Nobody earns commission' },
  { value: 'payments', label: '% of what the client pays', help: 'Earned on each payment, before GST' },
  { value: 'profit', label: '% of the profit', help: 'Contract value less the costs, before GST — earned as the client pays' },
  { value: 'fixed', label: 'A fixed amount per project', help: 'Earned once, with the project’s first payment' },
]
export const isBasis = (v: unknown): v is CommissionBasis => v === 'none' || v === 'payments' || v === 'profit' || v === 'fixed'
export type RuleScope = 'studio' | 'member' | 'project' | 'member_project'
export const SCOPE_LABEL: Record<RuleScope, string> = { studio: 'The studio’s rule', member: 'Their own rate', project: 'This project’s rate', member_project: 'Their rate on this project' }

export type CommissionRuleRecord = {
  id: string; memberId: string | null; projectId: string | null; basis: CommissionBasis; rateBp: number; fixedMinor: number
  fromDay: number; endedAt: number | null; requestId: string | null; createdBy: string | null; createdAt: number
  /** (parity map, FB-043 — 1.0's `milestone:{name}` triggers) A project's rule paid on chosen payment stages only, each at its own rate or the
      rule's (`rateBp: null`); null / absent = every payment that counts (`commission_rules.stages_json`). */
  stages?: RuleStage[] | null
  /** (parity map, FB-073) who ended the version — the Changes list's "removed by" */
  endedBy?: string | null
}
/** (parity map, FB-043) One payment stage a rule pays on: the stage's ref (`MoneyStage.ref`), and its own rate in bp (null = the rule's). */
export type RuleStage = { ref: string; rateBp: number | null }
/** (parity map, FB-043) `stages_json` as stored → the stages, or null (every payment). Junk reads as null. */
export function parseRuleStages(json: string | null | undefined): RuleStage[] | null {
  if (!json) return null
  try {
    const v: unknown = JSON.parse(json)
    if (!Array.isArray(v)) return null
    const out = v.flatMap((x): RuleStage[] => {
      if (!x || typeof x !== 'object' || typeof (x as { ref?: unknown }).ref !== 'string') return []
      const r = (x as { rateBp?: unknown }).rateBp
      return [{ ref: (x as { ref: string }).ref, rateBp: typeof r === 'number' && r > 0 ? Math.round(r) : null }]
    })
    return out.length ? out : null
  } catch { return null }
}
/** The rate a payment on `stageRef` earns under a rule: its stage's own, else the rule's; `null` when the rule pays on chosen stages and this is not one. */
export function stageRate(r: Pick<CommissionRuleRecord, 'rateBp' | 'stages'>, stageRef: string | null | undefined): number | null {
  if (!r.stages?.length) return r.rateBp
  const hit = r.stages.find((x) => x.ref === stageRef)
  return hit ? hit.rateBp ?? r.rateBp : null
}
export type ShareRecord = { projectId: string; memberId: string; shareBp: number }
export type CommissionPayoutRecord = {
  id: string; memberId: string; projectId: string; amountMinor: number; paidOn: number; method: string; reference: string | null; note: string | null
  createdBy: string | null; createdAt: number; reversedAt: number | null; reversedBy: string | null; reverseReason: string | null
}
export type CommissionAsk = {
  id: string; projectId: string; memberId: string; basis: CommissionBasis; rateBp: number; fixedMinor: number; reason: string
  status: 'open' | 'approved' | 'declined' | 'withdrawn'; answeredBy: string | null; answeredAt: number | null; answerNote: string | null
  approvedRateBp: number | null; approvedFixedMinor: number | null; createdAt: number
}
/** A payment that counts, on the contract's invoices: its day, and its amount before GST — and (parity map, FB-043) the payment stage its invoice bills. */
export type CommissionPayment = { id: string; paidOn: number; netMinor: number; stageRef?: string | null }
export type CommissionProject = {
  id: string; name: string; number: string; stage: string
  /** The team (its members' ids) — who earns. */
  team: string[]
  payments: CommissionPayment[]
  /** The contract and the profit, before GST (the profit never below zero for commission). */
  contractNetMinor: number; profitNetMinor: number
  /** (parity map, FB-072) The payment stages' shares of the contract, before GST — what a rule on chosen stages is expected to earn on. */
  stages?: { ref: string; netMinor: number }[]
}

export const pctWords = (bp: number) => { const n = bp / 100; return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, '')}%` }
export function ruleWords(r: (Pick<CommissionRuleRecord, 'basis' | 'rateBp' | 'fixedMinor'> & { stages?: RuleStage[] | null }) | null): string {
  if (!r || r.basis === 'none') return 'No commission'
  /* (parity map, FB-043) a rule on chosen payment stages says so — the stages' names are the dialog's (`stagesWords`) */
  const on = r.stages?.length ? ` · on ${r.stages.length} payment stage${r.stages.length === 1 ? '' : 's'}` : ''
  if (r.basis === 'payments') return `${pctWords(r.rateBp)} of what the client pays${on}`
  if (r.basis === 'profit') return `${pctWords(r.rateBp)} of the profit${on}`
  return `${money2(r.fixedMinor)} for the project${on}`
}
/** (parity map, FB-043) The chosen stages by name, each with its own rate when it has one — "Deposit · Completion at 5%". */
export function stagesWords(stages: RuleStage[] | null | undefined, names: { ref: string; name: string }[]): string {
  if (!stages?.length) return 'Every payment'
  return stages.map((x) => `${names.find((n) => n.ref === x.ref)?.name ?? 'A stage'}${x.rateBp ? ` at ${pctWords(x.rateBp)}` : ''}`).join(' · ')
}
export const scopeOf = (r: Pick<CommissionRuleRecord, 'memberId' | 'projectId'>): RuleScope =>
  r.memberId && r.projectId ? 'member_project' : r.projectId ? 'project' : r.memberId ? 'member' : 'studio'

/** In force on `day`: from its day on, until it ended. */
export const inForce = (r: Pick<CommissionRuleRecord, 'fromDay' | 'endedAt'>, day: number) => r.fromDay <= day && (r.endedAt === null || r.endedAt > day)
/** The rule for a member on a project on a day — the first scope with a version in force (the newest version of it). */
export function ruleFor(rules: CommissionRuleRecord[], memberId: string, projectId: string, day: number): CommissionRuleRecord | null {
  const scopes: ((r: CommissionRuleRecord) => boolean)[] = [
    (r) => r.memberId === memberId && r.projectId === projectId,
    (r) => r.memberId === null && r.projectId === projectId,
    (r) => r.memberId === memberId && r.projectId === null,
    (r) => r.memberId === null && r.projectId === null,
  ]
  for (const fits of scopes) {
    const hit = rules.filter((r) => fits(r) && inForce(r, day)).sort((a, b) => b.fromDay - a.fromDay || b.createdAt - a.createdAt)[0]
    if (hit) return hit
  }
  return null
}
/** The rules as they stand today, per scope (the Settings card and the Commissions list show these). */
export const currentRules = (rules: CommissionRuleRecord[]) => rules.filter((r) => r.endedAt === null)

/** A project's shares: its own when they cover its team, else equal (the last taking the odd point). Always 10,000 bp in all. */
export function sharesOf(projectId: string, team: string[], shares: ShareRecord[]): Map<string, number> {
  const out = new Map<string, number>()
  if (!team.length) return out
  const own = shares.filter((s) => s.projectId === projectId && team.includes(s.memberId))
  const sum = own.reduce((s, x) => s + x.shareBp, 0)
  if (own.length && sum === 10_000) { for (const m of team) out.set(m, own.find((x) => x.memberId === m)?.shareBp ?? 0); return out }
  const each = Math.floor(10_000 / team.length)
  team.forEach((m, i) => out.set(m, i === team.length - 1 ? 10_000 - each * (team.length - 1) : each))
  return out
}

export type CommissionLine = {
  memberId: string; projectId: string
  /** The member's share of the project (bp) and the rule today. */
  shareBp: number; rule: CommissionRuleRecord | null; scope: RuleScope | null; words: string
  earnedMinor: number; paidMinor: number
  /** Earned − paid, never below zero; paid beyond what is earned (a profit estimate that fell) is `aheadMinor`. */
  owedMinor: number; aheadMinor: number
  /** A profit rule's figure moves with the costs until the project is Completed. */
  estimate: boolean
  /** What each payment earned (the reports' commission by period). */
  entries: { paymentId: string; paidOn: number; amountMinor: number }[]
  /** (parity map, FB-072 — 1.0's expected commission) What today's rule gives on the whole contract, at the member's share — before GST. */
  expectedMinor: number
}
/**
 * (parity map, FB-072) What a rule is expected to earn a member on a project — the rule × the contract, before GST, × their share: a % of what
 * the client pays on the contract (on the chosen stages' shares of it, each at its rate, when the rule names stages), a % of today's profit, or
 * the fixed amount. Earned catches up as the client pays; the gap is the report's Variance.
 */
export function expectedOf(r: (Pick<CommissionRuleRecord, 'basis' | 'rateBp' | 'fixedMinor'> & { stages?: RuleStage[] | null }) | null, p: Pick<CommissionProject, 'contractNetMinor' | 'profitNetMinor' | 'stages'>, shareBp: number): number {
  if (!r || r.basis === 'none' || !shareBp) return 0
  if (r.basis === 'fixed') return Math.round((r.fixedMinor * shareBp) / 10_000)
  const base = r.basis === 'payments' ? p.contractNetMinor : Math.max(0, p.profitNetMinor)
  if (!r.stages?.length) return Math.round((base * r.rateBp * shareBp) / 1e8)
  const stages = p.stages ?? []
  const total = stages.reduce((s, x) => s + x.netMinor, 0)
  if (!total) return 0
  /* each chosen stage: its share of the base (the contract, or the profit by the stage's share of the contract) at its rate */
  return Math.round(r.stages.reduce((s, x) => { const st = stages.find((y) => y.ref === x.ref); return st ? s + (base * (st.netMinor / total) * (x.rateBp ?? r.rateBp) * shareBp) / 1e8 : s }, 0))
}
export type CommissionSummary = {
  lines: CommissionLine[]
  earnedMinor: number; paidMinor: number; owedMinor: number
  byMember: { memberId: string; earnedMinor: number; paidMinor: number; owedMinor: number }[]
}

export function commissionsOf(o: { projects: CommissionProject[]; rules: CommissionRuleRecord[]; shares: ShareRecord[]; payouts: CommissionPayoutRecord[]; now: number }): CommissionSummary {
  const lines: CommissionLine[] = []
  const live = o.payouts.filter((p) => !p.reversedAt)
  for (const p of o.projects) {
    const shares = sharesOf(p.id, p.team, o.shares)
    const members = new Set([...p.team, ...live.filter((x) => x.projectId === p.id).map((x) => x.memberId)])
    for (const memberId of members) {
      const shareBp = shares.get(memberId) ?? 0
      const entries: CommissionLine['entries'] = []
      let fixedDone = false
      for (const pay of [...p.payments].sort((a, b) => a.paidOn - b.paidOn)) {
        const r = ruleFor(o.rules, memberId, p.id, pay.paidOn)
        if (!r || r.basis === 'none' || !shareBp) continue
        /* (parity map, FB-043) a rule on chosen stages pays only on them, each at its own rate or the rule's */
        const rate = stageRate(r, pay.stageRef)
        if (rate === null) continue
        let amount = 0
        if (r.basis === 'payments') amount = (pay.netMinor * rate * shareBp) / 1e8
        else if (r.basis === 'profit') amount = p.contractNetMinor > 0 ? (Math.max(0, p.profitNetMinor) * rate * (pay.netMinor / p.contractNetMinor) * shareBp) / 1e8 : 0
        else if (r.basis === 'fixed' && !fixedDone) { amount = (r.fixedMinor * shareBp) / 10_000; fixedDone = true }
        if (amount) entries.push({ paymentId: pay.id, paidOn: pay.paidOn, amountMinor: Math.round(amount) })
      }
      const earnedMinor = entries.reduce((s, e) => s + e.amountMinor, 0)
      const paidMinor = live.filter((x) => x.projectId === p.id && x.memberId === memberId).reduce((s, x) => s + x.amountMinor, 0)
      const rule = ruleFor(o.rules, memberId, p.id, o.now)
      const usesProfit = entries.length > 0 && p.payments.some((pay) => ruleFor(o.rules, memberId, p.id, pay.paidOn)?.basis === 'profit')
      if (!earnedMinor && !paidMinor && !p.team.includes(memberId)) continue
      lines.push({
        memberId, projectId: p.id, shareBp, rule, scope: rule ? scopeOf(rule) : null, words: ruleWords(rule),
        earnedMinor, paidMinor, owedMinor: Math.max(0, earnedMinor - paidMinor), aheadMinor: Math.max(0, paidMinor - earnedMinor),
        estimate: usesProfit && p.stage !== 'completed', entries,
        expectedMinor: expectedOf(rule, p, shareBp),
      })
    }
  }
  const sum = (k: 'earnedMinor' | 'paidMinor' | 'owedMinor') => lines.reduce((s, l) => s + l[k], 0)
  const ids = [...new Set(lines.map((l) => l.memberId))]
  return {
    lines, earnedMinor: sum('earnedMinor'), paidMinor: sum('paidMinor'), owedMinor: sum('owedMinor'),
    byMember: ids.map((memberId) => {
      const mine = lines.filter((l) => l.memberId === memberId)
      return { memberId, earnedMinor: mine.reduce((s, l) => s + l.earnedMinor, 0), paidMinor: mine.reduce((s, l) => s + l.paidMinor, 0), owedMinor: mine.reduce((s, l) => s + l.owedMinor, 0) }
    }),
  }
}

/* ── Paying a member (simplify S-12, his "build everything" 2026-10-09) ────────────────────────────────────────────────────────────── */

/** A member's lines with something owed, oldest first — the line whose first earning came first (its project's first payment under a rule),
    then by project. *Pay {member}* pays in this order. */
export function owedOldestFirst<L extends Pick<CommissionLine, 'memberId' | 'projectId' | 'owedMinor' | 'entries'>>(lines: L[], memberId: string): L[] {
  const firstOf = (l: L) => (l.entries.length ? Math.min(...l.entries.map((e) => e.paidOn)) : Number.MAX_SAFE_INTEGER)
  return lines.filter((l) => l.memberId === memberId && l.owedMinor > 0).sort((a, b) => firstOf(a) - firstOf(b) || a.projectId.localeCompare(b.projectId))
}
/** What an amount pays on each of those lines, oldest first — never more than a line is owed; one payment per project. */
export function splitOldestFirst<L extends Pick<CommissionLine, 'projectId' | 'owedMinor'>>(lines: L[], amountMinor: number): { line: L; amountMinor: number }[] {
  let left = Math.max(0, Math.round(amountMinor))
  const out: { line: L; amountMinor: number }[] = []
  for (const l of lines) {
    if (left <= 0) break
    const take = Math.min(left, l.owedMinor)
    if (take > 0) out.push({ line: l, amountMinor: take })
    left -= take
  }
  return out
}

/** Before GST: an amount that includes it, at a rate in percent. */
export const netOf = (minor: number, gstRate: number) => (gstRate ? Math.round((minor * 100) / (100 + gstRate)) : minor)

/* ── Who may do what (F2-Q4 · Q6 · Q7 · Q8) ─────────────────────────────────────────────────────────────────────────────────────── */
export const COMMISSION_RULE_RULE = 'Only an Owner or an Admin sets commission rules and shares'
export const COMMISSION_PAY_RULE = 'Only an Owner, an Admin or Accounting pays commission'   // (parity map, FB-114 — a deliberate change of this rule)
export const COMMISSION_ASK_RULE = 'You ask for a different rate only on a project you work on'
export const COMMISSION_ANSWER_RULE = 'Only an Owner or an Admin answers a commission ask'
export const COMMISSION_SEE_RULE = 'You see your own commission — Owners, Admins and Accounting see everyone’s'
/** The most a rate may be (bp): 50%. */
export const MAX_RATE_BP = 5_000
export function validRule(r: { basis: CommissionBasis; rateBp: number; fixedMinor: number }): string | null {
  if (r.basis === 'payments' || r.basis === 'profit') return r.rateBp > 0 && r.rateBp <= MAX_RATE_BP ? null : 'Enter a rate between 0.01% and 50%'
  if (r.basis === 'fixed') return r.fixedMinor > 0 ? null : 'Enter the amount'
  return null
}
