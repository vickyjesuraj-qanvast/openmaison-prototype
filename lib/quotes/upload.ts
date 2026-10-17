/**
 * (REG-627, quote editor parity Q-16) Upload a quote — the Create Quote window's stand-in for 1.0's Quote Digitizer. A spreadsheet
 * (XLSX · CSV) is read for real, through the paste mapping's own guesses (lib/quotes/clipboard.ts). (S42 B·4 · E-05 · D-08 · D·2) A PDF is
 * read from its OWN WORDS by rule — S21's reader (lib/quotes/pdf-quote.ts `readQuoteText`) — and one of the owner's three reference quotes
 * is recognised by those words (lib/xray/reference.ts `referenceInText`), never by the file's name: an empty file, or a stranger's file
 * named like a reference, is never read as the demo's quote. A photo or a scanned page has no words — said, and nothing is read (a model
 * with OCR is the developers', at `readQuoteText`). Every Upload a quote reads through here: Create Quote, a variation order from a
 * contractor's quote, the schedule's uploaded quote and the website's free trial (`readQuoteUpload` in ./read-upload.ts). Client-safe, no DOM.
 */
import { guessColumns, guessHeader, toLines, toNumber, type PasteLine } from './clipboard'
import { currencyOf, currencySign, type QuoteText } from './pdf-quote'
import type { RefQuote } from '@/lib/xray/reference'

export type UploadGroup = { name: string | null; lines: PasteLine[] }
/** `scan` — a photo or a PDF of pictures, no words to read; `currency` — a quote in another currency (S$ only, S21's hard stop). */
export type UploadRead = { ok: true; source: string; groups: UploadGroup[]; count: number; totalMinor: number } | { ok: false; reason: 'unreadable' | 'empty' | 'scan' | 'currency'; currency?: string }

/** (S42 B·4 · E-05) What Upload a quote reads for real — a spreadsheet or a PDF with words; nothing is accepted only to be refused. */
export const UPLOAD_ACCEPT = '.xlsx,.csv,.pdf'
/** (S42 B·4) The words every Upload a quote door says (the chips, the drop zones, the help lines). */
export const UPLOAD_KINDS = 'XLSX · CSV · PDF'
export const isSheet = (name: string) => /\.(xlsx|xls|csv)$/i.test(name)
/** (S42 B·4 · E-05) Why a file read nothing, under the file's name — one sentence for each reason; `otherwise` is the door's own way out. */
export function unreadHelp(r: { reason: 'unreadable' | 'empty' | 'scan' | 'currency'; currency?: string }, otherwise: string): string {
  if (r.reason === 'empty') return 'The file has no lines we could use.'
  if (r.reason === 'scan') return 'It has no words to read — a photo or a scanned page. A PDF made from the quote, or a spreadsheet of its lines, reads best.'
  if (r.reason === 'currency') return `It is in ${r.currency ?? 'another currency'} — quotes here are in S$.`
  return `Upload a spreadsheet (XLSX · CSV) or a PDF of the quote’s lines${otherwise ? `, ${otherwise}` : ''}.`
}

const lineTotal = (l: PasteLine) => Math.round((l.qty ?? 1) * ((l.costMinor ?? 0) + (l.markupMinor ?? 0)) * (1 - (l.discountPct ?? 0) / 100))
function summarise(source: string, groups: UploadGroup[]): UploadRead {
  const lines = groups.flatMap((g) => g.lines)
  if (!lines.length) return { ok: false, reason: 'empty' }
  return { ok: true, source, groups, count: lines.length, totalMinor: lines.reduce((s, l) => s + lineTotal(l), 0) }
}

/** (pending modules S21) A row that states the quote's figures rather than work: "Sub-total", "Total", "GST 9%", "Less discount", "Grand total". */
const SUMMARY_NAME = /^(?:sub[\s-]?total|total(?:\s+(?:amount|price|cost|payable|due|renovation(?:\s+amount)?))?|grand\s+total|nett?\s+total|gst(?:\s*@?\s*\d+(?:\.\d+)?\s*%)?|(?:less\s*:?\s*)?(?:special\s+)?discount|amount\s+due)\s*:?$/i
/** (pending modules S21) A header naming the line's amount — "Amount", "Total", "Line total", "Amount (S$)". The paste mapping leaves it out
    (the quote derives its totals), so a sheet that states only amounts read every line at S$0 — its own column now prices the line. */
const AMOUNT_HEAD = /^(?:amount|total|line total|total amount|sum|sub ?total|nett|total price|price total|total cost)$/
const headText = (c: string) => c.toLowerCase().replace(/\(\s*(?:s\$|sgd|rm|myr|usd|us\$|\$)\s*\)|s\$|\$/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** What a sheet states beside its lines — each line's own amount (by the line), the totals it states, the currency it names. */
export type SheetDetail = { read: UploadRead; stated: Map<PasteLine, number>; /** the sheet states a rate (a Cost / Rate / Unit price column) */ priced: boolean; statedTotals: { subtotalMinor: number | null; totalMinor: number | null; gstMinor: number | null; discountMinor: number | null }; currency: string | null }

/** A sheet's rows: the header guessed as the paste dialog guesses it; the lines grouped by their category (a trade), else their section label. */
export function readRows(rows: string[][], source: string): UploadRead {
  return readSheet(rows, source).read
}

/**
 * The same reading with what the sheet states (pending modules S21): a line's Amount column is kept beside it — it prices a line the sheet
 * gives no rate for, and Quote X-Ray reads it as the line's stated amount (1.0's arithmetic check); a Sub-total / Total / GST / Discount row
 * is the sheet's own figure, never a line.
 */
export function readSheet(rows: string[][], source: string): SheetDetail {
  const statedTotals: SheetDetail['statedTotals'] = { subtotalMinor: null, totalMinor: null, gstMinor: null, discountMinor: null }
  const stated = new Map<PasteLine, number>()
  const clean = rows.filter((r) => r.some((c) => c.trim() !== ''))
  const currency = currencyOf(clean.slice(0, 60).flat().join(' '))
  const none = (reason: 'unreadable' | 'empty'): SheetDetail => ({ read: { ok: false, reason }, stated, priced: false, statedTotals, currency })
  if (!clean.length) return none('empty')
  const width = clean.reduce((w, r) => Math.max(w, r.length), 0)
  const padded = clean.map((r) => { const out = r.map((c) => c.trim()); while (out.length < width) out.push(''); return out })
  /* (pending modules S19) a sheet whose one row is its header ("Item, Qty") has no lines — the header guess needs a row under it, so the
     header was read as a line called "Item" (and a quote read charged for it) */
  if (padded.length === 1 && guessHeader([padded[0]!, padded[0]!.map(() => '')]) !== null) return none('empty')
  const header = guessHeader(padded)
  const map = header ?? guessColumns(padded)
  const amountCol = header ? padded[0]!.findIndex((c, i) => map[i] === 'skip' && AMOUNT_HEAD.test(headText(c))) : -1
  const priced = map.includes('cost') || map.includes('unitPrice')
  const data = padded.slice(header ? 1 : 0)
  const parsed = toLines(padded, map, header !== null)
  const lines: PasteLine[] = []
  parsed.forEach((l, i) => {
    const row = data[i] ?? []
    const amount = amountCol >= 0 ? toNumber(row[amountCol] ?? '') : null
    const amountMinor = amount === null ? null : Math.round(amount * 100)
    /* a figures row: its amount is the sheet's own total, never work */
    if (SUMMARY_NAME.test(l.name.trim()) && l.qty === undefined) {
      const fig = amountMinor ?? (l.costMinor !== undefined ? l.costMinor + (l.markupMinor ?? 0) : null)
      if (fig !== null) {
        const n = l.name.toLowerCase()
        if (/^gst/.test(n)) statedTotals.gstMinor = Math.abs(fig)
        else if (/discount/.test(n)) statedTotals.discountMinor = Math.abs(fig)
        else if (/^grand|^nett?|payable|due/.test(n)) statedTotals.totalMinor = Math.abs(fig)
        else if (statedTotals.subtotalMinor === null) statedTotals.subtotalMinor = Math.abs(fig)
        else statedTotals.totalMinor = Math.abs(fig)
      }
      return
    }
    if (amountMinor !== null && amountMinor >= 0) {
      stated.set(l, amountMinor)
      /* no rate on the sheet: the amount is the line's price, split over its quantity so quantity × price is the amount again */
      if (!priced) { const q = l.qty && l.qty > 0 ? l.qty : 1; l.costMinor = Math.round(amountMinor / q); l.markupMinor = 0 }
    }
    lines.push(l)
  })
  const byName = new Map<string, UploadGroup>()
  const loose: PasteLine[] = []
  for (const l of lines) {
    const name = (l.category || l.section || '').trim()
    if (!name) { loose.push(l); continue }
    const key = name.toLowerCase()
    const g = byName.get(key) ?? { name, lines: [] }
    g.lines.push(l); byName.set(key, g)
  }
  return { read: summarise(source, [...byName.values(), ...(loose.length ? [{ name: null, lines: loose }] : [])]), stated, priced, statedTotals, currency }
}

/** (S42 E-05) A reference quote the file's own words are: its lines by trade — each amount taken as the unit price, the paste rule (cost, no markup). */
export function referenceRead(ref: RefQuote): UploadRead {
  const byTrade = new Map<string, UploadGroup>()
  for (const r of ref.lines) {
    const qty = r.qty > 0 ? r.qty : 1
    const g = byTrade.get(r.trade) ?? { name: r.trade, lines: [] }
    g.lines.push({ name: r.name.slice(0, 200), qty, unit: r.unit, costMinor: Math.round(r.amountMinor / qty), markupMinor: 0, category: r.trade, room: r.room, description: r.brand ? `Brand: ${r.brand}` : null })
    byTrade.set(r.trade, g)
  }
  return summarise(`${ref.studio}’s quote`, [...byTrade.values()])
}

/**
 * (S42 B·4 · E-05) A PDF's own words, read by rule (S21's `readQuoteText`): its sections as the trades, each line with its quantity, unit and
 * price — the rate it states, else its amount over its quantity (the paste rule: cost, no markup); a line printing FOC or Inclusive comes in at
 * S$0 with the word as its description. Nothing priced, or another currency, reads nothing — and says why.
 */
export function textRead(t: QuoteText, fileName: string): UploadRead {
  if (t.currency && t.currency !== 'SGD') return { ok: false, reason: 'currency', currency: currencySign(t.currency) }
  if (!t.lines.some((l) => l.amountMinor > 0)) return { ok: false, reason: 'empty' }
  const bySection = new Map<string, UploadGroup>()
  const loose: PasteLine[] = []
  for (const l of t.lines.slice(0, 500)) {
    const qty = l.qty && l.qty > 0 ? l.qty : 1
    const price = l.rateMinor && l.qty && l.qty > 0 ? l.rateMinor : Math.round(Math.max(0, l.amountMinor) / qty)
    const line: PasteLine = { name: l.name.slice(0, 200), qty, unit: l.unit, costMinor: price, markupMinor: 0, category: l.section, room: l.room, description: l.word }
    if (!l.section) { loose.push(line); continue }
    const key = l.section.toLowerCase()
    const g = bySection.get(key) ?? { name: l.section, lines: [] }
    g.lines.push(line); bySection.set(key, g)
  }
  return summarise(t.studio ? `${t.studio}’s quote` : fileName.replace(/\.pdf$/i, ''), [...bySection.values(), ...(loose.length ? [{ name: null, lines: loose }] : [])])
}

/** The snackbar once the quote is made: its lines and where they came from — (pending modules S12) or, when some took their cost from My Items
    at once (their sure match, lib/quotes/book-fill.ts), how many did; the rest wait in the Items table's *Match lines*. */
export const uploadedLine = (read: { count: number; source: string }, matched: number) =>
  matched ? `Quote created with ${read.count} lines — ${matched} took ${matched === 1 ? 'its' : 'their'} cost from My Items` : `Quote created with ${read.count} lines from ${read.source}`
