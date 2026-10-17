/**
 * (pending modules S23 — 1.0's Prep Card, src/components/copilot/prep-card.tsx) What the studio knows before it walks in: the facts (the last
 * brief's profile first, then the lead's record — 1.0's order), what is still unknown, the last meeting's summary, its concerns and rivals, what to
 * focus on, and how warm the client was. Pure and client-safe.
 */
import { groupDigits, moneyCard } from '@/lib/format'
import { DIMENSIONS, TIER_LINES, tierOf, type MeetingBrief, type Tier } from './model'

export type PrepFact = { label: string; value: string }
export type Prep = {
  know: PrepFact[]
  unknown: string[]
  last: { summary: string; at: number; count: number } | null
  concerns: string[]
  competitors: string[]
  focus: string[]
  temperature: { score: number; tier: Tier; line: string; dims: { label: string; value: number; line: string }[] } | null
}

/** What to focus on when no earlier meeting says — by the meeting's aim. */
const FOCUS: Record<string, string[]> = {
  first_consultation: ['Find out the budget, the rooms and the style', 'Ask when they collect the keys', 'Find out who decides with them'],
  follow_up: ['Settle the doubts from last time', 'Go through any change to the scope', 'Agree the next step'],
  site_visit_debrief: ['Measure and photograph each room', 'Note what’s there and what has to go', 'Check the electrical and plumbing points'],
  quote_presentation: ['Walk through each line of the quote', 'Go through the payment schedule', 'Say what’s included and what isn’t'],
  closing: ['Agree the final price', 'Confirm the payment schedule and the deposit', 'Agree the start date'],
  other: ['Agree the next step'],
}

export type PrepLead = { propertyType: string | null; areaSqft: number | null; budgetMinor: number; style: string | null; keyCollection: string | null }
export function prepOf(i: { lead: PrepLead; aim: string; last: { brief: MeetingBrief; at: number } | null; count: number }): Prep {
  const p = i.last?.brief.profile ?? null
  const know: PrepFact[] = []
  const unknown: string[] = []
  const prop = p?.propertyType ?? i.lead.propertyType
  const area = p?.areaSqft ?? i.lead.areaSqft
  if (prop) know.push({ label: 'Property', value: area ? `${prop} · ${groupDigits(String(area))} sq ft` : prop })
  if (!prop || !area) unknown.push('Property type & size')
  const budget = p?.budgetMinor ? (p.budgetMinor.min === p.budgetMinor.max ? moneyCard(p.budgetMinor.min) : `${moneyCard(p.budgetMinor.min)} – ${moneyCard(p.budgetMinor.max)}`) : i.lead.budgetMinor > 0 ? moneyCard(i.lead.budgetMinor) : null
  if (budget) know.push({ label: 'Budget', value: budget }); else unknown.push('Budget')
  const style = p?.styles.length ? p.styles.join(', ') : i.lead.style
  if (style) know.push({ label: 'Style', value: style }); else unknown.push('Style')
  const keys = p?.keyCollection ?? i.lead.keyCollection
  if (keys) know.push({ label: 'Key collection', value: keys })
  if (p?.timeline) know.push({ label: 'Timeline', value: p.timeline })
  if (!keys && !p?.timeline) unknown.push('Key collection / move-in')
  if (p?.decisionMakers) know.push({ label: 'Who decides', value: p.decisionMakers }); else unknown.push('Who decides')
  const b = i.last?.brief ?? null
  const score = b?.score ?? null
  return {
    know,
    unknown,
    last: b && i.last ? { summary: b.summary, at: i.last.at, count: i.count } : null,
    concerns: p?.concerns ?? [],
    competitors: p?.competitors ?? [],
    focus: (b?.actions.length ? b.actions : FOCUS[i.aim] ?? FOCUS.other!).slice(0, 3),
    temperature: score !== null && score > 0 && b?.dims ? { score, tier: tierOf(score), line: TIER_LINES[tierOf(score)], dims: DIMENSIONS.map((d) => ({ label: d.label, value: b.dims![d.key], line: b.dims![d.key] >= 0.6 ? d.high : d.low })) } : null,
  }
}
