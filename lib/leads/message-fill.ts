/**
 * (Leads on the move, L3 — P-08 · A-19, his marks 2026-10-23, "continue the leads") "Paste the WhatsApp message to fill the rest": a lead arrives as
 * a forwarded message more often than as a file, and a message is written in the first person — "Hi, I'm Rachel, looking to renovate my 4-room at
 * Blk 123 Bedok North Ave 1 #08-12, call me 9334 1209". The document read (`lib/leads/document-fill.ts`, S42F) takes a name only beside an email,
 * after "My name is" or signing the message, and never reads an address out of a sentence. This reads a message first by the words a message uses,
 * then hands the rest to the document's rule — so what one fills, the other fills the same way. Pure, by rule, nothing leaves the browser.
 *   · a WhatsApp chat export or a copied bubble ("[23/10/26, 10:15 AM] Rachel Ong: Hi…", "23/10/2026, 10:15 am - Rachel Ong: Hi…") — the
 *     sender is the name when it reads as a person's (never a member of the studio), and the words after the colon are the message;
 *   · "I'm Rachel Ong" · "I am Rachel" · "This is Rachel" · "Rachel here" — a name as it introduces itself;
 *   · an address inside a sentence — "Blk 123 Bedok North Ave 1 #08-12" — from the block to the unit (or the postal code).
 * Only what plainly appears once is taken; anything else is left to the person.
 */
import { looksLikeName, readLeadText, type DocumentRead, type FillContext } from './document-fill'

/** A copied chat line: "[23/10/26, 10:15:12 AM] Rachel Ong: …" or "23/10/2026, 10:15 am - Rachel Ong: …". */
const CHAT_LINE = /^\s*\[?\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}[:.]\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?\s*\]?\s*(?:-\s*)?([^:]{2,40}):\s?(.*)$/i
const INTRO = [
  /\b(?:[Ii]['’]?m|[Ii] am|[Tt]his is|[Mm]y name is|[Ii]t['’]?s)\s+([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){0,3})/,
  /^\s*(?:[Hh]i|[Hh]ello|[Hh]ey)?[,!\s]*([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){0,2})\s+here\b/m,
]
/* from the block to the unit, or to a postal code — inside a sentence */
const ADDRESS = /\b(?:blk|block)\s*\d+[a-z]?\b[^,.;\n!?]*?(?:#\s?\d{1,2}-\d{1,4}|singapore\s*\d{6}|\b\d{6}\b)/i

/** The words after a chat line's sender, and the senders a message names (a person's name, never a studio member's). */
function unwrapChat(text: string, members: readonly string[]): { lines: string[]; sender: string | null } {
  const own = new Set(members.map((m) => m.trim().toLowerCase()))
  const senders = new Set<string>()
  const lines = text.split(/\r?\n/).map((l) => {
    const m = l.match(CHAT_LINE)
    if (!m) return l
    const who = m[1]!.trim()
    if (looksLikeName(who) && !own.has(who.toLowerCase())) senders.add(who)
    return own.has(who.toLowerCase()) ? '' : m[2]!   // the studio's own replies are not the client's words
  })
  return { lines, sender: senders.size === 1 ? [...senders][0]! : null }
}

/** A pasted message, read by the message's words first, then by the document's rule. */
export function readLeadMessage(text: string, ctx: FillContext & { memberNames?: readonly string[] }): DocumentRead {
  const { lines, sender } = unwrapChat(text, ctx.memberNames ?? [])
  const body = lines.join('\n')
  const read = readLeadText(lines, ctx)
  const fill = read.ok ? { ...read.fill } : {}
  if (!read.ok && read.reason === 'many') return read
  if (!fill.name) {
    const said = INTRO.map((re) => body.match(re)?.[1]?.trim()).filter((n): n is string => !!n && looksLikeName(n))
    const name = sender ?? (new Set(said).size === 1 ? said[0] : undefined)
    if (name) fill.name = name.slice(0, 80)
  }
  if (!fill.propertyAddress) {
    const found = [...new Set([...body.matchAll(new RegExp(ADDRESS, 'gi'))].map((m) => m[0].replace(/\s+/g, ' ').trim()))]
    if (found.length === 1) fill.propertyAddress = found[0]!.slice(0, 200)
  }
  return Object.keys(fill).length ? { ok: true, fill } : { ok: false, reason: 'nothing' }
}
