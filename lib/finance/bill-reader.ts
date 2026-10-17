/**
 * (gaps build F1 — F1-Q10) Reading a supplier's bill — the curated reader, no AI credits (Q-30): the PDF's own text is read in the browser
 * (`pdfLines`, lib/pdf-text.ts — pdf.js, the import wizard's reader) and this takes from its lines what a studio types by hand: who it is from,
 * its number, the day it was issued and the day it is due, the subtotal, the GST, the total and the lines. Pure and client-safe, so the dialog
 * and a test read a bill the same way. Every field it fills is named in `fields`, so the form can say "Read from the file — check it" until it is
 * changed (1.0's "AI wasn't fully confident", G-426, without a guess dressed as confidence). A photo or a scan has no text: it reads nothing,
 * and the form opens empty with the file kept.
 */
import { nameKey, type BillLine } from './model'

export type BillRead = {
  supplier: string | null
  /** the directory's vendor it names (by its name or its UEN), when one does */ vendorId: string | null
  uen: string | null
  reference: string | null
  issuedOn: number | null
  dueOn: number | null
  subtotalMinor: number | null; gstMinor: number | null; totalMinor: number | null
  lines: BillLine[]
  /** the fields it filled: supplier · reference · issuedOn · dueOn · subtotal · gst · total · lines */
  fields: string[]
}
export const EMPTY_READ: BillRead = { supplier: null, vendorId: null, uen: null, reference: null, issuedOn: null, dueOn: null, subtotalMinor: null, gstMinor: null, totalMinor: null, lines: [], fields: [] }

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
/** A day as a bill prints it: 25/09/2026 · 25-09-2026 · 25 Sep 2026 · 25 September 2026 · 2026-09-25 — local midnight in ms, or null. */
export function readDay(s: string): number | null {
  const t = s.trim()
  let m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(t)
  if (m) { const y = Number(m[3]!.length === 2 ? `20${m[3]}` : m[3]); return valid(y, Number(m[2]) - 1, Number(m[1])) }
  m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t)
  if (m) return valid(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  m = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/.exec(t)
  if (m) { const mo = MONTHS.indexOf(m[2]!.slice(0, 3).toLowerCase()); return mo < 0 ? null : valid(Number(m[3]), mo, Number(m[1])) }
  m = /([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(t)
  if (m) { const mo = MONTHS.indexOf(m[1]!.slice(0, 3).toLowerCase()); return mo < 0 ? null : valid(Number(m[3]), mo, Number(m[2])) }
  return null
}
function valid(y: number, mo: number, d: number): number | null {
  const x = new Date(y, mo, d)
  return x.getFullYear() === y && x.getMonth() === mo && x.getDate() === d && y > 2000 && y < 2100 ? x.getTime() : null
}
/** Every amount on a line: "S$7,630.00" · "7,630.00" · "$7630" → cents, in reading order. */
export function amountsIn(s: string): number[] {
  const out: number[] = []
  for (const m of s.matchAll(/(?:S\$|SGD|\$)?\s?(-?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|-?\d+\.\d{2})(?![\d%])/g)) {
    const n = Number(m[1]!.replace(/,/g, ''))
    if (Number.isFinite(n)) out.push(Math.round(n * 100))
  }
  return out
}
const lastAmount = (s: string) => { const a = amountsIn(s); return a.length ? a[a.length - 1]! : null }
const UEN_RE = /\b(\d{8,9}[A-Z]|[TSR]\d{2}[A-Z]{2}\d{4}[A-Z])\b/

/** Read a bill from its text lines. `vendors` = the directory, so the read supplier finds its vendor. */
export function readBill(lines: string[], vendors: { id: string; name: string; uen: string | null }[]): BillRead {
  const text = lines.map((l) => l.trim()).filter(Boolean)
  if (!text.length) return EMPTY_READ
  const r: BillRead = { ...EMPTY_READ, lines: [], fields: [] }
  const fill = (k: string) => { if (!r.fields.includes(k)) r.fields.push(k) }
  const after = (re: RegExp) => { for (const l of text) { const m = re.exec(l); if (m) return { line: l, rest: l.slice((m.index ?? 0) + m[0].length) } } return null }

  /* the number: "Invoice No: WC-2391", "Invoice #: 12345", "Bill No. AF-7781", "Tax Invoice No WC-2391" */
  const ref = after(/\b(?:tax\s+)?(?:invoice|inv|bill)\s*(?:no\.?|number|#)\s*[:.#]?\s*/i)
  const refM = ref ? /^([A-Z0-9][A-Z0-9/-]{1,30})/i.exec(ref.rest.trim()) : null
  if (refM) { r.reference = refM[1]!; fill('reference') }
  /* the days: "Invoice Date: 25/09/2026", "Date: 25 Sep 2026", "Due Date: 09/10/2026", "Payment due 9 Oct 2026" */
  const due = after(/\b(?:due\s+date|payment\s+due|due\s+on|due)\s*[:.]?\s*/i)
  const dueDay = due ? readDay(due.rest) : null
  if (dueDay) { r.dueOn = dueDay; fill('dueOn') }
  const issued = after(/\b(?:invoice\s+date|bill\s+date|issue\s+date|date\s+of\s+issue|dated?)\s*[:.]?\s*/i)
  const issuedDay = issued ? readDay(issued.rest) : null
  if (issuedDay) { r.issuedOn = issuedDay; fill('issuedOn') }
  /* the amounts: the subtotal, the GST and the total — the last amount on each line that names it */
  const sub = text.find((l) => /\b(sub[\s-]?total|total\s+before\s+gst|amount\s+before\s+gst|total\s+excl)/i.test(l))
  const gst = text.find((l) => /\bgst\b/i.test(l) && !/reg/i.test(l) && amountsIn(l).length > 0)
  const totalLines = text.filter((l) => /\b(grand\s+total|total\s+payable|amount\s+due|total\s+due|total)\b/i.test(l) && !/sub[\s-]?total|before\s+gst|excl/i.test(l) && amountsIn(l).length > 0)
  if (sub) { const a = lastAmount(sub); if (a !== null) { r.subtotalMinor = a; fill('subtotal') } }
  if (gst) { const a = lastAmount(gst); if (a !== null) { r.gstMinor = a; fill('gst') } }
  if (totalLines.length) { const a = Math.max(...totalLines.map((l) => lastAmount(l) ?? 0)); if (a > 0) { r.totalMinor = a; fill('total') } }
  /* the lines: "{description}  {qty}  {unit price}  {amount}" with the arithmetic holding (qty × price = amount, within a cent per unit) */
  for (const l of text) {
    const cols = l.split(/\s{2,}/)
    if (cols.length < 3) continue
    const amt = amountsIn(cols[cols.length - 1]!)[0]
    const unit = amountsIn(cols[cols.length - 2]!)[0]
    const qtyCol = cols.length >= 4 ? cols[cols.length - 3]! : '1'
    const qty = Number(qtyCol.replace(/[^\d.]/g, ''))
    const desc = cols.slice(0, cols.length >= 4 ? cols.length - 3 : cols.length - 2).join(' ').trim()
    if (amt === undefined || unit === undefined || !(qty > 0) || !desc || /^(description|item)/i.test(desc) || /total|gst/i.test(desc)) continue
    if (Math.abs(Math.round(qty * unit) - amt) > Math.max(1, qty)) continue
    r.lines.push({ id: `r${r.lines.length + 1}`, description: desc.slice(0, 200), qty, unitMinor: unit })
  }
  if (r.lines.length) fill('lines')
  /* what a missing figure follows from the others */
  if (r.subtotalMinor === null && r.lines.length) { r.subtotalMinor = r.lines.reduce((s, x) => s + Math.round(x.qty * x.unitMinor), 0); fill('subtotal') }
  if (r.totalMinor !== null && r.subtotalMinor !== null && r.gstMinor === null) { r.gstMinor = Math.max(0, r.totalMinor - r.subtotalMinor); fill('gst') }
  if (r.totalMinor === null && r.subtotalMinor !== null) { r.totalMinor = r.subtotalMinor + (r.gstMinor ?? 0); fill('total') }
  /* who it is from: a directory vendor named on it, else one with its UEN, else its letterhead's first line */
  const uen = text.map((l) => UEN_RE.exec(l)?.[1]).find(Boolean) ?? null
  r.uen = uen
  const byName = vendors.filter((v) => nameKey(v.name).length >= 4).find((v) => text.some((l) => nameKey(l).includes(nameKey(v.name))))
  const byUen = uen ? vendors.find((v) => v.uen && v.uen.toUpperCase() === uen.toUpperCase()) : undefined
  const hit = byName ?? byUen ?? null
  if (hit) { r.vendorId = hit.id; r.supplier = hit.name; fill('supplier') }
  else {
    const head = text.find((l) => !/invoice|^tax|^bill\b|^date|^\d|^uen/i.test(l) && /[A-Za-z]{3}/.test(l)) ?? null
    if (head && head.length <= 80) { r.supplier = head; fill('supplier') }
  }
  return r
}

/** The words the form says about a reading: what came from the file, or why nothing did. */
export function readWords(r: BillRead, file: string): string {
  if (!r.fields.length) return `Couldn’t read ${file} — enter the bill below; the file is kept with it`
  const n = r.fields.length
  return `Read from ${file} — ${n === 1 ? 'one field' : `${n} fields`} filled. Check them against the bill before you record it.`
}
