/**
 * (gaps build F2 — the books, F2-Q2 · Q3) A project's profit and what its numbers say — pure and client-safe. ONE profit, not 1.0's five
 * (G-484): **contract value − committed costs**, the contract from `moneyOf` (lib/projects/money.ts), the costs from `costsOf`
 * (lib/finance/costs.ts) — both include GST, as the contract value does (1.0 G-464). Nothing here recomputes either.
 *
 * - **Margin** = profit ÷ contract, one decimal. **Healthy ≥ 20% · Tight 10–20% · At risk < 10%** (a loss is At risk) — 1.0's tiers (G-476).
 * - No contract → no profit ("Needs a contract value"); no committed cost → "No costs yet" (never a 100% margin, G-48's "Awaiting cost data");
 *   costs under 10% of the contract → the amount without a tier, *Early estimate* (G-48 · G-82).
 * - **Cash so far** = collected − paid out (1.0 G-51); below zero the studio is funding the project.
 *
 * The insights (F2-Q3, Q-30: no metered press, no AI): rules over the same numbers, worst first — 1.0's margin alerts (G-86) judged against the
 * contract, never against "billed so far" (G-91), with real figures only (G-107's canned sample is not carried).
 */
import { money2 } from '@/lib/quotes/math'
import type { MoneySummary } from '@/lib/projects/money'
import type { CostSummary } from './costs'

export type ProfitTier = 'healthy' | 'tight' | 'at_risk'
export const TIER_LABEL: Record<ProfitTier, string> = { healthy: 'Healthy', tight: 'Tight', at_risk: 'At risk' }
export const TIER_TONE: Record<ProfitTier, 'green' | 'yellow' | 'red'> = { healthy: 'green', tight: 'yellow', at_risk: 'red' }
export const TIER_GRADE: Record<ProfitTier, 'good' | 'warn' | 'bad'> = { healthy: 'good', tight: 'warn', at_risk: 'bad' }
export const HEALTHY_PCT = 20
export const TIGHT_PCT = 10
/** Committed costs under this share of the contract → an early estimate (1.0's 10%). */
export const EARLY_PCT = 10

export type ProfitState = 'no_contract' | 'no_costs' | 'early' | 'graded'
export type ProfitView = {
  state: ProfitState
  contractMinor: number
  committedMinor: number
  /** contract − committed (0 with no contract). */
  profitMinor: number
  /** profit ÷ contract × 100, one decimal (0 with no contract). */
  marginPct: number
  /** Graded only once the costs are more than an early estimate. */
  tier: ProfitTier | null
  /** collected − paid out (to vendors, members' claims and the studio's own expenses). */
  cashMinor: number
  collectedMinor: number
  paidMinor: number
}

export const tierOf = (pct: number): ProfitTier => (pct >= HEALTHY_PCT ? 'healthy' : pct >= TIGHT_PCT ? 'tight' : 'at_risk')
const pct1 = (n: number) => Math.round(n * 10) / 10

export function profitOf(m: Pick<MoneySummary, 'contractMinor' | 'collectedMinor'>, c: Pick<CostSummary, 'committedMinor' | 'paidMinor'>): ProfitView {
  const contractMinor = m.contractMinor
  const committedMinor = c.committedMinor
  const cash = { cashMinor: m.collectedMinor - c.paidMinor, collectedMinor: m.collectedMinor, paidMinor: c.paidMinor }
  if (!contractMinor) return { state: 'no_contract', contractMinor, committedMinor, profitMinor: 0, marginPct: 0, tier: null, ...cash }
  const profitMinor = contractMinor - committedMinor
  const marginPct = pct1((profitMinor / contractMinor) * 100)
  if (!committedMinor) return { state: 'no_costs', contractMinor, committedMinor, profitMinor, marginPct, tier: null, ...cash }
  if (committedMinor < (contractMinor * EARLY_PCT) / 100) return { state: 'early', contractMinor, committedMinor, profitMinor, marginPct, tier: null, ...cash }
  return { state: 'graded', contractMinor, committedMinor, profitMinor, marginPct, tier: tierOf(marginPct), ...cash }
}

/** (pending modules S41b-1 — 1.0's "overview averageMarginPercent → null") A profit as it is sent to a member who doesn't see profit and margin:
    the cash (collected · paid out) stays — it is money in and out, theirs to see — and the profit, its margin and its tier never leave the
    server: it reads as one with nothing to grade ("--" wherever something would print it; the screens leave it out). */
export const withoutProfit = (p: ProfitView): ProfitView => ({ ...p, state: 'no_contract', profitMinor: 0, marginPct: 0, tier: null })

/** The margin as words: "23.4%". */
export const marginWords = (p: Pick<ProfitView, 'marginPct'>) => `${Number.isInteger(p.marginPct) ? p.marginPct : p.marginPct.toFixed(1)}%`
/** The tile's line under the profit (F2-Q2). */
export function profitHelp(p: ProfitView): string {
  if (p.state === 'no_contract') return 'Needs a contract value'
  if (p.state === 'no_costs') return 'No costs yet — it firms up as POs, bills and expenses come in'
  if (p.state === 'early') return `Shown once costs pass a tenth of the contract — ${money2(p.committedMinor)} of costs so far`   // (simplify S-09) the figure waits too
  return `${marginWords(p)} of the contract · ${TIER_LABEL[p.tier!]}`
}
/* ── Profit shown (simplify S-09 · Q-08, the build's contract E) ─────────────────────────────────────────────────────────────────── */

/**
 * (simplify S-09 · Q-08) Whether a profit figure means something yet: **'none'** — no costs logged (or no contract), **'early'** — costs under a
 * tenth of the contract (today's Margin early-estimate rule, extended to the figure itself), **'graded'** — the figure and its tier stand. Until
 * it is graded every surface prints "--" with its word beside it, never the contract (Marcus's "Profit S$48,600.00") nor a near-contract figure
 * that reads as real. The Money tab's Profit tile, the Overview's Money card (K-N) and Company › Reports (K-R) read this one rule.
 */
export type ProfitGrade = 'none' | 'early' | 'graded'
export function profitGrade(p: Pick<ProfitView, 'state'>): ProfitGrade {
  return p.state === 'graded' ? 'graded' : p.state === 'early' ? 'early' : 'none'
}
/** The house words beside a "--" (invented copy, simplify Q-12): *No costs yet* · *Early estimate* — and *Needs a contract value* with none. */
export const PROFIT_NO_COSTS = 'No costs yet'
export const PROFIT_EARLY = 'Early estimate'
/** One profit as a surface prints it: the figure ("--" until graded), the word that rides beside it (the tier once graded, else why it is
    "--"), its tone for a chip, and the grade a number tile colours it with (graded only). */
export function profitShown(p: ProfitView): { value: string; word: string; tone: 'green' | 'yellow' | 'red' | 'default'; grade: 'good' | 'warn' | 'bad' | undefined; graded: ProfitGrade } {
  const g = profitGrade(p)
  if (g === 'graded') return { value: money2(p.profitMinor), word: TIER_LABEL[p.tier!], tone: TIER_TONE[p.tier!], grade: TIER_GRADE[p.tier!], graded: g }
  return { value: '--', word: g === 'early' ? PROFIT_EARLY : p.state === 'no_contract' ? 'Needs a contract value' : PROFIT_NO_COSTS, tone: 'default', grade: undefined, graded: g }
}

/** What the Projects listing and the Profitability report print in the margin's place (one-home N-01: Finance's Pipeline is gone): "23.4% · Healthy", "Early estimate", "--". */
export function marginCell(p: ProfitView): { text: string; tone: 'green' | 'yellow' | 'red' | 'default' } {
  if (p.state === 'no_contract') return { text: '--', tone: 'default' }
  if (p.state === 'no_costs') return { text: 'No costs yet', tone: 'default' }
  if (p.state === 'early') return { text: 'Early estimate', tone: 'default' }
  return { text: `${marginWords(p)} · ${TIER_LABEL[p.tier!]}`, tone: TIER_TONE[p.tier!] }
}

/* ── What the numbers say (F2-Q3) ───────────────────────────────────────────────────────────────────────────────────────────────── */

export type InsightTone = 'danger' | 'warning' | 'info'
export type Insight = {
  key: string
  tone: InsightTone
  title: string
  message: string
  /** Where it opens — a Money section, a PO, an invoice (`?open=`). */
  action: { label: string; href: string } | null
}
const TONE_ORDER: Record<InsightTone, number> = { danger: 0, warning: 1, info: 2 }
const DAY = 86_400_000
export const READY_LONG_DAYS = 7

export type InsightInput = {
  projectId: string
  stage: string
  money: Pick<MoneySummary, 'contractMinor' | 'collectedMinor' | 'baseMinor' | 'variationsMinor' | 'overdueMinor' | 'invoices' | 'stages'>
  costs: Pick<CostSummary, 'committedMinor' | 'paidMinor' | 'pos' | 'bills' | 'overdueMinor'>
  profit: ProfitView
  vendorName: (id: string) => string
  now: number
}

/**
 * Each rule over the real records; worst first. `money` = the project's Money tab (`?open=` lands on a row there). A completed project only
 * reports (no "send it" asks).
 */
export function insightsOf(i: InsightInput): Insight[] {
  const out: Insight[] = []
  const base = `/projects/${i.projectId}/money`
  const p = i.profit
  const done = i.stage === 'completed'
  /* costs above the contract — a loss */
  if (p.contractMinor && p.committedMinor > p.contractMinor) {
    out.push({ key: 'loss', tone: 'danger', title: `Costs are ${money2(p.committedMinor - p.contractMinor)} above the contract`,
      message: `${money2(p.committedMinor)} committed against the ${money2(p.contractMinor)} contract — raise a variation order for the extra work, or trim what is still to buy.`, action: { label: 'Open the costs', href: `${base}#costs` } })
  } else if (p.state === 'graded' && p.tier === 'at_risk') {
    out.push({ key: 'at_risk', tone: 'danger', title: `Margin is ${marginWords(p)} — at risk`,
      message: `Profit is ${money2(p.profitMinor)} on the ${money2(p.contractMinor)} contract, under the ${TIGHT_PCT}% a job needs to carry the studio.`, action: { label: 'Open the costs', href: `${base}#costs` } })
  } else if (p.state === 'graded' && p.tier === 'tight') {
    out.push({ key: 'tight', tone: 'warning', title: `Margin is ${marginWords(p)} — tight`,
      message: `Profit is ${money2(p.profitMinor)}; under ${HEALTHY_PCT}%, one more surprise cost puts it at risk.`, action: { label: 'Open the costs', href: `${base}#costs` } })
  }
  /* a PO costing more than the client pays for its lines (F1's "against the quote") */
  for (const po of i.costs.pos) {
    if (!po.againstQuote || po.againstQuote.leftMinor >= 0) continue
    if (po.state === 'cancelled' || po.state === 'declined') continue
    out.push({ key: `po-over-${po.id}`, tone: 'danger', title: `${po.number} costs more than the client pays`,
      message: `${i.vendorName(po.vendorId)}’s ${money2(po.againstQuote.poMinor)} for these lines is ${money2(-po.againstQuote.leftMinor)} over the ${money2(po.againstQuote.clientMinor)} the quote charges for them.`,
      action: { label: `Open ${po.number}`, href: `${base}?open=${encodeURIComponent(po.id)}` } })
  }
  /* paid out more than collected — the studio funds the job */
  if (p.cashMinor < 0) {
    out.push({ key: 'funded', tone: 'warning', title: 'The studio is funding this project',
      message: `${money2(-p.cashMinor)} more is paid out than collected — collect what is owed before paying further vendors.`, action: { label: 'Open Money', href: base } })
  }
  /* overdue invoices */
  const overdue = i.money.invoices.filter((v) => v.overdueMinor > 0)
  if (overdue.length) {
    const oldest = Math.min(...overdue.map((v) => v.dueAt ?? i.now))
    const days = Math.max(1, Math.floor((i.now - oldest) / DAY))
    out.push({ key: 'overdue', tone: 'warning', title: `${overdue.length === 1 ? `${overdue[0]!.number ?? 'An invoice'} is` : `${overdue.length} invoices are`} overdue`,
      message: `${money2(i.money.overdueMinor)} past its due day — the oldest by ${days} day${days === 1 ? '' : 's'}.`, action: { label: 'Open Money', href: overdue.length === 1 ? `${base}?open=${encodeURIComponent(overdue[0]!.id)}` : base } })
  }
  /* bills overdue */
  if (i.costs.overdueMinor > 0) {
    out.push({ key: 'bills-overdue', tone: 'warning', title: 'A vendor is waiting to be paid', message: `${money2(i.costs.overdueMinor)} of bills and POs is past its due day.`, action: { label: 'Open the costs', href: `${base}#costs` } })
  }
  /* variation orders adding more than 10% of the base */
  if (i.money.baseMinor && i.money.variationsMinor > i.money.baseMinor * 0.1) {
    const pct = Math.round((i.money.variationsMinor / i.money.baseMinor) * 1000) / 10
    out.push({ key: 'vos', tone: 'info', title: `Variation orders add ${pct}% to the contract`,
      message: `${money2(i.money.variationsMinor)} on the ${money2(i.money.baseMinor)} signed — worth a word with the client about the scope.`, action: { label: 'Open Money', href: base } })
  }
  /* an invoice ready for over a week */
  if (!done) {
    for (const v of i.money.invoices) {
      if (v.state !== 'ready' || !v.readySince || v.amountMinor <= 0) continue
      const days = Math.floor((i.now - v.readySince) / DAY)
      if (days < READY_LONG_DAYS) continue
      out.push({ key: `ready-${v.id}`, tone: 'info', title: `The ${v.stageName} invoice has been ready for ${days} days`, message: `${money2(v.amountMinor)} is waiting to be sent.`, action: { label: 'Open it', href: `${base}?open=${encodeURIComponent(v.id)}` } })
    }
  }
  /* signed, no cost logged */
  if (p.state === 'no_costs' && !done) {
    out.push({ key: 'no-costs', tone: 'info', title: 'No costs logged yet', message: 'Profit firms up once the purchase orders, supplier bills and expenses are in.', action: { label: 'Open the costs', href: `${base}#costs` } })
  }
  return out.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
}
export const INSIGHTS_SHOWN = 5
export const NOTHING_STANDS_OUT = 'Nothing stands out — the numbers look healthy.'

/* ── The closing numbers (parity map, PR-122 · PR-123) ─────────────────────────────────────────────────────────────────────────────── */
/* The arithmetic of lib/finance/closing-numbers.ts (which reads the records and hands them in) — pure. One margin: the Money tab's (`profitOf`),
   shown only once `profitGrade` grades it. */

/** 1.0's rule (D-306): a margin more than 25 points off the expected raises the strip. */
export const MARGIN_GAP_PTS = 25

export type ClosingNumbers = {
  /** Committed costs, with GST — the Money tab's Costs figure. */
  costsMinor: number
  /** Contract value less committed costs, ÷ contract value, one decimal — `null` until `profitGrade` grades it ("--" + `word`). */
  marginPct: number | null
  /** What the signed quote (and the approved variation orders) planned, before GST — `null` with no system quote or no costs on its lines. */
  expectedMarginPct: number | null
  /** `profitGrade`'s: graded · early · none. */
  grade: ProfitGrade
  /** The word beside the margin: the tier once graded ("Healthy"), else why it is "--" ("No costs yet", "Early estimate"). */
  word: string
  /** margin − expected, in points, one decimal — `null` when either is. */
  gapPts: number | null
  /** The strip's sentence when the gap is more than 25 points (invented copy) — "Margin 12% — 31 points under the expected 43%"; else null. */
  warning: string | null
}

const pctText = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`

export function closingNumbersOf(profit: ProfitView, plan: { netMinor: number; costMinor: number }[]): ClosingNumbers {
  const grade = profitGrade(profit)
  const marginPct = grade === 'graded' ? profit.marginPct : null
  const net = plan.reduce((s, x) => s + x.netMinor, 0)
  const cost = plan.reduce((s, x) => s + x.costMinor, 0)
  const expectedMarginPct = net > 0 && cost > 0 ? pct1(((net - cost) / net) * 100) : null
  const gapPts = marginPct !== null && expectedMarginPct !== null ? pct1(marginPct - expectedMarginPct) : null
  const warning = gapPts !== null && Math.abs(gapPts) > MARGIN_GAP_PTS && marginPct !== null && expectedMarginPct !== null
    ? `Margin ${pctText(marginPct)} — ${pctText(Math.abs(gapPts)).replace('%', '')} points ${gapPts < 0 ? 'under' : 'over'} the expected ${pctText(expectedMarginPct)}`
    : null
  return { costsMinor: profit.committedMinor, marginPct, expectedMarginPct, grade, word: profitShown(profit).word, gapPts, warning }
}
