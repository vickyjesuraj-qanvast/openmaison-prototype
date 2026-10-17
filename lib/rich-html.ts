/**
 * (S44Q — the UAT comments' triage §12.1, her UAT ask 2026-10-15) One allowlist for every piece of rich text a client or a member reads.
 * A quote line's or a section's description, the quote's Terms and Notes, the T&Cs & Notes library, a template's Text block, the Price book's
 * saved words and a lead's note were stored as the browser sent them and drawn as raw HTML — on the client's own pages too (`/quote/<token>`,
 * `/confirm/<token>`, the quote an agreement signs). They now pass the house allowlist — the contracts' one (`lib/contracts/sanitize.ts`, REG-631),
 * which keeps exactly what the editors make (paragraphs, marks, lists, alignment, links) and turns anything else into text — when they are
 * saved AND whenever they are drawn, so a row written before this step (or by a crafted request) is harmless too. Pure: server and browser.
 */
import { sanitizeContractHtml } from '@/lib/contracts/sanitize'
import { isBlankHtml } from '@/lib/quotes/text'

/** The house allowlist, by the name rich text outside a contract uses. */
export const sanitizeRichHtml = (html: string | null | undefined): string => sanitizeContractHtml(html)

/** A line's or a section's description: the length a save takes (REG-557's cap). */
export const RICH_HTML_MAX = 12_000

/** A stored rich body: the allowlist's markup only, the input capped first; null when nothing is left to read. */
export function cleanRichHtml(v: unknown, max = RICH_HTML_MAX): string | null {
  if (typeof v !== 'string' || !v) return null
  const s = sanitizeRichHtml(v.slice(0, max))
  return isBlankHtml(s) ? null : s
}

/** (S44G — NB-08) A link in the printed quote opens beside it: a client reading the quote (`/quote/<token>`, `/confirm/<token>`) or a member in
    the Preview never leaves the page by pressing one. Every `<a>` of a sanitised body gets `target="_blank" rel="noopener noreferrer"`. */
export const printedLinks = (html: string): string =>
  html.includes('<a') ? html.replace(/<a\b([^>]*)>/gi, (_m, attrs: string) => `<a${attrs.replace(/\s(?:target|rel)="[^"]*"/gi, '')} target="_blank" rel="noopener noreferrer">`) : html

/** Plain words going into HTML: the characters that mean markup, escaped. */
export const escapeHtmlText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A body's fields (`{client_name}` …) go in as words, never markup: every value escaped — a lead's name came from a web form, perhaps. */
export function escapedValues(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(values)) out[k] = escapeHtmlText(v ?? '')
  return out
}

/** A saved section (My Sections) with its note, its sub-sections' notes and every line's description through the allowlist. */
type Described = { descriptionHtml?: string | null }
export function cleanSectionHtml<S extends Described & { lines: Described[]; subs: (Described & { lines: Described[] })[] }>(s: S): S {
  const line = <L extends Described>(l: L): L => ({ ...l, descriptionHtml: cleanRichHtml(l.descriptionHtml ?? null) })
  return { ...s, descriptionHtml: cleanRichHtml(s.descriptionHtml ?? null), lines: s.lines.map(line), subs: s.subs.map((g) => ({ ...g, descriptionHtml: cleanRichHtml(g.descriptionHtml ?? null), lines: g.lines.map(line) })) }
}

/* ── (S44Q — row 321, triage §12.15) The printed Terms and Notes keep their shape ──────────────────────────────────────────────────────────
   The print cut a body into slices at every </p>, </li> and <br> and stripped the list tags, so lists lost their bullets and numbers, an
   aligned paragraph its alignment, a blank line vanished. A body is now read into the pieces a page can break between — each paragraph whole,
   in its own tag (so its alignment holds), each list line on its own with its list's marker and number, a blank line as written. */
export type TextPiece =
  /** A paragraph as written — its own tag kept; `words` false = a blank line. */
  | { kind: 'para'; html: string; words: boolean }
  /** One line of a list: its list's kind, its number in that list, its words (nested lists stay inside), its alignment. */
  | { kind: 'item'; list: 'ul' | 'ol'; n: number; html: string; align: string | null }

const BLOCKS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol'])
const VOIDS = new Set(['br', 'hr', 'img'])
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g
const hasWords = (h: string) => h.replace(/<(?!img)[^>]*>/gi, '').replace(/&nbsp;/g, ' ').trim() !== '' || /<img\b/i.test(h)
const alignOf = (open: string) => /text-align:\s*(left|center|right|justify)/i.exec(open)?.[1]?.toLowerCase() ?? null

/** The top-level pieces of a body: each element in `split` whole (with its open tag), and the runs of inline words between them. */
function topLevel(src: string, split: Set<string>): { tag: string | null; outer: string; open: string; inner: string }[] {
  const out: { tag: string | null; outer: string; open: string; inner: string }[] = []
  let depth = 0, start = -1, openEnd = -1, tag: string | null = null, run = 0
  for (const m of src.matchAll(TAG_RE)) {
    const name = m[2]!.toLowerCase(), closing = m[1] === '/', at = m.index ?? 0
    if (VOIDS.has(name)) continue
    if (!closing) {
      if (depth === 0 && split.has(name)) {
        if (at > run) out.push({ tag: null, outer: src.slice(run, at), open: '', inner: src.slice(run, at) })
        start = at; openEnd = at + m[0].length; tag = name
      }
      depth++
    } else {
      if (depth > 0) depth--
      if (depth === 0 && start >= 0 && name === tag) {
        const end = at + m[0].length
        out.push({ tag, outer: src.slice(start, end), open: src.slice(start, openEnd), inner: src.slice(openEnd, at) })
        start = -1; tag = null; run = end
      }
    }
  }
  if (start >= 0) out.push({ tag, outer: src.slice(start), open: src.slice(start, openEnd), inner: src.slice(openEnd) })   // never closed: the rest is its
  else if (run < src.length) out.push({ tag: null, outer: src.slice(run), open: '', inner: src.slice(run) })
  return out
}

/** A stored Terms or Notes body (sanitised here) as the pieces the print lays out, in order. */
export function textPieces(html: string): TextPiece[] {
  const out: TextPiece[] = []
  const walk = (src: string) => {
    for (const b of topLevel(src, BLOCKS)) {
      if (b.tag === 'ul' || b.tag === 'ol') {
        let n = 0
        for (const li of topLevel(b.inner, new Set(['li']))) {
          if (li.tag !== 'li') continue   // the whitespace between a list's lines
          n++
          out.push({ kind: 'item', list: b.tag, n, html: li.inner, align: alignOf(li.open) })
        }
        continue
      }
      /* a container that holds blocks of its own (the browser's <div> round a list or paragraphs) is read through */
      if ((b.tag === 'div' || b.tag === 'blockquote') && /<(p|div|ul|ol|h[1-4]|blockquote)\b/i.test(b.inner)) { walk(b.inner); continue }
      if (b.tag === null) {
        if (!hasWords(b.outer)) { if (/<br\b/i.test(b.outer)) out.push({ kind: 'para', html: '', words: false }); continue }   // whitespace between blocks is nothing; a typed <br> is a blank line
        out.push({ kind: 'para', html: `<p>${b.outer.trim()}</p>`, words: true })
        continue
      }
      out.push(hasWords(b.inner) ? { kind: 'para', html: b.outer, words: true } : { kind: 'para', html: '', words: false })
    }
  }
  walk(sanitizeRichHtml(html))
  return out
}
