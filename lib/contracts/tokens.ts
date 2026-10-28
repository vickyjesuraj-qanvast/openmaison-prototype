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
  { key: 'studio-signature', label: 'Studio signature', help: 'Your signature — from Your profile' },   // (the calm UI build 2026-10-27, 4-19 · W-452) it lives on Your profile (S01)
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
/**
 * (The calm UI build 2026-10-27, the UI audit's 4-45) For the eye only: a resolved field hugs the punctuation after it — "S$77,900.12," and
 * "(UEN 201912345K)", never "S$77,900.12 ," — wherever the space came from (the chip's own &nbsp;, a raw no-break space a round trip left,
 * or one sitting inside a closing <strong>). A space before , . ; : ) ] is dropped. Never used for the fingerprint or a kept copy
 * (`resolveTokens` feeds those, unchanged): the paper, the preview, the signing page and the reading cards draw through it.
 */
export function tightenPunctuation(html: string): string {
  return html.replace(/(<\/span>(?:<\/(?:strong|b|em|i|u)>)*)(?:\s|&nbsp;|\u00a0)+((?:<\/(?:strong|b|em|i|u)>)*)(?=[,.;:)\]])/g, '$1$2')
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
/* ── Contracts on the move (2026-10-22, P-04 · B-04 · B-05 · B-12 · C-17): on touch a signature field is placed by choosing WHERE — as its own
   block after a clause — never at a thumb's caret. Pure: the string alone, no DOM (the editor's `topNodes`, read from the HTML). ── */

/** The paper's top-level blocks as `[start, end)` offsets into the HTML: each element at depth 0 (a heading, a paragraph, a list with its
    items, a picture) and any loose text between them; whitespace alone is not a block. Offsets, so a splice keeps every byte around them. */
export function topBlocks(html: string): { start: number; end: number }[] {
  const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'])
  const tag = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)(?:"[^"]*"|'[^']*'|[^'">])*>/y
  const out: { start: number; end: number }[] = []
  let depth = 0, textStart = -1, blockStart = -1, i = 0
  const endText = (at: number) => { if (textStart >= 0 && html.slice(textStart, at).trim()) out.push({ start: textStart, end: at }); textStart = -1 }
  while (i < html.length) {
    if (html.charCodeAt(i) !== 60) { if (depth === 0 && textStart < 0) textStart = i; i += 1; continue }   // not "<": text
    tag.lastIndex = i
    const m = tag.exec(html)
    if (!m) { if (depth === 0 && textStart < 0) textStart = i; i += 1; continue }   // a loose "<" is text too
    const end = i + m[0].length
    if (m[0].startsWith('<!--')) { i = end; continue }   // a comment is nobody's block
    const closing = m[1] === '/', name = m[2]!.toLowerCase()
    if (depth === 0) endText(i)
    if (closing) {
      if (depth > 0) depth -= 1
      if (depth === 0 && blockStart >= 0) { out.push({ start: blockStart, end }); blockStart = -1 }
    } else if (VOID.has(name) || m[0].endsWith('/>')) {
      if (depth === 0) out.push({ start: i, end })
    } else {
      if (depth === 0) blockStart = i
      depth += 1
    }
    i = end
  }
  endText(html.length)
  if (blockStart >= 0) out.push({ start: blockStart, end: html.length })   // an unclosed block runs to the end
  return out
}
/** Each heading (in `outlineOf`'s order — every h1 · h2 · h3, as the editor's `querySelectorAll` counts them) with the top-level block it sits in. */
function headingBlocks(html: string, blocks: { start: number; end: number }[]): { block: number; level: number }[] {
  const out: { block: number; level: number }[] = []
  blocks.forEach((b, bi) => { for (const m of html.slice(b.start, b.end).matchAll(/<h([123])\b/gi)) out.push({ block: bi, level: Number(m[1]) }) })
  return out
}

/** Where a field can go: a heading's index (the Outline's) = after that clause, or the end of the document. */
export type SignPlace = number | 'end'
export type SignPlaceRow = { place: SignPlace; label: string; /** picked for you: the Signatures clause, else the end */ suggested: boolean }
const SIGNATURES = /signature/i
/** The places, from the Outline: "After {heading}" for each clause, the last Signatures heading as "Under {heading}" (picked for you), and
    "At the end" (picked when there is no Signatures heading). */
export function signPlaces(html: string): SignPlaceRow[] {
  const items = outlineOf(html)
  const sig = [...items].reverse().find((h) => SIGNATURES.test(h.text)) ?? null
  const rows: SignPlaceRow[] = items.map((h) => ({ place: h.index, label: `${h === sig ? 'Under' : 'After'} ${h.text}`, suggested: h === sig }))
  rows.push({ place: 'end', label: 'At the end', suggested: !sig })
  return rows
}
/** A place as a sentence says it: "under Signatures" · "after 2. Contract sum" · "at the end". */
export const placeWords = (row: SignPlaceRow) => row.label.charAt(0).toLowerCase() + row.label.slice(1)

/** The field as its own block after that clause — the heading and everything up to the next heading of its level or above — never inside a
    word; `'end'` (or a heading that is gone) appends it. Returns the HTML and the new block's index among the top-level blocks. */
export function insertSignFieldAfter(html: string, after: SignPlace, key: SignKey): { html: string; index: number } {
  const blocks = topBlocks(html)
  const block = `<p>${signField(key)}</p>`
  const afterBlock = (bi: number) => { const off = bi < 0 ? 0 : blocks[bi]!.end; return { html: html.slice(0, off) + block + html.slice(off), index: bi + 1 } }
  if (after === 'end') return afterBlock(blocks.length - 1)
  const heads = headingBlocks(html, blocks)
  const h = heads[after]
  if (!h) return afterBlock(blocks.length - 1)
  let last = h.block
  for (let bi = h.block + 1; bi < blocks.length; bi++) {
    const first = heads.find((x) => x.block === bi)   // the block's first heading, in document order
    if (first && first.level <= h.level) break
    last = bi
  }
  return afterBlock(last)
}
const SHORT: Record<SignKey, string> = { 'studio-signature': 'Studio', 'client-signature': 'Client', 'studio-initial': 'Studio initial', 'client-initial': 'Client initial' }
/** The clause a placed field sits under — "under Signatures" — or null when it stands before any heading or is not placed. */
export function fieldPlaceWords(html: string, key: SignKey): string | null {
  const at = html.indexOf(`data-sign="${key}"`)
  if (at < 0) return null
  const blocks = topBlocks(html)
  const bi = blocks.findIndex((b) => b.start <= at && at < b.end)
  if (bi < 0) return null
  const heads = headingBlocks(html, blocks)
  const items = outlineOf(html)
  let k = -1
  heads.forEach((h, i) => { if (h.block <= bi) k = i })
  const item = k >= 0 ? items.find((it) => it.index === k) : null
  return item ? `under ${item.text}` : null
}
/** The Signature fields fold's one line: which are placed, and where when they share a clause — "Studio · Client — placed under Signatures". */
export function signFieldsSummary(html: string): string {
  const keys = signFieldsIn(html)
  if (!keys.length) return 'Not placed yet — the client has nowhere to sign'
  const placed = SIGN_FIELDS.filter((f) => keys.includes(f.key)).map((f) => SHORT[f.key]).join(' · ')
  const places = new Set(keys.map((k) => fieldPlaceWords(html, k)))
  const where = places.size === 1 ? [...places][0] : null
  const line = `${placed} — placed${where ? ` ${where}` : ''}`
  return keys.includes('client-signature') ? line : `${line} · no Client signature yet`
}

/** Blank = no text and no chips / fields / lists / images. */
export const isBlankDoc = (h: string | null | undefined) => !h || (!/<(ul|ol|li|img)|om-token|om-sign/i.test(h) && h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim() === '')
/** A card's second line: the body's first words, chips as their labels, tags stripped. */
export function excerptOf(html: string, max = 140): string {
  const t = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}
