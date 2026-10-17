/**
 * (REG-595) What changed between a quote's kept version and the one being worked on — Urban Home's "removed items struck through
 * in red, added items marked new" on a revised quotation. Pure, client-safe: the preview's loader feeds it the kept snapshot's
 * lines and the current ones; the renderer prints the marks; Version History reads the counts.
 */
import { lineTotalMinor, parseDiscounts, unitPriceMinor, type NamedDiscount } from './math'
import { printAsWord } from './items-model'
import { isFixedRow, paymentAmounts } from './payments'

export type Diffable = { id: string; parentId: string | null; kind: string; status: string; name: string; qty: number; costMinor: number; markupMinor: number; discountPct: number; position: number }
export type LineWas = { name: string; qty: number; unitPriceMinor: number; totalMinor: number }
export type ItemChange = 'added' | 'removed' | 'changed'
export type QuoteDiff<T extends Diffable> = { added: Set<string>; removed: T[]; changed: Map<string, LineWas>; counts: { added: number; removed: number; changed: number } }

/** Lines by id: gone since the kept version, new since it, or priced / counted / named differently. Sections are not compared. */
export function diffQuoteItems<T extends Diffable>(prev: T[], cur: Diffable[]): QuoteDiff<T> {
  const prevById = new Map(prev.map((i) => [i.id, i]))
  const curIds = new Set(cur.map((i) => i.id))
  const added = new Set(cur.filter((i) => i.kind === 'item' && !prevById.has(i.id)).map((i) => i.id))
  const removed = prev.filter((i) => i.kind === 'item' && !curIds.has(i.id) && i.status !== 'Declined')
  const changed = new Map<string, LineWas>()
  for (const i of cur) {
    const p = prevById.get(i.id)
    if (!p || i.kind !== 'item') continue
    if (p.name !== i.name || p.qty !== i.qty || unitPriceMinor(p) !== unitPriceMinor(i) || p.discountPct !== i.discountPct) changed.set(i.id, { name: p.name, qty: p.qty, unitPriceMinor: unitPriceMinor(p), totalMinor: lineTotalMinor(p) })
  }
  return { added, removed, changed, counts: { added: added.size, removed: removed.length, changed: changed.size } }
}

/**
 * The removed lines put back where they were — right after the previous sibling that still exists (else first in their section),
 * a half-step in position so the table's order keeps them there. A line whose whole section is gone is left out.
 */
export function withRemoved<T extends { id: string; parentId: string | null; position: number }, R extends Diffable>(cur: T[], removed: R[], prev: R[], make: (r: R, position: number) => T): T[] {
  const out = [...cur]
  for (const r of removed) {
    if (r.parentId && !out.some((o) => o.id === r.parentId)) continue
    const sibs = prev.filter((p) => (p.parentId ?? null) === (r.parentId ?? null)).sort((a, b) => a.position - b.position)
    const idx = sibs.findIndex((s) => s.id === r.id)
    const before = sibs.slice(0, idx).reverse().find((s) => out.some((o) => o.id === s.id))
    /* (S44F) halfway to the next row of the same section — two removed lines in a row (or one put back beside another) keep their order */
    const here = out.filter((o) => (o.parentId ?? null) === (r.parentId ?? null)).map((o) => o.position)
    const at = before ? (out.find((o) => o.id === before.id)?.position ?? 0) : null
    const next = at === null ? Math.min(0, ...here) : Math.min(at + 1, ...here.filter((p) => p > at))
    const pos = at === null ? next - 0.5 : (at + next) / 2
    out.push(make(r, pos))
  }
  return out
}

/* ── (S44F — NB-01) Every version's marks, back to version 1 ───────────────────────────────────────────────────────────────────────────────────
   Spaces Studio's and Urban Home's revisions (1.0 `deployment/qanvast` ef8a65d8e…9aef06e96, `urbanhomedemo` 4da810229): a revised quote can show
   what every version changed — a line added in version 2 still says so on version 4, a line removed in version 3 stays struck — each version's
   marks in its own colour, with a key. Lines are matched by id across the kept snapshots and the quote as it is now; a section is not a line. */

/** A line's marks through the versions: the version it came in (unset = it was on the first version), the versions it changed in (its name,
    quantity, price or discount — one put back as it came in has no change), the version that removed it, and what it was when it came in. */
export type LineHistory = { addedIn?: number; changedIn?: number[]; removedIn?: number; first?: LineWas }
export type ChainStep<T> = { version: number; items: T[] }
export type QuoteChain<T extends Diffable> = {
  /** every line on the quote now that carries a mark, by id */
  lines: Map<string, LineHistory>
  /** the lines removed along the way: the line as it last was, the version that removed it, and the version's lines it left (for its place) */
  removed: { line: T; since: number; removedIn: number; prev: T[] }[]
  /** what carries a mark: lines added since the first version, lines changed, lines removed */
  counts: { added: number; removed: number; changed: number }
  /** the versions that left a mark, oldest first — the print's key */
  versions: number[]
}
const sameLine = (a: Diffable, b: Diffable) => a.name === b.name && a.qty === b.qty && unitPriceMinor(a) === unitPriceMinor(b) && a.discountPct === b.discountPct
const wasOf = (l: Diffable): LineWas => ({ name: l.name, qty: l.qty, unitPriceMinor: unitPriceMinor(l), totalMinor: lineTotalMinor(l) })

/** The marks of every version: `snapshots` = the kept versions (any order), `current` = the quote as it is now. Pure. */
export function diffChain<T extends Diffable>(snapshots: ChainStep<T>[], current: ChainStep<Diffable>): QuoteChain<T> {
  const steps = [...snapshots].sort((a, b) => a.version - b.version)
  const base = steps[0]?.version ?? current.version
  type State = { since: number; changedIn: number[]; removedIn?: number; first: Diffable; last: Diffable; prev?: Diffable[] }
  const state = new Map<string, State>()
  const all: ChainStep<Diffable>[] = [...steps, current]
  all.forEach((step, k) => {
    const lines = step.items.filter((i) => i.kind === 'item')
    const here = new Map(lines.map((i) => [i.id, i]))
    for (const l of lines) {
      const s = state.get(l.id)
      if (!s || s.removedIn !== undefined) { state.set(l.id, { since: k === 0 ? base : step.version, changedIn: [], first: l, last: l }); continue }   // new — or back after a removal
      if (!sameLine(s.last, l)) s.changedIn.push(step.version)
      s.last = l
    }
    if (k === 0) return
    for (const [id, s] of state) {
      if (s.removedIn !== undefined || here.has(id)) continue
      if (s.last.status === 'Declined') { state.delete(id); continue }   // a line the client passed on, gone since — as `diffQuoteItems` leaves it out
      s.removedIn = step.version; s.prev = all[k - 1]!.items
    }
  })
  const out: QuoteChain<T> = { lines: new Map(), removed: [], counts: { added: 0, removed: 0, changed: 0 }, versions: [] }
  const marked = new Set<number>()
  for (const [id, s] of state) {
    if (s.removedIn !== undefined) { out.removed.push({ line: s.last as T, since: s.since, removedIn: s.removedIn, prev: (s.prev ?? []) as T[] }); out.counts.removed++; marked.add(s.removedIn); continue }
    const changedIn = sameLine(s.first, s.last) ? [] : s.changedIn   // changed and put back as it came in: no change to show
    if (s.since === base && !changedIn.length) continue
    out.lines.set(id, { ...(s.since !== base ? { addedIn: s.since } : {}), ...(changedIn.length ? { changedIn, first: wasOf(s.first) } : {}) })
    if (s.since !== base) { out.counts.added++; marked.add(s.since) }
    if (changedIn.length) { out.counts.changed++; marked.add(changedIn[changedIn.length - 1]!) }
  }
  out.versions = [...marked].sort((a, b) => a - b)
  return out
}

/** (S44F — NB-01) The colour each version's marks print in — the brand kit's, in turn: accent, red, grey (the kit has no more that read as ink on
    paper); the mark's own words name its version, so a colour used twice still says which. */
export const VERSION_INKS = ['accent', 'red', 'grey'] as const
export const versionInk = (version: number) => VERSION_INKS[(Math.max(2, version) - 2) % VERSION_INKS.length]!

/* ── (S44F — NB-02 (a)) The payment schedule's changes on a revision ─────────────────────────────────────────────────────────────────────────── */

/** A milestone as two versions compare it: its words, its share or fixed fee, and its amount on that version's total. */
export type DiffPayment = { id: string; label: string; pct: number; fixedMinor: number | null; amountMinor: number }
export type PaymentWas = { label: string; pct: number; amountMinor: number; fixed: boolean }
export type PaymentHistory = { addedIn?: number; changedIn?: number[]; removedIn?: number; first?: PaymentWas }
const samePayment = (a: DiffPayment, b: DiffPayment) => a.label === b.label && a.pct === b.pct && (a.fixedMinor ?? null) === (b.fixedMinor ?? null)
const paymentWas = (p: DiffPayment): PaymentWas => ({ label: p.label, pct: p.pct, amountMinor: p.amountMinor, fixed: p.fixedMinor != null })

/** Milestones of `cur` matched to `prev`'s: by id, else the one at the same place that nothing else took. */
function matchPayments(prev: DiffPayment[], cur: DiffPayment[]): Map<number, number> {
  const out = new Map<number, number>()   // cur index → prev index
  const taken = new Set<number>()
  cur.forEach((p, i) => { const j = prev.findIndex((x) => x.id === p.id); if (j >= 0) { out.set(i, j); taken.add(j) } })
  cur.forEach((_, i) => { if (!out.has(i) && i < prev.length && !taken.has(i) && !cur.some((x) => x.id === prev[i]!.id)) { out.set(i, i); taken.add(i) } })
  return out
}
export type PaymentDiff = { added: Set<number>; removed: { row: DiffPayment; at: number }[]; changed: Map<number, PaymentWas>; counts: { added: number; removed: number; changed: number } }
/** The schedule since a kept version: new milestones, removed ones (with the place they stood) and changed ones (its words, share or fee). */
export function diffPayments(prev: DiffPayment[], cur: DiffPayment[]): PaymentDiff {
  const m = matchPayments(prev, cur)
  const used = new Set(m.values())
  const added = new Set<number>(), changed = new Map<number, PaymentWas>()
  cur.forEach((p, i) => { const j = m.get(i); if (j === undefined) added.add(i); else if (!samePayment(prev[j]!, p)) changed.set(i, paymentWas(prev[j]!)) })
  const removed = prev.flatMap((row, j) => (used.has(j) ? [] : [{ row, at: j }]))
  return { added, removed, changed, counts: { added: added.size, removed: removed.length, changed: changed.size } }
}
/** Every version's marks on the schedule — as `diffChain` for lines, a milestone followed from version to version by `diffPayments`' match. */
export function paymentChain(snapshots: ChainStep<DiffPayment>[], current: ChainStep<DiffPayment>): { rows: (PaymentHistory | null)[]; removed: { row: DiffPayment; at: number; removedIn: number }[]; versions: number[] } {
  const steps = [...snapshots].sort((a, b) => a.version - b.version)
  const base = steps[0]?.version ?? current.version
  const all = [...steps, current]
  type Track = { since: number; changedIn: number[]; first: DiffPayment; last: DiffPayment; removedIn?: number; at?: number }
  let live: Track[] = (all[0]?.items ?? []).map((p) => ({ since: base, changedIn: [], first: p, last: p }))
  const gone: Track[] = []
  for (let k = 1; k < all.length; k++) {
    const step = all[k]!, prev = all[k - 1]!.items
    const m = matchPayments(prev, step.items)
    const used = new Set(m.values())
    live.forEach((t, j) => { if (!used.has(j)) gone.push({ ...t, removedIn: step.version, at: j }) })
    live = step.items.map((p, i) => {
      const j = m.get(i)
      if (j === undefined) return { since: step.version, changedIn: [], first: p, last: p }
      const t = live[j]!
      return { ...t, changedIn: samePayment(t.last, p) ? t.changedIn : [...t.changedIn, step.version], last: p }
    })
  }
  const marked = new Set<number>()
  const rows = live.map((t) => {
    const changedIn = samePayment(t.first, t.last) ? [] : t.changedIn
    if (t.since === base && !changedIn.length) return null
    if (t.since !== base) marked.add(t.since)
    if (changedIn.length) marked.add(changedIn[changedIn.length - 1]!)
    return { ...(t.since !== base ? { addedIn: t.since } : {}), ...(changedIn.length ? { changedIn, first: paymentWas(t.first) } : {}) }
  })
  for (const g of gone) marked.add(g.removedIn!)
  return { rows, removed: gone.map((g) => ({ row: g.last, at: g.at!, removedIn: g.removedIn! })), versions: [...marked].sort((a, b) => a - b) }
}

/* ── (S44F — NB-02 (b)) What changed, in words ───────────────────────────────────────────────────────────────────────────────────────────────────
   Urban Home's change summary (1.0 `urbanhomedemo` 479480a5e): under each kept version in Version History, and in the revised quote's WhatsApp
   message — each line's move (quantity, rate, name, section, discount, GST, optional, a printed word), the schedule, the total before → after,
   and how many lines nothing touched. The studio's reads every line; the client's leaves out what the client view keeps back. */

export type SummaryItem = Diffable & { unit: string | null; gstPct: number; optional: boolean; printAs: string | null; printAsText?: string | null; visibility: string }
export type SummaryState = { version: number; items: SummaryItem[]; payments: DiffPayment[]; totalMinor: number
  pricing: { additionalDiscountMode: string; additionalDiscountValue: number; gstEnabled: boolean; discounts: { id: string; label: string; mode: string; value: number }[] } }
export type ChangeSummary = { from: number; to: number; lines: string[]; untouched: number; totalBefore: number; totalAfter: number }
/** `client`: the client's words — no line hidden from them, and no line's money unless the view prints a price on every line (`prices`). */
export type SummaryAudience = { client?: { prices: boolean; schedule: boolean } }

const m2 = (minor: number) => { const v = minor / 100; return `${v < 0 ? '−' : ''}S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v))}` }
const pctText = (p: number) => `${Number.isInteger(p) ? p : Number(p.toFixed(2))}%`
const qtyText = (q: number, unit: string | null) => `${Number.isInteger(q) ? q : Number(q.toFixed(3))}${unit ? ` ${unit}` : ''}`
const said = (s: string) => `“${s.trim() || 'Untitled'}”`
const printWord = (l: SummaryItem) => (l.printAs ? printAsWord(l) || null : null)   // the word the print shows (REG-555)

/** A milestone as a version stores it (a `quote_payments` row, live or in a kept snapshot). */
export type PaymentRowLike = { id: string; name: string; description: string | null; pct: number; fixedMinor?: number | null }
/** A version's milestones as two versions compare them: the printed words, the share or fixed fee, the amount on that version's total. */
export const paymentsForDiff = (rows: PaymentRowLike[], totalMinor: number): DiffPayment[] => {
  const amounts = paymentAmounts(rows, totalMinor)
  return rows.map((p, i) => ({ id: p.id, label: (p.description || p.name || '').trim(), pct: p.pct, fixedMinor: isFixedRow(p, i) ? p.fixedMinor ?? null : null, amountMinor: amounts[i] ?? 0 }))
}
type ItemRowLike = Diffable & { unit: string | null; gstPct: number; optional?: boolean | null; printAs?: string | null; printAsText?: string | null; visibility: string }
/** A version as the change summary reads it — its lines, its milestones, its total and its own pricing. `discounts` = the named discounts, or
    their stored JSON (a snapshot's `discounts_json`). */
export function versionState(version: number, items: ItemRowLike[], payments: PaymentRowLike[], pricing: { totalMinor: number; additionalDiscountMode: string; additionalDiscountValue: number; gstEnabled: boolean; discounts: NamedDiscount[] | string | null | undefined }): SummaryState {
  /* a snapshot kept before a column existed lacks it: read as the column's default, never as a change */
  const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  const total = n(pricing.totalMinor)
  return {
    version, items: items.map((i) => ({ ...i, name: i.name ?? '', qty: n(i.qty), unit: i.unit ?? null, costMinor: n(i.costMinor), markupMinor: n(i.markupMinor), discountPct: n(i.discountPct), gstPct: n(i.gstPct, NaN), visibility: i.visibility ?? 'visible', status: i.status ?? 'Pending', optional: !!i.optional, printAs: i.printAs ?? null, printAsText: i.printAsText ?? null })),
    payments: paymentsForDiff(payments.map((p) => ({ ...p, pct: n(p.pct) })), total), totalMinor: total,
    pricing: { additionalDiscountMode: pricing.additionalDiscountMode === 'amount' ? 'amount' : 'pct', additionalDiscountValue: n(pricing.additionalDiscountValue), gstEnabled: pricing.gstEnabled !== false, discounts: Array.isArray(pricing.discounts) ? pricing.discounts : parseDiscounts(typeof pricing.discounts === 'string' ? pricing.discounts : null) },
  }
}
/** A kept version's stored snapshot (`quote_versions.snapshot_json`) as the change summary reads it — null when it can't be read. */
export function snapshotState(version: number, json: string): SummaryState | null {
  try {
    const raw = JSON.parse(json) as { quote?: { amountMinor?: number; additionalDiscountMode?: string; additionalDiscountValue?: number; gstEnabled?: boolean; discountsJson?: string | null }; items?: ItemRowLike[]; payments?: PaymentRowLike[] }
    if (!raw.quote || !Array.isArray(raw.items) || !Array.isArray(raw.payments)) return null
    const q = raw.quote
    return versionState(version, raw.items, raw.payments, { totalMinor: q.amountMinor ?? 0, additionalDiscountMode: q.additionalDiscountMode ?? 'pct', additionalDiscountValue: q.additionalDiscountValue ?? 0, gstEnabled: q.gstEnabled ?? true, discounts: q.discountsJson ?? null })
  } catch { return null }
}

/** One version against the one before it, in plain words. Pure. */
export function changeSummary(prev: SummaryState, cur: SummaryState, o: SummaryAudience = {}): ChangeSummary {
  const client = o.client ?? null
  const seen = (l: SummaryItem) => !client || l.visibility === 'visible'
  const money = !client || client.prices
  const sectionName = (items: SummaryItem[], id: string | null) => (id ? items.find((g) => g.id === id)?.name?.trim() || 'a section' : 'no section')
  /* a line's figures: its quantity, and its amount where the reader sees prices — an optional work never counts in the total, a word prints instead */
  const figures = (l: SummaryItem) => [qtyText(l.qty, l.unit), ...(money && !printWord(l) ? [m2(lineTotalMinor(l))] : printWord(l) ? [printWord(l)!] : [])].join(' · ')
  const added = (l: SummaryItem) => `Added ${said(l.name)} — ${figures(l)}${l.optional ? ' (optional)' : ''}`
  const prevById = new Map(prev.items.filter((i) => i.kind === 'item').map((i) => [i.id, i]))
  const curLines = cur.items.filter((i) => i.kind === 'item')
  const out: string[] = []
  let untouched = 0
  for (const l of curLines) {
    const p = prevById.get(l.id)
    if (!p || (client && !seen(p) && seen(l))) { if (seen(l)) out.push(added(l)); continue }   // to the client, a line shown again is a line added
    if (!seen(l) && !seen(p)) continue
    if (client && seen(p) && !seen(l)) { out.push(`Removed ${said(p.name)}`); continue }   // …and a line hidden is a line gone
    const moves: string[] = []
    if (p.name.trim() !== l.name.trim()) moves.push(`renamed from ${said(p.name)}`)
    if ((p.parentId ?? null) !== (l.parentId ?? null)) moves.push(`moved from ${sectionName(prev.items, p.parentId)} to ${sectionName(cur.items, l.parentId)}`)
    if (p.qty !== l.qty || (p.unit ?? '') !== (l.unit ?? '')) moves.push((p.unit ?? '') === (l.unit ?? '') ? `quantity ${qtyText(p.qty, null)} → ${qtyText(l.qty, l.unit)}` : `quantity ${qtyText(p.qty, p.unit)} → ${qtyText(l.qty, l.unit)}`)   // "48 → 50 ft run"; the unit twice only when it changed
    if (money && unitPriceMinor(p) !== unitPriceMinor(l)) moves.push(`rate ${m2(unitPriceMinor(p))} → ${m2(unitPriceMinor(l))}`)
    if (p.discountPct !== l.discountPct) moves.push(`discount ${pctText(p.discountPct)} → ${pctText(l.discountPct)}`)
    if (!client && Number.isFinite(p.gstPct) && Number.isFinite(l.gstPct) && p.gstPct !== l.gstPct) moves.push(`GST ${pctText(p.gstPct)} → ${pctText(l.gstPct)}`)
    if (!!p.optional !== !!l.optional) moves.push(l.optional ? 'now optional' : 'no longer optional')
    if ((p.printAs ?? null) !== (l.printAs ?? null) || (p.printAs === 'custom' && (p.printAsText ?? '') !== (l.printAsText ?? ''))) moves.push(printWord(l) ? `now prints ${said(printWord(l)!)}` : 'prints its price again')
    if (!client && p.visibility !== l.visibility) moves.push(l.visibility === 'visible' ? 'shown to the client again' : 'now hidden from the client')
    if (moves.length) out.push(`${said(l.name)}: ${moves.join(' · ')}`)
    else untouched++
  }
  const curIds = new Set(curLines.map((i) => i.id))
  for (const p of prevById.values()) if (!curIds.has(p.id) && p.status !== 'Declined' && seen(p)) out.push(`Removed ${said(p.name)} — ${figures(p)}`)
  /* the quote's own pricing */
  const pp = prev.pricing, cp = cur.pricing
  const discWord = (mode: string, v: number) => (mode === 'amount' ? m2(Math.round(v * 100)) : pctText(v))
  if (pp.additionalDiscountMode !== cp.additionalDiscountMode || pp.additionalDiscountValue !== cp.additionalDiscountValue) out.push(`Additional discount ${discWord(pp.additionalDiscountMode, pp.additionalDiscountValue)} → ${discWord(cp.additionalDiscountMode, cp.additionalDiscountValue)}`)
  for (const d of cp.discounts) { const was = pp.discounts.find((x) => x.id === d.id); if (!was) out.push(`Discount ${said(d.label || 'Discount')} added — ${discWord(d.mode, d.value)}`); else if (was.mode !== d.mode || was.value !== d.value || was.label !== d.label) out.push(`Discount ${said(d.label || 'Discount')}: ${discWord(was.mode, was.value)} → ${discWord(d.mode, d.value)}`) }
  for (const d of pp.discounts) if (!cp.discounts.some((x) => x.id === d.id)) out.push(`Discount ${said(d.label || 'Discount')} taken off`)
  if (pp.gstEnabled !== cp.gstEnabled) out.push(cp.gstEnabled ? 'GST added' : 'GST taken off')
  /* the schedule */
  if (!client || client.schedule) {
    const d = diffPayments(prev.payments, cur.payments)
    const share = (fixed: boolean, pct: number, amountMinor: number) => (fixed ? m2(amountMinor) : pctText(pct))   // a fixed fee is its amount, a share its %
    cur.payments.forEach((p, i) => {
      if (d.added.has(i)) out.push(`Payment schedule: added ${said(p.label)} — ${share(p.fixedMinor != null, p.pct, p.amountMinor)}`)
      const w = d.changed.get(i)
      if (w) out.push(`Payment schedule: ${said(p.label)}${w.label !== p.label ? ` (was ${said(w.label)})` : ''} ${share(w.fixed, w.pct, w.amountMinor)} → ${share(p.fixedMinor != null, p.pct, p.amountMinor)}`)
    })
    for (const r of d.removed) out.push(`Payment schedule: removed ${said(r.row.label)}`)
  }
  return { from: prev.version, to: cur.version, lines: out, untouched, totalBefore: prev.totalMinor, totalAfter: cur.totalMinor }
}

/** The summary as one text — Version History's Copy and the WhatsApp message. `limit` keeps a message short: "and n more changes". */
export function summaryText(s: ChangeSummary, o: { title?: boolean; limit?: number } = {}): string {
  const lines = o.limit && s.lines.length > o.limit ? [...s.lines.slice(0, o.limit), `and ${s.lines.length - o.limit} more ${s.lines.length - o.limit === 1 ? 'change' : 'changes'}`] : s.lines
  const total = s.totalBefore !== s.totalAfter ? `Total ${m2(s.totalBefore)} → ${m2(s.totalAfter)}` : `Total unchanged at ${m2(s.totalAfter)}`
  return [
    ...(o.title === false ? [] : [`What changed in version ${s.to} (from version ${s.from}):`]),
    ...(lines.length ? lines.map((l) => `• ${l}`) : ['• No line changed']),
    `${total}${s.untouched ? ` · ${s.untouched} ${s.untouched === 1 ? 'line' : 'lines'} untouched` : ''}`,
  ].join('\n')
}
