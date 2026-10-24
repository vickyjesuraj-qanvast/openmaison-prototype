import { CONTACT_MODES, OUTCOMES, type Stage } from '@/lib/leads/enums'
import { stageIntent } from '@/lib/leads/stage-policy'
import type { StageMovement } from '@/lib/settings/types'
import { calendarDaysBetween, displayDate, displayTime, hasTime } from '@/lib/format'

/*
 * (Leads on the move, P-03 — his marks 2026-10-23 on the Leads-on-the-move page, "continue the leads") The log sheet's rules, pure: what a press
 * of Call · WhatsApp · Visit · Note logs, whether the save carries the lead on (a New lead's first contact moves it to Contacted through the
 * move's own path and its owner rule — REG-130 · REG-2655; a site visit on a Contacted lead is the Met step), and the words the sheet says.
 * Everything is read from the lead's own stage, members and the studio's stage rule — the same `stageIntent` the stage menu, the header's
 * next move and the listing ask. *(invented copy: every sentence below — the sheet's title, the line above Save, the call-back's labels, the
 * snackbar after a save.)*
 */

/** The sheet's channel chips: the four the Lead screen's Log ▾ offers, then the window's other three behind More (nothing a desk logs is lost). */
export const SHEET_CHANNELS = ['Call', 'WhatsApp', 'Visit', 'Note'] as const
export const MORE_CHANNELS = ['Email', 'SMS', 'Others'] as const
export type SheetChannel = (typeof SHEET_CHANNELS)[number] | (typeof MORE_CHANNELS)[number]
export const isSheetChannel = (c: string): c is SheetChannel => (SHEET_CHANNELS as readonly string[]).includes(c) || (MORE_CHANNELS as readonly string[]).includes(c)

/** What a log is: a contact log (the Contacted step's / the Notes tab's), a visit that is the Met step's meeting log, or a note. */
export type LogKind = 'contact' | 'meeting' | 'note'
/** A site visit's Where — the Met step's own three. */
export const VISIT_PLACES = ['In person', 'Video call', 'Showroom'] as const

/** The contact log's channel for a chip — a visit is "In person" (CONTACT_CHANNELS). */
export const contactChannelOf = (c: SheetChannel): string | null => (c === 'Note' ? null : c === 'Visit' ? 'In person' : c)
/** …and back: a log's stored channel as the chip that shows it. */
export const chipOfChannel = (c: string | null | undefined): SheetChannel | null => (!c ? null : c === 'In person' ? 'Visit' : isSheetChannel(c) ? c : null)

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

export type PlanFacts = {
  name: string
  stage: Stage
  resumeStage: Stage | null
  assignees: { id: string }[]
  project: { number: string } | null
  stageMovement: StageMovement
  role: string | null
  /** the member may put someone on the lead (the Assign popover's own rule, REG-601) */
  canAssign: boolean
  /** why they may not (assignHint), said when the lead stays in New */
  assignHint: string | null
  /** the member the sheet's owner row has picked, on an unowned New lead */
  assignTo: { id: string; name: string } | null
}

export type LogPlan = {
  kind: LogKind
  /** the move the save carries on into; null = a log alone */
  moveTo: 'Contacted' | 'Met' | null
  /** the owner row shows: an unowned New lead the member may assign — a pick moves it, no pick logs alone */
  ownerRow: boolean
  /** the filled button's words */
  save: string
  /** one line above the button: what Save does beyond the log, or why the lead stays where it is */
  line: string | null
}

const intentOf = (f: PlanFacts, stage: 'Contacted' | 'Met') =>
  stageIntent({ stage: f.stage, resumeStage: f.resumeStage, assignees: f.assignees as never, project: f.project as never }, stage, f.stageMovement, f.role)

/** What this press logs, and what its Save does. */
export function logPlan(channel: SheetChannel, f: PlanFacts): LogPlan {
  const first = firstName(f.name)
  if (channel === 'Note') return { kind: 'note', moveTo: null, ownerRow: false, save: 'Save note', line: null }
  /* a site visit on a Contacted lead is the meeting the Met step records — "Save & move to Met" says so on the button */
  if (channel === 'Visit' && f.stage === 'Contacted') {
    const i = intentOf(f, 'Met')
    if (i.kind === 'wizard' || i.kind === 'quick') return { kind: 'meeting', moveTo: 'Met', ownerRow: false, save: 'Save & move to Met', line: null }
    return { kind: 'contact', moveTo: null, ownerRow: false, save: 'Save log', line: i.kind === 'blocked' ? `${first} stays in Contacted — ${lower(i.message)}.` : null }
  }
  if (f.stage === 'New') {
    const i = intentOf(f, 'Contacted')
    if (i.kind === 'wizard' || i.kind === 'quick') return { kind: 'contact', moveTo: 'Contacted', ownerRow: false, save: 'Save log', line: `Saving moves ${first} to Contacted.` }
    /* nobody owns the lead (REG-130): the sheet asks who — a pick assigns them and moves the lead; no pick keeps the log on its own */
    if (i.kind === 'blocked' && f.assignees.length === 0) {
      if (!f.canAssign) return { kind: 'contact', moveTo: null, ownerRow: false, save: 'Save log', line: `${first} stays in New until someone owns the lead${f.assignHint ? ` — ${lower(f.assignHint).replace(/\.$/, '')}` : ''}.` }
      if (f.assignTo) return { kind: 'contact', moveTo: 'Contacted', ownerRow: true, save: 'Save log', line: `Saving puts ${firstName(f.assignTo.name)} on ${first} and moves ${first} to Contacted.` }
      return { kind: 'contact', moveTo: null, ownerRow: true, save: 'Save log', line: `${first} stays in New until someone owns the lead.` }
    }
    return { kind: 'contact', moveTo: null, ownerRow: false, save: 'Save log', line: i.kind === 'blocked' ? `${first} stays in New — ${lower(i.message)}.` : null }
  }
  return { kind: 'contact', moveTo: null, ownerRow: false, save: 'Save log', line: null }
}
const lower = (s: string) => s.replace(/^./, (c) => c.toLowerCase()).replace(/\.$/, '')

/** The sheet's title — the question the drawn screen asks. */
export function logTitle(channel: SheetChannel, name: string): string {
  const first = firstName(name)
  switch (channel) {
    case 'Call': return `How did the call with ${first} go?`
    case 'WhatsApp': return `How did the WhatsApp chat with ${first} go?`
    case 'Visit': return `How did the visit with ${first} go?`
    case 'Email': return `How did the email to ${first} go?`
    case 'SMS': return `How did the SMS to ${first} go?`
    case 'Others': return `How did it go with ${first}?`
    case 'Note': return `A note on ${first}`
  }
}

/** The call-back row's label for an outcome — none once the client said they're not interested. */
export function nextLabel(outcome: string): string | null {
  switch (outcome) {
    case 'Callback requested': return 'Call back'
    case 'Meeting scheduled': return 'Meeting on'
    case 'No response': return 'Try again'
    case 'Connected': return 'Next follow-up'
    default: return null
  }
}
/** The call-back's task, as the Lead screen's Next line and Due now read it — the person and the act, its day the task's own due ("Call Farah
    back — tomorrow · 10:00 AM"); REG-319's sentence spelt the date into the title, which then read twice. */
export function followUpTitle(outcome: string, mode: string, name: string): string {
  const first = firstName(name)
  const by = mode && mode !== 'Call' && mode !== 'In person' ? ` on ${mode}` : ''
  switch (outcome) {
    case 'Callback requested': return mode === 'In person' ? `Meet ${first}` : mode === 'WhatsApp' ? `WhatsApp ${first} back` : `Call ${first} back${by}`
    case 'Meeting scheduled': return mode === 'In person' || !mode ? `Meet ${first}` : `Meeting with ${first}${mode === 'Call' ? ' by call' : by}`
    case 'No response': return mode === 'In person' ? `Try to meet ${first}` : `Try ${first} again${by}`
    default: return mode === 'In person' ? `Meet ${first}` : `Follow up with ${first}${by}`
  }
}

/** Outcomes whose next step is asked for at once (the row opens with its presets); the others offer it folded. */
export const asksNext = (outcome: string) => outcome === 'Callback requested' || outcome === 'Meeting scheduled'
/** How the next step happens, by default: a meeting in person, else the way this contact went. */
export function defaultMode(outcome: string, channel: SheetChannel): string {
  if (outcome === 'Meeting scheduled') return 'In person'
  const c = contactChannelOf(channel)
  return c && (CONTACT_MODES as readonly string[]).includes(c) ? c : 'Call'
}
export const isOutcome = (o: string) => (OUTCOMES as readonly string[]).includes(o)

/** What the log is called in the snackbar after a save. */
export function logNoun(channel: SheetChannel, kind: LogKind): string {
  if (kind === 'note') return 'Note'
  if (kind === 'meeting') return 'Site visit'
  return channel === 'Call' ? 'Call' : channel === 'WhatsApp' ? 'WhatsApp chat' : channel === 'Visit' ? 'Visit' : channel === 'Email' ? 'Email' : channel === 'SMS' ? 'SMS' : 'Contact'
}
/** The snackbar after a save: what was kept, where the lead now is, the call-back's day ("Call logged — Farah is in Contacted. Call back
    tomorrow · 10:00 AM is in Tasks."). `when` = the call-back's day as a person says it (`dayWhen` below). */
export function savedWords(o: { channel: SheetChannel; kind: LogKind; name: string; moved: 'Contacted' | 'Met' | null; reminder: { label: string; when: string } | null; planned: string | null }): string {
  const head = `${logNoun(o.channel, o.kind)} ${o.kind === 'note' ? 'saved' : 'logged'}`
  const moved = o.moved ? ` — ${firstName(o.name)} is in ${o.moved}.` : '.'
  const next = o.planned ? ` A meeting is planned for ${o.planned}.` : o.reminder ? ` ${o.reminder.label} ${o.reminder.when} is in Tasks.` : ''
  return `${head}${moved}${next}`
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** A planned moment as a person says it: "today · 10:00 AM" · "tomorrow" · "Thu · 10:00 AM" (within six days either side) · "22 Nov ’26". */
export function dayWhen(at: number, now: number): string {
  const d = new Date(at)
  const n = calendarDaysBetween(now, at)
  const day = n === 0 ? 'today' : n === 1 ? 'tomorrow' : n === -1 ? 'yesterday' : Math.abs(n) <= 6 ? WEEKDAYS[d.getDay()]! : displayDate(d)
  return hasTime(d) ? `${day} · ${displayTime(d)}` : day
}
