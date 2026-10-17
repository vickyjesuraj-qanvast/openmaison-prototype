'use client'

import { useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ds'
import pageStyles from '@/app/leads/leads.module.css'
import { Card } from '@/components/leads/detail/card'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { Tabs } from '@/components/om/tabs'
import { PageHeader } from '@/components/shell/page-header'
import { PageReveal } from '@/components/shell/page-reveal'
import { setStudioMessagesPaused, setStudioPortalOff } from '@/app/qanvast-ops/studios/actions'
import { useMaisonAi } from '@/lib/maison-ai'
import { shortDay } from '@/lib/portal/model'
import type { PlatformSettings } from '@/lib/platform'
import type { PlatformStudioRow } from '@/lib/platform-studios'
import { QANVAST_STUDIOS_HREF, QANVAST_TAB_ITEMS, onQanvastTabsClick } from './qanvast-tabs'
import { QanvastStudiosGhost } from './qanvast-studios-ghost'
import leadsStyles from './qanvast-leads.module.css'
import styles from './qanvast-studios.module.css'

/* Maison AI suggestions: the operator's questions about a studio (invented copy, parity map 2026-10-10) */
/* (pending modules S10 — card held:maison-ai) each is asked and answered from the records — the portal's visits, the tickets (lib/maison-ai/answers/clients.ts) */
const AI = ['Which studios’ clients use the portal most?', 'Has anyone reported an issue this week?']

/**
 * (parity map, CP-148 · CP-149 · UC-082's operator pause) Qanvast Ops › Studios — OpenMaison's side of a studio, one card per studio (the
 * prototype runs one): its two switches as the house card table of switches (Notifications' event table, REG-727; DS sm switches, REG-460) —
 * **Client portal** (Off closes every portal page with "This page is closed for now — contact {studio}"; the studio reads "Closed by
 * OpenMaison" and can't open it again) and **Messages** (off = Pause the studio's messages: the delivery layer holds every email and WhatsApp
 * message) — and what its clients did on the portal in the last 30 days, as house number tiles (1.0's leaderboard and studio health, CP-149).
 * Turning one off asks first and answers with Undo; turning one back on is one press. A switch the server refuses goes back, and says why.
 */
export function QanvastStudios({ studios }: { studios: PlatformStudioRow[] }) {
  const comingSoon = useComingSoon()
  useMaisonAi(AI)
  return (
    <PageReveal skeleton={<QanvastStudiosGhost />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeader title="Qanvast Ops" scrollShadow={false} />
        {/* the Leads page's own strip (REG-368: the wrapper exists only to intercept the inert tabs' clicks) */}
        <div className={leadsStyles.tabsHost} onClickCapture={(e: MouseEvent<HTMLDivElement>) => onQanvastTabsClick(e, comingSoon)}>
          <Tabs items={QANVAST_TAB_ITEMS} activeHref={QANVAST_STUDIOS_HREF} aria-label="Qanvast Ops sections" className={leadsStyles.stickyTabs} />
        </div>
        <div className={pageStyles.content}>
          <div className={styles.list} data-testid="qanvast-studios">
            {studios.map((s) => <StudioCard key={s.id} studio={s} />)}
          </div>
        </div>
      </div>
    </PageReveal>
  )
}

type Ask = 'portal' | 'messages'

function StudioCard({ studio }: { studio: PlatformStudioRow }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [shown, setShown] = useState<PlatformSettings>(studio.platform)
  const [was, setWas] = useState(studio.platform)
  if (was !== studio.platform) { setWas(studio.platform); setShown(studio.platform) }
  const [asking, setAsking] = useState<Ask | null>(null)
  const [busy, setBusy] = useState(false)
  const name = studio.name

  /** One switch's write: the value shown at once, put back (and said) when the server refuses; a "stop" offers Undo, and the Undo says what it
      did (the house rule, fix-G G-20). */
  const flip = async (what: Ask, stop: boolean): Promise<boolean> => {
    const key = what === 'portal' ? 'portalOff' : 'messagesPaused'
    setShown((p) => ({ ...p, [key]: stop }))
    setBusy(true)
    try {
      const r = what === 'portal' ? await setStudioPortalOff(studio.id, stop) : await setStudioMessagesPaused(studio.id, stop)
      if ('error' in r) {
        setShown((p) => ({ ...p, [key]: !stop }))
        snackbar({ message: couldnt(what === 'portal' ? (stop ? `close ${name}’s portal` : `open ${name}’s portal`) : (stop ? `pause ${name}’s messages` : `send ${name}’s messages again`), refusalOf(r.error)) })
        return false
      }
      setShown(r)
      snackbar(stop
        ? { message: what === 'portal' ? `${name}’s portal is closed — clients see a notice` : `${name}’s messages are paused — each one waits until you send again`, actionLabel: 'Undo', onAction: () => { void flip(what, false) } }
        : { message: what === 'portal' ? `${name}’s portal is open again` : `${name}’s messages are sending again` })
      router.refresh()
      return true
    } catch {
      setShown((p) => ({ ...p, [key]: !stop }))
      snackbar({ message: what === 'portal' ? `Couldn’t ${stop ? 'close' : 'open'} ${name}’s portal — please try again` : `Couldn’t ${stop ? 'pause' : 'send'} ${name}’s messages — please try again` })
      return false
    } finally { setBusy(false) }
  }
  /* a stop asks first (it reaches every client); going back on is one press */
  const press = (what: Ask, on: boolean) => { if (on) void flip(what, false); else setAsking(what) }

  const portalLine = shown.portalOff
    ? `Closed ${shown.portalOffAt ? shortDay(shown.portalOffAt) : ''}${shown.portalOffBy ? ` by ${shown.portalOffBy}` : ''} — every portal page says it is closed for now, and ${name} can’t open it again`.replace(/\s+—/, ' —')
    : `Open — clients sign in at ${studio.address}${studio.studioPaused ? `. ${name} has paused it themselves — clients see their notice` : ''}`
  const messagesLine = shown.messagesPaused
    ? `Paused ${shown.messagesPausedAt ? shortDay(shown.messagesPausedAt) : ''}${shown.messagesPausedBy ? ` by ${shown.messagesPausedBy}` : ''} — every email and WhatsApp message waits until you send again`.replace(/\s+—/, ' —')
    : 'Sending — the studio’s emails and WhatsApp messages leave as they happen'
  const u = studio.usage
  return (
    <Card title={name} metaRight={studio.address} testId="qanvast-studio">
      <div className={styles.body}>
        <div className={styles.table} role="table" aria-label={`OpenMaison’s switches for ${name}`} data-card-table="">
          <div className={styles.head} role="row"><span role="columnheader">OpenMaison’s switches</span><span role="columnheader" className={styles.col}>On</span></div>
          <div className={styles.row} role="row" data-on={!shown.portalOff || undefined} data-testid="qanvast-studio-portal">
            <span role="cell" className={styles.name}><span>Client portal</span><span className={styles.line} data-testid="qanvast-studio-portal-line">{portalLine}</span></span>
            <span role="cell" className={styles.col}>
              <Switch size="sm" isSelected={!shown.portalOff} isDisabled={busy} onChange={(on: boolean) => press('portal', on)} aria-label={`${name}’s client portal — open`} />
            </span>
          </div>
          <div className={styles.row} role="row" data-on={!shown.messagesPaused || undefined} data-testid="qanvast-studio-messages">
            <span role="cell" className={styles.name}><span>Messages</span><span className={styles.line} data-testid="qanvast-studio-messages-line">{messagesLine}</span></span>
            <span role="cell" className={styles.col}>
              <Switch size="sm" isSelected={!shown.messagesPaused} isDisabled={busy} onChange={(on: boolean) => press('messages', on)} aria-label={`${name}’s messages — sending`} />
            </span>
          </div>
        </div>
        {/* (parity map, FB-112 — P-D's ask) the studio asked OpenMaison to match its bank transfers: told here, only while the ask stands */}
        {studio.bankFeedAsk ? (
          <p className={styles.ask} role="note" data-testid="qanvast-studio-bank-feed">
            {`${name} asked on ${shortDay(studio.bankFeedAsk.at)}${studio.bankFeedAsk.by ? ` (${studio.bankFeedAsk.by})` : ''} to have bank transfers matched automatically — nothing is connected yet.`}
          </p>
        ) : null}
        <div className={styles.usage}>
          <h3 className={styles.usageHead}>{`On the portal · last 30 days, since ${shortDay(studio.since)}`}</h3>
          <StatTiles testId="qanvast-studio-usage">
            <StatTile label="Portal sign-ins" value={u.signIns} help="Clients and their household" testId="qanvast-usage-signins" />
            <StatTile label="Issues reported" value={u.issues} help="Raised by clients" testId="qanvast-usage-issues" />
            <StatTile label="Messages" value={u.messages} help="From clients to the studio" testId="qanvast-usage-messages" />
            <StatTile label="Choices made" value={u.choices} help="Picked on their page" testId="qanvast-usage-choices" />
          </StatTiles>
        </div>
      </div>
      <ConfirmDialog open={asking === 'portal'} tone="primary" title={`Close ${name}’s portal?`} confirmLabel="Close the portal"
                     message={`Every client page closes with “This page is closed for now — contact ${name}”, and nothing a client presses goes through. ${name} sees “Closed by OpenMaison” and can’t open it again — only you can. Links for a quote, a signature, designs or a file keep working.`}
                     onConfirm={() => { void flip('portal', true).then((ok) => { if (ok) setAsking(null) }) }} onCancel={() => setAsking(null)} />
      <ConfirmDialog open={asking === 'messages'} tone="primary" title={`Pause ${name}’s messages?`} confirmLabel="Pause messages"
                     message={`Every email and WhatsApp message ${name} sends — to clients and to the team — waits until you send again. The bell inside OpenMaison keeps ringing.`}
                     onConfirm={() => { void flip('messages', true).then((ok) => { if (ok) setAsking(null) }) }} onCancel={() => setAsking(null)} />
    </Card>
  )
}
