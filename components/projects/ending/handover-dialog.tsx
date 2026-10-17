'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { pendingWindow } from '@/components/portal/wa-window'
import { readHandover, type HandoverRead } from '@/app/projects/ending-actions'
/* (simplify S-19) the in-place fixes run today's own actions */
import { askStageAgain } from '@/app/projects/schedule-actions'
import { sendInvoice, submitInvoice } from '@/app/projects/money-actions'
import { remindInvoice } from '@/app/projects/payment-actions'
import { approveProjectUpdate } from '@/app/projects/updates-actions'
import { setComplianceItem, undoComplianceItem } from '@/app/projects/compliance-actions'
import { recordReminder } from '@/app/portal/remind-actions'
import { MarkDoneSheet } from '../schedule/mark-done-sheet'
import { projectHref } from '@/lib/projects/tabs'
import { withFrom } from '@/lib/nav'
import { ago } from '@/lib/templates/ago'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { agoText, remindMessage } from '@/lib/portal/model'
import { confirmTitle } from '@/lib/portal/schedule-model'   // (simplify round 2, R2-C) the portal need's own words
import { reminderMessage } from '@/lib/projects/payments-model'
import { tellClientText, waLink } from '@/lib/projects/tell-client'
import { Chips } from '@/components/om/chips'
import { DEFAULT_DEFECTS_MONTHS, DEFECTS_MONTHS_MAX, letterLine, letterMessage, type IssuedLetterView } from '@/lib/projects/completion-letter-model'   // (S44R, C9)
import { DEFER_REASON_MAX, closingLines, type ChecklistFix, type ChecklistItem } from '@/lib/projects/handover-model'
import s from './ending.module.css'
import mo from '../schedule/moment.module.css'
import { Line, Slot } from '@/components/shell/ghost-kit'

/** (simplify round 2, R2-C) The portal's need for a finished stage to confirm — lib/portal/needs.ts keys it `stage:<the milestone's id>` (its
    snapshot row's id); the Invite to Portal panel and With {client} record and read reminders under it. */
const stageNeedKey = (milestoneId: string) => `stage:${milestoneId}`

export type HandoverMode = 'complete' | 'review'
/** (gaps build, package A) An open item deferred with its own reason. */
export type Deferral = { key: string; reason: string }
/** (S44R — UAT row 359, call C9) the completion letter to send with the press: its defects period, and whether the client signs it or reads it */
export type LetterAsk = { months: number; toRead: boolean }
export type HandoverSubmit =
  | { kind: 'complete'; note: string; reason: string; deferred?: Deferral[]; letter?: LetterAsk | null }
  | { kind: 'approve'; reason: string; deferred?: Deferral[]; letter?: LetterAsk | null }
  | { kind: 'sendBack' }
  | { kind: 'withdraw' }
/** What the host answers: whether the server took it, and (S44R, C9) the letter it sent. */
export type HandoverResult = boolean | { ok: boolean; letter?: IssuedLetterView | null }

/**
 * (Projects round 7, Q-24) Complete handover — the house Dialog (m, 600) over the checklist the records draw (the card table, Settings'
 * event table): each item met with its tick, or open with why and its own button to the tab that fixes it. What the press does follows
 * the rules: complete now; ask for an owner's review (Settings › Projects › Handover needs an owner's review, a Designer's or a Manager's);
 * *Complete anyway* for an Owner or an Admin with a reason. In review mode an Owner or an Admin reads the request and approves it or sends it
 * back. Loads on open (the listing's row and the project page share it); closes only once its save lands.
 */
export function HandoverDialog({ projectId, mode, open, onClose, onSubmit, origin }: {
  projectId: string | null
  mode: HandoverMode
  open: boolean
  onClose: () => void
  /** Resolves true once the server took it — the dialog then closes. (S44R, C9) With the letter it sent, when one went. */
  onSubmit: (s: HandoverSubmit) => Promise<HandoverResult>
  /** Where the project was opened from — an item's button keeps it (REG-465). */
  origin?: string
}) {
  const router = useRouter()
  const [data, setData] = useState<HandoverRead | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(false)
  const [now, setNow] = useState(0)
  /* (simplify S-19) the fix pressed in place (its key while it runs), the nested Mark done sheet, ☑ Tell {client} it's handed over */
  const snackbar = useSnackbar()
  const [fixing, setFixing] = useState<string | null>(null)
  const [doneFor, setDoneFor] = useState<string | null>(null)
  const [tell, setTell] = useState(true)
  /* (S44R — UAT row 359, call C9) ☑ Send {client} the completion letter — its defects period and To sign · To read and keep */
  const [letter, setLetter] = useState(true)
  const [months, setMonths] = useState(String(DEFAULT_DEFECTS_MONTHS))
  const [letterRead, setLetterRead] = useState<boolean | null>(null)
  /* (gaps build, package A — 1.0 D-257) an open item deferred with its own reason: which rows show their field, and what they say */
  const [defer, setDefer] = useState<Record<string, string>>({})
  const [deferOpen, setDeferOpen] = useState<string[]>([])
  const [seeded, setSeeded] = useState<unknown>(null)
  if (open !== was) { setWas(open); if (open) { setData(null); setFailed(null); setNote(''); setReason(''); setTried(false); setBusy(false); setDefer({}); setDeferOpen([]); setSeeded(null); setFixing(null); setDoneFor(null); setTell(true); setLetter(true); setMonths(String(DEFAULT_DEFECTS_MONTHS)); setLetterRead(null) } }
  /* the asker's deferrals arrive with the request — the reviewer reads them, and may change them */
  if (data && seeded !== data) { if (seeded === null) setLetter(!data.letter?.sent); setSeeded(data); const d = data.request?.deferred ?? []; if (d.length) { setDefer(Object.fromEntries(d.map((x) => [x.key, x.reason]))); setDeferOpen(d.map((x) => x.key)) } }   // (S44R, C9) a letter already sent is not sent again unless asked
  useEffect(() => {
    if (!open || !projectId) return
    let live = true
    void readHandover(projectId).then((r) => {
      if (!live) return
      if ('error' in r) { setFailed(r.error); return }
      setData(r); setNow(Date.now())
    }, () => { if (live) setFailed('') })
    return () => { live = false }
  }, [open, projectId, tick])

  const items = data?.items ?? []
  const open_ = items.filter((i) => !i.met)
  const met = !!data?.met
  const review = mode === 'review' && !!data?.viewer.runs && !!data.request
  const runs = !!data?.viewer.runs
  const atOnce = !!data?.viewer.atOnce
  const pendingMine = !!data?.request?.mine && !review
  const pendingOther = !!data?.request && !data.request.mine && !review
  const deferrals = open_.filter((i) => (defer[i.key] ?? '').trim()).map((i) => ({ key: i.key as string, reason: (defer[i.key] ?? '').trim() }))
  const allDeferred = open_.length > 0 && deferrals.length === open_.length
  const needsReason = !met && runs && !pendingMine && !allDeferred   // (gaps build, package A) every open item deferred carries its own reason
  const reasonError = tried && needsReason && !reason.trim() ? 'Say why it is completed with items open' : undefined
  const mayDefer = !!data && (!data.request || review || (pendingOther && runs))   // the asker reads their own; the reviewer may change them
  /* (fix-E, E-13) A Designer or a Manager with items still open asks an Owner or an Admin to complete it anyway — the press files the
     request (their bell, Needs my review), whatever the review setting; it was a disabled button and a hint to go and find one. */
  const askAnyway = !!data && !met && !runs
  /* (fix-E, E-14) the review was switched off while my request waited: I complete it myself once the checklist is met */
  const finishMine = pendingMine && atOnce && met

  const goTo = (item: ChecklistItem) => {
    if (!item.action || !data) return
    const base = projectHref(data.project.id, item.action.tab)
    const url = item.action.open ? `${base}?open=${encodeURIComponent(item.action.open)}` : base
    onClose()
    const hash = item.action.hash ? `#${item.action.hash}` : ''   // (parity map, PR-121) Open Costs lands on Money's Costs
    router.push(`${origin ? withFrom(url, origin) : url}${hash}`)
  }
  /* (simplify S-19) ☑ Tell {client} it's handed over — offered while the press completes the project and the client can take a WhatsApp */
  const client = data?.client ?? null
  const completes = !!data && (review || finishMine || (pendingOther && runs) || (!data.request && !askAnyway && atOnce))
  const offerTell = completes && !!client?.phone && client.mobile
  /* (S44R — UAT row 359, call C9) the completion letter: offered while the press completes the project and the studio has a template for it */
  const lt = data?.letter ?? null
  const offerLetter = completes && !!lt
  const readOnly = letterRead ?? !lt?.template.signs   // a template with nowhere to sign can only be read
  const monthsN = Number(months)
  const monthsOk = /^\d{1,2}$/.test(months.trim()) && monthsN >= 1 && monthsN <= DEFECTS_MONTHS_MAX
  const sendsLetter = offerLetter && letter
  const press = async (sub: HandoverSubmit) => {
    if (busy) return
    if ((sub.kind === 'complete' || sub.kind === 'approve') && needsReason && !reason.trim()) { setTried(true); return }
    const completing = sub.kind === 'complete' || sub.kind === 'approve'
    if (completing && sendsLetter && !monthsOk) { setTried(true); return }
    const told = completing && offerTell && tell && client?.phone ? client : null
    const letterAsk: LetterAsk | null = completing && sendsLetter ? { months: monthsN, toRead: readOnly } : null
    const messages = (told || letterAsk) && client?.phone && client.mobile ? client : null
    const w = messages ? pendingWindow() : null   // WhatsApp opens on the press (REG-534), pointed at the draft once it is completed
    setBusy(true)
    const r = await onSubmit(completing ? { ...sub, deferred: deferrals, letter: letterAsk } : sub)
    setBusy(false)
    const ok = typeof r === 'boolean' ? r : r.ok
    const sent = typeof r === 'boolean' ? null : r.letter ?? null
    if (w && messages?.phone) {
      const origin = window.location.origin
      const thanks = told ? tellClientText('handover', { client: messages.name, studio: messages.studio, url: messages.live && !messages.paused ? `${origin}${messages.path}` : null }) : null
      const text = !ok ? null : thanks && sent ? `${thanks}\n\n${letterLine({ title: sent.title, link: `${origin}${sent.path}`, toRead: sent.toRead })}`
        : thanks ?? (sent ? letterMessage({ clientFirst: messages.first, studio: messages.studio, title: sent.title, link: `${origin}${sent.path}`, toRead: sent.toRead }) : null)
      if (text) w.go(waLink(messages.phone, text)); else w.cancel()
    }
    if (ok && sub.kind !== 'sendBack') onClose()
  }
  /* (simplify round 2, R2-C) when the client was last reminded of the stage this row waits on — the portal's reminders, by the need's key */
  const remindedAt = (it: ChecklistItem): number | null => {
    const f = !it.met ? (it.fixes ?? []).find((x) => x.kind === 'remind-confirm') : undefined
    return f && f.kind === 'remind-confirm' ? data?.reminded?.[stageNeedKey(f.milestoneId)] ?? null : null
  }
  /* a reminder needs the client's number — and, for a stage to confirm, their page */
  const usable = (f: ChecklistFix) => (f.kind === 'remind-confirm' ? !!client?.phone && client.live : f.kind === 'remind-invoice' ? !!client?.phone : true)
  /* (simplify S-19) a fix in place — today's own action, one sentence (with Undo where the action has one), then the checklist read again */
  const reread = () => setTick((t) => t + 1)
  const fix = async (f: ChecklistFix, key: string) => {
    if (!data || fixing) return
    if (f.kind === 'mark-done') { setDoneFor(f.milestoneId); return }
    if (f.kind === 'open-ticket') { onClose(); const url = `${projectHref(data.project.id, 'tickets')}?open=${encodeURIComponent(f.ticketId)}`; router.push(origin ? withFrom(url, origin) : url); return }
    const first = data.project.client.split(/\s+/)[0] ?? data.project.client
    const page = client?.live && !client.paused ? `${window.location.origin}${client.path}` : null
    /* the two reminders draft the client's WhatsApp on the press (REG-534), then record it */
    /* (simplify round 2, R2-C) the stage to confirm is the portal's need `stage:<milestone>` — its key, its words and its link, as the Invite to
       Portal panel and With {client} remind it — so "reminded …" reads the same wherever the need shows */
    if (f.kind === 'remind-confirm' && client?.phone) window.open(waLink(client.phone, remindMessage({ client: client.name, studio: client.studio, what: confirmTitle(f.title), url: `${window.location.origin}${client.path}/schedule#stage-${f.milestoneId}` })), '_blank', 'noopener')
    if (f.kind === 'remind-invoice' && client?.phone) window.open(waLink(client.phone, reminderMessage({ client: client.name, studio: client.studio, stage: f.stage, number: f.number, amount: money2(f.owedMinor), due: f.dueAt ? displayDate(new Date(f.dueAt)) : '', url: page, late: true })), '_blank', 'noopener')
    setFixing(key)
    try {
      const r: unknown = f.kind === 'ask-again' ? await askStageAgain(f.milestoneId)
        : f.kind === 'remind-confirm' ? (data.project.leadId ? await recordReminder(data.project.leadId, { key: stageNeedKey(f.milestoneId), title: confirmTitle(f.title) }) : null)
        : f.kind === 'send-invoice' ? await (f.mode === 'send' ? sendInvoice(f.invoiceId) : submitInvoice(f.invoiceId))
        : f.kind === 'remind-invoice' ? await remindInvoice(f.invoiceId)
        : f.kind === 'approve-update' ? await approveProjectUpdate(f.updateId)
        : await setComplianceItem(data.project.id, f.itemId, 'done')
      if (r && typeof r === 'object' && 'error' in r && typeof (r as { error: unknown }).error === 'string') { snackbar({ message: couldnt(f.label.toLowerCase(), refusalOf((r as { error: string }).error)) }); return }
      if (f.kind === 'compliance-done' && r && typeof r === 'object' && 'undo' in r) {
        const x = r as { sentence: string; undo: Parameters<typeof undoComplianceItem>[0] }
        snackbar({ message: x.sentence, actionLabel: 'Undo', onAction: () => { void undoComplianceItem(x.undo).then(() => { reread(); router.refresh() }) } })
      } else snackbar({ message: f.kind === 'ask-again' ? `Asked ${first} again to confirm it`
        : f.kind === 'remind-confirm' ? `Reminder drafted on WhatsApp for ${first}`
        : f.kind === 'send-invoice' ? (f.mode === 'send' ? `${(r as { number?: string }).number ?? 'The invoice'} sent` : 'Invoice submitted for approval')
        : f.kind === 'remind-invoice' ? `Reminder drafted on WhatsApp for ${first} — it’s on the project’s Activity`
        : 'Update approved — it’s on their page' })
      reread(); router.refresh()
    } catch (e) { snackbar({ message: couldnt(f.label.toLowerCase(), refusalOf(e)) }) }
    finally { setFixing(null) }
  }

  /* the one filled button, by who presses it and what the checklist says */
  const primary: { label: string; run: () => void; disabled?: boolean } | null = !data ? null
    : review ? { label: met || allDeferred ? 'Approve' : 'Approve anyway', run: () => { void press({ kind: 'approve', reason: reason.trim() }) } }
    : finishMine ? { label: 'Complete handover', run: () => { void press({ kind: 'complete', note: '', reason: '' }) } }
    : pendingMine ? { label: 'Take the request back', run: () => { void press({ kind: 'withdraw' }) } }
    : pendingOther ? (runs ? { label: met || allDeferred ? 'Approve' : 'Approve anyway', run: () => { void press({ kind: 'approve', reason: reason.trim() }) } } : null)
    : askAnyway ? { label: 'Ask an Owner or an Admin', run: () => { void press({ kind: 'complete', note: note.trim(), reason: '' }) } }
    : atOnce ? (met || allDeferred ? { label: 'Complete handover', run: () => { void press({ kind: 'complete', note: note.trim(), reason: reason.trim() }) } }
      : { label: 'Complete anyway', run: () => { void press({ kind: 'complete', note: note.trim(), reason: reason.trim() }) } })
    : { label: 'Ask for review', run: () => { void press({ kind: 'complete', note: note.trim(), reason: '' }) } }

  const name = data?.project.name ?? ''
  const intro = !data ? null
    : data.request ? <>{data.request.mine ? 'You' : <b>{data.request.by}</b>} asked to complete the handover {ago(data.request.at, now)}{data.request.note ? <> — <i>“{data.request.note.replace(/[.!?]+$/, '')}”</i></> : null}.{review || (pendingOther && runs) ? ' Approve it to mark the project Completed, or send it back with a note.' : finishMine ? ' The owner’s review is off now — complete it yourself, or take the request back.' : data.request.mine ? ' An Owner or an Admin approves it or sends it back.' : ' It waits for an Owner or an Admin.'}</>
    : askAnyway ? <>With checklist items still open, an Owner or an Admin completes {name} — ask them, and it waits for their review.</>
    : atOnce ? <>Completing the handover marks {name} Completed. Its schedule, choices and money become read-only; an Owner or an Admin can reopen it.</>
    : <>An Owner or an Admin reviews the handover before {name} is Completed — Settings › Projects asks for an owner’s review.</>

  return (
    <>
    <Dialog open={open} onClose={onClose} title={review ? 'Review the handover' : 'Complete handover'} subtitle={name || undefined} size="form" width={600} closeOnScrim={false}
            footer={<>
              {review || (pendingOther && runs) ? <FootStart><Button appearance="text" onPress={() => { void press({ kind: 'sendBack' }) }} isDisabled={busy} data-testid="handover-send-back">Send back</Button></FootStart> : null}
              {finishMine ? <FootStart><Button appearance="text" onPress={() => { void press({ kind: 'withdraw' }) }} isDisabled={busy} data-testid="handover-withdraw">Take the request back</Button></FootStart> : null}
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>{primary ? 'Cancel' : 'Close'}</Button>
              {primary ? <Button onPress={primary.run} isDisabled={busy || !!primary.disabled} data-testid="handover-primary">{busy ? 'Saving…' : primary.label}</Button> : null}
            </>}>
      <div className={s.body} data-testid="handover-dialog">
        {failed !== null ? (
          <p className={s.intro} role="status">{failed || 'Couldn’t load the checklist'} — <button type="button" className={s.retry} onClick={() => { setFailed(null); setTick((t) => t + 1) }}>try again</button></p>
        ) : !data ? <HandoverGhost /> : (
          <>
            <p className={s.intro}>{intro}</p>
            <div className={s.table} role="table" aria-label="Handover checklist" data-card-table="" data-testid="handover-checklist">
              <div className={s.head} role="row"><span role="columnheader">Checklist</span><span role="columnheader" className={s.actionsHead}><span className={s.srOnly}>Action</span></span></div>
              {items.map((it) => {
                const deferred = !it.met && !!(defer[it.key] ?? '').trim()
                const showDefer = !it.met && deferOpen.includes(it.key)
                return (
                  <div key={it.key} className={s.row} role="row" data-open={it.met ? undefined : ''} data-deferred={deferred ? '' : undefined} data-testid={`check-${it.key}`} data-met={it.met ? 'yes' : deferred ? 'deferred' : 'no'}>
                    <span role="cell" className={s.item}>
                      <Icon name={it.met ? 'check_circle' : deferred ? 'pending' : 'error'} size={20} weight={300} fill={it.met} className={s.mark} />
                      <span><span>{it.label}</span>{it.why || remindedAt(it) ? <span className={s.why}>{[it.why, remindedAt(it) ? `reminded ${agoText(remindedAt(it)!, now)}` : null].filter(Boolean).join(' · ')}</span> : null}</span>
                    </span>
                    <span role="cell" className={s.actions}>
                      {/* (gaps build, package A) Defer: this item waits past the handover, with its own reason (kept on the record) */}
                      {!it.met && mayDefer && !showDefer ? <Button appearance="text" onPress={() => setDeferOpen((xs) => [...xs, it.key])} data-testid={`check-${it.key}-defer`}>Defer</Button> : null}
                      {/* (simplify S-19) fixed in place — Mark {last} done, Ask again · Remind, Send the invoice · Remind, Approve, Mark done,
                          Open T-… — the tab's door stays for what can't be done here (recording a payment, more than one milestone) */}
                      {!it.met ? (it.fixes ?? []).filter(usable).map((f, i) => (
                        <Button key={`${f.kind}-${i}`} appearance="text" onPress={() => { void fix(f, `${it.key}-${i}`) }} isDisabled={!!fixing || busy} data-testid={`check-${it.key}-fix`}>{fixing === `${it.key}-${i}` ? 'Saving…' : f.label}</Button>
                      )) : null}
                      {it.action && (!(it.fixes ?? []).some(usable) || it.key === 'money' || it.key === 'compliance') ? <Button appearance="text" onPress={() => goTo(it)} data-testid={`check-${it.key}-go`}>{it.action.label}</Button> : null}
                    </span>
                    {showDefer ? (
                      <span className={s.deferField}>
                        <TextField label="Why defer it?" value={defer[it.key] ?? ''} onChange={(v) => setDefer((d) => ({ ...d, [it.key]: v }))} maxLength={DEFER_REASON_MAX} disabled={!mayDefer}
                                   helper="It stays on the project’s record with the item" name={`defer-${it.key}`} autoFocus={!(defer[it.key] ?? '')} />
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
            {/* (gaps build, package A — 1.0 D-265 · D-266) how the project ends, in the records' own figures — before anyone completes it */}
            {/* (parity map, PR-122 — 1.0 D-306's yellow strip) a quiet strip when the margin is more than 25 points off the expected (Owners and Admins) */}
            {data.summary?.closing?.warning ? (
              <p className={s.strip} role="status" data-testid="handover-margin-warning"><Icon name="info" size={20} weight={300} /><span>{data.summary.closing.warning}</span></p>
            ) : null}
            {data.summary ? (() => {
              const lines = closingLines(data.summary).filter((l) => !l.key.startsWith('deferred-'))
              return lines.length ? (
                <div className={s.table} role="table" aria-label="Closing summary" data-card-table="" data-testid="handover-summary">
                  <div className={s.head} role="row"><span role="columnheader">Closing summary</span><span role="columnheader" className={s.actionsHead}><span className={s.srOnly}>Figure</span></span></div>
                  {lines.map((l) => (
                    <div key={l.key} className={s.row} role="row" data-open={l.tone === 'alert' ? '' : undefined} data-testid={`summary-${l.key}`}>
                      <span role="cell" className={s.item}><span><span>{l.label}</span>{l.caption ? <span className={s.why}>{l.caption}</span> : null}</span></span>
                      <span role="cell" className={s.figure}>{l.value}</span>
                    </div>
                  ))}
                </div>
              ) : null
            })() : null}
            {open_.length && !runs && !data.request ? <span className={s.hint} data-testid="handover-hint">Finish what’s left first, or ask now — the open items go with your request.</span> : null}
            {needsReason && (review || atOnce || pendingOther) ? (
              <TextField label="Why complete it with items open?" required value={reason} onChange={setReason} maxLength={300} error={reasonError}
                         helper="It stays on the project’s record, with the items that were open." name="handover-reason" />
            ) : null}
            {!review && !data.request ? (
              <TextField label={atOnce && (met || runs) ? 'A note for the record (optional)' : 'A note for the reviewer (optional)'} value={note} onChange={setNote} maxLength={500} name="handover-note" />
            ) : null}
            {/* (simplify S-19) their page already says the home is handed over — this tells them on WhatsApp too */}
            {offerTell && client ? (
              <div className={mo.tick}>
                <Checkbox isSelected={tell} onChange={setTell} data-testid="handover-tell">{`Tell ${client.first} it’s handed over`}</Checkbox>
                <span className={mo.help}>WhatsApp opens with a thank-you and their page — you send it.</span>
              </div>
            ) : null}
            {/* (S44R — UAT row 359, call C9) the completion & warranty letter, filled from the project — to sign or to read and keep (invented copy) */}
            {offerLetter && lt ? (
              <div className={mo.tick} data-testid="handover-letter">
                <Checkbox isSelected={letter} onChange={setLetter} data-testid="handover-letter-tick">{`Send ${data.project.client.split(/\s+/)[0]} the completion letter`}</Checkbox>
                <span className={mo.help} data-testid="handover-letter-help">{lt.sent ? `You sent “${lt.sent.title}” on ${displayDate(new Date(lt.sent.at))} — this sends a new one from “${lt.template.title}”` : `“${lt.template.title}”`}, filled from the project: completed today, with its defects period.{client?.phone && client.mobile ? ' WhatsApp opens with its link — you send it.' : ' It waits on the lead’s Contracts.'}</span>
                {letter ? (
                  <div className={s.letterFields}>
                    <TextField label="Defects period (months)" value={months} numeric="digits" maxLength={2} onChange={setMonths} size="s" name="defects-months" className={s.months}
                               error={tried && !monthsOk ? `Enter 1 to ${DEFECTS_MONTHS_MAX} months` : undefined} />
                    <Chips label={`What ${data.project.client.split(/\s+/)[0]} does with it`} value={readOnly ? 'read' : 'sign'} onChange={(v) => setLetterRead(v === 'read')} testId="handover-letter-how"
                           options={[{ value: 'sign', label: `${data.project.client.split(/\s+/)[0]} signs it`, disabled: !lt.template.signs }, { value: 'read', label: `${data.project.client.split(/\s+/)[0]} reads and keeps it` }]} />
                    {!lt.template.signs ? <span className={mo.help}>{`“${lt.template.title}” has nowhere to sign — it goes to read and keep.`}</span> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </Dialog>
    {/* (simplify S-19) "Mark {last} done" — the Mark done sheet over the Hand over sheet; the checklist is read again once it lands */}
    <MarkDoneSheet milestoneId={doneFor} open={!!doneFor} nested onClose={() => setDoneFor(null)} onDone={() => reread()} />
    </>
  )
}

/** (REG-708) The checklist's ghost — the sheet's own card table: its head, the rows with their mark, words and a button, the note field. */
function HandoverGhost() {
  return (
    <div className={s.body} aria-hidden data-testid="handover-ghost">
      <Line w="80%" lh={22} h={12} />
      <div className={s.table} data-card-table="">
        <div className={s.head}><Line w={72} lh={16} h={10} /><span /></div>
        {[220, 260, 200, 240, 180].map((w, i) => (
          <div key={i} className={s.row}><span className={s.item}><Slot kind="check" /><span><Line w={w} lh={20} h={12} /><Line w={w - 60} lh={16} h={10} /></span></span><span className={s.actions}><Slot kind="btn" w={96} /></span></div>
        ))}
      </div>
      <Slot kind="field" w="100%" />
    </div>
  )
}
