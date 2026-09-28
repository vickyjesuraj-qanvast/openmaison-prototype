'use client'

import { useCallback, useEffect, useState } from 'react'
import { openShortcuts } from '@/lib/keys/store'
import { usePathname, useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
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
  const pathname = usePathname()   // (REG-645) Settings' Back returns to the page the bell was opened on
  const snackbar = useSnackbar()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<FeedRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [now, setNow] = useState(0)
  /* (sweep S4 #10) a failed first load says so with a retry — never "Loading…" for ever; a failed refresh keeps what was shown and says so */
  const load = useCallback(async () => {
    setFailed(false)
    try { const r = await fetchFeedAction(); setRows(r.rows); setNow(Date.now()) }
    catch { setFailed(true); snackbar({ message: 'Couldn’t load the notifications — please try again' }) }
  }, [snackbar])
  useEffect(() => {
    const onOpen = () => { setOpen(true); void load() }
    window.addEventListener(OPEN_NOTIFICATIONS, onOpen)
    return () => window.removeEventListener(OPEN_NOTIFICATIONS, onOpen)
  }, [load])
  const unread = rows?.filter((r) => r.readAt === null).length ?? 0
  const openRow = (r: FeedRow) => {
    setOpen(false)
    if (!r.derived && r.readAt === null) {
      setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, readAt: Date.now() } : x)) ?? rs)
      void markNotificationRead(r.id).then(() => router.refresh(), () => setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, readAt: null } : x)) ?? rs))   // (sweep S4 #10) a refused mark stays unread
    }
    if (r.href === '#shortcuts') { setOpen(false); openShortcuts(); return }   // (REG-715) the keyboard's arrival note opens the ? panel here
    if (r.href) router.push(r.href)
  }
  /* (sweep S4 #8) Mark all as read reads the notices; a follow-up that is due is work, not a notice — it stays until the work is done, and the
     snackbar says so instead of "All caught up" beside it. A due row wears "Due", never the unread dot it could not lose. */
  const readAll = () => {
    const prev = rows
    const due = rows?.filter((x) => x.derived).length ?? 0
    setRows((rs) => rs?.map((x) => (x.derived ? x : { ...x, readAt: x.readAt ?? Date.now() })) ?? rs)
    void markAllNotificationsRead().then(
      () => { router.refresh(); snackbar({ message: due ? `All read — ${due} ${due === 1 ? 'follow-up is' : 'follow-ups are'} due and ${due === 1 ? 'stays' : 'stay'} until done` : 'All caught up' }) },
      () => { setRows(prev); snackbar({ message: 'Couldn’t mark the notifications as read — please try again' }) })
  }
  return (
    /* (F109) Notification settings sits in the Drawer's own footer, below the scrolling list — it was drawn over the rows of a long feed */
    <Drawer open={open} onClose={() => setOpen(false)} title="Notifications" label="Notifications" width={400}
            footer={<div className={styles.foot}><Button appearance="text" onPress={() => { setOpen(false); router.push(withFrom('/settings?section=notifications', pathname)) }}>Notification settings</Button></div>}
            actions={unread > 0 && rows?.some((r) => !r.derived && r.readAt === null) ? (
              <Tooltip label="Mark all as read"><IconButton icon="check_circle" label="Mark all as read" size={36} variant="bare" iconSize={24} iconWeight={300} onClick={readAll} /></Tooltip>
            ) : undefined}>
      <div className={styles.body} data-testid="notifications-panel">
        {rows === null ? (
          failed ? <p className={styles.empty} role="status">Couldn’t load the notifications — <button type="button" className={styles.retry} onClick={() => { void load() }}>try again</button></p>
            : <p className={styles.empty}>Loading…</p>
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
                    <span className={styles.glyph} data-kind={r.kind}><Icon name={def?.icon ?? ((r.kind as string) === 'shortcuts_ready' ? 'keyboard' : 'notifications')} size={20} weight={300} /></span>
                    <span className={styles.text}>
                      <span className={styles.title}>{r.title}</span>
                      {r.body ? <span className={styles.sub}>{r.body}</span> : null}
                      <span className={styles.meta}>{r.derived ? 'Due' : ago(r.at, now || r.at)}{sent.length ? ` · also by ${sent.join(' and ')}` : ''}</span>
                    </span>
                    {r.readAt === null && !r.derived ? <span className={styles.dot} aria-label="Unread" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Drawer>
  )
}
