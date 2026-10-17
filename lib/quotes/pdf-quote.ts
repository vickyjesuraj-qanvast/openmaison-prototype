/**
 * (pending modules S21 — card held:quote-x-ray: "a model reading any PDF or photo of the other quote … developers' lane") A quote's lines read
 * from its own words, by rule — the job 1.0 gave its model (src/lib/quote-parse/parse-file.ts: a digital PDF's text layer → section headings
 * as the trades, each priced line with its quantity, unit, rate and amount, FOC · Inclusive · By client · KIV as words, the sub-total and
 * total rows left out, the letterhead's studio, the totals the quote states). Pure and client-safe: the words come from pdf.js in the browser
 * (lib/pdf-text.ts `pdfLines` — a wide gap between words is a column break, "  "; a page ends with a blank line).
 * A photo or a scanned page has no words, so nothing is read here — the developers' reader (a model with OCR) plugs in at `readQuoteText`.
 * The reading never guesses a figure: a line it can't price is left as words, and the X-Ray's tile says whether the lines it read come to the
 * total the quote states.
 */

export type TextLine = {
  /** The trade heading the line sits under ("Carpentry Works"), else null. */ section: string | null
  /** The area sub-heading or the Area column ("Kitchen"), else null. */ room: string | null
  name: string; qty: number | null; unit: string | null
  /** The rate the line states (a unit price), only when it states a quantity too — what 1.0's arithmetic check reads. */ rateMinor: number | null
  /** The line's amount as stated; 0 for a line printing a word or no price. */ amountMinor: number
  /** FOC · Inclusive · By client · KIV · Lump sum — the word printed instead of an amount. */ word: string | null
}
export type QuoteText = {
  studio: string | null
  /** The currency the quote is written in when it names one (SGD · MYR · USD · AED · INR), else null. */ currency: string | null
  lines: TextLine[]
  /** What the quote states: its sub-total (before GST), its grand total, GST and a discount — for the reading's own check. */
  subtotalMinor: number | null; totalMinor: number | null; gstMinor: number | null; discountMinor: number | null
}

const MAX_LINES = 500

/* ── figures and words ──────────────────────────────────────────────────────────────────────────────────────────────────── */

const CUR = '(?:S\\$|SGD|US\\$|USD|RM|MYR|\\$)'
const MONEY_RE = new RegExp(`^([-−–])?\\s?(?:${CUR}\\s?)?([-−–])?\\s?(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)$`, 'i')
/** "S$1,820.00" · "$ 1,820.00" · "1,500" · "800" · "−$304.13" → minor units (negative kept); null when the cell is not a figure. */
export function figure(s: string): number | null {
  const m = MONEY_RE.exec(s.trim())
  if (!m) return null
  const n = Number(m[3]!.replace(/,/g, ''))
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) * (m[1] || m[2] ? -1 : 1)
}
const hasCurrency = (s: string) => new RegExp(`^[-−–]?\\s?${CUR}`, 'i').test(s.trim())
const PRICE_WORDS: [RegExp, string][] = [
  [/^(?:f\.?\s?o\.?\s?c\.?|free(?:\s+of\s+charge)?|complimentary)$/i, 'FOC'],
  [/^(?:inclusive|included|incl\.?|include)$/i, 'Inclusive'],
  [/^by\s+(?:client|owner|homeowner|others?)$/i, 'By client'],
  [/^(?:k\.?i\.?v\.?|tba|tbc|to\s+be\s+(?:advised|confirmed))$/i, 'KIV'],
  [/^(?:lump\s?sum|lum\s?sum|l\/s)$/i, 'Lump sum'],
]
const priceWord = (s: string) => PRICE_WORDS.find(([re]) => re.test(s.trim()))?.[1] ?? null
const UNIT_RE = /^(?:sq\.?\s?ft\.?|sqft|sf|psf|ft\.?\s?run|run\s?ft|ft\.?|feet|rft|lft|sq\.?\s?m|sqm|m2|m²|m|lm|rm|metres?|meters?|pts?\.?|points?|pcs?\.?|pieces?|nos?\.?|units?|sets?|lots?|ls|ea|each|pairs?|rolls?|panels?|boxes?|bags?|trips?|days?|hrs?|hours?|mths?|months?|doors?|windows?|leaves?|bays?)$/i
const QTY_RE = /^\d{1,5}(?:\.\d{1,2})?$/
const QTY_UNIT_RE = /^(\d{1,5}(?:\.\d{1,2})?)\s?([a-z][a-z.\s²2/]{0,10})$/i
function qtyUnit(s: string): { qty: number; unit: string } | null {
  const m = QTY_UNIT_RE.exec(s.trim())
  if (!m || !UNIT_RE.test(m[2]!.trim())) return null
  return { qty: Number(m[1]), unit: m[2]!.trim() }
}
/** "1" · "1." · "12)" · "A1" · "a." · "(b)" · "iv." — an item's own number at the start of its line. */
const ITEM_NO_RE = /^(?:\(?\d{1,3}(?:\.\d{1,2})?[.)]?|\(?[a-z]\d{1,2}[.)]?|\(?[a-z][.)]|\(?[ivx]{1,4}[.)])$/i
const BULLET_RE = /^[◙■●▪►•∙·*–-]\s*/

/* ── what a line is ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const TRADE_WORD = /\b(works?|hacking|demolish\w*|dismantl\w*|masonry|tiling|tiles?|carpentry|joinery|cabinetry|plumbing|sanitary|electrical|lighting|painting|paint|ceiling|partition|plaster\w*|glass\w*|mirror|windows?|doors?|flooring|vinyl|parquet|laminate|cleaning|services?|design|professional|aircon|air[\s-]?con\w*|ducting|metal|aluminium|steel|countertop|tabletop|worktop|miscellaneous|misc|preliminar\w*|curtains?|blinds?|film|roof|awning|stone|marble|waterproof\w*|authority|submissions?|haulage|protection|furniture|appliances?|accessories|package|gifts?)\b/i
/** A Title Case band names its trade at its end ("Wet Works", "Professional Services", "Carpentry") — a wrapped line that merely mentions
    one ("Nippon Paint Odourless") is not a heading. */
const HEADING_END = /^(?:works?|services?|package|gifts?|items?|consultation|consultancy|management|fees?|preliminar\w*|carpentry|joinery|plumbing|electrical|painting|masonry|hacking|tiling|flooring|cleaning|glass\w*|countertops?|tabletops?|ceilings?|partitions?|miscellaneous|misc\.?|aircon|ducting|demolition|protection|submissions?|haulage|furniture|appliances|accessories|curtains|blinds|windows|doors|waterproofing|plastering|design|lighting)$/i
const ROOM_WORD = /\b(kitchen|bed\s?rooms?|bath\s?rooms?|toilets?|wc|living|dining|study|balcony|yard|foyer|entrance|stair\w*|corridor|common|master|shelter|store\s?room|store|utility|powder|laundry|walk-in|patio|terrace|attic|basement|level|floor|whole\s+unit|entire\s+unit|general|guest|junior|household|family|room|area|hall)\b/gi
const SUMMARY_RE = /^(?:total\s+for\s+page|page\s+total|sub[\s-]?total|total|grand\s+total|nett?\s+total|gst|add\s*:?\s*gst|(?:less\s*:?\s*)?(?:special\s+)?discount|less|amount\s+(?:due|payable)|balance\s+due)\b/i
const ENDS_ITEMS = /^(?:terms?\s+(?:and|&)\s+conditions?|standard\s+terms|payment\s+(?:schedule|terms)|optional\s+(?:works?|items?)|remarks?\s*:?$|notes?\s*:?$)/i
const PAYMENT_RE = /\d+(?:\.\d+)?\s?%/
const PAYMENT_WORD = /\b(deposit|upon|commencement|completion|handover|progress|payment|signing|confirmation|delivery|installation|balance|final|stage)\b/i
/** A letterhead's or a footer's line — a phone or fax number, an address, a registration number, an email, a page count. Never an aircon's
    "2.5 HP": a phone word counts only beside a number that is a phone's. */
const CONTACT_RE = /(?:\b(?:tel|fax|h\/p|mobile|phone|contact|whatsapp)\b\.?\s*(?:no\.?)?\s*[:.]?\s*\+?\d[\d\s-]{6,})|\S+@\S+\.\S+|www\.|https?:\/\/|\b(?:uen|co\.?\s*reg(?:istration)?\.?\s*(?:no\.?)?|gst\s*reg(?:istration)?\.?\s*(?:no\.?)?)\b|\bpage\s+\d+\s+of\s+\d+\b|^\d+\s+of\s+\d+$|singapore\s+\d{6}/i
const TITLE_RE = /^(?:quotation|quote|sales\s+contract|contract|tax\s+invoice|invoice|estimate|estimation|proposal|scope\s+of\s+works?)$/i
const COMPANY_RE = /\b(pte\.?\s*ltd\.?|pte|llp|sdn\.?\s*bhd\.?|studio|interiors?|design|renovation|works|build\w*|living|concepts?|homes?|atelier|group|creations?|space|decor|carpentry|contractor)\b/i
const LEGAL_RE = /[\s,]*(?:\(?\s*(?:pte\.?\s*ltd\.?|private\s+limited|llp|sdn\.?\s*bhd\.?)\s*\)?)\s*/gi

const SMALL = new Set(['and', 'of', 'the', 'for', 'to', 'in', 'on', 'at', 'with', 'by', 'or'])
/** "HACKING & DEMOLISHING WORKS" → "Hacking & Demolishing Works"; a short word in capitals stays (BTO · WC · DB · TV). */
function tidyCase(s: string): string {
  if (s !== s.toUpperCase() || !/[A-Z]/.test(s)) return s
  return s.split(/(\s+)/).map((w, i) => {
    if (/^\s+$/.test(w) || !/[A-Z]/.test(w)) return w
    const lw = w.toLowerCase()
    if (i > 0 && SMALL.has(lw)) return lw
    if (w.replace(/[^A-Z]/g, '').length <= 3 && !SMALL.has(lw)) return w
    return lw.replace(/(^|[-/(])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase())
  }).join('')
}
const words = (s: string) => s.split(/\s+/).filter(Boolean)
/**
 * A heading: short, no price, not a sentence. A trade band — lettered ("A  HACKING WORKS", "B. Masonry"), in capitals ("CARPENTRY WORKS"),
 * or in Title Case ending with its trade ("Wet Works", "◙ Professional Services ◙") — or an area ("Kitchen", "Master Bedroom", "1st Floor").
 */
function heading(cols: string[]): { kind: 'trade' | 'room'; name: string } | null {
  let lettered = false
  let t = cols.join(' ')
  if (cols.length >= 2 && /^[A-Z]\d?[.)]?$/.test(cols[0]!)) { lettered = true; t = cols.slice(1).join(' ') }
  else {
    /* "B. Masonry" — or "A CARPENTRY WORKS" with one space, when the letter and its band were written as one run: the letter goes only when
       what follows is a band on its own (capitals, or Title Case ending with its trade) — "A lot of tiles" keeps its "A" */
    const m = /^([A-Z]\d?)([.)]?)\s+(\S.*)$/.exec(t)
    const rest = m?.[3] ?? ''
    const band = !!rest && ((rest === rest.toUpperCase() && /[A-Z]{3}/.test(rest)) || (words(rest).every((w) => /^[A-Z0-9&(\-–/]/.test(w) || SMALL.has(w.toLowerCase())) && HEADING_END.test((words(rest).pop() ?? '').replace(/[^A-Za-z.]/g, ''))))
    if (m && (m[2] || band)) { lettered = true; t = rest }
  }
  t = t.replace(BULLET_RE, '').replace(/\s*[◙■●▪►]+\s*$/, '').replace(/:$/, '').trim()
  /* "Carpentry Works — Package Pricing": the band is what comes before its dash or colon */
  const lead = /^(.+?)\s+[—–-]\s+\S|^(.+?):\s+\S/.exec(t)
  if (lead) { const head = heading([(lead[1] ?? lead[2])!]); if (head) return head }
  const ws = words(t)
  if (!t || t.length > 60 || ws.length > 8 || /[.;,]$/.test(t) || /\d{3,}/.test(t)) return null
  if (!/^(?:[A-Z(]|\d+(?:st|nd|rd|th)\b)/.test(t) || SMALL.has(ws[0]!.toLowerCase())) return null
  const titled = ws.every((w) => /^[A-Z0-9&(\-–/]/.test(w) || SMALL.has(w.toLowerCase()))
  const caps = t === t.toUpperCase() && /[A-Z]{3}/.test(t)
  if (!titled && !caps && !lettered) return null
  const rest = t.replace(ROOM_WORD, ' ').replace(/\b\d+(?:st|nd|rd|th)?\b|[&/,()\-–]|\band\b/gi, ' ').trim()
  if (!rest && t.match(ROOM_WORD)) return { kind: 'room', name: tidyCase(t) }
  if (lettered || (caps && ws.length <= 6 && TRADE_WORD.test(t)) || (titled && HEADING_END.test(ws[ws.length - 1]!.replace(/[^A-Za-z.]/g, '')))) return { kind: 'trade', name: tidyCase(t) }
  return null
}

type Field = 'num' | 'name' | 'qty' | 'unit' | 'rate' | 'amount' | 'trade' | 'room' | 'skip'
function headerField(cell: string): Field | null {
  if (/^(?:#|no\.?|s\/n)$/i.test(cell.trim())) return 'num'
  const n = cell.toLowerCase().replace(/\(?\s*(?:s\$|sgd|\$)\s*\)?/g, '').replace(/[.:#]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/^(?:no|s\/?n|sn|item no|ref|#|)$/.test(n)) return n === '' ? null : 'num'
  if (/^(?:items?|description(?: of works?)?|scope(?: of works?)?|work description|particulars|details|works?|specifications?)$/.test(n)) return 'name'
  if (/^(?:qty|quantity|qnty)$/.test(n)) return 'qty'
  if (/^(?:unit|uom|units|measure)$/.test(n)) return 'unit'
  if (/^(?:rate|unit price|unit rate|price|u\/price|unit cost|cost)$/.test(n)) return 'rate'
  if (/^(?:amount|total|line total|total amount|sum|sub ?total|nett)$/.test(n)) return 'amount'
  if (/^(?:trade|category|section|type)$/.test(n)) return 'trade'
  if (/^(?:area|room|location|space|zone)$/.test(n)) return 'room'
  if (/^(?:remarks?|notes?|brand|model|size)$/.test(n)) return 'skip'
  return null
}
/**
 * A column header row: at least two cells name a field, one of them the item or the amount. A header with no item column whose one unnamed
 * cell sits where the lines' words go ("#  Design & Consultation  Amount") prints the first band there: that cell is the name column, and
 * its words the first trade.
 */
function readHeader(cols: string[]): { fields: Field[]; band: string | null } | null {
  if (cols.length < 2) return null
  const f = cols.map((c) => headerField(c))
  const known = f.filter(Boolean) as Field[]
  if (known.length < 2 || known.length < cols.length - 1 || !(known.includes('amount') || known.includes('name'))) return null
  const out = f.map((x) => x ?? 'skip')
  /* "ITEM · WORK DESCRIPTION · AMOUNT": with a description column beside it, "Item" is the line's number */
  const names = out.map((x, i) => (x === 'name' ? i : -1)).filter((i) => i >= 0)
  if (names.length > 1 && /^items?$/i.test(cols[names[0]!]!.trim())) out[names[0]!] = 'num'
  let band: string | null = null
  if (!out.includes('name')) {
    const i = f.findIndex((x) => x === null)
    if (i >= 0) { out[i] = 'name'; const h = heading([cols[i]!]); band = h?.kind === 'trade' ? h.name : null }
  }
  return { fields: out, band }
}

/** A line's cells: a currency standing alone joins its figure; a trailing price word or a currency figure inside the last cell stands alone. */
function cellsOf(line: string): string[] {
  const raw = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean)
  const cols: string[] = []
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i]!
    if (/^[-−–]?\s?(?:S\$|SGD|US\$|USD|RM|MYR|\$)$/i.test(c) && raw[i + 1] && figure(raw[i + 1]!) !== null) { cols.push(`${c}${raw[i + 1]}`); i += 1; continue }
    cols.push(c)
  }
  const last = cols[cols.length - 1]
  if (last && figure(last) === null && !priceWord(last)) {
    const m = new RegExp(`^(.*\\S)\\s+([-−–]?\\s?${CUR}\\s?[\\d,]+(?:\\.\\d{1,2})?)$`, 'i').exec(last) ?? /^(.*\S)\s+(f\.?o\.?c\.?|inclusive|included|by\s+(?:client|owner|others?)|kiv|tba|tbc|lump\s?sum)$/i.exec(last)
    if (m) cols.splice(cols.length - 1, 1, m[1]!, m[2]!)
  }
  return cols
}

/* ── the reading ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function readQuoteText(input: string[]): QuoteText {
  const out: QuoteText = { studio: null, currency: null, lines: [], subtotalMinor: null, totalMinor: null, gstMinor: null, discountMinor: null }
  const all = input.map((l) => l.replace(/\s+$/, ''))
  out.currency = currencyOf(all.join('\n'))
  out.studio = studioOf(all)
  let header: Field[] | null = null
  let section: string | null = null, room: string | null = null
  let ended = false
  /** the last line read — a wrapped description's next line joins it, never across a heading or a page */
  const at: { last: TextLine | null } = { last: null }
  /** a numbered line with no price yet: its amount may sit on the next line (a wrapped cell) */
  let pending: { text: string; room: string | null } | null = null
  /** a section's numbered lines with no price — a "Lump sum" line after them prices them together */
  let unpricedHere: { text: string; room: string | null }[] = []
  const flushUnpriced = () => {
    /* numbered work the quote prints without a price and no lump sum took: no price given (the X-Ray counts these, never values them) */
    for (const u of unpricedHere) if (words(u.text).length >= 3) push({ section, room: u.room, name: u.text, qty: null, unit: null, rateMinor: null, amountMinor: 0, word: null })
    unpricedHere = []
  }
  const push = (l: TextLine) => { if (out.lines.length < MAX_LINES) { out.lines.push(l); at.last = l } }

  for (const rawLine of all) {
    if (!rawLine.trim()) { at.last = null; if (pending) { unpricedHere.push({ text: pending.text, room: pending.room }); pending = null } continue }   // a page's end
    const cols = cellsOf(rawLine)
    if (!cols.length) continue
    const text = cols.join(' ')
    const h = readHeader(cols)
    if (h) { header = h.fields; if (h.band) { section = h.band; room = null } at.last = null; continue }
    if (CONTACT_RE.test(text) && !/\d{1,3}(?:,\d{3})+\.\d{2}/.test(cols.slice(0, -1).join(' '))) { at.last = null; continue }
    if (PAYMENT_RE.test(text) && PAYMENT_WORD.test(text) && !/\bgst\b/i.test(text)) { at.last = null; continue }

    /* the price at the line's end — a figure or a word */
    const lastCell = cols[cols.length - 1]!
    const amt = cols.length > 1 ? figure(lastCell) : (hasCurrency(lastCell) ? figure(lastCell) : null)
    const word = cols.length > 1 ? priceWord(lastCell) : null
    const body = cols.slice(0, -1)
    const label = body.join(' ').replace(BULLET_RE, '').trim()

    /* totals: what the quote states, never a line */
    if (amt !== null && label && label.length <= 40 && SUMMARY_RE.test(label)) {
      const t = label.toLowerCase()
      if (/^(?:total\s+for\s+page|page\s+total)|^sub[\s-]?total\s+for\b/.test(t)) continue
      if (/^gst|^add\s*:?\s*gst/.test(t)) out.gstMinor = Math.abs(amt)
      else if (/discount|^less/.test(t)) out.discountMinor = Math.abs(amt)
      else if (/^grand|^nett?|payable|due|incl/.test(t)) { out.totalMinor = Math.abs(amt); ended = true }
      else if (out.subtotalMinor === null) out.subtotalMinor = Math.abs(amt)
      else out.totalMinor = Math.abs(amt)
      at.last = null
      continue
    }
    if (word && label && label.length <= 40 && SUMMARY_RE.test(label)) { at.last = null; continue }   // "GST (where applicable)  Included": a figure, never work
    if (ENDS_ITEMS.test(text.replace(BULLET_RE, ''))) { ended = true; at.last = null; continue }
    if (ended) continue

    if (amt === null && !word) {
      /* no price: a heading, a numbered line waiting for its price, a wrapped description, or words to leave alone */
      const hd = heading(cols)
      if (hd) {
        if (pending) { unpricedHere.push({ text: pending.text, room: pending.room }); pending = null }
        if (hd.kind === 'trade') { flushUnpriced(); section = hd.name; room = null } else room = hd.name
        at.last = null
        continue
      }
      if (cols.length > 1 && ITEM_NO_RE.test(cols[0]!)) {
        if (pending) unpricedHere.push({ text: pending.text, room: pending.room })
        pending = { text: cols.slice(1).join(' '), room }
        at.last = null
        continue
      }
      const cont = text.replace(BULLET_RE, '')
      const prev = (pending?.text ?? at.last?.name ?? '').trim()
      const joins = /^[a-z(&,]/.test(cont) || /[,&-]$/.test(prev)
      /* a wrapped line finishing the phrase joins with a space ("…floor and wall tiles," + "top and bottom cabinets"); one adding a detail
         ("with internal drawers") joins after "; " — the line's name stays its own first words when a sentence has to be short */
      const glue = /[,&-]$|\b(?:and|or|with|of|to|for|in|on|at|the|a|c\/w)$/i.test(prev) ? ' ' : '; '
      if (pending && joins) { pending.text = `${pending.text}${glue}${cont}`.slice(0, 200); continue }
      if (at.last && joins && at.last.name.length < 200) { at.last.name = `${at.last.name}${glue}${cont}`.slice(0, 200); continue }
      continue
    }
    if (amt !== null && amt < 0) { out.discountMinor = (out.discountMinor ?? 0) + Math.abs(amt); at.last = null; continue }   // a credit line: a discount, never work

    /* a priced line: by its header's columns when it has them all, else from the right — the amount, a rate beside a stated quantity,
       the unit and quantity (one cell, "280 sq ft", or two) — and from the left, its own number */
    let num: string | null = null
    let qty: number | null = null, unit: string | null = null, rate: number | null = null
    let trade: string | null = null, area: string | null = null
    let nameCells: string[]
    const H = header
    if (H && H.length === cols.length && H[H.length - 1] === 'amount') {
      nameCells = []
      body.forEach((c, i) => {
        const f = H[i]
        const dash = /^[—–-]$/.test(c)
        if (f === 'qty') { const qu = qtyUnit(c); if (qu) { qty = qu.qty; unit = qu.unit } else if (QTY_RE.test(c)) qty = Number(c) }
        else if (f === 'unit') { const qu = qtyUnit(c); if (qu) { qty = qty ?? qu.qty; unit = qu.unit } else if (UNIT_RE.test(c)) unit = c; else if (QTY_RE.test(c)) qty = Number(c) }
        else if (f === 'rate') { const r = figure(c); if (r !== null && r > 0) rate = r }
        else if (f === 'trade') trade = dash ? null : c
        else if (f === 'room') area = dash ? null : c
        else if (f === 'num') num = c
        else if (f === 'name') nameCells.push(c)
      })
    } else {
      const rest = [...body]
      if (rest.length > 1 && ITEM_NO_RE.test(rest[0]!)) num = rest.shift()!
      const qtyLeft = (cells: string[]) => { const a = cells[cells.length - 1], b = cells[cells.length - 2]; return !!a && (UNIT_RE.test(a) || !!qtyUnit(a) || (QTY_RE.test(a) && !!b)) }
      if (rest.length >= 2 && figure(rest[rest.length - 1]!) !== null && qtyLeft(rest.slice(0, -1))) { const r = figure(rest.pop()!); rate = r !== null && r > 0 ? r : null }
      for (let k = 0; k < 2 && rest.length >= 2; k += 1) {
        const c = rest[rest.length - 1]!
        const qu = qtyUnit(c)
        if (qu && qty === null && unit === null) { qty = qu.qty; unit = qu.unit; rest.pop(); break }
        if (unit === null && UNIT_RE.test(c)) { unit = c; rest.pop(); continue }
        if (qty === null && QTY_RE.test(c)) { qty = Number(c); rest.pop(); continue }
        break
      }
      nameCells = rest
    }
    if (qty === null) rate = null   // a rate is only a rate beside its quantity
    let name = nameCells.join(' ').replace(BULLET_RE, '').replace(/\s+/g, ' ').trim()
    /* a lump sum prices the section's numbered lines that printed no price — one line, their words in its name */
    if (word === 'Lump sum' || /^(?:lump\s?sum|lum\s?sum|l\/s)$/i.test(name)) {
      if (pending) { unpricedHere.push({ text: pending.text, room: pending.room }); pending = null }
      const covered = unpricedHere.map((u) => u.text).join('; ')
      unpricedHere = []
      const base = `${section ?? 'The works'}, lump sum`
      push({ section, room, name: (covered ? `${base}: ${covered}` : base).slice(0, 200), qty: 1, unit: 'Lot', rateMinor: null, amountMinor: amt ?? 0, word: amt === null ? 'Lump sum' : null })
      continue
    }
    if (pending && (!num || !name)) { name = `${pending.text}${name ? ` ${name}` : ''}`.trim(); pending = null }
    else if (pending) { unpricedHere.push({ text: pending.text, room: pending.room }); pending = null }
    if (!/[a-z]{3}/i.test(name)) continue
    push({ section: trade ? tidyCase(trade) : section, room: area ?? room, name: name.slice(0, 200), qty, unit, rateMinor: rate, amountMinor: amt ?? 0, word })
  }
  const left = pending as { text: string; room: string | null } | null
  if (left) unpricedHere.push({ text: left.text, room: left.room })
  flushUnpriced()
  return out
}

/** The quote's currency when it names one: a figure in RM, MYR or US$ written out — a Singapore quote that says "S$" or "SGD" is SGD. */
export function currencyOf(text: string): string | null {
  if (/\bS\$|\bSGD\b|singapore\s+dollars?/i.test(text)) return 'SGD'
  if (/\bRM\s?\d|\(\s*RM\s*\)|\bMYR\b|ringgit/i.test(text)) return 'MYR'   // "RM" beside a figure or as a column's currency — never "STORE RM" (1.0's false hit)
  if (/\bUS\$|\bUSD\b/.test(text)) return 'USD'
  if (/\bAED\b|dirhams?/i.test(text)) return 'AED'
  if (/\bINR\b|rupees?|\bRs\.?\s?\d/i.test(text)) return 'INR'
  return null
}
/** The currency's own sign, for the refusal's words. */
export const currencySign = (code: string) => ({ MYR: 'RM', USD: 'US$', AED: 'AED', INR: 'INR' } as Record<string, string>)[code] ?? code

/** The studio on the letterhead: a line near the top, before the first heading row or priced line, naming a company ("Cove Interior —
    Quotation", "Flo Design Pte. Ltd"), its legal suffix and the document's title taken off; never a trade band; null when none reads as one
    (the X-Ray then asks for the name). */
function studioOf(lines: string[]): string | null {
  for (const raw of lines.slice(0, 14)) {
    const cols = cellsOf(raw)
    if (cols.length && (readHeader(cols) || (cols.length > 1 && (figure(cols[cols.length - 1]!) !== null || priceWord(cols[cols.length - 1]!))))) break   // the letterhead ends where the lines begin
    if (cols.length && heading(cols)) continue   // a trade band or an area is never the studio
    const l = raw.split(/\s{2,}/)[0]!.trim()
    if (!l || l.length > 70 || /^(?:prepared\s+for|attn|name|to|dear|date|client|address|project|re)\b/i.test(l) || CONTACT_RE.test(l)) continue
    const t = l.replace(/\s*[—–|-]\s*(?:quotation|quote|sales\s+contract|contract|estimate|proposal|tax\s+invoice|invoice)\b.*$/i, '')
      .replace(/\s*(?:co\.?\s*reg\.?|uen|gst\s*reg).*$/i, '').replace(LEGAL_RE, ' ').replace(/\s+/g, ' ').trim()
    if (!t || TITLE_RE.test(t) || words(t).length > 6) continue
    if (generic(t)) continue   // "DESIGN" — a logo's last word, not the studio
    if (COMPANY_RE.test(l) && /[A-Za-z]{2}/.test(t)) return tidyCase(t)
  }
  /* a logo set as words ("URBAN" · "NEST" · "DESIGN"): the studio's registered name is printed by the signatures — "Kelvin Tan, Urban Nest
     Design & Renovation" then "Pte Ltd" — the words before its legal suffix, after the signer's name */
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]!.trim()
    if (!/\bpte\.?\s*ltd\b|\bllp\b|sdn\.?\s*bhd/i.test(raw) || CONTACT_RE.test(raw)) continue
    const cols = cellsOf(raw)
    if (cols.length > 1 && (figure(cols[cols.length - 1]!) !== null || priceWord(cols[cols.length - 1]!))) continue   // a line of work naming its supplier
    let before = raw.replace(/\s*\(?\s*(?:pte\.?\s*ltd\.?|private\s+limited|llp|sdn\.?\s*bhd\.?)[\s\S]*$/i, '').trim()
    if (!before && i > 0) before = lines[i - 1]!.trim()
    /* the signatures sit side by side ("Kelvin Tan, Urban Nest Design & Renovation    Mr Stanley"): the block that names a company */
    const blocks = before.split(/\s{2,}/)
    const block = blocks.find((b) => COMPANY_RE.test(b.split(/,\s*/).pop() ?? '')) ?? blocks[0] ?? ''
    const name = block.split(/,\s*/).pop()!.replace(/\s*[—–|-]\s*(?:quotation|quote).*$/i, '').trim()
    if (name && words(name).length <= 6 && /[A-Za-z]{2}/.test(name) && !generic(name) && !TITLE_RE.test(name)) return tidyCase(name)
  }
  return null
}
/** One word that names a kind of studio, not a studio ("Design", "Interior", "Renovation"). */
const generic = (t: string) => words(t).length === 1 && COMPANY_RE.test(t)
