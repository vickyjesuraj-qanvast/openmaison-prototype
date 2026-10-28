/*
 * (pending modules S18 — card held:notifications, "Daily digest email … a once-a-day summary is the quiet option owners expect"; 1.0's
 * src/app/api/cron/notification-digest) A member's **daily summary** — pure and client-safe: which of the bell's rows it carries and the email
 * it is. Built from the very rows the member's bell shows (lib/notifications/queries.ts `fetchFeed`) — never a second list: the notices still
 * unread that came in since their last summary (1.0: the unread in-app rows of the last 24 hours), and what is due now (the bell's Due group,
 * which 1.0's digest didn't carry), minus what they muted. It goes once a day at 8 AM through the one delivery layer
 * (lib/notifications/summary-server.ts) and is listed in Settings › Notifications › Sent messages like every message.
 */
import { displayDateLong, displayTime } from '@/lib/format'
import { IN_APP_ONLY, type EventKey, type FeedRow } from '@/lib/notifications/model'
import { dueLine } from '@/lib/notifications/due-line'

/** The outbox's event for a summary — Sent messages lists it with the studio's events. */
export const SUMMARY_EVENT = 'daily_summary' as const
export type SummaryEvent = typeof SUMMARY_EVENT
/** (invented copy) Sent messages' word for it */
export const SUMMARY_EVENT_LABEL = 'Your notifications · A daily summary'
/** How many lines one summary lists of each part — the rest are counted ("and 4 more in the bell"). */
export const SUMMARY_MAX = 25
/** With no summary before it, a summary looks back a day (1.0's 24 hours). */
export const FIRST_LOOK_BACK_MS = 24 * 60 * 60_000

/** The local day a summary is for, as its key carries it — "2026-10-12". */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** The summary's place in the outbox: one a day at 8 AM, and any sent by hand that day after it. */
export const summaryKey = (memberId: string, day: string, extra?: number) => `s:${memberId}:${day}${extra ? `:${extra}` : ''}`

export type SummaryParts = { notices: FeedRow[]; due: FeedRow[] }
/** The bell's rows a summary carries: the unread notices since `since`, and every row due — never a muted kind, never one that stays in the
    app (pending modules S41b-4: an upgrade offer is the bell's alone). Newest first, as the bell. */
export function summaryParts(rows: readonly FeedRow[], since: number, muted: ReadonlySet<EventKey | string>): SummaryParts {
  const keep = rows.filter((r) => !muted.has(r.kind) && !IN_APP_ONLY.has(r.kind))
  return {
    notices: keep.filter((r) => !r.derived && r.readAt === null && r.at > since).sort((a, b) => b.at - a.at),
    due: keep.filter((r) => r.derived).sort((a, b) => a.at - b.at),   // the longest-waiting first, as a to-do reads
  }
}
export const isEmpty = (p: SummaryParts) => !p.notices.length && !p.due.length

/** "3 notices, 2 due" · "1 notice" · "2 due" (invented copy) */
export function countWords(n: number, d: number): string {
  return [n ? `${n} ${n === 1 ? 'notification' : 'notifications'}` : '', d ? `${d} due` : ''].filter(Boolean).join(', ') || 'nothing new'
}

/**
 * The email a summary is, as the member reads it (invented copy, the shape of the house messages: "Hi {member}," … the studio). Each line is
 * the bell's own words — its title, its line, a due row's due line — with the record's link under it.
 */
export function composeSummary(o: { member: string; studio: string; parts: SummaryParts; since: number | null; now: number; link: (href: string | null) => string; settings: string }): { subject: string; body: string } {
  const { notices, due } = o.parts
  const first = o.member.trim().split(/\s+/)[0] || o.member
  const since = o.since === null ? 'in the last 24 hours' : `since ${displayDateLong(new Date(o.since))}, ${displayTime(new Date(o.since))}`
  const line = (r: FeedRow, tail?: string) => `• ${r.title}${r.body ? ` — ${r.body}` : ''}${tail ? ` · ${tail}` : ''}\n  ${o.link(r.href)}`
  const part = (head: string, list: FeedRow[], tail?: (r: FeedRow) => string) => {
    if (!list.length) return ''
    const shown = list.slice(0, SUMMARY_MAX).map((r) => line(r, tail?.(r)))
    const more = list.length - shown.length
    return `${head} (${list.length})\n${shown.join('\n')}${more > 0 ? `\n…and ${more} more in the bell` : ''}`
  }
  const parts = [part('Notifications', notices), part('Due', due, (r) => dueLine(r, o.now))].filter(Boolean)
  const lede = notices.length && due.length ? `Here is what came in ${since}, and what is due.` : notices.length ? `Here is what came in ${since}.` : 'Nothing new came in — here is what is due.'
  return {
    subject: `Your summary from ${o.studio} — ${countWords(notices.length, due.length)}`,
    body: `Hi ${first},\n\n${lede}\n\n${parts.join('\n\n')}\n\nMute a notification, or have your emails come as they happen: ${o.settings}\n\n${o.studio}`,
  }
}
