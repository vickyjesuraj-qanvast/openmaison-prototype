import { clausesOf } from '@/lib/contracts/clauses'
import { DEFAULT_ACCEPT_LABEL } from '@/lib/contracts/policy'
import { isBlankDoc, outlineOf, signFieldsIn, tokensIn, TOKEN_LABEL, SIGN_LABEL, type SignKey, type TokenKey } from '@/lib/contracts/tokens'

/*
 * (Contracts on the move, P-10 · C-01 · C-02 · C-04 · C-12 · C-18 — his "please check and built accordingly" 2026-10-22) A contract template's
 * words on the move, pure: what its gallery row says ("13 headings · used by 5 · edited 14 Aug ’26", "Default · At handover"), what its
 * reading screen's status row says ("Default · used by 5 · fills 10 fields · the client signs ✓"), and its clauses as rows — each heading
 * with its first words at 14 and the fields it fills. Every word comes from the record; a field reads as "[Client name]", the way a
 * template's paper prints an empty value (lib/contracts/tokens.ts `resolveTokens`).
 */

const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '’')

/** The clause's words as one plain line: a field as "[Client name]", a signature field as "[Client signature]", the tags gone. */
export function plainWords(html: string, max = 160): string {
  const t = decode(html
    .replace(/<span class="om-token" data-token="([a-z.A-Z]+)"[^>]*>[^<]*<\/span>(&nbsp;)?/g, (_m, k: string) => ` [${TOKEN_LABEL[k as TokenKey] ?? k}] `)
    .replace(/<span class="om-sign" data-sign="([a-z-]+)"[^>]*>[^<]*<\/span>/g, (_m, k: string) => ` [${SIGN_LABEL[k as SignKey] ?? k}] `)
    .replace(/<\/(p|li|h[1-6]|div)>/gi, ' ')
    .replace(/<[^>]*>/g, ''))
    .replace(/\s+([,.;:)])/g, '$1').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

export type ClauseRow = {
  /** The heading's index among every heading — DocEditor's `scrollToHeading`; null = the words before the first heading (or a document with none). */
  index: number | null
  title: string
  words: string
  fields: number
}

/** The reading screen's rows: one per heading (the Outline's own), and the opening words when a document starts before its first heading. */
export function clauseRows(body: string): ClauseRow[] {
  const { lead, clauses } = clausesOf(body)
  const rows: ClauseRow[] = []
  if (lead || !clauses.length) rows.push({ index: null, title: clauses.length ? 'Opening words' : 'The document', words: isBlankDoc(lead) ? 'Nothing written yet' : plainWords(lead), fields: tokensIn(lead).length })
  for (const c of clauses) rows.push({ index: c.index, title: c.title, words: plainWords(c.html) || 'No words under this heading yet', fields: tokensIn(c.html).length })
  return rows
}

/** "1 field" · "3 fields". */
export const fieldsWord = (n: number) => `${n} ${n === 1 ? 'field' : 'fields'}`

type TemplateFacts = { isDefault: boolean; useAtHandover: boolean; kind: string; usedBy: number; body: string }

/** The template's standing, as words (C-04: never the 10px uppercase chip on the move): "Default · At handover", or null. */
export function stateWords(t: Pick<TemplateFacts, 'isDefault' | 'useAtHandover'>): string | null {
  const w = [t.isDefault ? 'Default' : null, t.useAtHandover ? 'At handover' : null].filter(Boolean)
  return w.length ? w.join(' · ') : null
}

/** The gallery row's facts: "13 headings · used by 5 · edited 14 Aug ’26"; a standard PDF: "PDF · 1 KB · used by 2 · edited …". */
export function galleryFacts(t: Pick<TemplateFacts, 'kind' | 'usedBy' | 'body'> & { size?: string | null }, edited: string): string {
  const used = t.usedBy ? `used by ${t.usedBy}` : 'not used yet'
  if (t.kind === 'pdf') return ['PDF', t.size ?? null, 'added to signings', used, `edited ${edited}`].filter(Boolean).join(' · ')
  const n = outlineOf(t.body).length
  return [`${n} ${n === 1 ? 'heading' : 'headings'}`, used, `edited ${edited}`].join(' · ')
}

/** Whether a contract started from it can go out: a place for the client to sign (Send's own rule). */
export const clientSigns = (body: string) => signFieldsIn(body).includes('client-signature')

/** The reading screen's status row: "Default · used by 5 · fills 10 fields · client signs ✓". `warn` = nowhere for the client to sign. */
export function statusWords(t: TemplateFacts): { text: string; warn: boolean } {
  const used = t.usedBy ? `used by ${t.usedBy}` : 'not used yet'
  const lead = [t.isDefault ? 'Default' : null, t.useAtHandover ? 'At handover' : null]
  if (t.kind === 'pdf') return { text: cap([...lead, 'standard PDF', 'added to signings', used].filter(Boolean).join(' · ')), warn: false }
  const n = tokensIn(t.body).length
  const blank = isBlankDoc(t.body)
  const signs = clientSigns(t.body)
  const words = [...lead, used, n ? `fills ${fieldsWord(n)}` : 'no fields yet', blank ? 'nothing written yet' : signs ? 'client signs ✓' : null].filter(Boolean).join(' · ')
  return { text: cap(words), warn: !blank && !signs }
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Before the client signs, in one line: "Read to the end · Tick to accept · “I have read and agree…”", or "No rules before signing". */
export function gatesWords(g: { requiresScroll: boolean; requiresAccept: boolean; acceptLabel: string | null }, pdf: boolean): string {
  const w = [g.requiresScroll && !pdf ? 'Read to the end' : null, g.requiresAccept ? 'Tick to accept' : null, g.requiresAccept ? `“${(g.acceptLabel ?? '').trim() || DEFAULT_ACCEPT_LABEL}”` : null].filter(Boolean)
  return w.length ? w.join(' · ') : 'No rules before signing'
}
