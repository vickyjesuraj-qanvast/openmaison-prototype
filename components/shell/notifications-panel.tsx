'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { anchoredSurface } from '@/lib/motion'
import { openShortcuts } from '@/lib/keys/store'
import { usePathname, useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { SurfaceFoot, SurfaceHead } from '@/components/om/dialog'
import { useSheetLayout } from '@/components/om/sheet'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { ago } from '@/lib/templates/ago'
import { displayDayShortMonth } from '@/lib/format'
import { eventDef, type FeedRow } from '@/lib/notifications/model'
import { fetchFeedAction, markAllNotificationsRead, markNotificationRead } from '@/app/notifications/actions'
import styles from './notifications-panel.module.css'
import { leaveThen } from '@/components/company/leave-guard'   // (UX audit S2) unsaved Company / Settings edits ask before the move

/** The rail's bell and the phone bar's bell both raise this; the panel lives once in the shell. */
export const OPEN_NOTIFICATIONS = 'om:notifications:open'
export const openNotifications = () => window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATIONS))

const CHANNEL_WORD: Record<string, string> = { email: 'email', whatsapp: 'WhatsApp' }

/** (UX audit V8) A follow-up's due line — "Due 28 Sep · 2 days late", "Due today · 3 h late", "Due in 12 min" — so an overdue row says how late
    it is, never a bare "Due". `at` is when it came due (a due-soon row: 30 minutes before it does). */
export function dueLine(r: Pick<FeedRow, 'kind' | 'at'>, now: number): string {
  if (r.kind === 'task_due_soon') { const m = Math.max(1, Math.round((r.at + 30 * 60_000 - now) / 60_000)); return `Due in ${m} min` }
  const due = new Date(r.at), today = new Date(now)
  const day = due.toDateString() === today.toDateString() ? 'today' : displayDayShortMonth(due)
  const late = now - r.at
  if (late < 60_000) return `Due ${day}`
  const days = Math.floor(late / 86_400_000), hours = Math.floor(late / 3_600_000), mins = Math.floor(late / 60_000)
  return `Due ${day} · ${days >= 1 ? `${days} ${days === 1 ? 'day' : 'days'}` : hours >= 1 ? `${hours} h` : `${mins} min`} late`
}

/**
 * (REG-604) The bell's feed: a drawer from the right (a bottom sheet on a phone, the Drawer's own rule) listing what happened —
 * stored rows (a lead arrived, one was assigned, a quote needs approval, a client confirmed or signed) and the follow-ups due
 * now (a New lead untouched past the delay, an overdue task), newest first. A row opens its record and is marked read; "also by
 * WhatsApp" says which channels the rules sent it on. Mark all as read clears the badge.
 * (REG-731, owner 2026-09-29) Beside the rail, level with the bell, as Search and Company open — never across the screen; a phone
 * keeps the Drawer's bottom sheet. Closed by a press outside it, Esc, a new page or a change of width.
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
    const onOpen = () => { if (open) setOpen(false); else { setOpen(true); void load() } }   // (REG-731) the bell toggles, as the Search tile does
    window.addEventListener(OPEN_NOTIFICATIONS, onOpen)
    return () => window.removeEventListener(OPEN_NOTIFICATIONS, onOpen)
  }, [load, open])
  const sheet = useSheetLayout()
  const panel = useRef<HTMLDivElement | null>(null)
  const close = useCallback(() => setOpen(false), [])
  const [shownFor, setShownFor] = useState(pathname)
  if (shownFor !== pathname) { setShownFor(pathname); if (open) setOpen(false) }
  const place = useCallback((el: HTMLDivElement | null) => {
    panel.current = el
    if (!el) return
    const bell = document.querySelector<HTMLElement>('[data-notifications-tile]')
    const rail = bell?.closest('nav')
    const h = Math.min(640, window.innerHeight - 16)
    const left = rail ? rail.getBoundingClientRect().right + 8 : Math.max(16, (window.innerWidth - el.offsetWidth) / 2)
    const top = Math.min(Math.max(8, bell ? bell.getBoundingClientRect().top : 72), window.innerHeight - h - 8)
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.height = `${h}px`
  }, [])
  useEffect(() => {
    if (!open || sheet) return
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (panel.current?.contains(t) || (t instanceof Element && t.closest('[data-notifications-tile], [data-om-snackbar], [role="dialog"]'))) return; close() }
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    let lastW = window.innerWidth
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; close() } }
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize) }
  }, [open, sheet, close])
  /* (UX audit V8) what counts as unread is a notice nobody has opened — a follow-up that is due is work, listed apart ("Due") and never in the count */
  const unread = rows?.filter((r) => r.readAt === null && !r.derived).length ?? 0
  const due = rows?.filter((r) => r.derived) ?? []
  const notices = rows?.filter((r) => !r.derived) ?? []
  const openRow = (r: FeedRow) => {
    setOpen(false)
    if (!r.derived && r.readAt === null) {
      setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, readAt: Date.now() } : x)) ?? rs)
      void markNotificationRead(r.id).then(() => router.refresh(), () => setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, readAt: null } : x)) ?? rs))   // (sweep S4 #10) a refused mark stays unread
    }
    if (r.href === '#shortcuts') { setOpen(false); openShortcuts(); return }   // (REG-715) the keyboard's arrival note opens the ? panel here
    const href = r.href; if (href) leaveThen(() => router.push(href))
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
  const footer = <div className={styles.foot}><Button appearance="text" onPress={() => { setOpen(false); leaveThen(() => router.push(withFrom('/settings?section=notifications', pathname))) }}>Notification settings</Button></div>
  const actions = unread > 0 ? (
    <Tooltip label="Mark all as read"><IconButton icon="check_circle" label="Mark all as read" size={36} variant="bare" iconSize={24} iconWeight={300} onClick={readAll} /></Tooltip>
  ) : undefined
  const content = (
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
          /* (UX audit V8) two groups: the notices (what the badge counts) and what is due (work that stays until it's done, out of the count), each newest first */
          <>
            {[{ key: 'notices', label: 'Updates', list: notices }, { key: 'due', label: 'Due', list: due }].filter((g) => g.list.length).map((g) => (
              <section key={g.key} className={styles.group} aria-label={g.label} data-testid={`notifications-${g.key}`}>
                {due.length && notices.length ? <h3 className={styles.groupHead} data-menu-label="">{g.label}<span className={styles.groupCount}>{g.list.length}</span></h3> : null}
                <ul className={styles.list}>
                  {g.list.map((r) => {
                    const def = eventDef(r.kind)
                    const sent = r.channels.filter((c) => c !== 'in_app').map((c) => CHANNEL_WORD[c] ?? c)
                    return (
                      <li key={r.id} className={styles.row} data-unread={(r.readAt === null && !r.derived) || undefined} data-derived={r.derived || undefined} data-testid="notification-row">
                        <button type="button" className={styles.rowBtn} onClick={() => openRow(r)}>
                          <span className={styles.glyph} data-kind={r.kind}><Icon name={def?.icon ?? ((r.kind as string) === 'shortcuts_ready' ? 'keyboard' : 'notifications')} size={20} weight={300} /></span>
                          <span className={styles.text}>
                            <span className={styles.title}>{r.title}</span>
                            {r.body ? <span className={styles.sub}>{r.body}</span> : null}
                            <span className={styles.meta}>{r.derived ? <span className={styles.due} data-late={(r.kind !== 'task_due_soon' && (now || r.at) - r.at >= 60_000) || undefined}>{dueLine(r, now || r.at)}</span> : ago(r.at, now || r.at)}{sent.length ? ` · also by ${sent.join(' and ')}` : ''}</span>
                          </span>
                          {r.readAt === null && !r.derived ? <span className={styles.dot} aria-label="Unread" /> : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
  )
  /* (F109) Notification settings sits in the surface's own footer, below the scrolling list — it was drawn over the rows of a long feed */
  if (sheet) {
    return (
      <Drawer open={open} onClose={close} title="Notifications" label="Notifications" width={400} footer={footer} actions={actions}>
        {content}
      </Drawer>
    )
  }
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div ref={place} className={styles.panel} role="dialog" aria-label="Notifications" data-om-menu
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', zIndex: 130, transformOrigin: 'top left' }}>
          <SurfaceHead title="Notifications" actions={actions} onClose={close} />
          <div className={styles.scroll}>{content}</div>
          <SurfaceFoot>{footer}</SurfaceFoot>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
