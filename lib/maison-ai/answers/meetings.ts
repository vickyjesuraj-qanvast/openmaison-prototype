import 'server-only'
import { visibleLeadIds } from '@/lib/leads/visibility'
import { displayDue, startOfDay, titleCaseName } from '@/lib/format'
import { aimLabel, firstOf, standingOf } from '@/lib/meetings/model'
import { meetingRows, nextMeetingFor } from '@/lib/meetings/queries'
import type { MaisonAnswer } from '@/lib/maison-ai'
import { ON_LEADS, go, plural, row, type Ctx } from './common'

/*
 * (pending modules S23 — S10's note: "a meeting's page registers its suggestions; 'prepare me for my next meeting' can answer from the records";
 * 1.0's mAIson `get_meeting_summary`) The Ask box's meetings, by rule: the viewer's next planned meeting with its prep (what is known, what is
 * still to find out, what to focus on — lib/meetings/prep.ts), and the week's meetings with the briefs waiting to be saved. Who sees leads
 * applies; Accounting runs no meetings. *(invented copy)*
 */
const DAY = 86_400_000
const title = (aim: string, client: string) => `${aim === 'other' ? 'Meeting' : aimLabel(aim)} with ${firstOf(titleCaseName(client))}`

export async function nextMeetingAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'No meetings for Accounting', text: ON_LEADS }
  const next = await nextMeetingFor(c.viewer, c.now)
  if (!next) return { title: 'No meeting planned', text: 'Plan one from a lead’s Meetings — the co-pilot prepares you for it here.', link: { label: 'Open Meetings', href: go(c, '/meetings') } }
  const { row: m, prep } = next
  return {
    title: `Your next meeting: ${title(m.aim, m.leadName)}`,
    text: `${displayDue(new Date(m.startsAt))} · ${m.whereKind}${m.place ? ` · ${m.place}` : ''}.${prep.unknown.length ? ` Still to find out: ${prep.unknown.join(', ').toLowerCase()}.` : ''}`,
    rows: [
      ...prep.know.map((k, i) => row(c, `k${i}`, k.label, k.value, null)),
      ...prep.focus.map((f, i) => row(c, `f${i}`, f, i === 0 ? 'Focus on' : undefined, null)),
      ...(prep.temperature ? [row(c, 'temp', `Last time: ${prep.temperature.score} · ${prep.temperature.tier}`, prep.temperature.line, null)] : []),
    ],
    link: { label: 'Open the meeting', href: go(c, `/meetings/${m.id}`) },
  }
}

export async function meetingsAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'No meetings for Accounting', text: ON_LEADS }
  const seen = await visibleLeadIds(c.viewer)
  const all = (await meetingRows(seen ? [...seen] : null)).filter((r) => !r.fromLog)
  const s = question.toLowerCase()
  const today = startOfDay(new Date(c.now))
  const window = /\btoday\b/.test(s) ? [today, today + DAY] : /\btomorrow\b/.test(s) ? [today + DAY, today + 2 * DAY] : [today, today + 8 * DAY]
  const ahead = all.filter((r) => r.status === 'planned' && r.startsAt >= window[0]! && r.startsAt < window[1]!).sort((a, b) => a.startsAt - b.startsAt)
  const toSave = all.filter((r) => standingOf(r, c.now).waits === 'save')
  const toWrite = all.filter((r) => standingOf(r, c.now).waits === 'write')
  const when = /\btoday\b/.test(s) ? 'today' : /\btomorrow\b/.test(s) ? 'tomorrow' : 'this week'
  const rows = [
    ...ahead.map((r) => row(c, r.id, title(r.aim, r.leadName), `${displayDue(new Date(r.startsAt))} · ${r.whereKind}`, `/meetings/${r.id}`)),
    ...toSave.map((r) => row(c, `s-${r.id}`, title(r.aim, r.leadName), 'Brief to save to the lead', `/meetings/${r.id}`)),
    ...toWrite.map((r) => row(c, `w-${r.id}`, title(r.aim, r.leadName), 'Its notes aren’t in yet', `/meetings/${r.id}`)),
  ].slice(0, 10)
  const head = ahead.length ? `${plural(ahead.length, 'meeting')} ${when}` : `No meeting planned ${when}`
  const waits = [toSave.length ? plural(toSave.length, 'brief') + ' to save' : null, toWrite.length ? plural(toWrite.length, 'meeting') + ' to write up' : null].filter(Boolean).join(' · ')
  return { title: head, text: waits ? `And ${waits}.` : ahead.length ? 'Open one for its prep.' : 'Plan one from a lead’s Meetings.', rows, link: { label: 'Open Meetings', href: go(c, '/meetings') } }
}
