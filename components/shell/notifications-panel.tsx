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
import { dueLine } from '@/lib/notifications/due-line'
import { eventDef, type FeedRow } from '@/lib/notifications/model'
import { fetchFeedAction, markAllNotificationsRead, markNotificationRead } from '@/app/notifications/actions'
/* (the calm UI build 2026-10-27 — the audit's 1-03 · 1-20: one home for approvals) an approval waiting on you is answered on the Dashboard's
   Review pane — the bell's row opens it there (`/dashboard?review=<record>`); the record's own actions and dialogs answer, as before */
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { relativeTime } from '@/lib/format'
import { DASHBOARD } from '@/lib/dashboard/model'
import { reviewKeyOf } from '@/lib/dashboard/inbox'
import styles from './notifications-panel.module.css'
import { answerUpgradeOffer, undoPutAway } from '@/app/credits/nudge-actions'   // (pending modules S41b-4) the Free plan's upgrade offer, answered in its row
import { openPlans, openTopUp } from '@/components/credits/credits-client'
import { leaveThen } from '@/components/company/leave-guard'   // (UX audit S2) unsaved Company / Settings edits ask before the move

/** The rail's bell and the phone bar's bell both raise this; the panel lives once in the shell. */
export const OPEN_NOTIFICATIONS = 'om:notifications:open'
export const openNotifications = () => window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATIONS))

const CHANNEL_WORD: Record<string, string> = { email: 'email', whatsapp: 'WhatsApp' }

/* (the calm UI build 2026-10-27) an approval's ⋮: Review and its way back, each opening the Dashboard's Review pane on that record — a Send back
   there opens the record's own note dialog (`&back=1`) */
function ApprovalMenu({ label, back, onReview, onBack }: { label: string; back: string; onReview: () => void; onBack: () => void }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <span ref={anchor} className={styles.actMore}>
      <Tooltip label="More" disabled={open}>
        <IconButton icon="more_vert" label={`More for ${label}`} variant="bare" size={36} iconSize={20} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={label}>
        <span className={styles.menuRow} data-testid="notification-approve"><DropdownItem onSelect={() => { setOpen(false); onReview() }}>Review on the Dashboard</DropdownItem></span>
        <span className={styles.menuRow} data-testid="notification-send-back"><DropdownItem onSelect={() => { setOpen(false); onBack() }}>{back}</DropdownItem></span>
      </PortalMenu>
    </span>
  )
}

/* (pending modules S18) the due line is pure now — the daily summary writes the same words the bell draws (lib/notifications/due-line.ts) */
export { dueLine }

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
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (panel.current?.contains(t) || (t instanceof Element && t.closest('[data-notifications-tile], [data-om-snackbar], [role="dialog"], [data-om-menu]'))) return; close() }   // (the calm UI build) an approval's ⋮ is the bell's own
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
  /* (Dane UAT 11.06) Work that is late leads: while any Due row is overdue — its red "late" part showing (`late` below) — Due comes first; otherwise
     the Updates the badge counts. The two groups and the badge stay REG-810's. */
  const late = (r: FeedRow) => r.kind !== 'task_due_soon' && r.kind !== 'invoice_ready' && (now || r.at) - r.at >= 60_000
  /* (pending modules S18 — card held:notifications, one-home N-14: the bell's "Updates" shared its word with a project's Updates tab — the
     client's site updates; as recommended, his "build all of them" 2026-10-11) the notices are headed Notices — the word every line of this
     file already uses for them; Due stays */
  /* (the calm UI build 2026-10-27 — the audit's 1-20, T-04 · T-14) the bell is for what happened: the notices lead, with no head of their own;
     what is due — Your day's and Tasks' own rows — folds under one line at the end ("Due · 14 · Show"), its late part said on that line */
  const [dueOpen, setDueOpen] = useState(false)
  const dueLate = due.filter(late).length
  const groups = [{ key: 'notices', label: 'Notifications', list: notices }, { key: 'due', label: 'Due', list: due }]
  /* ── (simplify round 2 · P2 §6.7; the calm UI build 2026-10-27 — the audit's 1-03 · 1-20) An approval waiting on this member opens the
     Dashboard's Review pane on its record — the row's press, and its ⋮'s Review; Send back (Decline for more time) opens it on the record's own
     note dialog. The pane answers with the record's own action, sentence and Undo, as the bell's row did. ── */
  const reviewHref = (r: FeedRow, back = false) => {
    const a = r.act!
    const q = new URLSearchParams({ review: reviewKeyOf(a), ...(back ? { back: '1' } : {}) })
    return withFrom(`${DASHBOARD}?${q}`, pathname)
  }
  const toReview = (r: FeedRow, back = false) => {
    setOpen(false)
    if (r.readAt === null) {
      setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, readAt: Date.now() } : x)) ?? rs)
      void markNotificationRead(r.id).catch(() => undefined)
    }
    const href = reviewHref(r, back)
    leaveThen(() => router.push(href))
  }
  /* (pending modules S41b-4 — 1.0's plg nudge dialog, in the bell) The Owner's upgrade offer answers in its row: its one way on (See plans, or
     Buy AI credits for "Only n left") opens at once over the page and the offer leaves the bell; Not now puts it away — one sentence, Undo —
     and it never comes back for that moment. A refused answer puts the row back and says what failed. */
  const answerOffer = (r: FeedRow, answer: 'plans' | 'topup' | 'not_now') => {
    const prev = rows
    setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? rs)
    if (answer !== 'not_now') { setOpen(false); if (answer === 'topup') openTopUp(); else openPlans() }
    void answerUpgradeOffer({ id: r.id, answer }).then((x) => {
      if ('error' in x) { setRows(prev); snackbar({ message: couldnt(answer === 'not_now' ? 'put the offer away' : 'answer the offer', refusalOf(x.error)) }); return }
      router.refresh()
      if (x.sentence) snackbar({ key: 'upgrade-offer', message: x.sentence, actionLabel: 'Undo', onAction: () => {
        void undoPutAway({ id: r.id, read: r.readAt !== null }).then((u) => {
          if ('error' in u) { snackbar({ message: couldnt('bring the offer back', refusalOf(u.error)) }); return }
          void load(); router.refresh()
        }, (e) => snackbar({ message: couldnt('bring the offer back', refusalOf(e)) }))
      } })
    }, (e) => { setRows(prev); snackbar({ message: couldnt('answer the offer', refusalOf(e)) }) })
  }
  const openRow = (r: FeedRow) => {
    if (r.offer) { answerOffer(r, r.offer.primary); return }   // (pending modules S41b-4) the offer's words press its one way on
    if (r.act) { toReview(r); return }   // (the calm UI build 2026-10-27, 1-03) an approval opens on the Dashboard's Review pane
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
  /* (pending modules S18) Notification settings opens what the member can change for themselves — Your profile › Your notifications (mute a
     notice, a daily summary); its line links on to the studio's rules in Settings › Notifications */
  const footer = <div className={styles.foot}><Button appearance="text" onPress={() => { setOpen(false); leaveThen(() => router.push(`${withFrom('/profile', pathname)}#notifications`)) }} data-testid="notifications-settings-link">Your notification settings</Button></div>
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
            {groups.filter((g) => g.list.length).map((g) => (
              <section key={g.key} className={styles.group} aria-label={g.label} data-testid={`notifications-${g.key}`}>
                {g.key === 'due' && notices.length ? (
                  <button type="button" className={styles.dueFold} aria-expanded={dueOpen} onClick={() => setDueOpen((o) => !o)} data-testid="notifications-due-fold">
                    <span className={styles.dueFoldWords}>{`Due · ${g.list.length}`}{dueLate ? <span className={styles.due} data-late=""> · {dueLate} late</span> : null}</span>
                    <span className={styles.dueFoldLink}>{dueOpen ? 'Hide' : 'Show'}</span>
                  </button>
                ) : null}
                {g.key === 'due' && notices.length && !dueOpen ? null : <ul className={styles.list}>
                  {g.list.map((r) => {
                    const def = eventDef(r.kind)
                    const sent = r.channels.filter((c) => c !== 'in_app').map((c) => CHANNEL_WORD[c] ?? c)
                    /* (the calm UI build 2026-10-27 — the audit's 1-20) the channels it also went by are its time's tooltip, not the row's words */
                    const also = [sent.length ? `Also by ${sent.join(' and ')}` : null, r.summary ? 'In your daily summary' : null].filter(Boolean).join(' · ')
                    /* …and said to a screen reader in the row's own words (a tooltip is never its only home) */
                    const alsoSaid = [sent.length ? `also by ${sent.join(' and ')}` : null, r.summary ? 'in your daily summary' : null].filter(Boolean).join(' · ')
                    const when = r.derived ? <span className={styles.due} data-late={late(r) || undefined}>{dueLine(r, now || r.at)}</span> : relativeTime(new Date(r.at), new Date(now || r.at))
                    return (
                      <li key={r.id} className={styles.row} data-unread={(r.readAt === null && !r.derived) || undefined} data-derived={r.derived || undefined} data-testid="notification-row">
                        <button type="button" className={styles.rowBtn} onClick={() => openRow(r)}>
                          <span className={styles.glyph} data-kind={r.kind}><Icon name={def?.icon ?? ((r.kind as string) === 'shortcuts_ready' ? 'keyboard' : 'notifications')} size={20} weight={300} /></span>
                          <span className={styles.text}>
                            <span className={styles.title}>{r.title}</span>
                            {r.body ? <span className={styles.sub}>{r.body}</span> : null}
                            <span className={styles.meta}>{also ? <Tooltip label={also}><span className={styles.when}>{when}</span></Tooltip> : when}{alsoSaid ? <span className="visually-hidden">{` · ${alsoSaid}`}</span> : null}{r.act ? <span data-testid="notification-acts" data-act={r.act.kind}> · Waiting for your approval</span> : null}</span>   {/* (pending modules S18) its email waits for the member's summary — said in the tooltip */}
                          </span>
                          {r.readAt === null && !r.derived ? <span className={styles.dot} aria-label="Unread" /> : null}
                        </button>
                        {/* (the calm UI build 2026-10-27 — the audit's 1-03) an approval waiting on you: the row opens the Dashboard's Review pane; its ⋮ holds
                            Review and the way back, both there */}
                        {r.act ? <ApprovalMenu label={r.title} back={r.act.kind === 'more_time' ? 'Decline' : 'Send back'} onReview={() => toReview(r)} onBack={() => toReview(r, true)} /> : null}
                        {/* (pending modules S41b-4) the Free plan's upgrade offer: its one way on, and Not now */}
                        {r.offer ? (
                          <div className={styles.acts} data-testid="notification-offer" data-trigger={r.offer.trigger}>
                            <Button appearance="text" onPress={() => answerOffer(r, r.offer!.primary)} data-testid="offer-go">{r.offer.label}</Button>
                            <Button appearance="text" variant="secondary" onPress={() => answerOffer(r, 'not_now')} data-testid="offer-not-now">Not now</Button>
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>}
              </section>
            ))}
          </>
        )}
      </div>
  )

  const dialogs = null
  /* (F109) Notification settings sits in the surface's own footer, below the scrolling list — it was drawn over the rows of a long feed */
  if (sheet) {
    return (
      <>
        <Drawer open={open} onClose={close} title="Notifications" label="Notifications" footer={footer} actions={actions}>
          {content}
        </Drawer>
        {dialogs}
      </>
    )
  }
  if (typeof document === 'undefined') return null
  return (
    <>
      {createPortal(
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
      )}
      {dialogs}
    </>
  )
}
