/**
 * (pending modules S23 — 1.0's brief/generate: a model's summary, customer profile, suggested actions, follow-up draft and upsells) The brief
 * after a meeting, made by rule from the co-pilot's reading (lib/meetings/engine.ts) — the same reading the meeting showed, so nothing in the
 * brief was not on the screen. Every line can be edited; a part the studio edited is kept when the brief is made again. Pure and client-safe.
 * The words are invented copy (her sign-off owed), in the briefs' voice (lib/maison-ai/drafts.ts).
 */
import { displayDayMonth, groupDigits, moneyCard, startOfDay } from '@/lib/format'
import { aimLabel, firstOf, whereWords, type Features, type MeetingBrief } from './model'
import { dimLines, type Reading } from './engine'

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const lower = (s: string) => s.replace(/^./, (c) => c.toLowerCase())
/** The home as a sentence says it — "their semi-D", "their HDB 4-room flat" — not the lead form's list label ("Landed — Semi-D"). */
export function homeWords(type: string | null | undefined): string {
  const t = (type ?? '').trim()
  if (!t || t === 'Others') return 'home'
  const landed = /^Landed — (.+)$/.exec(t)
  if (landed) return landed[1] === 'Terrace' ? 'terrace house' : landed[1] === 'Bungalow' ? 'bungalow' : landed[1] === 'Semi-D' ? 'semi-D' : landed[1]!.toLowerCase()
  const flat = /^(HDB|BTO) (\d)-Room$/.exec(t)
  if (flat) return `${flat[1]} ${flat[2]}-room flat`
  if (t === 'HDB Executive') return 'HDB executive flat'
  if (t === 'Condo Studio / 1-bedder') return 'one-bedroom condo'
  const condo = /^Condo (\d)-bedder$/.exec(t)
  if (condo) return `${condo[1]}-bedroom condo`
  if (t === 'Executive Condo') return 'executive condo'
  const shop = /^Commercial — (.+)$/.exec(t)
  if (shop) return shop[1]!.toLowerCase()
  return t.toLowerCase()
}
const budgetWords = (b: { min: number; max: number }) => (b.min === b.max ? `around ${moneyCard(b.min)}` : `between ${moneyCard(b.min)} and ${moneyCard(b.max)}`)
/** A must-ask item as something to find out: "Budget range discussed" → "the budget range". */
export function askAbout(label: string): string {
  const t = label.replace(/\s*\(which rooms\)/i, '').replace(/\s+(discussed|confirmed|present|set|explored|defined|noted|agreed|reviewed|walked through|captured|reconfirmed|offered|clarified|mentioned)$/i, '').trim()
  return `the ${lower(t)}`
}

export type BriefInput = {
  reading: Reading
  meeting: { aim: string; whereKind: string; startsAt: number }
  lead: { name: string; propertyType: string | null }
  features: Features
  madeFrom: MeetingBrief['madeFrom']
  now: number
  /** the brief as it was — the parts the studio edited stay */
  prior?: MeetingBrief | null
}

export function briefOf(i: BriefInput): MeetingBrief {
  const r = i.reading, p = r.profile
  const first = firstOf(i.lead.name)
  const property = homeWords(p.propertyType ?? i.lead.propertyType)
  const whole = p.rooms.includes('Whole home')
  const rooms = p.rooms.filter((x) => x !== 'Whole home').map(lower)
  const said = r.lines.length > 0
  const aim = i.meeting.aim === 'other' ? 'meeting' : lower(aimLabel(i.meeting.aim))
  const when = new Date(i.meeting.startsAt)

  /* ── the summary, three to five sentences ── */
  const s: string[] = [`Met ${first} ${whereWords(i.meeting.whereKind)} for a ${aim} on ${displayDayMonth(when)}.`]
  if (whole) s.push(`They want a whole-home renovation of their ${property}${p.areaSqft ? ` of about ${groupDigits(String(p.areaSqft))} sq ft` : ''}.`)
  else if (rooms.length) s.push(`They talked about the ${list(rooms)} in their ${property}${p.areaSqft ? ` of about ${groupDigits(String(p.areaSqft))} sq ft` : ''}.`)
  const pieces = [p.budgetMinor ? `the budget is ${budgetWords(p.budgetMinor)}` : null, p.styles.length ? `they like a ${list(p.styles)} look` : null, p.timeline ? lower(p.timeline) : null].filter((x): x is string => !!x)
  if (pieces.length) s.push(`${pieces.join('; ').replace(/^./, (c) => c.toUpperCase())}.`)
  if (p.concerns.length || p.competitors.length) s.push(`They raised ${p.concerns.length ? `${list(p.concerns.map(lower))} concerns` : 'a few doubts'}${p.competitors.length ? ` and are also talking to ${list(p.competitors)}` : p.concerns.includes('Competition') ? ' and are comparing studios' : ''}.`)
  if (r.dims.decision >= 0.9) s.push('They’re ready to go ahead.')
  else if (p.decisionMakers) s.push(`They’ll decide together with their ${p.decisionMakers.replace(/^With their /, '')}.`)
  if (!said) s.push('No notes were taken.')
  const summary = s.join(' ')

  /* ── the next steps ── */
  const rules = new Set(r.tips.map((t) => t.rule))
  const kinds = new Set(r.objections.map((o) => o.kind))
  const actions: string[] = []
  const add = (a: string | null) => { if (a && !actions.includes(a) && actions.length < 5) actions.push(a) }
  if (kinds.has('price')) add('Show where the budget goes — the must-haves first, the rest phased')
  if (r.estimate.lines.length) add(`Prepare the quote for the ${whole ? 'whole home' : rooms.length ? list(rooms) : 'works discussed'}`)
  if (rules.has('decision_deferred') || p.decisionMakers) add(`Send ${first} a summary to share at home${p.decisionMakers ? ` with their ${p.decisionMakers.replace(/^With their /, '')}` : ''}`)
  if (kinds.has('competition') || p.competitors.length) add('Offer a line-by-line comparison with the other quote')
  if (p.styles.length && i.features.moodboard) add(`Share a ${p.styles[0]} mood board`)
  if (rules.has('timeline_urgent')) add('Confirm the date it must be done by, and the start date')
  for (const m of r.missed.slice(0, 2)) add(`Ask about ${askAbout(m.label)}`)
  if (actions.length < 3) add(r.checklist.find((c) => c.id === 'universal_next_meeting')?.ticked ? 'Send the follow-up message' : 'Set the next meeting')
  if (actions.length < 3) add('Send the follow-up message')

  /* ── the message to the client (WhatsApp opens on the press; the studio sends it) ── */
  const today = startOfDay(new Date(i.now)) === startOfDay(when)
  const heardOf = [whole ? 'a whole-home renovation' : rooms.length ? `the ${list(rooms)}` : null, p.budgetMinor ? `a budget ${budgetWords(p.budgetMinor)}` : null, p.styles.length ? `a ${p.styles[0]} look` : null].filter((x): x is string => !!x)
  const next = r.estimate.lines.length ? 'We’ll prepare the quote and send it to you shortly.' : p.styles.length && i.features.moodboard ? `We’ll send you a ${p.styles[0]} mood board to look through.` : 'We’ll be in touch with the next steps.'
  const followUp = [
    `Hi ${first}, thank you for meeting us${today ? ' today' : ` on ${displayDayMonth(when)}`}.`,
    heardOf.length ? `Here’s what we discussed for your ${property}: ${list(heardOf)}.` : null,
    next,
    p.decisionMakers ? `Happy to meet again with your ${p.decisionMakers.replace(/^With their /, '')} too.` : null,
  ].filter(Boolean).join(' ')

  const done = r.checklist.filter((c) => c.ticked).length
  const prior = i.prior
  const keep = (k: 'summary' | 'actions' | 'followUp') => !!prior && prior.edited.includes(k)
  return {
    summary: keep('summary') ? prior!.summary : summary,
    profile: p,
    actions: keep('actions') ? prior!.actions : actions,
    followUp: keep('followUp') ? prior!.followUp : followUp,
    upsells: r.addOns,
    objections: r.objections,
    estimate: r.estimate,
    score: said ? r.score : null,
    dims: said ? r.dims : null,
    checklist: { done, total: r.checklist.length, missed: r.missed.map((m) => m.label) },
    tags: r.tags,
    madeFrom: i.madeFrom,
    edited: prior?.edited ?? [],
  }
}

/** The deal score's why, for the brief and the prep card: the weakest two dimensions' lines. */
export const scoreWhy = (r: Pick<Reading, 'dims'>) => dimLines(r.dims).slice(0, 2).map((d) => d.line)
