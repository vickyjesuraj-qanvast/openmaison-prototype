/**
 * The house styles (REG-487): Letter, Scope and Form are the owner's three reference quotes rebuilt as templates
 * (design-source/reference/quotes/README.md — Dyel's Sales Contract, Flo Design's scope quotation, Cove Interior's boxed
 * form); Presentation is the design studio's deck. "From a house style" starts a template from one, "Recreate from my
 * current quote" returns one as the match, and the studio's three seeded templates wear the first three. Client-safe.
 */
import { DEMO_BADGES, payQrSvg } from './assets'
import { defaultBlock, ITEM_COLUMN_KEYS, newId, type CanvasElement, type ItemsBlock, type ItemsColumn, type TemplateDefaults, type TemplateDesign, type TextStyle, DEFAULT_DEFAULTS } from './model'

const PRESET_KEYS = ['letter', 'scope', 'form', 'presentation'] as const
export type PresetKey = (typeof PRESET_KEYS)[number]
export const isPresetKey = (s: unknown): s is PresetKey => typeof s === 'string' && (PRESET_KEYS as readonly string[]).includes(s)
export type Preset = { key: PresetKey; name: string; blurb: string; paper: 'A4' | 'Letter'; design: () => TemplateDesign; defaults: TemplateDefaults }

const t = (x: number, y: number, w: number, text: string, style: TextStyle, extra: Partial<Extract<CanvasElement, { kind: 'text' }>> = {}): CanvasElement => ({ id: newId('e'), kind: 'text', x, y, w, text, style, ...extra })
const img = (x: number, y: number, w: number, h: number, src: string, box?: string): CanvasElement => ({ id: newId('e'), kind: 'image', x, y, w, h, src, fit: 'contain', box })
const rule = (x: number, y: number, w: number, weight = 0.5, color = 'ink'): CanvasElement => ({ id: newId('e'), kind: 'rule', x, y, w, weight, color })
const kv = (x: number, y: number, w: number, rows: [string, string][], labelWidth: number, style: TextStyle, labelStyle: TextStyle, lines: 'none' | 'under' = 'none', gap = 1.2): CanvasElement =>
  ({ id: newId('e'), kind: 'kv', x, y, w, rows: rows.map(([label, value]) => ({ id: newId('r'), label, value })), labelWidth, style, labelStyle, lines, gap })
const pageno = (x: number, y: number, w: number, format: string, style: TextStyle): CanvasElement => ({ id: newId('e'), kind: 'pageno', x, y, w, format, style })

const cols = (spec: [ItemsColumn['key'], string, number, ItemsColumn['align'], string?][]): ItemsColumn[] => {
  const on = new Map(spec.map((s) => [s[0], s]))
  const all: ItemsColumn['key'][] = [...ITEM_COLUMN_KEYS]
  const defaults: Record<ItemsColumn['key'], [string, number, ItemsColumn['align']]> = { no: ['#', 10, 'left'], item: ['Description', 0, 'left'], qty: ['Qty', 14, 'right'], unit: ['Unit', 16, 'left'], qtyUnit: ['Unit', 20, 'right'], unitPrice: ['Rate', 22, 'right'], discount: ['Disc.', 14, 'right'], optional: ['Optional', 24, 'right'], total: ['Amount', 26, 'right'] }
  return all.map((key) => { const s = on.get(key); const d = defaults[key]; return s ? { key, label: s[1], width: s[2], align: s[3], on: true, ...(s[4] ? { color: s[4] } : {}) } : { key, label: d[0], width: d[1], align: d[2], on: false } })
}
const items = (over: Partial<ItemsBlock>): ItemsBlock => ({ ...(defaultBlock('items') as ItemsBlock), ...over })

/* ── Letter · Dyel's Sales Contract ── */
function letter(): TemplateDesign {
  const body: TextStyle = { role: 'body' }
  return {
    page: { paper: 'A4', margins: { top: 12, right: 18, bottom: 10, left: 18 }, watermark: '', dateFormat: 'short' },
    brand: { colors: { band: '#D9D9D9', ink: '#1A1A1A', grey: '#444444' }, fonts: { heading: { family: 'Arial', size: 10, weight: 700 }, body: { family: 'Arial', size: 8.5, weight: 400 }, table: { family: 'Arial', size: 8.5, weight: 400 }, small: { family: 'Courier New', size: 8, weight: 400 } } },
    blocks: [
      { id: newId(), kind: 'header', height: 76, repeat: 'every', elements: [
        img(0, 0, 36, 16, 'logo'),
        pageno(140, 1, 34, '{page} of {pages}', { font: 'Georgia', size: 9, align: 'right' }),
        t(0, 20, 60, 'Sales Contract', { role: 'heading', underline: true }),
        kv(0, 27, 120, [['Date', '{date}'], ['Attn', '{client_name}'], ['IC', '{nric}'], ['Address', '{site_address}'], ['H/P', '{client_phone}'], ['Ref', '{project_ref}']], 16, { role: 'body', weight: 700 }, { role: 'body', weight: 700 }, 'none', 0.9),
        t(0, 55, 100, 'Dear Sir / Mdm,', body),
        t(0, 61, 174, 'CONTRACT FOR RENOVATION AND CARPENTRY WORKS AT THE ABOVE PREMISES', { role: 'body', weight: 700, underline: true, uppercase: true }),
        t(0, 66, 174, 'We are to submit the following quotation for your kind perusal and consideration', body),
      ] },
      items({ groupBy: 'category', subGroupBy: 'room', sectionLabel: 'letters', numbering: 'area', bandStyle: 'grey', groupNotes: true, groupNoteStyle: { role: 'table', weight: 700, underline: true }, areaStyle: { role: 'table', weight: 700 },
        columns: cols([['no', '', 8, 'center'], ['item', '', 0, 'left'], ['total', '', 30, 'right']]), headerRow: 'none', descriptions: 'none', subtotals: false, zeroAmount: 'Inclusive', currency: '$ ', ruled: false, density: 'compact', keepGroups: false, optionalTitle: 'Optional Works' }),
      { id: newId(), kind: 'notes', title: '', titleStyle: { role: 'body', weight: 700 }, style: { role: 'small', font: 'Arial', size: 7.5, weight: 700 }, numbered: true, grid: false, spaceBefore: 4 },
      { id: newId(), kind: 'totals', layout: 'right', width: 62, rules: 'double', style: { role: 'body', weight: 700 }, totalStyle: { role: 'body', weight: 700 }, lines: [
        { key: 'pages', label: 'Total for page {n}', on: false }, { key: 'subtotal', label: 'TOTAL:', on: true }, { key: 'discount', label: 'Discount:', on: false }, { key: 'additional', label: 'Less discount:', on: true }, { key: 'gst', label: 'Gst {gst_rate}:', on: true }, { key: 'total', label: 'GRAND TOTAL:', on: true },
      ], spaceBefore: 6 },
      { id: newId(), kind: 'payments', title: 'Terms & Mode of Payment', layout: 'list', showAmounts: false, showDue: false, letters: true, style: { role: 'body' }, titleStyle: { role: 'body', weight: 700, underline: true }, band: false, startNewPage: true },
      { id: newId(), kind: 'terms', title: 'Terms and Conditions', titleStyle: { role: 'body', weight: 700, underline: true }, style: { role: 'table', size: 8 }, numbered: true, grid: false },
      { id: newId(), kind: 'footer', height: 36, repeat: 'every', elements: [
        { id: newId('e'), kind: 'signature', x: 0, y: 0, w: 174, columns: [
          { id: newId('c'), heading: '{prepared_by} Designer', lines: ['H/P {prepared_by_phone}'], image: 'none' },
          { id: newId('c'), heading: '{client_name}', lines: ['{client_phone}'], image: 'none' },
        ], style: { role: 'body' }, headingStyle: { role: 'body', weight: 700 }, lineWeight: 0.5, lineColor: 'ink' },
        /* (REG-569) the signature block is ~20 mm tall (mark, line, name, phone); the address sat at 16 and printed over it */
        t(0, 22, 174, '{studio_name}\n{studio_address} Tel:{studio_phone} Fax:{studio_fax}\n{studio_website}\nGST Reg. No : {studio_gst}', { role: 'small', underline: true }),
      ] },
    ],
  }
}

/* ── Scope · Flo Design's quotation ── */
function scope(): TemplateDesign {
  const red = 'red'
  return {
    page: { paper: 'A4', margins: { top: 10, right: 14, bottom: 10, left: 14 }, watermark: '', dateFormat: 'short' },
    brand: { badges: DEMO_BADGES, colors: { red: '#C00000', band: '#D9D9D9', ink: '#111111' }, fonts: { heading: { family: 'Times New Roman', size: 10, weight: 700 }, body: { family: 'Times New Roman', size: 8.5, weight: 400 }, table: { family: 'Times New Roman', size: 8.5, weight: 400 }, small: { family: 'Arial', size: 7, weight: 400 } } },
    blocks: [
      { id: newId(), kind: 'header', height: 66, repeat: 'every', elements: [
        img(0, 0, 56, 18, 'logo'),
        rule(0, 19.5, 182, 0.8),
        t(100, 20.5, 82, '{studio_name} Co. Reg. No. {studio_uen}', { role: 'small', align: 'right' }),
        kv(0, 24, 100, [['Name:', '{client_name}'], ['IC No:', '{nric}'], ['Address:', '{site_address}'], ['Email:', '{client_email}']], 14, { role: 'body' }, { role: 'body' }, 'none', 0.8),
        kv(126, 24, 56, [['Quotation No:', '{quote_number}'], ['Contact No:', '{prepared_by_phone}'], ['Date:', '{date}']], 24, { role: 'body' }, { role: 'body' }, 'none', 0.8),
        t(0, 44, 182, 'QUOTATION FOR THE PROPOSED INTERIOR DESIGN WORKS', { role: 'body', weight: 700, underline: true, uppercase: true }),
        t(0, 49, 182, 'Thank you for considering {studio_name} for your upcoming renovation. We are pleased to present our quotation for your kind consideration.\nThis quotation is valid for {validity_days} days from the date of issue. Please feel free to contact us should you require any clarification.\nWe look forward to working with you.', { role: 'body', lineHeight: 1.35 }),
      ] },
      items({ groupBy: 'category', subGroupBy: 'room', sectionLabel: 'letters', numbering: 'area', bandStyle: 'underlined', groupNotes: true, groupNoteStyle: { role: 'table', italic: true, weight: 700, color: red }, areaStyle: { role: 'table', weight: 700, italic: true },
        columns: cols([['no', 'No.', 9, 'left'], ['item', 'SCOPE OF WORK', 0, 'left'], ['qtyUnit', 'UNIT', 20, 'right', red], ['total', 'AMOUNT', 30, 'right']]), headerRow: 'band', headerStyle: { role: 'table', weight: 700, uppercase: true, align: 'center' },
        descriptions: 'bullets', descriptionStyle: { role: 'table' }, subtotals: true, subtotalLabel: 'Sub-total for {section}:', zeroAmount: 'FOC', currency: '$ ', density: 'normal', keepGroups: false, optionalTitle: 'Optional Works' }),
      { id: newId(), kind: 'totals', layout: 'right', width: 74, rules: 'grid', style: { role: 'body', weight: 700 }, totalStyle: { role: 'body', weight: 700 }, lines: [
        { key: 'pages', label: 'Total for page {n}', on: false }, { key: 'subtotal', label: 'Total Renovation Amount', on: true }, { key: 'discount', label: 'Less Discount', on: false }, { key: 'additional', label: 'Less Discount', on: true }, { key: 'gst', label: 'GST {gst_rate}', on: true }, { key: 'total', label: 'Grand Total', on: true },
      ], spaceBefore: 6 },
      { id: newId(), kind: 'notes', title: 'REMARKS :', titleStyle: { role: 'body', weight: 700, color: red }, style: { role: 'body', weight: 700, color: red }, numbered: false, grid: false, spaceBefore: 6 },
      { id: newId(), kind: 'signature', lineWeight: 0.8, lineColor: 'ink', style: { role: 'body', weight: 700 }, headingStyle: { role: 'body', weight: 700 }, spaceBefore: 14, columns: [
        { id: newId('c'), heading: 'Your Preferred Designer', lines: ['{prepared_by} {prepared_by_phone}'], image: 'member' },
        { id: newId('c'), heading: 'Confirmed & Agreed By Owner:', lines: ['Name:'], image: 'client' },
      ] },
      { id: newId(), kind: 'payments', title: 'Payment Terms', layout: 'list', showAmounts: false, showDue: false, letters: true, style: { role: 'body' }, titleStyle: { role: 'body', weight: 700, underline: true }, band: false, startNewPage: true },
      { id: newId(), kind: 'text', html: '<p><em>* Any default in payment will result in stop of project, strictly not negotiable.</em></p><p>Please make cheques payable to <strong>{studio_name}</strong><br>Bank transfer details are on the invoice<br>PAYNOW UEN: <strong>{studio_uen}</strong></p>', style: { role: 'body' }, box: 'none', spaceBefore: 4 },
      { id: newId(), kind: 'image', src: payQrSvg('demo-studio-paynow'), width: 26, align: 'left', caption: 'SCAN TO PAY' },
      { id: newId(), kind: 'terms', title: 'Terms and Conditions', titleStyle: { role: 'body', weight: 700, underline: true }, style: { role: 'table', size: 8 }, numbered: true, grid: false, startNewPage: true },
      { id: newId(), kind: 'footer', height: 20, repeat: 'every', elements: [
        { id: newId('e'), kind: 'badges', x: 0, y: 0, w: 182, h: 10, items: [], gap: 2, align: 'center' },
        t(0, 12, 182, '{studio_address}   Email: {studio_email}   Website: {studio_website}', { role: 'small', align: 'center' }),
      ] },
    ],
  }
}

/* ── Form · Cove Interior's boxed quotation ── */
function form(): TemplateDesign {
  const lbl: TextStyle = { role: 'small', weight: 700 }
  return {
    page: { paper: 'Letter', margins: { top: 12, right: 16, bottom: 10, left: 16 }, watermark: '', dateFormat: 'short' },
    brand: { colors: { band: '#000000', ink: '#000000', light: '#000000' }, fonts: { heading: { family: 'Arial', size: 12, weight: 700 }, body: { family: 'Arial', size: 8.5, weight: 400 }, table: { family: 'Arial', size: 8, weight: 400 }, small: { family: 'Arial', size: 6.5, weight: 700 } } },
    blocks: [
      { id: newId(), kind: 'header', height: 66, repeat: 'every', elements: [
        img(0, 0, 40, 26, 'logo', '#EBEBEB'),
        t(60, 20, 64, 'QUOTATION', { role: 'heading', underline: true, align: 'center' }),
        kv(0, 30, 50, [['Date', '{date}']], 10, { role: 'body' }, lbl, 'under', 1.5),
        kv(130, 30, 54, [['Co Reg No', '{studio_uen}']], 18, { role: 'body' }, lbl, 'under', 1.5),
        kv(0, 37, 184, [['Name', '{client_name}']], 12, { role: 'body', weight: 700 }, lbl, 'under', 1.5),
        kv(0, 43, 184, [['Address', '{site_address}'], ['Contact', '{client_phone}'], ['Email', '{client_email}']], 12, { role: 'body', weight: 700 }, lbl, 'under', 0.6),
        kv(0, 57, 50, [['Postal Code', '']], 18, { role: 'body', weight: 700 }, lbl, 'under', 1.5),
        kv(60, 57, 64, [['Types', '{property_type}']], 12, { role: 'body' }, lbl, 'under', 1.5),
      ] },
      items({ groupBy: 'category', subGroupBy: 'room', sectionLabel: 'none', numbering: 'continuous', bandStyle: 'inline', groupNotes: true, groupNoteStyle: { role: 'table' }, areaStyle: { role: 'table', weight: 700 },
        columns: cols([['no', 'ITEM', 12, 'center'], ['item', 'WORK DESCRIPTION', 0, 'left'], ['total', 'AMOUNT', 28, 'right']]), headerRow: 'black', headerStyle: { role: 'table', weight: 700, uppercase: true, align: 'center', color: '#FFFFFF' },
        descriptions: 'full', descriptionStyle: { role: 'table' }, subtotals: false, zeroAmount: 'FOC', currency: '$ ', grid: true, fillPage: true, density: 'compact', pageTotals: true, pageTotalLabel: 'Total for Page {n}:', keepGroups: false, optionalTitle: 'FREE GIFTS' }),
      { id: newId(), kind: 'payments', title: 'PAYMENT SCHEDULE', layout: 'table', showAmounts: true, showDue: false, letters: false, style: { role: 'table' }, titleStyle: { role: 'table', weight: 700, uppercase: true, align: 'center', color: '#FFFFFF' }, band: true, startNewPage: true },
      { id: newId(), kind: 'totals', layout: 'full', width: 60, rules: 'grid', style: { role: 'table', weight: 700 }, totalStyle: { role: 'table', weight: 700 }, lines: [
        { key: 'pages', label: 'Total for Page {n}:', on: true }, { key: 'subtotal', label: 'Sub Total:', on: true }, { key: 'discount', label: 'Discount:', on: false }, { key: 'additional', label: 'Less Discount:', on: false }, { key: 'gst', label: 'GST {gst_rate}:', on: true }, { key: 'total', label: 'Grand Total:', on: true },
      ] },
      { id: newId(), kind: 'terms', title: 'Standard Terms and Conditions', titleStyle: { role: 'table', weight: 700, underline: true }, style: { role: 'table' }, numbered: true, grid: true, startNewPage: true },
      { id: newId(), kind: 'footer', height: 34, repeat: 'every', elements: [
        { id: newId('e'), kind: 'signature', x: 0, y: 0, w: 184, columns: [
          { id: newId('c'), heading: "Designer's Signature", lines: ['Designer   {prepared_by}', 'Contact   {prepared_by_phone}'], image: 'member' },
          { id: newId('c'), heading: 'Company Stamp', lines: ['{studio_name}'], image: 'stamp' },
          { id: newId('c'), heading: "Client's Signature", lines: ['Name   {client_name}'], image: 'client', caption: 'I, the undersigned client, hereby agrees to the above terms & conditions.' },
        ], style: { role: 'table', weight: 700 }, headingStyle: { role: 'small' }, lineWeight: 0.8, lineColor: 'ink' },
      ] },
    ],
  }
}

/* ── Presentation · the design studio's deck ── */
function presentation(): TemplateDesign {
  return {
    page: { paper: 'A4', margins: { top: 16, right: 18, bottom: 16, left: 18 }, watermark: '', dateFormat: 'short' },
    brand: { fonts: { heading: { family: 'Fraunces', size: 16, weight: 600 }, body: { family: 'Inter', size: 9, weight: 400 }, table: { family: 'Inter', size: 8.5, weight: 400 }, small: { family: 'Inter', size: 7.5, weight: 400 } } },
    blocks: [
      { id: newId(), kind: 'cover', height: 0, repeat: 'first', elements: [
        { id: newId('e'), kind: 'box', x: 0, y: 0, w: 210, h: 150, fill: 'accent' },
        img(18, 18, 44, 14, 'logo-dark'),
        t(18, 166, 174, '{quote_title}', { role: 'heading', size: 26, lineHeight: 1.1 }),
        t(18, 196, 174, 'Prepared for {client_name}\n{site_address}', { role: 'body', size: 11, color: 'grey', lineHeight: 1.5 }),
        t(18, 268, 174, '{quote_number} · {date} · valid until {valid_until}', { role: 'small', color: 'grey' }),
        t(18, 274, 174, '{studio_name} · {studio_phone} · {studio_email}', { role: 'small', color: 'grey' }),
      ] },
      { id: newId(), kind: 'header', height: 16, repeat: 'every', elements: [
        img(0, 0, 30, 9, 'logo'),
        t(74, 1.5, 100, '{quote_title} · {quote_number}', { role: 'small', color: 'grey', align: 'right' }),
        rule(0, 12, 174, 0.4, 'light'),
      ] },
      { ...(defaultBlock('details') as Extract<TemplateDesign['blocks'][number], { kind: 'details' }>), startNewPage: false },
      { id: newId(), kind: 'title', title: 'Scope of works', titleStyle: { role: 'heading', size: 14 }, subject: '', subjectStyle: { role: 'body', weight: 700 }, intro: 'Every room of the renovation, item by item, with the photos and finishes we discussed. Prices are in Singapore dollars and include GST at {gst_rate}.', introStyle: { role: 'body', color: 'grey' } },
      items({ groupBy: 'room', subGroupBy: 'none', sectionLabel: 'numbers', numbering: 'group', bandStyle: 'accent', groupNotes: true, groupNoteStyle: { role: 'small', color: 'grey' }, areaStyle: { role: 'table', weight: 700 },
        columns: cols([['no', '#', 9, 'left'], ['item', 'Item', 0, 'left'], ['qtyUnit', 'Qty', 20, 'right'], ['unitPrice', 'Unit price', 24, 'right'], ['total', 'Total', 26, 'right']]), headerRow: 'ruled', headerStyle: { role: 'small', weight: 600, uppercase: true, color: 'grey', letterSpacing: 0.4 },
        descriptions: 'full', descriptionStyle: { role: 'small', color: 'grey' }, photos: true, subtotals: true, subtotalLabel: '{section} subtotal', zeroAmount: 'Inclusive', currency: 'S$', density: 'relaxed', keepGroups: true, groupNewPage: false, optionalTitle: 'Optional works' }),
      { id: newId(), kind: 'totals', layout: 'right', width: 80, rules: 'top', style: { role: 'body' }, totalStyle: { role: 'heading', size: 13 }, lines: [
        { key: 'pages', label: 'Total for page {n}', on: false }, { key: 'subtotal', label: 'Subtotal', on: true }, { key: 'discount', label: 'Discount', on: true }, { key: 'additional', label: 'Additional discount', on: true }, { key: 'gst', label: 'GST {gst_rate}', on: true }, { key: 'total', label: 'Your investment', on: true },
      ], spaceBefore: 8 },
      { id: newId(), kind: 'payments', title: 'Payment schedule', layout: 'cards', showAmounts: true, showDue: true, letters: false, style: { role: 'body' }, titleStyle: { role: 'heading', size: 12 }, band: false, startNewPage: true },
      { id: newId(), kind: 'notes', title: 'Notes', titleStyle: { role: 'heading', size: 12 }, style: { role: 'body', color: 'grey' }, numbered: false, grid: false, spaceBefore: 8 },
      { id: newId(), kind: 'terms', title: 'Terms and conditions', titleStyle: { role: 'heading', size: 12 }, style: { role: 'small', color: 'grey' }, numbered: true, grid: false, startNewPage: true },
      { id: newId(), kind: 'signature', lineWeight: 0.5, lineColor: 'ink', style: { role: 'body' }, headingStyle: { role: 'small', weight: 600, uppercase: true, color: 'grey', letterSpacing: 0.4 }, spaceBefore: 16, columns: [
        { id: newId('c'), heading: 'Prepared by', lines: ['{prepared_by}, {prepared_by_role}', '{studio_name}'], image: 'member' },
        { id: newId('c'), heading: 'Accepted by', lines: ['{client_name}', 'Date'], image: 'client' },
      ] },
      { id: newId(), kind: 'footer', height: 12, repeat: 'every', elements: [
        t(0, 3, 120, '{studio_name} · UEN {studio_uen} · GST Reg. No. {studio_gst}', { role: 'small', color: 'grey' }),
        pageno(130, 3, 44, '{page} / {pages}', { role: 'small', color: 'grey', align: 'right' }),
      ] },
    ],
  }
}

export const PRESETS: Preset[] = [
  { key: 'letter', name: 'Letter', blurb: 'A contract letter: the letterhead and particulars on every page, lettered trade sections, area sub-headings, an amount column, signatures on every page.', paper: 'A4', design: letter, defaults: { ...DEFAULT_DEFAULTS, columns: ['qty', 'unit', 'cost', 'markup', 'unitPrice', 'discount', 'gst'], validityDays: 30, starterGroups: ['Hacking Works', 'Masonry Works', 'Carpentry Works', 'Plumbing Works', 'Electrical Works', 'Painting Works'] } },
  { key: 'scope', name: 'Scope', blurb: 'A scope quotation: client and quote details side by side, a unit column, conditions under each trade, sub-totals per section, payment terms and a badges strip.', paper: 'A4', design: scope, defaults: { ...DEFAULT_DEFAULTS, validityDays: 14, starterGroups: ['Hacking', 'Masonry', 'Carpentry', 'Plumbing', 'Electrical', 'Painting'] } },
  { key: 'form', name: 'Form', blurb: 'A boxed form: form lines for the particulars, every cell ruled, totals for each page, the payment schedule and the terms inside the grid, a stamp beside the signatures.', paper: 'Letter', design: form, defaults: { ...DEFAULT_DEFAULTS, paymentPreset: 'default', starterGroups: ['Hacking Works', 'Masonry Works', 'Carpentry Works', 'Electrical Works', 'Painting Works'] } },
  { key: 'presentation', name: 'Presentation', blurb: 'The design studio’s deck: a cover in the brand colour, a page per room with photos, an investment summary, payment cards.', paper: 'A4', design: presentation, defaults: { ...DEFAULT_DEFAULTS, starterGroups: ['Living & Dining', 'Kitchen', 'Master Bedroom', 'Bedrooms', 'Bathrooms'] } },
]
export const presetByKey = (key: PresetKey) => PRESETS.find((p) => p.key === key)!
/** The brand overrides a preset carries, for the Brand pane's "Reset to brand". */

/** The design a quote prints through when it has no template and the studio has no default: the Letter house style. */
export const fallbackDesignClient = (): TemplateDesign => presetByKey('letter').design()
