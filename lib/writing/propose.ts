/**
 * (pending modules S29 — card api:ai-writing-help-quotes: "Improve · Shorten · Expand · Rewrite · Plain English on a quote's Terms and Notes
 * (the rich editor) and on a contract's text"; 1.0: the quote document editor's ✨ menu — Regenerate · Improve writing · Shorten · Expand ·
 * Polish for client — each sent the section's words to the mAIson Bot model (`/api/buddy/chat`) and replaced the section with the answer,
 * at once.) 2.0 offers the same five, worked out by rule from the records (lib/writing/rules.ts · expand.ts), and only ever PROPOSES: the
 * member reads the change marked word by word, then presses Use these words (Undo after) or Not now. Nothing is metered — 1.0's chat route
 * spent no AI credits, and its price list (lib/credits/schedule.ts) has no writing entry.
 *
 * **The one seam for a model:** `proposeWriting(input)`. Today it runs the rules; a model plugs in here and returns the same `Proposal` (the
 * new HTML and the plain lines saying what changed). The dialog, the marked changes, Use these words, Undo, the client-safety of the
 * sources (`WritingSources` carries only words a client may read — never a cost, a markup, a vendor or a rebate) and the editors' own
 * saves stay exactly as they are. Pure and client-safe.
 */
import { addMissingClauses, addMissingDocClauses, addMissingParagraphs, addWords, coveredTopics, docClauses, NOTES_TOPICS, templateClauseFor, TERMS_TOPICS, type Clause, type Topic } from './expand'
import { blocksOf, isBlank, isHeading, plainOf, wordCount } from './html'
import { improveHtml, plainHtml, shortenHtml, tallyTotal, type DocNoun, type Tally } from './rules'

export type WritingAction = 'improve' | 'shorten' | 'expand' | 'rewrite' | 'plain'
/** Where the words are written — what the rules may add, and the noun Plain English uses. */
export type WritingKind = 'terms' | 'notes' | 'description' | 'section-note' | 'contract' | 'message' | 'template-text'

/** Words on record the help may draw on — each a client may already read. */
export type WritingSources = {
  /** Rewrite: the whole text written again from the records (a quote's terms from its lines, sum, schedule and dates). */
  rewrite?: { html: string; from: string } | null
  /** Add what's missing to Terms / Notes: clauses on record, in their order. */
  clauses?: Clause[] | null
  /** A contract's template — its clauses for Add what's missing, its wording for a clause's Rewrite. */
  template?: { html: string; title: string } | null
  /** A line's description / a section note: the words on record (My Items' description, the trade's note). */
  words?: { html: string; from: string } | null
  /** Improve writes these people's names their way ("olivia" → "Olivia"). */
  names?: readonly string[]
}
export type WritingInput = { action: WritingAction; html: string; kind: WritingKind; sources?: WritingSources
  /** A contract's part: one clause, a selection, or the whole document — Rewrite and Add what's missing read the template accordingly. */
  part?: 'clause' | 'selection' | 'whole' }
export type Proposal = {
  action: WritingAction
  before: string
  after: string
  /** What changed, in plain words (the dialog's lines). */
  lines: string[]
  /** The menu row's second line: what pressing it would do. */
  short: string
  /** Why nothing would change — the row is disabled with this as its reason. */
  none: string | null
  /** Add what's missing: how many clauses or paragraphs it adds. */
  added?: number
}

export const ACTIONS: readonly WritingAction[] = ['improve', 'shorten', 'expand', 'rewrite', 'plain']
/** The actions a place offers at all: Rewrite and Add what's missing only where there are words on record to draw on. */
export function offeredActions(kind: WritingKind, sources: WritingSources): WritingAction[] {
  return ACTIONS.filter((a) => {
    if (a === 'expand') return kind === 'contract' ? !!sources.template : kind === 'terms' || kind === 'notes' ? sources.clauses !== undefined : kind === 'description' || kind === 'section-note' ? sources.words !== undefined : false
    if (a === 'rewrite') return kind === 'contract' ? !!sources.template : kind === 'terms' || kind === 'notes' ? sources.rewrite !== undefined : kind === 'description' || kind === 'section-note' ? sources.words !== undefined : false
    return true
  })
}

const nounOf = (k: WritingKind): DocNoun => (k === 'contract' ? 'agreement' : k === 'message' ? 'message' : 'quotation')
const topicsOf = (k: WritingKind): Topic[] => (k === 'notes' ? NOTES_TOPICS : TERMS_TOPICS)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const list = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
/** A topic's label inside a sentence: "What it covers" → "what it covers", "GST and validity" stays. */
const lowerLabel = (l: string) => (/^[A-Z]{2}/.test(l) ? l : l.charAt(0).toLowerCase() + l.slice(1))
const same = (a: string, b: string) => plainOf(a) === plainOf(b) && a.replace(/\s+/g, ' ') === b.replace(/\s+/g, ' ')

/** The row's and the dialog's words for an action here. */
export function actionLabel(a: WritingAction, kind: WritingKind, blank: boolean): string {
  switch (a) {
    case 'improve': return 'Improve the writing'
    case 'shorten': return 'Shorten'
    case 'expand': return 'Add what’s missing'
    case 'plain': return 'Plain English'
    case 'rewrite':
      if (kind === 'terms' || kind === 'notes') return blank ? 'Write from this quote' : 'Rewrite from this quote'
      if (kind === 'description') return 'Use My Items’ words'
      if (kind === 'section-note') return 'Use the trade’s note'
      return 'Back to the template’s wording'
  }
}
/** The snackbar once the words are in (with Undo). */
export function doneWords(a: WritingAction, label: string, blank: boolean,
  /** (calm-build regression fix F — S42 B-20 kept) the label is a titled block's own title (Terms, Notes) — named as a title whatever its case:
      the calm UI build's sentence-case titles (W-200, "Additional notes") have no capital after a space for the rule below to see */
  title = false): string {
  const low = label.charAt(0).toLowerCase() + label.slice(1)
  switch (a) {
    case 'improve': return `${label} improved`
    case 'shorten': return `${label} shortened`
    case 'expand': return title || /\s[A-Z]/.test(label) ? `Added to ${label}` : `Added to the ${low}`   // (S42 B-20) a section's own title keeps its capitals: “Added to Additional notes”
    case 'plain': return `${label} in plain English`
    case 'rewrite': return blank ? `${label} written` : `${label} rewritten`
  }
}

function improveLines(t: Tally): string[] {
  const parts = [
    t.spelling && plural(t.spelling, 'spelling'), t.shortForms && `${plural(t.shortForms, 'short form')} spelt out`,
    t.capitals && plural(t.capitals, 'capital'), t.stops && plural(t.stops, 'full stop'), t.spacing && `spacing in ${plural(t.spacing, 'place')}`,
    t.wordy && `${plural(t.wordy, 'wordy phrase')} tightened`, t.repeats && `${plural(t.repeats, 'repeated word')} taken out`,
  ].filter(Boolean) as string[]
  return [`${plural(tallyTotal(t), 'fix', 'fixes')}: ${list(parts)}`, ...(t.examples.length ? [`For example: ${t.examples.join(' · ')}`] : [])]
}

/** The menu row's line: how many fixes, and the kinds this text needs (never a kind it doesn't). */
function improveShort(t: Tally): string {
  const kinds = ([['spelling', 'spelling'], ['shortForms', 'short forms'], ['capitals', 'capitals'], ['stops', 'full stops'], ['spacing', 'spacing'], ['wordy', 'wordy phrases'], ['repeats', 'a repeated word']] as const)
    .filter(([k]) => t[k] > 0).map(([, w]) => w)
  return `${plural(tallyTotal(t), 'fix', 'fixes')} — ${list(kinds.slice(0, 3))}${kinds.length > 3 ? '…' : ''}`
}

/** The proposal for one action on these words. */
export function proposeWriting(input: WritingInput): Proposal {
  const { action, html, kind } = input
  const s = input.sources ?? {}
  const blank = isBlank(html)
  const base = { action, before: html }
  const none = (why: string): Proposal => ({ ...base, after: html, lines: [], short: why, none: why })
  const nothingYet = 'Nothing written yet'
  switch (action) {
    case 'improve': {
      if (blank) return none(nothingYet)
      const r = improveHtml(html, { names: s.names, stops: kind !== 'description' && kind !== 'section-note' })
      if (!tallyTotal(r.tally) || same(r.html, html)) return none('Nothing to fix — it already reads cleanly')
      return { ...base, after: r.html, lines: improveLines(r.tally), short: improveShort(r.tally), none: null }
    }
    case 'shorten': {
      if (blank) return none(nothingYet)
      const r = shortenHtml(html)
      if (r.words.after >= r.words.before || same(r.html, html)) return none('Already short — every sentence carries a point or a figure')
      const lines = [`From ${plural(r.words.before, 'word')} to ${r.words.after}`]
      if (r.tally.dropped) lines.push(`Each paragraph keeps its first sentence and every sentence with a figure, a date or a name — ${plural(r.tally.dropped, 'sentence')} left out`)
      if (r.tally.fillers + r.tally.wordy) lines.push(`${plural(r.tally.fillers + r.tally.wordy, 'phrase')} said in fewer words`)
      return { ...base, after: r.html, lines, short: `From ${r.words.before} words to ${r.words.after}`, none: null }
    }
    case 'plain': {
      if (blank) return none(nothingYet)
      const r = plainHtml(html, nounOf(kind))
      const n = r.tally.plainWords + r.tally.splits
      if (!n || same(r.html, html)) return none('Already in plain words')
      const lines = [r.tally.plainWords ? `${plural(r.tally.plainWords, 'change')} to everyday words${r.tally.examples.length ? ` — ${r.tally.examples.join(' · ')}` : ''}` : '']
      if (r.tally.splits) lines.push(`${plural(r.tally.splits, 'long sentence')} split in two`)
      return { ...base, after: r.html, lines: lines.filter(Boolean), short: r.tally.plainWords ? `${plural(r.tally.plainWords, 'change')} to everyday words` : `${plural(r.tally.splits, 'long sentence')} split`, none: null }
    }
    case 'rewrite': {
      if (kind === 'terms' || kind === 'notes') {
        if (!s.rewrite) return none('Nothing on record to write it from')
        if (same(s.rewrite.html, html)) return none('It already says exactly this')
        const what = kind === 'terms' ? 'the quote’s scope, sum, payment schedule, start date and validity' : 'what the quote covers, its timing, GST and validity'
        return { ...base, after: s.rewrite.html, lines: [blank ? `Written from ${what}` : `Written again from ${what} — what you wrote is replaced`], short: `From ${s.rewrite.from}`, none: null }
      }
      if (kind === 'description' || kind === 'section-note') {
        if (!s.words) return none(kind === 'description' ? 'My Items has no words for a line like this' : 'This section’s trade has no note in Settings › Quotes & pricing')
        if (same(s.words.html, html)) return none(`It already says ${s.words.from}`)
        return { ...base, after: s.words.html, lines: [`${s.words.from.charAt(0).toUpperCase()}${s.words.from.slice(1)}${blank ? '' : ' — what you wrote is replaced'}`], short: s.words.from, none: null }
      }
      if (kind === 'contract' && s.template) {
        if (input.part === 'whole') {
          if (same(s.template.html, html)) return none('It already has the template’s wording')
          return { ...base, after: s.template.html, lines: [`The whole contract as “${s.template.title}” words it — your changes to it are replaced`], short: `“${s.template.title}” as it is`, none: null }
        }
        const t = templateClauseFor(html, s.template.html)
        if (!t) return none(`Click in a clause “${s.template.title}” also has`)
        if (same(t.html, html)) return none('This clause already has the template’s wording')
        return { ...base, after: t.html, lines: [`“${t.heading}” as “${s.template.title}” words it`], short: `“${t.heading}” from “${s.template.title}”`, none: null }
      }
      return none('Nothing on record to write it from')
    }
    case 'expand': {
      if (kind === 'terms' || kind === 'notes') {
        if (blank) return none(s.rewrite ? 'Nothing written yet — write it from this quote first' : nothingYet)
        const topics = topicsOf(kind)
        const r = addMissingClauses(html, s.clauses ?? [], topics)
        if (!r.added.length) {
          const covered = topics.filter((t) => coveredTopics(html, topics).has(t.key)).map((t) => lowerLabel(t.label))
          return none(covered.length ? `Nothing to add — it already covers ${list(covered.slice(0, 6))}${covered.length > 6 ? ' and more' : ''}` : 'Nothing on record speaks to what it leaves out')
        }
        const names = r.added.map((c) => topics.filter((t) => c.topics.includes(t.key)).map((t) => lowerLabel(t.label)).join(' and ') || (c.heading ?? 'a note'))
        const froms = [...new Set(r.added.map((c) => c.from))]
        return { ...base, after: r.html, lines: [`Adds ${list(names)}`, `From ${list(froms)}`], short: names.length <= 2 ? `Adds ${list(names)}` : `Adds ${names.length} points: ${names.slice(0, 2).join(', ')}…`, none: null, added: r.added.length }
      }
      if (kind === 'description' || kind === 'section-note') {
        if (!s.words) return none(kind === 'description' ? 'My Items has no words for a line like this' : 'This section’s trade has no note in Settings › Quotes & pricing')
        const r = addWords(html, s.words.html)
        if (!r.added.length) return none(`It already has ${s.words.from}`)
        return { ...base, after: r.html, lines: [`Adds ${s.words.from}`], short: `Adds ${s.words.from}`, none: null }
      }
      if (kind === 'contract' && s.template) {
        if (input.part === 'whole') {
          const r = addMissingDocClauses(html, s.template.html)
          if (!r.added.length) return none(`It already has every clause of “${s.template.title}”`)
          return { ...base, after: r.html, lines: [`Adds ${plural(r.headings.length, 'clause')} from “${s.template.title}”: ${list(r.headings.map((h) => `“${h}”`))}`], short: `Adds ${plural(r.headings.length, 'clause')} from the template`, none: null }
        }
        const t = templateClauseFor(html, s.template.html)
        if (!t) return none(`Click in a clause “${s.template.title}” also has`)
        const r = addMissingParagraphs(html, t.html)
        if (!r.added.length) return none('This clause already says all the template says')
        return { ...base, after: r.html, lines: [`Adds ${plural(r.added.length, 'paragraph')} of “${t.heading}” from “${s.template.title}”`], short: `Adds the template’s words for “${t.heading}”`, none: null }
      }
      return none('Nothing on record to add')
    }
  }
}

/* ── a contract's parts ─────────────────────────────────────────────────────────────────────────────────────────────────── */
export type DocPart = { key: 'clause' | 'selection' | 'whole'; label: string; from: number; to: number; html: string }
/**
 * What the help acts on in a contract, given its top-level blocks and where the member was: the blocks a selection touches; else the clause
 * the caret sits in (its heading and what follows, up to the next heading of its level — "the opening" before the first heading); and always
 * the whole document. The first is the default.
 */
export function docParts(blocks: readonly string[], at: { selection: [number, number] | null; caret: number | null }): DocPart[] {
  const html = blocks.join('')
  const out: DocPart[] = []
  if (at.selection) {
    const [a, b] = at.selection
    out.push({ key: 'selection', label: 'Your selection', from: a, to: b, html: blocks.slice(a, b + 1).join('') })
  } else if (at.caret !== null && at.caret >= 0) {
    const { clauses } = docClauses(html)
    const parsed = blocksOf(html)
    /* the blocks the parser reads are the editor's top-level blocks, one for one, while both are well formed */
    if (parsed.length === blocks.length) {
      const inside = clauses.filter((c) => c.level > 1 && c.from <= at.caret! && at.caret! <= c.to).sort((x, y) => (x.to - x.from) - (y.to - y.from))[0]
      if (inside) out.push({ key: 'clause', label: `“${inside.heading}”`, from: inside.from, to: inside.to, html: inside.html })
      else {
        const first = parsed.findIndex((b, i) => i > 0 && isHeading(b) && !/^h1$/.test(b.tag ?? ''))
        const start = parsed[0] && /^h1$/.test(parsed[0].tag ?? '') ? 1 : 0
        if (first > start && at.caret < first && at.caret >= start) out.push({ key: 'clause', label: 'The opening', from: start, to: first - 1, html: blocks.slice(start, first).join('') })
      }
    }
  }
  out.push({ key: 'whole', label: 'The whole contract', from: 0, to: blocks.length - 1, html })
  return out
}
export const wordsIn = wordCount
