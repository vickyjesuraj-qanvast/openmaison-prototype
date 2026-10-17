/**
 * (S43B · F1-01 — her "fix all the pending things" 2026-10-15, as recommended; REG-319's Auto Fill was a scripted stand-in: whatever file was
 * dropped, the Move stage window filled the mock's "WhatsApp · Callback requested" and the Notes tab a fixed sentence) Auto Fill, read by rule —
 * the same honest treatment S42F gave Fill from a document (`lib/leads/document-fill.ts`): the picked file's OWN words, in the browser, the
 * moment it is picked; nothing leaves it while it reads, nothing calls a model, no AI credits (1.0's screenshot read cost 0).
 *   · a WhatsApp chat export (*Export chat* → a .txt, "12/10/2026, 7:45 pm - Sophia Wong: …" or "[12/10/26, 7:45:12 PM] Sophia Wong: …") —
 *     the channel is WhatsApp, the contact's moment is the last message's;
 *   · an email saved as a PDF or a text file ("From: … Sent: … Subject: …") — Email, the newest Sent / Date line;
 *   · call notes or a typed log (a text file or a PDF) — labelled lines first ("Channel: Call", "Date: 12/10/2026 3:00 PM", "Outcome: …",
 *     "Next step: …"), then the plain words: a channel only when one is named, an outcome by `OUTCOMES`' own words (the client's "call me
 *     back", "not interested", a meeting agreed with its day and time), the next call or meeting only when its day AND time are written —
 *     "tomorrow 7pm", "Sat 18 Oct, 3pm", "18/10 at 10am" — read against the message that says it, and only when it lies after it;
 *   · a meeting log (Met) — where it was (in person · a video call · the showroom) when one is named, and when, from a labelled line, an
 *     email's date or the meeting a chat agreed on.
 * Only what plainly appears once is filled; two candidates for one field are left out. A file with words but no time of its own gives the log
 * the upload's moment (the testers' L-6 rule) and says so. A photo, a screenshot or a scanned page has no words to read by rule — it is still
 * attached to the log, nothing is filled, and the line says so: "We can't read pictures yet — type what was said."
 * Pure but for `readContactFile`'s file reading; no server imports.
 */
import { CONTACT_CHANNELS, OUTCOMES } from './enums'
import { formatInputDateTime } from '@/lib/format'

export type Channel = (typeof CONTACT_CHANNELS)[number]
export type Outcome = (typeof OUTCOMES)[number]
export type MeetingPlace = 'In person' | 'Video call' | 'Showroom'
/** What a read fills — in the log's own field values (the input's "12/10/2026, 3:00 PM"). */
export type ContactFill = { channel?: Channel; when?: string; outcome?: Outcome; nextStepWhen?: string; nextStepMode?: string; where?: MeetingPlace }
export type ContactRead =
  | { ok: true; fill: ContactFill; /** the file names no moment of its own — `when` is the upload's (testers' L-6) */ whenFromUpload: boolean }
  | { ok: false; reason: 'picture' | 'scan' | 'nothing' | 'unreadable' }
export type ContactKind = 'contact' | 'meeting'
/** The studio's side of a conversation: its members' names and emails — a message from them is never read as the client's. */
export type ContactContext = { kind: ContactKind; now: Date; members: readonly { name: string; email?: string | null }[] }

/** What the picker offers — a picture is offered too: it is the proof of contact and is attached, though it can't be read yet. */
export const CONTACT_ACCEPT = '.txt,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,image/*'

/* ── tidy a line the way chat exports write them: direction marks, narrow no-break spaces ── */
const tidy = (l: string) => l.replace(/[‎‏‪-‮﻿]/g, '').replace(/[   ]/g, ' ').replace(/\s+$/, '')

/* ── dates and times ── */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const monthOf = (w: string) => { const i = MONTHS.indexOf(w.slice(0, 3).toLowerCase()); return i < 0 ? null : i }
const fullYear = (y: string) => (y.length <= 2 ? 2000 + Number(y) : Number(y))
/** "3pm" · "3:30 pm" · "15:00" · "7.45pm" → [hours, minutes]; null when it isn't a time of day. */
function clock(h: string, m: string | undefined, ap: string | undefined): [number, number] | null {
  let hh = Number(h); const mm = m ? Number(m) : 0
  if (!Number.isFinite(hh) || mm > 59) return null
  const a = (ap ?? '').replace(/[.\s]/g, '').toLowerCase()
  if (a) { if (hh < 1 || hh > 12) return null; hh = (hh % 12) + (a.startsWith('p') ? 12 : 0) }
  else if (!m || hh > 23) return null   // a bare "3" is not a time — "at 3" says too little
  return [hh, mm]
}
/* a time of day — "3pm" · "3:30 pm" · "7:45:12 PM" (seconds dropped) · "15:00"; never a date's "18.10" or "12/10" (a 24-hour time takes a colon) */
const TIME = /(?<![\d/.:-])(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])|(?<![\d/.:-])([01]?\d|2[0-3]):(\d{2})(?::\d{2})?(?![:.\/-]?\d)(?!\s*(?:a\.?m|p\.?m))/i
const timeIn = (s: string): [number, number] | null => {
  const m = TIME.exec(s)
  if (!m) return null
  return m[3] ? clock(m[1]!, m[2], m[3]) : clock(m[4]!, m[5], undefined)
}
const at = (y: number, mo: number, d: number, t: [number, number]) => {
  const x = new Date(y, mo, d, t[0], t[1], 0, 0)
  return x.getFullYear() === y && x.getMonth() === mo && x.getDate() === d ? x : null
}

/** A written moment with its year — "12/10/2026, 3:45 PM" · "Mon, 12 Oct 2026 15:45" · "October 12, 2026 at 3:45 PM" — or null. */
export function readMoment(text: string, dayFirst = true): Date | null {
  const s = tidy(text)
  const t = timeIn(s)
  if (!t) return null
  let m = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/.exec(s)
  if (m) {
    let d = Number(m[1]), mo = Number(m[2])
    if (!dayFirst || mo > 12) [d, mo] = d > 12 ? [d, mo] : [mo, d]
    return mo >= 1 && mo <= 12 ? at(fullYear(m[3]!), mo - 1, d, t) : null
  }
  m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/.exec(s)
  if (m && monthOf(m[2]!) != null) return at(Number(m[3]), monthOf(m[2]!)!, Number(m[1]), t)
  m = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/.exec(s)
  if (m && monthOf(m[1]!) != null) return at(Number(m[3]), monthOf(m[1]!)!, Number(m[2]), t)
  return null
}

/**
 * A day and a time said in a message — "tomorrow 7pm", "Sat 18 Oct at 3pm", "18/10, 10am", "this Thursday 2:30pm", "today 6pm" — read
 * against the message's own moment (`ref`); null unless BOTH a day and a time are written. A weekday is the next one on or after `ref`'s day.
 */
export function readSaidMoment(text: string, ref: Date, dayFirst = true): Date | null {
  const s = tidy(text).toLowerCase()
  const t = timeIn(s)
  if (!t) return null
  const full = readMoment(s, dayFirst)
  if (full) return full
  const y = ref.getFullYear()
  /* "18 Oct" · "Oct 18" · "18/10" — the year the message was written in, or the next when that day has passed */
  const yearFor = (mo: number, d: number) => { const c = new Date(y, mo, d); return c.getTime() < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime() - 7 * 86_400_000 ? y + 1 : y }
  let m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/.exec(s)
  if (m) { const mo = monthOf(m[2]!)!; return at(yearFor(mo, Number(m[1])), mo, Number(m[1]), t) }
  m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/.exec(s)
  if (m) { const mo = monthOf(m[1]!)!; return at(yearFor(mo, Number(m[2])), mo, Number(m[2]), t) }
  m = /\b(\d{1,2})\/(\d{1,2})\b(?!\/)/.exec(s)
  if (m) {
    let d = Number(m[1]), mo = Number(m[2])
    if (!dayFirst || mo > 12) [d, mo] = d > 12 ? [d, mo] : [mo, d]
    if (mo >= 1 && mo <= 12) return at(yearFor(mo - 1, d), mo - 1, d, t)
  }
  const base = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const plus = (n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return at(d.getFullYear(), d.getMonth(), d.getDate(), t) }
  if (/\b(?:tomorrow|tmr|tmrw|tml)\b/.test(s)) return plus(1)
  if (/\b(?:today|tonight|later today|this (?:afternoon|evening|morning))\b/.test(s)) return plus(0)
  m = /\b(next\s+)?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|rsday|urday)?\b/.exec(s)
  if (m) {
    const want = WEEKDAYS.indexOf(m[2]!.slice(0, 3))
    let n = (want - base.getDay() + 7) % 7
    if (m[1] && n < 7) n += n === 0 ? 7 : 0
    return plus(n)
  }
  return null
}

/* ── the words ── */
const CHANNEL_WORDS: { channel: Channel; re: RegExp }[] = [
  { channel: 'WhatsApp', re: /\bwhats\s?app(?:ed)?\b|\bwa\b(?= (?:message|msg|chat))/i },
  { channel: 'Email', re: /\be-?mail(?:ed|s)?\b/i },
  { channel: 'SMS', re: /\bsms\b|\btext(?:ed)? (?:her|him|them|the client)\b|\btext message\b/i },
  { channel: 'Call', re: /\b(?:called|phoned|rang|phone call|on the phone|over the phone|a call|the call)\b/i },
  { channel: 'In person', re: /\b(?:in person|met (?:her|him|them|the client)|site visit|walk-?in|at the showroom|face to face)\b/i },
]
/* a next step names how it will happen — never the contact's own channel */
const MODE_WORDS: { mode: string; re: RegExp }[] = [
  { mode: 'In person', re: /\b(?:meet(?:ing)?|see you|site visit|visit|come (?:over|down|by|to)|showroom|our office|in person|drop by)\b/i },
  { mode: 'Call', re: /\b(?:call|ring|phone)\b/i },
  { mode: 'WhatsApp', re: /\bwhats\s?app\b/i },
  { mode: 'Email', re: /\be-?mail\b/i },
  { mode: 'SMS', re: /\bsms\b|\btext (?:you|me)\b/i },
]
const NOT_INTERESTED = /\b(?:not interested|no longer (?:interested|need|looking|keen)|don'?t need (?:it|this|the)|do not need|(?:went|go|going|gone|decided to go|proceed(?:ing)?) with (?:another|a different|other|someone else)|found (?:another|a different|someone)|not (?:going to )?proceed(?:ing)?|won'?t be proceeding|hold off (?:on )?(?:the )?renovation)\b/i
const CALLBACK = /\b(?:call (?:me |us )?back|callback|call (?:me|us) (?:later|tomorrow|tmr|after|at|on|in|again)|ring me (?:back|later)|give me a call|can you call)\b/i
const MEETING = /\b(?:see you|meet (?:you|up|at|on)|meeting|site visit|visit (?:the|our|my|your)|come (?:over|down|by|to)|showroom|appointment|our office)\b/i
const CONNECTED = /\b(?:spoke|spoken|talked|chatted|connected|answered|picked up|discussed|replied)\b/i
const NO_RESPONSE = /\b(?:no (?:response|reply|answer)|didn'?t (?:pick up|answer|reply|respond)|did not (?:pick up|answer|reply|respond)|unanswered|voicemail|not reachable|unreachable|left a message)\b/i
const PLACE_WORDS: { place: MeetingPlace; re: RegExp }[] = [
  { place: 'Video call', re: /\b(?:video call|zoom|google meet|ms teams|microsoft teams|facetime|video chat)\b/i },
  { place: 'Showroom', re: /\bshowroom\b/i },
  { place: 'In person', re: /\b(?:in person|site visit|on site|at (?:the|their|his|her) (?:unit|flat|home|house|place|condo)|home visit|met at|face to face)\b/i },
]
const one = <T,>(list: T[]): T | undefined => { const set = [...new Set(list)]; return set.length === 1 ? set[0] : undefined }

/* ── the shapes a conversation comes in ── */
type Message = { at: Date | null; sender: string | null; text: string }
/* WhatsApp's export, Android "12/10/2026, 7:45 pm - Name: text" and iOS "[12/10/26, 7:45:12 PM] Name: text" (a system line has no "Name:") */
const WA = /^\[?(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([ap]\.?\s?m\.?)?\]?\s*(?:[-–]\s*)?(.*)$/i
function chatOf(lines: readonly string[]): { messages: Message[]; dayFirst: boolean } | null {
  const raw: { d: number; mo: number; y: string; h: string; mi: string; ap?: string; rest: string }[] = []
  const out: Message[] = []
  let dayFirst = true
  for (const line of lines) {
    const m = WA.exec(line)
    if (m) { raw.push({ d: Number(m[1]), mo: Number(m[2]), y: m[3]!, h: m[4]!, mi: m[5]!, ap: m[7], rest: m[8] ?? '' }); continue }
    if (raw.length && line.trim()) raw[raw.length - 1]!.rest += `\n${line}`   // a message's next line
  }
  if (raw.length < 2) return null
  if (raw.some((r) => r.mo > 12)) dayFirst = false
  for (const r of raw) {
    const [d, mo] = dayFirst ? [r.d, r.mo] : [r.mo, r.d]
    const t = clock(r.h, r.mi, r.ap)
    const when = t && mo >= 1 && mo <= 12 ? at(fullYear(r.y), mo - 1, d, t) : null
    const s = /^([^:\n]{1,60}):\s?([\s\S]*)$/.exec(r.rest)
    out.push(s ? { at: when, sender: s[1]!.trim(), text: s[2]!.trim() } : { at: when, sender: null, text: r.rest.trim() })
  }
  return { messages: out, dayFirst }
}
const HEADER = /^(from|to|cc|sent|date|subject)\s*:\s*(.*)$/i
function emailOf(lines: readonly string[]): Message[] | null {
  const heads = lines.map((l) => HEADER.exec(l.trim())).filter(Boolean) as RegExpExecArray[]
  const kinds = new Set(heads.map((h) => h[1]!.toLowerCase()))
  if (!kinds.has('from') || !(kinds.has('sent') || kinds.has('date') || kinds.has('subject'))) return null
  /* one message per From: its sender, its date line, its body up to the next From */
  const out: Message[] = []
  let cur: Message | null = null
  for (const line of lines) {
    const h = HEADER.exec(line.trim())
    if (h && h[1]!.toLowerCase() === 'from') { if (cur) out.push(cur); cur = { at: null, sender: h[2]!.trim(), text: '' }; continue }
    if (!cur) continue
    if (h && /^(sent|date)$/i.test(h[1]!)) { cur.at = cur.at ?? readMoment(h[2]!); continue }
    if (h) continue
    cur.text += `${line}\n`
  }
  if (cur) out.push(cur)
  return out.length ? out.map((m) => ({ ...m, text: m.text.trim() })) : null
}

/** Whether a sender is the studio's: a member's name (first word) or a member's email. */
function studioSide(sender: string | null, ctx: ContactContext): boolean {
  if (!sender) return false
  const s = sender.toLowerCase()
  return ctx.members.some((m) => {
    const first = m.name.trim().split(/\s+/)[0]?.toLowerCase()
    return (!!first && first.length > 1 && (s === first || s.startsWith(`${first} `) || s.startsWith(`"${first}`))) || (!!m.email && s.includes(m.email.toLowerCase()))
  })
}

/* ── labelled lines in a typed log ── */
const LABEL = /^\s*(channel|contacted via|via|mode|date(?:\s*&\s*time)?|when|time|outcome|result|next step|next(?: call| meeting| follow[- ]?up)?|follow[- ]?up|where|venue|location)\s*[:：-]\s*(.+)$/i
function labelled(lines: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of lines) {
    const m = LABEL.exec(l)
    if (!m) continue
    const k = m[1]!.toLowerCase()
    const key = /channel|via|mode/.test(k) ? 'channel' : /^(date|when|time)/.test(k) ? 'when' : /outcome|result/.test(k) ? 'outcome' : /where|venue|location/.test(k) ? 'where' : 'next'
    if (!out[key]) out[key] = m[2]!.trim()
  }
  return out
}
const channelFrom = (s: string): Channel | undefined =>
  (CONTACT_CHANNELS as readonly string[]).find((c) => c.toLowerCase() === s.trim().toLowerCase()) as Channel | undefined ?? one(CHANNEL_WORDS.filter((w) => w.re.test(s)).map((w) => w.channel))
const outcomeFrom = (s: string): Outcome | undefined =>
  (OUTCOMES as readonly string[]).find((o) => s.toLowerCase().includes(o.toLowerCase())) as Outcome | undefined
const modeFrom = (s: string): string | undefined => one(MODE_WORDS.filter((w) => w.re.test(s)).map((w) => w.mode))
const placeFrom = (s: string): MeetingPlace | undefined => one(PLACE_WORDS.filter((w) => w.re.test(s)).map((w) => w.place))

/** The outcome one message says, by `OUTCOMES`' own words — the client's "not interested" / "call me back", a meeting agreed with its day and time. */
function outcomeOf(m: Message, clientSide: boolean, dayFirst: boolean): Outcome | undefined {
  if (clientSide && NOT_INTERESTED.test(m.text)) return 'Not interested'
  if (clientSide && CALLBACK.test(m.text)) return 'Callback requested'
  if (MEETING.test(m.text) && m.at && readSaidMoment(m.text, m.at, dayFirst)) return 'Meeting scheduled'
  return undefined
}

/** The read itself, from a file's lines — pure. */
export function readContactText(input: readonly string[], ctx: ContactContext): ContactRead {
  const lines = input.map(tidy)
  if (!lines.some((l) => /[a-z]{3}/i.test(l))) return { ok: false, reason: 'nothing' }
  const fill: ContactFill = {}
  const exported = chatOf(lines)
  const chat = exported?.messages ?? null
  const mail = chat ? null : emailOf(lines)
  const msgs = chat ?? mail
  const label = labelled(lines)
  const dayFirst = exported?.dayFirst ?? true
  const past = (d: Date | null): d is Date => !!d && d.getTime() <= ctx.now.getTime()
  /* the contact's moment: the last message's, the newest Sent / Date line, a labelled one */
  const dated = (msgs ?? []).filter((m) => m.at)
  const last = dated.length ? dated.reduce((a, b) => (b.at!.getTime() >= a.at!.getTime() ? b : a)) : null
  const whenAt = last?.at ?? (label.when ? readMoment(label.when) : null)
  const ref = past(whenAt) ? whenAt : ctx.now
  if (ctx.kind === 'meeting') {
    fill.where = label.where ? placeFrom(label.where) ?? (/person|site|unit|home|flat/i.test(label.where) ? 'In person' : undefined) : placeFrom(lines.join('\n'))
    /* the meeting's own moment: a labelled line, else the meeting a conversation agreed on (its day and time, now past) — a chat's last message
       or an email's date is when it was written, not when they met */
    const labelledAt = label.when ? readMoment(label.when) : null
    const agreed = msgs ? [...msgs].reverse().map((m) => (m.at && MEETING.test(m.text) ? readSaidMoment(m.text, m.at, dayFirst) : null)).find(past) ?? null : null
    const met = labelledAt ?? agreed
    if (past(met)) fill.when = formatInputDateTime(met)
  } else {
    /* the channel: the export's own shape, else a labelled line, else the one channel the words name (a "call me back" is a next step) */
    if (chat) fill.channel = 'WhatsApp'
    else if (mail) fill.channel = 'Email'
    else if (label.channel) fill.channel = channelFrom(label.channel)
    if (!fill.channel && !msgs) fill.channel = channelFrom(lines.map((l) => l.replace(new RegExp(CALLBACK.source, 'gi'), ' ')).join('\n'))   // the words of a call back aside
    if (past(whenAt)) fill.when = formatInputDateTime(whenAt)
    /* the outcome: a labelled line, else the latest message that says one (the client's words for a call back or a no), else who spoke */
    if (label.outcome) fill.outcome = outcomeFrom(label.outcome)
    if (!fill.outcome && msgs) {
      for (const m of [...msgs].reverse()) { const o = outcomeOf(m, !studioSide(m.sender, ctx), dayFirst); if (o) { fill.outcome = o; break } }
      if (!fill.outcome) {
        const people = msgs.filter((m) => m.sender)
        if (people.some((m) => !studioSide(m.sender, ctx))) fill.outcome = 'Connected'
        else if (people.length) fill.outcome = 'No response'   // only the studio wrote — nobody answered
      }
    }
    if (!fill.outcome && !msgs) {
      const text = lines.join('\n')
      const said = [OUTCOMES.find((o) => text.toLowerCase().includes(o.toLowerCase())), NOT_INTERESTED.test(text) ? 'Not interested' : undefined, CALLBACK.test(text) ? 'Callback requested' : undefined,
        NO_RESPONSE.test(text) ? 'No response' : undefined].filter(Boolean) as Outcome[]
      fill.outcome = one(said) ?? (CONNECTED.test(text) && !said.length ? 'Connected' : undefined)
    }
    /* the next call or meeting: a labelled line, else the latest message (or line) with a day and a time after it */
    const nextFrom = (text: string, from: Date): { at: Date; mode?: string } | null => {
      const d = readSaidMoment(text, from, dayFirst)
      return d && d.getTime() > from.getTime() ? { at: d, mode: modeFrom(text) } : null
    }
    let next: { at: Date; mode?: string } | null = label.next ? nextFrom(label.next, ref) : null
    if (!next && msgs) for (const m of [...msgs].reverse()) { const n = m.at ? nextFrom(m.text, m.at) : null; if (n) { next = n; break } }
    if (!next && !msgs) for (const l of [...lines].reverse()) { if (LABEL.test(l) && !/^\s*next/i.test(l)) continue; const n = nextFrom(l, ref); if (n) { next = n; break } }
    if (next) { fill.nextStepWhen = formatInputDateTime(next.at); if (next.mode) fill.nextStepMode = next.mode }
  }
  const found = Object.keys(fill).filter((k) => fill[k as keyof ContactFill] !== undefined)
  for (const k of Object.keys(fill) as (keyof ContactFill)[]) if (fill[k] === undefined) delete fill[k]
  if (!found.length) return { ok: false, reason: 'nothing' }
  const whenFromUpload = !fill.when
  if (whenFromUpload) fill.when = formatInputDateTime(ctx.now)   // (testers' L-6) no moment in the file — the upload's
  return { ok: true, fill, whenFromUpload }
}

/** The picked file, read by its kind. A picture is never read — it is the proof of contact, attached as it is. */
export async function readContactFile(file: File, ctx: ContactContext): Promise<ContactRead> {
  try {
    const name = file.name.toLowerCase()
    if (/\.(png|jpe?g|webp|gif|heic|heif)$/.test(name) || file.type.startsWith('image/')) return { ok: false, reason: 'picture' }
    if (name.endsWith('.txt') || file.type === 'text/plain') return readContactText((await file.text()).split(/\r?\n/), ctx)
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      const { pdfLines } = await import('@/lib/pdf-text')
      const lines = await pdfLines(await file.arrayBuffer())
      if (!lines.some((l) => /[a-z]{3}/i.test(l))) return { ok: false, reason: 'scan' }   // pictures of pages, no words
      return readContactText(lines, ctx)
    }
    return { ok: false, reason: 'unreadable' }   // a Word file, a zip of a chat with its media…
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}

/* ── the line under Auto Fill (invented copy, reg-S43B) ── */
const WORD: Record<keyof ContactFill, string> = { channel: 'Contacted via', when: 'Date & Time', outcome: 'Outcome', nextStepWhen: 'the next call or meeting', nextStepMode: 'its mode', where: 'Where' }
const list = (w: string[]) => (w.length <= 1 ? w.join('') : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`)
/** The fields a read fills, in the log's order — the next step's mode rides with its day. */
export const FILL_ORDER: readonly (keyof ContactFill)[] = ['channel', 'where', 'when', 'outcome', 'nextStepWhen', 'nextStepMode']
/** What the read did, in one or two sentences: what filled, what was kept, what wasn't found — or why nothing could be read. */
export function fillWords(o: { file: string; kind: ContactKind; read: ContactRead; filled: (keyof ContactFill)[]; kept: (keyof ContactFill)[] }): string {
  const { file, read } = o
  if (!read.ok) {
    if (read.reason === 'picture') return `${file} is attached. We can’t read pictures yet — type what was said.`
    if (read.reason === 'scan') return `${file} is attached. It’s a scanned page with no words to read — type what was said.`
    if (read.reason === 'unreadable') return `${file} is attached, but it couldn’t be read — a chat export (.txt), a PDF or a text file can be. Type what was said.`
    return `${file} is attached. Nothing in it reads as ${o.kind === 'meeting' ? 'a meeting' : 'a conversation'} — type what was said.`
  }
  const filled = o.filled.filter((k) => !(k === 'nextStepMode' && o.filled.includes('nextStepWhen')))
  const core: (keyof ContactFill)[] = o.kind === 'meeting' ? ['where', 'when'] : ['channel', 'when', 'outcome']
  const missing = core.filter((k) => !(k in read.fill))
  const parts = [
    filled.length ? `Filled from ${file}: ${list(filled.map((k) => WORD[k]))}.` : `Read ${file} — nothing new to fill.`,
    read.whenFromUpload && o.filled.includes('when') ? 'It names no time, so Date & Time is when you uploaded it.' : null,
    o.kept.length ? `Kept what you entered for ${list(o.kept.map((k) => WORD[k]))}.` : null,
    missing.length ? `Not found: ${list(missing.map((k) => WORD[k]))}.` : null,
  ]
  return parts.filter(Boolean).join(' ')
}
