/**
 * (pending modules S29 — card api:ai-writing-help-quotes; 1.0's quote document editor › a section's AI menu: Improve writing · Shorten ·
 * Expand · Regenerate · Polish for client, each a prompt to the mAIson Bot model) The same help, by rule. Three rule sets, each acting on the
 * words only — the text's shape (its paragraphs, headings, lists, bold, links), a contract's chips and signature fields, links, emails and
 * fields are never touched:
 *   · **Improve** — 1.0's "fix grammar, tighten prose, keep meaning intact": known misspellings, chat short forms spelt out (only the ones
 *     a document never means otherwise — never a lone "w" or "u", which a dimension or a list can mean), a word typed twice, wordy phrases
 *     tightened, one space between words, none before a mark, sentences opening on a capital, the studio's names and acronyms written their
 *     way, and a full stop where a paragraph's sentence ends without one.
 *   · **Plain English** — 1.0's "clearer, more client-friendly English": legal and formal words in everyday ones ("shall" → "will",
 *     "commence" → "start", "prior to" → "before", "make good" → "repair"…), short forms a client may not know spelt out ("FOC", "VO",
 *     "e.g."), "Homeowner/Client" read as one word, "Should the Client cancel" as "If the Client cancels", and a long sentence split at its
 *     semicolon.
 *   · **Shorten** — 1.0's "about half its length without losing essential meaning": fillers out ("Please note that", "basically"), wordy
 *     phrases tightened, and each paragraph keeps its first sentence and every sentence that carries a figure, a date, a link, a field or a
 *     chip — the facts stay; headings and list items stay whole.
 * Each returns the new HTML and a tally of what it did, for the proposal's lines. Pure and client-safe.
 */
import { ATOM_MARK, Masks, blocksOf, decodeText, encodeText, isHeading, joinParts, partsOf, wordCount, type Block, type Part } from './html'

export type TallyKey = 'spelling' | 'shortForms' | 'capitals' | 'spacing' | 'stops' | 'wordy' | 'repeats' | 'plainWords' | 'splits' | 'fillers' | 'dropped'
export type Tally = Record<TallyKey, number> & { examples: string[] }
export const emptyTally = (): Tally => ({ spelling: 0, shortForms: 0, capitals: 0, spacing: 0, stops: 0, wordy: 0, repeats: 0, plainWords: 0, splits: 0, fillers: 0, dropped: 0, examples: [] })
export const tallyTotal = (t: Tally) => (Object.keys(t) as (keyof Tally)[]).reduce((n, k) => n + (k === 'examples' ? 0 : (t[k] as number)), 0)

/** What the words are for — "herein" reads "in this quotation" in a quote, "in this agreement" in a contract. */
export type DocNoun = 'quotation' | 'agreement' | 'message' | 'text'

/* ── word lists ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const W = (s: string) => new RegExp(`\\b${s}\\b`, 'gi')
/** Misspellings seen in renovation quotes and studio letters → the word. */
const SPELLING: [RegExp, string][] = ([
  ['recieve', 'receive'], ['recieved', 'received'], ['seperate', 'separate'], ['seperately', 'separately'], ['accomodate', 'accommodate'], ['accomodation', 'accommodation'],
  ['guarentee', 'guarantee'], ['gaurantee', 'guarantee'], ['garantee', 'guarantee'], ['warrenty', 'warranty'], ['warrranty', 'warranty'], ['ammount', 'amount'],
  ['occured', 'occurred'], ['untill', 'until'], ['sucessful', 'successful'], ['neccessary', 'necessary'], ['necesary', 'necessary'], ['definately', 'definitely'],
  ['payement', 'payment'], ['payemnt', 'payment'], ['installtion', 'installation'], ['instalation', 'installation'], ['cabinate', 'cabinet'], ['cabinates', 'cabinets'],
  ['ceilling', 'ceiling'], ['laminte', 'laminate'], ['quotaion', 'quotation'], ['qoutation', 'quotation'], ['quatation', 'quotation'], ['renovaton', 'renovation'],
  ['maintainance', 'maintenance'], ['maintanence', 'maintenance'], ['maintenence', 'maintenance'], ['commense', 'commence'], ['alot', 'a lot'], ['wich', 'which'],
  ['thier', 'their'], ['teh', 'the'], ['adress', 'address'], ['buisness', 'business'], ['calender', 'calendar'], ['enviroment', 'environment'], ['wardobe', 'wardrobe'],
  ['wardrope', 'wardrobe'], ['waterprofing', 'waterproofing'], ['waterproffing', 'waterproofing'], ['electical', 'electrical'], ['electircal', 'electrical'],
  ['plumbling', 'plumbing'], ['carpentary', 'carpentry'], ['carpantry', 'carpentry'], ['disposel', 'disposal'], ['recomend', 'recommend'], ['reccomend', 'recommend'],
  ['recommand', 'recommend'], ['refered', 'referred'], ['begining', 'beginning'], ['comission', 'commission'], ['commision', 'commission'], ['completly', 'completely'],
  ['independant', 'independent'], ['liase', 'liaise'], ['noticable', 'noticeable'], ['occassion', 'occasion'], ['posession', 'possession'], ['tommorow', 'tomorrow'],
  ['tomorow', 'tomorrow'], ['truely', 'truly'], ['acheive', 'achieve'], ['beleive', 'believe'], ['sincerly', 'sincerely'], ['dimesion', 'dimension'],
  ['measurment', 'measurement'], ['measurments', 'measurements'], ['availible', 'available'], ['avaliable', 'available'], ['appoinment', 'appointment'],
  ['confirmaton', 'confirmation'], ['schedual', 'schedule'], ['shedule', 'schedule'], ['proceedure', 'procedure'], ['reciept', 'receipt'], ['tiels', 'tiles'],
  ['vinly', 'vinyl'], ['handel', 'handle'], ['granit', 'granite'], ['quatz', 'quartz'], ['countertops', 'countertops'],
] as [string, string][]).filter(([a, b]) => a !== b).map(([a, b]) => [W(a), b])

/** Chat short forms a document never means anything else by. (Never a lone "w", "u" or "ur": "600(w)", a list's "(u)".) */
const SHORT: [RegExp, string][] = [
  [/\bw\/o\b/gi, 'without'], [/\bw\/(?=\s|$)/gi, 'with'], [/\bw\/(?=[a-z])/gi, 'with '],
  [W('abt'), 'about'], [/\b(?:pls|plz)\b/gi, 'please'], [/\b(?:thx|tks)\b/gi, 'thanks'], [/\b(?:tmr|tmrw)\b/gi, 'tomorrow'],
  [W('qtn'), 'quotation'], [W('mtg'), 'meeting'], [W('appt'), 'appointment'], [W('b4'), 'before'], [W('msg'), 'message'],
  [/\b(?:bcos|bcoz|becos)\b/gi, 'because'], [W('wks'), 'weeks'], [W('mths'), 'months'], [W('yrs'), 'years'],
  [/\b(?:dun|dont)\b/gi, 'don’t'], [W('cant'), 'can’t'], [W('didnt'), 'didn’t'], [W('doesnt'), 'doesn’t'], [W('isnt'), 'isn’t'], [W('wasnt'), 'wasn’t'],
  [/(?<![\w'’.(-])im(?![\w'’.)-])/g, 'I’m'], [/(?<![\w'’.(-])ive(?![\w'’.)-])/g, 'I’ve'],
]
/** Written one way: "I", the studio's acronyms and names. */
const ALWAYS: [RegExp, string][] = [
  [/(?<![\w'’.(-])i(?![\w'’.)-])/g, 'I'],
  [W('hdb'), 'HDB'], [W('bto'), 'BTO'], [W('mcst'), 'MCST'], [W('gst'), 'GST'], [W('uen'), 'UEN'], [W('bca'), 'BCA'], [W('ura'), 'URA'], [W('nric'), 'NRIC'],
  [W('tv'), 'TV'], [W('asap'), 'ASAP'], [/(?<![\w.])pdf\b/gi, 'PDF'], [W('paynow'), 'PayNow'], [W('whatsapp'), 'WhatsApp'], [W('singapore'), 'Singapore'],
]
/** Days and months that are never another word (S05's Refine list) start with a capital. */
const NAMES = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|april|june|july|august|september|october|november|december|jan|feb|aug|sept|oct|nov|dec)\b/g

/** Wordy → tight, meaning kept (Improve and Shorten). */
const WORDY: [RegExp, string][] = [
  [W('in order to'), 'to'], [W('due to the fact that'), 'because'], [W('in the event that'), 'if'], [W('at this point in time'), 'now'],
  [W('at the present time'), 'now'], [W('for the purpose of'), 'for'], [W('on a daily basis'), 'daily'], [W('on a weekly basis'), 'weekly'],
  [W('on a monthly basis'), 'monthly'], [W('with regards to'), 'with regard to'], [W('could of'), 'could have'], [W('should of'), 'should have'],
  [W('would of'), 'would have'], [W('irregardless'), 'regardless'], [W('each and every'), 'every'], [W('first and foremost'), 'first'], [W('end result'), 'result'],
  [W('in the near future'), 'soon'], [W('a large number of'), 'many'], [W('in spite of the fact that'), 'although'], [W('until such time as'), 'until'],
]
/** Shorten's fillers: a sentence's lead-in that says nothing, a word that adds nothing. */
const FILLERS: [RegExp, string][] = [
  [/\b(?:please|kindly|do)\s+(?:be\s+)?(?:note|informed|advised)\s+that\s+/gi, ''], [/\bwe would like to (?:inform|let) you (?:know )?that\s+/gi, ''],
  [/\bit (?:is important to|should be) note[d]? that\s+/gi, ''], [/\b(?:as mentioned|as stated) (?:above|earlier|before),?\s*/gi, ''],
  [/\bfor your (?:information|reference),?\s*/gi, ''], [/\bat the end of the day,?\s*/gi, ''], [/\b(?:basically|actually|really|truly),?\s+/gi, ''],
  [/\bvery\s+(?=[a-z])/gi, ''], [/\bquite\s+(?=[a-z])/gi, ''],
]
/** Plain English: formal → everyday. A function word list so the quote's and the contract's own nouns are said ("in this agreement"). */
const plainList = (noun: DocNoun): [RegExp, string][] => {
  const here = noun === 'quotation' ? 'in this quotation' : noun === 'agreement' ? 'in this agreement' : 'here'
  return [
    [W('shall not'), 'will not'], [W('shall'), 'will'], [W('prior to'), 'before'], [W('subsequent to'), 'after'], [W('in the event of'), 'in case of'],
    [W('in the event that'), 'if'], [W('notwithstanding'), 'despite'], [W('pursuant to'), 'under'], [W('in accordance with'), 'in line with'],
    [/\bhereinafter (?:referred to as|called)\b/gi, 'called'], [W('herein'), here], [/\s*\bhereby\b/gi, ''], [W('thereof'), 'of it'], [W('therein'), 'in it'],
    [W('whereby'), 'where'], [W('aforementioned'), 'this'], [W('in lieu of'), 'instead of'], [W('per annum'), 'a year'], [W('forthwith'), 'at once'],
    [W('on commencement of'), 'at the start of'], [W('commencement'), 'start'], [W('commences'), 'starts'], [W('commenced'), 'started'], [W('commencing'), 'starting'], [W('commence'), 'start'],
    [W('terminates'), 'ends'], [W('terminated'), 'ended'], [W('terminate'), 'end'], [W('approximately'), 'about'], [/\bapprox\.?(?=\s)/gi, 'about'],
    [W('utilise'), 'use'], [W('utilize'), 'use'], [W('sufficient'), 'enough'], [W('obtain'), 'get'], [W('obtained'), 'got'], [W('assist'), 'help'],
    [W('endeavour to'), 'try to'], [W('endeavor to'), 'try to'], [W('is required to'), 'needs to'], [W('are required to'), 'need to'], [W('where required'), 'where needed'],
    [W('make good'), 'repair'], [W('rectified'), 'fixed'], [W('rectify'), 'fix'], [W('remedy it'), 'fix it'], [W('is borne by'), 'is paid by'], [W('are borne by'), 'are paid by'],
    [W('shall be deemed'), 'will be treated as'], [W('is deemed'), 'is treated as'], [W('indicative'), 'a guide'], [W('is warranted'), 'is guaranteed'],
    [W('are warranted'), 'are guaranteed'], [W('timely'), 'prompt'], [W('in respect of'), 'for'], [W('with respect to'), 'about'],
    [/\be\.g\.,?(?=\s)/gi, 'for example,'], [/\bi\.e\.,?(?=\s)/gi, 'that is,'], [/\bw\.e\.f\.?(?=\s)/gi, 'from'],
    [/\bFOC\b/g, 'free of charge'], [/\bVOs\b/g, 'variation orders'], [/\bVO\b/g, 'variation order'], [/\bT&Cs?\b/g, 'terms and conditions'],
    [W('qty'), 'quantity'], [W('pcs'), 'pieces'],
    /* a studio letter's formal turns (the cover's "for your kind perusal and consideration") */
    [W('for your kind perusal and consideration'), 'for you to read and consider'], [/\bfor your (?:kind )?perusal\b/gi, 'for you to read'],
    [W('please find attached'), 'attached is'], [W('please find enclosed'), 'enclosed is'], [W('do not hesitate to'), 'feel free to'],
    [W('at your earliest convenience'), 'as soon as you can'], [/\bplease kindly\b/gi, 'please'], [/(?:^|(?<=[.!?]\s))Kindly\b/g, 'Please'], [W('we are pleased to'), 'we are happy to'],
    [/\bHomeowner\/Client\b/g, 'Client'], [/\bContractor\/Company\b/g, 'Contractor'],
  ]
}
const SHOULD_VERBS = /^(cancel|wish|require|need|want|decide|fail|choose|request|delay|change|terminate|end|proceed)$/i

const keepCase = (from: string, to: string) => (to && from[0] && from[0] === from[0].toUpperCase() && from[0] !== from[0].toLowerCase() ? to[0]!.toUpperCase() + to.slice(1) : to)
/** "cancel" → "cancels" for "the Client" (a third person); "you" / "we" / "they" keep the verb. */
const thirdPerson = (v: string) => (/(s|sh|ch|x|z|o)$/i.test(v) ? `${v}es` : /[^aeiou]y$/i.test(v) ? `${v.slice(0, -1)}ies` : `${v}s`)

/** A full stop that ends an abbreviation, not a sentence (S05's list, + the quote's "No." and "Blk."). */
const ABBREV = /(?:^|[\s(\uf000])(?:i\.e|e\.g|etc|approx|a\.m|p\.m|no|nos|vs|mr|mrs|ms|mdm|dr|st|ave|blk|jln|lor|cf|pte|ltd|w\.e\.f)\.$/i
const endsSentence = (s: string) => /[.!?]["”’)]*\s*$/.test(s) && !ABBREV.test(s.replace(/["”’)]*\s*$/, ''))

/* ── one block's text parts, decoded and masked while the rules run ─────────────────────────────────────────────────────── */
type Work = { parts: Part[]; texts: Map<number, string> }
function open(block: Block, masks: Masks): Work {
  const parts = partsOf(block.html)
  const texts = new Map<number, string>()
  parts.forEach((p, i) => { if (p.k === 'text') texts.set(i, masks.mask(decodeText(p.s))) })
  return { parts, texts }
}
function close(w: Work, masks: Masks): string {
  return joinParts(w.parts.map((p, i) => (w.texts.has(i) ? { ...p, s: encodeText(masks.unmask(w.texts.get(i)!)) } : p)))
}
/** Replace in every text part, counting each change under `key` (and keeping a few "from → to" examples). */
function each(w: Work, list: readonly [RegExp, string][], t: Tally, key: TallyKey, example = false) {
  for (const [i, s0] of w.texts) {
    let s = s0
    for (const [re, to] of list) {
      s = s.replace(re, (m) => {
        const out = keepCase(m, to)
        if (out === m) return m
        t[key]++
        if (example && t.examples.length < 4) { const ex = `${m.trim().toLowerCase()} → ${out.trim().toLowerCase() || '(out)'}`; if (!t.examples.includes(ex)) t.examples.push(ex) }
        return out
      })
    }
    w.texts.set(i, s)
  }
}
const isList = (b: Block) => b.tag === 'ul' || b.tag === 'ol'
const isProse = (b: Block) => !isList(b) && !isHeading(b) && b.tag !== 'hr' && b.tag !== 'table' && b.tag !== 'pre'

/** Spacing and marks, inside each text part: one space between words, none before a mark, one after a comma, "!!!" → "!". */
function spacing(w: Work, t: Tally) {
  for (const [i, s0] of w.texts) {
    let n = 0
    const s = s0
      .replace(/(?<!\.)\.\.(?!\.)/g, () => { n++; return '.' })
      .replace(/(\S) {2,}(?=\S)/g, (_m, a: string) => { n++; return `${a} ` })
      .replace(/(\S) +([,;:!?])/g, (_m, a: string, b: string) => { n++; return `${a}${b}` })
      .replace(/(\w) +\.(?=\s|$)/g, (_m, a: string) => { n++; return `${a}.` })
      .replace(/([!?])\1+/g, (_m, a: string) => { n++; return a }).replace(/,{2,}/g, () => { n++; return ',' })
      .replace(/([,;:])(?=[A-Za-z])/g, (_m, a: string) => { n++; return `${a} ` })
      .replace(/(?<=[a-z)])\.(?=[A-Z][a-z])/g, () => { n++; return '. ' })
    t.spacing += n
    w.texts.set(i, s)
  }
}
/** A word typed twice ("the the") — never "that that" or "had had", which can be meant. */
function repeats(w: Work, t: Tally) {
  for (const [i, s] of w.texts) w.texts.set(i, s.replace(/\b([A-Za-z]{2,})(\s+)\1\b/gi, (m, a: string) => { if (/^(that|had)$/i.test(a)) return m; t.repeats++; return a }))
}
/** People's names that are also everyday words — never capitalised by the names rule ("may", "will", "grace"). */
const COMMON = /^(may|june|april|august|will|mark|grace|hope|joy|faith|rose|ivy|jade|dawn|summer|rich|page|bill|sky|sunny|rain|star|sun|day|king|young|long|wing|chin|ho|tan|teo|lim|ng|by|so|see|low|chan|sim|mo|lee|ong)$/i
/** The people on the record written their way ("olivia" → "Olivia") — the client's and the preparer's names, never a common word. */
function names(w: Work, list: readonly string[], t: Tally) {
  for (const name of list) {
    for (const word of name.split(/\s+/).filter((x) => x.length > 2 && /^[A-Z]/.test(x) && /^[\p{L}’'-]+$/u.test(x) && !COMMON.test(x))) {
      const re = new RegExp(`(?<![\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu')
      for (const [i, s] of w.texts) w.texts.set(i, s.replace(re, (m) => { if (m === word) return m; t.capitals++; return word }))
    }
  }
}
/** Every sentence opens on a capital: at a block or list item's start, after <br>, and after ". " / "! " / "? ". */
function sentenceCase(w: Work, t: Tally) {
  let atStart = true
  w.parts.forEach((p, i) => {
    if (p.k === 'tag') { if (/^<\s*(li|br|p|div|h[1-6]|blockquote)\b/i.test(p.s)) atStart = true; return }
    if (p.k === 'atom') { atStart = false; return }
    const s0 = w.texts.get(i)
    if (s0 === undefined) return
    const s = s0.replace(/(^\s*|[.!?]["”’)]*\s+)([a-z])/g, (m, lead: string, ch: string, at: number) => {
      if (at === 0 && !/[.!?]/.test(lead) && !atStart) return m   // the run starts mid-sentence (after a bold word, a chip)
      if (/[.!?]/.test(lead) && !endsSentence(s0.slice(0, at + lead.length))) return m   // "e.g. the" — an abbreviation, the sentence goes on
      t.capitals++
      return `${lead}${ch.toUpperCase()}`
    })
    w.texts.set(i, s)
    if (/\S/.test(s)) atStart = endsSentence(s)
  })
}
/** A paragraph of four words or more whose sentence ends on a letter gets its full stop (never a heading, a list, a line ending on ":",
    a link, a field or a chip). */
function endStop(w: Work, t: Tally) {
  let last = -1
  w.parts.forEach((p, i) => { if (p.k === 'atom') last = -2; else if (p.k === 'text' && /\S/.test(w.texts.get(i) ?? '')) last = i })
  if (last < 0) return
  const words = [...w.texts.values()].join(' ').trim().split(/\s+/).filter(Boolean).length
  const s = w.texts.get(last)!.replace(/\s+$/, '')
  const tail = w.texts.get(last)!.slice(s.length)
  const first = [...w.texts.values()].join(' ').trim()
  if (words <= 5 && /^(hi|hello|hey|dear|regards|best|warm|kind|thanks|thank you|cheers|sincerely|yours)\b/i.test(first)) return   // a greeting or a sign-off line never takes one
  if (w.parts.find((p) => p.k !== 'tag' && (p.k === 'atom' || /\S/.test(p.s.replace(/&nbsp;/g, ' '))))?.k === 'atom') return   // a caption under a chip or a signature box ("Client name, the Client")
  if (words >= 4 && /[\p{L}\p{N})’'"”]$/u.test(s) && !/[.!?:;…,]["”’)]*$/.test(s)) { w.texts.set(last, `${s}.${tail}`); t.stops++ }
}

/** The rule sets' common walk: each block opened, worked, closed. */
function walk(html: string, fn: (w: Work, b: Block) => void): string {
  const masks = new Masks()
  return blocksOf(html).map((b) => { const w = open(b, masks); fn(w, b); return close(w, masks) }).join('')
}

/* ── Improve ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** `stops: false` — a line's description or a section note: quotes write those as phrases ("Matt finish, rectified edges"), never sentences. */
export function improveHtml(html: string, opts: { names?: readonly string[]; stops?: boolean } = {}): { html: string; tally: Tally } {
  const t = emptyTally()
  const out = walk(html, (w, b) => {
    each(w, SPELLING, t, 'spelling', true)
    each(w, SHORT, t, 'shortForms', true)
    each(w, ALWAYS, t, 'capitals')
    for (const [i, s] of w.texts) w.texts.set(i, s.replace(NAMES, (m) => { t.capitals++; return m[0]!.toUpperCase() + m.slice(1) }))
    if (opts.names?.length) names(w, opts.names, t)
    repeats(w, t)
    each(w, WORDY, t, 'wordy', true)
    spacing(w, t)
    sentenceCase(w, t)
    if (isProse(b) && opts.stops !== false) endStop(w, t)
  })
  return { html: out, tally: t }
}

/* ── Plain English ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
export function plainHtml(html: string, noun: DocNoun): { html: string; tally: Tally } {
  const t = emptyTally()
  const list = plainList(noun)
  const out = walk(html, (w) => {
    each(w, list, t, 'plainWords', true)
    /* "Should the Client cancel …, …" → "If the Client cancels …, …" — at a sentence's start, with its comma after */
    for (const [i, s] of w.texts) {
      w.texts.set(i, s.replace(/(^|[.!?]\s+)Should (the [A-Z][a-z]+|either party|you|we|they) ([a-z]+)\b(?=[^.!?]*,)/g, (m, lead: string, who: string, verb: string) => {
        if (!SHOULD_VERBS.test(verb)) return m
        t.plainWords++
        if (t.examples.length < 4 && !t.examples.includes('should … → if …')) t.examples.push('should … → if …')
        return `${lead}If ${who} ${/^(you|we|they)$/i.test(who) ? verb : thirdPerson(verb)}`
      }))
    }
    /* a sentence of more than 30 words is split at its semicolon, when both halves read as sentences (five words or more) */
    for (const [i, s] of w.texts) {
      w.texts.set(i, s.replace(/[^.!?]+[.!?]?/g, (sentence) => {
        if (sentence.split(/\s+/).filter(Boolean).length <= 30) return sentence
        const at = sentence.indexOf('; ')
        if (at < 0) return sentence
        const a = sentence.slice(0, at), b = sentence.slice(at + 2)
        if (a.trim().split(/\s+/).length < 5 || b.trim().split(/\s+/).length < 5 || !/^[a-z]/.test(b)) return sentence
        t.splits++
        return `${a}. ${b[0]!.toUpperCase()}${b.slice(1)}`
      }))
    }
    spacing(w, emptyTally())   // a dropped "hereby" leaves no double space (never counted as a fix of its own)
  })
  return { html: out, tally: t }
}

/* ── Shorten ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
type Piece = { part: number; from: number; to: number }
type Sentence = { pieces: Piece[]; text: string; atom: boolean }
/** A block's sentences, read across its bold, links and chips. */
function sentencesOf(w: Work): Sentence[] {
  const out: Sentence[] = []
  let cur: Sentence = { pieces: [], text: '', atom: false }
  w.parts.forEach((p, i) => {
    if (p.k === 'atom') { cur.atom = true; cur.text += ATOM_MARK; return }
    if (p.k !== 'text') return
    const s = w.texts.get(i) ?? ''
    let start = 0
    for (const m of s.matchAll(/[.!?]["”’)]*(?:\s+|$)/g)) {
      const end = m.index! + m[0].length
      if (!endsSentence(cur.text + s.slice(start, end))) continue
      cur.pieces.push({ part: i, from: start, to: end }); cur.text += s.slice(start, end)
      out.push(cur); cur = { pieces: [], text: '', atom: false }; start = end
    }
    if (start < s.length) { cur.pieces.push({ part: i, from: start, to: s.length }); cur.text += s.slice(start) }
  })
  if (cur.pieces.length || cur.atom) out.push(cur)
  return out.filter((x) => x.atom || /\S/.test(x.text))
}
/** A fact a short version keeps: a figure, a date, a percentage, money, a link / email / field (masked), a chip. */
const carriesFact = (s: Sentence) => s.atom || /[\d%$]|[\ue000-\uefff]/.test(s.text)

export function shortenHtml(html: string): { html: string; tally: Tally; words: { before: number; after: number } } {
  const t = emptyTally()
  const out = walk(html, (w, b) => {
    each(w, FILLERS, t, 'fillers')
    each(w, WORDY, t, 'wordy')
    /* a filler taken from a sentence's start leaves its first word in lower case: open it again on a capital */
    sentenceCase(w, emptyTally())
    if (!isProse(b)) return
    const ss = sentencesOf(w)
    if (ss.length < 2) return
    const drop: Piece[] = []
    ss.forEach((s, k) => { if (k > 0 && !carriesFact(s)) { drop.push(...s.pieces); t.dropped++ } })
    /* cut each dropped piece from its text part, last first so the offsets hold */
    for (const d of drop.sort((a, b) => b.part - a.part || b.from - a.from)) {
      const s = w.texts.get(d.part)!
      w.texts.set(d.part, s.slice(0, d.from) + s.slice(d.to))
    }
    /* what is left ends on its sentence's full stop, not a trailing space */
    let last = -1
    w.parts.forEach((p, i) => { if (p.k !== 'tag') last = i })
    if (last >= 0 && w.texts.has(last)) w.texts.set(last, w.texts.get(last)!.replace(/\s+$/, ''))
  })
  /* a bold or a link whose words all went goes with them */
  const cleaned = out.replace(/<(strong|b|em|i|u|s|a)(\s[^>]*)?>\s*<\/\1>/gi, '')
  return { html: cleaned, tally: t, words: { before: wordCount(html), after: wordCount(cleaned) } }
}
