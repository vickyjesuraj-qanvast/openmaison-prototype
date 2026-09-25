/**
 * Items section vocabulary (1260:31209 · 1271:40400 · reference screenshots, owner 2026-09-11) — client-safe.
 */
export const ITEM_STATUSES = ['Pending', 'Approved', 'Declined'] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]
export const isItemStatus = (s: string): s is ItemStatus => (ITEM_STATUSES as readonly string[]).includes(s)
/** Status chip (1260:31267 · 31303 · 31337): glyph + tint. */
export const ITEM_STATUS_CHIP: Record<ItemStatus, { icon: string; tone: 'yellow' | 'green' | 'red' }> = {
  Pending: { icon: 'hourglass_top', tone: 'yellow' },
  Approved: { icon: 'check_circle', tone: 'green' },
  Declined: { icon: 'warning', tone: 'red' },
}

/** Use Icon (1271:41123): the five item kinds and their glyphs; labels per the owner (Design · Fee · Labour · Delivery · Purchase). */
export const ITEM_KINDS = ['design', 'fee', 'labour', 'delivery', 'purchase'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]
export const ITEM_KIND_ICON: Record<ItemKind, string> = { design: 'design_services', fee: 'attach_money', labour: 'handyman', delivery: 'local_shipping', purchase: 'shopping_cart' }
export const ITEM_KIND_LABEL: Record<ItemKind, string> = { design: 'Design', fee: 'Fee', labour: 'Labour', delivery: 'Delivery', purchase: 'Purchase' }
export const isItemKind = (s: string | null | undefined): s is ItemKind => !!s && (ITEM_KINDS as readonly string[]).includes(s)

/** Unit types the studio prices by (the mock's "Pieces" + "Add Unit Type"; the rest are how Singapore renovation quotes are lined). */
export const UNITS = ['Pieces', 'Lot', 'sqft', 'ft run', 'point', 'hour', 'set'] as const

/** In the menu's order (1271:40931): Hide Items · Show Items without Pricing · Show Items with Pricing. */
export const VISIBILITIES = ['hidden', 'no-price', 'visible'] as const
export type Visibility = (typeof VISIBILITIES)[number]
/** Visibility menu (1271:40931): "Customize visibility for your client". */
export const VISIBILITY_LABEL: Record<Visibility, string> = { hidden: 'Hide Items', 'no-price': 'Show Items without Pricing', visible: 'Show Items with Pricing' }
export const isVisibility = (s: string): s is Visibility => (VISIBILITIES as readonly string[]).includes(s)

export const ITEM_VIEWS = ['none', 'category', 'room', 'section'] as const
export type ItemsView = (typeof ITEM_VIEWS)[number]
/** (REG-567) The grid's groups are called sections now, so the free "Section" label reads "Section label" wherever the two could meet. */
export const ITEM_VIEW_LABEL: Record<ItemsView, string> = { none: 'None', category: 'Category', room: 'Room', section: 'Section label' }
export const isItemsView = (s: string): s is ItemsView => (ITEM_VIEWS as readonly string[]).includes(s)
/** The bucket a line with no label falls into, per view (reference: "Uncategorized" for categories, "Unassigned" for rooms / sections). */
export const UNLABELLED: Record<Exclude<ItemsView, 'none'>, string> = { category: 'Uncategorized', room: 'Unassigned', section: 'Unassigned' }

export const DENSITIES = ['single', 'double', 'triple'] as const
export type ItemsDensity = (typeof DENSITIES)[number]
/** The table's base state clamps the description to two lines (1260:31372) — Double is the default (owner 2026-09-15). */
export const DEFAULT_DENSITY: ItemsDensity = 'double'
export const DENSITY_LABEL: Record<ItemsDensity, string> = { single: 'Single', double: 'Double', triple: 'Triple' }
export const isDensity = (s: string): s is ItemsDensity => (DENSITIES as readonly string[]).includes(s)

/** Column settings (1271:41169): the mocked catalogue in its order — plus Section, which the Section view needs (REG-415) — the mocked ON set is the table's default. */
export const COLUMN_KEYS = ['sku', 'type', 'category', 'section', 'qty', 'unit', 'cost', 'msrp', 'markup', 'margin', 'unitPrice', 'discount', 'gst', 'room', 'color', 'dimensions', 'materials', 'shipping', 'shippingMarkup', 'taxable', 'vendor', 'website', 'rebate'] as const
export type ColumnKey = (typeof COLUMN_KEYS)[number]
export const COLUMN_LABEL: Record<ColumnKey, string> = {
  sku: 'SKU', type: 'Type', category: 'Category', section: 'Section label', qty: 'Qty', unit: 'Unit', cost: 'Cost', msrp: 'MSRP', markup: 'Markup', margin: 'Margin',   // (REG-574) "Section label": the grid's sections took the word (REG-567)
  unitPrice: 'Unit Price', discount: 'Discount', gst: 'GST (%)', room: 'Room', color: 'Color', dimensions: 'Dimensions', materials: 'Materials',
  shipping: 'Shipping', shippingMarkup: 'Shipping Markup', taxable: 'Taxable', vendor: 'Vendor/Sub', website: 'Website Link',
  rebate: 'Rebate',   // (REG-596) Owners only — a vendor rebate on the line, counted in the owner's margin, never printed
}
/** Columns the table can actually render today (the rest are in the catalogue, off, and answer coming soon when switched on). */
export const RENDERABLE_COLUMNS: readonly ColumnKey[] = ['qty', 'unit', 'cost', 'markup', 'unitPrice', 'discount', 'gst', 'room', 'category', 'section', 'type', 'margin', 'rebate', 'vendor', 'website']   // (REG-623, parity Q-08 · Q-09) Vendor/Sub and Website Link are drawn
export type ColumnSettings = { details: { description: boolean; images: boolean; autonumber: boolean }; columns: { key: ColumnKey; on: boolean }[] }
/** The table as mocked (1260:31209, updated 2026-09-15 — the STATUS column left the default set, REG-426, then the catalogue
    too, REG-435): Qty · Unit · Cost · Markup · Unit Price · Discount · GST (%). A stored 'status' entry is dropped on read. */
export const DEFAULT_COLUMNS: ColumnSettings = {
  details: { description: true, images: true, autonumber: true },
  columns: COLUMN_KEYS.map((key) => ({ key, on: ['qty', 'unit', 'cost', 'markup', 'unitPrice', 'discount', 'gst'].includes(key) })),
}
export function parseColumns(json: string | null | undefined): ColumnSettings {
  let raw: unknown = null
  if (json) { try { raw = JSON.parse(json) } catch { raw = null } }
  const r = (raw ?? {}) as Partial<ColumnSettings>
  const seen = new Set<ColumnKey>()
  const columns: ColumnSettings['columns'] = []
  for (const c of Array.isArray(r.columns) ? r.columns : []) {
    if (c && (COLUMN_KEYS as readonly string[]).includes(c.key) && !seen.has(c.key)) { seen.add(c.key); columns.push({ key: c.key, on: !!c.on }) }
  }
  for (const d of DEFAULT_COLUMNS.columns) if (!seen.has(d.key)) columns.push({ ...d })
  const d = r.details ?? DEFAULT_COLUMNS.details
  return { details: { description: d.description !== false, images: d.images !== false, autonumber: d.autonumber !== false }, columns }
}

/** The labels the studio added on this quote; (REG-623) `vendors` = the vendors typed here that My Items does not list. */
export type ItemLabels = { categories: string[]; rooms: string[]; sections: string[]; vendors: string[] }
export function parseLabels(json: string | null | undefined): ItemLabels {
  let raw: unknown = null
  if (json) { try { raw = JSON.parse(json) } catch { raw = null } }
  const r = (raw ?? {}) as Partial<Record<keyof ItemLabels, unknown>>
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 50) : [])
  return { categories: list(r.categories), rooms: list(r.rooms), sections: list(r.sections), vendors: list(r.vendors) }
}

/**
 * (REG-623, parity Q-09) A line's product or spec link — 1.0's "Spec Sheet / Product Link": http or https only, never printed.
 * A bare address ("ikea.com/sg/…") gets https:// in front. Returns the cleaned link, null for an empty box, undefined when the
 * text is not a web address (the cell refuses it and says why).
 */
export function cleanLink(v: string | null | undefined): string | null | undefined {
  const t = (v ?? '').trim()
  if (!t) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : /^[^\s/]+\.[^\s]+$/.test(t) ? `https://${t}` : t
  try {
    const u = new URL(withScheme)
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.hostname.includes('.') || /\s/.test(withScheme)) return undefined
    return withScheme.slice(0, 500)
  } catch { return undefined }
}
/** "ikea.com/sg/…" — the link as a cell shows it at rest: the host without "www.", then the path's first step. */
export function shortLink(v: string | null | undefined): string {
  if (!v) return ''
  try {
    const u = new URL(v)
    const host = u.hostname.replace(/^www\./, '')
    const step = u.pathname.split('/').filter(Boolean)[0]
    return step ? `${host}/${step}${u.pathname.split('/').filter(Boolean).length > 1 ? '/…' : ''}` : host
  } catch { return v }
}

/** Reference row menu (owner 2026-09-11; "Create Document(s)" dropped — REG-410). Round 1 of the testers' asks added
    Skip the number (REG-558), Ungroup (REG-558), Save section to My Items (REG-566) and Label the sub-total (REG-555). */
export type RowMenuAction = 'library' | /** (REG-653) */ 'libraryUpdate' | 'addFromBook' | /** (sweep S1) */ 'subtotalClear' | 'duplicate' | 'copyName' | 'group' | 'showFull' | 'optional' | 'addAbove' | 'addBelow' | 'moveUp' | 'moveDown' | 'remove' | 'noNumber' | 'ungroup' | 'saveSection' | 'subtotalLabel' | 'description' | 'oneLine' | 'comment'

/**
 * (REG-555) Print as — what a line prints in place of its amount, and whether it counts (1.0's FOC / Inclusive / KIV words,
 * the studios' "on behalf" and "packaged" lines). The price stays on the line; the word is what the client reads.
 *   foc        Free of charge — the word prints, the line leaves the totals; its cost still counts against the margin.
 *   inclusive  Included in another line's price — the word prints, the line leaves the totals; its cost counts against the margin.
 *   kiv        Keep in view — to be confirmed later; the word prints, nothing counts.
 *   client     (REG-623, parity Q-07) By client — the client buys or supplies it; the word prints, nothing counts, the studio bears no cost.
 *   behalf     Paid on the client's behalf — the amount prints with the note, counts in the subtotal, carries no GST.
 *   packaged   Priced within a package line — the word prints, the line leaves the totals; its cost counts against the margin.
 *   custom     The studio's own word (`printAsText`, e.g. "Waived", "By owner") — prints in place of the amount, nothing counts.
 */
export const PRINT_AS = ['foc', 'inclusive', 'kiv', 'client', 'behalf', 'packaged', 'custom'] as const
export type PrintAs = (typeof PRINT_AS)[number]
export const isPrintAs = (s: unknown): s is PrintAs => typeof s === 'string' && (PRINT_AS as readonly string[]).includes(s)
export const PRINT_AS_LABEL: Record<PrintAs, string> = { foc: 'FOC', inclusive: 'Inclusive', kiv: 'KIV', client: 'By client', behalf: 'On behalf', packaged: 'Packaged', custom: 'Custom word…' }
export const PRINT_AS_HELP: Record<PrintAs, string> = {
  foc: 'Free of charge — prints “FOC”, not counted',
  inclusive: 'Included in another line — prints “Inclusive”, not counted',
  kiv: 'To be confirmed — prints “KIV”, not counted',
  client: 'The client supplies it — prints “By client”, not counted',   // (REG-623, parity Q-07) 1.0's by_client price type
  behalf: 'Paid on the client’s behalf — the amount prints and counts, no GST',
  packaged: 'Priced in a package line — prints “Packaged”, not counted',
  custom: 'Your own word in place of the amount, not counted',
}
/** The word a line prints in place of its amount; '' = the amount itself. */
export function printAsWord(l: { printAs?: string | null; printAsText?: string | null }): string {
  const p = l.printAs
  if (!isPrintAs(p)) return ''
  if (p === 'custom') return (l.printAsText ?? '').trim() || 'Custom'
  if (p === 'behalf') return 'On behalf'
  return PRINT_AS_LABEL[p]
}

/**
 * (REG-556) Highlight — one of the brand kit's colours on a whole line or section: the three inks colour the words, the two
 * light colours fill the row. The kit decides what "accent" is, so a template change never leaves a stray colour behind.
 */
export const HIGHLIGHTS = ['accent', 'red', 'grey', 'light', 'band'] as const
export type Highlight = (typeof HIGHLIGHTS)[number]
export const isHighlight = (s: unknown): s is Highlight => typeof s === 'string' && (HIGHLIGHTS as readonly string[]).includes(s)
export const HIGHLIGHT_LABEL: Record<Highlight, string> = { accent: 'Accent text', red: 'Red text', grey: 'Grey text', light: 'Light fill', band: 'Band fill' }
export const HIGHLIGHT_KIND: Record<Highlight, 'text' | 'fill'> = { accent: 'text', red: 'text', grey: 'text', light: 'fill', band: 'fill' }

/**
 * (REG-566) A section saved to My Items: the group's name and note, its lines and — one level down — its sub-sections with theirs.
 * Prices are the ones on the lines when it was saved; the studio edits them on the quote after inserting.
 */
export type SavedLine = { name: string; description: string | null; descriptionHtml: string | null; qty: number; unit: string | null; costMinor: number; markupMinor: number; discountPct: number; gstPct: number; room: string | null; category: string | null; section: string | null; printAs: string | null; printAsText: string | null; highlight: string | null; icon: string | null; /** (REG-623) */ vendor?: string | null; link?: string | null
  /** (REG-653, price book parity Q-10) What keeps a line safe on its way back into a quote: hidden or priced-off for the client, optional
   *  (out of every sum), no number, the owner's rebate, its photo, and the My Items entry it came from. */
  visibility?: Visibility; optional?: boolean; noNumber?: boolean; rebateMinor?: number; thumb?: string | null; thumbCount?: number; priceBookItemId?: string | null }
/** (REG-653, Q-10) A saved section's own marks, and each sub-section's: printed as one line, the word beside its sub-total, its highlight, its visibility. */
export type SavedGroupMarks = { printOneLine?: boolean; printAsText?: string | null; highlight?: string | null; visibility?: Visibility }
export type SavedSection = SavedGroupMarks & { name: string; description: string | null; descriptionHtml: string | null; lines: SavedLine[]; subs: (SavedGroupMarks & { name: string; description: string | null; descriptionHtml: string | null; lines: SavedLine[] })[] }
const savedVisibility = (v: unknown): Visibility => (typeof v === 'string' && isVisibility(v) ? v : 'visible')
function groupMarks(g: Partial<SavedGroupMarks> | undefined): SavedGroupMarks {
  return { printOneLine: g?.printOneLine === true, printAsText: typeof g?.printAsText === 'string' ? g.printAsText : null, highlight: isHighlight(g?.highlight) ? g.highlight : null, visibility: savedVisibility(g?.visibility) }
}
/** (REG-619, parity Q-27) A saved section's tags: a stored JSON array of short words, trimmed, de-duplicated, at most 8. */
export function parseSectionTags(json: string | null | undefined): string[] {
  if (!json) return []
  try { const r = JSON.parse(json) as unknown; return Array.isArray(r) ? cleanSectionTags(r.filter((t): t is string => typeof t === 'string')) : [] } catch { return [] }
}
export const cleanSectionTags = (tags: string[]): string[] => [...new Map(tags.map((t) => t.trim().slice(0, 30)).filter(Boolean).map((t) => [t.toLowerCase(), t] as const)).values()].slice(0, 8)

export function parseSavedSection(json: string): SavedSection | null {
  try {
    const r = JSON.parse(json) as Partial<SavedSection>
    const line = (l: Partial<SavedLine>): SavedLine => ({
      name: typeof l.name === 'string' ? l.name : 'Item', description: typeof l.description === 'string' ? l.description : null, descriptionHtml: typeof l.descriptionHtml === 'string' ? l.descriptionHtml : null,
      qty: typeof l.qty === 'number' ? l.qty : 1, unit: typeof l.unit === 'string' ? l.unit : null, costMinor: typeof l.costMinor === 'number' ? l.costMinor : 0, markupMinor: typeof l.markupMinor === 'number' ? l.markupMinor : 0,
      discountPct: typeof l.discountPct === 'number' ? l.discountPct : 0, gstPct: typeof l.gstPct === 'number' ? l.gstPct : 9, room: typeof l.room === 'string' ? l.room : null, category: typeof l.category === 'string' ? l.category : null,
      section: typeof l.section === 'string' ? l.section : null, printAs: isPrintAs(l.printAs) ? l.printAs : null, printAsText: typeof l.printAsText === 'string' ? l.printAsText : null, highlight: isHighlight(l.highlight) ? l.highlight : null, icon: typeof l.icon === 'string' ? l.icon : null,
      vendor: typeof l.vendor === 'string' ? l.vendor : null, link: typeof l.link === 'string' ? cleanLink(l.link) ?? null : null,   // (REG-623)
      /* (REG-653, Q-10) older saved sections carry none of these: visible, counted, numbered, no rebate, no photo, no source */
      visibility: savedVisibility(l.visibility), optional: l.optional === true, noNumber: l.noNumber === true,
      rebateMinor: typeof l.rebateMinor === 'number' && l.rebateMinor > 0 ? Math.round(l.rebateMinor) : 0,
      thumb: typeof l.thumb === 'string' ? l.thumb : null, thumbCount: typeof l.thumbCount === 'number' ? l.thumbCount : typeof l.thumb === 'string' ? 1 : 0,
      priceBookItemId: typeof l.priceBookItemId === 'string' ? l.priceBookItemId : null,
    })
    return {
      name: typeof r.name === 'string' ? r.name : 'Section', description: typeof r.description === 'string' ? r.description : null, descriptionHtml: typeof r.descriptionHtml === 'string' ? r.descriptionHtml : null,
      ...groupMarks(r),
      lines: Array.isArray(r.lines) ? r.lines.map((l) => line(l ?? {})) : [],
      subs: Array.isArray(r.subs) ? r.subs.map((g) => ({ name: typeof g?.name === 'string' ? g.name : 'Section', description: typeof g?.description === 'string' ? g.description : null, descriptionHtml: typeof g?.descriptionHtml === 'string' ? g.descriptionHtml : null, ...groupMarks(g), lines: Array.isArray(g?.lines) ? g.lines.map((l) => line(l ?? {})) : [] })) : [],
    }
  } catch { return null }
}
/** The lines a saved section holds, sub-sections included — the popover's "n items". */
export const savedSectionCount = (s: SavedSection) => s.lines.length + s.subs.reduce((n, g) => n + g.lines.length, 0)

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** A plain description as the rich editor's paragraphs; a line that starts with "• " becomes a list item so old bullets keep their shape
    (REG-557; shared by the Items grid's Description dialog and, REG-653, the price book's item and section editors). */
export function plainToHtml(text: string): string {
  const out: string[] = []
  let list: string[] = []
  const flush = () => { if (list.length) { out.push(`<ul>${list.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`); list = [] } }
  for (const l of text.split('\n')) { const m = /^[•\-–*]\s+(.*)$/.exec(l); if (m) list.push(m[1]!); else { flush(); if (l.trim()) out.push(`<p>${escapeHtml(l)}</p>`) } }
  flush()
  return out.join('')
}
/** The rich editor's text as it is kept: its plain words, and the HTML only when it carries lists or emphasis (REG-557's rule). */
export function keptText(html: string, blank: boolean): { text: string; html: string | null } {
  if (blank) return { text: '', html: null }
  return { text: htmlToPlain(html), html: /<(ul|ol|li|b|strong|i|em|u|s|strike|a)\b/i.test(html) ? html : null }
}

/** (REG-557) A formatted description's plain text: paragraphs and list items on their own lines, a bullet before each item. */
export function htmlToPlain(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, '\n• ').replace(/<\/(p|div|h\d|li|ul|ol)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
}
