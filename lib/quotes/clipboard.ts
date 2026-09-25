/**
 * The Items table's clipboard (REG-476, the Excel benchmark's phase 2). A block copied from Excel / Sheets / Numbers arrives as
 * tab-separated text, one line per row (a cell holding a tab or a line break comes double-quoted); the table hands it to the
 * Paste dialog, which maps each column to a field before the lines land. Going out — a copied selection, the CSV / XLSX
 * export — the lines take the same shape, so they paste straight into a sheet. Client-safe, no DOM.
 */
import type { QuoteItem } from '@/lib/db/schema'
import { cleanLink, ITEM_KINDS, ITEM_KIND_LABEL, UNITS } from './items-model'
import { countedLines, flattenItems, groupTotals, lineCostMinor, lineTotalMinor, numberItems, unitPriceMinor } from './math'

/* ── in: a pasted block ── */

/** Tab-separated rows; a double-quoted cell may hold tabs and line breaks ("" is a quote). Every row is padded to the widest. */
export function parseBlock(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false, hadQuote = false
  const src = text.replace(/\r\n?/g, '\n')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false }
      else cell += ch
      continue
    }
    if (ch === '"' && cell === '' && !hadQuote) { quoted = true; hadQuote = true; continue }
    if (ch === '\t') { row.push(cell); cell = ''; hadQuote = false }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; hadQuote = false }
    else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  while (rows.length && rows[rows.length - 1]!.every((c) => c.trim() === '')) rows.pop()
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0)
  return rows.map((r) => { const out = r.map((c) => c.trim()); while (out.length < width) out.push(''); return out })
}

/** A block is more than one cell: several rows, or one row with tabs. In a cell only a tabbed block counts (a pasted sentence
    with line breaks is still that cell's text); the Add Item field also takes a plain list, one name per line. */
export function isBlock(text: string, where: 'cell' | 'add'): boolean {
  if (where === 'cell' && !text.includes('\t')) return false
  const rows = parseBlock(text)
  return rows.length > 1 || (rows.length === 1 && rows[0]!.length > 1)
}

export const PASTE_FIELDS = ['name', 'description', 'kind', 'qty', 'unit', 'cost', 'markup', 'unitPrice', 'discount', 'gst', 'room', 'category', 'section', 'vendor', 'link', 'skip'] as const
/** (REG-653, price book parity Q-13) What a quote's paste maps, and what an import into My Items maps — the book keeps no quantity,
    discount, GST, room or section label, and a quote line's kind is its icon, so each list offers only what its target keeps. */
export const QUOTE_PASTE_FIELDS = PASTE_FIELDS.filter((f) => f !== 'kind')
export const BOOK_PASTE_FIELDS = PASTE_FIELDS.filter((f) => !['qty', 'discount', 'gst', 'room', 'section'].includes(f))
export type PasteField = (typeof PASTE_FIELDS)[number]
export const PASTE_FIELD_LABEL: Record<PasteField, string> = {
  name: 'Item', description: 'Description', kind: 'Kind', qty: 'Qty', unit: 'Unit', cost: 'Cost', markup: 'Markup', unitPrice: 'Unit Price',
  discount: 'Discount (%)', gst: 'GST (%)', room: 'Room', category: 'Category', section: 'Section label', vendor: 'Vendor/Sub', link: 'Website Link', skip: 'Skip this column',   // (REG-623)
}
/** What a sheet's header row tends to call each field (Singapore renovation quotes: "Description of work", "Rate", "Amount"). */
const ALIASES: Record<Exclude<PasteField, 'skip'>, string[]> = {
  name: ['item', 'items', 'name', 'item name', 'description of work', 'work', 'works', 'title', 'product', 'scope', 'particulars'],
  description: ['description', 'desc', 'details', 'notes', 'remarks', 'specification', 'spec', 'specs'],
  kind: ['kind', 'item kind', 'item type', 'cost type'],   // (REG-653, Q-14) the export's Kind column comes back
  qty: ['qty', 'quantity', 'no', 'nos', 'count', 'units'],
  unit: ['unit', 'uom', 'unit type', 'measure', 'per', 'unit of measure'],
  cost: ['cost', 'cost price', 'unit cost', 'buy', 'purchase', 'purchase price', 'supplier price', 'rate'],
  markup: ['markup', 'mark up', 'margin'],
  unitPrice: ['unit price', 'price', 'selling', 'sell', 'selling price', 'unit rate', 'sale price'],
  discount: ['discount', 'disc', 'discount %', 'disc %', 'discount pct'],
  gst: ['gst', 'tax', 'vat', 'gst %', 'tax %'],
  room: ['room', 'area', 'location', 'space', 'zone'],
  category: ['category', 'cat', 'type', 'trade', 'group'],
  section: ['section', 'phase', 'stage', 'part'],
  vendor: ['vendor', 'vendor sub', 'supplier', 'subcontractor', 'sub contractor', 'sub con', 'subcon', 'contractor'],   // (REG-623)
  link: ['website link', 'website', 'link', 'url', 'product link', 'spec link', 'spec sheet link', 'web link'],
}
const norm = (s: string) => s.toLowerCase().replace(/\(s\$\)|s\$|\$/g, '').replace(/[^a-z0-9% ]+/g, ' ').replace(/\s+/g, ' ').trim()
function fieldForHeader(cell: string): PasteField | null {
  const n = norm(cell)
  if (!n) return null
  for (const [f, list] of Object.entries(ALIASES) as [Exclude<PasteField, 'skip'>, string[]][]) if (list.includes(n)) return f
  for (const [f, list] of Object.entries(ALIASES) as [Exclude<PasteField, 'skip'>, string[]][]) if (list.some((a) => n.startsWith(`${a} `) || n.endsWith(` ${a}`))) return f
  return null
}
/** The first row is a header when at least half its cells name a field (and none is a number). */
export function guessHeader(rows: string[][]): PasteField[] | null {
  const first = rows[0]
  if (!first || rows.length < 2) return null
  const cells = first.filter((c) => c !== '')
  if (!cells.length || cells.some((c) => toNumber(c) !== null)) return null
  const map = first.map((c) => (c === '' ? 'skip' : fieldForHeader(c) ?? 'skip'))
  const hits = map.filter((f) => f !== 'skip').length
  return hits >= Math.max(1, Math.ceil(cells.length / 2)) ? map : null
}

/** "S$1,200.50" · "1200" · "12.5%" · "−3" → a number; null when the cell is not one. */
export function toNumber(v: string): number | null {
  const s = v.replace(/[−–]/g, '-').replace(/\s|,|s\$|\$/gi, '').replace(/%$/, '')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
const looksNumeric = (col: string[]) => col.some((v) => v !== '') && col.every((v) => v === '' || toNumber(v) !== null)
const looksUnit = (col: string[]) => col.some((v) => v !== '') && col.every((v) => v === '' || UNITS.some((u) => u.toLowerCase() === v.toLowerCase()))
/** No header: the first text column is the name and a second one the description, unit-looking text the unit, then the
    numbers left to right — a whole-number column first is the quantity, the next the cost, and a column that multiplies the
    two (the sheet's "Amount") is skipped: totals are derived here. */
export function guessColumns(rows: string[][]): PasteField[] {
  const width = rows[0]?.length ?? 0
  const cols = Array.from({ length: width }, (_, c) => rows.map((r) => r[c] ?? ''))
  const out: PasteField[] = cols.map(() => 'skip')
  const text = cols.map((col, c) => col.some((v) => v !== '') && !looksNumeric(col) && !looksUnit(col) ? c : -1).filter((c) => c >= 0)
  if (text.length) out[text[0]!] = 'name'
  if (text.length > 1) out[text[1]!] = 'description'
  cols.forEach((col, c) => { if (looksUnit(col)) out[c] = 'unit' })
  const nums = cols.map((col, c) => (looksNumeric(col) ? c : -1)).filter((c) => c >= 0)
  const pcts = nums.filter((c) => cols[c]!.some((v) => /%$/.test(v)))
  if (pcts[0] !== undefined) out[pcts[0]] = 'discount'
  if (pcts[1] !== undefined) out[pcts[1]] = 'gst'
  const plain = nums.filter((c) => !pcts.includes(c))
  const whole = (c: number) => cols[c]!.every((v) => v === '' || Number.isInteger(toNumber(v)))
  let qty: number | null = null, cost: number | null = null
  for (const c of plain) {
    if (qty === null && cost === null && whole(c) && plain.length > 1) { qty = c; out[c] = 'qty'; continue }
    if (cost === null) { cost = c; out[c] = 'cost'; continue }
    // qty × cost ≈ this column → the sheet's line amount, which the quote derives
    const product = qty !== null && rows.every((r) => { const a = toNumber(r[qty!] ?? ''), b = toNumber(r[cost!] ?? ''), t = toNumber(r[c] ?? ''); return a === null || b === null || t === null || Math.abs(a * b - t) <= Math.max(0.011, Math.abs(t) * 0.001) })
    if (product) out[c] = 'skip'; else if (!out.includes('unitPrice')) out[c] = 'unitPrice'
  }
  return out
}

/** One mapped row, ready for the server (`createQuoteItems`). Unit Price without a markup becomes cost + markup; a markup
    typed as "20%" is that share of the cost; a lone Unit Price is the cost with no markup, so the total still reads right. */
export type PasteLine = {
  name: string; description?: string | null; qty?: number; unit?: string | null; costMinor?: number; markupMinor?: number
  discountPct?: number; gstPct?: number; room?: string | null; category?: string | null; section?: string | null
  /** (REG-623) */ vendor?: string | null; link?: string | null
  /** (REG-653, Q-13) My Items' kind — design · fee · labour · delivery · purchase — read from the key or its label */ kind?: string
}
export function toLines(rows: string[][], map: PasteField[], header: boolean): PasteLine[] {
  const out: PasteLine[] = []
  for (const r of rows.slice(header ? 1 : 0)) {
    if (r.every((c) => c === '')) continue
    const line: PasteLine = { name: '' }
    let markupPct: number | null = null, unitPrice: number | null = null
    map.forEach((f, c) => {
      const v = r[c] ?? ''
      if (f === 'skip' || v === '') return
      const n = toNumber(v)
      switch (f) {
        case 'name': line.name = v.slice(0, 200); break
        case 'description': line.description = v.slice(0, 2000); break
        case 'kind': { const k = ITEM_KINDS.find((x) => x === v.trim().toLowerCase() || ITEM_KIND_LABEL[x].toLowerCase() === v.trim().toLowerCase()); if (k) line.kind = k; break }
        case 'qty': if (n !== null && n >= 0) line.qty = n; break
        case 'unit': line.unit = (UNITS.find((u) => u.toLowerCase() === v.toLowerCase()) ?? v).slice(0, 40); break
        case 'cost': if (n !== null && n >= 0) line.costMinor = Math.round(n * 100); break
        case 'markup': if (n !== null) { if (/%$/.test(v)) markupPct = n; else line.markupMinor = Math.round(n * 100) } break
        case 'unitPrice': if (n !== null && n >= 0) unitPrice = Math.round(n * 100); break
        case 'discount': if (n !== null) line.discountPct = Math.min(100, Math.max(0, n)); break
        case 'gst': if (n !== null) line.gstPct = Math.min(100, Math.max(0, n)); break
        case 'room': line.room = v.slice(0, 60); break
        case 'category': line.category = v.slice(0, 60); break
        case 'section': line.section = v.slice(0, 60); break
        case 'vendor': line.vendor = v.slice(0, 80); break   // (REG-623)
        case 'link': { const u = cleanLink(v); if (u) line.link = u; break }   // a cell that is not a web address is left out
      }
    })
    if (unitPrice !== null) {
      if (line.costMinor === undefined) { line.costMinor = unitPrice; line.markupMinor = 0 }
      else if (line.markupMinor === undefined && markupPct === null) line.markupMinor = unitPrice - line.costMinor
    }
    if (markupPct !== null) line.markupMinor = Math.round((line.costMinor ?? 0) * markupPct / 100)
    if (line.costMinor !== undefined && line.markupMinor !== undefined && line.markupMinor < -line.costMinor) line.markupMinor = -line.costMinor
    if (!line.name) line.name = line.description ? line.description.slice(0, 60) : 'Item'
    out.push(line)
  }
  return out
}

/* ── out: a selection or the whole table ── */

export type SheetCell = string | number | null
export const EXPORT_HEAD = ['#', 'Item', 'Description', 'Qty', 'Unit', 'Cost', 'Markup', 'Unit Price', 'Discount (%)', 'GST (%)', 'Room', 'Category', 'Section label', 'Vendor/Sub', 'Website Link', 'Total'] as const
/** The money columns in EXPORT_HEAD: they print with two decimals. */
export const EXPORT_MONEY_COLS = [5, 6, 7, 15]
const dollars = (minor: number) => Math.round(minor) / 100

/** Every line in table order (a group before its children, with its sums), or only the ids given, as sheet cells. */
export function exportRows(items: QuoteItem[], only?: Set<string>): SheetCell[][] {
  const numbers = numberItems(items)
  const out: SheetCell[][] = []
  for (const i of flattenItems(items)) {
    if (only && !only.has(i.id)) continue
    const n = numbers.get(i.id) ?? ''
    if (i.kind === 'group') {
      const s = groupTotals(items, i.id)
      out.push([n, i.name, i.description ?? '', null, null, dollars(s.costMinor), dollars(s.markupMinor), dollars(s.unitPriceMinor), null, null, i.room ?? '', i.category ?? '', i.section ?? '', '', '', dollars(s.totalMinor)])
    } else {
      out.push([n, i.name, i.description ?? '', i.qty, i.unit ?? '', dollars(i.costMinor), dollars(i.markupMinor), dollars(unitPriceMinor(i)), i.discountPct, i.gstPct, i.room ?? '', i.category ?? '', i.section ?? '', i.vendor ?? '', i.link ?? '', dollars(lineTotalMinor(i))])
    }
  }
  return out
}
/** The sum row's figures over the lines that price (a Declined line leaves every total). */
export function sumLines(items: QuoteItem[]) {
  const lines = countedLines(items)
  return {
    count: lines.length,
    qty: lines.reduce((s, l) => s + l.qty, 0),
    costMinor: lines.reduce((s, l) => s + lineCostMinor(l), 0),
    markupMinor: lines.reduce((s, l) => s + Math.round(l.qty * l.markupMinor), 0),
    unitPriceMinor: lines.reduce((s, l) => s + Math.round(l.qty * unitPriceMinor(l)), 0),
    totalMinor: lines.reduce((s, l) => s + lineTotalMinor(l), 0),
  }
}

const cellText = (c: SheetCell) => (c === null ? '' : typeof c === 'number' ? String(c) : c)
/** Tab-separated, the shape a sheet pastes: a cell with a tab, a line break or a quote is double-quoted. */
export function toTsv(rows: SheetCell[][]): string {
  return rows.map((r) => r.map((c) => { const s = cellText(c); return /[\t\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }).join('\t')).join('\n')
}
