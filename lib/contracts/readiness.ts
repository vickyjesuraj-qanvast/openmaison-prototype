import { isBlankDoc, signFieldsIn, TOKEN_LABEL, tokensIn, type TokenKey, type TokenValues } from './tokens'

/**
 * (REG-634, contracts parity Q-22) What Send checks before a contract goes — the quote's readiness pattern (REG-626). Blocking: a composed
 * document that is empty or has nowhere for the client to sign. Worth saying: the studio signature box would print blank, no quote is
 * named, Smart Text records would print their labels in brackets. Client-safe; the server repeats the blocking ones.
 */
export type ContractIssue = { label: string; blocking: boolean; /** what the snackbar offers: eSignatures · pick a quote · open the named quote */ fix?: 'esign' | 'quote' | 'open-quote' }
const QUOTE_KEYS: TokenKey[] = ['quote.number', 'quote.total', 'quote.validUntil', 'lead.projectRef']

/** (UX audit C2) The quote a contract names, as its send checks read it. */
export type QuoteForSend = { number: string; status: string }
/**
 * (UX audit 2026-09-30, C2 — extends REG-624 · REG-634) A contract gets the quote it names signed (REG-626), so that quote must be one the
 * studio stands behind: where Settings requires quote approval, a Draft — or a quote still waiting for approval — keeps the contract from
 * going out; where it doesn't, a Draft is worth saying before it goes. Client-safe; the server repeats the blocking one.
 */
export function quoteIssue(q: QuoteForSend | null | undefined, approvalRequired: boolean): ContractIssue | null {
  if (!q) return null
  if (q.status === 'Draft') return { label: approvalRequired ? `${q.number} is still a Draft — approve and send it first` : `${q.number} is still a Draft — send it first`, blocking: approvalRequired, fix: 'open-quote' }
  if (q.status === 'Sent for Approval' && approvalRequired) return { label: `${q.number} is waiting for approval — approve it first`, blocking: true, fix: 'open-quote' }
  return null
}
/** The words a list says when the named quote keeps a contract from going out (its status menu, Copy Link, Send together), else null. */
export const quoteSendBlock = (q: QuoteForSend | null | undefined, approvalRequired: boolean): string | null => { const i = quoteIssue(q, approvalRequired); return i?.blocking ? i.label : null }

export function contractReadiness(o: { source: string; body: string | null; values: TokenValues; hasStudioSignature: boolean; hasQuote: boolean; /** (C2) the named quote and Settings' approval */ quote?: QuoteForSend | null; approvalRequired?: boolean }): ContractIssue[] {
  const named = quoteIssue(o.quote, o.approvalRequired ?? true)
  if (o.source === 'uploaded') return named ? [named] : []
  const out: ContractIssue[] = []
  const body = o.body ?? ''
  if (isBlankDoc(body)) return [{ label: 'The document is empty', blocking: true }]
  const fields = signFieldsIn(body)
  if (!fields.includes('client-signature')) out.push({ label: 'There’s no Client signature field — insert one from eSignatures', blocking: true, fix: 'esign' })
  if (named) out.push(named)
  if ((fields.includes('studio-signature') || fields.includes('studio-initial')) && !o.hasStudioSignature) out.push({ label: 'Your signature isn’t set up, so the Studio signature box prints blank — set it up in any quote’s Signature section', blocking: false })
  const used = tokensIn(body)
  if (!o.hasQuote && used.some((k) => QUOTE_KEYS.includes(k))) out.push({ label: 'It names no quote, so its quote fields print empty', blocking: false, fix: 'quote' })
  const empty = used.filter((k) => !(o.hasQuote ? [] : QUOTE_KEYS).includes(k) && !o.values[k]?.trim())
  if (empty.length) out.push({ label: `${empty.length === 1 ? 'An inserted field is' : `${empty.length} inserted fields are`} empty and print in brackets: ${empty.map((k) => TOKEN_LABEL[k]).join(', ')}`, blocking: false })
  return out
}
/** (sweep S2 #2 · #3) What a refused send says, wherever it is asked for — Send, Copy Link, a list's status menu. */
export const SEND_BLOCK_WORDS: Record<string, string> = {
  empty: 'Add some content before it goes out',
  'no-client-field': 'Add a place for the client to sign before it goes out — eSignatures in the editor',
}
/** (UX audit C4) A document that can't go out, named — Send together's greyed row says which one holds it back. */
export function docBlockLine(title: string, why: string): string {
  if (why === 'empty') return `${title} is empty`
  if (why === 'no-client-field') return `${title} has nowhere to sign`
  return why   // a quote's rule names its quote already
}
/** (UX audit C4) Why Send together is out of reach, else null: two documents must be ready; one that isn't is named. */
export function bundleBlockLine(docs: { title: string; why: string | null }[]): string | null {
  if (docs.filter((d) => !d.why).length >= 2) return null
  const held = [...new Set(docs.filter((d) => d.why).map((d) => docBlockLine(d.title, d.why!)))]   // two documents naming one Draft quote say it once
  return held.length && docs.length >= 2 ? held.slice(0, 2).join(' · ') : 'needs two documents ready to go'
}
/** The server's side: a composed contract goes out only with something to sign. Returns the reason, else null. */
export function sendBlock(c: { source: string; body: string | null }): string | null {
  if (c.source === 'uploaded') return null
  if (isBlankDoc(c.body)) return 'empty'
  if (!signFieldsIn(c.body ?? '').includes('client-signature')) return 'no-client-field'
  return null
}
