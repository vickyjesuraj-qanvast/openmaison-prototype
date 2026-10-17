/**
 * Contract documents (REG-534): the editor's HTML carries two kinds of inert pieces the studio drops in —
 *   · token chips  `<span class="om-token" data-token="client.name" contenteditable="false">Client name</span>`  (Smart Text ▾)
 *   · sign fields  `<span class="om-sign" data-sign="client-signature" contenteditable="false">Client signature</span>`  (eSignatures)
 * Preview, the signing page and the PDF resolve the chips against the records; the fields become signature boxes.
 * Client-safe: no DB here.
 */
export type TokenKey =
  | 'client.name' | 'client.phone' | 'client.email' | 'client.company' | 'client.uen'
  | 'lead.address' | 'lead.propertyType' | 'lead.projectRef'
  | 'studio.name' | 'studio.address' | 'studio.phone' | 'studio.email' | 'studio.uen' | 'studio.gst'
  | 'quote.number' | 'quote.total' | 'quote.validUntil'
  | 'quote.deposit'   // (S44R — UAT row 358, call C7) the quote's first payment — a letter of appointment's deposit
  | 'project.number' | 'project.completedOn' | 'project.defectsPeriod' | 'project.defectsUntil'   // (S44R — UAT row 359, call C9) a completion letter's
  | 'date.today' | 'date.contract'
export type TokenGroup = { key: string; label: string; tokens: { key: TokenKey; label: string }[] }
/** Smart Text ▾ (the reference groups Project · Client · Company · Date · Docs): ours name the records the prototype has. */
export const TOKEN_GROUPS: TokenGroup[] = [
  { key: 'client', label: 'Client', tokens: [{ key: 'client.name', label: 'Client name' }, { key: 'client.phone', label: 'Client phone' }, { key: 'client.email', label: 'Client email' }, { key: 'client.company', label: 'Company' }, { key: 'client.uen', label: 'Company UEN' }] },   /* (pending modules S05 — testers' L-3) a commercial client's */
  { key: 'lead', label: 'Project', tokens: [{ key: 'lead.address', label: 'Property address' }, { key: 'lead.propertyType', label: 'Property type' }, { key: 'lead.projectRef', label: 'Project ref' }] },
  { key: 'studio', label: 'Studio', tokens: [{ key: 'studio.name', label: 'Studio name' }, { key: 'studio.address', label: 'Studio address' }, { key: 'studio.phone', label: 'Studio phone' }, { key: 'studio.email', label: 'Studio email' }, { key: 'studio.uen', label: 'UEN' }, { key: 'studio.gst', label: 'GST reg. no.' }] },   /* (REG-632, parity Q-11) the issuer's GST number */
  { key: 'quote', label: 'Quote', tokens: [{ key: 'quote.number', label: 'Quote number' }, { key: 'quote.total', label: 'Quote total' }, { key: 'quote.validUntil', label: 'Quote valid until' }, { key: 'quote.deposit', label: 'Deposit' }] },   /* (S44R, C7) */
  /* (S44R — UAT row 359, call C9) the handover's: filled from the project when the Hand over sheet sends the completion letter (invented copy) */
  { key: 'handover', label: 'Handover', tokens: [{ key: 'project.number', label: 'Project number' }, { key: 'project.completedOn', label: 'Completion date' }, { key: 'project.defectsPeriod', label: 'Defects period' }, { key: 'project.defectsUntil', label: 'Defects period ends' }] },
  { key: 'date', label: 'Date', tokens: [{ key: 'date.today', label: 'Today’s date' }, { key: 'date.contract', label: 'Contract date' }] },
]
export const TOKEN_LABEL: Record<TokenKey, string> = Object.fromEntries(TOKEN_GROUPS.flatMap((g) => g.tokens.map((t) => [t.key, t.label]))) as Record<TokenKey, string>
export type TokenValues = Partial<Record<TokenKey, string>>

export type SignKey = 'studio-signature' | 'client-signature' | 'studio-initial' | 'client-initial'
/** eSignatures › Fillable fields, in the reference's order. */
export const SIGN_FIELDS: { key: SignKey; label: string; help: string }[] = [
  { key: 'studio-signature', label: 'Studio signature', help: 'Your saved signature, from the quote editor' },
  { key: 'client-signature', label: 'Client signature', help: 'Where the client signs online' },
  { key: 'studio-initial', label: 'Studio initial', help: 'Your initials on a page' },
  { key: 'client-initial', label: 'Client initial', help: 'The client’s initials on a page' },
]
export const SIGN_LABEL: Record<SignKey, string> = Object.fromEntries(SIGN_FIELDS.map((f) => [f.key, f.label])) as Record<SignKey, string>

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** The chip as it sits in the editor's HTML (one trailing space so typing continues after it). */
export const tokenChip = (key: TokenKey) => `<span class="om-token" data-token="${key}" contenteditable="false">${esc(TOKEN_LABEL[key])}</span>&nbsp;`
export const signField = (key: SignKey) => `<span class="om-sign" data-sign="${key}" contenteditable="false">${esc(SIGN_LABEL[key])}</span>`

/** Every chip becomes its record (escaped); an unknown or empty value keeps the label in brackets so a gap is visible. */
export function resolveTokens(html: string, v: TokenValues): string {
  return html.replace(/<span class="om-token" data-token="([a-z.A-Z]+)"[^>]*>[^<]*<\/span>(&nbsp;)?/g, (_m, key: string, sp: string | undefined) => {
    const value = v[key as TokenKey]
    const label = TOKEN_LABEL[key as TokenKey] ?? key
    return `<span class="om-token-value" data-token="${key}">${esc(value && value.trim() ? value : `[${label}]`)}</span>${sp ? ' ' : ''}`
  }).replace(/<\/span> (?=[,.;:)\]])/g, '</span>')   // the chip's trailing space is dropped before punctuation ("S$64,062.57, inclusive")
}
/** The keys a document uses, in order of appearance. */
export function tokensIn(html: string): TokenKey[] {
  const out: TokenKey[] = []
  for (const m of html.matchAll(/data-token="([a-z.A-Z]+)"/g)) { const k = m[1] as TokenKey; if (TOKEN_LABEL[k] && !out.includes(k)) out.push(k) }
  return out
}
export function signFieldsIn(html: string): SignKey[] {
  const out: SignKey[] = []
  for (const m of html.matchAll(/data-sign="([a-z-]+)"/g)) { const k = m[1] as SignKey; if (SIGN_LABEL[k] && !out.includes(k)) out.push(k) }
  return out
}

/** The Outline pane: the document's headings in order — h1 · h2 · h3 with their depth. */
export type OutlineItem = { index: number; level: 1 | 2 | 3; text: string }
export function outlineOf(html: string): OutlineItem[] {
  const out: OutlineItem[] = []
  let i = 0
  for (const m of html.matchAll(/<h([123])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = m[2]!.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
    if (text) out.push({ index: i, level: Number(m[1]) as 1 | 2 | 3, text })
    i += 1
  }
  return out
}
/** Blank = no text and no chips / fields / lists / images. */
export const isBlankDoc = (h: string | null | undefined) => !h || (!/<(ul|ol|li|img)|om-token|om-sign/i.test(h) && h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim() === '')
/** A card's second line: the body's first words, chips as their labels, tags stripped. */
export function excerptOf(html: string, max = 140): string {
  const t = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}
