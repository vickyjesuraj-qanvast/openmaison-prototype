import { isBlankDoc, signFieldsIn, TOKEN_LABEL, tokensIn, type TokenKey, type TokenValues } from './tokens'

/**
 * (REG-634, contracts parity Q-22) What Send checks before a contract goes — the quote's readiness pattern (REG-626). Blocking: a composed
 * document that is empty or has nowhere for the client to sign. Worth saying: the studio signature box would print blank, no quote is
 * named, Smart Text records would print their labels in brackets. Client-safe; the server repeats the blocking ones.
 */
export type ContractIssue = { label: string; blocking: boolean; fix?: 'esign' | 'quote' }
const QUOTE_KEYS: TokenKey[] = ['quote.number', 'quote.total', 'quote.validUntil', 'lead.projectRef']
export function contractReadiness(o: { source: string; body: string | null; values: TokenValues; hasStudioSignature: boolean; hasQuote: boolean }): ContractIssue[] {
  if (o.source === 'uploaded') return []
  const out: ContractIssue[] = []
  const body = o.body ?? ''
  if (isBlankDoc(body)) return [{ label: 'The document is empty', blocking: true }]
  const fields = signFieldsIn(body)
  if (!fields.includes('client-signature')) out.push({ label: 'There’s no Client signature field — insert one from eSignatures', blocking: true, fix: 'esign' })
  if ((fields.includes('studio-signature') || fields.includes('studio-initial')) && !o.hasStudioSignature) out.push({ label: 'Your signature isn’t set up, so the Studio signature box prints blank — set it up in any quote’s Signature section', blocking: false })
  const used = tokensIn(body)
  if (!o.hasQuote && used.some((k) => QUOTE_KEYS.includes(k))) out.push({ label: 'It names no quote, so its quote records print empty', blocking: false, fix: 'quote' })
  const empty = used.filter((k) => !(o.hasQuote ? [] : QUOTE_KEYS).includes(k) && !o.values[k]?.trim())
  if (empty.length) out.push({ label: `${empty.length === 1 ? 'A Smart Text record is' : `${empty.length} Smart Text records are`} empty and print in brackets: ${empty.map((k) => TOKEN_LABEL[k]).join(', ')}`, blocking: false })
  return out
}
/** (sweep S2 #2 · #3) What a refused send says, wherever it is asked for — Send, Copy Link, a list's status menu. */
export const SEND_BLOCK_WORDS: Record<string, string> = {
  empty: 'Add some content before it goes out',
  'no-client-field': 'Add a place for the client to sign before it goes out — eSignatures in the editor',
}
/** The server's side: a composed contract goes out only with something to sign. Returns the reason, else null. */
export function sendBlock(c: { source: string; body: string | null }): string | null {
  if (c.source === 'uploaded') return null
  if (isBlankDoc(c.body)) return 'empty'
  if (!signFieldsIn(c.body ?? '').includes('client-signature')) return 'no-client-field'
  return null
}
