/**
 * (pending modules S29) The words on record each place's writing help may draw on — built here, once, from records the editors already
 * hold. Only words a client may read go in: a quote's printed terms and notes as Write with AI composes them (REG-420), the studio's own
 * T&Cs & Notes templates (their [fields] resolved to the quote's), My Items' descriptions, a trade's note, a contract template's text.
 * Never a cost, a markup, a vendor or a rebate (S04's rule for anything client-facing: `clientSafe`). Pure and client-safe.
 */
import { plainToHtml } from '@/lib/quotes/items-model'
import { aiNotes, aiTerms, resolveTokens, TEMPLATE_SEED, type TextContext, type TextKind, type TokenValues } from '@/lib/quotes/text'
import { matchWords } from '@/lib/company/price-book-match'
import { clausesOf, NOTES_TOPICS, TERMS_TOPICS } from './expand'
import type { WritingSources } from './propose'

type TextTemplate = { title: string; body: string; kind?: string }
/** A template named for a kind of home ("… for HDB Works", "… for BTO Works", "… Condo …") speaks only to that kind — an HDB flat's permitted
    hours never reach a landed home's terms. A BTO is an HDB flat. */
function fitsProperty(title: string, propertyType: string | null): boolean {
  const p = (propertyType ?? '').toLowerCase()
  if (/\bBTO\b/.test(title)) return /\bbto\b/.test(p)
  if (/\bHDB\b/.test(title)) return /\b(hdb|bto)\b/.test(p)
  if (/\bcondo/i.test(title)) return /\bcondo/.test(p)
  if (/\blanded\b/i.test(title)) return /\blanded\b/.test(p)
  return true
}
const topicsOf = (k: TextKind) => (k === 'notes' ? NOTES_TOPICS : TERMS_TOPICS)

/** A quote's Terms / Notes: written again from the quote (its scope, sum, schedule, dates); what's missing from the quote and the studio's templates. */
export function quoteTextSources(kind: TextKind, ctx: TextContext, templates: readonly TextTemplate[], tokens: TokenValues): WritingSources {
  const own = kind === 'terms' ? aiTerms(ctx) : aiNotes(ctx)
  const topics = topicsOf(kind)
  return {
    rewrite: { html: own, from: kind === 'terms' ? 'the quote’s scope, sum, schedule and dates' : 'what the quote covers, its timing and GST' },
    clauses: [
      ...clausesOf(own, topics, 'this quote'),
      ...templates.filter((t) => (!t.kind || t.kind === kind) && fitsProperty(t.title, ctx.propertyType)).flatMap((t) => clausesOf(resolveTokens(t.body, tokens), topics, `“${t.title}”`)),
    ],
    names: [ctx.client, ctx.member].filter(Boolean),
  }
}

/** A T&Cs & Notes template in Company › Templates: what the studio's other templates of its kind (and the starter library) say that it doesn't —
    their [fields] kept as fields. No Rewrite: a template has no quote to write from. */
export function textTemplateSources(kind: TextKind, title: string, siblings: readonly TextTemplate[]): WritingSources {
  const topics = topicsOf(kind)
  const starter = TEMPLATE_SEED.filter((t) => t.kind === kind && !siblings.some((s) => s.title === t.title))
  /* a sibling for one kind of home ("… for HDB Works") only feeds a template for that kind of home — its title says so */
  return { clauses: [...siblings, ...starter].filter((t) => t.title !== title && fitsProperty(t.title, title)).flatMap((t) => clausesOf(t.body, topics, `“${t.title}”`)) }
}

/** What My Items reads of an item for the help: its words only. */
export type BookWords = { id: string; name: string; description: string | null; descriptionHtml: string | null; category: string | null; status?: string | null }
const jaccard = (a: Set<string>, b: Set<string>) => { if (!a.size || !b.size) return 0; let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n) }
/** The item a line's words come from: the one it was picked from, else the live item whose name reads closest to the line's (a close match
    at least — the price book matcher's bar, 0.5) that carries words. */
export function bookItemFor(line: { name: string; priceBookItemId?: string | null; category?: string | null }, book: readonly BookWords[]): BookWords | null {
  const words = (b: BookWords) => !!(b.descriptionHtml || b.description?.trim())
  if (line.priceBookItemId) { const own = book.find((b) => b.id === line.priceBookItemId); if (own && words(own)) return own }
  const mine = matchWords(line.name)
  if (!mine.size) return null
  let best: { b: BookWords; score: number } | null = null
  for (const b of book) {
    if (b.status && b.status !== 'live') continue
    if (!words(b)) continue
    const score = jaccard(mine, matchWords(b.name)) + (line.category && b.category && line.category.toLowerCase() === b.category.toLowerCase() ? 0.1 : 0)
    if (score >= 0.5 && score > (best?.score ?? 0)) best = { b, score }
  }
  return best?.b ?? null
}
/** A quote line's description: My Items' words for it (null when My Items has none). */
export function descriptionSources(line: { name: string; priceBookItemId?: string | null; category?: string | null }, book: readonly BookWords[], names: readonly string[] = []): WritingSources {
  const item = bookItemFor(line, book)
  return { words: item ? { html: item.descriptionHtml || plainToHtml(item.description ?? ''), from: `the Price book’s words for “${item.name}”` } : null, names }
}
/** A section note: its trade's note from Settings › Quotes & pricing (null when the trade has none). */
export function sectionNoteSources(tradeNote: string | null | undefined): WritingSources {
  return { words: tradeNote?.trim() ? { html: plainToHtml(tradeNote.trim()), from: 'the trade’s note from Settings' } : null }
}
