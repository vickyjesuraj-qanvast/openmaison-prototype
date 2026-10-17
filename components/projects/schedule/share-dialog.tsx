'use client'

import { useState } from 'react'
import { Button, Checkbox, TextArea } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { changeWords, dayLabel, dayMonth, dayOf, dayOfIso, handoverOf, plural, snapshotFor, type Milestone, type ScheduleChange, type ScheduleSnapshot, type ShareAsk } from '@/lib/projects/schedule-model'
import { ClientSchedule } from './client-schedule'
import { isPausedStage } from '@/lib/portal/schedule-model'   // (simplify S-25 (1))
import styles from './schedule.module.css'

/**
 * (Projects round 2, Q-15 · Share.dc.html) Share changes: the list of what changes for the client (what it was struck through, what it is),
 * an optional note, and beside them what the client will see once it is shared — the portal's drawing of the next copy. Nothing reaches the
 * client without this press; the copy it stores is what the portal reads. The first share sends the whole schedule.
 * (B-01) A client with no portal yet sees nothing until invited: the dialog says so and offers Invite (the Client access panel) first.
 * (B-18) With nothing new to share it says the client already sees this schedule, with Close alone.
 * (gaps build, package C — 7) Each change has its tick: the client gets the ticked ones, and keeps seeing the rest as they last saw them; the
 * preview draws exactly that. (8) While Settings › Projects › Schedule changes need approval is on, a Designer's or a Manager's press asks an
 * Owner or an Admin (Ask to share); an Owner or an Admin opening it with an ask waiting sees who asked, the ask's ticks and its note, and shares
 * it — or sends it back with a note.
 */
export function ShareDialog({ open, onClose, onShare, onInvite, client, studio, milestones, changes, last, sharedDay = null, today, portal, approval = 'now', ask = null, only = null, onSendBack }: {
  open: boolean
  onClose: () => void
  /** Resolves true once the share is stored — the dialog closes only then. `only` = the ticked changes (null = every one). */
  onShare: (note: string, only: string[] | null) => Promise<boolean>
  /** (B-01) Opens the Client access panel (Invite). */
  onInvite?: () => void
  client: string
  studio: string
  milestones: Milestone[]
  changes: ScheduleChange[]
  last: ScheduleSnapshot | null
  /** The day of the last share, when there was one. */
  sharedDay?: number | null
  today: number
  /** (B-01) Whether the client can open the portal (invited, not withdrawn). */
  portal: { live: boolean; withdrawn: boolean }
  /** (gaps build, package C — 8) 'ask' = this viewer's press asks an Owner or an Admin. */
  approval?: 'now' | 'ask'
  /** (8) The ask that waits, for an Owner or an Admin to answer here. */
  ask?: ShareAsk | null
  /** (7) The changes ticked when it opens (Share this change; an ask's own) — null = all. */
  only?: string[] | null
  /** (8) Sends the waiting ask back with a note. */
  onSendBack?: (note: string) => Promise<boolean>
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(changes.map((c) => c.id)))
  const [back, setBack] = useState<string | null>(null)
  const [backTried, setBackTried] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) {
    setWas(open)
    if (open) {
      const preset = only ?? ask?.milestoneIds ?? null
      setTicked(new Set(changes.filter((c) => !preset || preset.includes(c.id)).map((c) => c.id)))
      setNote(ask?.note ?? ''); setBack(null); setBackTried(false)
    }
  }
  const first = !last
  const n = changes.length
  const nothing = !first && n === 0
  const picked = changes.filter((c) => ticked.has(c.id))
  const partial = !first && picked.length < n
  /* the client's next copy — only the ticked changes on what they saw last (snapshotFor, the share's own rule) */
  const next = snapshotFor(milestones, last, first ? null : ticked)
  const ends = next.rows.map((r) => dayOfIso(r.end)).filter((x): x is number => x !== null)
  const handover = ends.length ? Math.max(...ends) : null
  const lastH = last?.handover ? dayOfIso(last.handover) : null
  const h = handoverOf(milestones.filter((m) => m.clientVisible))
  const news = { head: `Updated ${dayMonth(today)}${handover !== null ? (lastH !== null && lastH !== handover ? ` · Handover is now ${dayLabel(handover)}` : ` · Handover ${dayLabel(handover)}`) : ''}`, note: note.trim() || null }
  const share = async () => { setBusy(true); const ok = await onShare(note, first || !partial ? null : picked.map((c) => c.id)); setBusy(false); if (ok) { setNote(''); onClose() } }
  const sendBack = async () => {
    setBackTried(true)
    if (!back?.trim() || !onSendBack) return
    setBusy(true); const ok = await onSendBack(back.trim()); setBusy(false)
    if (ok) onClose()
  }
  /* (B-01) the honest line about who will see it */
  const noPortal = portal.live ? null : portal.withdrawn
    ? `${client}’s portal access is withdrawn — the schedule is kept for them, and they see it only if you give access again.`
    : `${client} has no portal yet — the schedule is kept for them, and they see it once you invite them.`
  if (nothing) {
    return (
      <Dialog open={open} onClose={onClose} title={`${client} already sees this schedule`} width={400} size="form"
              footer={<Button onPress={onClose} data-testid="share-close">Close</Button>}>
        <p className={styles.note} data-testid="share-nothing">{`Nothing has changed for ${client} since you shared it${sharedDay !== null ? ` on ${dayMonth(sharedDay)}` : ''}. When a date, a name or a status they see changes, Share changes lists it here.`}</p>
      </Dialog>
    )
  }
  const asking = approval === 'ask'
  const count = first ? 0 : picked.length
  const action = asking ? (first ? 'Ask to share the schedule' : `Ask to share ${plural(count, 'change')}`) : first ? 'Share the schedule' : partial ? `Share ${count} of ${plural(n, 'change')}` : `Share ${plural(n, 'change')}`
  return (
    <Dialog open={open} onClose={onClose} title={first ? `Share the schedule with ${client}` : `Share changes with ${client}`} width={800} size="modal" closeOnScrim={false}
            footer={back !== null ? <>
              <Button variant="secondary" appearance="outlined" onPress={() => setBack(null)}>Cancel</Button>
              <Button onPress={() => { void sendBack() }} isDisabled={busy} data-testid="share-send-back-go">Send back</Button>
            </> : <>
              {ask && onSendBack && !asking ? <FootStart><Button appearance="text" onPress={() => setBack('')} isDisabled={busy} data-testid="share-send-back">Send back</Button></FootStart> : null}
              <Button appearance="text" onPress={onClose}>Not now</Button>
              {noPortal && onInvite ? <Button variant="secondary" appearance="outlined" onPress={onInvite} data-testid="share-invite">{portal.withdrawn ? 'Invite to Portal' : `Invite ${client}`}</Button> : null}
              <Button onPress={() => { void share() }} isDisabled={busy || (!first && count === 0)} data-testid="share-confirm">{action}</Button>
            </>}>
      <div className={styles.share} data-testid="share-dialog">
        <div className={styles.shareCol}>
          {/* (8) the ask an Owner or an Admin answers here */}
          {ask && !asking ? <p className={styles.note} data-tone="decides" data-testid="share-ask">{`${ask.byName.split(' ')[0]} asked on ${dayMonth(dayOf(new Date(ask.at)))} to share ${plural(ask.milestoneIds.length, 'change')}${ask.note ? `: “${ask.note}”` : '.'}`}</p> : null}
          {asking ? <p className={styles.note} data-tone="decides" data-testid="share-asking">{`An Owner or an Admin shares it — your ${first ? 'schedule' : 'ticked changes'} and note go to them first, and ${client} sees nothing until they do.`}</p> : null}
          {noPortal ? <p className={styles.note} data-tone="decides" data-testid="share-no-portal">{noPortal}</p> : null}
          {back !== null ? (
            <TextField label="Why it isn’t shared yet" value={back} onChange={(v) => setBack(v.slice(0, 300))} maxLength={300} autoFocus required error={backTried && !back.trim() ? 'This field is required' : undefined}
                       helper={ask ? `${ask.byName.split(' ')[0]} reads this; ${client} sees nothing.` : undefined} />
          ) : null}
          <span className={styles.caption}>{first ? `What ${client} will get` : `What changes for ${client}`}</span>
          {first ? (
            <p className={styles.note}>{client} hasn’t seen the schedule yet — sharing sends the {plural(next.rows.length, 'milestone')} shown to them{h ? `, handover ${dayLabel(h.end)}` : ''}.</p>
          ) : (
            <ul className={styles.changes} data-testid="share-changes">
              {changes.map((c) => {
                const w = changeWords(c, h?.id ?? null)
                const on = ticked.has(c.id)
                return (
                  <li key={c.id} className={styles.change} data-tick="">
                    <Checkbox isSelected={on} onChange={() => setTicked((t) => { const x = new Set(t); if (x.has(c.id)) x.delete(c.id); else x.add(c.id); return x })} aria-label={`Share ${c.title}`} data-testid="share-tick" />
                    <span className={styles.changeText}>
                      <span className={styles.changeName}>{c.title}</span>
                      <span className={styles.changeWords}>{w.was ? <s>{w.was}</s> : null}{w.now}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {!first && partial ? <p className={styles.note} data-testid="share-held">{`${plural(n - count, 'change')} held back — ${client} keeps seeing ${n - count === 1 ? 'it' : 'them'} as shared before.`}</p> : null}
          <TextArea label={`A note for ${client} (optional)`} value={note} onChange={setNote} />
        </div>
        <div className={styles.shareColR}>
          <span className={styles.caption}>What {client} will see</span>
          <div className={styles.previewWell}><ClientSchedule studio={studio} rows={next.rows} news={news} paused={new Set(next.rows.filter((r) => isPausedStage(r, milestones.find((x) => x.id === r.id) ? { status: milestones.find((x) => x.id === r.id)!.status, deleted: false } : null)).map((r) => r.id))} /></div>
        </div>
      </div>
    </Dialog>
  )
}
