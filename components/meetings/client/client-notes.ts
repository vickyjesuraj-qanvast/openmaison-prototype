/**
 * (pending modules S23 — the client's meeting link, `/meeting/<token>`) What of a meeting's brief the client reads once the studio shares the
 * notes: the summary and the next steps — and, when ticked, the rough estimate and the mood boards (lib/meetings/model.ts `ShareOptions`).
 * Pure and client-safe, so the studio's share preview can show the very copy the client gets.
 *
 * The brief is written for the studio (lib/meetings/brief.ts): its summary can say which other studios the client is talking to and what
 * they doubted, and its next steps can name a sales move ("Offer a line-by-line comparison with the other quote"). Competitors and objections
 * never reach a client (S23's rule), so a sentence or a step that names one is left out here — whatever the studio typed, edited or not.
 *
 * (S42 audit C-01 · C-05, call C·2 as recommended — her "build all of them" 2026-10-11; listed in s42/calls-for-vicky.md for her review) The
 * link is written TO the client: the summary in "we / your" ("We met in person for a first consultation on Wed, 14 Oct. We talked about the
 * kitchen in your semi-D."), and the next steps are only what the studio will do for them, said so ("We’ll prepare the quote for the
 * kitchen"). The designer's own notes never go — the checklist's "Ask about …" (what to find out next time), "Send the follow-up message"
 * (the message the link rides in). A step the studio typed that is the client's to do ("Send us the floor plan") stays as typed.
 * *(invented copy: the rewritten sentences' "We met", "We talked about", "We’ll …")*
 */
import type { MeetingBrief } from '@/lib/meetings/model'

/** The longest note a client's "The time doesn’t suit" carries — the page's field and the server both hold to it. */
export const ANSWER_NOTE_MAX = 500

/** The words that mark a sentence about competitors or the client's doubts — the brief's own phrasing for them (brief.ts) — and the brief's
    note to the studio that nothing was written down. */
const PRIVATE = /\b(no notes were taken|also talking to|comparing studios|other (quote|studio|studios|designer|designers|firm|firms)|competitor|competitors|comparison|raised [^.]*\b(concerns?|doubts?))\b/i
/** (S42 C-01) The designer's own steps — what to ask next time (the checklist's misses, brief.ts `Ask about …`) and the follow-up message itself. */
const STUDIO_ONLY = /^(ask\b|send the follow-up message\b)/i
/** (S42 C-01) A step that is the studio's to do starts with one of these — said to the client as "We’ll …". */
const DO_VERBS = new Set(['prepare', 'send', 'share', 'confirm', 'set', 'show', 'book', 'arrange', 'draft', 'call', 'follow', 'visit', 'measure', 'schedule',
  'update', 'revise', 'email', 'whatsapp', 'message', 'text', 'check', 'get', 'make', 'bring', 'plan', 'find', 'give', 'write', 'propose', 'recommend',
  'suggest', 'review', 'finalise', 'finalize', 'order', 'source', 'quote', 'render', 'design', 'sketch', 'meet', 'organise', 'organize', 'invite', 'walk',
  'put', 'look', 'take', 'drop', 'pick', 'work', 'price', 'cost', 'estimate', 'list', 'mark', 'note'])

const named = (text: string, names: string[]) => names.some((n) => n.trim().length > 1 && text.toLowerCase().includes(n.trim().toLowerCase()))
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** (S42 C-05) "they / their / them" → "you / your" — the brief speaks of the client; the link speaks to them. Contractions first. */
const PRONOUNS: [RegExp, string][] = [
  [/\bThey(’|')re\b/g, 'You$1re'], [/\bthey(’|')re\b/g, 'you$1re'], [/\bThey(’|')ll\b/g, 'You$1ll'], [/\bthey(’|')ll\b/g, 'you$1ll'],
  [/\bThey(’|')ve\b/g, 'You$1ve'], [/\bthey(’|')ve\b/g, 'you$1ve'], [/\bThey(’|')d\b/g, 'You$1d'], [/\bthey(’|')d\b/g, 'you$1d'],
  [/\bThey\b/g, 'You'], [/\bthey\b/g, 'you'], [/\bTheir\b/g, 'Your'], [/\btheir\b/g, 'your'], [/\bthemselves\b/g, 'yourselves'], [/\bthem\b/g, 'you'],
]
const toYou = (s: string) => PRONOUNS.reduce((t, [re, to]) => t.replace(re, to), s)

/** One summary sentence, said to the client: "Met Kevin in person for …" → "We met in person for …"; "They talked about the kitchen in their
    semi-D" → "We talked about the kitchen in your semi-D"; "they like a Japandi look" → "you like a Japandi look". */
function sentenceToClient(s: string, client: string | null): string {
  let t = s
  const first = client?.trim().split(/\s+/)[0] ?? ''
  if (first && new RegExp(`^Met ${escape(first)}\\b`, 'i').test(t)) t = t.replace(new RegExp(`^Met ${escape(first)}\\b`, 'i'), 'We met')
  else t = t.replace(/^Met \S+ (in person|on a video call|at the showroom)\b/i, 'We met $1')
  t = t.replace(/^They talked about\b/, 'We talked about')
  return toYou(t)
}

/** One summary sentence at a time: "Met Sophia in person … on Wed, 14 Oct." stays (said to them); "They raised price concerns and are also
    talking to …" goes. */
export function clientSummary(summary: string, competitors: string[], client: string | null = null): string {
  const sentences = summary.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? []
  return sentences.map((s) => s.trim()).filter((s) => s && !PRIVATE.test(s) && !named(s, competitors)).map((s) => sentenceToClient(s, client)).join(' ')
}

/** (S42 C-01) One step, said to the client: the studio's "Prepare the quote for the kitchen" → "We’ll prepare the quote for the kitchen";
    "Send Kevin a summary to share at home with their spouse" → "We’ll send you a summary to share at home with your spouse". A step that is
    the client's own ("Send us the floor plan") or doesn't start with a doing word stays as typed. */
function stepToClient(a: string, client: string | null): string {
  if (/\b(us|our)\b/i.test(a)) return a
  const first = client?.trim().split(/\s+/)[0] ?? ''
  let t = first ? a.replace(new RegExp(`\\b${escape(first)}(’|')s\\b`, 'gi'), 'your').replace(new RegExp(`\\b${escape(first)}\\b`, 'gi'), 'you') : a
  t = toYou(t)
  const verb = t.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''
  return DO_VERBS.has(verb) ? `We’ll ${t.charAt(0).toLowerCase()}${t.slice(1)}` : t
}

/** The next steps the client reads — the studio's steps for them, less any that names a competitor or a sales move against one, and less the
    designer's own notes (S42 C-01). */
export function clientNextSteps(actions: string[], competitors: string[], client: string | null = null): string[] {
  return actions.map((a) => a.replace(/\s+/g, ' ').trim()).filter((a) => a && !PRIVATE.test(a) && !STUDIO_ONLY.test(a) && !named(a, competitors))
    .map((a) => stepToClient(a, client)).slice(0, 8)
}

/** The parts of the brief a shared link may carry — the projection reads only these. `client` — the client's name, so the link says "you". */
export function clientNotesOf(brief: MeetingBrief, client: string | null = null): { summary: string; next: string[] } {
  const rivals = Array.isArray(brief.profile?.competitors) ? brief.profile.competitors.filter((c): c is string => typeof c === 'string') : []
  const actions = Array.isArray(brief.actions) ? brief.actions.filter((a): a is string => typeof a === 'string') : []
  return { summary: clientSummary(typeof brief.summary === 'string' ? brief.summary : '', rivals, client), next: clientNextSteps(actions, rivals, client) }
}
