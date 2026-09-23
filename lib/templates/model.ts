/**
 * Quote templates — the document model (Company › Templates › Quote templates; proposal v3 of 2026-09-17, REG-485).
 * A template is a DESIGN (page settings, brand overrides and an ordered list of blocks) plus DEFAULTS (what a new quote
 * starts with). Blocks are of two kinds: CANVAS blocks (header · footer · cover) hold elements placed by hand in mm and
 * repeat by rule; FLOW blocks (quote details, title, items table, totals, payment schedule, terms, notes, signature, text,
 * image, divider, spacer, page break, badges) stack in order and paginate by their content. Client-safe: no server imports.
 */
import type { ColumnKey } from '@/lib/quotes/items-model'

/* ── paper ── */
export const PAPERS = ['A4', 'Letter'] as const
export type Paper = (typeof PAPERS)[number]
export const PAPER_MM: Record<Paper, { w: number; h: number }> = { A4: { w: 210, h: 297 }, Letter: { w: 215.9, h: 279.4 } }
/** CSS pixels per millimetre at 96 dpi — the canvas draws in mm and the screen in px. */
export const MM_PX = 96 / 25.4
export const mm = (v: number) => v * MM_PX
export const isPaper = (s: unknown): s is Paper => typeof s === 'string' && (PAPERS as readonly string[]).includes(s)

export type Margins = { top: number; right: number; bottom: number; left: number }
/** (REG-592) How `{date}` and `{valid_until}` print: "17 Sep ’26" · "17 September 2026" · "Sunday, 17 September 2026". */
export type DateFormat = 'short' | 'long' | 'weekday'
export const isDateFormat = (v: unknown): v is DateFormat => v === 'short' || v === 'long' || v === 'weekday'
export type PageSettings = { paper: Paper; margins: Margins; watermark: string; dateFormat: DateFormat }
export const DEFAULT_PAGE: PageSettings = { paper: 'A4', margins: { top: 18, right: 18, bottom: 18, left: 18 }, watermark: '', dateFormat: 'short' }

/* ── brand ── */
export const COLOR_KEYS = ['ink', 'grey', 'accent', 'light', 'band', 'red'] as const
export type ColorKey = (typeof COLOR_KEYS)[number]
export const COLOR_LABEL: Record<ColorKey, string> = { ink: 'Brand ink', grey: 'Brand grey', accent: 'Accent', light: 'Brand light', band: 'Band', red: 'Highlight' }
export const FONT_ROLES = ['heading', 'body', 'table', 'small'] as const
export type FontRole = (typeof FONT_ROLES)[number]
export const FONT_ROLE_LABEL: Record<FontRole, string> = { heading: 'Heading', body: 'Body', table: 'Table', small: 'Small print' }
export type FontSpec = { family: string; size: number; weight: 400 | 600 | 700; italic?: boolean }
/** The curated faces (owner 2026-09-17: the list first, uploads later) — the three reference quotes' Arial, Times New Roman and Courier among them. */
export const FONT_FAMILIES = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Calibri', 'Cambria', 'Verdana', 'Trebuchet MS', 'Inter', 'Montserrat', 'Lato', 'Playfair Display', 'Fraunces'] as const
const FONT_STACK: Record<string, string> = {
  Arial: 'Arial, "Helvetica Neue", Helvetica, sans-serif', Helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif', 'Times New Roman': '"Times New Roman", Times, serif',
  Georgia: 'Georgia, "Times New Roman", serif', 'Courier New': '"Courier New", Courier, monospace', Calibri: 'Calibri, Carlito, "Segoe UI", sans-serif', Cambria: 'Cambria, Caladea, Georgia, serif',
  Verdana: 'Verdana, Geneva, sans-serif', 'Trebuchet MS': '"Trebuchet MS", "Lucida Grande", sans-serif', Inter: 'Inter, "Helvetica Neue", Arial, sans-serif', Montserrat: 'Montserrat, "Gill Sans", "Trebuchet MS", sans-serif',
  Lato: 'Lato, "Helvetica Neue", Arial, sans-serif', 'Playfair Display': '"Playfair Display", Georgia, serif', Fraunces: 'Fraunces, Georgia, serif',
}
export const fontStack = (family: string) => FONT_STACK[family] ?? `${family}, sans-serif`

/** (REG-562) An issuing entity and where its money goes: the studio itself first, then any other company it quotes under. The
    PayNow QR is an uploaded image path; empty strings print nothing. */
export type IssuingEntity = { name: string; bankName: string; accountName: string; accountNo: string; payNow: string; payNowQr: string | null; /** (REG-593) off = quotes raised under it carry no GST */ gstRegistered: boolean }
export const EMPTY_ENTITY = (name: string): IssuingEntity => ({ name, bankName: '', accountName: '', accountNo: '', payNow: '', payNowQr: null, gstRegistered: true })
export type StudioDetails = {
  name: string; address: string; phone: string; fax: string; email: string; website: string; uen: string; gstReg: string; licence: string
  /** (REG-562) A tagline and the studio's social handles, for footers and covers — `{studio_tagline}` · `{studio_social}`. */
  tagline: string; social: string
  /** (REG-562) The issuing entities with their bank details; the quote's Issuing Entity picks one, the Bank details block prints it. */
  entities: IssuingEntity[]
}
export type BrandKit = {
  logo: string | null
  logoDark: string | null
  stamp: string | null
  badges: string[]
  colors: Record<ColorKey, string>
  fonts: Record<FontRole, FontSpec>
}
export const DEFAULT_BRAND: BrandKit = {
  logo: '/figma-assets/logo.svg', logoDark: null, stamp: null, badges: [],
  colors: { ink: '#1A1A1A', grey: '#666666', accent: '#5500FF', light: '#E5E5E5', band: '#EEEEEE', red: '#C00000' },
  fonts: { heading: { family: 'Inter', size: 14, weight: 700 }, body: { family: 'Inter', size: 9, weight: 400 }, table: { family: 'Inter', size: 8.5, weight: 400 }, small: { family: 'Inter', size: 7.5, weight: 400 } },
}
/** A template's brand overrides: any part of the kit, deep-merged over the studio's. */
export type BrandOverrides = { logo?: string | null; logoDark?: string | null; stamp?: string | null; badges?: string[]; colors?: Partial<Record<ColorKey, string>>; fonts?: Partial<Record<FontRole, Partial<FontSpec>>> }
export function mergeBrand(base: BrandKit, o: BrandOverrides | undefined): BrandKit {
  if (!o) return base
  const fonts = { ...base.fonts }
  for (const r of FONT_ROLES) if (o.fonts?.[r]) fonts[r] = { ...base.fonts[r], ...o.fonts[r] } as FontSpec
  return {
    logo: o.logo !== undefined ? o.logo : base.logo, logoDark: o.logoDark !== undefined ? o.logoDark : base.logoDark, stamp: o.stamp !== undefined ? o.stamp : base.stamp,
    badges: o.badges ?? base.badges, colors: { ...base.colors, ...(o.colors ?? {}) }, fonts,
  }
}
/** A colour is a brand key or a hex. */
export const isColorKey = (s: unknown): s is ColorKey => typeof s === 'string' && (COLOR_KEYS as readonly string[]).includes(s)
export const resolveColor = (c: string | undefined, brand: BrandKit, fallback: ColorKey = 'ink') => (c ? (isColorKey(c) ? brand.colors[c] : c) : brand.colors[fallback])

/* ── text style ── */
export type Align = 'left' | 'center' | 'right'
export type TextStyle = {
  role?: FontRole
  font?: string
  size?: number
  weight?: 400 | 600 | 700
  italic?: boolean
  underline?: boolean
  uppercase?: boolean
  color?: string
  align?: Align
  letterSpacing?: number
  lineHeight?: number
}

/* ── canvas elements ── */
export type KVRow = { id: string; label: string; value: string }
export type SignatureColumn = { id: string; heading: string; lines: string[]; image: 'none' | 'member' | 'client' | 'stamp'; caption?: string }
export type ElementBase = { id: string; x: number; y: number; w: number; h?: number; locked?: boolean }
export type CanvasElement = ElementBase & (
  | { kind: 'text'; text: string; style: TextStyle; hideIfEmpty?: boolean }
  | { kind: 'image'; src: 'logo' | 'logo-dark' | 'stamp' | string; fit: 'contain' | 'cover'; box?: string }
  | { kind: 'kv'; rows: KVRow[]; labelWidth: number; style: TextStyle; labelStyle: TextStyle; lines: 'none' | 'under'; gap: number }
  | { kind: 'rule'; weight: number; color: string }
  | { kind: 'box'; fill?: string; stroke?: string; weight?: number }
  | { kind: 'signature'; columns: SignatureColumn[]; style: TextStyle; headingStyle: TextStyle; lineWeight: number; lineColor: string; preamble?: string }
  | { kind: 'badges'; items: string[]; gap: number; align: Align }
  | { kind: 'pageno'; format: string; style: TextStyle }
)
export type ElementKind = CanvasElement['kind']
export const ELEMENT_LABEL: Record<ElementKind, string> = { text: 'Text', image: 'Picture', kv: 'Details', rule: 'Line', box: 'Box', signature: 'Signature', badges: 'Badges', pageno: 'Page number' }

/* ── blocks ── */
export type Repeat = 'every' | 'first' | 'not-first'
export type BlockBase = { id: string; hidden?: boolean; startNewPage?: boolean; keepWithNext?: boolean; spaceBefore?: number; spaceAfter?: number }
export type CanvasKind = 'header' | 'footer' | 'cover'
export type CanvasBlock = BlockBase & { kind: CanvasKind; height: number; repeat: Repeat; elements: CanvasElement[]; background?: string; rule?: { weight: number; color: string } | null }
export type DetailsBlock = BlockBase & { kind: 'details'; layout: 'columns' | 'stacked' | 'form'; left: KVRow[]; right: KVRow[]; labelWidth: number; style: TextStyle; labelStyle: TextStyle }
export type TitleBlock = BlockBase & { kind: 'title'; title: string; titleStyle: TextStyle; subject: string; subjectStyle: TextStyle; intro: string; introStyle: TextStyle }
export const ITEM_COLUMN_KEYS = ['no', 'item', 'qty', 'unit', 'qtyUnit', 'unitPrice', 'discount', 'total'] as const
export type ItemsColumnKey = (typeof ITEM_COLUMN_KEYS)[number]
export const ITEM_COLUMN_LABEL: Record<ItemsColumnKey, string> = { no: '#', item: 'Item', qty: 'Qty', unit: 'Unit', qtyUnit: 'Qty · Unit', unitPrice: 'Unit price', discount: 'Discount', total: 'Total' }
export type ItemsColumn = { key: ItemsColumnKey; label: string; on: boolean; width: number; align: Align; color?: string }
export type ItemsBlock = BlockBase & {
  kind: 'items'
  groupBy: 'none' | 'category' | 'room' | 'section'
  subGroupBy: 'none' | 'room' | 'category'
  sectionLabel: 'letters' | 'numbers' | 'none'
  numbering: 'group' | 'area' | 'continuous' | 'none' | 'nested'   // (REG-558) nested = 1 · 1.1 · a b c: the section's number, its lines, a sub-section's lines lettered
  bandStyle: 'grey' | 'accent' | 'black' | 'underlined' | 'inline'
  groupNotes: boolean
  groupNoteStyle: TextStyle
  areaStyle: TextStyle
  columns: ItemsColumn[]
  headerRow: 'plain' | 'ruled' | 'band' | 'black' | 'none'
  headerStyle: TextStyle
  descriptions: 'none' | 'first' | 'full' | 'bullets'
  descriptionStyle: TextStyle
  photos: boolean
  subtotals: boolean
  subtotalLabel: string
  lumpSum: boolean
  zeroAmount: 'FOC' | 'Inclusive' | '0.00' | 'blank'
  currency: 'S$' | '$ ' | 'none'
  grid: boolean
  fillPage: boolean
  ruled: boolean
  zebra: boolean
  density: 'compact' | 'normal' | 'relaxed'
  pageTotals: boolean
  pageTotalLabel: string
  keepGroups: boolean
  groupNewPage: boolean
  hiddenItems: 'omit' | 'no-price'
  optionalSection: boolean
  optionalTitle: string
  style: TextStyle
}
export type TotalsLineKey = 'pages' | 'subtotal' | 'discount' | 'additional' | 'gst' | 'total'
export type TotalsBlock = BlockBase & { kind: 'totals'; lines: { key: TotalsLineKey; label: string; on: boolean }[]; layout: 'right' | 'full'; width: number; style: TextStyle; totalStyle: TextStyle; rules: 'none' | 'top' | 'double' | 'grid' }
export type PaymentsBlock = BlockBase & { kind: 'payments'; title: string; layout: 'table' | 'list' | 'cards'; showAmounts: boolean; showDue: boolean; letters: boolean; style: TextStyle; titleStyle: TextStyle; band: boolean; /** (REG-560) a Total line under the milestones */ showTotal?: boolean }
/** (REG-562) Bank details: the issuing entity's bank, account and PayNow, with its QR beside — from Company › Profile. */
export type BankBlock = BlockBase & { kind: 'bank'; title: string; titleStyle: TextStyle; style: TextStyle; layout: 'row' | 'stacked'; qr: boolean; qrWidth: number; box: 'none' | 'tint' | 'outline' }
export type TextSourceBlock = BlockBase & { kind: 'terms' | 'notes'; title: string; titleStyle: TextStyle; style: TextStyle; numbered: boolean; grid: boolean }
export type SignatureBlock = BlockBase & { kind: 'signature'; columns: SignatureColumn[]; lineWeight: number; lineColor: string; style: TextStyle; headingStyle: TextStyle; preamble?: string }
export type TextBlock = BlockBase & { kind: 'text'; html: string; style: TextStyle; box: 'none' | 'tint' | 'outline' }
export type ImageBlock = BlockBase & { kind: 'image'; src: string; width: number; align: Align; caption?: string }
export type DividerBlock = BlockBase & { kind: 'divider'; weight: number; color: string }
export type SpacerBlock = BlockBase & { kind: 'spacer'; height: number }
export type PageBreakBlock = BlockBase & { kind: 'pagebreak' }
export type BadgesBlock = BlockBase & { kind: 'badges'; items: string[]; height: number; align: Align }
export type Block = CanvasBlock | DetailsBlock | TitleBlock | ItemsBlock | TotalsBlock | PaymentsBlock | BankBlock | TextSourceBlock | SignatureBlock | TextBlock | ImageBlock | DividerBlock | SpacerBlock | PageBreakBlock | BadgesBlock
export type BlockKind = Block['kind']
export const BLOCK_KINDS: readonly BlockKind[] = ['cover', 'header', 'footer', 'details', 'title', 'items', 'totals', 'payments', 'bank', 'terms', 'notes', 'signature', 'text', 'image', 'divider', 'spacer', 'pagebreak', 'badges']
export const BLOCK_LABEL: Record<BlockKind, string> = {
  cover: 'Cover', header: 'Header', footer: 'Footer', details: 'Quote details', title: 'Title & intro', items: 'Items table', totals: 'Totals', payments: 'Payment schedule',
  bank: 'Bank details', terms: 'Terms and Conditions', notes: 'Additional notes', signature: 'Signature', text: 'Text', image: 'Picture', divider: 'Line across', spacer: 'Blank space', pagebreak: 'New page', badges: 'Badges',
}
export const BLOCK_ICON: Record<BlockKind, string> = {
  cover: 'crop_portrait', header: 'vertical_align_top', footer: 'vertical_align_bottom', details: 'list_alt', title: 'title', items: 'table_chart', totals: 'functions', payments: 'calendar_month',
  bank: 'account_balance', terms: 'contract', notes: 'sticky_note_2', signature: 'draw', text: 'text_fields', image: 'image', divider: 'horizontal_rule', spacer: 'space_bar', pagebreak: 'insert_page_break', badges: 'verified',
}
export const isCanvas = (b: Block): b is CanvasBlock => b.kind === 'header' || b.kind === 'footer' || b.kind === 'cover'
/** Blocks a template holds once (adding a second makes no sense on a quote). */
export const SINGLETON_KINDS: readonly BlockKind[] = ['cover', 'header', 'footer', 'items', 'totals', 'payments', 'bank', 'terms', 'notes']

/* ── the template ── */
export type TemplateDesign = { page: PageSettings; brand: BrandOverrides; blocks: Block[] }
export type TemplateDefaults = {
  /** The member's working columns a new quote starts with (null = the editor's own default). */
  columns: ColumnKey[] | null
  paymentPreset: string | null
  termsTemplateId: string | null
  notesTemplateId: string | null
  introText: string | null
  validityDays: number
  gstEnabled: boolean
  signatureRequired: boolean
  /** (REG-497) The sections a new quote's Items table starts with, as empty groups — the way the reference quotes read. */
  starterGroups: string[]
}
export const DEFAULT_DEFAULTS: TemplateDefaults = { columns: null, paymentPreset: 'default', termsTemplateId: null, notesTemplateId: null, introText: null, validityDays: 30, gstEnabled: true, signatureRequired: true, starterGroups: [] }

export const TEMPLATE_STATUSES = ['draft', 'published', 'archived'] as const   // awaiting approval (REG-501) is `submitted`, not a status; 'archived' is tolerated on old rows but no longer written (REG-502: delete is soft)
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number]
export const isTemplateStatus = (s: unknown): s is TemplateStatus => typeof s === 'string' && (TEMPLATE_STATUSES as readonly string[]).includes(s)

/* ── ids and defaults ── */
let seq = 0
/** Short ids for blocks and elements (unique within a template). */
export function newId(prefix = 'b'): string { seq += 1; return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}` }

const DEFAULT_ITEM_COLUMNS: ItemsColumn[] = [
  { key: 'no', label: 'S/N', on: true, width: 10, align: 'left' },
  { key: 'item', label: 'Description', on: true, width: 0, align: 'left' },
  { key: 'qty', label: 'Qty', on: false, width: 14, align: 'right' },
  { key: 'unit', label: 'Unit', on: false, width: 16, align: 'left' },
  { key: 'qtyUnit', label: 'Unit', on: true, width: 20, align: 'right' },
  { key: 'unitPrice', label: 'Rate', on: true, width: 22, align: 'right' },
  { key: 'discount', label: 'Disc.', on: false, width: 14, align: 'right' },
  { key: 'total', label: 'Amount', on: true, width: 26, align: 'right' },
]
/** A fresh block of a kind, with the model's sensible defaults. */
export function defaultBlock(kind: BlockKind): Block {
  const id = newId()
  switch (kind) {
    case 'header': return { id, kind, height: 28, repeat: 'every', elements: [
      { id: newId('e'), kind: 'image', x: 0, y: 0, w: 40, h: 14, src: 'logo', fit: 'contain' },
      { id: newId('e'), kind: 'text', x: 100, y: 0, w: 74, text: '{studio_name}\n{studio_address}\n{studio_phone} · {studio_email}', style: { role: 'small', align: 'right', color: 'grey' } },
      { id: newId('e'), kind: 'rule', x: 0, y: 20, w: 174, weight: 0.6, color: 'ink' },
    ] }
    case 'footer': return { id, kind, height: 14, repeat: 'every', elements: [
      { id: newId('e'), kind: 'text', x: 0, y: 4, w: 120, text: '{studio_name} · UEN {studio_uen} · GST Reg. No. {studio_gst}', style: { role: 'small', color: 'grey' } },
      { id: newId('e'), kind: 'pageno', x: 130, y: 4, w: 44, format: 'Page {page} of {pages}', style: { role: 'small', color: 'grey', align: 'right' } },
    ] }
    case 'cover': return { id, kind, height: 0, repeat: 'first', elements: [
      { id: newId('e'), kind: 'box', x: 0, y: 0, w: 210, h: 120, fill: 'accent' },
      { id: newId('e'), kind: 'image', x: 18, y: 18, w: 40, h: 14, src: 'logo-dark', fit: 'contain' },
      { id: newId('e'), kind: 'text', x: 18, y: 150, w: 174, text: '{quote_title}', style: { role: 'heading', size: 26 } },
      { id: newId('e'), kind: 'text', x: 18, y: 168, w: 174, text: 'Prepared for {client_name}\n{site_address}', style: { role: 'body', size: 11, color: 'grey' } },
      { id: newId('e'), kind: 'text', x: 18, y: 260, w: 174, text: '{quote_number} · {date}', style: { role: 'small', color: 'grey' } },
    ] }
    case 'details': return { id, kind, layout: 'columns', labelWidth: 22, style: { role: 'body' }, labelStyle: { role: 'small', color: 'grey', uppercase: true, letterSpacing: 0.5 },
      left: [{ id: newId('r'), label: 'Attn', value: '{client_name}' }, { id: newId('r'), label: 'Address', value: '{site_address}' }, { id: newId('r'), label: 'Contact', value: '{client_phone}' }],
      right: [{ id: newId('r'), label: 'Quote no.', value: '{quote_number}' }, { id: newId('r'), label: 'Date', value: '{date}' }, { id: newId('r'), label: 'Valid until', value: '{valid_until}' }] }
    case 'title': return { id, kind, title: '{quote_title}', titleStyle: { role: 'heading' }, subject: '', subjectStyle: { role: 'body', weight: 700, underline: true, uppercase: true }, intro: 'We are pleased to submit our quotation for the renovation works at the above premises for your kind consideration.', introStyle: { role: 'body' } }
    case 'items': return { id, kind, groupBy: 'category', subGroupBy: 'none', sectionLabel: 'letters', numbering: 'group', bandStyle: 'grey', groupNotes: true, groupNoteStyle: { role: 'small', italic: true, color: 'grey' }, areaStyle: { role: 'table', weight: 700 },
      columns: DEFAULT_ITEM_COLUMNS.map((c) => ({ ...c })), headerRow: 'ruled', headerStyle: { role: 'small', weight: 700, uppercase: true, color: 'grey' }, descriptions: 'first', descriptionStyle: { role: 'small', color: 'grey' }, photos: false,
      subtotals: true, subtotalLabel: 'Sub-total for {section}', lumpSum: false, zeroAmount: 'FOC', currency: 'none', grid: false, fillPage: false, ruled: true, zebra: false, density: 'normal', pageTotals: false, pageTotalLabel: 'Total for page {n}',
      keepGroups: false, groupNewPage: false, hiddenItems: 'omit', optionalSection: true, optionalTitle: 'Optional works', style: { role: 'table' } }
    case 'totals': return { id, kind, layout: 'right', width: 76, rules: 'top', style: { role: 'body' }, totalStyle: { role: 'body', weight: 700, size: 11 }, lines: [
      { key: 'pages', label: 'Total for page {n}', on: false }, { key: 'subtotal', label: 'Subtotal', on: true }, { key: 'discount', label: 'Discount', on: true }, { key: 'additional', label: 'Additional discount', on: true }, { key: 'gst', label: 'GST {gst_rate}', on: true }, { key: 'total', label: 'Grand total', on: true },
    ] }
    case 'payments': return { id, kind, title: 'Payment schedule', layout: 'table', showAmounts: true, showDue: true, letters: false, style: { role: 'body' }, titleStyle: { role: 'body', weight: 700 }, band: false, showTotal: true }
    case 'bank': return { id, kind, title: 'Payment details', titleStyle: { role: 'body', weight: 700 }, style: { role: 'body' }, layout: 'row', qr: true, qrWidth: 22, box: 'tint' }
    case 'terms': return { id, kind, title: 'Terms and Conditions', titleStyle: { role: 'body', weight: 700, underline: true }, style: { role: 'small' }, numbered: true, grid: false, startNewPage: true }
    case 'notes': return { id, kind, title: 'Notes', titleStyle: { role: 'body', weight: 700 }, style: { role: 'small' }, numbered: false, grid: false }
    case 'signature': return { id, kind, lineWeight: 0.5, lineColor: 'ink', style: { role: 'body' }, headingStyle: { role: 'small', weight: 700 }, columns: [
      { id: newId('c'), heading: 'Prepared by', lines: ['{prepared_by}', '{studio_name}', '{prepared_by_phone}'], image: 'member' },
      { id: newId('c'), heading: 'Confirmed & agreed by', lines: ['{client_name}', '{client_phone}', 'Date:'], image: 'client' },
    ] }
    case 'text': return { id, kind, html: '<p>Type here. Insert a field with the { } button.</p>', style: { role: 'body' }, box: 'none' }
    case 'image': return { id, kind, src: 'logo', width: 60, align: 'left' }
    case 'divider': return { id, kind, weight: 0.5, color: 'light' }
    case 'spacer': return { id, kind, height: 8 }
    case 'pagebreak': return { id, kind }
    case 'badges': return { id, kind, items: [], height: 10, align: 'center' }
  }
}

/** Parse a stored design defensively (a public server action writes it); a broken store falls back to `fallback`. */
export function parseDesign(json: string | null | undefined, fallback: TemplateDesign): TemplateDesign {
  if (!json) return fallback
  try {
    const raw = JSON.parse(json) as Partial<TemplateDesign>
    if (!raw || !Array.isArray(raw.blocks)) return fallback
    const page = raw.page && isPaper(raw.page.paper) ? { ...DEFAULT_PAGE, ...raw.page, margins: { ...DEFAULT_PAGE.margins, ...(raw.page.margins ?? {}) }, dateFormat: isDateFormat(raw.page.dateFormat) ? raw.page.dateFormat : 'short' } : fallback.page
    return { page, brand: raw.brand ?? {}, blocks: raw.blocks.filter((b): b is Block => !!b && typeof b === 'object' && (BLOCK_KINDS as readonly string[]).includes((b as Block).kind)) }
  } catch { return fallback }
}
export function parseDefaults(json: string | null | undefined): TemplateDefaults {
  if (!json) return DEFAULT_DEFAULTS
  try { const raw = JSON.parse(json) as Partial<TemplateDefaults>; return { ...DEFAULT_DEFAULTS, ...raw, starterGroups: Array.isArray(raw.starterGroups) ? raw.starterGroups.filter((g): g is string => typeof g === 'string' && g.trim() !== '') : [] } } catch { return DEFAULT_DEFAULTS }
}

/* ── the record as the app carries it ── */
export type TemplateSummary = {
  id: string
  name: string
  status: TemplateStatus
  version: number
  isDefault: boolean
  paper: Paper
  updatedAt: number | null
  updatedBy: { name: string; color: string } | null
  publishedAt: number | null
  lastUsedAt: number | null
  usedBy: number
  hasDraft: boolean
  sourceFile: string | null
  /** (REG-501) Who submitted it for approval and when, with their note; the owner's changes-requested note while it waits. */
  submitted: { by: { name: string; color: string } | null; at: number; note: string } | null
  reviewNote: string | null
  /** (REG-502) Soft-deleted: listed only in Deleted templates; the quotes on it keep printing their pinned version. */
  deletedAt: number | null
  /** (REG-538) Who deleted it — the sheet's "Deleted by" (it used to show whoever last edited). */
  deletedBy: { name: string; color: string } | null
  /** The published design (or the draft's, for a draft) — what the thumbnail draws. */
  design: TemplateDesign
}
export type TemplateVersion = { version: number; note: string; publishedAt: number; publishedBy: { name: string; color: string } | null }
export type TemplateRecord = TemplateSummary & {
  draft: { design: TemplateDesign; defaults: TemplateDefaults; updatedAt: number } | null
  defaults: TemplateDefaults
  versions: TemplateVersion[]
  note: string
}
