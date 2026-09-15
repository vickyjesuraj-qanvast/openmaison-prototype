import type { QuotePayment } from '@/lib/db/schema'
import { DEFAULT_MILESTONES } from '@/lib/leads/stage-data'
import { displayDate } from '@/lib/format'
import { countedLines, flattenItems, lineTotalMinor, type Line } from './math'

/**
 * Payment Schedule maths (1238:29290, REG-418) — client-safe. A schedule is rows of { name, description, pct, due }; every
 * amount is the quote's total × pct (REG-403: the mock's S$10,000 rows are placeholders). Presets are the studio's usual
 * splits (owner 2026-09-11: "10/30/30/30 + a few options"); Custom is whatever the studio edits them into. Due dates are
 * either the deposit's "On Approval", an ESTIMATE derived from the lead's start date and the property's renovation length
 * ("~ 21 Oct ’26"), or a date the studio picked.
 */
export const DUE_KINDS = ['approval', 'estimate', 'fixed'] as const
export type DueKind = (typeof DUE_KINDS)[number]
export const isDueKind = (s: string): s is DueKind => (DUE_KINDS as readonly string[]).includes(s)

export type PaymentRow = { name: string; description: string | null; pct: number; dueKind: DueKind; dueAt: Date | null }
type PresetRow = { name: string; description: string; pct: number }
export type Preset = { key: string; label: string; rows: PresetRow[] }

/** The presets behind the toolbar's "Default: 10/30/30/30 ▾" (the Won wizard's own split first, lib/leads/stage-data.ts). */
export const PRESETS: Preset[] = [
  { key: 'default', label: 'Default: 10/30/30/30', rows: DEFAULT_MILESTONES.map((m) => ({ name: m.name, description: m.meta, pct: m.pct })) },
  { key: '20-40-40', label: '20/40/40', rows: [{ name: 'Deposit', description: 'Upon signing', pct: 20 }, { name: 'Commencement', description: 'Works commence', pct: 40 }, { name: 'Completion', description: 'Handover', pct: 40 }] },
  { key: '30-70', label: '30/70', rows: [{ name: 'Deposit', description: 'Upon signing', pct: 30 }, { name: 'Completion', description: 'Handover', pct: 70 }] },
  { key: '50-50', label: '50/50', rows: [{ name: 'Deposit', description: 'Upon signing', pct: 50 }, { name: 'Completion', description: 'Handover', pct: 50 }] },
]
export const CUSTOM_LABEL = 'Custom'

/** Which preset the rows ARE (names and shares in order), or 'custom' once the studio has changed anything that matters. */
export function presetOf(rows: Pick<PaymentRow, 'name' | 'pct'>[]): string {
  for (const p of PRESETS) {
    if (p.rows.length !== rows.length) continue
    if (p.rows.every((r, i) => r.name === rows[i]!.name && Math.abs(r.pct - rows[i]!.pct) < 0.005)) return p.key
  }
  return 'custom'
}
export const presetLabel = (key: string) => PRESETS.find((p) => p.key === key)?.label ?? CUSTOM_LABEL

/** Amounts in cents: total × pct each; when the shares add up to exactly 100 % the last row absorbs the rounding, so the amounts sum to the total. */
export function paymentAmounts(rows: Pick<PaymentRow, 'pct'>[], totalMinor: number): number[] {
  const out = rows.map((r) => Math.round(totalMinor * clampPct(r.pct) / 100))
  const pctTotal = sumPct(rows)
  if (rows.length && Math.abs(pctTotal - 100) < 0.005) { const sum = out.reduce((s, a) => s + a, 0); out[out.length - 1]! += totalMinor - sum }
  return out
}
const clampPct = (p: number) => (Number.isFinite(p) ? Math.max(0, p) : 0)
export const sumPct = (rows: Pick<PaymentRow, 'pct'>[]) => Number(rows.reduce((s, r) => s + clampPct(r.pct), 0).toFixed(2))

/** The Total row and the over-balance state (1271:38624): shares past 100 % schedule more than the proposal is worth. */
export function scheduleBalance(rows: Pick<PaymentRow, 'pct'>[], totalMinor: number): { pctTotal: number; amountTotal: number; over: boolean; overMinor: number } {
  const pctTotal = sumPct(rows)
  const amountTotal = paymentAmounts(rows, totalMinor).reduce((s, a) => s + a, 0)
  const over = pctTotal > 100.005
  return { pctTotal, amountTotal, over, overMinor: over ? Math.max(0, amountTotal - totalMinor) : 0 }
}

/** Renovation length by property type (weeks) — how long a whole-home job of that size runs on site in Singapore (REG-418, derived rule). */
export const RENOVATION_WEEKS: Record<string, number> = { 'HDB 3-Room': 8, 'HDB 4-Room': 10, 'HDB 5-Room': 12, 'BTO 4-Room': 10, 'BTO 5-Room': 12, 'Executive Condo': 12, 'Condo 2-bedder': 10, 'Condo 3-bedder': 12, 'Landed': 20 }
export const renovationWeeks = (propertyType: string | null | undefined) => (propertyType && RENOVATION_WEEKS[propertyType]) || 12

export type ScheduleAnchors = { start: Date; weeks: number }
const WEEK_MS = 7 * 86_400_000
/** Where the estimates hang from: works start on the lead's estimated start date, else three weeks after the quote was written. */
export function scheduleAnchors(opts: { estimatedStart: Date | null; quoteCreated: Date; propertyType: string | null }): ScheduleAnchors {
  const start = opts.estimatedStart ?? new Date(opts.quoteCreated.getTime() + 3 * WEEK_MS)
  return { start: new Date(start.getFullYear(), start.getMonth(), start.getDate()), weeks: renovationWeeks(opts.propertyType) }
}

/**
 * Estimated due dates: the rows of kind `estimate` are spread across the renovation — the first at the start of works, the last at
 * handover, the rest evenly between. Fixed dates and the deposit's "On Approval" are left alone.
 */
export function withEstimates<T extends { dueKind: DueKind; dueAt: Date | null }>(rows: T[], a: ScheduleAnchors): T[] {
  const idx = rows.map((r, i) => (r.dueKind === 'estimate' ? i : -1)).filter((i) => i >= 0)
  const n = idx.length
  return rows.map((r, i) => {
    const k = idx.indexOf(i)
    if (k < 0) return r
    const t = n === 1 ? 1 : k / (n - 1)
    return { ...r, dueAt: new Date(a.start.getTime() + Math.round(a.weeks * t * 7) * 86_400_000) }
  })
}

/** A preset as schedule rows: the deposit is On Approval, every other row an estimate on the anchors. */
export function presetRows(key: string, a: ScheduleAnchors): PaymentRow[] {
  const p = PRESETS.find((x) => x.key === key) ?? PRESETS[0]!
  return withEstimates(p.rows.map((r, i) => ({ name: r.name, description: r.description, pct: r.pct, dueKind: i === 0 ? 'approval' as const : 'estimate' as const, dueAt: null })), a)
}

/** A row the studio adds by hand ("Add a Payment"): nothing scheduled yet, due at handover until it is moved. */
export function blankRow(a: ScheduleAnchors): PaymentRow {
  return { name: 'New payment', description: null, pct: 0, dueKind: 'estimate', dueAt: new Date(a.start.getTime() + a.weeks * WEEK_MS) }
}

/**
 * Add Payments with AI (owner 2026-09-11: derived from the quote's own items). A deposit on approval, then one payment per
 * SECTION of works in the order the lines run down the quote (a line's section, else its category), each sized to that
 * section's share of the total, and a completion payment at handover. 10 % deposit, 10 % completion, the rest by share
 * (whole percentages; the largest section absorbs the rounding). A quote with no priced lines gets the default split.
 */
export function aiSchedule(items: (Line & { position: number; section: string | null; category: string | null })[], a: ScheduleAnchors): PaymentRow[] {
  const lines = countedLines(flattenItems(items))
  const total = lines.reduce((s, l) => s + lineTotalMinor(l), 0)
  if (total <= 0) return presetRows('default', a)
  const groups: { key: string; minor: number }[] = []
  for (const l of lines) {
    const key = (l.section ?? l.category ?? 'Works').trim() || 'Works'
    const g = groups.find((x) => x.key.toLowerCase() === key.toLowerCase())
    if (g) g.minor += lineTotalMinor(l); else groups.push({ key, minor: lineTotalMinor(l) })
  }
  const middle = 80
  let pcts = groups.map((g) => Math.round((g.minor / total) * middle))
  // whole percentages must add up to 80: the largest section takes the difference; a section rounded to 0 folds into it
  const largest = pcts.indexOf(Math.max(...pcts))
  const kept = groups.map((g, i) => ({ ...g, pct: pcts[i]! })).filter((g, i) => g.pct > 0 || i === largest)
  pcts = kept.map((g) => g.pct)
  const li = kept.findIndex((g) => g.key === groups[largest]!.key)
  pcts[li]! += middle - pcts.reduce((s, p) => s + p, 0)
  const rows: PaymentRow[] = [
    { name: 'Deposit', description: 'Upon signing', pct: 10, dueKind: 'approval', dueAt: null },
    ...kept.map((g, i) => ({ name: g.key, description: `Ahead of ${g.key.toLowerCase()}`, pct: pcts[i]!, dueKind: 'estimate' as const, dueAt: null })),
    { name: 'Completion', description: 'Handover', pct: 10, dueKind: 'estimate', dueAt: null },
  ]
  return withEstimates(rows, a)
}

/** The DUE cell (spec 06): "On Approval" · "~ 21 Oct ’26" for an estimate · "21 Oct ’26" for a date the studio set. */
export function dueLabel(row: { dueKind: string; dueAt: Date | null }): string {
  if (row.dueKind === 'approval') return 'On Approval'
  if (!row.dueAt) return '–'
  return `${row.dueKind === 'fixed' ? '' : '~ '}${displayDate(row.dueAt)}`
}

/** Rows as stored → rows as the section edits them (dates rehydrated for the client). */
export const toRows = (list: QuotePayment[]): PaymentRow[] => list.map((p) => ({ name: p.name, description: p.description, pct: p.pct, dueKind: isDueKind(p.dueKind) ? p.dueKind : 'estimate', dueAt: p.dueAt ? new Date(p.dueAt) : null }))
