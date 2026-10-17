import { commercialOf } from '@/lib/leads/enums'   // (S42 B-05)
/**
 * What a template renders: one quote's data in the shape the document blocks read (REG-486). Built from the records
 * (`docDataFromRecords`), or the sample quote the template editor shows by default, or nothing (`EMPTY_DATA`). Client-safe.
 */
import type { Member, Quote, QuoteItem, QuotePayment } from '@/lib/db/schema'
import { displayDate } from '@/lib/format'
import { DEFAULT_SPLIT_ID, paymentAmounts, presetRows, PRESET_SPLITS, scheduleAnchors, type PaymentSplit } from '@/lib/quotes/payments'
import { resolveTokens } from '@/lib/quotes/text'
import { parseDiscounts, quoteTotals, type NamedDiscount, type QuoteTotals } from '@/lib/quotes/math'
import { EMPTY_ENTITY, type IssuingEntity, type StudioDetails, type TemplateDefaults } from './model'
import { type ItemChange, type LineHistory, type LineWas, type PaymentHistory, type PaymentWas } from '@/lib/quotes/diff'
import type { PrintSums } from './item-sections'
import { type MemberSignature } from '@/lib/quotes/signature'
import { livePrepared, parsePrepared } from '@/lib/quotes/prepared'

export type DocItem = Pick<QuoteItem, 'id' | 'parentId' | 'kind' | 'position' | 'name' | 'description' | 'qty' | 'unit' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct' | 'room' | 'category' | 'section' | 'visibility' | 'status' | 'thumb' | 'icon' | 'rebateMinor'> & {
  optional: boolean
  /** Round 1 of the testers' asks: the printed word (REG-555), the kit colour (REG-556), the formatted description (REG-557), no number (REG-558). */
  printAs: string | null; printAsText: string | null; highlight: string | null; noNumber: boolean; descriptionHtml: string | null
  /** (REG-585) A section that prints as one line for the client. */
  printOneLine: boolean
  /** (REG-595) On a revision: what this line is since the kept version, and what a changed line was. */
  change?: ItemChange
  was?: LineWas
  /** (S44F — NB-01) Every version's mark: when it came in, changed, was removed — "Every version" in the client view's Changes. */
  history?: LineHistory
  /** (S44T — call C1) On a section: priced after the contract — printed after the main items, out of the totals. */
  pricedAfter?: boolean
  /** (S44T — call C2's print side) The name with its emphasis and kit colours; null = the plain name. */
  nameHtml?: string | null
}
export type DocPayment = { name: string; description: string | null; pct: number; amountMinor: number; due: string; /** (parity map, MI-021) the first row is a fixed fee, not a share */ fixed?: boolean
  /** (S44T — UAT row 310) a fixed row's own word where the % prints ("Design Fee"); unset = "Fixed fee" */ label?: string
  /** (S44F — NB-02 (a)) On a revision: the milestone since the last version — new, removed (struck, out of the total) or changed — and what it was */
  change?: ItemChange; was?: PaymentWas
  /** (S44F — NB-01) every version's mark on the milestone */ history?: PaymentHistory }
/** (S44T — UAT row 310) What a fixed row prints where a share prints its %. */
export const fixedWord = (p: Pick<DocPayment, 'label'>) => p.label?.trim() || 'Fixed fee'
export type DocData = {
  quote: {
    number: string; title: string; version: number; date: Date | null; validUntil: Date | null; projectRef: string; customerId: string; nric: string
    propertyType: string; siteAddress: string; gstEnabled: boolean; gstRate: number; additionalDiscountMode: 'pct' | 'amount'; additionalDiscountValue: number
    /** (REG-559) The named discounts after the additional one. */
    discounts: NamedDiscount[]
    termsHtml: string; notesHtml: string; status: string
    /** (REG-562) The issuing entity the quote is raised under; null = the studio itself. */
    issuingEntity: string | null
    /** (S44O — call C3) how its GST is rounded — the rule stamped on the quote when it went out; unset = today's (lib/quotes/math.ts `gstRuleOf`) */
    gstRule?: string | null
    /** (Projects round 5, F-06) A variation order prints as one: the template's "Quotation" reads "Variation order" (fields.ts `resolveFields`). */
    kind?: 'quote' | 'variation'
    /** (fix-D, D-08 · G-12) A variation order's contract: the signed quote's number it changes ("to contract OM-10009"). */
    variationOf?: string | null
    /** (gaps build B, item 7 — 1.0 G-149) A variation order's reason for the change, printed under its title. */
    changeReason?: string | null
    /** (parity map, SC-094 — 1.0's "timeline impact days") the days a variation order adds to the schedule, printed after its reason */
    timelineDays?: number | null
    /** (gaps build B, item 14) A variation order prints the studio's invoice paper too: its header and footer notes and its terms block
        (Settings › Projects › Invoices — the entity's own, else the studio's). */
    paper?: { header: string; footer: string; termsTitle: string; terms: string; /* (parity map, MI-065) */ acceptance?: { title: string; text: string } | null; accent?: string | null } | null
    /** (S44T — UAT row 331) The day the client signed — `{signed_date}`; null until signed. */
    signedAt?: Date | null
    /** (S44T — UAT row 321) General Info's Remarks — `{remarks}`. */
    remarks?: string
  }
  client: { name: string; salutation: string; phone: string; email: string; /** (pending modules S05 — testers' L-3) a commercial client's company and UEN, from the lead */ company?: string; uen?: string }
  /** (REG-588) A second client (co-owners): printed with the first, named on the signing link. */
  client2: { name: string; nric: string } | null
  studio: StudioDetails
  preparedBy: { name: string; phone: string; role: string; /** (REG-560) `{prepared_by_email}` */ email: string; /** (REG-618, parity Q-25) every member on the lead, for "Prepared by: every member" */ team?: string[] }
  items: DocItem[]
  payments: DocPayment[]
  memberSignature: MemberSignature | null   // (Dane UAT 6.23) drawn, typed or an uploaded picture
  clientSignature: { name: string } | null
  /**
   * (S44F — NB-03) On a client page only: the totals and the sums the print shows, worked out on the server (`clientSafe`) — the lines came
   * without the prices the view never prints. Never cost or margin (zero). Unset everywhere the studio reads its own quote.
   */
  sums?: { totals: DocTotals; print: PrintSums }
}
export type DocTotals = QuoteTotals & { itemCount: number }

/** The lines that price on the document: optional lines never count (REG-492). (S44F — NB-03) A client page reads the server's totals. */
export function docTotals(d: DocData): DocTotals {
  if (d.sums) return d.sums.totals
  return quoteTotals(d.items.filter((i) => !i.optional && i.change !== 'removed'), { additionalDiscountMode: d.quote.additionalDiscountMode, additionalDiscountValue: d.quote.additionalDiscountValue, gstEnabled: d.quote.gstEnabled, discounts: d.quote.discounts, gstRule: d.quote.gstRule })   // (S44O — C3) the quote's own GST rounding
}
/** (REG-562) The entity a document prints bank details for: the quote's Issuing Entity by name, else the studio's own (the first). */
export function docEntity(d: DocData): IssuingEntity | null {
  const list = d.studio.entities
  if (!list.length) return null
  return (d.quote.issuingEntity ? list.find((e) => e.name === d.quote.issuingEntity) : null) ?? list[0] ?? null
}
/** (REG-618, parity Q-26) The letterhead a document prints: the studio's own, or — for a quote raised under another entity — that entity's
    name, logo and registration numbers, its address falling back to the studio's. A registration number never inherits (1.0's rule). */
export type DocLetterhead = {
  name: string; address: string; uen: string; gstReg: string; logo: string | null; own: boolean
  /** (pending modules S11 — card held:quote-templates; 1.0's `resolveIssuingLetterhead`) The entity's look and contacts, as its invoices print
      them (`paperExtrasOf`): its tagline, phone, email and website, else the studio's; the footer line its papers end with, else the studio's
      own entity's; its accent colour — another entity's own only (null = the brand kit's and the template's, as for the studio itself). */
  tagline: string; phone: string; email: string; website: string; footer: string; accent: string | null
}
export function docLetterhead(d: DocData): DocLetterhead {
  const e = docEntity(d)
  const first = d.studio.entities[0] ?? null
  const own = !e || e === first
  const s = d.studio
  if (own || !e) return { name: s.name, address: s.address, uen: s.uen, gstReg: (e && !e.gstRegistered) || s.gstRegistered === false ? '' : s.gstReg, logo: null, own: true,   // (REG-645) the studio's own registration
    tagline: s.tagline, phone: s.phone, email: s.email, website: s.website, footer: first?.footer ?? '', accent: null }
  return { name: e.name || s.name, address: e.address || s.address, uen: e.uen, gstReg: e.gstRegistered ? e.gstReg : '', logo: e.logo, own: false,
    tagline: e.tagline || s.tagline, phone: e.phone || s.phone, email: e.email || s.email, website: e.website || s.website, footer: e.footer || first?.footer || '', accent: e.accent || null }
}

export const DEMO_STUDIO: StudioDetails = {
  name: 'Demo Studio Pte Ltd', address: '12 Jalan Besar #03-01, Singapore 208789', phone: '+65 6222 0188', fax: '+65 6222 0189', email: 'hello@demostudio.sg', website: 'www.demostudio.sg',
  uen: '201234567M', gstReg: 'M90371234', licence: 'HB-09-1234A',
  tagline: '', social: '', socials: {}, entities: [EMPTY_ENTITY('Demo Studio Pte Ltd')],   // (REG-562) filled in Company › Profile; nothing invented here
}

const dueLabel = (kind: string, at: Date | null) => (kind === 'approval' ? 'On approval' : at ? (kind === 'estimate' ? `~ ${displayDate(at)}` : displayDate(at)) : '')

/**
 * (S44Q — row 256, her UAT ask 2026-10-15) The rate `{gst_rate}` prints: the one the quote's GST-bearing lines carry (the most of them; a tie goes to
 * the higher), never simply the first line's — a 0% line (zero-rated, or on the client's behalf) says nothing about the quote's GST. With no
 * line bearing GST: the studio's rate (Settings › Quotes & pricing › GST), else 9. Optional lines, lines out of the quote and lines that print a
 * word (FOC · Inclusive …) or go on the client's behalf (no GST of their own) never count.
 */
export function quoteGstRate(items: Pick<DocItem, 'kind' | 'gstPct' | 'optional' | 'status' | 'printAs'>[], studioRate?: number | null): number {
  const counts = new Map<number, number>()
  for (const i of items) if (i.kind === 'item' && !i.optional && i.status !== 'Declined' && !i.printAs && i.gstPct > 0) counts.set(i.gstPct, (counts.get(i.gstPct) ?? 0) + 1)
  let best: number | null = null, most = 0
  for (const [rate, n] of counts) if (n > most || (n === most && best !== null && rate > best)) { best = rate; most = n }
  return best ?? (typeof studioRate === 'number' && Number.isFinite(studioRate) ? studioRate : 9)
}

/** One stored line as the document reads it. */
export const toDocItem = (i: QuoteItem): DocItem => ({ ...i, optional: !!i.optional, printAs: i.printAs ?? null, printAsText: i.printAsText ?? null, highlight: i.highlight ?? null, noNumber: !!i.noNumber, descriptionHtml: i.descriptionHtml ?? null, printOneLine: !!i.printOneLine })

/** The document's data from the records the quote editor and the preview load. */
export function docDataFromRecords(r: {
  quote: Quote; lead: { name: string; phone?: string | null; email?: string | null; /** (pending modules S05) */ companyName?: string | null; companyUen?: string | null; /** (S42 B-05) the company prints only while commercial */ propertyType?: string | null }; studio: StudioDetails; members: Member[]; items: QuoteItem[]; payments: QuotePayment[]; totalMinor?: number
  /** (REG-618, parity Q-25) the lead's members, for "Prepared by: every member on the lead" */ teamIds?: string[]
  /** (REG-632, contracts parity Q-09) Who signed the contract this quote was signed through — the quote's print names them, not the lead. */ signer?: string | null
  /** (fix-D, D-08) A variation order's contract number — its print says what it changes. */ variationOf?: string | null
  /** (gaps build B, item 14) the studio's invoice paper for a variation order */ variationPaper?: { header: string; footer: string; termsTitle: string; terms: string } | null
  /** (S44T — row 321) General Info's Remarks as typed (the editor's live pane), over the quote's stored ones */ remarks?: string | null
}): DocData {
  /* (pending modules S04) a quote with its client prints its preparer as they were when it went out — kept on the quote (`prepared_json`);
     before that, live from the records (the quote's Prepared by, consent applied — S03) */
  const prepared = parsePrepared(r.quote.preparedJson) ?? livePrepared({ preparedBy: r.quote.preparedBy, members: r.members, teamIds: r.teamIds })
  const items: DocItem[] = r.items.map(toDocItem)
  const discounts = parseDiscounts(r.quote.discountsJson)
  const totals = quoteTotals(items.filter((i) => !i.optional), { additionalDiscountMode: r.quote.additionalDiscountMode, additionalDiscountValue: r.quote.additionalDiscountValue, gstEnabled: r.quote.gstEnabled, discounts, gstRule: r.quote.gstRule })   // (S44O — C3)
  const amounts = paymentAmounts(r.payments, r.totalMinor ?? totals.totalMinor)
  const gstRate = quoteGstRate(items, r.studio.gstPct)   // (S44Q, row 256) the quote's rate — it was the first line's, so a 0% first line printed "GST 0%"
  return {
    quote: {
      number: r.quote.number, title: r.quote.title, version: r.quote.version, date: r.quote.createdAt, validUntil: r.quote.validUntil, projectRef: r.quote.projectRef ?? '', customerId: r.quote.customerId ?? '', nric: r.quote.nric ?? '',
      propertyType: r.quote.propertyType ?? '', siteAddress: r.quote.siteAddress ?? '', gstEnabled: r.quote.gstEnabled, gstRate, additionalDiscountMode: r.quote.additionalDiscountMode === 'amount' ? 'amount' : 'pct', additionalDiscountValue: r.quote.additionalDiscountValue, gstRule: r.quote.gstRule ?? null,
      discounts, termsHtml: r.quote.termsHtml ?? '', notesHtml: r.quote.notesHtml ?? '', status: r.quote.status, issuingEntity: r.quote.issuingEntity ?? null,
      kind: r.quote.kind === 'variation' ? 'variation' : 'quote',   // (Projects round 5)
      variationOf: r.quote.kind === 'variation' ? r.variationOf ?? null : null,   // (fix-D, D-08)
      changeReason: r.quote.kind === 'variation' ? r.quote.changeReason ?? null : null,   // (gaps build B, item 7)
      timelineDays: r.quote.kind === 'variation' && r.quote.timelineDays ? r.quote.timelineDays : null,   // (parity map, SC-094)
      paper: r.quote.kind === 'variation' ? r.variationPaper ?? null : null,   // (gaps build B, item 14)
      signedAt: r.quote.status === 'Signed' ? r.quote.signedAt ?? null : null,   // (S44T, row 331) `{signed_date}` — only once signed
      remarks: (r.remarks !== undefined ? r.remarks : r.quote.remarks) ?? '',   // (S44T, row 321)
    },
    client: { name: r.lead.name, salutation: '', phone: r.lead.phone ? (r.lead.phone.startsWith('+') ? r.lead.phone : `+65 ${r.lead.phone.replace(/^(\d{4})(\d{4})$/, '$1 $2')}`) : '', email: r.lead.email ?? '', ...commercialOf(r.lead) },   // (S42 B-05)
    client2: r.quote.client2Name ? { name: r.quote.client2Name, nric: r.quote.client2Nric ?? '' } : null,   // (REG-588)
    studio: r.studio,
    preparedBy: { name: prepared.name, phone: r.studio.phone, role: prepared.role, email: prepared.email, team: prepared.team },
    items,
    payments: r.payments.map((p, i) => ({ name: p.name, description: p.description, pct: p.pct, amountMinor: amounts[i] ?? 0, due: dueLabel(p.dueKind, p.dueAt), ...(i === 0 && p.fixedMinor != null ? { fixed: true, ...(p.fixedLabel?.trim() ? { label: p.fixedLabel.trim() } : {}) } : {}) })),   // (S44T, row 310) the fixed row's own word
    memberSignature: prepared.signature,   // (pending modules S03) only a signature its member allowed on the quotes they prepare · (S04) as kept when it went out
    clientSignature: r.quote.status === 'Signed' ? { name: r.signer?.trim() || r.lead.name } : null,
  }
}

/* ── the sample quote (a 4-room HDB, in the shape of the studios' own quotes) ──
   (Dane UAT 2026-10-01, g-sample-content) The sample carries what the Items block's options act on, so each one shows on the canvas:
   its lines sit in one section per trade (the quote's own sections), two sections write a note of their own, two lines carry a photo,
   and one line is hidden from the client (no price, so every sum on the page still adds up). */
let n = 0
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const line = (category: string, room: string, name: string, qty: number, unit: string | null, cost: number, markup: number, description: string | null = null, extra: Partial<DocItem> = {}): DocItem => {
  n += 1
  return { id: `s${n}`, parentId: `sg-${slug(category)}`, kind: 'item', position: n, name, description, qty, unit, costMinor: Math.round(cost * 100), markupMinor: Math.round(markup * 100), discountPct: 0, gstPct: 9, room, category, section: null, visibility: 'visible', status: 'Pending', thumb: null, icon: null, optional: false, printAs: null, printAsText: null, highlight: null, noNumber: false, descriptionHtml: null, printOneLine: false, rebateMinor: 0, ...extra }
}
/** A section of the sample — one per trade, named as the trade, so a template that groups by trade finds its note. */
const section = (name: string, note: string | null = null): DocItem => {
  n += 1
  return { id: `sg-${slug(name)}`, parentId: null, kind: 'group', position: n, name, description: note, qty: 1, unit: null, costMinor: 0, markupMinor: 0, discountPct: 0, gstPct: 9, room: null, category: name, section: null, visibility: 'visible', status: 'Pending', thumb: null, icon: null, optional: false, printAs: null, printAsText: null, highlight: null, noNumber: false, descriptionHtml: null, printOneLine: false, rebateMinor: 0 }
}
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d)
export const SAMPLE_DATA: DocData = {
  quote: {
    number: 'OM-10042', title: '4-Room HDB renovation — Tampines', version: 1, date: D(2026, 9, 17), validUntil: D(2026, 10, 17), projectRef: 'HDB/20260917/003', customerId: 'C-0417', nric: 'S8888888A',
    propertyType: '4-room HDB', siteAddress: 'Blk 512 Tampines Central 1 #08-123, Singapore 520512', gstEnabled: true, gstRate: 9, additionalDiscountMode: 'pct', additionalDiscountValue: 0, discounts: [], issuingEntity: null,
    /* {validity_days} prints the template's own validity (New quotes › Valid for), so the sample's words never disagree with its date */
    termsHtml: '<p>This quotation is valid for {validity_days} days from the date above.</p><p>Works commence within two weeks of the deposit. The timeline is 8 to 10 weeks, subject to HDB permit approval.</p><p>Variations are quoted and agreed in writing before work begins. All prices are in Singapore dollars.</p><p>Carpentry comes with soft-closing hinges and drawer runners, ABS trimming and internal coloured PVC. Tile selection up to S$3.50 per sq ft.</p><p>Any default in payment will result in a stop of work. Please make payment to Demo Studio Pte Ltd by bank transfer or PayNow (UEN 201234567M).</p>',
    notesHtml: '<p>Electrical and air-conditioning works are quoted by the respective vendors after the site inspection.</p><p>All hacking works are subject to HDB approval and exclude any Professional Engineer fees.</p>', status: 'Draft',
  },
  client: { name: 'Mr & Mrs Tan', salutation: 'Mr & Mrs Tan', phone: '+65 9123 4567', email: 'tan.family@example.sg', company: '', uen: '' },
  studio: DEMO_STUDIO,
  preparedBy: { name: 'Dane', phone: '+65 9236 1929', role: 'Principal Designer', email: 'dane@demostudio.sg', team: ['Dane'] },
  items: [
    section('Hacking Works', 'All hacking is subject to HDB approval. Debris is cleared from site daily.'),
    line('Hacking Works', 'Living & Dining', 'Supply labour and tools to dismantle and remove existing laminate flooring and skirting', 1, 'Lot', 0, 0, 'Subject to HDB approval'),
    line('Hacking Works', 'Kitchen', 'Hack and remove existing floor and wall tiles, top and bottom cabinets', 1, 'Lot', 0, 0),
    line('Hacking Works', 'Common Bathroom', 'Dismantle existing sanitary wares and fittings; hack wall and floor tiles', 1, 'Lot', 0, 0),
    line('Hacking Works', 'Whole unit', 'Haulage and disposal of debris to an approved dumping site', 1, 'Lot', 2600, 900),
    section('Masonry Works'),
    line('Masonry Works', 'Kitchen', 'Apply cement plaster and skim coat to hacked kitchen wall', 280, 'sqft', 4.5, 2, 'Prepacked drymix wall screed and easi plaster'),
    line('Masonry Works', 'Kitchen', 'Lay R10 slip-resistant homogeneous floor tiles with skirting', 140, 'sqft', 11, 4, 'Tiles up to S$3.50 per sq ft, 600 × 600 mm'),
    line('Masonry Works', 'Common Bathroom', 'Apply 3-coat waterproofing membrane with upturn', 1, 'Lot', 180, 70),
    line('Masonry Works', 'Common Bathroom', 'Lay full-height homogeneous wall tiles', 240, 'sqft', 9, 3.5),
    line('Masonry Works', 'Common Bathroom', 'Construct bathroom entrance kerb and shower drop', 1, 'Lot', 190, 80),
    section('Carpentry Works', 'Carpentry in 18 mm plywood with laminate finish, internal coloured PVC and soft-closing hinges.'),
    line('Carpentry Works', 'Kitchen', 'Design, fabricate and install kitchen top-hung cabinet with soft-closing doors', 18.5, 'ft run', 105, 45, 'Includes a 2-tier stainless steel dish rack and bottom-row LED light', { thumb: '/uat-files/kitchen-moodboard.jpg' }),
    line('Carpentry Works', 'Kitchen', 'Design, fabricate and install kitchen bottom cabinet with drawer units and cutlery tray', 12, 'ft run', 110, 40),
    line('Carpentry Works', 'Master Bedroom', 'Design, fabricate and install full-height casement wardrobe, handleless, with rounded corners', 12.5, 'ft run', 250, 100, 'Internal coloured PVC, soft-closing hinges'),
    line('Carpentry Works', 'Living & Dining', 'Design, fabricate and install TV console with fluted panel and concealed LED strip', 11, 'ft run', 120, 48, null, { thumb: '/uat-files/fluted-panel.jpg' }),
    section('Plumbing Works'),
    line('Plumbing Works', 'Kitchen', 'Install concealed copper piping for kitchen sink and washing machine (cold water only)', 1, 'Lot', 650, 250),
    line('Plumbing Works', 'Common Bathroom', 'Install concealed copper piping for WC, bidet, basin tap and shower mixer', 1, 'Lot', 1300, 500),
    line('Plumbing Works', 'Common Bathroom', 'Supply labour to install storage water heater, shower mixer, basin and WC', 1, 'Lot', 0, 0, 'Sanitary wares supplied by the client'),
    section('Painting Works'),
    line('Painting Works', 'Whole unit', 'Paint internal walls of the entire unit with Nippon Vinilex 5000, ceilings in Matex White', 1, 'Lot', 1300, 500, 'Four colours; two rounds, before carpentry and before handover'),
    section('Miscellaneous Works'),
    line('Miscellaneous Works', 'Whole unit', 'Provision of corrugated paper protection to flooring and door frames during works', 1, 'Lot', 320, 130),
    line('Miscellaneous Works', 'Whole unit', 'Chemical washing and general cleaning upon completion (two rounds)', 1, 'Lot', 360, 140),
    line('Miscellaneous Works', 'Whole unit', 'HDB renovation permit application (excluding P.E. endorsement)', 1, 'Lot', 0, 0),
    line('Miscellaneous Works', 'Whole unit', 'Site coordination between trades by the project designer', 1, 'Lot', 0, 0, null, { visibility: 'hidden' }),   // hidden from the client: what "Items hidden from the client" acts on
    section('Optional Works'),
    line('Optional Works', 'Living & Dining', 'Apply limewash paint to the TV feature wall and master bedhead wall', 140, 'sqft', 6, 2.5, null, { optional: true }),
    line('Optional Works', 'Whole unit', 'Cement screed and self-levelling compound before vinyl flooring (subject to site condition)', 320, 'sqft', 4.5, 2, null, { optional: true }),
  ],
  payments: [],
  memberSignature: { kind: 'type', name: 'Dane', data: null },
  clientSignature: null, client2: null,
}
/** A quote's lines without its sections — "Preview with: Sample quote · 26 lines". */
export const lineCount = (d: DocData) => d.items.filter((i) => i.kind === 'item').length

/* ── what a NEW quote from the template starts with (Dane UAT 3.30, b-newquotes) ──
   The template editor draws its sample (or empty) quote with the New quotes choices laid over it — the payment split priced on the
   quote's total, the GST switch, Valid until = the quote's date + the days, the chosen Terms and Notes — the way createQuote
   (app/leads/quotes-actions.ts) starts a quote from them. A real quote picked in "Preview with" keeps its own records. */
export type NewQuoteLibrary = { splits: PaymentSplit[]; texts: { id: string; kind: string; body: string }[] }
/** The schedule a split gives this quote: the deposit on approval, the rest estimated from the quote's date (no dates without one). */
function scheduleFor(d: DocData, key: string | null, splits: PaymentSplit[]): DocPayment[] {
  const date = d.quote.date
  const rows = date ? presetRows(key ?? DEFAULT_SPLIT_ID, scheduleAnchors({ estimatedStart: null, quoteCreated: date, propertyType: d.quote.propertyType }), splits)
    : presetRows(key ?? DEFAULT_SPLIT_ID, { start: new Date(0), weeks: 0 }, splits).map((r) => ({ ...r, dueAt: null }))
  const amounts = paymentAmounts(rows, docTotals(d).totalMinor)
  return rows.map((r, i) => ({ name: r.name, description: r.description, pct: r.pct, amountMinor: amounts[i] ?? 0, due: dueLabel(r.dueKind, r.dueAt) }))
}
export function withNewQuoteDefaults(base: DocData, d: TemplateDefaults, lib: NewQuoteLibrary): DocData {
  const tokens = { client: base.client.name, studio: base.studio.name, studioPhone: base.studio.phone, member: base.preparedBy.name }
  /* a text gone from its library reads as None (REG-581): the quote keeps the words written on it */
  const text = (id: string | null, kind: 'terms' | 'notes', own: string) => { const t = id ? lib.texts.find((x) => x.id === id && x.kind === kind) : null; return t ? resolveTokens(t.body, tokens) : own }
  const date = base.quote.date
  const next: DocData = { ...base, quote: {
    ...base.quote,
    gstEnabled: d.gstEnabled && base.studio.gstRegistered !== false,   // (REG-645) a studio not registered for GST starts quotes without it
    validUntil: date ? new Date(date.getTime() + d.validityDays * 86_400_000) : base.quote.validUntil,
    termsHtml: text(d.termsTemplateId, 'terms', base.quote.termsHtml), notesHtml: text(d.notesTemplateId, 'notes', base.quote.notesHtml),
  } }
  return { ...next, payments: scheduleFor(next, d.paymentPreset, lib.splits.length ? lib.splits : PRESET_SPLITS) }
}
/** The sample with the studio's details. A section's own note gives way to the studio's note for that trade (REG-617, Settings ›
    Quotes & pricing › Trades), so the canvas shows the studio's own words wherever it has written some. */
export function sampleFor(studio: StudioDetails, preparer?: { name: string; role: string; phone: string | null; email: string | null } | null): DocData {
  const notes = studio.tradeNotes ?? {}
  /* (pending modules S31) another studio's sample is its own: the payment sentence names it (never the demo's company and UEN) and the
     sample is prepared by the member looking at it — else by the studio itself. The demo's sample stays exactly as drawn. */
  const own = studio.name !== DEMO_STUDIO.name
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const pay = `Please make payment to ${esc(studio.name)} by bank transfer or PayNow${studio.uen.trim() ? ` (UEN ${esc(studio.uen.trim())})` : ''}.`
  const quote = own ? { ...SAMPLE_DATA.quote, termsHtml: SAMPLE_DATA.quote.termsHtml.replace(DEMO_PAY_LINE, pay) } : SAMPLE_DATA.quote
  const who = preparer ?? { name: studio.name, role: '', phone: studio.phone, email: studio.email }
  const preparedBy = own ? { name: who.name, role: who.role, phone: who.phone ?? '', email: who.email ?? '', team: [who.name] } : SAMPLE_DATA.preparedBy
  return { ...SAMPLE_DATA, quote, preparedBy, studio, items: SAMPLE_DATA.items.map((i) => (i.kind === 'group' && notes[i.name.trim().toLowerCase()] ? { ...i, description: null } : i)) }
}
/** The demo sample's payment sentence — another studio's sample says its own (sampleFor). */
const DEMO_PAY_LINE = 'Please make payment to Demo Studio Pte Ltd by bank transfer or PayNow (UEN 201234567M).'
SAMPLE_DATA.payments = scheduleFor(SAMPLE_DATA, DEFAULT_SPLIT_ID, PRESET_SPLITS)   // the studio default, 10/30/30/30 — the editor lays the template's own split over it

/** A quote with nothing on it yet — every field empty, the table bare — for checking a layout's chrome. */
export const EMPTY_DATA: DocData = {
  quote: { number: '', title: '', version: 1, date: null, validUntil: null, projectRef: '', customerId: '', nric: '', propertyType: '', siteAddress: '', gstEnabled: true, gstRate: 9, additionalDiscountMode: 'pct', additionalDiscountValue: 0, discounts: [], termsHtml: '', notesHtml: '', status: 'Draft', issuingEntity: null },
  client: { name: '', salutation: '', phone: '', email: '' },
  studio: DEMO_STUDIO,
  preparedBy: { name: '', phone: '', role: '', email: '' },
  items: [], payments: [], memberSignature: null, clientSignature: null, client2: null,
}
