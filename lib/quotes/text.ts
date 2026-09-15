import { displayDate } from '@/lib/format'
import { money2 } from './math'
import { dueLabel, type PaymentRow } from './payments'

/**
 * Terms and Conditions · Additional Notes (1238:33502 · 1238:33503, REG-420) — client-safe. Both sections are one rich-text
 * body on the quote (HTML the in-house editor writes), a "Show in client view" switch, a studio-wide template library per
 * section (`quote_text_templates`) and "Write with AI", which composes the text from the quote's own records (REG-403).
 * Templates carry TOKENS — "[Client Full Name]" and the like (Insert Token ▾, 1238:33173) — that resolve to the quote's
 * records the moment a template is added.
 */
export const TEXT_KINDS = ['terms', 'notes'] as const
export type TextKind = (typeof TEXT_KINDS)[number]
export const isTextKind = (s: string): s is TextKind => (TEXT_KINDS as readonly string[]).includes(s)
export const TEXT_LABEL: Record<TextKind, string> = { terms: 'Terms and Conditions', notes: 'Additional Notes' }
/** The empty body's invitation (1263:36260 · 1263:36271). */
export const TEXT_PLACEHOLDER: Record<TextKind, string> = { terms: 'Add your Terms and Conditions', notes: 'Add any additional notes to include in the quote' }

export const TOKENS = [
  { key: 'client', label: 'Client Full Name' },
  { key: 'studio', label: 'Studio Name' },
  { key: 'studioPhone', label: 'Studio Phone Number' },
  { key: 'member', label: 'Team Member Full Name' },
] as const
export type TokenKey = (typeof TOKENS)[number]['key']
export type TokenValues = Record<TokenKey, string>
/** How a token sits in a template's text — the mock's bracketed placeholder ("[Name]", "[Company Name]"). */
export const tokenText = (key: TokenKey) => `[${TOKENS.find((t) => t.key === key)!.label}]`

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** Every token in `html` becomes the record it names (escaped). Unknown brackets are left as typed. */
export function resolveTokens(html: string, v: TokenValues): string {
  let out = html
  for (const t of TOKENS) out = out.split(tokenText(t.key)).join(escapeHtml(v[t.key] || tokenText(t.key)))
  return out
}

/** Blank = no text and no structural content; the lone <br> contenteditable leaves behind is blank. */
export const isBlankHtml = (h: string | null | undefined) => !h || (!/<(ul|ol|li|img)/i.test(h) && h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim() === '')
/** A template card's second line (1238:33448): the body's first words, tags stripped. */
export function textPreview(html: string, max = 140): string {
  const text = html.replace(/<\/(p|div|li|h\d)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

const p = (s: string) => `<p>${s}</p>`
const h = (s: string) => `<p><strong>${s}</strong></p>`

/**
 * The studio's template library as seeded (repair R26, invented copy — Singapore renovation practice: HDB renovation permits
 * and Registered Renovation Contractors, BCA, MCST house rules, BTO defects liability, the 12-month workmanship warranty).
 * Titles follow the mock's ("… for Renovation Works · … for HDB Works · … for BTO Works"); the bodies are real terms.
 */
export const TEMPLATE_SEED: { kind: TextKind; title: string; body: string }[] = [
  {
    kind: 'terms', title: 'Terms and Conditions for Renovation Works',
    body: [
      h('TERMS AND CONDITIONS FOR RENOVATION WORKS'),
      h('1. Agreement'),
      p('These Terms and Conditions form part of the Renovation Contract entered into between the Homeowner/Client, [Client Full Name], and the Contractor/Company, [Studio Name], for the renovation works described in this quotation.'),
      h('2. Scope of Works'),
      p('The works are limited to the items listed in this quotation. Additional works, changes of material or changes to the approved drawings are variations and will be quoted and agreed in writing before they are carried out.'),
      h('3. Validity and Pricing'),
      p('This quotation is valid for 30 days from its date of issue. Prices are in Singapore dollars and include GST where stated. Quantities marked as estimates are re-measured on site before the relevant works begin.'),
      h('4. Payment'),
      p('Payment follows the schedule set out in this quotation. Works commence only after the deposit has been received. An invoice unpaid for more than 7 days may lead to the works being suspended until the outstanding amount is settled.'),
      h('5. Timeline'),
      p('The completion timeline is indicative and depends on material lead times, site access and the timely confirmation of drawings and selections. [Studio Name] will inform the Client of any change to the timeline as early as possible.'),
      h('6. Permits and Compliance'),
      p('Where a permit is required, [Studio Name] will apply for it on the Client’s behalf. All works comply with the guidelines of the relevant authorities and the building management, and any fee they impose is borne by the Client.'),
      h('7. Materials and Warranty'),
      p('Materials are as specified in this quotation or of equivalent quality where the specified item is unavailable. Workmanship for carpentry, wet works and electrical works is warranted for 12 months from handover, excluding wear and tear, misuse and alterations by other parties.'),
      h('8. Cancellation'),
      p('Should the Client cancel after the works have commenced, the Client pays for all works completed and materials ordered up to the date of cancellation.'),
      p('For any query on these terms, contact [Studio Name] at [Studio Phone Number]. Prepared by [Team Member Full Name].'),
    ].join(''),
  },
  {
    kind: 'terms', title: 'Terms and Conditions for HDB Works',
    body: [
      h('TERMS AND CONDITIONS FOR HDB WORKS'),
      h('1. Renovation Permit'),
      p('Works in an HDB flat are carried out under an HDB renovation permit applied for by [Studio Name], a Registered Renovation Contractor. The permit is valid for 3 months from its date of issue and works are scheduled within that period.'),
      h('2. Permitted Hours'),
      p('General renovation works are carried out between 9am and 6pm on weekdays and Saturdays. Noisy works such as hacking and drilling are limited to 9am to 5pm on weekdays and are not carried out on Sundays or public holidays.'),
      h('3. Hacking and Structural Works'),
      p('Structural walls, columns and beams will not be hacked. Wall demolition and floor hacking are carried out only where HDB has approved them and within the limits stated in the permit.'),
      h('4. Wet Areas'),
      p('Flats within their first three years from key collection keep HDB’s waterproofing on the bathroom floors; tiling in those bathrooms is carried out without disturbing the existing waterproofing membrane.'),
      h('5. Disposal and Common Areas'),
      p('Debris is bagged and removed daily. Common corridors and lift lobbies are protected during the works and left clean at the end of each day.'),
      h('6. Payment and Warranty'),
      p('Payment follows the schedule in this quotation. Workmanship is warranted for 12 months from handover. Prepared for [Client Full Name] by [Team Member Full Name], [Studio Name], [Studio Phone Number].'),
    ].join(''),
  },
  {
    kind: 'terms', title: 'Terms and Conditions for BTO Works',
    body: [
      h('TERMS AND CONDITIONS FOR BTO WORKS'),
      h('1. Defects Check'),
      p('Works begin only after the Client has completed the defects inspection with HDB’s Building Service Centre and the reported defects have been rectified, so that HDB’s defects liability period is not affected by the renovation.'),
      h('2. Renovation Permit'),
      p('[Studio Name] applies for the HDB renovation permit before any work starts. Optional Component Scheme fittings the flat came with are removed only where the Client has confirmed it in writing.'),
      h('3. Timeline'),
      p('A whole-flat renovation for a new BTO flat typically runs 8 to 12 weeks from commencement, depending on carpentry lead times and the confirmation of selections. The dates in this quotation are estimates.'),
      h('4. Selections'),
      p('Laminates, tiles, sanitary ware and fittings are to be confirmed before the works commence. Changes after an item has been ordered are variations charged at cost.'),
      h('5. Payment and Warranty'),
      p('Payment follows the schedule in this quotation. Workmanship is warranted for 12 months from handover. Prepared for [Client Full Name] by [Team Member Full Name], [Studio Name], [Studio Phone Number].'),
    ].join(''),
  },
  {
    kind: 'notes', title: 'Working Hours and Site Access',
    body: p('Works are carried out from 9am to 6pm, Monday to Saturday. Please arrange for the keys or access card to be handed to [Team Member Full Name] before the commencement date, and register [Studio Name] with the building management where the estate requires it.'),
  },
  {
    kind: 'notes', title: 'Material Lead Times',
    body: p('Laminate carpentry is fabricated 2 to 3 weeks after the drawings are confirmed; quartz worktops are cut 2 weeks after templating; imported sanitary ware and lighting take 4 to 6 weeks. Selections confirmed late move the dates in the schedule accordingly.'),
  },
  {
    kind: 'notes', title: 'What This Quote Excludes',
    body: p('This quotation excludes the removal of existing furniture, electrical supply upgrades by SP Group, permit and management fees imposed by the authorities or the building, and items purchased by the Client directly. Contact [Studio Name] at [Studio Phone Number] to add any of these.'),
  },
]

export type TextContext = {
  studio: string
  client: string
  member: string
  number: string
  propertyType: string | null
  siteAddress: string | null
  validUntil: Date | null
  createdAt: Date
  totalMinor: number
  gstEnabled: boolean
  /** The sections of works, in the order the lines run (a line's section, else its category). */
  works: string[]
  itemCount: number
  schedule: PaymentRow[]
  start: Date
  weeks: number
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const validity = (c: TextContext) => (c.validUntil ? `until ${displayDate(c.validUntil)}` : `for 30 days from ${displayDate(c.createdAt)}`)

/** Write with AI › Terms and Conditions (owner 2026-09-11: from the quote's items): the general terms, with this quote's scope, sum, schedule and validity written in. */
export function aiTerms(c: TextContext): string {
  const works = c.works.length ? list(c.works.map((w) => w.toLowerCase())) : 'the works listed in this quotation'
  const where = c.siteAddress ? ` at ${c.siteAddress}` : ''
  const sched = c.schedule.length ? c.schedule.map((r) => `${r.pct}% ${r.name.toLowerCase()} (${dueLabel(r).replace('~ ', 'about ')})`).join(', ') : 'the schedule set out in this quotation'
  return [
    h('TERMS AND CONDITIONS FOR RENOVATION WORKS'),
    h('1. Agreement'),
    p(`These Terms and Conditions form part of the Renovation Contract between the Homeowner/Client, ${c.client}, and the Contractor/Company, ${c.studio}, for quotation ${c.number}${where}.`),
    h('2. Scope of Works'),
    p(`The scope covers ${c.itemCount} ${c.itemCount === 1 ? 'item' : 'items'} of ${works}${c.propertyType ? ` for a ${c.propertyType}` : ''}, as listed in this quotation. Anything not listed is a variation, quoted and agreed in writing before it is carried out.`),
    h('3. Price and Validity'),
    p(`The contract sum is ${money2(c.totalMinor)}${c.gstEnabled ? ', inclusive of GST at 9%' : ', with GST not applied'}. This quotation is valid ${validity(c)}.`),
    h('4. Payment'),
    p(`Payment is made in the milestones agreed: ${sched}. Works commence only after the deposit has been received; an invoice unpaid for more than 7 days may lead to the works being suspended.`),
    h('5. Timeline'),
    p(`Works are scheduled to start on about ${displayDate(c.start)} and run for about ${c.weeks} weeks. The dates are estimates and move with material lead times, site access and the confirmation of selections; ${c.studio} will inform ${c.client} of any change as early as possible.`),
    h('6. Permits, Materials and Warranty'),
    p(`Permits, where required, are applied for by ${c.studio} on the Client’s behalf. Materials are as specified or of equivalent quality. Workmanship for carpentry, wet works and electrical works is warranted for 12 months from handover, excluding wear and tear, misuse and works by other parties.`),
    p(`Prepared by ${c.member}, ${c.studio}.`),
  ].join('')
}

/** Write with AI › Additional Notes: what the client should know about this quote — its coverage, timing, tax and validity, all from records. */
export function aiNotes(c: TextContext): string {
  const works = c.works.length ? ` across ${list(c.works.map((w) => w.toLowerCase()))}` : ''
  return [
    p(`This quotation covers ${c.itemCount} ${c.itemCount === 1 ? 'item' : 'items'}${works}${c.propertyType ? ` for the ${c.propertyType}` : ''}${c.siteAddress ? ` at ${c.siteAddress}` : ''}.`),
    p(`Works are scheduled to start on about ${displayDate(c.start)} and run for about ${c.weeks} weeks; the dates move with material lead times and the confirmation of selections.`),
    p(`Prices are ${c.gstEnabled ? 'inclusive of GST at 9%' : 'shown without GST'} and the quotation is valid ${validity(c)}.`),
  ].join('')
}
