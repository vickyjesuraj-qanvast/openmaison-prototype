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

/** My work card head (858:24989): "Wed, 26 Aug". */
export function displayDayMonth(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

const LONG_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
/** Files grid group head (931:39123): "Friday, 17 Jul ’26". */
export function displayDateWeekday(d: Date): string {
  return `${LONG_DAYS[d.getDay()]}, ${displayDate(d)}`
}

/** File size as the mock types it (931:40181 "711 KB"): whole KB below 1 MB, one decimal MB above. */
export function fileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '--'
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

export function displayDateTime(d: Date): string {
  let h = d.getHours()
  const am = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${displayDate(d)}, ${h}:${m} ${am}`
}

export function inputDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

/** "1d ago"-style relative time, as on kanban cards. */
export function relativeTime(d: Date, now = new Date()): string {
  const s = Math.max(0, (now.getTime() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const mi = Math.floor(s / 60)
  if (mi < 60) return `${mi}m ago`
  const h = Math.floor(mi / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 30) return `${days}d ago`
  return displayDate(d)
}

/** Table budget cell shows bare grouped number ("70,500"); S$ prefix where the mock has it. */
/** Keep digits only — what a numeric field accepts from typing or paste. */
export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
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
export function phoneDigits(raw: string | null | undefined): string {
  const d = digitsOnly(raw ?? '')
  return d.length === 10 && d.startsWith('65') ? d.slice(2) : d   // the +65 country code is implied, never stored
}

/** How a phone is shown, copied and exported: "+65 91234567" — the country code the column leaves implied. */
export function phoneDisplay(phone: string | null | undefined): string {
  const d = phoneDigits(phone)
  return d ? `+65 ${d}` : ''
}

export function money(minor: number): string {
  return new Intl.NumberFormat('en-SG', { maximumFractionDigits: 0 }).format(minor / 100)
}
export function moneySGD(minor: number): string {
  return `S$${money(minor)}`
}

/** Local-midnight timestamp — task due dates are stamped at local midnight. */
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

/** The canonical value date-time fields hold: `12/8/2026, 3:00 PM`. */
export function formatInputDateTime(d: Date): string {
  let h = d.getHours()
  const am = h < 12 ? 'AM' : 'PM'
  h = h % 12 || 12
  return `${inputDate(d)}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${am}`
}
