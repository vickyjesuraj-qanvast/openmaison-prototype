import { MEETING_MINUTES, clockWords } from '@/lib/hangouts/model'
import { displayTime } from '@/lib/format'
import type { HangoutMeetingRow, HangoutView } from '@/lib/hangouts/queries'

/**
 * (pending modules S27) A Hangout chat card's words — the scopes and their counts, the card's head, who and when, what they told the studio,
 * its one press and the lines under it — written once, apart from the card (meetings-view.tsx), so each reads as a rule.
 */
export type ChatScope = 'all' | 'mine' | 'waiting' | 'on' | 'done'
export const chatInScope = (r: HangoutMeetingRow, s: ChatScope, me: string) => s === 'all' ? r.status !== 'cancelled' : s === 'mine' ? r.memberId === me && r.status !== 'cancelled'
  : s === 'waiting' ? r.status === 'scheduled' : s === 'on' ? r.status === 'in-progress' : s === 'done' ? r.status === 'completed' : true
/** a Designer on the plan lands on their own chats on the day */
export const firstChatScope = (data: HangoutView): ChatScope => (data.viewer.onPlan && !data.viewer.runs && data.event.phase === 'today' ? 'mine' : 'all')
export function chatScopes(data: HangoutView): { value: ChatScope; label: string }[] {
  const n = (s: ChatScope) => data.meetings.filter((r) => chatInScope(r, s, data.viewer.id)).length
  return [{ value: 'all', label: `All · ${n('all')}` }, ...(data.viewer.onPlan ? [{ value: 'mine' as const, label: `Mine · ${n('mine')}` }] : []),
    { value: 'waiting', label: `Waiting · ${n('waiting')}` }, { value: 'on', label: `On now · ${n('on')}` }, { value: 'done', label: `Done · ${n('done')}` }]
}
export const walkInAllowed = (data: HangoutView) => data.event.phase === 'today' && (data.viewer.runs || data.viewer.shiftsToday.length > 0)
export const breakShown = (data: HangoutView) => data.event.phase === 'today' && data.viewer.shiftsToday.length > 0

export const chatMinutes = (r: HangoutMeetingRow, now: number) => (r.startedAt ? Math.max(0, Math.floor((now - r.startedAt) / 60_000)) : 0)
/** The card's head. (the calm UI build 2026-10-27, 2-26 · W-124) a waiting chat's head is its shift — when it is — and only the exception says
    how it was booked ("Walk-in"); "Booked on your page" stood on every card. */
export const chatTitle = (r: HangoutMeetingRow, minutes: number) => r.status === 'in-progress' ? `On now · ${minutes} of ${MEETING_MINUTES} minutes`
  : r.status === 'completed' && r.endedAt ? `Ended ${displayTime(new Date(r.endedAt))}`
  : [r.shiftLine || (r.via === 'desk' ? null : 'Booked'), r.via === 'desk' ? 'Walk-in' : null].filter(Boolean).join(' · ')
/** who has it, its shift (unless the head says it) and its table */
export const chatFacts = (r: HangoutMeetingRow) => [r.memberName ? `With ${r.memberName}` : 'Nobody has it yet', r.status === 'scheduled' ? null : r.shiftLine, r.tableNumber ? `Table ${r.tableNumber}` : null].filter(Boolean).join(' · ')
/** (the calm UI build 2026-10-27, 2-26 · W-191) how well they fit who the studio would like to meet (1.0's match score), in words — the number
    stays the rule's */
export const matchWords = (score: number) => (score >= 70 ? 'Good match' : score >= 40 ? 'Fair match' : 'Weak match')
/** what they told the studio, after how well it fits who the studio would like to meet (1.0's match score) */
export const chatTold = (r: HangoutMeetingRow) => [r.matchScore !== null ? matchWords(r.matchScore) : null, r.prefsLine || null].filter(Boolean).join(' · ')

export type ChatPress = { kind: 'start' | 'end' | 'take' | 'notes'; label: string }
export function chatPress(r: HangoutMeetingRow, data: HangoutView): ChatPress | null {
  const today = data.event.phase === 'today'
  const may = data.viewer.runs || r.memberId === data.viewer.id
  const onThisShift = data.designers.some((d) => d.memberId === data.viewer.id && (!r.shiftId || d.shiftIds.includes(r.shiftId)))
  if (r.status === 'scheduled' && today && may && r.memberId) return { kind: 'start', label: 'Start' }
  if (r.status === 'in-progress' && may) return { kind: 'end', label: 'End the chat' }
  if (r.status === 'scheduled' && !r.memberId && onThisShift) return { kind: 'take', label: 'Take it' }
  if (r.status === 'completed' && r.meetingId) return { kind: 'notes', label: r.notes || r.scope ? 'Notes' : 'Write up' }
  return null
}

/** the lines under the card: how it went, or what waits */
export function chatLines(r: HangoutMeetingRow, data: HangoutView, minutes: number): { kind: 'outcome' | 'help'; text: string; muted?: string }[] {
  const today = data.event.phase === 'today'
  const out: { kind: 'outcome' | 'help'; text: string; muted?: string }[] = []
  if (r.status === 'completed') out.push({ kind: 'outcome', text: [r.reason, r.scope].filter(Boolean).join(' — '), muted: r.durationMin ? ` · ${r.durationMin} min` : undefined })
  if (r.status === 'scheduled' && !today && data.event.phase === 'ahead') out.push({ kind: 'help', text: 'Starts on the day of the Hangout.' })
  if (r.status === 'scheduled' && today && !r.memberId) out.push({ kind: 'help', text: 'Nobody from the studio is on this chat — an Owner or an Admin gives it to someone, or someone on the shift takes it.' })
  if (r.status === 'in-progress' && r.startedAt) {
    const at = new Date(r.startedAt)
    out.push({ kind: 'help', text: `Started ${clockWords(`${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`)}${minutes > MEETING_MINUTES ? ` — ${minutes - MEETING_MINUTES} minutes over` : ''}` })
  }
  return out
}
