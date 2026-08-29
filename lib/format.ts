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
