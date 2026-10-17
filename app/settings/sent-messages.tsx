'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { ScopePill } from '@/components/om/scope-pill'
import { Bone } from '@/components/shell/skeleton'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { fetchSentMessages } from '@/app/notifications/outbox-actions'
import { dropLargeSend, fetchHeldSends, sendLargeSend, tryMessageAgain, type HeldSend } from '@/app/notifications/outbox-held-actions'   // (parity map, UC-082 · UC-083)
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { EVENTS, eventDef } from '@/lib/notifications/model'
import { CLIENT_EVENTS, clientEventDef } from '@/lib/portal/client-messages'   // (gaps build H, H-Q17) the client's messages, logged with the studio's
import { INVITE_EVENT, INVITE_EVENT_LABEL } from '@/lib/company/invitations'   // (pending modules S09)
import { SUMMARY_EVENT, SUMMARY_EVENT_LABEL } from '@/lib/notifications/summary'   // (pending modules S18)
import { SITE_EVENTS, SITE_EVENT_LABEL, isSiteEvent } from '@/lib/site/team-mail'   // (pending modules S35)
import type { SentEvent } from '@/lib/notifications/outbox'
import { CHANNEL_WORDS, SENT_PAGE, firstLine, statusWords, type SentChannel, type SentMessage, type SentPage } from '@/lib/notifications/outbox'
import { displayDate, displayDateTime, displayTime } from '@/lib/format'
import styles from './settings.module.css'
import g from './sent-messages.module.css'

const CHANNEL_CHIPS = [{ value: 'all', label: 'All' }, { value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }] as const
/** (simplify round 2, R2-C) A client's message still waiting out its action's Undo — or on its way — has no Sent time yet. */
const waiting = (m: SentMessage) => m.status === 'held' || m.status === 'sending' || m.status === 'paused' || m.status === 'held_large' || m.status === 'dropped'   // (parity map, UC-082) nor one paused, held for the Owner or dropped

/**
 * (gaps build E, item 5) Settings › Notifications › Sent messages — every email and WhatsApp message the rules sent (the outbox,
 * lib/notifications/delivery.ts), newest first: what it said, to whom, on which channel, for which event, when, and how it went. Filters by
 * channel (the house chips) and event (the house scope pill, "filter where you are", REG-666); a row opens the message as it went out. The
 * studio's Owners and Admins read every message; anyone else the ones sent to them. The card table (REG-727), a card per row on a phone.
 * (simplify round 2, R2-C) A client's message an action holds for its Undo reads "Held — goes at {time} unless undone" until it goes.
 * (parity map 2026-10-10 — UC-082 · UC-083) The safeguards say themselves here: while OpenMaison pauses the studio's messages a line says so
 * and each waits ("Paused by OpenMaison"); a large send waits above the log for the Owner — Send · Drop (an Admin reads it waiting); a
 * failed message reads "Trying again (2 of 3)" and opens with **Try again now**. The prototype's outbox sends nothing — nothing leaves the
 * machine — so a real failure only comes with a real provider.
 * (pending modules S34) While it does, the help line says "Simulated on this prototype"; once a real provider is plugged in and reports back,
 * a sent message reads Delivered, then Read (its receipts, lib/notifications/delivery.ts `applyReceipts`).
 */
export function SentMessages() {
  const [channel, setChannel] = useState<'all' | SentChannel>('all')
  const [event, setEvent] = useState<'all' | SentEvent>('all')
  const [limit, setLimit] = useState(SENT_PAGE)
  const [page, setPage] = useState<SentPage | null>(null)
  const [failed, setFailed] = useState(false)
  const [tries, setTries] = useState(0)
  const [open, setOpen] = useState<SentMessage | null>(null)
  const [eventsOpen, setEventsOpen] = useState(false)
  const pill = useRef<HTMLButtonElement>(null)
  const ask = useRef(0)
  const snackbar = useSnackbar()
  /* (UC-082) the large sends waiting for the Owner, and OpenMaison's pause */
  const [held, setHeld] = useState<{ sends: HeldSend[]; paused: boolean; owner: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => {
    const n = ++ask.current
    fetchSentMessages({ channel, event, limit })
      .then((p) => { if (n === ask.current) { setPage(p); setFailed(false) } })
      .catch(() => { if (n === ask.current) setFailed(true) })
    fetchHeldSends().then(setHeld).catch(() => {})
  }, [channel, event, limit, tries])
  const answer = async (b: HeldSend, how: 'send' | 'drop') => {
    setBusy(b.batch)
    try {
      const r = how === 'send' ? await sendLargeSend(b.batch) : await dropLargeSend(b.batch)
      if ('error' in r) { snackbar({ message: couldnt(how === 'send' ? 'send it' : 'drop it', refusalOf(r.error)) }); return }
      snackbar({ message: how === 'send' ? `Sent — ${b.messages === 1 ? 'the message went' : `${b.messages} messages went`} to ${b.people} people` : `Dropped — the ${b.messages === 1 ? 'message stays' : `${b.messages} messages stay`} in the log, unsent` })
      setTries((t) => t + 1)
    } catch { snackbar({ message: couldnt(how === 'send' ? 'send it' : 'drop it') }) } finally { setBusy(null) }
  }
  const again = async (m: SentMessage) => {
    setBusy(m.id)
    try {
      const r = await tryMessageAgain(m.id)
      if ('error' in r) { snackbar({ message: couldnt('try it again', refusalOf(r.error)) }); return }
      snackbar({ message: r.status === 'sent' ? 'Sent' : 'Tried again — it didn’t go this time either' })
      setOpen(null); setTries((t) => t + 1)
    } catch { snackbar({ message: couldnt('try it again') }) } finally { setBusy(null) }
  }
  const filtered = channel !== 'all' || event !== 'all'
  const label = (k: SentEvent) => (k === INVITE_EVENT ? INVITE_EVENT_LABEL : k === SUMMARY_EVENT ? SUMMARY_EVENT_LABEL : isSiteEvent(k) ? SITE_EVENT_LABEL[k] : eventDef(k)?.label ?? (clientEventDef(k) ? `To the client · ${clientEventDef(k)!.label}` : k))   // (pending modules S09) an invitation to a new member — (S18) a member's daily summary
  const events = page?.events ?? []
  const clear = () => { setChannel('all'); setEvent('all'); setLimit(SENT_PAGE) }
  return (
    <div className={styles.setting} id="sent-messages" data-testid="notification-sent">
      <div className={styles.settingHead}>
        <span className={styles.settingTitle}>Sent messages</span>
        <span className={styles.settingHelp}>
          {page && !page.everyone ? 'The emails and WhatsApp messages sent to you, newest first. Open one to read it as it went out.'
            : 'Every email and WhatsApp message the rules above sent, newest first. Open one to read it as it went out.'}
          {/* (pending modules S34) said plainly while the prototype's outbox answers — a real provider plugged in takes the line away */}
          {page?.simulated ? <span data-testid="sent-simulated">{' Simulated on this prototype — each message is recorded here, and none is really sent.'}</span> : null}
        </span>
      </div>
      {held?.paused ? (
        <p className={g.pause} data-testid="sent-paused"><Icon name="info" size={18} weight={300} className={g.pauseIcon} />OpenMaison has paused the studio’s messages for now — each email and WhatsApp waits here and goes once the pause lifts. The bell inside the app keeps ringing.</p>
      ) : null}
      {held?.sends.length ? (
        <div className={g.held} data-testid="sent-held">
          {held.sends.map((b) => (
            <div key={b.batch} className={g.heldRow} data-testid="sent-held-row">
              <span className={g.heldText}>
                <span className={g.heldTitle}>{held.owner ? 'Waiting for your OK' : 'Waiting for the Owner’s OK'} — {label(b.event)}</span>
                <span className={g.heldLine}>{`${b.people} people · ${b.messages} messages — one action would have messaged them all at once${b.title ? ` · “${b.title}”` : ''}`}</span>
              </span>
              {held.owner ? (
                <span className={g.heldActions}>
                  <Button variant="secondary" appearance="outlined" isDisabled={busy === b.batch} onPress={() => { void answer(b, 'drop') }} data-testid="sent-held-drop">Drop</Button>
                  <Button isDisabled={busy === b.batch} onPress={() => { void answer(b, 'send') }} data-testid="sent-held-send">{`Send to ${b.people}`}</Button>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className={styles.sentTools}>
        <Chips label="Channel" options={CHANNEL_CHIPS} value={channel} onChange={(v) => { setChannel(v as 'all' | SentChannel); setLimit(SENT_PAGE) }} testId="sent-channel" />
        <ScopePill ref={pill} label={`Event: ${event === 'all' ? 'All' : label(event)}`} short={event === 'all' ? 'All' : '1'} scoped={event !== 'all'} open={eventsOpen} onClick={() => setEventsOpen((o) => !o)} />
        <PortalMenu open={eventsOpen} anchor={pill} onClose={() => setEventsOpen(false)} align="left" width={MENU_WIDTH.detail} role="menu" sheetTitle="Event">
          <DropdownItem role="menuitemradio" checked={event === 'all'} onSelect={() => { setEventsOpen(false); setEvent('all'); setLimit(SENT_PAGE) }}>All events</DropdownItem>
          {[...EVENTS, ...CLIENT_EVENTS, { key: INVITE_EVENT }, { key: SUMMARY_EVENT }, ...SITE_EVENTS.map((key) => ({ key }))].filter((e) => events.includes(e.key) || e.key === event).map((e) => (
            <DropdownItem key={e.key} role="menuitemradio" checked={event === e.key} onSelect={() => { setEventsOpen(false); setEvent(e.key); setLimit(SENT_PAGE) }}>{label(e.key)}</DropdownItem>
          ))}
        </PortalMenu>
        {page ? <span className={styles.sentCount} data-testid="sent-count">{page.total === 1 ? '1 message' : `${page.total.toLocaleString('en-SG')} messages`}</span> : null}
      </div>
      {failed && !page ? (
        <p className={styles.sentEmpty}>Couldn’t load the sent messages — <button type="button" className={styles.sentLink} onClick={() => setTries((t) => t + 1)}>try again</button></p>
      ) : !page ? (
        <div className={styles.sentTable} aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className={styles.sentRow}><Bone w="80%" h={14} /><Bone w="60%" h={14} /><Bone w={64} h={14} /><Bone w={88} h={14} /><Bone w={64} h={14} /></div>)}
        </div>
      ) : page.rows.length === 0 ? (
        filtered
          ? <p className={styles.sentEmpty} data-testid="sent-none">No messages match. <button type="button" className={styles.sentLink} onClick={clear}>Clear the filters</button></p>
          : <p className={styles.sentEmpty} data-testid="sent-none">No messages yet. An email or a WhatsApp goes out with the bell for every event whose switch is on above.</p>
      ) : (
        <>
          <div className={styles.sentTable} role="table" aria-label="Sent messages" data-card-table="" data-testid="sent-table">
            <div className={styles.sentHead} role="row">
              <span role="columnheader">Message</span><span role="columnheader">To</span><span role="columnheader">Channel</span><span role="columnheader">Sent</span><span role="columnheader">Status</span>
            </div>
            {page.rows.map((m) => (
              <div key={m.id} className={styles.sentRow} role="row" data-testid="sent-row" data-channel={m.channel} data-event={m.event}>
                <span role="cell" className={styles.sentMessage}>
                  <span className={styles.sentEvent}>{label(m.event)}</span>
                  <button type="button" className={styles.sentLink} onClick={() => setOpen(m)}>{firstLine(m)}</button>
                </span>
                <span role="cell" className={styles.sentTo} data-label="To"><span>{m.toName}</span><span className={styles.sentAddress}>{m.toAddress ?? '—'}</span></span>
                <span role="cell" className={styles.sentChannel} data-label="Channel"><Icon name={m.channel === 'whatsapp' ? 'chat' : 'mail'} size={18} weight={300} />{CHANNEL_WORDS[m.channel]}</span>
                {/* (simplify round 2, R2-C) a held message hasn't gone — its status says when it goes, unless its Undo takes it back */}
                <span role="cell" className={styles.sentAt} data-label="Sent">{waiting(m) ? <span>—</span> : <><span>{displayDate(new Date(m.at))}</span><span className={styles.sentAddress}>{displayTime(new Date(m.at))}</span></>}</span>
                <span role="cell" className={styles.sentStatus} data-label="Status" data-status={m.status}>{statusWords(m)}</span>
              </div>
            ))}
          </div>
          {page.total > page.rows.length ? (
            <div className={styles.sentMore}><Button appearance="text" onPress={() => setLimit((l) => l + SENT_PAGE)}>{`Show ${Math.min(SENT_PAGE, page.total - page.rows.length)} more`}</Button></div>
          ) : null}
        </>
      )}

      <Dialog open={!!open} onClose={() => setOpen(null)} size="modal" width={600}
              title={open ? `${label(open.event)} · ${CHANNEL_WORDS[open.channel]}` : 'Message'}
              subtitle={open ? (waiting(open) ? statusWords(open) : `${statusWords(open)} · ${displayDateTime(new Date(open.at))}`) : undefined}>
        {open ? (
          <MessageAsSent m={open}>
            {/* (parity map, UC-083) a message that failed — tried again by itself, or now */}
            {open.status === 'failed' && page?.everyone ? (
              <div className={g.retry} data-testid="sent-retry">
                <span>{open.nextTryAt ? `${statusWords(open)} — next try ${displayTime(new Date(open.nextTryAt))}` : statusWords(open)}</span>
                <Button variant="secondary" appearance="outlined" isDisabled={busy === open.id} onPress={() => { void again(open) }} data-testid="sent-try-again">Try again now</Button>
              </div>
            ) : null}
          </MessageAsSent>
        ) : null}
      </Dialog>
    </div>
  )
}

/** A message as it went out — to whom, its subject, its words. Sent messages' detail, and (pending modules S18) Your profile's daily summary. */
export function MessageAsSent({ m, children }: { m: Pick<SentMessage, 'toName' | 'toAddress' | 'subject' | 'body'>; children?: ReactNode }) {
  return (
    <div className={styles.sentDetail} data-testid="sent-detail">
      <dl className={styles.sentFacts}>
        <dt>To</dt><dd>{m.toName}{m.toAddress ? ` · ${m.toAddress}` : ''}</dd>
        {m.subject ? <><dt>Subject</dt><dd>{m.subject}</dd></> : null}
      </dl>
      <p className={styles.messageBody}>{m.body}</p>
      {children}
    </div>
  )
}
