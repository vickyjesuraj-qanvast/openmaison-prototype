/**
 * Fields a template's text can carry — `{client_name}`, `{quote_number}`, `{page}` … — and what each resolves to on a quote
 * (REG-486, the Claude Design's field chips). Client-safe.
 */
import { displayDate, displayDateFull, displayDateFullWeekday } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { docEntity, docLetterhead, type DocData, type DocTotals } from './data'
import { SOCIAL_KEYS, type DateFormat } from './model'

export const FIELD_GROUPS: { label: string; fields: { key: string; label: string }[] }[] = [
  { label: 'Client', fields: [
    { key: 'client_name', label: 'Client name' }, { key: 'client_salutation', label: 'Salutation' }, { key: 'client_phone', label: 'Client phone' }, { key: 'client_email', label: 'Client email' },
    { key: 'site_address', label: 'Site address' }, { key: 'property_type', label: 'Property type' }, { key: 'nric', label: 'NRIC' }, { key: 'customer_id', label: 'Customer ID' },
    { key: 'client_company', label: 'Company' }, { key: 'client_uen', label: 'Company UEN' },   // (pending modules S05 — testers' L-3) a commercial client's
    { key: 'client_2_name', label: 'Second client' }, { key: 'client_2_nric', label: 'Second client NRIC' },
  ] },
  { label: 'Quote', fields: [
    { key: 'quote_number', label: 'Quote number' }, { key: 'quote_title', label: 'Quote title' }, { key: 'version', label: 'Version' }, { key: 'date', label: 'Date' }, { key: 'valid_until', label: 'Valid until' },
    { key: 'validity_days', label: 'Validity (days)' }, { key: 'project_ref', label: 'Project ref' },
    { key: 'remarks', label: 'Remarks' }, { key: 'signed_date', label: 'Signed date' },   // (S44T — UAT rows 321 · 331) General Info's Remarks; the day the client signed (empty until then)
    /* (S44G — a bug fix) the five money fields are back in Insert a field: the comment above had run on over them, so the menu (and
       FIELD_LABEL) lost Item count · Subtotal · GST amount · GST rate · Grand total */
    { key: 'item_count', label: 'Item count' }, { key: 'subtotal', label: 'Subtotal' }, { key: 'gst_amount', label: 'GST amount' }, { key: 'gst_rate', label: 'GST rate' }, { key: 'total', label: 'Grand total' },
  ] },
  { label: 'Studio', fields: [
    { key: 'studio_name', label: 'Studio name' }, { key: 'studio_address', label: 'Address' }, { key: 'studio_phone', label: 'Phone' }, { key: 'studio_fax', label: 'Fax' }, { key: 'studio_email', label: 'Email' },
    { key: 'studio_website', label: 'Website' }, { key: 'studio_uen', label: 'UEN / Co. Reg. No.' }, { key: 'studio_gst', label: 'GST Reg. No.' }, { key: 'studio_licence', label: 'HDB licence' },
    { key: 'studio_tagline', label: 'Tagline' }, { key: 'studio_social', label: 'Social links' },
    { key: 'studio_footer', label: 'Footer line' },   // (pending modules S11) the issuing entity's footer line (Company › Profile › More details)
  ] },
  { label: 'Bank', fields: [{ key: 'bank_name', label: 'Bank' }, { key: 'bank_account_name', label: 'Account name' }, { key: 'bank_account', label: 'Account number' }, { key: 'bank_swift', label: 'SWIFT' }, { key: 'paynow', label: 'PayNow' }] },
  { label: 'People', fields: [{ key: 'prepared_by', label: 'Prepared by' }, { key: 'prepared_by_phone', label: 'Prepared by · phone' }, { key: 'prepared_by_role', label: 'Prepared by · role' }, { key: 'prepared_by_email', label: 'Prepared by · email' }] },
  { label: 'Page', fields: [{ key: 'page', label: 'Page number' }, { key: 'pages', label: 'Page count' }] },
]
export const FIELD_LABEL: Record<string, string> = Object.fromEntries(FIELD_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.label])))

export type PageInfo = { page: number; pages: number }

/** Every field's value on this quote; `{page}` and `{pages}` come from the page being drawn. */
export function fieldValues(d: DocData, t: DocTotals, page: PageInfo = { page: 1, pages: 1 }, dateFormat: DateFormat = 'short'): Record<string, string> {
  const salutation = d.client.salutation || (d.client.name ? d.client.name.split(' ')[0] ?? '' : '')
  const gstRate = d.quote.gstEnabled ? `${d.quote.gstRate}%` : ''
  const bank = docEntity(d)
  const head = docLetterhead(d)   // (REG-618, parity Q-26) the quote's issuing entity's letterhead
  // (REG-618, parity Q-20) The networks as typed, joined; the old one-line field while none is filled.
  const social = SOCIAL_KEYS.filter((k) => k !== 'website').map((k) => d.studio.socials?.[k]).filter((v): v is string => !!v).join(' · ') || d.studio.social   // the website has its own {studio_website}
  // (REG-618, parity Q-25) Settings › Quotes › Prepared by: the member, every member on the lead, or the studio.
  const mode = d.studio.preparedByMode ?? 'member'
  const preparedName = mode === 'studio' ? head.name : mode === 'team' && d.preparedBy.team?.length ? d.preparedBy.team.join(' · ') : d.preparedBy.name
  const fmtDate = (x: Date) => (dateFormat === 'weekday' ? displayDateFullWeekday(x) : dateFormat === 'long' ? displayDateFull(x) : displayDate(x))   // (REG-592)
  return {
    /* (REG-588) With a second client, {client_name} prints both — "Mr Tan & Mrs Tan" — and {nric} both numbers; the second stands alone under its own fields. */
    client_name: d.client2 ? `${d.client.name} & ${d.client2.name}` : d.client.name, client_salutation: salutation, client_phone: d.client.phone, client_email: d.client.email,
    site_address: d.quote.siteAddress, property_type: d.quote.propertyType, nric: d.client2?.nric ? [d.quote.nric, d.client2.nric].filter(Boolean).join(' / ') : d.quote.nric, customer_id: d.quote.customerId,
    client_2_name: d.client2?.name ?? '', client_2_nric: d.client2?.nric ?? '',
    client_company: d.client.company ?? '', client_uen: d.client.uen ?? '',   // (pending modules S05)
    quote_number: d.quote.number, quote_title: d.quote.title, version: `v${d.quote.version}`, date: d.quote.date ? fmtDate(d.quote.date) : '', valid_until: d.quote.validUntil ? fmtDate(d.quote.validUntil) : '',
    remarks: d.quote.remarks ?? '', signed_date: d.quote.signedAt ? fmtDate(d.quote.signedAt) : '',   // (S44T — rows 321 · 331)
    validity_days: d.quote.validUntil && d.quote.date ? String(Math.max(0, Math.round((d.quote.validUntil.getTime() - d.quote.date.getTime()) / 86_400_000))) : '', project_ref: d.quote.projectRef,
    item_count: String(t.itemCount), subtotal: money2(t.subtotalMinor), gst_amount: money2(t.gstMinor), gst_rate: gstRate, total: money2(t.totalMinor),
    /* (pending modules S11 — card held:quote-templates) a quote raised under another issuing entity prints that entity's contacts, tagline and
       footer line wherever the template names the studio's, each falling back to the studio's — as its invoices do */
    studio_name: head.name, studio_address: head.address, studio_phone: head.phone, studio_fax: d.studio.fax, studio_email: head.email, studio_website: head.website,
    studio_uen: head.uen, studio_gst: head.gstReg, studio_licence: d.studio.licence, studio_tagline: head.tagline, studio_social: social, studio_footer: head.footer,
    bank_name: bank?.bankName ?? '', bank_account_name: bank?.accountName ?? '', bank_account: bank?.accountNo ?? '', bank_swift: bank?.swift ?? '', paynow: bank?.payNow ?? '',
    prepared_by: preparedName, prepared_by_phone: d.preparedBy.phone, prepared_by_role: mode === 'member' ? d.preparedBy.role : '', prepared_by_email: mode === 'studio' ? head.email : d.preparedBy.email,
    page: String(page.page), pages: String(page.pages),
    /* (Projects round 5) not a field a studio types — it tells `resolveFields` the document is a variation order */
    ...(d.quote.kind === 'variation' ? { [DOC_KIND]: 'variation', [DOC_OF]: d.quote.variationOf ?? '' } : {}),
  }
}

const TOKEN = /\{([a-z_]+)\}/g
/** (Projects round 5, F-06) The values' mark that the document is a variation order — a key no template can type (it has a space). */
const DOC_KIND = 'doc kind'
/** (fix-D, D-08) The contract a variation order changes — a key no template can type. */
const DOC_OF = 'doc of'
/** A variation order prints through the quote's template: the template's own words "Quotation" and "Quote" read "Variation order" in the
    case they are written in ("QUOTATION" · "Quotation No:" · "quote"). Only the template's text — never a field's value. */
const caseLike = (word: string, as: string) => (word === word.toUpperCase() ? as.toUpperCase() : word[0] === word[0]!.toUpperCase() ? as[0]!.toUpperCase() + as.slice(1) : as)
export const asVariation = (text: string) => text.replace(/\b(quotation|quote)\b/gi, (w) => caseLike(w, 'variation order'))
  /* (fix-D, D-08 · G-12) the contract's subject line ("CONTRACT FOR RENOVATION … WORKS") becomes the order's to that contract */
  .replace(/\bcontract for\b/gi, (w) => caseLike(w, 'variation order to the contract for'))
/** Whether the values print a variation order. */
export const isVariationDoc = (values: Record<string, string>) => values[DOC_KIND] === 'variation'
/** (fix-D, D-08 · G-12) A variation order's title, in the case the template's heading is written in: the document says what it is — "Variation
    order VO-1 — to contract OM-10009" — where the template's heading said "Sales Contract", "QUOTATION" or the quote's title. */
export function variationHeading(written: string, values: Record<string, string>): string {
  const of = values[DOC_OF]
  const title = `Variation order ${values.quote_number ?? ''}${of ? ` — to contract ${of}` : ''}`
  return written.trim() && written === written.toUpperCase() && /[A-Z]/.test(written) ? title.toUpperCase() : title
}
/** (fix-D, D-08) A totals line's words on a variation order: its total is the change to the contract, its subtotal the change before GST. */
export function variationTotalsLabel(key: string, label: string, values: Record<string, string>): string {
  if (!isVariationDoc(values)) return label
  const as = key === 'total' ? 'Change to the contract' : key === 'subtotal' ? 'Change before GST' : null
  if (!as) return label
  const colon = /:\s*$/.test(label) ? ':' : ''
  const bare = label.replace(/:\s*$/, '')
  return `${bare && bare === bare.toUpperCase() && /[A-Z]/.test(bare) ? as.toUpperCase() : as}${colon}`
}
/** "{client_name}" → the value; an unknown key stays as typed so the studio sees the typo. */
export function resolveFields(text: string, values: Record<string, string>): string {
  return resolveFieldsOnly(values[DOC_KIND] === 'variation' ? asVariation(text) : text, values)
}
/** The fields alone — for a body the studio wrote itself (T&Cs, notes, a line's description), which keeps its own words on a variation order. */
export function resolveFieldsOnly(text: string, values: Record<string, string>): string {
  return text.replace(TOKEN, (m, key: string) => (key in values ? values[key]! : m))
}
/** True when the text is nothing but fields that all resolved to nothing — a "Hide if empty" element goes. */
export function isEmptyResolved(text: string, values: Record<string, string>): boolean {
  return resolveFields(text, values).replace(/[\s·,:/-]+/g, '') === '' && new RegExp(TOKEN.source).test(text)
}
