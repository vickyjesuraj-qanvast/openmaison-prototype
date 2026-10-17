'use client'

import { useState } from 'react'
import { Card } from '@/components/leads/detail/card'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { recordReminder } from '@/app/portal/remind-actions'
import { agoText, remindMessage, waLink } from '@/lib/portal/model'
import { dayWords } from '@/lib/format'
import type { ProjectDetail, StatusItem } from '@/lib/projects/queries'
import { Row } from './row'
import styles from '../project-overview.module.css'

const lowerFirst = (s: string) => s.replace(/^./, (c) => c.toLowerCase())

/**
 * (simplify S-01 · S-05 · Q-12) WITH {CLIENT} — the relationship in one card: what waits on the client, each with **Remind** (the Invite to
 * Portal panel's own WhatsApp draft — `remindMessage`, the item's own link, the reminder recorded and put back if the server refuses; WhatsApp
 * opens on the press, REG-534); when they last heard from the studio, with *Post an update*; the portal's state (*Not invited* · Invite); the
 * questions still open (the Questionnaire card's only Overview presence, with its *Ask*). The client's lateness is neutral here — never red.
 * Words invented (Q-12): *With {client}* · *Last told {client}*.
 */
export function WithClientCard({ d, onInvite, onAsk, onPost, onOpenTab, onOpenItem, link, inviteInNeeds }: {
  d: ProjectDetail
  onInvite: () => void
  onAsk: () => void
  onPost: () => void
  onOpenTab: (slug: string) => void
  /** A studio-side waiting line with no portal link (the client is not on the portal yet) — the Status rows' own press. */
  onOpenItem: (x: StatusItem) => (() => void) | undefined
  link: (to: string) => string
  /** Needs you already offers the invite (a set-up row) — the portal line then only says where it stands. */
  inviteInNeeds: boolean
}) {
  const snackbar = useSnackbar()
  const wc = d.withClient
  const first = d.lead.name.split(/\s+/)[0] ?? d.lead.name
  const p = d.project
  const live = wc.portal.state === 'invited' || wc.portal.state === 'opened'
  const [sent, setSent] = useState<Record<string, number>>({})
  const reminded = { ...wc.reminded, ...sent }
  const remind = (w: { key: string; title: string; href: string }) => {
    if (wc.portal.paused) { onInvite(); return }   // (fix-G, G-34) a send while the portal is paused asks first — in the panel
    const url = /^https?:\/\//.test(w.href) ? w.href : `${window.location.origin}${w.href}`
    window.open(waLink(wc.portal.phone, remindMessage({ client: d.lead.name, studio: wc.portal.studio, what: w.title, url })), '_blank', 'noopener')   // on the press
    setSent((m) => ({ ...m, [w.key]: Date.now() }))
    const back = () => setSent((m) => { const n = { ...m }; delete n[w.key]; return n })
    void recordReminder(d.lead.id, { key: w.key, title: w.title }).then((r) => {
      if ('error' in r) { back(); snackbar({ message: couldnt('record the reminder', refusalOf(r.error)) }) }
    }, () => { back(); snackbar({ message: 'Couldn’t record the reminder — please try again' }) })
  }
  const remindable = live && wc.portal.mayAct
  /* the schedule's own wait on the client (a milestone held for their answer) — it is not one of their portal items, so it says itself here */
  const sw = d.schedule?.facts.waiting?.onClient ? d.schedule.facts.waiting : null
  const waits = live ? wc.waiting : []
  /* (simplify S-21 · each fact once) a milestone held for a choice the client has to make is ONE row — the choice's, saying what it holds up
     (sharing the choice starts the milestone's wait, so the two would otherwise say the same wait twice) */
  const swNote = sw?.note?.trim().toLowerCase() ?? ''
  const swChoice = swNote ? waits.find((w) => w.kind === 'choice' && w.title.toLowerCase().includes(swNote)) ?? null : null
  /* not on the portal yet: what waits on them as the studio reads it, each opening its record (no link to remind them with) */
  const studioWaits = live ? [] : d.waitingItems.filter((x) => x.key !== 'invoice' && x.key !== 'invite' && x.key !== 'milestone')
  const asked = wc.waiting.some((w) => w.kind === 'questions')
  const running = p.stage !== 'setting_up' && p.stage !== 'completed'
  const lastDays = wc.lastTold ? Math.max(0, Math.round((startOf(d.now) - startOf(wc.lastTold.at)) / 86_400_000)) : null
  const rows = [
    ...(sw && !swChoice ? [<Row key="schedule-wait" two icon="hourglass_top" name={`${sw.title} waits on ${first}`} caption={[sw.note, sw.days ? `${dayWords(sw.days)} so far` : null].filter(Boolean).join(' · ')}
                  actions={remindable ? [{ label: 'Remind', onPress: () => remind({ key: `stage-wait:${sw.title}`, title: `${sw.title}${sw.note ? ` — ${lowerFirst(sw.note)}` : ''}`, href: `${wc.portal.home}/schedule` }), testId: 'with-remind' }] : undefined}
                  testId="with-waiting" />] : []),
    ...waits.map((w) => (
      <Row key={w.key} two icon="hourglass_top" name={w.title} caption={`${w.line}${w === swChoice && sw ? ` · ${sw.title} waits on it${sw.days ? `, ${dayWords(sw.days)} so far` : ''}` : ''}${reminded[w.key] ? ` · reminded ${agoText(reminded[w.key]!, d.now)}` : ''}`}
           actions={remindable ? [{ label: 'Remind', onPress: () => remind(w), testId: 'with-remind' }] : undefined} testId="with-waiting" />
    )),
    ...studioWaits.map((x, i) => <Row key={`${x.key}-${i}`} two icon="hourglass_top" name={x.text} caption={x.caption} onPress={onOpenItem(x)} testId="with-waiting" />),
    ...(running ? [
      <Row key="last-told" two icon="article" name={wc.lastTold ? `Last told ${first} ${lastDays === 0 ? 'today' : lastDays === 1 ? 'yesterday' : `${dayWords(lastDays!)} ago`}` : `${first} hasn’t had an update yet`}
           caption={wc.lastTold ? `“${wc.lastTold.title}”` : undefined}
           href={wc.lastTold ? link(`/projects/${p.id}/updates?open=${encodeURIComponent(wc.lastTold.id)}`) : undefined}
           actions={d.mayChange ? [{ label: 'Post an update', onPress: onPost, testId: 'with-post' }] : undefined} testId="with-last-told" />,
    ] : []),
    /* (pending modules S23 — 1.0's project Meeting Summary card) the last meeting held with the client, its brief a press away */
    ...(wc.lastMet ? [(() => {
      const days = Math.max(0, Math.round((startOf(d.now) - startOf(wc.lastMet.at)) / 86_400_000))
      return <Row key="last-met" two icon="event" name={`Last met ${first} ${days === 0 ? 'today' : days === 1 ? 'yesterday' : `${dayWords(days)} ago`}`} caption={wc.lastMet.line ?? undefined}
                  href={link(`/meetings/${wc.lastMet.id}`)} testId="with-last-met" />
    })()] : []),
    ...(!live && p.stage !== 'completed' ? [
      <Row key="portal" two icon="person_add" name={wc.portal.label}
           caption="Their own page: what needs them, their files and the steps ahead"
           actions={wc.portal.mayAct && !inviteInNeeds ? [{ label: 'Invite', onPress: onInvite, testId: 'with-invite' }] : undefined} testId="with-portal" />,
    ] : []),
    ...(wc.unanswered > 0 && !asked && p.stage !== 'completed' ? [
      <Row key="questions" two icon="quiz" name={`${wc.unanswered} ${wc.unanswered === 1 ? 'question' : 'questions'} unanswered`} caption="Questionnaire"
           onPress={() => onOpenTab('questionnaire')} actions={d.mayChange ? [{ label: 'Ask', onPress: onAsk, testId: 'with-ask' }] : undefined} testId="with-questions" />,
    ] : []),
  ]
  if (!rows.length) return null
  return (
    <div data-card="with-client">
      <Card title={`With ${first}`} headGap={8} metaRight={live ? (wc.portal.state === 'opened' ? `Portal ${lowerFirst(wc.portal.label)}` : wc.portal.label) : undefined}
            onOpen={() => onOpenTab('updates')} openLabel={`Open the client’s tab`} testId="with-client">
        <div className={styles.body}><div className={styles.group}>{rows}</div></div>
      </Card>
    </div>
  )
}
const startOf = (t: number) => { const x = new Date(t); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() }
