/**
 * "Recreate from my current quote" (REG-491): the studio uploads the quote it sends today; the build matches it to the
 * house style that reproduces it. Client-safe.
 *
 * (pending modules S11 — card held:quote-templates, "Recreate a template from an uploaded quote — stand-in (three curated PDFs)") A PDF is now
 * READ, by rule, from its own words (pdf.js in the browser, `readQuoteFile`): its paper, the words its table heads its columns with (and whether
 * it names a trade and an area on every line), how long it stays valid, how it words its grand total, and the phrases that mark each house
 * style. What it read is laid onto the new template (`applyReading`) and every reason the dialog gives is something it found. A photo or scan
 * has no words to read without a model — (S43B · F1-02) nothing is claimed for it: the studio picks the design that looks closest, and the dialog
 * says so (it was matched by its name, called a "Strong match", with a reference quote's reasons). Nothing is sent anywhere; no AI
 * credits (1.0 had no such reader). The seam for a developer's model reading pictures: `readLayout` takes lines from anywhere.
 */
import { ITEM_COLUMN_KEYS, PAPERS, type ItemsBlock, type ItemsColumn, type ItemsColumnKey, type Paper, type TemplateDefaults, type TemplateDesign } from './model'
import type { PresetKey } from './presets'

export type SourceFile = { name: string; type: string; size: number; data: string | null }
export const MAX_KEPT_BYTES = 6 * 1024 * 1024   // a reference kept inline (data URI) up to 6 MB; larger files keep their name only

export function parseSourceFile(raw: string | null | undefined): SourceFile | null {
  if (!raw) return null
  try {
    const j = JSON.parse(raw) as Partial<SourceFile>
    if (typeof j.name !== 'string') return { name: raw, type: '', size: 0, data: null }
    return { name: j.name, type: typeof j.type === 'string' ? j.type : '', size: typeof j.size === 'number' ? j.size : 0, data: typeof j.data === 'string' ? j.data : null }
  } catch { return { name: raw, type: '', size: 0, data: null } }
}

/** What reading a quote found that the new template takes on. */
export type Reading = {
  paper?: Paper
  /** the table's columns in the order the quote prints them, with its own words */
  columns?: { key: ItemsColumnKey; label: string }[]
  /** every line names its trade / its area — the template groups by trade, then splits by room */
  groupByTrade?: boolean; splitByRoom?: boolean
  /** "valid for 14 days" */
  validityDays?: number
  /** the words before the grand total, as written ("GRAND TOTAL:") */
  grandTotal?: string
}
/** `by` — how it was matched: 'words' (its own words, read by rule) · 'picture' (a photo, a scan or a PDF of pictures: nothing could be read,
    so nothing is claimed — the studio picks the design that looks closest). (S43B · F1-02) A file's NAME is never read. */
export type Match = { key: PresetKey; confidence: 'high' | 'good' | 'fair'; reasons: string[]; reading?: Reading; by?: 'words' | 'picture' }

/** (S43B · F1-02 — his "fix all the pending things" 2026-10-15, as recommended; E-05's family) Nothing to read: the studio picks. The most
    common shape (Letter) is offered first, and the reasons say only what is true — never a reference quote's lines it never saw. */
export function unreadMatch(why: string): Match {
  return { key: 'letter', confidence: 'fair', by: 'picture', reasons: [why] }
}

/* ── reading a quote's words ── */

/** The column words studios head their tables with, per column of the Items block. "Item" is the number column when a description sits beside it. */
const COLUMN_WORDS: { key: ItemsColumnKey | 'trade' | 'area'; re: RegExp }[] = [
  { key: 'no', re: /^(s\/?\s?no?\.?|no\.?|item\s*no\.?|#|ref\.?)$/i },
  { key: 'item', re: /^(descriptions?|items?|scope(\s+of\s+works?)?|work\s+descriptions?|particulars|details|description\s+of\s+works?|item\s+descriptions?)$/i },
  { key: 'qty', re: /^(qty\.?|quantity|quantities)$/i },
  { key: 'unit', re: /^(units?|uom|unit\s+of\s+measure)$/i },
  { key: 'unitPrice', re: /^(rate|unit\s+price|price|u\/\s?price|unit\s+rate|unit\s+cost|rate\s*\(s?\$\))$/i },
  { key: 'discount', re: /^(disc\.?|discount)$/i },
  { key: 'total', re: /^(amount|total|amount\s*\(?s?\$\)?|total\s*\(?s?\$\)?|sub-?\s?total|price\s*\(?s?\$\)?)$/i },
  { key: 'trade', re: /^(trade|trades|category|works?)$/i },
  { key: 'area', re: /^(area|room|location|space)$/i },
]
const cellsOf = (line: string) => line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean)

function readColumns(lines: string[]): Pick<Reading, 'columns' | 'groupByTrade' | 'splitByRoom'> | null {
  for (const line of lines.slice(0, 120)) {
    const cells = cellsOf(line)
    if (cells.length < 2 || cells.length > 9) continue
    const hits = cells.map((c) => ({ c, k: COLUMN_WORDS.find((w) => w.re.test(c))?.key ?? null }))
    if (hits.some((h) => !h.k)) continue   // a heading row names only columns
    const keys = hits.map((h) => h.k!)
    // "ITEM | WORK DESCRIPTION | AMOUNT": the first "Item" is the number column when another cell is the description
    const items = hits.filter((h) => h.k === 'item')
    if (items.length > 1) { const first = items.find((h) => /^items?$/i.test(h.c)); if (first) first.k = 'no' }
    if (!keys.includes('item') || !keys.some((k) => k === 'total' || k === 'unitPrice' || k === 'qty')) continue
    const cols: { key: ItemsColumnKey; label: string }[] = []
    const hasQty = hits.some((h) => h.k === 'qty')
    for (const h of hits) {
      if (h.k === 'trade' || h.k === 'area') continue
      const key = (h.k === 'unit' && !hasQty ? 'qtyUnit' : h.k) as ItemsColumnKey   // a Unit column with no Qty prints "1 Lot"
      if (!cols.some((c) => c.key === key)) cols.push({ key, label: h.c.slice(0, 40) })
    }
    return { columns: cols, ...(keys.includes('trade') ? { groupByTrade: true } : {}), ...(keys.includes('area') ? { splitByRoom: true } : {}) }
  }
  return null
}
const VALIDITY = /\bvalid(?:ity)?\b[^.\n]{0,24}?(\d{1,3})\s*(?:calendar\s+|working\s+)?days?\b/i
const GRAND_TOTAL = /^(grand\s+total|total\s+amount|total\s+payable|nett?\s+total|total)\s*:?\s*(?:s?\$\s*)?[\d,]+(?:\.\d{2})?$/i

/** The phrases that mark each house style in a quote's words; strong ones count twice. */
const SIGNS: { key: PresetKey; re: RegExp; strong?: boolean; says: string }[] = [
  { key: 'letter', re: /\bdear\s+(sir|mdm|madam)/i, strong: true, says: 'a letter’s greeting' },
  { key: 'letter', re: /\bsales\s+contract\b/i, strong: true, says: '“Sales Contract”' },
  { key: 'letter', re: /\bwe\s+are\s+(pleased\s+)?to\s+submit\b/i, says: 'a letter’s opening line' },
  { key: 'letter', re: /\bcontract\s+for\s+(the\s+)?renovation/i, says: 'a contract’s subject line' },
  { key: 'scope', re: /\bscope\s+of\s+works?\b/i, strong: true, says: '“Scope of work”' },
  { key: 'scope', re: /\bsub-?\s?total\s+for\b/i, strong: true, says: 'a sub-total after each section' },
  { key: 'scope', re: /^remarks\b/i, says: 'a Remarks block' },
  { key: 'scope', re: /\bconfirmed\s+(&|and)\s+agreed\b/i, says: '“Confirmed & agreed”' },
  { key: 'form', re: /\btotal\s+for\s+page\b/i, strong: true, says: 'a total for every page' },
  { key: 'form', re: /\bcompany\s+stamp\b/i, strong: true, says: 'a company stamp beside the signatures' },
  { key: 'form', re: /\bdesigner'?s\s+signature\b/i, says: 'a designer’s signature box' },
  { key: 'form', re: /\bwork\s+description\b/i, says: '“Work description”' },
  { key: 'presentation', re: /\byour\s+investment\b|\binvestment\s+summary\b/i, strong: true, says: 'an investment summary' },
  { key: 'presentation', re: /\bmood\s?board\b/i, says: 'a moodboard' },
  { key: 'presentation', re: /^prepared\s+for\b/i, says: '“Prepared for”' },
]
const NAME: Record<PresetKey, string> = { letter: 'a letter', scope: 'a scope quotation', form: 'a boxed form', presentation: 'a presentation' }

/** A quote's layout from its words — the house style it is nearest and what the new template takes from it. */
export function readLayout(input: { lines: string[]; pages: number; size: { w: number; h: number } | null; firstPageLines: number }): Match {
  const lines = input.lines.map((l) => l.trim()).filter(Boolean)
  const reading: Reading = {}
  const facts: string[] = []
  /* the paper, from the first page's size in points */
  if (input.size) {
    const [a, b] = [Math.min(input.size.w, input.size.h), Math.max(input.size.w, input.size.h)]
    const paper: Paper | null = Math.abs(a - 595) <= 8 && Math.abs(b - 842) <= 8 ? 'A4' : Math.abs(a - 612) <= 8 && Math.abs(b - 792) <= 8 ? 'Letter' : null
    if (paper) { reading.paper = paper; facts.push(`${paper} paper — the template prints on ${paper} too`) }
  }
  const cols = readColumns(lines)
  if (cols?.columns?.length) {
    reading.columns = cols.columns
    facts.push(`Its table’s columns — ${cols.columns.map((c) => c.label).join(' · ')} — become the template’s, in its words`)
    if (cols.groupByTrade) { reading.groupByTrade = true; reading.splitByRoom = !!cols.splitByRoom }
    if (cols.groupByTrade) facts.push(cols.splitByRoom ? 'Every line names its trade and its area — the lines are grouped by trade, then by room' : 'Every line names its trade — the lines are grouped by trade')
  }
  const valid = lines.map((l) => VALIDITY.exec(l)).find(Boolean)
  const days = valid ? Number(valid[1]) : NaN
  if (days >= 1 && days <= 365) { reading.validityDays = days; facts.push(`Valid for ${days} days — new quotes from the template start with that`) }
  const total = [...lines].reverse().map((l) => GRAND_TOTAL.exec(l)).find(Boolean)
  if (total?.[1]) { reading.grandTotal = total[1].replace(/\s+/g, ' ').trim(); facts.push(`Its grand total reads “${reading.grandTotal}”`) }

  /* the house style: the phrases found, and a cover page (a short first page before the rest) — (S43B · F1-02) never the file's name */
  const score: Record<PresetKey, number> = { letter: 0, scope: 0, form: 0, presentation: 0 }
  const found: Record<PresetKey, string[]> = { letter: [], scope: [], form: [], presentation: [] }
  for (const sign of SIGNS) if (lines.some((l) => sign.re.test(l))) { score[sign.key] += sign.strong ? 2 : 1; found[sign.key].push(sign.says) }
  if (input.pages >= 2 && input.firstPageLines > 0 && input.firstPageLines <= 6) { score.presentation += 2; found.presentation.push('a cover page') }
  const order: PresetKey[] = ['letter', 'scope', 'form', 'presentation']
  const best = order.reduce((b, k) => (score[k] > score[b] ? k : b), order[0]!)
  const top = score[best]
  if (top === 0) {
    /* nothing in its words points to a style: the most common shape, said so, with what was read */
    return { key: 'letter', confidence: 'fair', by: 'words', reading, reasons: ['Nothing in its words points to one design — Letter, the most common shape, is the closest', ...facts] }
  }
  const confidence: Match['confidence'] = top >= 3 ? 'high' : top === 2 ? 'good' : 'fair'
  return { key: best, confidence, by: 'words', reading, reasons: [`It reads as ${NAME[best]}: ${found[best].join(', ')}`, ...facts] }
}

/** A Reading as the server keeps it — only known keys and sane values (it arrives from the browser). */
export function parseReading(v: unknown): Reading | undefined {
  if (!v || typeof v !== 'object') return undefined
  const r = v as Record<string, unknown>
  const out: Reading = {}
  if (typeof r.paper === 'string' && (PAPERS as readonly string[]).includes(r.paper)) out.paper = r.paper as Paper
  if (Array.isArray(r.columns)) {
    const cols = r.columns.filter((c): c is { key: ItemsColumnKey; label: string } => !!c && typeof c === 'object' && (ITEM_COLUMN_KEYS as readonly string[]).includes((c as { key: string }).key) && typeof (c as { label: unknown }).label === 'string')
      .map((c) => ({ key: c.key, label: c.label.replace(/\s+/g, ' ').trim().slice(0, 40) }))
      .filter((c, i, all) => all.findIndex((x) => x.key === c.key) === i)
    if (cols.some((c) => c.key === 'item')) out.columns = cols.slice(0, 9)
  }
  if (r.groupByTrade === true) out.groupByTrade = true
  if (r.splitByRoom === true) out.splitByRoom = true
  if (typeof r.validityDays === 'number' && Number.isInteger(r.validityDays) && r.validityDays >= 1 && r.validityDays <= 365) out.validityDays = r.validityDays
  if (typeof r.grandTotal === 'string' && r.grandTotal.trim()) out.grandTotal = r.grandTotal.replace(/\s+/g, ' ').trim().slice(0, 30)
  return Object.keys(out).length ? out : undefined
}

/** The new template with what the reading found laid on: the paper, the table's columns in the quote's order and words, the grouping, the
    grand total's words, and (for new quotes) the days a quote stays valid. Everything else is the house style's. */
export function applyReading(design: TemplateDesign, defaults: TemplateDefaults, reading: Reading | undefined): { design: TemplateDesign; defaults: TemplateDefaults } {
  if (!reading) return { design, defaults }
  const blocks = design.blocks.map((b) => {
    if (b.kind === 'items' && (reading.columns?.length || reading.groupByTrade)) {
      const it: ItemsBlock = { ...b }
      if (reading.columns?.length) {
        const found = reading.columns
        const byKey = new Map(b.columns.map((c) => [c.key, c]))
        const first = found.map((f): ItemsColumn => ({ ...(byKey.get(f.key) ?? { key: f.key, label: f.label, on: true, width: f.key === 'item' ? 0 : 22, align: f.key === 'item' ? 'left' : 'right' }), label: f.label, on: true }))
        const rest = b.columns.filter((c) => !found.some((f) => f.key === c.key)).map((c) => ({ ...c, on: false }))
        it.columns = [...first, ...rest]
      }
      if (reading.groupByTrade) { it.groupBy = 'category'; it.subGroupBy = reading.splitByRoom ? 'room' : 'none' }
      return it
    }
    if (b.kind === 'totals' && reading.grandTotal) return { ...b, lines: b.lines.map((l) => (l.key === 'total' ? { ...l, label: reading.grandTotal!, on: true } : l)) }
    return b
  })
  return {
    design: { ...design, page: reading.paper ? { ...design.page, paper: reading.paper } : design.page, blocks },
    defaults: reading.validityDays ? { ...defaults, validityDays: reading.validityDays } : defaults,
  }
}
