import { moneyCard, displayDate } from '@/lib/format'
import type { HangoutView } from '@/lib/hangouts/queries'

/**
 * (pending modules S27) A Hangout's Plan's words — its facts, the plan's sent line, each person's shifts and the order they stand in — written
 * once, apart from the Plan (plan-view.tsx), so each reads as a rule. *(invented copy: every line)*
 */
export const tablesValue = (data: HangoutView) => {
  const p = data.participation
  return p?.status === 'confirmed' ? (p.tablesLine ?? 'Qanvast gives them nearer the day') : `${moneyCard(data.event.pricePerTableMinor * data.event.tablesPerStudio)} · ${data.event.tablesPerStudio} tables`
}
export const factLines = (data: HangoutView) => [
  data.event.customerProfile ? { muted: 'Who comes: ', text: data.event.customerProfile } : null,
  data.event.studioExpectations ? { muted: 'Qanvast asks: ', text: data.event.studioExpectations } : null,
  data.participation?.status === 'confirmed' ? { muted: 'Promised: ', text: `${data.event.promisedMeetings} chats for your studio` } : null,
].filter((x): x is { muted: string; text: string } => !!x)

export function planSentLine(data: HangoutView): string {
  const p = data.participation
  const ended = data.event.phase === 'ended'
  const changedSince = !!p?.planSentAt && !!p.planSavedAt && p.planSavedAt > p.planSentAt
  const sent = (at: number) => `Sent to Qanvast on ${displayDate(new Date(at))}${p?.planSentBy ? ` by ${p.planSentBy}` : ''}`
  return ended ? (p?.planSentAt ? sent(p.planSentAt) : 'Not sent to Qanvast')
    : p?.planSentAt ? (changedSince ? `Changed since you sent it to Qanvast on ${displayDate(new Date(p.planSentAt))} — send it again so Qanvast matches on it` : sent(p.planSentAt))
    : 'Not sent to Qanvast yet — Qanvast matches homeowners to your studio on it'
}
export const whoGoesHelp = (data: HangoutView) => `Who sits at your ${data.event.tablesPerStudio === 1 ? 'table' : `${data.event.tablesPerStudio} tables`} on each shift — up to ${data.event.tablesPerStudio} on a shift. Homeowners who book on your page meet whoever is on their shift, and see each one’s public card there.`
export const shiftLabel = (data: HangoutView, s: HangoutView['shifts'][number]) => (data.event.dayCount > 1 ? s.short : `${s.label} · ${s.short.split(', ')[1] ?? ''}`)
/** the team as the plan lists them: who is on a shift first, then by name */
export const planPeople = (data: HangoutView, plan: Record<string, string[]>) =>
  [...data.team].sort((a, b) => Number((plan[b.id] ?? []).length > 0) - Number((plan[a.id] ?? []).length > 0) || a.name.localeCompare(b.name))
export const planOf = (data: HangoutView) => Object.fromEntries(data.designers.map((d) => [d.memberId, d.shiftIds])) as Record<string, string[]>
