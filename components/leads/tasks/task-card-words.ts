import { displayTime, hasTime, isDueToday, isOverdue, startOfDay } from '@/lib/format'

/*
 * (Leads on the move, L4 — P-10 · C-05 · C-06 · C-20 · A-09, his marks 2026-10-23 "continue the leads") The words a task says on the move, pure:
 * the due day as a chip on the phone card and the tablet's Due cell ("Today · 10:00 AM", "Tomorrow", "Thu 22 Oct · 10:00 AM", "Mon 19 Oct · late"),
 * and the due presets "call back tomorrow at 10" is made of — Tomorrow 10:00 · In 3 days · Next week · Pick a day — on the quick add, the task
 * panel and (L3) the listing card's Tasks sheet. Every word comes from the task's own date; nothing about the client is invented.
 */

const DAY = 86_400_000
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type DueTone = 'late' | 'today' | 'done' | 'none'
export type DueChip = { text: string; tone: DueTone }

/** "Thu 22 Oct" — the day with its date; with its year ("Thu 7 Jan ’27") only when `now` is given and the year is not this one. */
export function shortDay(d: Date, now?: number): string {
  const year = now !== undefined && d.getFullYear() !== new Date(now).getFullYear() ? ` ’${String(d.getFullYear()).slice(2)}` : ''
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${year}`
}

/** The due chip on a phone card and in a tablet's Due cell: what a designer on site reads in a glance — the day first, its time after,
 *  late in red with its hour kept ("Mon 19 Oct · 10:00 AM · late" — Dane UAT 5.13's day and time), a completed task's day quiet. No date:
 *  null (the card says nothing; the panel's When sets it). */
export function dueChip(due: Date | null | undefined, done: boolean, now: number): DueChip | null {
  if (!due) return null
  const time = hasTime(due) ? ` · ${displayTime(due)}` : ''
  if (done) return { text: `${shortDay(due, now)}${time}`, tone: 'done' }
  if (isOverdue(due, now)) return { text: `${shortDay(due, now)}${time} · late`, tone: 'late' }
  if (isDueToday(due, now)) return { text: `Today${time}`, tone: 'today' }
  const days = Math.round((startOfDay(due) - startOfDay(new Date(now))) / DAY)
  if (days === 1) return { text: `Tomorrow${time}`, tone: 'none' }
  return { text: `${shortDay(due, now)}${time}`, tone: 'none' }
}

/** The presets, in the order the brief draws them. `pick` is the calendar's own row (the house date picker with its time). */
export type DuePreset = 'tomorrow' | 'in3' | 'nextWeek'
export const DUE_PRESETS: readonly { key: DuePreset; label: string }[] = [
  { key: 'tomorrow', label: 'Tomorrow 10:00' },
  { key: 'in3', label: 'In 3 days' },
  { key: 'nextWeek', label: 'Next week' },
]
export const PICK_A_DAY = 'Pick a day'
/** Every preset lands at 10:00 in the morning — the hour "call back tomorrow at 10" names. */
export const PRESET_HOUR = 10

/** The date a preset means, from the host's clock: tomorrow at 10:00 · three days on at 10:00 · the coming Monday at 10:00 (a Monday's own
 *  "next week" is the Monday after). */
export function presetDate(key: DuePreset, now: number): Date {
  const today = new Date(now)
  const at = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, PRESET_HOUR, 0, 0, 0)
  if (key === 'tomorrow') return at(1)
  if (key === 'in3') return at(3)
  const toMonday = ((8 - today.getDay()) % 7) || 7
  return at(toMonday)
}

/** Which preset a date is (to light its chip), or null — a date picked from the calendar, or none. */
export function presetOf(due: Date | null | undefined, now: number): DuePreset | null {
  if (!due) return null
  for (const p of DUE_PRESETS) if (presetDate(p.key, now).getTime() === due.getTime()) return p.key
  return null
}

/** The fourth chip's words: "Pick a day" until a calendar day is picked, then that day ("Fri 30 Oct · 10:00 AM"). */
export function pickedLabel(due: Date | null | undefined, now: number): string {
  if (!due || presetOf(due, now)) return PICK_A_DAY
  return `${shortDay(due, now)}${hasTime(due) ? ` · ${displayTime(due)}` : ''}`
}
