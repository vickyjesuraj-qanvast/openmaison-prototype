import 'server-only'
import { fetchFeed } from '@/lib/notifications/queries'
import { noticePrefsOf } from '@/lib/notifications/prefs-server'
import { countWords, summaryParts } from '@/lib/notifications/summary'
import { dueLine } from '@/lib/notifications/due-line'
import { ago } from '@/lib/templates/ago'
import type { MaisonAnswer } from '@/lib/maison-ai'
import { go, row, type Ctx } from './common'

/**
 * (pending modules S18 — the steps' note after S10: "Maison AI could answer 'what did I miss today?' from the digest's own rows") What the
 * member missed: the daily summary's own rows (lib/notifications/summary.ts `summaryParts`) read from their bell now — every notice still
 * unread, then what is due — minus what they muted. Each row opens the record, as the bell's row does; nothing is marked read.
 */
export async function missedAnswer(c: Ctx): Promise<MaisonAnswer> {
  const [feed, prefs] = await Promise.all([fetchFeed(c.viewer.id, c.viewer.role), noticePrefsOf([c.viewer.id])])
  const { notices, due } = summaryParts(feed.rows, 0, prefs.get(c.viewer.id)?.muted ?? new Set())
  const link = { label: 'Your notifications', href: go(c, '/profile#notifications') }
  if (!notices.length && !due.length) return { title: 'You’re all caught up', text: 'Nothing unread in your bell and nothing due.', link }
  const rows = [
    ...notices.slice(0, 10).map((r) => row(c, `n:${r.id}`, r.title, [r.body, ago(r.at, c.now)].filter(Boolean).join(' · '), r.href && !r.href.startsWith('#') ? r.href : null)),
    ...due.slice(0, 10).map((r) => row(c, `d:${r.id}`, r.title, [r.body, dueLine(r, c.now)].filter(Boolean).join(' · '), r.href)),
  ]
  const more = Math.max(0, notices.length - 10) + Math.max(0, due.length - 10)
  return { title: countWords(notices.length, due.length).replace(/^./, (x) => x.toUpperCase()), text: `${notices.length ? 'The notices you haven’t opened, newest first' : 'Nothing unread'}${due.length ? ', then what is due' : ''}.${more ? ` ${more} more in the bell.` : ''}`, rows, link }
}
