'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { HelpLink } from '@/components/company/help-link'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { MessageAsSent } from '@/app/settings/sent-messages'
import { sendMySummaryNow, setMyEmailMode, setMyMute } from '@/app/notifications/personal-actions'
import { EMAIL_MODES, EMAIL_MODE_HELP, MUTE_DIALOG, NOTICES_CARD, NOTICE_AREAS, NO_EMAIL_LINE, mutedLine, nextSummaryWords, summaryCounts, summaryLine, summaryWent, type EmailMode } from '@/lib/notifications/personal'
import { displayDateTime } from '@/lib/format'
import type { EventKey } from '@/lib/notifications/model'
import type { YourNotices } from '@/lib/company/your-profile'
import profile from '@/components/company/profile-view.module.css'
import styles from './your-profile.module.css'

type Summary = NonNullable<YourNotices['lastSummary']>

/**
 * (pending modules S18 — card held:notifications; Leads Q-42 · Q-43 opened as recommended, her "build all of them" 2026-10-11) **Your
 * notifications** on Your profile — the member's own choices, their one home (the bell's Notification settings opens it; ⌘K finds it):
 *  · Emails — As they happen · A daily summary (1.0's digest mode, made the member's own): the summary's last one with Read it, and Send one
 *    now for the demo (the 8 AM one is the platform's — lib/notifications/summary-server.ts).
 *  · Muted — what they switched off for themselves, in one sentence; *Choose what reaches you* opens the list of the notices that can reach
 *    them, by area, a switch each (live — each switch saves as it moves, the house Done; a refused save puts the switch back).
 * The studio's rules stay Settings › Notifications' (its help line links there).
 */
export function YourNotifications({ data, hasEmail }: { data: YourNotices; hasEmail: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [seed, setSeed] = useState(data)
  const [mode, setMode] = useState<EmailMode>(data.email)
  const [muted, setMuted] = useState<EventKey[]>(data.muted)
  const [last, setLast] = useState<Summary | null>(data.lastSummary)
  /* the page's records after a save or a View as: the card starts from them again (render-phase adjust) */
  if (data !== seed) { setSeed(data); setMode(data.email); setMuted(data.muted); setLast(data.lastSummary) }
  const [now] = useState(() => Date.now())
  const [choosing, setChoosing] = useState(false)
  const [reading, setReading] = useState(false)
  const [sending, setSending] = useState(false)
  const [moving, setMoving] = useState<string | null>(null)
  const labelOf = (k: EventKey) => data.events.find((e) => e.key === k)?.label ?? k
  const mutedShown = data.events.filter((e) => muted.includes(e.key)).map((e) => e.label)

  const pickMode = async (v: string) => {
    const next = v === 'daily' ? 'daily' : 'each'
    if (next === mode) return
    const was = mode
    setMode(next)   // at once — put back when the server refuses
    try {
      const r = await setMyEmailMode(next)
      if ('error' in r) { setMode(was); snackbar({ message: couldnt('change how your emails come', refusalOf(r.error)) }); return }
      snackbar({ message: next === 'daily' ? `Your emails come as one summary — the first goes ${nextSummaryWords(Date.now())}` : 'Your emails come as they happen again' })
      router.refresh()
    } catch { setMode(was); snackbar({ message: couldnt('change how your emails come') }) }
  }
  const toggle = async (k: EventKey, reaches: boolean) => {
    const was = muted
    setMuted(reaches ? muted.filter((x) => x !== k) : [...muted, k]); setMoving(k)
    try {
      const r = await setMyMute({ event: k, muted: !reaches })
      if ('error' in r) { setMuted(was); snackbar({ message: couldnt(reaches ? 'unmute it' : 'mute it', refusalOf(r.error)) }); return }
      setMuted(r.muted)
      snackbar({ key: 'notice-mute', message: reaches ? `${labelOf(k)} — reaches you again` : `Muted for you: ${labelOf(k)}` })
    } catch { setMuted(was); snackbar({ message: couldnt(reaches ? 'unmute it' : 'mute it') }) }
    finally { setMoving(null) }
  }
  const sendNow = async () => {
    setSending(true)
    try {
      const r = await sendMySummaryNow()
      if ('error' in r) { snackbar({ message: couldnt('send your summary', refusalOf(r.error)) }); return }
      if (r.status === 'nothing') { snackbar({ message: 'Nothing to sum up — no new notices and nothing due' }); return }
      if (r.summary) setLast(r.summary)
      const to = r.summary?.toAddress
      snackbar({ message: r.status === 'held' ? 'Your summary waits — OpenMaison has paused the studio’s messages' : r.status === 'no_address' ? 'Your summary has no email to go to' : `Your summary went${to ? ` to ${to}` : ''} — ${summaryCounts(r.summary?.subject)}`,
        ...(r.summary ? { actionLabel: 'Read it', onAction: () => setReading(true) } : {}) })
      router.refresh()
    } catch { snackbar({ message: couldnt('send your summary') }) }
    finally { setSending(false) }
  }

  const lastLine = summaryLine(last, now)
  return (
    <section id="notifications" className={profile.card} aria-labelledby="you-notices" data-testid="profile-notifications">
      <div className={profile.cardHead}>
        <h2 id="you-notices" className={profile.cardTitle}>{NOTICES_CARD.title}</h2>
        {data.studioRules
          ? <p className={profile.cardHelp}>What reaches you, and how. Which notices go out at all is the studio’s choice, in <HelpLink href="/settings?section=notifications" testId="notices-studio-link">Settings › Notifications</HelpLink>.</p>
          : <p className={profile.cardHelp}>{NOTICES_CARD.helpBooks}</p>}
      </div>
      <div className={styles.noticeBlock} data-testid="notices-email">
        <h3 className={styles.noticeHead}>{NOTICES_CARD.emails}</h3>
        <Chips label="How your emails come" options={EMAIL_MODES.map((o) => ({ ...o, disabled: o.value === 'daily' && !hasEmail && mode !== 'daily' }))} value={mode} onChange={(v) => { void pickMode(v) }} testId="notices-email-mode" />
        <p className={profile.cardHelp} data-testid="notices-email-help">{EMAIL_MODE_HELP[mode]}</p>
        {!hasEmail ? <p className={profile.cardHelp} data-testid="notices-no-email">{NO_EMAIL_LINE}</p> : null}
        {mode === 'daily' && hasEmail ? (
          <span className={styles.summaryLine}>
            <span className={styles.summaryText} data-testid="notices-last-summary">{lastLine}</span>
            <span className={styles.summaryActions}>
              {last ? <Button appearance="text" iconStart={<Icon name="mail" size={20} />} onPress={() => setReading(true)} data-testid="notices-read-summary">Read it</Button> : null}
              <Button appearance="text" iconStart={<Icon name="send" size={20} />} isDisabled={sending} onPress={() => { void sendNow() }} data-testid="notices-send-now">{sending ? 'Sending…' : 'Send one now'}</Button>
            </span>
          </span>
        ) : null}
      </div>
      <div className={styles.noticeBlock} data-testid="notices-muted">
        <h3 className={styles.noticeHead}>{NOTICES_CARD.muted}</h3>
        <p className={styles.mutedLine} data-testid="notices-muted-line">{mutedLine(mutedShown)}</p>
        <span className={styles.chooseWrap}><Button appearance="text" iconStart={<Icon name="tune" size={20} />} onPress={() => setChoosing(true)} data-testid="notices-choose">{NOTICES_CARD.choose}</Button></span>
      </div>

      <Dialog open={choosing} onClose={() => setChoosing(false)} title={MUTE_DIALOG.title} subtitle={MUTE_DIALOG.subtitle} size="modal" width={600} height="xl"
              footer={<Button onPress={() => setChoosing(false)} data-testid="notices-done">Done</Button>}>
        <div className={styles.muteList} data-testid="notices-list">
          {NOTICE_AREAS.map((a) => {
            const list = data.events.filter((e) => e.area === a.key)
            if (!list.length) return null
            return (
              <section key={a.key} className={styles.muteArea} aria-labelledby={`notices-area-${a.key}`} data-testid={`notices-area-${a.key}`}>
                <h3 id={`notices-area-${a.key}`} className={styles.muteAreaHead}>{a.label}</h3>
                {list.map((e) => {
                  const reaches = !e.studioOff && !muted.includes(e.key)
                  return (
                    <label key={e.key} className={styles.muteRow} data-testid={`notice-${e.key}`} data-off={e.studioOff || undefined}>
                      <Icon name={e.icon} size={20} weight={300} className={styles.muteIcon} />
                      <span className={styles.muteText}>
                        <span className={styles.muteLabel}>{e.label}</span>
                        <span className={profile.cardHelp}>{e.studioOff ? MUTE_DIALOG.studioOff : e.help}</span>
                      </span>
                      <Switch size="sm" isSelected={reaches} isDisabled={e.studioOff || moving === e.key} onChange={(on: boolean) => { void toggle(e.key, on) }} aria-label={`${e.label} — reaches you`} />
                    </label>
                  )
                })}
              </section>
            )
          })}
        </div>
      </Dialog>

      <Dialog open={reading && !!last} onClose={() => setReading(false)} title="Your summary" size="modal" width={600}
              subtitle={last ? `${summaryWent(last) ?? 'Sent'} · ${displayDateTime(new Date(last.at))}` : undefined}>
        {last ? <MessageAsSent m={last} /> : null}
      </Dialog>
    </section>
  )
}
