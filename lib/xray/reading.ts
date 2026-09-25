import { readRows, isSheet } from '@/lib/quotes/upload'
import { parseXlsx } from '@/lib/xlsx'
import { parseCsv } from '@/lib/csv'
import { readOtherQuote, type RefLine } from './reference'

/**
 * Quote X-Ray (REG-639, X-Ray parity Q-10) — reading a picked file, in the browser, the moment it is picked. A spreadsheet (XLSX ·
 * CSV) is read for real through Upload a quote's reader (lib/quotes/upload.ts `readRows`, REG-627): its lines, trades, rooms,
 * quantities and amounts. A PDF or a photo is one of the three reference quotes read by its name (lib/xray/reference.ts) — the
 * reading of any other document is the platform's. Anything else, or anything over 10 MB, is refused before it is read.
 */
export type SideRead =
  | { ok: true; kind: 'reference' | 'sheet'; studio: string | null; lines: RefLine[]; totalMinor: number }
  | { ok: false; reason: 'type' | 'size' | 'unreadable' | 'empty' }

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

/** A sheet's lines as the comparison reads the other side: the amount = quantity × rate less the line's discount (the paste rule). */
function sheetLines(rows: string[][], name: string): SideRead {
  const read = readRows(rows, name)
  if (!read.ok) return { ok: false, reason: read.reason }
  const lines: RefLine[] = read.groups.flatMap((g) => g.lines.map((l) => {
    const qty = l.qty && l.qty > 0 ? l.qty : 1
    const amountMinor = Math.max(0, Math.round(qty * ((l.costMinor ?? 0) + (l.markupMinor ?? 0)) * (1 - (l.discountPct ?? 0) / 100)))
    return { trade: (l.category || g.name || 'Other').slice(0, 80), room: l.room ? l.room.slice(0, 80) : null, name: l.name.slice(0, 200), qty, unit: l.unit ? l.unit.slice(0, 20) : null, amountMinor }
  })).filter((l) => l.name.trim() !== '')
  if (!lines.length) return { ok: false, reason: 'empty' }
  return { ok: true, kind: 'sheet', studio: null, lines, totalMinor: lines.reduce((s, l) => s + l.amountMinor, 0) }
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
    const ref = readOtherQuote(file.name)
    return ref ? { ok: true, kind: 'reference', studio: ref.studio, lines: ref.lines, totalMinor: ref.lines.reduce((s, l) => s + l.amountMinor, 0) } : { ok: false, reason: 'unreadable' }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}

/** The server's check on lines a browser read from a sheet: the shape, sizes and money it may store. */
export function cleanLines(input: unknown): RefLine[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 500) return null
  const out: RefLine[] = []
  for (const x of input as Record<string, unknown>[]) {
    const name = typeof x?.name === 'string' ? x.name.trim().slice(0, 200) : ''
    const qty = typeof x?.qty === 'number' && Number.isFinite(x.qty) && x.qty > 0 && x.qty < 1e6 ? x.qty : 1
    const amount = typeof x?.amountMinor === 'number' && Number.isFinite(x.amountMinor) ? Math.round(x.amountMinor) : NaN
    if (!name || !(amount >= 0) || amount > 1e10) return null
    out.push({ name, qty, amountMinor: amount,
      trade: typeof x.trade === 'string' && x.trade.trim() ? x.trade.trim().slice(0, 80) : 'Other',
      room: typeof x.room === 'string' && x.room.trim() ? x.room.trim().slice(0, 80) : null,
      unit: typeof x.unit === 'string' && x.unit.trim() ? x.unit.trim().slice(0, 20) : null })
  }
  return out
}
