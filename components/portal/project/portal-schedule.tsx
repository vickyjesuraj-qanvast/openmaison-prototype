'use client'

import { useEffect, useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { ChipRail } from '@/components/om/chip-rail'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { EmptyState } from '@/components/om/empty-state'
import { MetaChip } from '@/components/om/meta-chip'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { refusalOf } from '@/components/leads/tasks/use-run'
import { answerStage, markScheduleSeen } from '@/app/portal/project-actions'
import { dayLabel, dayMonth, dayOf } from '@/lib/projects/schedule-model'
import {
  NOTE_MAX, STAGE_FILTERS, confirmAsk, datesOf, finishedTitle, pausedLine, paymentState, railOf, scheduleLede, showStageFilters, stageMatches, stageWords, stateLabel, stateTone,
  type PortalStage, type ScheduleEvent, type StageAnswerKind, type StageFilter,
} from '@/lib/portal/schedule-model'
import { money2 } from '@/lib/quotes/math'
import { portalPath } from '@/lib/portal/model'
import { HoldNotice } from './hold-notice'
import type { PortalData } from '@/lib/portal/home'
import type { PortalScheduleHome } from '@/lib/portal/schedule'
import { ContactLine } from '../contact-line'
import { PortalFrame } from '../portal-frame'
import { couldntSay, usePortalSay } from '../use-portal-say'
import { PortalScheduleGhost } from './project-ghosts'
import p from '../portal.module.css'
import styles from './project.module.css'

type Given = { kind: StageAnswerKind; note: string | null; at: number }
/** (fix-F, F-03) Who gave an answer, as the reader hears it: "You", or the household person's given name. */
const answerWho = (a: NonNullable<PortalStage['answer']>) => (a.mine || !a.by ? 'You' : a.by)

/**
 * (Projects round 4b, board 2 · Q-15 · Q-16) The portal's Schedule: the schedule as the studio last shared it — never the live one, so a
 * change not shared is not here — with each stage's dates and Done · Under way · Coming up; a stage the studio asked about on top, with
 * Looks good · Something is not right (what they noticed, in a form sheet); an answered stage keeps its answer in its row (1.0 dropped it,
 * I-263); what changed since the client last looked marked on its row and listed beside it; the studio's note with the share. On arrival
 * the page notes the look (not in a studio's preview — nothing there is recorded as the client's, and its buttons are off).
 */
export function PortalScheduleView({ data, homes }: { data: PortalData; homes: PortalScheduleHome[] }) {
  const { visitor } = data
  const preview = visitor.preview
  const snackbar = useSnackbar()
  const [given, setGiven] = useState<Record<string, Given>>({})
  const [noteFor, setNoteFor] = useState<{ stage: PortalStage; home: PortalScheduleHome } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const shared = homes.filter((h) => h.share)
  const designer = data.contact.name
  const one = homes.length === 1 ? homes[0]! : null

  /* the look is noted once the page shows — a prefetch never runs this, a preview never sends it */
  const seenKey = shared.map((h) => h.homeId).join(',')
  useEffect(() => {
    if (preview || !seenKey) return
    void markScheduleSeen(data.slug, { homeIds: seenKey.split(',') }).catch(() => { /* taken again on the next look */ })
  }, [preview, seenKey, data.slug])

  const say = usePortalSay(data.slug)
  const why = (r: string | null) => couldntSay('send your answer', r, data.look.studio)
  const answer = async (stage: PortalStage, kind: StageAnswerKind, note: string | null): Promise<boolean> => {
    if (preview || busy) return false
    setBusy(stage.id)
    try {
      const r = await answerStage(data.slug, { milestoneId: stage.id, answer: kind, note })
      if ('error' in r) { say(why(refusalOf(r.error)), r.error); return false }   // (fix-F, F-19) signed out → Sign in
      setGiven((g) => ({ ...g, [stage.id]: { kind, note, at: r.at } }))
      snackbar({ message: kind === 'confirmed' ? `Thank you — ${data.look.studio} knows ${stageWords(stage.title)} looks good` : `Thank you — ${designer ?? 'your designer'} will look at it with you` })
      return true
    } catch {
      snackbar({ message: 'Couldn’t send your answer — please try again' })
      return false
    } finally {
      setBusy(null)
    }
  }
  /* the stage as the page holds it: an answer given here shows at once (the studio's pages read the record) */
  const withGiven = (s: PortalStage): PortalStage => (given[s.id] ? { ...s, toConfirm: false, answer: { kind: given[s.id]!.kind, note: given[s.id]!.note, at: given[s.id]!.at, by: visitor.first, mine: true } } : s)

  const lede = one?.share
    ? scheduleLede({ handover: one.share.handover, sharedAt: one.share.at, allDone: one.share.stages.every((s) => s.state === 'done') })
    : shared.length ? `Your renovation with ${data.look.studio}, as last shared.` : `Your renovation with ${data.look.studio}.`

  return (
    <PageReveal skeleton={<PortalScheduleGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="schedule" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={p.hello}>
          <h1 className={p.h1}>Schedule</h1>
          <p className={p.lede} data-testid="portal-schedule-lede">{lede}</p>
        </div>
        {homes.map((h) => (
          <div key={h.homeId} className={p.section} data-testid="portal-schedule-home">
            {homes.length > 1 ? <h2 className={styles.homeHead}>{h.title}</h2> : null}
            {/* (gaps build D, item 4 — M-01) a project on hold says so first, with the reason the studio gave and the day it should resume */}
            {h.hold ? <HoldNotice hold={h.hold} now={data.now} /> : null}
            {h.share ? (
              <HomeSchedule home={h} many={homes.length > 1} data={data} preview={preview} busy={busy} given={given} withGiven={withGiven}
                            onConfirm={(s) => { void answer(s, 'confirmed', null) }} onNotRight={(s) => setNoteFor({ stage: s, home: h })} />
            ) : (
              <EmptyState icon="calendar_month" tone="plain" testId="portal-schedule-empty"
                          title={h.projectId ? 'Your schedule is on its way' : 'No schedule yet'}
                          help={h.projectId ? `${designer ?? 'Your designer'} is putting it together. It shows here once they share it with you.` : 'Your schedule shows here once work on your home is planned.'} />
            )}
          </div>
        ))}
        <NotRight stage={noteFor?.stage ?? null} designer={designer} busy={!!busy} onClose={() => setNoteFor(null)}
                  onSend={async (note) => { const s = noteFor?.stage; if (!s) return false; const ok = await answer(s, 'changes', note); if (ok) setNoteFor(null); return ok }} />
      </PortalFrame>
    </PageReveal>
  )
}

function HomeSchedule({ home, many, data, preview, busy, given, withGiven, onConfirm, onNotRight }: {
  home: PortalScheduleHome
  many: boolean
  data: PortalData
  preview: boolean
  busy: string | null
  given: Record<string, Given>
  withGiven: (s: PortalStage) => PortalStage
  onConfirm: (s: PortalStage) => void
  onNotRight: (s: PortalStage) => void
}) {
  const share = home.share!
  const stages = share.stages.map(withGiven)
  /* (parity map, CP-062 · SC-087 — 1.0's timeline chips) past five stages, house chips with their counts narrow the list: All · Payments ·
     Under way · Paused · Coming up; Payments keeps the invoices sent on the rail, the others show stages only */
  const [filter, setFilter] = useState<StageFilter>('all')
  const filtering = showStageFilters(stages)
  const shownFilter: StageFilter = filtering ? filter : 'all'
  /* (the calm UI build 2026-10-27, 3-52) with the chips there, an invoice sent sits under Payments alone — under All the milestones read in a row
     (each one's own payment line still says what it bills); a short list without chips keeps every moment on its rail, as before */
  const events: ScheduleEvent[] = (home.events ?? []).filter((e) => (filtering ? (shownFilter === 'all' ? e.kind !== 'invoice' : shownFilter === 'payments' && e.kind === 'invoice') : true))
  const rail = railOf(stages.filter((s) => stageMatches(s, shownFilter)), events)
  const filterLabel = STAGE_FILTERS.find((f) => f.key === shownFilter)!.label
  /* the confirm cards: the stages still asked, and those answered on this visit (they turn into their thank-you) */
  const asks = share.stages.filter((s) => s.toConfirm)
  const marked = stages.filter((s) => s.mark)
  const moved = share.handoverWas !== null && share.handover !== null && share.handoverWas !== share.handover
  const newsHead = `Updated ${dayMonth(dayOf(new Date(share.at)))}${moved ? ` · Handover is now ${dayLabel(share.handover!)}` : ''}`
  return (
    <div className={styles.split}>
      <div className={styles.main}>
        {asks.map((s0) => {
          const done = given[s0.id]
          return (
            <section key={s0.id} id={`stage-${s0.id}`} className={styles.confirm} aria-label="A milestone to confirm" data-slot="confirm" data-answered={done ? done.kind : undefined} data-testid="portal-confirm">
              {done ? (
                <div className={styles.answered} data-kind={done.kind} role="status">
                  <span className={styles.answeredGlyph}><Icon name={done.kind === 'confirmed' ? 'check' : 'chat'} size={18} /></span>   {/* (fix-F, F-27) the answer went through — never an error glyph */}
                  <div className={styles.confirmText}>
                    <h2 className={styles.confirmTitle}>Thank you</h2>
                    <p className={styles.confirmLine}>{done.kind === 'confirmed'
                      ? `You confirmed that ${stageWords(s0.title)} is done. ${data.look.studio} has been told.`
                      : `You told ${data.contact.name ?? 'your designer'} something is not right with ${stageWords(s0.title)}. They will look at it with you.`}</p>
                    {done.kind === 'changes' && done.note ? <p className={styles.quote}>{`“${done.note}”`}</p> : null}
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.confirmText}>
                    <h2 className={styles.confirmTitle}>{finishedTitle(s0.title)}{many ? ` · ${home.title.replace(/^Your home at /, '')}` : ''}</h2>
                    <p className={styles.confirmLine}>{confirmAsk(s0.finishedOn, home.propertyType)}</p>
                  </div>
                  <div className={styles.confirmActions}>
                    <button type="button" className={styles.go} onClick={() => onConfirm(s0)} disabled={preview || !!busy} data-testid="portal-confirm-yes">Looks good</button>
                    <button type="button" className={styles.goOutline} onClick={() => onNotRight(s0)} disabled={preview || !!busy} data-testid="portal-confirm-no">Something is not right</button>
                  </div>
                  {preview ? <p className={styles.fine}>A preview — answers aren’t saved.</p> : null}
                </>
              )}
            </section>
          )
        })}
        {filtering ? (
          <div data-slot="filters" className={styles.filters}>
            <ChipRail label="Show milestones">
              {/* (the calm UI build 2026-10-27, 3-39 · 3-52 · T-07) one count style, "Label · n", and none on an empty chip */}
              <Chips label="Show milestones" testId="portal-stage-filters"
                     options={STAGE_FILTERS.map((f) => { const n = stages.filter((s) => stageMatches(s, f.key)).length; return { value: f.key, label: n ? `${f.label} · ${n}` : f.label } })}
                     value={shownFilter} onChange={(v) => setFilter(v as StageFilter)} />
            </ChipRail>
          </div>
        ) : null}
        <section className={styles.stages} aria-label="Milestones" data-slot="stages" data-testid="portal-stages" data-filter={shownFilter}>
          <ol className={styles.stageList}>
            {rail.length === 0 ? <li className={styles.stagesNone} data-testid="portal-stages-none">{`Nothing ${shownFilter === 'payments' ? 'with a payment' : filterLabel.toLowerCase()} right now.`}</li> : null}
            {rail.map((item) => {
              if (item.kind === 'event') {
                const e = item.event
                return (
                  /* (parity map, SC-087 — 1.0 E-238) a moment on the rail: the project's start, an invoice sent — no state, no answer */
                  <li key={e.key} className={`${styles.stage} ${styles.moment}`} data-kind={e.kind} data-testid="portal-rail-event">
                    <span className={styles.momentDot} aria-hidden><Icon name={e.kind === 'started' ? 'flag' : 'receipt_long'} size={16} weight={300} /></span>
                    <span className={styles.stageText}>
                      <span className={styles.momentName}>{e.invoiceId ? <a href={`${portalPath(data.slug, 'money')}?open=${encodeURIComponent(e.invoiceId)}`}>{e.title}</a> : e.title}</span>
                      <span className={styles.stageDates}>{e.line}</span>
                    </span>
                  </li>
                )
              }
              const s = item.stage
              const paused = s.paused ? pausedLine(s.paused, data.now) : null
              const tone = stateTone(s)
              return (
                <li key={s.id} className={styles.stage} data-tone={tone} data-mark={s.mark ? s.mark.kind : undefined} data-testid="portal-stage" data-stage-id={s.id}>
                  <span className={styles.dot} data-tone={tone} aria-hidden>{tone === 'done' || tone === 'ask' || tone === 'changes' ? <Icon name="check" size={16} /> : tone === 'paused' ? <Icon name="timelapse" size={16} /> : null}</span>
                  <span className={styles.stageText}>
                    <span className={styles.stageName}>{s.title}{s.mark ? <span data-testid="portal-stage-mark"><MetaChip color="blue">{s.mark.kind === 'new' ? 'New' : 'Changed'}</MetaChip></span> : null}{/* (the calm UI build 2026-10-27, 3-52 · T-06 · W-647) a place, not a status — sentence case, the row's own grey caption with its flag */}{s.here ? <span className={styles.here} data-testid="portal-stage-here"><Icon name="flag" size={16} weight={300} />You are here</span> : null}</span>
                    {/* (fix-F, F-26) a move is said once, on its dates: the old range struck, then the new; a renamed or restarted stage keeps its line */}
                    <span className={styles.stageDates} data-testid="portal-stage-dates">{s.mark?.wasRange ? <><s className={styles.wasDates}>{s.mark.wasRange}</s>{' '}</> : null}{datesOf(s)}</span>
                    {s.mark && s.mark.kind === 'changed' && !s.mark.wasRange ? <span className={styles.stageWas}>{s.mark.was ? <s>{s.mark.was}</s> : null}{s.mark.now}</span> : null}
                    {/* (fix-F, F-03) each person's answer under their own name — "You" only for the reader's */}
                    {s.answer?.kind === 'changes' ? <span className={styles.stageNote} data-testid="portal-stage-answer">{`${answerWho(s.answer)} said something is not right${s.answer.note ? `: “${s.answer.note}”` : '.'}`}</span> : null}
                    {s.answer?.kind === 'confirmed' && s.answer.at ? <span className={styles.stageDates} data-testid="portal-stage-answer">{`${answerWho(s.answer)} confirmed it ${dayMonth(dayOf(new Date(s.answer.at)))}`}</span> : null}
                    {/* (gaps build D, item 5) what the studio changed after "not right" — the latest word on the stage */}
                    {s.resolved ? <span className={styles.stageResolved} data-testid="portal-stage-resolved">{`${data.contact.name ?? 'Your designer'} on ${dayMonth(dayOf(new Date(s.resolved.at)))}: “${s.resolved.note}”`}</span> : null}
                    {/* (gaps build D, item 4) a paused stage, with the words the studio wrote for the client */}
                    {/* (parity map, CP-064) …and the day it should pick up again — "Resuming around 16 Nov", or "Resume day passed" */}
                    {paused ? <span className={styles.stagePaused} data-testid="portal-stage-paused">{paused}</span> : null}
                    {/* (gaps build D, item 4 — 1.0 I-253) where the payments fall: the stage tied to it, its amount, Paid / Due */}
                    {s.payments?.length ? (
                      <span className={styles.stagePays}>
                        {s.payments.map((pm) => {
                          const words = `${pm.name} · ${money2(pm.amountMinor)}${pm.pct ? ` (${Number.isInteger(pm.pct) ? pm.pct : pm.pct.toFixed(1)}%)` : ''} · ${paymentState[pm.state]}`
                          return (
                            <span key={pm.name} className={styles.stagePay} data-state={pm.state} data-testid="portal-stage-payment">
                              <Icon name="payments" size={16} weight={300} />
                              {pm.invoiceId ? <a href={`${portalPath(data.slug, 'money')}?open=${encodeURIComponent(pm.invoiceId)}`}>{words}</a> : words}
                            </span>
                          )
                        })}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.state} data-tone={tone}>{stateLabel(s)}</span>
                </li>
              )
            })}
          </ol>
          {share.removed.length ? <p className={styles.stagesFoot}>{`Taken off since you last looked: ${share.removed.map((r) => r.title).join(', ')}.`}</p> : null}
        </section>
      </div>
      <div className={styles.side}>
        {share.note || moved ? (
          <section className={styles.news} aria-label="From your designer" data-slot="news" data-testid="portal-schedule-news">
            <h2 className={styles.newsHead}>{newsHead}</h2>
            {share.note ? <p className={styles.newsBody}>{share.note}</p> : null}
          </section>
        ) : null}
        {marked.length || share.removed.length ? (
          <section className={styles.news} aria-label="Since you last looked" data-slot="changes" data-testid="portal-schedule-changes">
            <h2 className={styles.newsHead}>{`Since you last looked${share.lookedAt ? ` on ${dayMonth(dayOf(new Date(share.lookedAt)))}` : ''}`}</h2>
            <ul className={styles.changes}>
              {marked.map((s) => (
                <li key={s.id} className={styles.change}>
                  <span className={styles.changeName}>{s.title}</span>
                  <span className={styles.changeWords}>{s.mark!.summary ?? <>{s.mark!.was ? <s>{s.mark!.was}</s> : null}{s.mark!.now}</>}</span>
                </li>
              ))}
              {share.removed.map((r) => <li key={r.id} className={styles.change}><span className={styles.changeName}>{r.title}</span><span className={styles.changeWords}>Taken off the schedule</span></li>)}
            </ul>
          </section>
        ) : null}
        <ContactLine data={data} ask="A question about the dates?" about="about the schedule" />
      </div>
    </div>
  )
}

/** "Something is not right" — what the client noticed, for their designer: the confirmation page's Ask for a change, as a form sheet. It
    closes only once the answer lands. */
function NotRight({ stage, designer, busy, onClose, onSend }: { stage: PortalStage | null; designer: string | null; busy: boolean; onClose: () => void; onSend: (note: string) => Promise<boolean> }) {
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [seen, setSeen] = useState<string | null>(null)
  const id = stage?.id ?? null
  if (id !== seen) { setSeen(id); setNote(''); setTried(false) }
  const empty = !note.trim()
  const send = async () => { if (empty) { setTried(true); return } await onSend(note.trim()) }
  return (
    <Dialog open={!!stage} onClose={onClose} title="Something is not right" size="form" width={400} closeOnScrim={false}
            subtitle={stage ? `Tell ${designer ?? 'your designer'} what you noticed with ${stageWords(stage.title)}. They will look at it with you.` : undefined}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { void send() }} isDisabled={busy} data-testid="portal-not-right-send">Send</Button></>}>
      <TextArea label="What you noticed" value={note} onChange={(v: string) => setNote(v)} maxLength={NOTE_MAX} autoFocus
                isInvalid={tried && empty} errorMessage={tried && empty ? 'Say what is not right, so your designer can look at it' : undefined} data-testid="portal-not-right-note" />
    </Dialog>
  )
}
