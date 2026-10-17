import { readSheet, isSheet } from '@/lib/quotes/upload'
import { currencySign, readQuoteText, type QuoteText } from '@/lib/quotes/pdf-quote'
import { parseXlsx } from '@/lib/xlsx'
import { parseCsv } from '@/lib/csv'
import { referenceInText, type RefLine } from './reference'

/**
 * Quote X-Ray (REG-639, X-Ray parity Q-10) — reading a picked file, in the browser, the moment it is picked. A spreadsheet (XLSX ·
 * CSV) is read for real through Upload a quote's reader (lib/quotes/upload.ts `readSheet`, REG-627): its lines, trades, rooms,
 * quantities, rates and the amounts it states. (S42 E-05) One of the three reference quotes is recognised by the PDF's own words — the
 * studio named and most of its lines there (lib/xray/reference.ts `referenceInText`) — never by the file's name.
 * (pending modules S21 — card held:quote-x-ray) Any other PDF is read from its own words, by rule (lib/quotes/pdf-quote.ts — the job 1.0
 * gave its model); a photo, or a PDF that is a picture of its pages, has no words to read — that reader is the developers' (a model with
 * OCR), and the X-Ray says so. A quote in another currency is refused (1.0's hard stop; S$ only, DEF-30). Anything else, or anything over
 * 10 MB, is refused before it is read.
 */
export type StatedTotals = { subtotalMinor: number | null; totalMinor: number | null; gstMinor: number | null; discountMinor: number | null }
export type SideRead =
  | { ok: true; kind: 'reference' | 'sheet' | 'pdf'; studio: string | null; lines: RefLine[]; totalMinor: number
      /** (S21) the totals the file states itself — the tile says whether the lines read come to them */ stated: StatedTotals | null
      /** (S42 E-05) the reference quote the file's words are — the run sends this key, never the file's name */ ref?: 'dyel' | 'flo' | 'cove' }
  | { ok: false; reason: 'type' | 'size' | 'unreadable' | 'empty' | 'scan' | 'currency'; /** (S21) the currency's sign, for 'currency' */ currency?: string }

export const XRAY_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx'
export const XRAY_MAX_BYTES = 10 * 1024 * 1024
export type FileKind = 'pdf' | 'image' | 'sheet'
export function fileKind(name: string): FileKind | null {
  if (/\.pdf$/i.test(name)) return 'pdf'
  if (/\.(png|jpe?g|webp)$/i.test(name)) return 'image'
  if (/\.(csv|xlsx)$/i.test(name)) return 'sheet'
  return null
}
export const FILE_GLYPH: Record<FileKind, string> = { pdf: 'picture_as_pdf', image: 'image', sheet: 'table_chart' }
const MAX_LINES = 500
const sumOf = (lines: RefLine[]) => lines.reduce((s, l) => s + l.amountMinor, 0)

/**
 * A sheet's lines as the comparison reads the other side. A line's money is the amount the sheet states for it; with no Amount column, its
 * quantity × rate less the line's discount (the paste rule). Its rate — the price after the line's discount, so a discounted line still adds
 * up — is kept only when the sheet states both a rate and a quantity.
 */
function sheetLines(rows: string[][], name: string): SideRead {
  const d = readSheet(rows, name)
  if (d.currency && d.currency !== 'SGD') return { ok: false, reason: 'currency', currency: currencySign(d.currency) }
  if (!d.read.ok) return { ok: false, reason: d.read.reason }
  const lines: RefLine[] = d.read.groups.flatMap((g) => g.lines.map((l) => {
    const qty = l.qty && l.qty > 0 ? l.qty : 1
    const unitMinor = (l.costMinor ?? 0) + (l.markupMinor ?? 0)
    const net = unitMinor * (1 - (l.discountPct ?? 0) / 100)
    const stated = d.stated.get(l)
    const amountMinor = Math.max(0, stated ?? Math.round(qty * net))
    const rateMinor = d.priced && stated !== undefined && l.qty && l.qty > 0 && unitMinor > 0 ? Math.round(net) : null
    return { trade: (l.category || g.name || 'Other').slice(0, 80), room: l.room ? l.room.slice(0, 80) : null, name: l.name.slice(0, 200), qty, unit: l.unit ? l.unit.slice(0, 20) : null, amountMinor, rateMinor }
  })).filter((l) => l.name.trim() !== '').slice(0, MAX_LINES)
  if (!lines.length) return { ok: false, reason: 'empty' }
  const st = d.statedTotals
  return { ok: true, kind: 'sheet', studio: null, lines, totalMinor: sumOf(lines), stated: st.subtotalMinor === null && st.totalMinor === null ? null : st }
}

/** (S21) A PDF's own words, read by rule: its sections as trades, each priced line with its quantity, unit, rate and stated amount. */
export function pdfSide(t: QuoteText): SideRead {
  if (t.currency && t.currency !== 'SGD') return { ok: false, reason: 'currency', currency: currencySign(t.currency) }
  const lines: RefLine[] = t.lines.slice(0, MAX_LINES).map((l) => ({
    trade: (l.section ?? 'Other').slice(0, 80), room: l.room ? l.room.slice(0, 80) : null, name: l.name.slice(0, 200),
    qty: l.qty && l.qty > 0 ? l.qty : 1, unit: l.unit ? l.unit.slice(0, 20) : null, amountMinor: Math.max(0, l.amountMinor),
    rateMinor: l.rateMinor && l.qty && l.qty > 0 ? l.rateMinor : null,
  }))
  /* a letter, a brochure or a schedule with no priced work is not a quote to compare */
  if (!lines.some((l) => l.amountMinor > 0)) return { ok: false, reason: 'empty' }
  const stated = t.subtotalMinor === null && t.totalMinor === null ? null : { subtotalMinor: t.subtotalMinor, totalMinor: t.totalMinor, gstMinor: t.gstMinor, discountMinor: t.discountMinor }
  return { ok: true, kind: 'pdf', studio: t.studio, lines, totalMinor: sumOf(lines), stated }
}

export async function readSide(file: File): Promise<SideRead> {
  const kind = fileKind(file.name)
  if (!kind) return { ok: false, reason: 'type' }
  if (file.size > XRAY_MAX_BYTES) return { ok: false, reason: 'size' }
  try {
    if (kind === 'sheet' && isSheet(file.name)) {
      const rows = /\.csv$/i.test(file.name) ? parseCsv(await file.text()) : await parseXlsx(await file.arrayBuffer())
      return sheetLines(rows, file.name)
    }
    if (kind === 'image') return { ok: false, reason: 'scan' }   // (S42 E-05) a photo has no words to read here — never a reference by its name
    const { pdfLines } = await import('@/lib/pdf-text')
    const words = await pdfLines(await file.arrayBuffer())
    if (!words.some((l) => /[a-z]{3}/i.test(l))) return { ok: false, reason: 'scan' }   // a scan saved as a PDF: pictures of pages, no words
    const ref = referenceInText(words)   // (S42 E-05) the file's own words are one of the reference quotes
    if (ref && ref.key !== 'sheet') return { ok: true, kind: 'reference', studio: ref.studio, lines: ref.lines, totalMinor: sumOf(ref.lines), stated: null, ref: ref.key }
    return pdfSide(readQuoteText(words))
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}

/**
 * (S21) The reading's own check: do the lines read come to the total the file states? Agrees with the sub-total, the total, the total less
 * its GST (or at 9%) or with its discount added back — within S$1 or half a percent. Null when the file states no total.
 */
export function totalCheck(sumMinor: number, st: StatedTotals | null): { agrees: boolean; statedMinor: number } | null {
  if (!st) return null
  const { subtotalMinor: sub, totalMinor: tot, gstMinor: gst, discountMinor: disc } = st
  const cands = [sub, tot, tot !== null && gst !== null ? tot - gst : null, tot !== null ? Math.round(tot / 1.09) : null,
    tot !== null && disc !== null ? tot + disc : null, sub !== null && disc !== null ? sub + disc : null, tot !== null && gst !== null && disc !== null ? tot - gst + disc : null]
    .filter((c): c is number => c !== null && c > 0)
  if (!cands.length) return null
  const agrees = cands.some((c) => Math.abs(sumMinor - c) <= Math.max(100, Math.round(c * 0.005)))
  return { agrees, statedMinor: sub ?? (tot !== null && gst !== null ? tot - gst : tot!) }
}

/** The server's check on lines a browser read from a sheet or a PDF: the shape, sizes and money it may store. */
export function cleanLines(input: unknown): RefLine[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_LINES) return null
  const out: RefLine[] = []
  for (const x of input as Record<string, unknown>[]) {
    const name = typeof x?.name === 'string' ? x.name.trim().slice(0, 200) : ''
    const qty = typeof x?.qty === 'number' && Number.isFinite(x.qty) && x.qty > 0 && x.qty < 1e6 ? x.qty : 1
    const amount = typeof x?.amountMinor === 'number' && Number.isFinite(x.amountMinor) ? Math.round(x.amountMinor) : NaN
    if (!name || !(amount >= 0) || amount > 1e10) return null
    const rate = typeof x.rateMinor === 'number' && Number.isFinite(x.rateMinor) && x.rateMinor > 0 && x.rateMinor <= 1e10 ? Math.round(x.rateMinor) : null
    out.push({ name, qty, amountMinor: amount,
      trade: typeof x.trade === 'string' && x.trade.trim() ? x.trade.trim().slice(0, 80) : 'Other',
      room: typeof x.room === 'string' && x.room.trim() ? x.room.trim().slice(0, 80) : null,
      unit: typeof x.unit === 'string' && x.unit.trim() ? x.unit.trim().slice(0, 20) : null,
      ...(rate !== null ? { rateMinor: rate } : {}) })
  }
  return out
}
