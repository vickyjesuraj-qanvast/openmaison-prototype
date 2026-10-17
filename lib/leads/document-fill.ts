/**
 * (S42F — her "nothing buggy", 2026-10-12; the audit's E-05 family: REG-609's *Fill from a document* filled one fixed sample lead whatever file
 * was picked) The lead form's document read, by rule, in the browser the moment a file is picked — nothing leaves it while it reads. 1.0 read
 * an enquiry with a model (`lead_email_parse` · `lead_screenshot_parse`, 0 credits); 2.0 reads the file's OWN words:
 *   · a PDF's text (`lib/pdf-text.ts`, the import wizard's and Upload a quote's reader) · a spreadsheet's cells (XLSX · CSV) · a text file;
 *   · labelled lines first — "Name: …", "Mobile: …", "Email: …", "Property type: …" in the import's own words (`leadSheetField` · `autoMap`),
 *     a one-row lead sheet as the import reads it (`parseLeadSheet`) — then, for the five a client's enquiry is read for, what plainly appears in
 *     running text: ONE Singapore number, ONE email address (never the studio's own), a name beside its email or signing the message, a line
 *     that is an address, a home named with its size;
 *   · values through the import's readers (`readPropertyType` · `readDistrict` · `readAmount` · `readSource`) — a value they can't place is
 *     left out, never guessed; two candidates for one field are left out too.
 * A photo or a scanned page has no words (said so); a sheet of several leads belongs to Import leads (said so); nothing found is said plainly.
 * Pure but for `readLeadDocument`'s file reading; no server imports.
 */
import { autoMap } from './import-fields'
import { leadSheetField, parseLeadSheet } from './homematch'
import { readAmount, readDistrict, readPropertyType, readSource } from './import-values'
import { groupDigits, isSgPhone } from '@/lib/format'

/** The form's fields a document can fill, in the form's order. */
export const FILL_FIELDS = ['name', 'phone', 'email', 'source', 'propertyType', 'propertyAddress', 'district', 'budget', 'notes'] as const
export type FillField = (typeof FILL_FIELDS)[number]
export type LeadFill = Partial<Record<FillField, string>>
/** What a client's enquiry is read for — the sentence after a read names the ones the file didn't have. */
export const CORE_FIELDS: readonly FillField[] = ['name', 'phone', 'email', 'propertyAddress', 'propertyType']
/** Each field in a sentence, as the form labels it. */
export const FILL_WORD: Record<FillField, string> = {
  name: 'name', phone: 'phone number', email: 'email', source: 'lead source', propertyType: 'property type', propertyAddress: 'property address',
  district: 'district', budget: 'budget', notes: 'remarks',
}
export type DocumentRead =
  | { ok: true; fill: LeadFill }
  | { ok: false; reason: 'scan' | 'nothing' | 'unreadable' | 'many'; count?: number }
/** What the read must not take for the client's: the studio's own members' emails and numbers; the studio's lead sources for a Source line. */
export type FillContext = { sources: readonly string[]; ownEmails: readonly string[]; ownPhones: readonly string[] }

/** What the form's picker offers — a photo is not offered (it has no words to read by rule); dropped anyway, it is said so. */
export const DOCUMENT_ACCEPT = '.pdf,.xlsx,.csv,.txt'

/* ── the import's field names → the form's ── */
const BY_IMPORT: Record<string, FillField> = {
  'Lead Name': 'name', 'Lead Phone Number': 'phone', 'Lead Email': 'email', 'Lead Source': 'source', 'Property Type': 'propertyType',
  'Property Address': 'propertyAddress', District: 'district', 'Estimated Budget (S$)': 'budget', Remarks: 'notes',
}
/** A label → the form's field: the lead sheet's words, then the import's headers; "Mobile No." and "Contact number" read as "Mobile" / "Contact". */
function labelField(raw: string): FillField | null {
  const tidy = raw.trim().replace(/[.:*\s]+$/, '')
  for (const l of [tidy, tidy.replace(/\s+(?:no|number|num|#)$/i, '')]) {
    if (!l) continue
    const sheet = leadSheetField(l)
    const hit = (sheet && BY_IMPORT[sheet]) || BY_IMPORT[autoMap([l])[0] ?? ''] || null
    if (hit) return hit
  }
  return null
}

/* ── values ── */
const EMAIL_IN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g
const HAS_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/
/* a Singapore number as people write it: "9123 4567" · "+65 9123-4567" · "6591234567" — never digits inside a longer number */
const PHONE_IN = /(?<!\d)(?:\+?\s*65[\s-]*)?([689]\d{3})[\s-]?(\d{4})(?!\d)/g
const WEBMAIL = new Set(['gmail.com', 'yahoo.com', 'yahoo.com.sg', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'me.com', 'singnet.com.sg', 'msn.com'])
const domainOf = (email: string) => email.slice(email.lastIndexOf('@') + 1).toLowerCase()

function emailsIn(text: string, ctx: FillContext): string[] {
  const own = new Set(ctx.ownEmails.map((e) => e.toLowerCase()))
  const ownDomains = new Set(ctx.ownEmails.map(domainOf).filter((d) => !WEBMAIL.has(d)))
  const out: string[] = []
  for (const m of text.matchAll(EMAIL_IN)) {
    const e = m[0].replace(/\.+$/, '')
    const low = e.toLowerCase()
    if (own.has(low) || ownDomains.has(domainOf(low)) || /^(?:no-?reply|donotreply|mailer-daemon)@/i.test(low)) continue
    if (!out.some((x) => x.toLowerCase() === low)) out.push(e)
  }
  return out
}
function phonesIn(text: string, ctx: FillContext): string[] {
  const own = new Set(ctx.ownPhones)
  const out: string[] = []
  for (const m of text.matchAll(PHONE_IN)) {
    const d = `${m[1]}${m[2]}`
    if (isSgPhone(d) && !own.has(d) && !out.includes(d)) out.push(d)
  }
  return out
}
/** A person's name as it is written: one to four words, each with a capital, letters only — never a company's or a sign-off's. */
const NOT_A_PERSON = /\b(?:team|studio|studios|design|designs|interior|interiors|pte|ltd|llp|sent|iphone|android|regards|thanks|singapore|enquiry|customer|service|admin|sales|homematch|qanvast)\b/i
export function looksLikeName(s: string): boolean {
  const t = s.trim()
  return t.length >= 2 && t.length <= 40 && /^[A-Z][A-Za-z'’.-]*(?: [A-Z][A-Za-z'’.-]*){0,3}$/.test(t) && !NOT_A_PERSON.test(t)
}

/** One value for a field from the file's own cell / line — null when it can't be told. */
function valueFor(field: FillField, raw: string, ctx: FillContext): string | null {
  const v = raw.replace(/\s+/g, ' ').trim()
  if (!v || /^(?:-|--|n\/?a|nil|none|tbc|tba|unknown|\?)$/i.test(v)) return null
  switch (field) {
    case 'name': return /[A-Za-z]/.test(v) && !/@|\d{4}/.test(v) ? v.slice(0, 80) : null
    case 'phone': { const p = phonesIn(v, ctx); return p.length === 1 ? p[0]! : null }
    case 'email': { const e = emailsIn(v, ctx); return e.length === 1 ? e[0]! : null }
    case 'propertyType': return readPropertyType(v)
    case 'propertyAddress': return v.slice(0, 200)
    case 'district': return readDistrict(v)
    case 'budget': { const a = readAmount(v).value; return a && a > 0 ? groupDigits(String(a)) : null }
    case 'source': return readSource(v, ctx.sources)
    case 'notes': return v.slice(0, 2000)
  }
}
function put(fill: LeadFill, field: FillField, raw: string, ctx: FillContext) {
  if (fill[field]) return
  const v = valueFor(field, raw, ctx)
  if (v) fill[field] = v
}

/* ── text: labelled lines, a one-row sheet, then running text ── */
const LABELLED = /^\s*([A-Za-z][A-Za-z .()/#'’-]{0,30}?)\s*[:：]\s*(.+)$/
const SIGN_OFF = /^(?:(?:best|kind|warm|warmest)\s+)?(?:regards|thanks|thank you|cheers|sincerely|best)[\s,.!]*$/i
/* a home named with its kind and size in running text — "my 4-room BTO", "a 3-bedroom condo", "HDB 5 rm", "semi-D"; a bare "condo" or "3 bedrooms"
   says too little and is left out (readPropertyType then tells which) */
const HOME_PHRASE = /\b(?:\d\s*-?\s*(?:room|rm|bedder|bedroom|br)s?\s+(?:hdb|bto|condo(?:minium)?|flat|resale(?:\s+flat)?|apartment)|(?:hdb|bto|condo(?:minium)?|resale)\s+\d\s*-?\s*(?:room|rm|bedder|bedroom|br)s?|\d\s*-?\s*(?:room|rm)\b|executive\s+condo(?:minium)?|executive\s+(?:hdb|flat|maisonette)|maisonette|semi[\s-]?d(?:etached)?|terrace\s+house|bungalow|penthouse)\b/gi
const ADDRESS_HINT = /\b(?:blk|block)\s*\d+[a-z]?\b|#\s?\d{1,2}-\d{1,4}\b|\bsingapore\s*\d{6}\b|\b(?:avenue|ave|road|rd|street|st|drive|dr|crescent|cres|lane|walk|close|link|way|boulevard)\s+\d{1,3}\b/i
const COMPANY_LINE = /\b(?:pte\.?\s*ltd|llp|copyright|©|all rights reserved|unsubscribe|privacy)\b/i
/* a line that is a sentence, not an address: "my 4-room at Blk 123 needs work" is read for its home, never as the address */
const SENTENCE = /\b(?:i|we|my|our|me|us|you|your|please|would|looking|want|need|renovat\w*|hello|hi|dear|thanks?|is|are|have|will)\b/i

export function readLeadText(lines: readonly string[], ctx: FillContext): DocumentRead {
  const sheet = parseLeadSheet([...lines])
  if (sheet.rows.length > 1) return { ok: false, reason: 'many', count: sheet.rows.length }
  const fill: LeadFill = {}
  /* a lead sheet with one lead: its row, as the import reads it */
  if (sheet.rows.length === 1) sheet.headers.forEach((h, i) => { const f = BY_IMPORT[h]; if (f) put(fill, f, sheet.rows[0]![i] ?? '', ctx) })
  /* labelled lines: "Mobile: 9123 4567" — a Remarks label takes the lines that follow it until the next label or a blank line */
  let remarks: string[] | null = null
  for (const raw of lines) {
    const l = raw.trim()
    const m = l.match(LABELLED)
    const f = m ? labelField(m[1]!) : null
    if (m) { if (remarks) { put(fill, 'notes', remarks.join(' '), ctx); remarks = null } }   // any label ends the remarks before it
    if (f) { if (f === 'notes') remarks = [m![2]!]; else put(fill, f, m![2]!, ctx); continue }
    if (remarks) { if (l) remarks.push(l); else { put(fill, 'notes', remarks.join(' '), ctx); remarks = null } }
  }
  if (remarks) put(fill, 'notes', remarks.join(' '), ctx)
  /* running text — only the five a client's enquiry is read for, and only what appears once, plainly */
  const text = lines.join('\n')
  if (!fill.email) { const e = emailsIn(text, ctx); if (e.length === 1) fill.email = e[0] }
  if (!fill.phone) {
    const p = phonesIn(text, ctx)
    /* several: the one a line names as a phone, then the one mobile among landlines (a studio's or a portal's office line in a footer) */
    const named = p.length > 1 ? p.filter((d) => lines.some((l) => /\b(?:mobile|phone|hp|h\/p|contact|whatsapp|call|tel)\b/i.test(l) && phonesIn(l, ctx).includes(d))) : p
    const mobiles = named.filter((d) => /^[89]/.test(d))
    if (named.length === 1) fill.phone = named[0]
    else if (mobiles.length === 1) fill.phone = mobiles[0]
  }
  if (!fill.name) {
    const beside = fill.email ? lines.map((l) => l.replace(/^\s*from\s*[:：]\s*/i, '').match(new RegExp(`^\\s*"?([^"<>@\\n]{2,40}?)"?\\s*<\\s*${fill.email!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*>`, 'i'))?.[1]?.trim()).find((n) => n && looksLikeName(n)) : undefined
    const said = text.match(/\b[Mm]y name is ([A-Z][A-Za-z'’-]+(?: [A-Z][A-Za-z'’-]+){0,3})/)?.[1]
    let signed: string | undefined
    for (let i = 0; i < lines.length - 1 && !signed; i++) if (SIGN_OFF.test(lines[i]!.trim())) { const next = lines.slice(i + 1).find((x) => x.trim()); if (next && looksLikeName(next)) signed = next.trim() }
    const name = beside ?? (said && looksLikeName(said) ? said : undefined) ?? signed
    if (name) fill.name = name
  }
  if (!fill.propertyAddress) {
    const found = [...new Set(lines.map((l) => l.trim()).filter((l) => l.length <= 120 && ADDRESS_HINT.test(l) && !COMPANY_LINE.test(l) && !HAS_EMAIL.test(l) && !SENTENCE.test(l)).map((l) => l.replace(/^(?:address|at)\s*[:：-]?\s*/i, '')))]
    if (found.length === 1) fill.propertyAddress = found[0]!.slice(0, 200)
  }
  if (!fill.propertyType) {
    const kinds = new Set<string>()
    for (const l of lines) for (const m of l.matchAll(HOME_PHRASE)) { const t = readPropertyType(m[0]); if (t) kinds.add(t) }
    if (kinds.size === 1) fill.propertyType = [...kinds][0]
  }
  return Object.keys(fill).length ? { ok: true, fill } : { ok: false, reason: 'nothing' }
}

/** A sheet: a header row the import knows (one lead under it; several belong to Import leads), else "label | value" rows, else its words. */
export function readLeadGrid(grid: readonly (readonly string[])[], ctx: FillContext): DocumentRead {
  const rows = grid.map((r) => r.map((c) => String(c ?? '').trim())).filter((r) => r.some(Boolean))
  if (!rows.length) return { ok: false, reason: 'nothing' }
  /* "Name | Ong Bee Lian", "Contact number | 8123 4567" — a form laid out down the sheet, every row a label and its value */
  const pairs = rows.filter((r) => r.filter(Boolean).length === 2 && labelField(r[0]!)).length
  const form = rows.length >= 2 && pairs >= Math.max(2, rows.length - 1)
  const fields = rows[0]!.map((h) => labelField(h))
  if (!form && (fields.includes('name') || fields.includes('phone'))) {
    const body = rows.slice(1)
    if (body.length > 1) return { ok: false, reason: 'many', count: body.length }
    if (body.length === 1) {
      const fill: LeadFill = {}
      fields.forEach((f, i) => { if (f) put(fill, f, body[0]![i] ?? '', ctx) })
      return Object.keys(fill).length ? { ok: true, fill } : { ok: false, reason: 'nothing' }
    }
  }
  return readLeadText(rows.map((r) => (r.length >= 2 && labelField(r[0]!) ? `${r[0]}: ${r.slice(1).filter(Boolean).join(' ')}` : r.filter(Boolean).join('  '))), ctx)
}

/** The picked file, read by its kind. */
export async function readLeadDocument(file: File, ctx: FillContext): Promise<DocumentRead> {
  try {
    const name = file.name.toLowerCase()
    if (/\.(png|jpe?g|webp|gif|heic|heif)$/.test(name) || file.type.startsWith('image/')) return { ok: false, reason: 'scan' }
    if (name.endsWith('.csv')) { const { parseCsv } = await import('@/lib/csv'); return readLeadGrid(parseCsv(await file.text()), ctx) }
    if (name.endsWith('.xlsx')) { const { parseXlsx } = await import('@/lib/xlsx'); return readLeadGrid(await parseXlsx(await file.arrayBuffer()), ctx) }
    if (name.endsWith('.txt') || file.type === 'text/plain') return readLeadText((await file.text()).split(/\r?\n/), ctx)
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      const { pdfLines } = await import('@/lib/pdf-text')
      const lines = await pdfLines(await file.arrayBuffer())
      if (!lines.some((l) => /[a-z]{3}/i.test(l))) return { ok: false, reason: 'scan' }   // pictures of pages, no words
      return readLeadText(lines, ctx)
    }
    return { ok: false, reason: 'unreadable' }   // an old .xls, a Word file…
  } catch {
    return { ok: false, reason: 'unreadable' }   // a PDF that won't open, a sheet that isn't one
  }
}

/** "name, phone number and email". */
export const fieldList = (fields: readonly FillField[]): string => {
  const w = fields.map((f) => FILL_WORD[f])
  return w.length <= 1 ? w.join('') : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`
}
/** Why nothing filled, in a sentence — under the drop zone, the dialog kept open. */
export function unreadWords(r: Extract<DocumentRead, { ok: false }>, file: string): string {
  if (r.reason === 'scan') return `${file} has no words to read — a photo or a scanned page. Type the details in, or pick a PDF, a spreadsheet or a text file.`
  if (r.reason === 'many') return `${file} holds ${r.count ?? 'several'} leads — bring them in with Import leads.`
  if (r.reason === 'unreadable') return `Couldn’t read ${file} — pick a PDF, a spreadsheet (XLSX · CSV) or a text file.`
  return `Nothing in ${file} looks like a client’s details. Type them in, or try another file.`
}
