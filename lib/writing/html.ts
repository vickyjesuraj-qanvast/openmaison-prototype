/**
 * (pending modules S29 — card api:ai-writing-help-quotes) The writing help's view of a text: the rich editors' HTML (a quote's Terms and
 * Notes, a line's description, a contract's document, a T&Cs template) or a plain message, read as parts — tags, the words between them,
 * and the pieces no rule may touch (a contract's Smart Text chips and signature fields, a picture). Inside the words, links, emails,
 * a template's bracketed fields ("[Client Full Name]") and a quote template's braced ones ("{client_name}") are masked while the rules
 * run, so a rule never spells out, capitalises or puts a full stop inside one. Pure and client-safe — no DOM.
 */

export type Part = { k: 'tag' | 'atom' | 'text'; s: string }

/** A contract's chip or signature field, or a picture — kept whole: never read, changed or split. */
const ATOM = /<span\b[^>]*\bclass="[^"]*\bom-(?:token|sign)\b[^"]*"[^>]*>[\s\S]*?<\/span>|<img\b[^>]*>/gi

export function partsOf(html: string): Part[] {
  const out: Part[] = []
  const push = (s: string) => { for (const p of s.split(/(<[^>]+>)/)) if (p) out.push({ k: p.startsWith('<') ? 'tag' : 'text', s: p }) }
  let last = 0
  for (const m of html.matchAll(ATOM)) { push(html.slice(last, m.index)); out.push({ k: 'atom', s: m[0] }); last = m.index! + m[0].length }
  push(html.slice(last))
  return out
}
export const joinParts = (parts: readonly Part[]) => parts.map((p) => p.s).join('')

/** The words of a text node as a rule reads them (entities as characters, a no-break space kept as one) — and back. */
export const decodeText = (s: string) => s.replace(/&nbsp;/g, '\u00a0').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&')
export const encodeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;')

/** Links, emails, a template's [Bracketed Field] and a quote template's {field}: one private-use character each while the rules run. */
const MASKED = /\bhttps?:\/\/[^\s<]+|\bwww\.[^\s<]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\[[^\]\n]{1,40}\]|\{[a-z_]{1,40}\}/gi
const PUA = 0xe000
export class Masks {
  private list: string[] = []
  mask(text: string): string {
    return text.replace(MASKED, (m) => {
      /* a link never takes the sentence's own full stop or comma with it */
      const tail = /^(?:https?:|www\.)/i.test(m) ? (/[.,;:!?)]+$/.exec(m)?.[0] ?? '') : ''
      const core = tail ? m.slice(0, -tail.length) : m
      this.list.push(core)
      return String.fromCharCode(PUA + this.list.length - 1) + tail
    })
  }
  unmask(text: string): string { return text.replace(/[\ue000-\uefff]/g, (c) => this.list[c.charCodeAt(0) - PUA] ?? '') }
}
export const isMask = (c: string) => c >= '\ue000' && c <= '\uefff'
/** An atom read as a word inside a sentence (it is a name, a figure, a signature box). */
export const ATOM_MARK = '\uf000'

/** Plain words: the text a reader reads (tags out, chips as their labels). */
export function plainOf(html: string): string {
  return decodeText(html.replace(/<\/(p|div|h\d|li|ul|ol|blockquote)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}
export const wordCount = (html: string) => (plainOf(html).match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%$-]*/gu) ?? []).length
export const isBlank = (html: string) => !/<(img|ul|ol|li)\b|om-token|om-sign/i.test(html) && plainOf(html) === ''

/* ── blocks ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const BLOCK_TAG = /^<\s*(p|div|h[1-6]|ul|ol|blockquote|pre|table|figure|hr)\b/i
const VOID = /^<\s*(br|hr|img|input|meta|link|wbr|col|area|source)\b/i
const OPEN = /^<\s*([a-z][a-z0-9]*)\b/i
const CLOSE = /^<\s*\/\s*([a-z][a-z0-9]*)/i

export type Block = { html: string; tag: string | null }
/** The text's top-level blocks — each paragraph, heading or list whole; loose words between them one block of their own. */
export function blocksOf(html: string): Block[] {
  const parts = partsOf(html)
  const out: Block[] = []
  let cur: Part[] = [], depth = 0, tag: string | null = null
  const flush = () => { if (cur.length && (tag || cur.some((p) => p.k !== 'tag' ? p.s.trim() !== '' : /^<br/i.test(p.s)))) out.push({ html: joinParts(cur), tag }); cur = []; tag = null }
  for (const p of parts) {
    if (p.k !== 'tag') { if (depth === 0 && tag) flush(); cur.push(p); continue }
    if (depth === 0 && BLOCK_TAG.test(p.s) && !CLOSE.test(p.s)) {
      flush()
      tag = (OPEN.exec(p.s)?.[1] ?? 'p').toLowerCase()
      cur.push(p)
      if (VOID.test(p.s) || /\/>$/.test(p.s)) { flush(); continue }
      depth = 1
      continue
    }
    cur.push(p)
    if (VOID.test(p.s) || /\/>$/.test(p.s)) continue
    if (CLOSE.test(p.s)) { if (depth > 0) { depth--; if (depth === 0) flush() } }
    else if (OPEN.test(p.s) && depth > 0) depth++
  }
  flush()
  return out
}
export const joinBlocks = (blocks: readonly Block[]) => blocks.map((b) => b.html).join('')

/** A heading: an h1…h6, or a paragraph that is nothing but bold words (the quote terms' "1. Agreement"). */
export function isHeading(b: Block): boolean {
  if (b.tag && /^h[1-6]$/.test(b.tag)) return true
  if (b.tag !== 'p' && b.tag !== 'div') return false
  const inner = b.html.replace(/^<[^>]+>/, '').replace(/<\/[^>]+>\s*$/, '').trim()
  const m = /^<(strong|b)\b[^>]*>([\s\S]*)<\/\1>$/i.exec(inner)
  if (!m || /<(strong|b)\b/i.test(m[2]!)) return false
  const words = plainOf(m[2]!).split(/\s+/).filter(Boolean).length
  return words > 0 && words <= 14
}
export const headingLevel = (b: Block) => (b.tag && /^h[1-6]$/.test(b.tag) ? Number(b.tag[1]) : 4)
/** A heading's words without its number: "5. Variations" → "variations". */
export const headingKey = (text: string) => text.toLowerCase().replace(/^\s*(?:clause\s+)?[\d.]+\s*[).:-]?\s*/, '').replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
/** "5. Variations" → 5; null when the heading isn't numbered. */
export const headingNumber = (text: string) => { const m = /^\s*(\d+)\s*[.)]\s+/.exec(text); return m ? Number(m[1]) : null }

/* ── plain text ↔ paragraphs (a WhatsApp message, a quote template's text field) ─────────────────────────────────────── */
export const textToHtml = (text: string) => text.split('\n').map((l) => `<p>${encodeText(l)}</p>`).join('')
export function htmlToText(html: string): string {
  return blocksOf(html).map((b) => decodeText(b.html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))).join('\n')
}
