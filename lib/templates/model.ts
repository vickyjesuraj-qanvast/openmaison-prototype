/**
 * Quote templates — the document model (Company › Templates › Quote templates; proposal v3 of 2026-09-17, REG-485).
 * A template is a DESIGN (page settings, brand overrides and an ordered list of blocks) plus DEFAULTS (what a new quote
 * starts with). Blocks are of two kinds: CANVAS blocks (header · footer · cover) hold elements placed by hand in mm and
 * repeat by rule; FLOW blocks (quote details, title, items table, totals, payment schedule, terms, notes, signature, text,
 * image, divider, spacer, page break, badges) stack in order and paginate by their content. Client-safe: no server imports.
 */
import type { ColumnKey } from '@/lib/quotes/items-model'
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'   // (S44T — handed over by S44Q) the house allowlist, pure

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
export type PageSettings = { paper: Paper; margins: Margins; watermark: string; dateFormat: DateFormat; /** (REG-618, parity Q-18) the watermark's strength in %, 3–40; unset = 7 */ watermarkOpacity?: number }
export const WATERMARK_OPACITY = 7
export const DEFAULT_PAGE: PageSettings = { paper: 'A4', margins: { top: 18, right: 18, bottom: 18, left: 18 }, watermark: '', dateFormat: 'short' }

/* ── brand ── */
export const COLOR_KEYS = ['ink', 'grey', 'accent', 'light', 'band', 'red'] as const
export type ColorKey = (typeof COLOR_KEYS)[number]
export const COLOR_LABEL: Record<ColorKey, string> = { ink: 'Brand ink', grey: 'Brand grey', accent: 'Accent', light: 'Brand light', band: 'Table band', red: 'Highlight' }   // (the calm UI build 2026-10-27, W-488) "Band" alone was unclear
export const FONT_ROLES = ['heading', 'body', 'table', 'small'] as const
export type FontRole = (typeof FONT_ROLES)[number]
export const FONT_ROLE_LABEL: Record<FontRole, string> = { heading: 'Heading', body: 'Body', table: 'Table', small: 'Small print' }
export type FontSpec = { family: string; size: number; weight: 400 | 600 | 700; italic?: boolean }
/** The curated faces (owner 2026-09-17: the list first, uploads later) — the three reference quotes' Arial, Times New Roman and Courier among them.
    (pending modules S11, card held:quote-templates) + Outfit, 1.0's sixth document font (its covers' titles). The web faces are self-hosted
    (app/globals.css, public/fonts/doc) and Inter is the app's own, so each prints as named on every computer — before, a computer without
    the face printed it in the stack's next one. A studio's own uploads join the list after these (`fontChoices`). */
export const FONT_FAMILIES = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Calibri', 'Cambria', 'Verdana', 'Trebuchet MS', 'Inter', 'Montserrat', 'Lato', 'Outfit', 'Playfair Display', 'Fraunces'] as const
const FONT_STACK: Record<string, string> = {
  Arial: 'Arial, "Helvetica Neue", Helvetica, sans-serif', Helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif', 'Times New Roman': '"Times New Roman", Times, serif',
  Georgia: 'Georgia, "Times New Roman", serif', 'Courier New': '"Courier New", Courier, monospace', Calibri: 'Calibri, Carlito, "Segoe UI", sans-serif', Cambria: 'Cambria, Caladea, Georgia, serif',
  Verdana: 'Verdana, Geneva, sans-serif', 'Trebuchet MS': '"Trebuchet MS", "Lucida Grande", sans-serif', Inter: 'var(--font-inter), Inter, "Helvetica Neue", Arial, sans-serif', Montserrat: 'Montserrat, "Gill Sans", "Trebuchet MS", sans-serif',
  Lato: 'Lato, "Helvetica Neue", Arial, sans-serif', Outfit: 'Outfit, "Helvetica Neue", Arial, sans-serif', 'Playfair Display': '"Playfair Display", Georgia, serif', Fraunces: 'Fraunces, Georgia, serif',
}
/** A family's CSS stack; a name that isn't one of the curated faces (a studio's upload, a family a ported design names) is quoted. */
export const fontStack = (family: string) => FONT_STACK[family] ?? `"${family.replace(/["\\]/g, '')}", sans-serif`

/** (pending modules S11 — 1.0's studio_assets type `font`) A font file the studio uploaded: one face of a family (its weight and italic),
    served from /files/font/<id>. Read in with the kit (`fetchBrand`), never saved with it. */
export type FontFace = { id: string; family: string; weight: 400 | 600 | 700; italic: boolean; format: 'woff2' | 'woff' | 'truetype' | 'opentype' }
/** Every font a template's text can take: the curated faces, then the studio's own families (each once, in the order they came). */
export function fontChoices(brand: { faces?: FontFace[] } | null | undefined): string[] {
  const out: string[] = [...FONT_FAMILIES]
  for (const f of brand?.faces ?? []) if (!out.some((x) => x.toLowerCase() === f.family.toLowerCase())) out.push(f.family)
  return out
}
/** A font box's list: every choice, and the family it holds now when that is not one of them (a removed upload, a family a ported design
    names) — so the box still reads what prints. */
export const fontOptions = (brand: { faces?: FontFace[] } | null | undefined, current?: string): string[] => { const list = fontChoices(brand); return current && !list.some((f) => f.toLowerCase() === current.toLowerCase()) ? [...list, current] : list }
/** The @font-face rules that make the studio's own faces print — one per uploaded file — and each file once more under a name of its own
    (`faceAlias`), for a sample that shows that one file whatever its weight. */
export const faceAlias = (f: Pick<FontFace, 'id'>) => `om-face-${f.id.replace(/[^A-Za-z0-9-]/g, '')}`
export const fontFaceCss = (faces: FontFace[] | undefined) => (faces ?? []).flatMap((f) => {
  const src = `src: url("/files/font/${encodeURIComponent(f.id)}") format("${f.format}"); font-display: swap;`
  return [`@font-face { font-family: "${f.family.replace(/["\\]/g, '')}"; ${src} font-weight: ${f.weight}; font-style: ${f.italic ? 'italic' : 'normal'}; }`, `@font-face { font-family: "${faceAlias(f)}"; ${src} }`]
}).join('\n')

/** (REG-562) An issuing entity and where its money goes: the studio itself first, then any other company it quotes under. The
    PayNow QR is an uploaded image path; empty strings print nothing. */
export type IssuingEntity = {
  name: string; bankName: string; accountName: string; accountNo: string; payNow: string; payNowQr: string | null; /** (REG-593) off = quotes raised under it carry no GST */ gstRegistered: boolean
  /** (REG-618, parity Q-24) the bank's SWIFT / BIC code */ swift: string
  /** (REG-618, parity Q-26) the entity's own letterhead: a logo, an address, its registration numbers. Blank address = the studio's;
      a blank UEN or GST number stays blank — a registration number never inherits (1.0's rule for every entity but the studio itself). */
  logo: string | null; address: string; uen: string; gstReg: string
  /** (REG-647, settings parity Q-10) The entity's own key: a rename is carried to the quotes and contracts that name it; 'studio' for the first. */
  id: string
  /** (REG-647) Retired: kept for what already names it — it keeps printing there — and no longer offered for new quotes and contracts. */
  retired?: boolean
  /** (parity map, FB-103 — 1.0's Legal Entities: contact, branding, branch) "More details" on Company › Profile: the entity's own contacts and
      tagline (blank = the studio's, for the first entity always the studio's), its accent colour (blank = the brand kit's accent), a footer line
      its papers print at the foot, and its bank's branch code. Optional, so every entity saved before reads as blank. Country and currency stay
      Singapore and S$ (DEF-30). */
  email?: string; phone?: string; website?: string; tagline?: string; accent?: string; footer?: string; branch?: string
}
/** (parity map, FB-103) The entity's More details as stored: trimmed strings, a six-digit hex accent (else none), each only when filled — an
    entity saved before reads as it was. Read by the brand record's parser (lib/templates/brand.ts). */
export const ENTITY_TEXT_MAX = 160
export const ENTITY_FOOTER_MAX = 300
export function parseEntityExtras(e: Record<string, unknown>): Pick<IssuingEntity, 'email' | 'phone' | 'website' | 'tagline' | 'accent' | 'footer' | 'branch'> {
  const t = (v: unknown, max = ENTITY_TEXT_MAX) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const out: Pick<IssuingEntity, 'email' | 'phone' | 'website' | 'tagline' | 'accent' | 'footer' | 'branch'> = {}
  const email = t(e.email), phone = t(e.phone, 40), website = t(e.website), tagline = t(e.tagline), footer = t(e.footer, ENTITY_FOOTER_MAX), branch = t(e.branch, 20)
  const accent = typeof e.accent === 'string' && /^#[0-9a-f]{6}$/i.test(e.accent.trim()) ? e.accent.trim().toUpperCase() : ''
  if (email) out.email = email
  if (phone) out.phone = phone
  if (website) out.website = website
  if (tagline) out.tagline = tagline
  if (accent) out.accent = accent
  if (footer) out.footer = footer
  if (branch) out.branch = branch
  return out
}
export const EMPTY_ENTITY = (name: string, id = 'studio'): IssuingEntity => ({ id, name, bankName: '', accountName: '', accountNo: '', payNow: '', payNowQr: null, gstRegistered: true, swift: '', logo: null, address: '', uen: '', gstReg: '' })
/** (REG-647) The entities a new quote or contract may be issued under: the live ones, plus the one it already names. */
export const offeredEntities = (list: IssuingEntity[], current?: string | null) => list.filter((e) => !e.retired || (!!current && e.name === current))
/** (REG-618, parity Q-20) The studio's social links, one per network, printed as typed by the Social links element and `{studio_social}`. */
export const SOCIAL_KEYS = ['website', 'instagram', 'facebook', 'tiktok', 'whatsapp', 'linkedin'] as const
export type SocialKey = (typeof SOCIAL_KEYS)[number]
export const SOCIAL_LABEL: Record<SocialKey, string> = { website: 'Website', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', whatsapp: 'WhatsApp', linkedin: 'LinkedIn' }
export type SocialLinks = Partial<Record<SocialKey, string>>
/** (REG-618, parity Q-25) What `{prepared_by}` prints: the member who prepared the quote, every member on the lead, or the studio's name. */
export type PreparedByMode = 'member' | 'team' | 'studio'
export type StudioDetails = {
  name: string; address: string; phone: string; fax: string; email: string; website: string; uen: string; gstReg: string; licence: string
  /** (REG-562) A tagline and the studio's social handles, for footers and covers — `{studio_tagline}` · `{studio_social}`. `social` is the old
      one-line field, printed only while no network below is filled (REG-618). */
  tagline: string; social: string
  /** (REG-618, parity Q-20) One handle or link per network. */
  socials: SocialLinks
  /** (pending modules S14 — 1.0's Review Link) The page where clients review the studio; never printed — Maison AI's Ask for a review sends
      it (lib/company/review-link.ts). '' or absent = none. */
  reviewLink?: string
  /** (REG-562) The issuing entities with their bank details; the quote's Issuing Entity picks one, the Bank details block prints it. */
  entities: IssuingEntity[]
  /** (REG-617, parity Q-08) Settings › Quotes › Trades: a default note per trade, keyed by the trade's name in lower case. It prints
      under a section of that name when the quote writes none of its own. Read in with the details (`fetchBrand`); never saved with them. */
  tradeNotes?: Record<string, string>
  /** (REG-618, parity Q-25) Settings › Quotes › Prepared by — read in with the details, like the trades' notes. */
  preparedByMode?: PreparedByMode
  /** (REG-645, settings parity Q-05) The studio's own GST registration (Settings › Quotes & pricing › GST) — read in with the details;
      off, the studio's letterhead prints no GST number. Never saved with them. */
  gstRegistered?: boolean
  /** (S44Q — row 256) The studio's GST rate (Settings › Quotes & pricing › GST) — `{gst_rate}`'s fallback on a quote with no line bearing GST.
      Read in with the details; never saved with them. */
  gstPct?: number
}
export type BrandKit = {
  logo: string | null
  logoDark: string | null
  stamp: string | null
  badges: string[]
  colors: Record<ColorKey, string>
  fonts: Record<FontRole, FontSpec>
  /** (pending modules S11) The studio's uploaded font files (Company › Templates › Brand kit › Fonts) — read in, never saved with the kit. */
  faces?: FontFace[]
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
    ...(base.faces ? { faces: base.faces } : {}),   // (pending modules S11) the studio's own fonts ride with the kit a template draws with
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
export type KVRow = { id: string; label: string; value: string; /** (S44T — UAT row 248) this row's label, or its value, printed bold */ labelBold?: boolean; valueBold?: boolean }
/** (S44T — UAT rows 322 · 248) How a Details box draws its rows: no lines, a line under each value (a form), or every cell boxed. */
export type KvLines = 'none' | 'under' | 'boxed'
export type SignatureColumn = { id: string; heading: string; lines: string[]; image: 'none' | 'member' | 'client' | 'stamp'; caption?: string }
export type ElementBase = { id: string; x: number; y: number; w: number; h?: number; locked?: boolean }
export type CanvasElement = ElementBase & (
  | { kind: 'text'; text: string; style: TextStyle; hideIfEmpty?: boolean }
  | { kind: 'image'; src: 'logo' | 'logo-dark' | 'stamp' | string; fit: 'contain' | 'cover'; box?: string }
  | { kind: 'kv'; rows: KVRow[]; labelWidth: number; style: TextStyle; labelStyle: TextStyle; lines: KvLines; gap: number }
  | { kind: 'rule'; weight: number; color: string }
  | { kind: 'box'; fill?: string; stroke?: string; weight?: number }
  | { kind: 'signature'; columns: SignatureColumn[]; style: TextStyle; headingStyle: TextStyle; lineWeight: number; lineColor: string; preamble?: string }
  | { kind: 'badges'; items: string[]; gap: number; align: Align }
  | { kind: 'pageno'; format: string; style: TextStyle }
  /** (REG-618, parity Q-20) The studio's social links from Company › Profile: an icon and the handle for each filled network, in a row or a column. */
  | { kind: 'social'; networks: SocialKey[]; layout: 'row' | 'column'; gap: number; style: TextStyle }
)
export type ElementKind = CanvasElement['kind']
export const ELEMENT_LABEL: Record<ElementKind, string> = { text: 'Text', image: 'Picture', kv: 'Details', rule: 'Line', box: 'Box', signature: 'Signature', badges: 'Badges', pageno: 'Page number', social: 'Social links' }

/* ── blocks ── */
export type Repeat = 'every' | 'first' | 'not-first'
export type BlockBase = { id: string; hidden?: boolean; startNewPage?: boolean; keepWithNext?: boolean; spaceBefore?: number; spaceAfter?: number }
export type CanvasKind = 'header' | 'footer' | 'cover'
export type CanvasBlock = BlockBase & { kind: CanvasKind; height: number; repeat: Repeat; elements: CanvasElement[]; background?: string; rule?: { weight: number; color: string } | null }
export type DetailsBlock = BlockBase & { kind: 'details'; layout: 'columns' | 'stacked' | 'form'; left: KVRow[]; right: KVRow[]; labelWidth: number; style: TextStyle; labelStyle: TextStyle
  /** (S44T — UAT row 322) The rows' lines; unset = the layout's own (Form lines = under the values, else none). A stored 'form' layout reads as
      two columns with lines under the values. */
  lines?: KvLines }
/** (S44T) A Details block's columns and lines as it prints — the old Form lines layout is two columns with a line under each value. */
export const detailsLook = (b: Pick<DetailsBlock, 'layout' | 'lines'>): { layout: 'columns' | 'stacked'; lines: KvLines } => ({ layout: b.layout === 'stacked' ? 'stacked' : 'columns', lines: b.lines ?? (b.layout === 'form' ? 'under' : 'none') })
export type TitleBlock = BlockBase & { kind: 'title'; title: string; titleStyle: TextStyle; subject: string; subjectStyle: TextStyle; intro: string; introStyle: TextStyle }
export const ITEM_COLUMN_KEYS = ['no', 'item', 'qty', 'unit', 'qtyUnit', 'unitPrice', 'discount', 'optional', 'total'] as const   // (REG-617, parity Q-11) `optional` = the Optional price column
export type ItemsColumnKey = (typeof ITEM_COLUMN_KEYS)[number]
export const ITEM_COLUMN_LABEL: Record<ItemsColumnKey, string> = { no: '#', item: 'Item', qty: 'Qty', unit: 'Unit', qtyUnit: 'Qty · Unit', unitPrice: 'Unit price', discount: 'Discount', optional: 'Optional price', total: 'Total' }
export type ItemsColumn = { key: ItemsColumnKey; label: string; on: boolean; width: number; align: Align; color?: string }
export type ItemsBlock = BlockBase & {
  kind: 'items'
  groupBy: 'none' | 'category' | 'room' | 'section'
  subGroupBy: 'none' | 'room' | 'category'
  sectionLabel: 'letters' | 'numbers' | 'none'
  numbering: 'group' | 'area' | 'continuous' | 'none' | 'nested' | 'lettered' | 'rooms' | 'roman'   // (REG-558) nested = 1 · 1.1 · a b c: the section's number, its lines, a sub-section's lines lettered; (REG-617, parity Q-10) lettered = A1 · A2 · B1, the section's letter before each number, restarting per section; (Dane UAT, Figma 1518:77) rooms = B · 1 Kitchen · 1.1 — the room rows numbered inside their section, each line the room's number and its own (with sections marked 1 · 2 · 3: 1 · 1.1 Kitchen · 1.1.1); roman = 1 · a · i — the section's number, the room's letter, the line in roman numerals
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
  /** (REG-617, parity Q-21) Where a section's sub-total prints: a row after its items (the default), in its heading band, or both. */
  subtotalAt?: 'row' | 'band' | 'both'
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
  /* ── (S44T — his UAT ask 2026-10-15) Every option below is unset on a stored template, and unset prints exactly as before. ── */
  /** (UAT rows 252 · 257 · 265 · 266 · 267 · 303 — M1) Space inside the table, in mm: before a section (not the first), under a section's
      heading, under a section's note, before a sub-section or room (none straight after its section's heading or note), between two lines. */
  spacing?: Partial<Record<ItemsSpaceKey, number>>
  /** (UAT row 252 — M1) The section heading band's own height; unset = the rows' (Row height). */
  headingHeight?: ItemsBlock['density']
  /** (UAT row 270) A section's note runs across the table, or only under the Item column. */
  noteWidth?: 'table' | 'item'
  /** (UAT row 329) A section's note sits inside its heading's band — the band's fill and ink, no gap between. */
  noteInBand?: boolean
  /** (UAT row 324) A line whose quantity is 0 prints nothing there, or a dash. */
  zeroQty?: 'blank' | 'dash'
  /** (UAT row 363) Lines between rows: none, between rows only (the table's last row bare), or under every row; unset = `ruled`'s. */
  rowLines?: 'none' | 'between' | 'under'
  /** (UAT rows 253 · 276 — M2) The sub-total and lump-sum rows' text; unset = the rows' style in bold, as always. */
  subtotalStyle?: TextStyle
  /** (call C1) The title over the sections priced after the contract. */
  afterTitle?: string
}
/** (S44T — M1) The Items table's spacing knobs, in the order the inspector lists them. */
export const ITEMS_SPACE_KEYS = ['beforeSection', 'underHeading', 'underNote', 'beforeSub', 'betweenLines'] as const
export type ItemsSpaceKey = (typeof ITEMS_SPACE_KEYS)[number]
export const ITEMS_SPACE_LABEL: Record<ItemsSpaceKey, string> = { beforeSection: 'Before a section', underHeading: 'Under a section heading', underNote: 'Under a section note', beforeSub: 'Before a sub-section', betweenLines: 'Between lines' }
/** (S44T — call C1) What the part priced after the contract is called when the template says nothing. */
export const AFTER_TITLE = 'Priced after the contract'
/** (S44T — UAT row 363) A table's lines between rows as it prints: the new choice, else the old switch. */
export const rowLinesOf = (b: Pick<ItemsBlock, 'rowLines' | 'ruled'>) => b.rowLines ?? (b.ruled ? 'under' : 'none')
/** (S44T — M2) The sub-total rows' style: the template's own, else the rows' style in bold — what they always printed. */
export const subtotalStyleOf = (b: Pick<ItemsBlock, 'subtotalStyle' | 'style'>): TextStyle => b.subtotalStyle ?? { ...b.style, weight: 700 }
/** (S44T — M2) How money prints: "S$1,234.00" · "$" apart from "1,234.00" · "1,234.00". */
export type Currency = ItemsBlock['currency']
export type TotalsLineKey = 'pages' | 'subtotal' | 'discount' | 'additional' | 'gst' | 'total'
export type TotalsBlock = BlockBase & { kind: 'totals'; lines: { key: TotalsLineKey; label: string; on: boolean }[]; layout: 'right' | 'full'; width: number; style: TextStyle; totalStyle: TextStyle; rules: 'none' | 'top' | 'double' | 'grid'
  /** (S44T — UAT rows 253 · 300, M2) How its money prints; unset = "S$1,234.00", as always. The Items table's Currency sets it too. */
  currency?: Currency }
export type PaymentsBlock = BlockBase & { kind: 'payments'; title: string; layout: 'table' | 'list' | 'cards'; showAmounts: boolean; showDue: boolean; letters: boolean; style: TextStyle; titleStyle: TextStyle; band: boolean; /** (REG-560) a Total line under the milestones */ showTotal?: boolean
  /** (REG-618, parity Q-16) the milestones marked 1st · 2nd · 3rd (over `letters`); a small-print footnote under the schedule */ ordinals?: boolean; footnote?: string
  /** (S44T — UAT row 354, M6) the milestones marked (a) · (b) · (c) (over `letters` and `ordinals`) */ parens?: boolean
  /** (S44T — UAT row 355, M6) where the share prints: before the words (unset, as always), in a column of its own (the table), or not at all */ pctAt?: 'inline' | 'column' | 'none'
  /** (S44T — M2) how its amounts print; unset = "S$1,234.00", as always */ currency?: Currency
  /** (S44T — call C5, UAT row 294) the issuing entity's PayNow QR beside the schedule, at this size in mm */ qr?: boolean; qrWidth?: number }
/** (REG-562) Bank details: the issuing entity's bank, account and PayNow, with its QR beside — from Company › Profile. */
export type BankBlock = BlockBase & { kind: 'bank'; title: string; titleStyle: TextStyle; style: TextStyle; layout: 'row' | 'stacked'; qr: boolean; qrWidth: number; box: 'none' | 'tint' | 'outline'; /** (REG-618, parity Q-24) the studio's own words for each row */ labels?: Partial<Record<BankRowKey, string>> }
export const BANK_ROWS = ['bank', 'accountName', 'accountNo', 'swift', 'payNow'] as const
export type BankRowKey = (typeof BANK_ROWS)[number]
export const BANK_ROW_LABEL: Record<BankRowKey, string> = { bank: 'Bank', accountName: 'Account name', accountNo: 'Account number', swift: 'SWIFT', payNow: 'PayNow' }
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
  { key: 'optional', label: 'Optional', on: false, width: 24, align: 'right' },
  { key: 'total', label: 'Amount', on: true, width: 26, align: 'right' },
]
/** (REG-617) A stored Items block from before a column existed gains it, off, where the defaults put it (the Optional price column sits before the Total). */
export function withAllColumns(columns: ItemsColumn[]): ItemsColumn[] {
  const have = new Set(columns.map((c) => c.key))
  let out = columns.filter((c) => (ITEM_COLUMN_KEYS as readonly string[]).includes(c.key))
  for (const d of DEFAULT_ITEM_COLUMNS) {
    if (have.has(d.key)) continue
    const at = d.key === 'optional' ? out.findIndex((c) => c.key === 'total') : -1
    out = at >= 0 ? [...out.slice(0, at), { ...d }, ...out.slice(at)] : [...out, { ...d }]
  }
  return out
}
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
      { id: newId('c'), heading: 'Confirmed & agreed by', lines: ['{client_name}', '{client_phone}', 'Date: {signed_date}'], image: 'client' },   // (S44T — UAT row 331) the day the client signed, once signed
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
    const blocks = raw.blocks.filter((b): b is Block => !!b && typeof b === 'object' && (BLOCK_KINDS as readonly string[]).includes((b as Block).kind))
      .map((b) => (b.kind === 'items' && Array.isArray(b.columns) ? { ...b, columns: withAllColumns(b.columns) } : b))
      /* (S44T — triage §12.1, handed over by S44Q) a Text block's words keep only the house allowlist's markup — every design read and every
         save goes through here, so a stray tag, a handler or a script link never reaches the editor, the print or a client's page */
      .map((b) => (b.kind === 'text' ? { ...b, html: typeof b.html === 'string' ? sanitizeContractHtml(b.html) : '' } : b))
    return { page, brand: raw.brand ?? {}, blocks }
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
  /** (REG-664) Its folder in Templates › Quotes (null = the top). */
  folderId: string | null
  /** When it was made — the gallery's sort by age. */
  createdAt: number
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
