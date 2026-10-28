/**
 * Formatting per the designer's rules (build plan, verification round 3):
 * - INPUT fields: numeric d/m/yyyy (e.g. 12/8/2026)
 * - DISPLAY views: "12 Mar '26"; date-times "12 Mar '26, 3:00 PM"
 * - Money: S$ with en-SG grouping, no decimals (mock: "70,500", "S$70,500")
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function displayDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ’${String(d.getFullYear()).slice(2)}`
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

/** Activity rows (858:24970): "Tue, 25 Aug ’26". */
export function displayDateLong(d: Date): string {
  return `${DAYS[d.getDay()]}, ${displayDate(d)}`
}

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
/** (REG-592) A template's long date: "17 September 2026". */
export function displayDateFull(d: Date): string {
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}
/** (REG-592) The long date with the day's name — "Sunday, 7 February 2026", Dyel's format. */
export function displayDateFullWeekday(d: Date): string {
  return `${DAYS_FULL[d.getDay()]}, ${displayDateFull(d)}`
}

/** My work card head (858:24989): "Wed, 26 Aug". */
export function displayDayMonth(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** (audit 2026-09-26, F128) A day and a short month, "25 Sep" — a new design's default name, the same months as every other date (never the
    server's locale data, which prints "25 Sept"). */
export function displayDayShortMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

const LONG_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
/** Files grid group head (931:39123): "Friday, 17 Jul ’26". */
export function displayDateWeekday(d: Date): string {
  return `${LONG_DAYS[d.getDay()]}, ${displayDate(d)}`
}

/** File size as the mock types it (931:40181 "711 KB"): whole KB below 1 MB, one decimal MB above. */
export function fileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—'   // (the calm UI build 2026-10-27, T-08) the house's one empty mark
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
}

/** Activity rows: "8:59 PM" — bare hour (REG-250, user 2026-09-01: "remove 0 in time … across the pages"),
    as the other three date-time formatters below already print it; the mock's zero-padded "08:59 PM"
    (931:48007) is overridden. */
export function displayTime(d: Date): string {
  let h = d.getHours()
  const am = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${am}`
}

/** Notes list (931:44902): "17 Jul ’26・12:34 PM" — a katakana middle dot between date and time. */
export function displayDateTimeDot(d: Date): string {
  let h = d.getHours()
  const am = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return `${displayDate(d)}・${h}:${String(d.getMinutes()).padStart(2, '0')} ${am}`
}

/** Lead returned card (858:24095): "28 Aug ’26, 4:30PM" — no space before the meridiem, as the mock types it. */
export function displayDateTimeTight(d: Date): string {
  let h = d.getHours()
  const am = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return `${displayDate(d)}, ${h}:${String(d.getMinutes()).padStart(2, '0')}${am}`
}

/** Header meta chip (858:24783): "S$ 70.5K" — one decimal, trailing zero dropped; below S$1K the full number. */
export function moneyCompact(minor: number): string {
  const n = minor / 100
  if (n >= 1_000_000) return `S$ ${trimZero((n / 1_000_000).toFixed(1))}M`
  if (n >= 1_000) return `S$ ${trimZero((n / 1_000).toFixed(1))}K`
  return `S$ ${money(minor)}`
}
const trimZero = (s: string) => s.replace(/\.0$/, '')

/** (the calm UI build 2026-10-27 — the audit's 3-20, T-11) "30 Jul ’26 · 12:00 PM" — the house dot before the time, as `displayDue` writes it
    (was "30 Jul ’26, 12:00 PM": never a comma before the time). */
export function displayDateTime(d: Date): string {
  let h = d.getHours()
  const am = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${displayDate(d)} · ${h}:${m} ${am}`
}

export function inputDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

/** (Dane UAT 5.05) Whether a due date carries a time: a date-only due is stamped at local midnight (`startOfDay` below), so midnight
    means "no time" and prints none. */
export const hasTime = (d: Date): boolean => d.getHours() !== 0 || d.getMinutes() !== 0

/** (Dane UAT 5.13 · 5.05) A date people plan by — a task's due, a follow-up, a quote's Due or Valid until, On hold till — with its
    day, "Sat, 3 Oct ’26" (`displayDateLong`, REG-167), and the time after a dot when it has one: "Sat, 3 Oct ’26 · 10:00 AM".
    Created, updated, sent and history dates keep `displayDate`: they look back, not ahead. */
export function displayDue(d: Date): string {
  return hasTime(d) ? `${displayDateLong(d)} · ${displayTime(d)}` : displayDateLong(d)
}

/** (Dane UAT 4.22) How far off a due date is, in calendar days as `isOverdue` counts them: "today" · "tomorrow" · "in 3 days" ·
    "1 day late" · "3 days late". */
export function dueDistance(d: Date, now: number): string {
  const days = Math.round((startOfDay(d) - startOfDay(new Date(now))) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days > 1) return `in ${days} days`
  return `${-days} ${days === -1 ? 'day' : 'days'} late`
}
/** (the Dashboard redesigned, 2026-10-26 — P-13 "one fact, one number": "5 days overdue", never "(5d)") How late an overdue task is, in calendar
    days as `isOverdue` counts them — "1 day overdue" · "5 days overdue"; '' when it is not overdue. Every task list and card says it so. */
export function overdueWords(d: Date | null | undefined, now: number): string {
  if (!d || !isOverdue(d, now)) return ''
  const n = Math.round((startOfDay(new Date(now)) - startOfDay(d)) / 86_400_000)
  return `${n} ${n === 1 ? 'day' : 'days'} overdue`
}

/** Relative time, as on kanban cards. (the calm UI build 2026-10-27 — the audit's 1-24 · 3-20 · 5-49, T-11 one format) spelled out, as the
    Dashboard already says it: "just now" · "5 min ago" · "3 hours ago" · "yesterday" · "4 days ago", then the house date (was "5m ago" ·
    "3h ago" · "4d ago"). */
export function relativeTime(d: Date, now = new Date()): string {
  const s = Math.max(0, (now.getTime() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const mi = Math.floor(s / 60)
  if (mi < 60) return `${mi} min ago`
  const h = Math.floor(mi / 60)
  if (h < 24 && calendarDaysBetween(d, now) === 0) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  const days = Math.max(1, calendarDaysBetween(d, now))   // (parity P-29) whole calendar days, as every other count — never one fewer late in the day
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return displayDate(d)
}

/** Table budget cell shows bare grouped number ("70,500"); S$ prefix where the mock has it. */
/** Keep digits only — what a numeric field accepts from typing or paste. */
export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * (REG-651, price book parity Q-01) A decimal as typed: digits and one point, at most `places` decimals, thousands commas dropped —
 * "2.80" stays "2.80", "1,500" is "1500", "12.5.3" is "12.5". The whole-dollar `groupDigits` below never takes a point.
 */
export function decimalTyped(raw: string, places = 3): string {
  const s = raw.replace(/[^\d.]/g, '')
  const i = s.indexOf('.')
  return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, places)
}
/** A money figure as typed: dollars and cents. */
export const moneyTyped = (raw: string): string => decimalTyped(raw, 2)

/**
 * (audit 2026-09-26, F121) A colour as typed: an optional leading "#" and at most six hex digits — anything else is dropped as typed
 * (REG-150's rule for number-like fields). `hexOf` reads it: three or six digits, with or without "#", as "#RRGGBB" — else null.
 */
export function hexTyped(raw: string): string {
  const t = raw.trim()
  return (t.startsWith('#') ? '#' : '') + t.replace(/[^0-9a-f]/gi, '').slice(0, 6)
}
export function hexOf(raw: string): string | null {
  const d = raw.trim().replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(d)) return `#${d.toUpperCase()}`
  if (/^[0-9a-f]{3}$/i.test(d)) return `#${d.split('').map((c) => c + c).join('').toUpperCase()}`
  return null
}

/** Digits grouped in thousands ("70500" → "70,500"); anything else is dropped. */
export function groupDigits(raw: string): string {
  const d = digitsOnly(raw)
  return d ? Number(d).toLocaleString('en-SG') : ''
}

/**
 * ONE phone rule for the app (REG-286, audit finding "phone normalisation exists in four places and they
 * contradict each other"). Leads store the 8-digit local number ("91234567"); anything a person types, pastes
 * or copies — "+65 9123 4567", "6591234567", "9123 4567" — reduces to it here. Search compares this form on
 * both sides, so the number copied out of the listing ("+65 91234567") finds its own lead when pasted back
 * into the box — before this it matched nothing, because "6591234567" is not a substring of "91234567".
 */
/** (REG-547, tester feedback 2026-09-15: "12345678" saved) The one validity rule for a Singapore number: eight digits
    starting 6 (landline), 8 or 9 (mobile). Every phone box — the lead form, Invite to Portal, the contract's signing
    recipient — asks this of the bare digits, never a local length check. */
export const isSgPhone = (digits: string): boolean => /^[689]\d{7}$/.test(digits)
/** (fix-G, G-05) A Singapore MOBILE number — 8 or 9 first. The client portal's sign-in sends a one-time code by SMS, which a landline (6…)
    can never take: every number that signs in to the portal (the client's, the household's) asks this, in the browser and on the server. */
export const isSgMobile = (digits: string): boolean => /^[89]\d{7}$/.test(digits)
export const SG_MOBILE_MSG = 'Enter a Singapore mobile number — 8 or 9 first'

export function phoneDigits(raw: string | null | undefined): string {
  const d = digitsOnly(raw ?? '')
  return d.length === 10 && d.startsWith('65') ? d.slice(2) : d   // the +65 country code is implied, never stored
}

/** A phone AS IT IS TYPED (REG-456, user feedback 2026-09-16): the on-screen grouping applied to whatever is in the box so
    far — "9123" · "9123 4" · "9123 4567"; a number past eight digits regroups 5 + 5. Display only: the box stores digits. */
export function phoneTyped(raw: string | null | undefined): string {
  const d = digitsOnly(raw ?? '')
  if (d.length <= 4) return d
  if (d.length <= 8) return `${d.slice(0, 4)} ${d.slice(4)}`
  return `${d.slice(0, 5)} ${d.slice(5, 10)}`
}
/** How a local number reads on screen (REG-452, user feedback 2026-09-16): "9041 4042" — Singapore's 4 + 4; a 10-digit
    number 5 + 5; anything else as its digits. The space is display only: search, copy-back and storage strip it (phoneDigits). */
export function phoneLocal(phone: string | null | undefined): string {
  const d = phoneDigits(phone)
  if (d.length === 8) return `${d.slice(0, 4)} ${d.slice(4)}`
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`
  return d
}
/** How a phone is copied and exported: "+65 9041 4042" — the country code the column leaves implied, the same spacing as on screen. */
export function phoneDisplay(phone: string | null | undefined): string {
  const d = phoneLocal(phone)
  return d ? `+65 ${d}` : ''
}

export function money(minor: number): string {
  return new Intl.NumberFormat('en-SG', { maximumFractionDigits: 0 }).format(minor / 100)
}
export function moneySGD(minor: number): string {
  return `S$${money(minor)}`
}

/** Local-midnight timestamp — a date-only task due is stamped at local midnight (one with a time keeps it, `hasTime`). */
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
/** Overdue = due on a calendar day BEFORE today (same-day tasks are 'Due today'). */
export const isOverdue = (due: Date | null | undefined, now: number) =>
  !!due && startOfDay(due) < startOfDay(new Date(now))
export const isDueToday = (due: Date | null | undefined, now: number) =>
  !!due && startOfDay(due) === startOfDay(new Date(now))

/* ---- Input parsing (strict) — fields never accept free text that is not a real date (user 2026-08-29) ---- */

/**
 * THE `d/m/yyyy` parser — local midnight, or null. Rejects impossible dates (31/2, 32/13/2026).
 *
 * (REG-286, audit finding "parseDMY exists three times and the import copy silently accepts impossible dates"):
 * fields, filters and the CSV import must all read this one, so a date the UI refuses can never arrive through
 * another door. `null` / `undefined` parse as "no date", so an absent CSV column can be handed straight in.
 * `inputDate` is the inverse.
 */
export function parseInputDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(s)
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null
}

/** `d/m/yyyy, h:mm AM` (space before AM/PM optional) → Date, or null. */
export function parseInputDateTime(s: string): Date | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})\s*([AaPp][Mm])\s*$/.exec(s)
  if (!m) return null
  const day = parseInputDate(`${m[1]}/${m[2]}/${m[3]}`)
  const h12 = Number(m[4]), min = Number(m[5])
  if (!day || h12 < 1 || h12 > 12 || min > 59) return null
  const pm = m[6]!.toUpperCase() === 'PM'
  day.setHours((h12 % 12) + (pm ? 12 : 0), min, 0, 0)
  return day
}

/**
 * (the calm UI build 2026-10-27 — the audit's 3-20 · 4-16 · 1-24, T-11 one format) What a date field SHOWS: the house date, the year in full —
 * "7 Oct 2026", "7 Oct 2026 · 2:00 PM" (was the field's own "7/10/2026", read as July 10 by many). Display only: the field still holds and
 * hands on `d/m/yyyy` (`inputDate` · `formatInputDateTime`), which every parser reads — dates are never typed (REG-119), so nothing is lost.
 */
export function fieldDateWords(value: string | null | undefined): string {
  const d = parseInputDate(value)
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : (value ?? '')
}
export function fieldDateTimeWords(value: string | null | undefined, weekday = false): string {
  const d = value ? parseInputDateTime(value) : null
  /* (the calm UI build, closing regression) `weekday`: the dates people plan by wear their day (Dane UAT g-weekday) — the task panel's Due,
     whose second line saying the day went with 1-24's one date */
  return d ? `${weekday ? `${DAYS[d.getDay()]}, ` : ''}${fieldDateWords(inputDate(d))} · ${displayTime(d)}` : fieldDateWords(value)
}

/** The canonical value date-time fields hold: `12/8/2026, 3:00 PM`. */
export function formatInputDateTime(d: Date): string {
  let h = d.getHours()
  const am = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return `${inputDate(d)}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${am}`
}

/**
 * (REG-329, user 2026-09-04: "whatever case the user types, make sure it's always … first letter in caps") A person's
 * name as the product shows it: every word capitalised, the rest lowered — "farah ahmad" and "FARAH AHMAD" both save
 * as "Farah Ahmad". A word starts after a space, a hyphen or an apostrophe (Jean-Luc, D’Souza). Whitespace is collapsed.
 */
export function titleCaseName(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

/** (REG-563) A Singapore NRIC / FIN as typed: a letter, seven digits, a letter — spaces ignored, case free. */
export const isNric = (v: string) => /^[STFGM]\d{7}[A-Z]$/i.test(v.replace(/\s+/g, ''))
/** (S42 B-06) A Singapore UEN as ACRA issues it — a business's 8 digits and a letter (53012345A), a company's year and 5 digits and a letter
    (201912345K), or another entity's T/S, year, two-letter type, 4 digits and a letter (T09LL0001B). Spaces ignored, case free. */
export const isUen = (v: string) => /^(\d{8}[A-Z]|\d{9}[A-Z]|[ST]\d{2}[A-Z]{2}\d{4}[A-Z])$/i.test(v.replace(/\s+/g, ''))
/** (REG-563) "S1234567A" → "•••••567A": only the last four characters are kept, which is all a signed document shows. */
export const maskNric = (v: string) => { const t = v.replace(/\s+/g, '').toUpperCase(); return `${'•'.repeat(Math.max(0, t.length - 4))}${t.slice(-4)}` }

/* ── (parity P-28 · P-29 · Q-03 · Q-13 · Q-14, 2026-10-08) One way to count and write time and money on both records ─────────────────
   Every report, record and listing counts days on the calendar (the Schedule's rule, REG-1131: never elapsed milliseconds, which read one day
   fewer before midnight) and writes them "n days" in words — never weeks. A span under two days keeps its minutes and hours (turnaround needs
   them, 1.0's "30m" · "26.3h"). Empty is the house "--".
   (the calm UI build 2026-10-27 — the audit's 5-09 · 1-17 · 5-48, T-09 · T-08) in words a studio owner says — "30 min", "26 hours" — and an
   empty value is the house's one stand-in, "—" (`EMPTY`; was "--", beside "- -" on the same pages). */
/** (the calm UI build 2026-10-27, T-08) the one mark a table cell shows for a value it doesn't have */
export const EMPTY = '—'
const DAY_MS = 86_400_000
/** The calendar day a moment falls on (local), as a whole number — differences are whole days. */
export const calendarDay = (at: number | Date): number => { const d = at instanceof Date ? at : new Date(at); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS) }
/** Calendar days from one moment to another (0 on the same day). */
export const calendarDaysBetween = (from: number | Date, to: number | Date): number => calendarDay(to) - calendarDay(from)
/** "1 day" · "12 days" — never weeks. */
export const dayWords = (n: number): string => `${n} ${Math.abs(n) === 1 ? 'day' : 'days'}`
/** A span in the house words: under an hour "30 min", under two days "26 hours", else calendar days "12 days"; null → "—". */
export function spanWords(from: number | null | undefined, to: number | null | undefined): string {
  if (from == null || to == null) return EMPTY
  const ms = to - from
  if (ms < 3_600_000) return `${Math.max(0, Math.round(ms / 60_000))} min`
  if (ms < 48 * 3_600_000) { const r = Math.max(1, Math.round(ms / 3_600_000)); return `${r} ${r === 1 ? 'hour' : 'hours'}` }
  return dayWords(calendarDaysBetween(from, to))
}
/** A duration given only as milliseconds (a median, a mean): under two days as `spanWords`, else whole days rounded — "n days"; null → "—". */
export function durationWords(ms: number | null | undefined): string {
  if (ms == null) return EMPTY
  if (ms < 48 * 3_600_000) return spanWords(0, ms)
  return dayWords(Math.round(ms / DAY_MS))
}
/** (Q-03) A sum on a record's CARD, as the lead's mocked Quotes card writes it: "S$ 77,900" — a space, whole dollars. Money documents
    (invoices, the Money tab, Finance, the quote editor) keep their cents. */
export const moneyCard = (minor: number): string => `S$ ${money(minor)}`

/**
 * (the calm UI build 2026-10-27 — the audit's 4-43, T-11) ONE "Saved …" label for every editor (the quote's, the contract's, the libraries'):
 * "Saved just now" · "Saved 2 mins ago" · "Saved 3 hours ago" · "Saved 7 Sep ’26" — the house months (`displayDate`), never the server's locale
 * ("7 Sept"). The quote editor's header wording (1201:33811).
 */
export function savedLabel(updatedAt: number, now: number): string {
  const s = Math.max(0, Math.round((now - updatedAt) / 1000))
  if (s < 45) return 'Saved just now'
  const m = Math.round(s / 60)
  if (m < 60) return `Saved ${m} ${m === 1 ? 'min' : 'mins'} ago`
  const h = Math.round(m / 60)
  if (h < 24) return `Saved ${h} ${h === 1 ? 'hour' : 'hours'} ago`
  return `Saved ${displayDate(new Date(updatedAt))}`
}

/** (pending modules S16 — 1.0's rail and dock wrote "99+") A count on a glyph: the number up to 99, then "99+", so a busy studio's badge keeps to
    its corner instead of running over the icon. The control's accessible name keeps the whole number. */
export const badgeCount = (n: number): string => (n > 99 ? '99+' : String(n))
