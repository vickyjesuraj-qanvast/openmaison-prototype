/**
 * (REG-627, quote editor parity Q-16) Upload a quote — the Create Quote window's stand-in for 1.0's Quote Digitizer. A spreadsheet
 * (XLSX · CSV) is read for real, through the paste mapping's own guesses (lib/quotes/clipboard.ts); a PDF or a photo is read the way the
 * X-Ray and the template upload read it — one of the owner's three reference quotes by its file name (lib/xray/reference.ts) — and any
 * other is "one we couldn't read". The reading of arbitrary PDFs and photos is the platform's. Client-safe, no DOM.
 */
import { guessColumns, guessHeader, toLines, type PasteLine } from './clipboard'
import { readOtherQuote } from '@/lib/xray/reference'

export type UploadGroup = { name: string | null; lines: PasteLine[] }
export type UploadRead = { ok: true; source: string; groups: UploadGroup[]; count: number; totalMinor: number } | { ok: false; reason: 'unreadable' | 'empty' }

export const UPLOAD_ACCEPT = '.pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png'
export const isSheet = (name: string) => /\.(xlsx|xls|csv)$/i.test(name)

const lineTotal = (l: PasteLine) => Math.round((l.qty ?? 1) * ((l.costMinor ?? 0) + (l.markupMinor ?? 0)) * (1 - (l.discountPct ?? 0) / 100))
function summarise(source: string, groups: UploadGroup[]): UploadRead {
  const lines = groups.flatMap((g) => g.lines)
  if (!lines.length) return { ok: false, reason: 'empty' }
  return { ok: true, source, groups, count: lines.length, totalMinor: lines.reduce((s, l) => s + lineTotal(l), 0) }
}

/** A sheet's rows: the header guessed as the paste dialog guesses it; the lines grouped by their category (a trade), else their section label. */
export function readRows(rows: string[][], source: string): UploadRead {
  const clean = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (!clean.length) return { ok: false, reason: 'empty' }
  const width = clean.reduce((w, r) => Math.max(w, r.length), 0)
  const padded = clean.map((r) => { const out = r.map((c) => c.trim()); while (out.length < width) out.push(''); return out })
  const header = guessHeader(padded)
  const lines = toLines(padded, header ?? guessColumns(padded), header !== null)
  const byName = new Map<string, UploadGroup>()
  const loose: PasteLine[] = []
  for (const l of lines) {
    const name = (l.category || l.section || '').trim()
    if (!name) { loose.push(l); continue }
    const key = name.toLowerCase()
    const g = byName.get(key) ?? { name, lines: [] }
    g.lines.push(l); byName.set(key, g)
  }
  return summarise(source, [...byName.values(), ...(loose.length ? [{ name: null, lines: loose }] : [])])
}

/** A PDF or a photo: one of the reference quotes, its lines by trade — each amount taken as the unit price, the paste rule (cost, no markup). */
export function readDocument(fileName: string): UploadRead {
  const ref = readOtherQuote(fileName)
  if (!ref) return { ok: false, reason: 'unreadable' }
  const byTrade = new Map<string, UploadGroup>()
  for (const r of ref.lines) {
    const qty = r.qty > 0 ? r.qty : 1
    const g = byTrade.get(r.trade) ?? { name: r.trade, lines: [] }
    g.lines.push({ name: r.name.slice(0, 200), qty, unit: r.unit, costMinor: Math.round(r.amountMinor / qty), markupMinor: 0, category: r.trade, room: r.room, description: r.brand ? `Brand: ${r.brand}` : null })
    byTrade.set(r.trade, g)
  }
  return summarise(`${ref.studio}’s quote`, [...byTrade.values()])
}
