/**
 * What a template renders: one quote's data in the shape the document blocks read (REG-486). Built from the records
 * (`docDataFromRecords`), or the sample quote the template editor shows by default, or nothing (`EMPTY_DATA`). Client-safe.
 */
import type { Member, Quote, QuoteItem, QuotePayment } from '@/lib/db/schema'
import { displayDate } from '@/lib/format'
import { paymentAmounts } from '@/lib/quotes/payments'
import { quoteTotals, type QuoteTotals } from '@/lib/quotes/math'
import type { StudioDetails } from './model'

export type DocItem = Pick<QuoteItem, 'id' | 'parentId' | 'kind' | 'position' | 'name' | 'description' | 'qty' | 'unit' | 'costMinor' | 'markupMinor' | 'discountPct' | 'gstPct' | 'room' | 'category' | 'section' | 'visibility' | 'status' | 'thumb' | 'icon'> & { optional: boolean }
export type DocPayment = { name: string; description: string | null; pct: number; amountMinor: number; due: string }
export type DocData = {
  quote: {
    number: string; title: string; version: number; date: Date | null; validUntil: Date | null; projectRef: string; customerId: string; nric: string
    propertyType: string; siteAddress: string; gstEnabled: boolean; gstRate: number; additionalDiscountMode: 'pct' | 'amount'; additionalDiscountValue: number
    termsHtml: string; notesHtml: string; status: string
  }
  client: { name: string; salutation: string; phone: string; email: string }
  studio: StudioDetails
  preparedBy: { name: string; phone: string; role: string }
  items: DocItem[]
  payments: DocPayment[]
  memberSignature: { kind: 'draw' | 'type'; name: string; data: string | null } | null
  clientSignature: { name: string } | null
}
export type DocTotals = QuoteTotals & { itemCount: number }

/** The lines that price on the document: optional lines never count (REG-492). */
export function docTotals(d: DocData): DocTotals {
  return quoteTotals(d.items.filter((i) => !i.optional), { additionalDiscountMode: d.quote.additionalDiscountMode, additionalDiscountValue: d.quote.additionalDiscountValue, gstEnabled: d.quote.gstEnabled })
}

export const DEMO_STUDIO: StudioDetails = {
  name: 'Demo Studio Pte Ltd', address: '12 Jalan Besar #03-01, Singapore 208789', phone: '+65 6222 0188', fax: '+65 6222 0189', email: 'hello@demostudio.sg', website: 'www.demostudio.sg',
  uen: '201234567M', gstReg: 'M90371234', licence: 'HB-09-1234A',
}

const dueLabel = (kind: string, at: Date | null) => (kind === 'approval' ? 'On approval' : at ? (kind === 'estimate' ? `~ ${displayDate(at)}` : displayDate(at)) : '')

/** The document's data from the records the quote editor and the preview load. */
export function docDataFromRecords(r: {
  quote: Quote; lead: { name: string; phone?: string | null; email?: string | null }; studio: StudioDetails; members: Member[]; items: QuoteItem[]; payments: QuotePayment[]; totalMinor?: number
}): DocData {
  const prepared = r.members.find((m) => m.id === r.quote.preparedBy) ?? r.members.find((m) => m.isYou) ?? null
  const items: DocItem[] = r.items.map((i) => ({ ...i, optional: !!(i as QuoteItem & { optional?: boolean }).optional }))
  const totals = quoteTotals(items.filter((i) => !i.optional), { additionalDiscountMode: r.quote.additionalDiscountMode, additionalDiscountValue: r.quote.additionalDiscountValue, gstEnabled: r.quote.gstEnabled })
  const amounts = paymentAmounts(r.payments, r.totalMinor ?? totals.totalMinor)
  const gstRate = items.find((i) => i.kind === 'item')?.gstPct ?? 9
  return {
    quote: {
      number: r.quote.number, title: r.quote.title, version: r.quote.version, date: r.quote.createdAt, validUntil: r.quote.validUntil, projectRef: r.quote.projectRef ?? '', customerId: r.quote.customerId ?? '', nric: r.quote.nric ?? '',
      propertyType: r.quote.propertyType ?? '', siteAddress: r.quote.siteAddress ?? '', gstEnabled: r.quote.gstEnabled, gstRate, additionalDiscountMode: r.quote.additionalDiscountMode === 'amount' ? 'amount' : 'pct', additionalDiscountValue: r.quote.additionalDiscountValue,
      termsHtml: r.quote.termsHtml ?? '', notesHtml: r.quote.notesHtml ?? '', status: r.quote.status,
    },
    client: { name: r.lead.name, salutation: '', phone: r.lead.phone ? (r.lead.phone.startsWith('+') ? r.lead.phone : `+65 ${r.lead.phone.replace(/^(\d{4})(\d{4})$/, '$1 $2')}`) : '', email: r.lead.email ?? '' },
    studio: r.studio,
    preparedBy: { name: prepared?.name ?? '', phone: r.studio.phone, role: prepared?.role === 'Owner' ? 'Principal Designer' : prepared ? 'Designer' : '' },
    items,
    payments: r.payments.map((p, i) => ({ name: p.name, description: p.description, pct: p.pct, amountMinor: amounts[i] ?? 0, due: dueLabel(p.dueKind, p.dueAt) })),
    memberSignature: prepared && (prepared.signatureKind === 'draw' || prepared.signatureKind === 'type') ? { kind: prepared.signatureKind, name: prepared.signatureName ?? prepared.name, data: prepared.signatureData } : null,
    clientSignature: r.quote.status === 'Signed' ? { name: r.lead.name } : null,
  }
}

/* ── the sample quote (a 4-room HDB, in the shape of the studios' own quotes) ── */
let n = 0
const line = (category: string, room: string, name: string, qty: number, unit: string | null, cost: number, markup: number, description: string | null = null, extra: Partial<DocItem> = {}): DocItem => {
  n += 1
  return { id: `s${n}`, parentId: null, kind: 'item', position: n, name, description, qty, unit, costMinor: Math.round(cost * 100), markupMinor: Math.round(markup * 100), discountPct: 0, gstPct: 9, room, category, section: null, visibility: 'visible', status: 'Pending', thumb: null, icon: null, optional: false, ...extra }
}
const D = (y: number, m: number, d: number) => new Date(y, m - 1, d)
export const SAMPLE_DATA: DocData = {
  quote: {
    number: 'OM-10042', title: '4-Room HDB renovation — Tampines', version: 1, date: D(2026, 9, 17), validUntil: D(2026, 10, 17), projectRef: 'HDB/20260917/003', customerId: 'C-0417', nric: 'S8888888A',
    propertyType: '4-room HDB', siteAddress: 'Blk 512 Tampines Central 1 #08-123, Singapore 520512', gstEnabled: true, gstRate: 9, additionalDiscountMode: 'pct', additionalDiscountValue: 0,
    termsHtml: '<p>This quotation is valid for 30 days from the date above.</p><p>Works commence within two weeks of the deposit. The timeline is 8 to 10 weeks, subject to HDB permit approval.</p><p>Variations are quoted and agreed in writing before work begins. All prices are in Singapore dollars and include GST at 9%.</p><p>Carpentry comes with soft-closing hinges and drawer runners, ABS trimming and internal coloured PVC. Tile selection up to S$3.50 per sq ft.</p><p>Any default in payment will result in a stop of work. Please make payment to Demo Studio Pte Ltd by bank transfer or PayNow (UEN 201234567M).</p>',
    notesHtml: '<p>Electrical and air-conditioning works are quoted by the respective vendors after the site inspection.</p><p>All hacking works are subject to HDB approval and exclude any Professional Engineer fees.</p>', status: 'Draft',
  },
  client: { name: 'Mr & Mrs Tan', salutation: 'Mr & Mrs Tan', phone: '+65 9123 4567', email: 'tan.family@example.sg' },
  studio: DEMO_STUDIO,
  preparedBy: { name: 'Dane', phone: '+65 9236 1929', role: 'Principal Designer' },
  items: [
    line('Hacking Works', 'Living & Dining', 'Supply labour and tools to dismantle and remove existing laminate flooring and skirting', 1, 'Lot', 0, 0, 'Subject to HDB approval'),
    line('Hacking Works', 'Kitchen', 'Hack and remove existing floor and wall tiles, top and bottom cabinets', 1, 'Lot', 0, 0),
    line('Hacking Works', 'Common Bathroom', 'Dismantle existing sanitary wares and fittings; hack wall and floor tiles', 1, 'Lot', 0, 0),
    line('Hacking Works', 'Whole unit', 'Haulage and disposal of debris to an approved dumping site', 1, 'Lot', 2600, 900),
    line('Masonry Works', 'Kitchen', 'Apply cement plaster and skim coat to hacked kitchen wall', 280, 'sqft', 4.5, 2, 'Prepacked drymix wall screed and easi plaster'),
    line('Masonry Works', 'Kitchen', 'Lay R10 slip-resistant homogeneous floor tiles with skirting', 140, 'sqft', 11, 4, 'Tiles up to S$3.50 per sq ft, 600 × 600 mm'),
    line('Masonry Works', 'Common Bathroom', 'Apply 3-coat waterproofing membrane with upturn', 1, 'Lot', 180, 70),
    line('Masonry Works', 'Common Bathroom', 'Lay full-height homogeneous wall tiles', 240, 'sqft', 9, 3.5),
    line('Masonry Works', 'Common Bathroom', 'Construct bathroom entrance kerb and shower drop', 1, 'Lot', 190, 80),
    line('Carpentry Works', 'Kitchen', 'Design, fabricate and install kitchen top-hung cabinet with soft-closing doors', 18.5, 'ft run', 105, 45, 'Includes a 2-tier stainless steel dish rack and bottom-row LED light'),
    line('Carpentry Works', 'Kitchen', 'Design, fabricate and install kitchen bottom cabinet with drawer units and cutlery tray', 12, 'ft run', 110, 40),
    line('Carpentry Works', 'Master Bedroom', 'Design, fabricate and install full-height casement wardrobe, handleless, with rounded corners', 12.5, 'ft run', 250, 100, 'Internal coloured PVC, soft-closing hinges'),
    line('Carpentry Works', 'Living & Dining', 'Design, fabricate and install TV console with concealed LED strip', 11, 'ft run', 120, 48),
    line('Plumbing Works', 'Kitchen', 'Install concealed copper piping for kitchen sink and washing machine (cold water only)', 1, 'Lot', 650, 250),
    line('Plumbing Works', 'Common Bathroom', 'Install concealed copper piping for WC, bidet, basin tap and shower mixer', 1, 'Lot', 1300, 500),
    line('Plumbing Works', 'Common Bathroom', 'Supply labour to install storage water heater, shower mixer, basin and WC', 1, 'Lot', 0, 0, 'Sanitary wares supplied by the client'),
    line('Painting Works', 'Whole unit', 'Paint internal walls of the entire unit with Nippon Vinilex 5000, ceilings in Matex White', 1, 'Lot', 1300, 500, 'Four colours; two rounds, before carpentry and before handover'),
    line('Miscellaneous Works', 'Whole unit', 'Provision of corrugated paper protection to flooring and door frames during works', 1, 'Lot', 320, 130),
    line('Miscellaneous Works', 'Whole unit', 'Chemical washing and general cleaning upon completion (two rounds)', 1, 'Lot', 360, 140),
    line('Miscellaneous Works', 'Whole unit', 'HDB renovation permit application (excluding P.E. endorsement)', 1, 'Lot', 0, 0),
    line('Optional Works', 'Living & Dining', 'Apply limewash paint to the TV feature wall and master bedhead wall', 140, 'sqft', 6, 2.5, null, { optional: true }),
    line('Optional Works', 'Whole unit', 'Cement screed and self-levelling compound before vinyl flooring (subject to site condition)', 320, 'sqft', 4.5, 2, null, { optional: true }),
  ],
  payments: [],
  memberSignature: { kind: 'type', name: 'Dane', data: null },
  clientSignature: null,
}
{
  const t = docTotals(SAMPLE_DATA)
  const split = [{ name: 'Deposit', description: 'Upon confirmation of the contract', pct: 10, due: 'On approval' }, { name: 'Commencement', description: 'Prior to commencement of works', pct: 40, due: '~ 5 Oct 2026' }, { name: 'Carpentry', description: 'Prior to fabrication of carpentry', pct: 40, due: '~ 2 Nov 2026' }, { name: 'Completion', description: 'Upon handover, pending defects rectification', pct: 10, due: '~ 30 Nov 2026' }]
  const amounts = paymentAmounts(split, t.totalMinor)
  SAMPLE_DATA.payments = split.map((p, i) => ({ ...p, amountMinor: amounts[i] ?? 0 }))
}

/** A quote with nothing on it yet — every field empty, the table bare — for checking a layout's chrome. */
export const EMPTY_DATA: DocData = {
  quote: { number: '', title: '', version: 1, date: null, validUntil: null, projectRef: '', customerId: '', nric: '', propertyType: '', siteAddress: '', gstEnabled: true, gstRate: 9, additionalDiscountMode: 'pct', additionalDiscountValue: 0, termsHtml: '', notesHtml: '', status: 'Draft' },
  client: { name: '', salutation: '', phone: '', email: '' },
  studio: DEMO_STUDIO,
  preparedBy: { name: '', phone: '', role: '' },
  items: [], payments: [], memberSignature: null, clientSignature: null,
}
