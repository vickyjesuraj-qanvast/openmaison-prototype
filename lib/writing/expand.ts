/**
 * (pending modules S29 — card api:ai-writing-help-quotes; 1.0's "Expand this quote section with more detail and supporting context" and
 * "Regenerate") What the writing help adds or writes again comes from the records, never from a guess:
 *   · a quote's **Terms**: the clauses Write with AI composes from the quote itself (its scope, sum, schedule, dates — REG-420) and the
 *     studio's own Terms templates — a clause is added when the terms cover none of its topics (payment, warranty, cancellation…);
 *   · a quote's **Notes**: the quote's own coverage, timing and GST lines and the studio's Notes templates (working hours, lead times,
 *     what the quote excludes), each added when the notes say nothing of it;
 *   · a **contract**: its template's clauses — a heading the contract doesn't have is added in the template's order; one clause can take
 *     the template's sentences it lost, or its whole wording back;
 *   · a **line's description** / a **section note**: My Items' words for that line, the trade's note from Settings.
 * Every source is client-facing words already (a quote's printed text, the studio's templates, My Items' descriptions, a trade note) —
 * never a cost, a markup, a vendor or a rebate. Pure and client-safe.
 */
import { blocksOf, headingKey, headingLevel, headingNumber, isBlank, isHeading, joinBlocks, plainOf, type Block } from './html'

/** A clause on record: its heading (null for a paragraph), its blocks, the topics it speaks to and where it came from. */
export type Clause = { heading: string | null; html: string; topics: string[]; from: string }
export type Topic = { key: string; label: string; re: RegExp }

/** What a quote's terms speak to — read in a clause's heading, else its words. */
export const TERMS_TOPICS: Topic[] = [
  { key: 'agreement', label: 'Agreement', re: /\bagreement\b|\bforms? part of\b|\brenovation contract\b/i },
  { key: 'scope', label: 'Scope', re: /\bscope\b|\bvariations?\b|\bitems? listed\b/i },
  { key: 'validity', label: 'Validity', re: /\bvalid(?:ity)?\b/i },
  { key: 'price', label: 'Price', re: /\bcontract sum\b|\bprices?\b|\bpricing\b/i },
  { key: 'payment', label: 'Payment', re: /\bpayments?\b|\bdeposit\b|\bmilestones?\b|\binvoices?\b/i },
  { key: 'timeline', label: 'Timeline', re: /\btimeline\b|\bprogramme\b|\bcompletion\b|\bscheduled to start\b|\brun for about\b/i },
  { key: 'permits', label: 'Permits', re: /\bpermits?\b/i },
  { key: 'materials', label: 'Materials', re: /\bmaterials?\b/i },
  { key: 'warranty', label: 'Warranty', re: /\bwarrant(?:y|ed|ies)\b|\bdefects? liability\b/i },
  { key: 'cancellation', label: 'Cancellation', re: /\bcancel(?:s|led|lation)?\b|\bterminat(?:e|ion)\b/i },
  { key: 'hours', label: 'Working hours', re: /\b(?:permitted|working) hours\b/i },
]
/** What a quote's notes speak to. */
export const NOTES_TOPICS: Topic[] = [
  { key: 'coverage', label: 'What it covers', re: /\b(?:quotation|quote) covers\b|\bcovers \d+ items?\b/i },
  { key: 'timing', label: 'Timing', re: /\bscheduled to start\b|\bstart on\b|\brun for about\b|\bweeks? from\b/i },
  { key: 'tax', label: 'GST and validity', re: /\bGST\b|\bvalid (?:until|for)\b/i },
  { key: 'hours', label: 'Working hours and access', re: /\bworking hours\b|\b(?:from )?9\s?am\b|\bkeys?\b|\baccess card\b/i },
  { key: 'leadtimes', label: 'Material lead times', re: /\bfabricat(?:ed|ion)\b|\bweeks? after\b|\btemplating\b|\blead times? (?:of|are|is)\b/i },
  { key: 'excludes', label: 'What it excludes', re: /\bexclud(?:es|ed|ing)\b|\bnot included\b/i },
]

/** A heading's own words, or the first line of a paragraph. */
const headingText = (b: Block) => plainOf(b.html)
/** A sign-off ("Prepared by …", "For any query …") belongs to no clause: it stays last, and a clause added never brings one along. */
const isSignOff = (b: Block) => !isHeading(b) && /^(prepared (?:by|for)|for any (?:query|question)|signed by the parties)\b/i.test(plainOf(b.html))

/** A text read as clauses: each heading with the blocks under it; paragraphs before the first heading one clause each. A title (a heading
    with no topic, first in the text) and sign-offs are left out. */
export function clausesOf(html: string, topics: readonly Topic[], from: string): Clause[] {
  const out: Clause[] = []
  let cur: { head: Block | null; body: Block[] } | null = null
  const push = () => {
    if (!cur) return
    const head = cur.head ? headingText(cur.head) : null
    const words = head ?? plainOf(joinBlocks(cur.body))
    let t = topics.filter((x) => x.re.test(words)).map((x) => x.key)
    if (head && !t.length) t = topics.filter((x) => x.re.test(plainOf(joinBlocks(cur!.body)))).slice(0, 1).map((x) => x.key)   // a heading of other words: its body's first topic
    if (cur.head || cur.body.length) out.push({ heading: head, html: joinBlocks([...(cur.head ? [cur.head] : []), ...cur.body]), topics: t, from })
    cur = null
  }
  for (const b of blocksOf(html)) {
    if (isSignOff(b)) continue
    if (isHeading(b)) { push(); cur = { head: b, body: [] }; continue }
    if (cur?.head) { cur.body.push(b); continue }
    push(); cur = { head: null, body: [b] }; push()
  }
  push()
  /* the title ("TERMS AND CONDITIONS FOR RENOVATION WORKS"): a heading with no body and no topic */
  return out.filter((c) => !(c.heading && !c.topics.length && plainOf(c.html) === c.heading))
}

/** The topics a text covers — read anywhere in its words. */
export const coveredTopics = (html: string, topics: readonly Topic[]) => new Set(topics.filter((t) => t.re.test(plainOf(html))).map((t) => t.key))

/** Renumber an added clause's heading after the text's own last number ("8. Cancellation" after "7. …"), or drop its number when the text
    numbers none. */
function renumber(c: Clause, n: number | null): string {
  if (!c.heading) return c.html
  const blocks = blocksOf(c.html)
  const head = blocks[0]!
  const text = headingText(head)
  const bare = text.replace(/^\s*\d+\s*[.)]\s+/, '')
  const want = n === null ? bare : `${n}. ${bare}`
  if (want === text) return c.html
  const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  blocks[0] = { ...head, html: head.html.replace(new RegExp(esc.replace(/&/g, '(?:&|&amp;)')), want.replace(/&/g, '&amp;')) }
  return joinBlocks(blocks)
}

export type Added = { html: string; added: Clause[] }
/**
 * Add what's missing to a quote's Terms or Notes: for each topic the text doesn't speak to, the first clause on record that speaks to it and
 * to nothing the text already covers — in the records' order, numbered after the text's own clauses, placed before its sign-off.
 */
export function addMissingClauses(html: string, sources: readonly Clause[], topics: readonly Topic[]): Added {
  const covered = coveredTopics(html, topics)
  const added: Clause[] = []
  const taken = new Set(covered)
  for (const t of topics) {
    if (taken.has(t.key)) continue
    const c = sources.find((x) => x.topics.includes(t.key) && x.topics.every((k) => !covered.has(k)) && !added.includes(x))
    if (!c) continue
    added.push(c)
    for (const k of c.topics) taken.add(k)
  }
  if (!added.length) return { html, added }
  /* the records' order, not the topics' */
  added.sort((a, b) => sources.indexOf(a) - sources.indexOf(b))
  const blocks = blocksOf(html)
  const numbers = blocks.filter(isHeading).map((b) => headingNumber(headingText(b))).filter((n): n is number => n !== null)
  let next = numbers.length ? Math.max(...numbers) : null
  const fresh = added.map((c) => renumber(c, next === null ? null : ++next)).join('')
  /* before the text's sign-off ("Prepared by …"), else at the end */
  let at = blocks.length
  while (at > 0 && isSignOff(blocks[at - 1]!)) at--
  return { html: joinBlocks(blocks.slice(0, at)) + fresh + joinBlocks(blocks.slice(at)), added }
}

/* ── contracts: clauses by heading ─────────────────────────────────────────────────────────────────────────────────────── */
export type DocClause = { key: string; heading: string; level: number; from: number; to: number; html: string }
/** A document's clauses: each h1…h3 heading with what sits under it, up to the next heading of its level or higher. */
export function docClauses(html: string): { blocks: Block[]; clauses: DocClause[] } {
  const blocks = blocksOf(html)
  const clauses: DocClause[] = []
  blocks.forEach((b, i) => {
    if (!isHeading(b)) return
    const level = headingLevel(b)
    let j = i + 1
    while (j < blocks.length && !(isHeading(blocks[j]!) && headingLevel(blocks[j]!) <= level)) j++
    clauses.push({ key: headingKey(headingText(b)), heading: headingText(b), level, from: i, to: j - 1, html: joinBlocks(blocks.slice(i, j)) })
  })
  return { blocks, clauses }
}
/** The template's clauses a contract doesn't have (by heading) — each added in the template's order, after the clause that precedes it there
    (else before the contract's Signatures, else at the end). The title (h1) is never one. */
export function addMissingDocClauses(html: string, template: string): Added & { headings: string[] } {
  const mine = docClauses(html), theirs = docClauses(template)
  const have = new Set(mine.clauses.map((c) => c.key))
  const missing = theirs.clauses.filter((c) => c.level > 1 && c.key && !have.has(c.key) && !/^signatures?$/.test(c.key) && plainOf(c.html) !== c.heading)
  if (!missing.length) return { html, added: [], headings: [] }
  const blocks = [...mine.blocks]
  const insertAt = (c: DocClause) => {
    /* after the contract's copy of the clause that comes before it in the template */
    const before = theirs.clauses.filter((x) => x.from < c.from && x.level >= 2 && have.has(x.key)).pop()
    const at = before ? docClauses(joinBlocks(blocks)).clauses.find((x) => x.key === before.key) : null
    if (at) return at.to + 1
    const sig = docClauses(joinBlocks(blocks)).clauses.find((x) => /^signatures?$/.test(x.key))
    return sig ? sig.from : blocks.length
  }
  for (const c of missing) {
    const at = insertAt(c)
    blocks.splice(at, 0, ...blocksOf(c.html))
    have.add(c.key)
  }
  return { html: joinBlocks(blocks), added: missing.map((c) => ({ heading: c.heading, html: c.html, topics: [], from: 'template' })), headings: missing.map((c) => c.heading) }
}
/** One clause given back the template's sentences it lost (each paragraph of the template's clause whose words it no longer has). */
export function addMissingParagraphs(part: string, templateClause: string): Added {
  const have = plainOf(part).toLowerCase()
  const add = blocksOf(templateClause).filter((b) => !isHeading(b) && !isBlank(b.html) && !have.includes(plainOf(b.html).toLowerCase().slice(0, 60)))
  if (!add.length) return { html: part, added: [] }
  return { html: part + joinBlocks(add), added: add.map((b) => ({ heading: null, html: b.html, topics: [], from: 'template' })) }
}
/** The template's clause with the same heading as the part's first one, if it has one. */
export function templateClauseFor(part: string, template: string): DocClause | null {
  const head = blocksOf(part).find(isHeading)
  if (!head) return null
  const key = headingKey(headingText(head))
  return docClauses(template).clauses.find((c) => c.key === key) ?? null
}

/* ── one paragraph's words (a line's description, a section note) ─────────────────────────────────────────────────────── */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
/** The words on record added after the text — unless the text already says them. */
export function addWords(html: string, words: string): Added {
  if (!plainOf(words)) return { html, added: [] }
  if (norm(plainOf(html)).includes(norm(plainOf(words)))) return { html, added: [] }
  return { html: isBlank(html) ? words : html + words, added: [{ heading: null, html: words, topics: [], from: 'record' }] }
}
