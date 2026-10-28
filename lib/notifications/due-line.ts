import { displayDateLong } from '@/lib/format'
import type { FeedRow } from '@/lib/notifications/model'

/** (UX audit V8) A follow-up's due line — "Due Mon, 28 Sep ’26 · 2 days late", "Due today · 3 h late", "Due in 12 min" — so an overdue row says
    how late it is, never a bare "Due". `at` is when it came due (a due-soon row: 30 minutes before it does). (Dane UAT 5.13) The day wears its
    weekday, as every date people plan by does. (pending modules S18) Pure — the bell draws it and the daily summary writes it. */
export function dueLine(r: Pick<FeedRow, 'kind' | 'at' | 'due'>, now: number): string {
  const today = new Date(now)
  const dayOf = (d: Date) => (d.toDateString() === today.toDateString() ? 'today' : displayDateLong(d))
  /* (pending modules S18) a task due soon: in minutes when it is within the hour; a running project's task the alerts' lead time ahead ("Due
     tomorrow: …") on its day — it read "Due in 29 min" before, whatever its day */
  if (r.kind === 'task_due_soon') {
    const at = r.due ?? r.at + 30 * 60_000
    /* (the Dashboard redesigned, 2026-10-26 — P-13, one overdue clock) a task due today whose time has gone is due today, not late: overdue
       starts the next day, as the task lists count it (`isOverdue`) */
    if (at <= now) return `Due ${dayOf(new Date(at))}`
    const m = Math.round((at - now) / 60_000)
    return m <= 60 ? `Due in ${Math.max(1, m)} min` : `Due ${dayOf(new Date(at))}`
  }
  const due = new Date(r.at)
  const day = dayOf(due)
  const late = now - r.at
  /* (REG-1204) an invoice ready to send is waiting, not overdue: "Ready since Mon, 5 Oct ’26 · 2 days", never red */
  if (r.kind === 'invoice_ready') { const d = Math.floor(late / 86_400_000); return `Ready since ${day}${d >= 1 ? ` · ${d} ${d === 1 ? 'day' : 'days'}` : ''}` }
  if (late < 60_000) return `Due ${day}`
  const days = Math.floor(late / 86_400_000), hours = Math.floor(late / 3_600_000), mins = Math.floor(late / 60_000)
  return `Due ${day} · ${days >= 1 ? `${days} ${days === 1 ? 'day' : 'days'}` : hours >= 1 ? `${hours} h` : `${mins} min`} late`
}
