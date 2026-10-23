/**
 * (Contracts on the move, P-01 — 2026-10-22) A contract as reading cards: the document split at its headings, each clause a card headed by
 * its heading, the words under it — the Contract screen's document on a phone and a touch tablet. Pure, client-safe; works on the editor's
 * HTML and on the resolved, rendered paper alike (the headings are the same `<h1>…<h3>` either way; `outlineOf`'s numbering is kept).
 */
import { signFieldsIn, type SignKey } from './tokens'

export type Clause = {
  /** The heading's index among every heading (the Outline's and `scrollToHeading`'s number). */
  index: number
  level: 1 | 2 | 3
  /** The heading's words, tags stripped. */
  title: string
  /** Everything after the heading, up to the next one. */
  html: string
  /** The signature fields placed in this clause, in order. */
  signs: SignKey[]
}
export type ClauseSplit = {
  /** Words before the first heading (rare — a document that starts without a title); empty when none. */
  lead: string
  clauses: Clause[]
}

const textOf = (h: string) => h.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
const blank = (h: string) => !/<(ul|ol|li|img)|om-token|om-sign|data-sign=/i.test(h) && textOf(h) === ''

export function clausesOf(html: string): ClauseSplit {
  const heads = [...html.matchAll(/<h([123])[^>]*>([\s\S]*?)<\/h\1>/gi)]
  if (!heads.length) return { lead: blank(html) ? '' : html, clauses: [] }
  const lead = html.slice(0, heads[0]!.index ?? 0)
  const out: Clause[] = []
  heads.forEach((m, i) => {
    const start = (m.index ?? 0) + m[0].length
    const next = heads[i + 1]
    const body = html.slice(start, next ? next.index : undefined)
    const title = textOf(m[2]!)
    if (!title) {   // a heading with no words is no card: its content rides with the clause before it (outlineOf skips it the same way)
      const prev = out[out.length - 1]
      if (prev) { prev.html += body; prev.signs = signFieldsIn(prev.html) }
      return
    }
    out.push({ index: i, level: Number(m[1]) as 1 | 2 | 3, title, html: body, signs: signFieldsIn(body) })
  })
  return { lead: blank(lead) ? '' : lead, clauses: out }
}

/** The one line a Signatures card says: "Studio · Client — placed". */
export function signsLine(signs: SignKey[]): string | null {
  if (!signs.length) return null
  const words = signs.map((k) => (k === 'studio-signature' ? 'Studio' : k === 'client-signature' ? 'Client' : k === 'studio-initial' ? 'Studio initials' : 'Client initials'))
  return `${[...new Set(words)].join(' · ')} — placed`
}
