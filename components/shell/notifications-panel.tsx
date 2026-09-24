'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { ago } from '@/lib/templates/ago'
import { eventDef, type FeedRow } from '@/lib/notifications/model'
import { fetchFeedAction, markAllNotificationsRead, markNotificationRead } from '@/app/notifications/actions'
import styles from './notifications-panel.module.css'

/** The rail's bell and the phone bar's bell both raise this; the panel lives once in the shell. */
export const OPEN_NOTIFICATIONS = 'om:notifications:open'
export const openNotifications = () => window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATIONS))

const CHANNEL_WORD: Record<string, string> = { email: 'email', whatsapp: 'WhatsApp' }

/**
 * (REG-604) The bell's feed: a drawer from the right (a bottom sheet on a phone, the Drawer's own rule) listing what happened —
 * stored rows (a lead arrived, one was assigned, a quote needs approval, a client confirmed or signed) and the follow-ups due
 * now (a New lead untouched past the delay, an overdue task), newest first. A row opens its record and is marked read; "also by
 * WhatsApp" says which channels the rules sent it on. Mark all as read clears the badge.
 */
export function NotificationsPanel() {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<FeedRow[] | null>(null)
  const [now, setNow] = useState(0)
  const load = useCallback(async () => {
    try { const r = await fetchFeedAction(); setRows(r.rows); setNow(Date.now()) }
    catch { snackbar({ message: 'Couldn’t load notifications — please try again' }) }
  }, [snackbar])
  useEffect(() => {
    const onOpen = () => { setOpen(true); void load() }
    window.addEventListener(OPEN_NOTIFICATIONS, onOpen)
    return () => window.removeEventListener(OPEN_NOTIFICATIONS, onOpen)
  }, [load])
  const unread = rows?.filter((r) => r.readAt === null).length ?? 0
  const openRow = (r: FeedRow) => {
    setOpen(false)
    if (!r.derived && r.readAt === null) { setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, readAt: Date.now() } : x)) ?? rs); void markNotificationRead(r.id).then(() => router.refresh()) }
    if (r.href) router.push(r.href)
  }
  const readAll = () => {
    setRows((rs) => rs?.map((x) => (x.derived ? x : { ...x, readAt: x.readAt ?? Date.now() })) ?? rs)
    void markAllNotificationsRead().then(() => { router.refresh(); snackbar({ message: 'All caught up' }) })
  }
  return (
    <Drawer open={open} onClose={() => setOpen(false)} title="Notifications" label="Notifications" width={400}
            actions={unread > 0 && rows?.some((r) => !r.derived && r.readAt === null) ? (
              <Tooltip label="Mark all as read"><button type="button" className={styles.readAll} aria-label="Mark all as read" onClick={readAll}><Icon name="check_circle" size={24} weight={300} /></button></Tooltip>
            ) : undefined}>
      <div className={styles.body} data-testid="notifications-panel">
        {rows === null ? (
          <p className={styles.empty}>Loading…</p>
        ) : rows.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyGlyph}><Icon name="notifications" size={40} weight={300} /></span>
            <span className={styles.emptyTitle}>Nothing to catch up on</span>
            <span className={styles.emptyHelp}>New leads, assignments, stage changes, tasks, approvals, confirmations, signatures and the follow-ups due land here.</span>
          </div>
        ) : (
          <ul className={styles.list}>
            {rows.map((r) => {
              const def = eventDef(r.kind)
              const sent = r.channels.filter((c) => c !== 'in_app').map((c) => CHANNEL_WORD[c] ?? c)
              return (
                <li key={r.id} className={styles.row} data-unread={r.readAt === null || undefined} data-derived={r.derived || undefined} data-testid="notification-row">
                  <button type="button" className={styles.rowBtn} onClick={() => openRow(r)}>
                    <span className={styles.glyph} data-kind={r.kind}><Icon name={def?.icon ?? 'notifications'} size={20} weight={300} /></span>
                    <span className={styles.text}>
                      <span className={styles.title}>{r.title}</span>
                      {r.body ? <span className={styles.sub}>{r.body}</span> : null}
                      <span className={styles.meta}>{r.derived ? 'Due' : ago(r.at, now || r.at)}{sent.length ? ` · also by ${sent.join(' and ')}` : ''}</span>
                    </span>
                    {r.readAt === null ? <span className={styles.dot} aria-label="Unread" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className={styles.foot}>
        <Button appearance="text" onPress={() => { setOpen(false); router.push('/settings?section=notifications') }}>Notification settings</Button>
      </div>
    </Drawer>
  )
}
