/**
 * (parity map 2026-10-10, UC-068 — 1.0's `ai-suggestions.ts`) Suggested replies — pure and client-safe. Under the client's newest message that
 * nobody has answered yet, up to two replies drawn BY RULE from its words: the table below (a phrase the client might use → a reply a studio
 * would send), grounded in 1.0's map and a Singapore renovation's usual asks — the first two rows the message matches, else the plain
 * acknowledgement 1.0 offered. A tap fills the box — nothing is ever sent by itself. A stand-in: no model reads the message.
 */

type Rule = { words: readonly string[]; reply: (first: string) => string }

/** Each row: any of its words in the client's message (whole words, any case) offers its reply. Order = how sure the match is. */
const RULES: readonly Rule[] = [
  { words: ['when can you come', 'when will you come', 'when are you coming', 'come down', 'come over', 'site visit', 'visit the site', 'drop by'], reply: () => 'Let me check the schedule and get back to you today with a time.' },
  { words: ['reschedule', 'postpone', 'something came up', 'can’t make it', "can't make it", 'cannot make it'], reply: () => 'No problem at all — tell me a day and time that suit you and I’ll move it.' },
  { words: ['when will', 'how long', 'timeline', 'finish', 'done by', 'completed by', 'handover date', 'delay', 'delayed', 'behind'], reply: () => 'I’ll check with the team and send you the latest schedule today.' },
  { words: ['leak', 'leaking', 'crack', 'cracked', 'stain', 'scratch', 'damage', 'damaged', 'broken', 'defect', 'chipped', 'mould', 'mold'], reply: () => 'Sorry about that — could you send a photo? We’ll arrange for someone to take a look.' },
  { words: ['invoice', 'payment', 'pay', 'paynow', 'bank transfer', 'deposit', 'receipt'], reply: () => 'I’ll send the payment details over now — the invoice is on your page under Money too.' },
  { words: ['quote', 'quotation', 'price', 'cost', 'how much', 'budget', 'cheaper'], reply: () => 'Let me go through the numbers and get back to you with the details.' },
  { words: ['socket', 'power point', 'switch', 'wiring', 'electrical', 'light point', 'lights', 'aircon', 'air-con'], reply: () => 'Let me check with our electrician where it can go, and come back to you today.' },
  { words: ['change', 'add', 'extra', 'instead', 'swap', 'variation'], reply: () => 'Noted — I’ll price the change and send it to you to approve before we go ahead.' },
  { words: ['tile', 'tiles', 'laminate', 'vinyl', 'paint', 'colour', 'color', 'sample', 'samples', 'material', 'materials', 'finish'], reply: () => 'Good question — I’ll bring the samples on our next visit so you can see them in the room.' },
  { words: ['delivery', 'deliver', 'delivered', 'arrive', 'arriving', 'install', 'installation'], reply: () => 'I’ll confirm the date with the supplier and let you know.' },
  { words: ['permit', 'hdb', 'mcst', 'approval', 'condo management', 'renovation permit'], reply: () => 'We handle the permit for you — I’ll update you once it’s approved.' },
  { words: ['noise', 'neighbour', 'neighbor', 'working hours', 'weekend', 'sunday'], reply: () => 'Understood — we keep to the permitted hours and will remind the team.' },
  { words: ['key', 'keys', 'access card', 'gate', 'lock'], reply: () => 'Thanks — let me know when the keys are ready and I’ll arrange a pick-up.' },
  { words: ['floor plan', 'floorplan', 'drawing', 'drawings', 'layout', '3d'], reply: () => 'Thanks for sharing — I’ll review it and come back to you by end of day.' },
  { words: ['photo', 'photos', 'picture', 'update', 'progress'], reply: () => 'I’ll send you photos from site after today’s works.' },
  { words: ['thank', 'thanks', 'great job', 'love it', 'looks great', 'happy with'], reply: (first) => `Thank you, ${first} — that means a lot to the team!` },
]
/** 1.0's reply when nothing matched. */
const FALLBACK = (first: string) => `Thanks, ${first}! Let me look into this and get back to you shortly.`

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const said = (text: string, w: string) => new RegExp(`(^|[^a-z0-9])${esc(w.toLowerCase())}($|[^a-z0-9])`).test(text)

/** Up to two replies to a client's message — the first rows its words match, else the acknowledgement. Empty for an empty message. */
export function suggestReplies(message: string, client: string): string[] {
  const text = message.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!text) return []
  const first = client.trim().split(/\s+/)[0] || client.trim() || 'there'
  const out: string[] = []
  for (const r of RULES) {
    if (out.length >= 2) break
    if (r.words.some((w) => said(text, w))) out.push(r.reply(first))
  }
  if (!out.length) out.push(FALLBACK(first))   // 1.0's plain acknowledgement, when nothing in the table matched
  return [...new Set(out)].slice(0, 2)
}

/** The line the suggestions sit under: the newest line, when it is the client's and not removed — nobody has answered it yet. */
export function unansweredLine<T extends { id: string; authorKind: 'client' | 'studio'; removed?: boolean; body: string }>(lines: readonly T[]): T | null {
  const last = lines[lines.length - 1]
  return last && last.authorKind === 'client' && !last.removed && last.body.trim() ? last : null
}

/* ── (pending modules S26 — card studio:team-chats, "Reply suggestions") a teammate's message ─────────────────────────────────────────
   1.0 offered its acknowledgement under any chat's newest line, a teammate's too ("Thanks for reaching out, …" — a client's words). Between
   members the replies are a teammate's, and only where one is owed: two people's conversation always; a group, the studio's room or a Team
   conversation only when the line asks something (a question, "can you", "please"…) or names you. The table by the same rule (whole words,
   the first two rows that match), else a plain answer. A tap fills the box — never sends. A stand-in: no model reads the message.
   *(invented copy: every reply)* */
const ASKS = ['can you', 'could you', 'would you', 'can someone', 'could someone', 'anyone', 'who can', 'please', 'pls', 'help']
const TEAM_RULES: readonly Rule[] = [
  { words: ['urgent', 'asap', 'right away', 'immediately', 'emergency'], reply: () => 'On it now — I’ll update you shortly.' },
  { words: ['call', 'ring', 'phone me', 'call me'], reply: () => 'I’ll call you in a few minutes.' },
  { words: ['site visit', 'site walk', 'on site', 'meet', 'meeting', 'tomorrow', 'this afternoon', 'this morning'], reply: () => 'Works for me — see you there.' },
  { words: ['check', 'confirm', 'verify', 'double check', 'double-check', 'look at', 'take a look'], reply: () => 'Let me check and come back to you.' },
  { words: ['quote', 'quotation', 'price', 'pricing', 'cost', 'margin', 'budget'], reply: () => 'I’ll go through the numbers and come back to you.' },
  { words: ['delivery', 'deliver', 'supplier', 'vendor', 'order'], reply: () => 'I’ll chase the supplier and confirm the date.' },
  { words: ['send me', 'send over', 'share the', 'where is', 'where’s', 'drawing', 'drawings', 'floor plan', 'layout'], reply: () => 'Sending it over now.' },
  { words: ['bring', 'samples', 'sample'], reply: () => 'Noted — I’ll bring them.' },
  { words: ['timesheet', 'timesheets', 'claim', 'claims', 'form', 'by friday', 'by monday', 'deadline'], reply: () => 'Will do — I’ll have it in by then.' },
  { words: ['leave', 'mc', 'sick', 'running late'], reply: () => 'No problem — I’ll cover for you.' },
]
const THANKS = ['thank', 'thanks', 'appreciate', 'great job', 'well done']
const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n.trim()
/** Up to two replies to a teammate's message, or none where none is owed (a group's line that asks nothing and names nobody you). */
export function suggestTeamReplies(message: string, writer: string, o: { direct: boolean; me: string }): string[] {
  const text = message.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!text) return []
  const first = firstName(writer) || 'there'
  const named = !!o.me.trim() && said(text, firstName(o.me).toLowerCase())
  const asks = text.includes('?') || ASKS.some((w) => said(text, w))
  if (!o.direct && !asks && !named) return []
  const out: string[] = []
  for (const r of TEAM_RULES) {
    if (out.length >= 2) break
    if (r.words.some((w) => said(text, w))) out.push(r.reply(first))
  }
  if (!out.length && (o.direct || named) && THANKS.some((w) => said(text, w))) out.push('Anytime!')
  if (!out.length) out.push(asks ? 'Sure — I’ll take care of it and let you know.' : `Got it — thanks, ${first}!`)
  return [...new Set(out)].slice(0, 2)
}
/** The teammate's line the suggestions sit under: the newest line, when it is someone else's words (never a group's own line), not removed. */
export function unansweredTeamLine<T extends { id: string; authorId: string | null; removed?: boolean; body: string; event?: string | null }>(lines: readonly T[], meId: string): T | null {
  const last = lines[lines.length - 1]
  return last && !last.event && last.authorId !== meId && !last.removed && last.body.trim() ? last : null
}
