/**
 * (pending modules S10 — 1.0's mAIson `create_task` took "remind me to call Mrs Tan tomorrow at 3pm" through its model) When a question asks for a
 * reminder: the day and time its words name, read by rule — pure and client-safe. "today", "tonight", "tomorrow", "the day after tomorrow",
 * "on Friday", "next Monday", "next week", "in 3 days", "in 2 weeks", "15 Oct", "15/10", with "at 3pm", "3:30 pm", "at 15:00", "noon",
 * "morning", "afternoon", "evening". `spans` are the words read, so the task's title can leave them out. Nothing named → `at` null (the caller
 * picks the house default: tomorrow at 10:00, the follow-up dialog's own morning).
 */

export type WhenRead = { at: Date | null; spans: string[] }

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const DAY_RE = '(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|sday|urday)?'
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const
const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*'

const dayIndex = (w: string) => DAYS.findIndex((d) => d.startsWith(w.toLowerCase().slice(0, 3)))
const monthIndex = (w: string) => MONTHS.findIndex((m) => w.toLowerCase().startsWith(m))
const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** The house default for a reminder with no day: tomorrow at 10:00. */
export function defaultDue(now: Date): Date { const d = addDays(startOf(now), 1); d.setHours(10, 0, 0, 0); return d }

export function readWhen(question: string, now: Date): WhenRead {
  const q = question.replace(/[’‘]/g, "'")
  const spans: string[] = []
  const take = (re: RegExp): RegExpExecArray | null => { const m = re.exec(q); if (m) spans.push(m[0]); return m }

  /* the time */
  let hour: number | null = null, minute = 0
  const ampm = take(/\b(?:at|by|around|@)?\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=\W|$)/i)
  if (ampm) {
    const h = Number(ampm[1]); const pm = /^p/i.test(ampm[3]!)
    if (h >= 1 && h <= 12) { hour = (h % 12) + (pm ? 12 : 0); minute = Number(ampm[2] ?? 0) }
  } else {
    const h24 = take(/\b(?:at|by|around|@)\s*([01]?\d|2[0-3])[:.]([0-5]\d)\b/i)
    if (h24) { hour = Number(h24[1]); minute = Number(h24[2]) }
    else if (take(/\b(?:at\s+)?noon\b|\bmidday\b|\blunch(?:time)?\b/i)) hour = 12
    else if (take(/\b(?:in the |this )?morning\b/i)) hour = 9
    else if (take(/\b(?:in the |this )?afternoon\b/i)) hour = 14
    else if (take(/\b(?:in the |this )?evening\b/i)) hour = 18
  }
  if (minute > 59) minute = 0

  /* the day */
  const today = startOf(now)
  let day: Date | null = null
  if (take(/\bday after tomorrow\b/i)) day = addDays(today, 2)
  else if (take(/\b(?:by |on )?(tomorrow|tmr|tmrw|tml)\b/i)) day = addDays(today, 1)
  else if (take(/\btonight\b/i)) { day = today; if (hour === null) hour = 19 }
  else if (take(/\b(?:by |for )?(?:later )?today\b|\blater\b/i)) day = today
  else {
    const inN = take(/\bin\s+(\d{1,2}|a|an|one|two|three|four|five|six|seven)\s+(day|days|week|weeks)\b/i)
    if (inN) {
      const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 }
      const n = /\d/.test(inN[1]!) ? Number(inN[1]) : words[inN[1]!.toLowerCase()] ?? 1
      day = addDays(today, /week/i.test(inN[2]!) ? n * 7 : n)
    }
  }
  if (!day) {
    const nextWeek = take(/\bnext week\b/i)
    if (nextWeek) { const d = addDays(today, 1); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); day = d }
  }
  if (!day) {
    const named = take(new RegExp(`\\b(?:(?:on|by|this|coming|next)\\s+)?${DAY_RE}\\b`, 'i'))
    if (named) {
      const target = dayIndex(named[1]!)
      if (target >= 0) {
        if (/\bnext\b/i.test(named[0])) {
          /* "next Friday" = the Friday of next week (weeks run Monday to Sunday) — the proposal prints the day, so the member sees it */
          const monday = addDays(today, 1)
          while (monday.getDay() !== 1) monday.setDate(monday.getDate() + 1)
          day = addDays(monday, (target + 6) % 7)
        } else {
          /* "Friday", "on Friday", "this Friday", "by Friday": the next one after today */
          const d = addDays(today, 1)
          while (d.getDay() !== target) d.setDate(d.getDate() + 1)
          day = d
        }
      }
    }
  }
  if (!day) {
    const dm = take(new RegExp(`\\b(?:on |by )?(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?:\\s+(\\d{4}))?\\b`, 'i'))
      ?? null
    const md = dm ? null : take(new RegExp(`\\b(?:on |by )?${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i'))
    const slash = dm || md ? null : take(/\b(?:on |by )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
    let y = now.getFullYear(), mo = -1, dd = -1, yearGiven = false
    if (dm) { dd = Number(dm[1]); mo = monthIndex(dm[2]!); if (dm[3]) { y = Number(dm[3]); yearGiven = true } }
    else if (md) { mo = monthIndex(md[1]!); dd = Number(md[2]); if (md[3]) { y = Number(md[3]); yearGiven = true } }
    else if (slash) { dd = Number(slash[1]); mo = Number(slash[2]) - 1; if (slash[3]) { y = Number(slash[3]); if (y < 100) y += 2000; yearGiven = true } }
    if (mo >= 0 && mo <= 11 && dd >= 1 && dd <= 31) {
      let d = new Date(y, mo, dd)
      if (d.getMonth() === mo) {
        if (!yearGiven && d.getTime() < today.getTime()) d = new Date(y + 1, mo, dd)   // "15 Jan" asked in October is next January
        day = d
      }
    }
  }

  if (!day && hour === null) return { at: null, spans }
  if (!day) {
    /* a time with no day: today if it is still ahead, else tomorrow */
    const t = new Date(today); t.setHours(hour!, minute, 0, 0)
    day = t.getTime() > now.getTime() ? today : addDays(today, 1)
  }
  const at = new Date(day)
  at.setHours(hour ?? 10, hour === null ? 0 : minute, 0, 0)
  return { at, spans }
}

/** A reminder's title from its words: what follows "remind me to" / "add a task to" / "set a follow-up with", less the day and time words —
    "remind me to call Mrs Tan tomorrow at 3pm" → "Call Mrs Tan". Empty → null (the caller names it). */
export function reminderTitle(question: string, spans: string[]): string | null {
  let s = ` ${question.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()} `
  for (const sp of [...spans].sort((a, b) => b.length - a.length)) s = s.replace(sp, ' ')
  s = s.replace(/^\s*(?:hey |hi )?(?:maison(?: ai)?[,:]?\s*)?(?:please |pls |can you |could you |would you |i need to |i want to |i'd like to )*/i, ' ')
  const lead = [
    /\bremind (?:me|us)\s+(?:to|about|that|of)?\s*/i,
    /\b(?:add|create|make|set|put|log|new)\s+(?:me\s+)?(?:a\s+|an\s+)?(?:new\s+)?(?:task|reminder|to-?do)\s*(?:for me|for us)?\s*(?:to|for|about|:|-|that)?\s*/i,
    /\bset\s+(?:up\s+)?(?:a\s+)?reminder\s*(?:to|for|about)?\s*/i,
  ]
  let body: string | null = null
  for (const re of lead) { const m = re.exec(s); if (m) { body = s.slice(m.index + m[0].length); break } }
  if (body === null) {
    const f = /\bset\s+(?:up\s+)?(?:a\s+)?follow[- ]?up\s*(?:with|for)?\s*/i.exec(s)
    if (f) body = `Follow up with ${s.slice(f.index + f[0].length)}`
  }
  if (body === null) body = s
  body = body.replace(/\b(?:please|pls|thanks|thank you)\b/gi, ' ').replace(/[\s,;:.!?-]+$/g, '').replace(/^[\s,;:.!?-]+/g, '').replace(/\s+/g, ' ').trim()
  if (!body) return null
  return (body.charAt(0).toUpperCase() + body.slice(1)).slice(0, 80)
}
