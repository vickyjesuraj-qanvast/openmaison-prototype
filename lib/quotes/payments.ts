import type { QuotePayment } from '@/lib/db/schema'
import { DEFAULT_MILESTONES } from '@/lib/leads/stage-data'
import { displayDate } from '@/lib/format'
import { countedLines, flattenItems, lineTotalMinor, type Line } from './math'

/**
 * Payment Schedule maths (1238:29290, REG-418) — client-safe. A schedule is rows of { name, description, pct, due }; every
 * amount is the quote's total × pct (REG-403: the mock's S$10,000 rows are placeholders). The splits the studio offers are
 * **payment templates** (REG-538 — Company › Templates › Payments): the four presets are seeded as templates with their old
 * keys as ids, so a stored `paymentPreset` still resolves; "Custom" is whatever the studio edits a schedule into. Due dates are
 * either the deposit's "On Approval", an ESTIMATE derived from the lead's start date and the property's renovation length
 * ("~ 21 Oct ’26"), or a date the studio picked.
 */
export const DUE_KINDS = ['approval', 'estimate', 'fixed'] as const
export type DueKind = (typeof DUE_KINDS)[number]
export const isDueKind = (s: string): s is DueKind => (DUE_KINDS as readonly string[]).includes(s)

export type PaymentRow = { name: string; description: string | null; pct: number; dueKind: DueKind; dueAt: Date | null
  /** (parity map, MI-021 — 1.0's fee first) the FIRST row as a fixed fee ("Design fees S$3,000") instead of a share: the others share what it
      leaves. Only while Settings › Finance › Invoices › *May open with a fixed fee* is on; null = the % row it always was. */
  fixedMinor?: number | null
  /** (S44O — UAT row 297) the fixed fee's own word (S44T's `fixed_label`), carried wherever its amount goes */
  fixedLabel?: string | null }
/** One milestone of a split as a template stores it. */
export type SplitRow = { name: string; description: string | null; pct: number }
/** A payment template as every surface reads it (the DB row parsed, or a seeded preset). */
export type PaymentSplit = { id: string; name: string; rows: SplitRow[]; isPreset: boolean; /** (REG-664) its folder in Templates › Payments */ folderId?: string | null }
type PresetRow = { name: string; description: string; pct: number }
export type Preset = { key: string; label: string; rows: PresetRow[] }

/** The seeded presets (the Won wizard's own split first, lib/leads/stage-data.ts) — repair R35 writes them as payment templates. */
export const PRESETS: Preset[] = [
  { key: 'default', label: 'Default: 10/30/30/30', rows: DEFAULT_MILESTONES.map((m) => ({ name: m.name, description: m.meta, pct: m.pct })) },
  { key: '20-40-40', label: '20/40/40', rows: [{ name: 'Deposit', description: 'Upon signing', pct: 20 }, { name: 'Commencement', description: 'Works commence', pct: 40 }, { name: 'Completion', description: 'Handover', pct: 40 }] },
  { key: '30-70', label: '30/70', rows: [{ name: 'Deposit', description: 'Upon signing', pct: 30 }, { name: 'Completion', description: 'Handover', pct: 70 }] },
  { key: '50-50', label: '50/50', rows: [{ name: 'Deposit', description: 'Upon signing', pct: 50 }, { name: 'Completion', description: 'Handover', pct: 50 }] },
]
export const PRESET_SPLITS: PaymentSplit[] = PRESETS.map((p) => ({ id: p.key, name: p.label, rows: p.rows.map((r) => ({ ...r })), isPreset: true }))
export const DEFAULT_SPLIT_ID = 'default'
export const CUSTOM_LABEL = 'Custom'

/** `rows_json` → rows (bad JSON = no rows). */
export function parseSplitRows(json: string | null | undefined): SplitRow[] {
  if (!json) return []
  try {
    const raw = JSON.parse(json) as unknown
    if (!Array.isArray(raw)) return []
    return raw.map((r) => { const x = (r ?? {}) as Partial<SplitRow>; return { name: typeof x.name === 'string' ? x.name : 'Payment', description: typeof x.description === 'string' ? x.description : null, pct: typeof x.pct === 'number' && Number.isFinite(x.pct) ? x.pct : 0 } })
  } catch { return [] }
}
/* ── (parity map, MI-021) A fixed fee first ───────────────────────────────────────────────────────────────────────────────────── */

type Shareable = Pick<PaymentRow, 'pct'> & { fixedMinor?: number | null }
/** Whether this row is the schedule's fixed fee — only the first row ever is. */
export const isFixedRow = (r: { fixedMinor?: number | null }, i: number) => i === 0 && typeof r.fixedMinor === 'number' && r.fixedMinor > 0
/** The fixed fee the schedule opens with (0 = none). */
export const fixedFeeOf = (rows: readonly { fixedMinor?: number | null }[]) => (rows[0] && isFixedRow(rows[0], 0) ? rows[0].fixedMinor! : 0)
/** (invented copy) The rule's words, as the server refuses it. */
export const FEE_FIRST_RULE = 'A fixed first payment is off — an Owner or an Admin switches it on in Settings › Finance › Invoices'
export const FEE_FIRST_ONLY = 'Only the first payment may be a fixed fee'
export const FEE_FIRST_ALONE = 'Add another payment first — the fixed fee leaves the rest to share'
export const FEE_FIRST_STAYS = 'The fixed fee stays the first payment — make it a share to move it'
const round2 = (n: number) => Math.round(n * 100) / 100
/** Shares scaled to add up to `to`, in proportion, to the cent of a percent — the last absorbing the rounding (all equal when none had a share). */
function rescale(pcts: number[], to: number): number[] {
  if (!pcts.length) return []
  const sum = pcts.reduce((s, p) => s + clampPct(p), 0)
  const out = pcts.map((p) => round2(sum > 0 ? (clampPct(p) / sum) * to : to / pcts.length))
  out[out.length - 1] = round2(to - out.slice(0, -1).reduce((s, p) => s + p, 0))
  return out
}
/** The first payment made a fixed fee of what it bills now; the others' shares made 100% of what it leaves, in proportion — nothing moves. */
export function asFixedFirst<T extends PaymentRow>(rows: T[], totalMinor: number): T[] {
  if (rows.length < 2 || totalMinor <= 0) return rows
  const fee = Math.max(100, paymentAmounts(rows, totalMinor)[0] ?? 0)
  const shares = rescale(rows.slice(1).map((r) => r.pct), 100)
  return [{ ...rows[0]!, pct: 0, fixedMinor: fee }, ...rows.slice(1).map((r, i) => ({ ...r, pct: shares[i]!, fixedMinor: null }))]
}
/** Back to shares: the first payment's share is what its fee is of the total; the others share what is left, in proportion. */
export function asSharesFirst<T extends PaymentRow>(rows: T[], totalMinor: number): T[] {
  if (!rows.length) return rows
  const fee = fixedFeeOf(rows)
  const first = totalMinor > 0 ? Math.min(100, round2((fee / totalMinor) * 100)) : 0
  const shares = rescale(rows.slice(1).map((r) => r.pct), round2(100 - first))
  return [{ ...rows[0]!, pct: first, fixedMinor: null }, ...rows.slice(1).map((r, i) => ({ ...r, pct: shares[i]!, fixedMinor: null }))]
}
const feeWord = (minor: number) => `S$${Math.round(minor / 100).toLocaleString('en-SG')}`

/** "10/30/30/30" — the split as a label; (MI-021) a fixed fee first reads "S$3,000/30/30/40". */
export const splitWord = (rows: (Pick<SplitRow, 'pct'> & { fixedMinor?: number | null })[]) => rows.map((r, i) => (isFixedRow(r, i) ? feeWord(r.fixedMinor!) : Number.isInteger(r.pct) ? String(r.pct) : r.pct.toFixed(1))).join('/')

/** Which template the rows ARE (names and shares in order), or 'custom' once the studio has changed anything that matters. */
export function presetOf(rows: (Pick<PaymentRow, 'name' | 'pct'> & { fixedMinor?: number | null })[], splits: PaymentSplit[] = PRESET_SPLITS): string {
  if (fixedFeeOf(rows)) return 'custom'   // (parity map, MI-021) a template holds shares only
  for (const p of splits) {
    if (p.rows.length !== rows.length) continue
    if (p.rows.every((r, i) => r.name === rows[i]!.name && Math.abs(r.pct - rows[i]!.pct) < 0.005)) return p.id
  }
  return 'custom'
}
export const presetLabel = (key: string | null | undefined, splits: PaymentSplit[] = PRESET_SPLITS) => splits.find((p) => p.id === key)?.name ?? CUSTOM_LABEL
export const findSplit = (key: string | null | undefined, splits: PaymentSplit[] = PRESET_SPLITS): PaymentSplit | null => splits.find((p) => p.id === key) ?? null

/** Amounts in cents: total × pct each; when the shares add up to exactly 100 % the last row absorbs the rounding, so the amounts sum to the total.
    (parity map, MI-021) A fixed fee first bills its amount and the shares split what it leaves — the project's stages read the same rule
    (lib/projects/money.ts `moneyOf`), so the quote, its print and the invoices agree. */
export function paymentAmounts(rows: Shareable[], totalMinor: number): number[] {
  const fee = fixedFeeOf(rows)
  const rest = Math.max(0, totalMinor - fee)
  const out = rows.map((r, i) => (isFixedRow(r, i) ? fee : Math.round(rest * clampPct(r.pct) / 100)))
  const pctTotal = sumPct(rows)
  const last = rows.length - 1
  if (rows.length && !isFixedRow(rows[last]!, last) && Math.abs(pctTotal - 100) < 0.005) { const sum = out.reduce((s, a) => s + a, 0); out[last]! += Math.max(totalMinor, fee) - sum }
  return out
}
const clampPct = (p: number) => (Number.isFinite(p) ? Math.max(0, p) : 0)
/** The shares' sum — a fixed fee first is not a share. */
export const sumPct = (rows: Shareable[]) => Number(rows.reduce((s, r, i) => s + (isFixedRow(r, i) ? 0 : clampPct(r.pct)), 0).toFixed(2))

/** The Total row and the over-balance state (1271:38624): shares past 100 % schedule more than the proposal is worth — (MI-021) as does a
    fixed fee above the quote's total. */
export function scheduleBalance(rows: Shareable[], totalMinor: number): { pctTotal: number; amountTotal: number; over: boolean; overMinor: number } {
  const pctTotal = sumPct(rows)
  const amountTotal = paymentAmounts(rows, totalMinor).reduce((s, a) => s + a, 0)
  const over = pctTotal > 100.005 || (totalMinor > 0 && fixedFeeOf(rows) > totalMinor)
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

/** A split as schedule rows: the deposit is On Approval, every other row an estimate on the anchors. */
export function splitRows(split: PaymentSplit, a: ScheduleAnchors): PaymentRow[] {
  return withEstimates(split.rows.map((r, i) => ({ name: r.name, description: r.description, pct: r.pct, dueKind: i === 0 ? 'approval' as const : 'estimate' as const, dueAt: null })), a)
}
/** A template by id as schedule rows; an unknown id (a deleted template, the old 'custom') falls back to the studio default. */
export function presetRows(key: string | null | undefined, a: ScheduleAnchors, splits: PaymentSplit[] = PRESET_SPLITS): PaymentRow[] {
  return splitRows(findSplit(key, splits) ?? findSplit(DEFAULT_SPLIT_ID, splits) ?? PRESET_SPLITS[0]!, a)
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
 * Kept for the Maison AI suggestions to come (REG-436 removed the button).
 */
export function aiSchedule(items: (Line & { position: number; section: string | null; category: string | null })[], a: ScheduleAnchors): PaymentRow[] {
  const lines = countedLines(flattenItems(items))
  const total = lines.reduce((s, l) => s + lineTotalMinor(l), 0)
  if (total <= 0) return presetRows(DEFAULT_SPLIT_ID, a)
  const groups: { key: string; minor: number }[] = []
  for (const l of lines) {
    const key = (l.section ?? l.category ?? 'Works').trim() || 'Works'
    const g = groups.find((x) => x.key.toLowerCase() === key.toLowerCase())
    if (g) g.minor += lineTotalMinor(l); else groups.push({ key, minor: lineTotalMinor(l) })
  }
  const middle = 80
  let pcts = groups.map((g) => Math.round((g.minor / total) * middle))
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

/** The DUE cell (spec 06): "On signing" (was "On Approval") · "~ 21 Oct ’26" for an estimate · "21 Oct ’26" for a date the studio set. */
export function dueLabel(row: { dueKind: string; dueAt: Date | null }): string {
  if (row.dueKind === 'approval') return 'On signing'   // (the calm UI build 2026-10-27, W-579) the stored kind stays 'approval'
  if (!row.dueAt) return '–'
  return `${row.dueKind === 'fixed' ? '' : '~ '}${displayDate(row.dueAt)}`
}

/** Rows as stored → rows as the section edits them (dates rehydrated for the client). */
export const toRows = (list: QuotePayment[]): PaymentRow[] => list.map((p) => ({ name: p.name, description: p.description, pct: p.pct, dueKind: isDueKind(p.dueKind) ? p.dueKind : 'estimate', dueAt: p.dueAt ? new Date(p.dueAt) : null, fixedMinor: p.fixedMinor ?? null, fixedLabel: p.fixedLabel ?? null }))   // (MI-021) the fixed fee rides an Undo — (S44O) with its word
