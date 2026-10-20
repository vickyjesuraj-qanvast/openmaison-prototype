/**
 * (pending modules S05 — card held:leads, "Notes › AI chip › Refine — Coming soon · his call (REG-185) · keep without a model") Refine, by
 * rule: a quick note typed on site reads cleanly — the studio's chat shorthand spelt out ("w/" → "with", "abt" → "about", "tmr" →
 * "tomorrow", "qtn" → "quotation"…), every sentence opening on a capital, "i" as "I", one space between words and one after a comma or a
 * full stop, no space before one, no "!!!", and a full stop where a line of words ends without one. Nothing is reworded beyond that and no
 * model is called: the note's facts, its formatting (bold, lists) and its numbers ("S$1,500", "1.5m") stay exactly as typed. Pure and
 * client-safe; the editor applies it with Undo.
 */

/** Shorthand → words. Matched as whole words, any case; the replacement keeps a capital the shorthand started with. */
const SHORTHAND: [RegExp, string][] = [
  [/\bw\/o\b/gi, 'without'],
  [/\bw\/(?=\s|$)/gi, 'with'],
  [/\bw\/(?=[a-z])/gi, 'with '],
  [/(?<![\w'’-])w(?![\w'’\/-])/g, 'with'],
  [/\babt\b/gi, 'about'],
  [/\b(?:pls|plz)\b/gi, 'please'],
  [/\b(?:thx|tks|tq)\b/gi, 'thanks'],
  [/\b(?:tmr|tmrw|tml)\b/gi, 'tomorrow'],
  [/\bmtg\b/gi, 'meeting'],
  [/\bappt\b/gi, 'appointment'],
  [/\bapprox\b/gi, 'approximately'],
  [/\breno\b/gi, 'renovation'],
  [/\bqtn\b/gi, 'quotation'],
  [/\b(?:bcos|bcoz)\b/gi, 'because'], [/(?<![\w'’.-])bc(?![\w'’.-])/g, 'because'],
  [/\bb4\b/gi, 'before'],
  [/\bmsg\b/gi, 'message'],
  [/\bwk\b/gi, 'week'], [/\bwks\b/gi, 'weeks'],
  [/\bmth\b/gi, 'month'], [/\bmths\b/gi, 'months'],
  [/\byr\b/gi, 'year'], [/\byrs\b/gi, 'years'],
  [/\b(?:dun|dont)\b/gi, 'don’t'], [/\bcant\b/gi, 'can’t'], [/\bdidnt\b/gi, 'didn’t'], [/\bdoesnt\b/gi, 'doesn’t'], [/\bisnt\b/gi, 'isn’t'], [/\bwasnt\b/gi, 'wasn’t'],
  [/(?<![\w'’-])ur(?![\w'’-])/g, 'your'],
  [/(?<![\w'’-])u(?![\w'’-])/g, 'you'],
]
/** Words that are always written one way. */
const capital = (m: string) => m[0]!.toUpperCase() + m.slice(1)
/** Days and months (the ones that are never another word) start with a capital. */
const NAMES = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|april|june|july|august|september|october|november|december|jan|feb|aug|sep|sept|oct|nov|dec)\b/g
const ALWAYS: [RegExp, string][] = [
  [/\btv\b/gi, 'TV'],
  [/\basap\b/gi, 'ASAP'], [/\bhdb\b/gi, 'HDB'], [/\bbto\b/gi, 'BTO'], [/\bmrt\b/gi, 'MRT'], [/\bsqft\b/gi, 'sq ft'],
  [/(?<![\w'’.-])i(?![\w'’.-])/g, 'I'], [/(?<![\w'’.-])im(?![\w'’.-])/g, 'I’m'], [/(?<![\w'’.-])ive(?![\w'’.-])/g, 'I’ve'], [/\bill\b(?=\s+(?:call|check|send|update|follow|get|ask|try|come|bring|share))/g, 'I’ll'],
]
const BLOCK = /^<\/?(?:div|p|li|ul|ol|h[1-6]|blockquote)\b|^<br\b/i
const LI_OPEN = /^<li\b/i, LI_CLOSE = /^<\/li>/i

/** A full stop that ends an abbreviation, not a sentence: "e.g." · "i.e." · "etc." · "approx." · "a.m." · "Mr." · "Blk."… */
const ABBREV = /(?:^|[\s(])(?:i\.e|e\.g|etc|approx|a\.m|p\.m|no|vs|mr|mrs|ms|mdm|dr|st|ave|blk|jln|lor|cf|pte|ltd)\.$/i
const endsSentence = (s: string) => /[.!?]\s*$/.test(s) && !ABBREV.test(s.replace(/\s+$/, ''))
const keepCase = (from: string, to: string) => (from[0] && from[0] === from[0].toUpperCase() && from[0] !== from[0].toLowerCase() ? to[0]!.toUpperCase() + to.slice(1) : to)

/** One run of text: shorthand, the always-words, spacing, repeated marks. Counts what changed. */
function tidy(text: string, count: (n: number) => void): string {
  let t = text.replace(/&nbsp;/g, ' ')
  const before = t
  for (const [re, to] of SHORTHAND) t = t.replace(re, (m) => keepCase(m, to))
  for (const [re, to] of ALWAYS) t = t.replace(re, to)
  t = t.replace(NAMES, capital)
  t = t.replace(/ {2,}/g, ' ')                               // one space between words
    .replace(/ +([,.;:!?])/g, '$1')                          // none before a mark
    .replace(/([!?])\1+/g, '$1').replace(/,{2,}/g, ',')      // "!!!" → "!"
    .replace(/([,;:!?])(?=[A-Za-z])/g, '$1 ')                // one after a comma or a mark (never inside "S$1,500")
    .replace(/(?<=[a-z)])\.(?=[A-Z][a-z])/g, '. ')            // …and after a full stop that ends a sentence (never "1.5m", "a.m.", "hafary.com")
  if (t !== before) count(1)
  return t
}

/** The note refined, and how many fixes it took (0 = it already read cleanly). */
export function refineNoteHtml(html: string): { html: string; changes: number } {
  let changes = 0
  const count = (n: number) => { changes += n }
  const parts = html.split(/(<[^>]+>)/)
  let atStart = true            // the next letter opens a sentence
  let inLi = 0
  let lineLast = -1             // the line's last text part, for its full stop
  let lineWords = 0
  const endLine = () => {
    if (lineLast >= 0 && !inLi && lineWords >= 3) {
      const t = parts[lineLast]!.replace(/\s+$/, '')
      if (/[A-Za-z0-9)’']$/.test(t) && !/[.!?:;…]$/.test(t)) { parts[lineLast] = `${t}.`; changes++ }
    }
    lineLast = -1; lineWords = 0
  }
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!
    if (p.startsWith('<')) {
      if (BLOCK.test(p)) { endLine(); atStart = true }
      if (LI_OPEN.test(p)) inLi++
      if (LI_CLOSE.test(p)) inLi = Math.max(0, inLi - 1)
      continue
    }
    if (!p) continue
    let t = tidy(p, count)
    /* a sentence opens on a capital: at the line's start and after ". " / "! " / "? " */
    t = t.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, lead: string, ch: string, at: number) => {
      if (at === 0 && !/[.!?]/.test(lead) && !atStart) return m   // the run starts mid-sentence (after a bold word, say)
      if (/[.!?]/.test(lead) && !endsSentence(t.slice(0, at + 1))) return m   // "e.g. the" — an abbreviation, the sentence goes on
      changes++
      return `${lead}${ch.toUpperCase()}`
    })
    if (/\S/.test(t)) {
      lineLast = i
      lineWords += t.trim().split(/\s+/).filter(Boolean).length
      atStart = endsSentence(t)
    }
    parts[i] = t
  }
  endLine()
  return { html: parts.join(''), changes }
}

/** A title refined the same way, less the full stop a title never ends with. */
export function refineTitle(title: string): { title: string; changes: number } {
  let changes = 0
  let t = tidy(title, (n) => { changes += n }).trim()
  if (/^[a-z]/.test(t)) { t = t[0]!.toUpperCase() + t.slice(1); changes++ }
  return { title: t, changes }
}
