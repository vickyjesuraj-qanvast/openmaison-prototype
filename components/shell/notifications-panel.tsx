'use client'

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
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
import { eventDef, type FeedAct, type FeedRow } from '@/lib/notifications/model'
import { fetchFeedAction, markAllNotificationsRead, markNotificationRead } from '@/app/notifications/actions'
/* (simplify round 2 · P2 §6.7) the approvals' own server actions and note dialog — the bell answers with what the record answers with — (the
   calm UI build 2026-10-27 moved them to the Dashboard's Review pane; Vicky 2026-10-29: brought back in the row, the row's words still open the pane) */
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { dayLabel } from '@/lib/projects/schedule-model'
import { approveProjectUpdate, sendBackProjectUpdate } from '@/app/projects/updates-actions'
import { sendBackInvoice } from '@/app/projects/money-actions'
import { sendBackPo } from '@/app/finance/po-actions'
import { answerExpense, undoExpenseAnswer } from '@/app/finance/cost-actions'
import { answerMoreTime, approveMilestoneDone, reopenShareAsk, sendBackMilestoneDone, sendBackShareAsk, shareSchedule, undoMarkDone, undoMilestoneStatus, undoMoreTimeAnswer } from '@/app/projects/schedule-actions'
import { approveHandover, sendBackHandover, undoCompleteHandover } from '@/app/projects/ending-actions'
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

/* (simplify round 2) A Done's send-back and a more-time decline open the Schedule panel's own ask dialog — loaded only once the bell holds one */
const AskDialog = lazy(() => import('@/components/projects/schedule/milestone-panel').then((m) => ({ default: m.AskDialog })))
const first = (name: string | null | undefined, fallback: string) => (name ? name.trim().split(/\s+/)[0] ?? name : fallback)
const changes = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`
/** The Send back a row's record uses, in its words (each record's NoteDialog / AskDialog props, as the record passes them). */
function noteWords(a: FeedAct): { title: string; label: string; help: string; action: string; required: boolean } {
  const client = a.client ?? 'the client'
  switch (a.kind) {
    case 'update': return { title: 'Send back', label: 'Why does it go back?', help: `${a.by ?? 'Whoever wrote it'} reads this on the update; ${client} never sees it.`, action: 'Send back', required: true }
    case 'invoice': return { title: 'Send back', label: 'What should change?', help: `${a.by ?? 'Whoever submitted it'} reads this on the Money tab; ${client} never sees it.`, action: 'Send back', required: true }
    case 'handover': return { title: 'Send back', label: 'What does the handover still need?', help: 'Whoever asked reads this on the project; the client never sees it.', action: 'Send back', required: true }
    case 'share': return { title: 'Send back', label: 'Why it isn’t shared yet', help: `${first(a.by, 'Whoever asked')} reads this; ${client} sees nothing.`, action: 'Send back', required: true }
    default: return { title: 'Send back', label: 'What should change?', help: 'Whoever made it reads it.', action: 'Send back', required: true }   // a PO, an expense (money out's own words)
  }
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
  const [noting, setNoting] = useState<FeedRow | null>(null)   // (simplify round 2) the approval row whose Send back dialog is open
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
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape' && !noting) { e.stopPropagation(); close() } }   // (simplify round 2) a send-back dialog's Esc is its own
    let lastW = window.innerWidth
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; close() } }
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize) }
  }, [open, sheet, close, noting])
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
  /* ── (simplify round 2 · P2 §6.7) An approval waiting on this member answers in its row: Approve runs the record's own action — the same
     sentence and Undo the record gives, its refusal said — and Send back opens the record's own note dialog. An approval that sends something
     through a dialog the approver must see (a PO to its vendor, an invoice to the client) is "Approve and send", opening that send on Money
     (`&do=approve`), where WhatsApp opens on the press (REG-534). The row then reads again: answered, it is a plain link.
     (the calm UI build 2026-10-27, the audit's 1-03 · 1-20) The row's words open the Dashboard's Review pane on its record — (Vicky 2026-10-29:
     brought back) and its two buttons act in place again, as before. ── */
  const { run } = useRun()
  const [acting, setActing] = useState<string | null>(null)
  const reread = (r: FeedRow) => {
    const marked = r.readAt === null ? markNotificationRead(r.id).catch(() => undefined) : Promise.resolve()
    void marked.then(() => { void load(); router.refresh() })
  }
  const undoThen = (what: string, fn: () => Promise<unknown>, done: string) => () => { void run(what, fn, done, { refresh: true }).then(() => { void load() }) }
  const refused = (what: string, e: unknown, r: FeedRow) => snackbar({ message: couldnt(what, refusalOf(e)), ...(r.href ? { actionLabel: 'Open it', onAction: () => { setOpen(false); const href = r.href!; leaveThen(() => router.push(withFrom(href, pathname))) } } : {}) })
  const approve = async (r: FeedRow) => {
    const a = r.act
    if (!a || acting) return
    if (a.door) {
      const door = a.door
      setOpen(false)
      if (r.readAt === null) void markNotificationRead(r.id).catch(() => undefined)
      leaveThen(() => router.push(withFrom(door, pathname)))
      return
    }
    setActing(r.id)
    try {
      if (a.kind === 'update') {
        const x = await approveProjectUpdate(a.id)
        if ('error' in x) { refused('approve the update', x.error, r); return }
        snackbar({ message: `“${a.title}” approved` })
      } else if (a.kind === 'expense') {
        const x = await answerExpense(a.id, { approve: true })
        if ('error' in x) { refused('approve the expense', x.error, r); return }
        snackbar({ message: `“${a.title}” approved`, actionLabel: 'Undo', onAction: undoThen('undo it', () => undoExpenseAnswer(x.undo), 'It waits for approval again') })
      } else if (a.kind === 'done') {
        const x = await approveMilestoneDone(a.id)
        if ('error' in x) { refused(`approve ${a.title}`, x.error, r); return }
        snackbar({ key: 'schedule-status', message: x.sentence, actionLabel: 'Undo', onAction: undoThen('undo the approval', () => undoMarkDone(x.undo), 'The approval is undone') })
      } else if (a.kind === 'more_time') {
        /* the panel's own default: a draft update for the client with the new day (P2 §6.7) */
        const x = await answerMoreTime(a.id, { approve: true, note: '', draftUpdate: true })
        if ('error' in x) { refused('approve more time', x.error, r); return }
        snackbar({ key: 'schedule-move', message: x.sentence, actionLabel: 'Undo', onAction: undoThen('undo the answer', () => undoMoreTimeAnswer(x.undo), 'The ask waits again') })
      } else if (a.kind === 'share' && a.projectId) {
        /* exactly what was asked, with its note — an Owner's or an Admin's share answers the ask (as Share in the dialog does); it reaches the client, so no Undo */
        const x = await shareSchedule(a.projectId, { note: a.note ?? '', only: a.only?.length ? a.only : null })
        if ('error' in x) { refused('share the schedule', x.error, r); return }
        const client = a.client ?? 'the client'
        snackbar({ message: x.live ? `Shared ${changes(x.n)} with ${client}` : `Schedule kept for ${client} — they see it once you invite them` })
      } else if (a.kind === 'handover') {
        const x = await approveHandover(a.id, {})
        if ('error' in x) { refused('approve the handover', x.error, r); return }   // items still open with no reason: "Open it" goes to the review
        const undo = x.undo
        snackbar({ key: 'project-completed', message: `${a.title} is completed`, ...(undo ? { actionLabel: 'Undo', onAction: undoThen('undo the handover', () => undoCompleteHandover(undo), `${a.title} is in progress again`) } : {}) })
      } else return
      reread(r)
    } catch (e) { refused('approve it', e, r) } finally { setActing(null) }
  }
  /** Send back (a more-time ask: Decline), from the record's own dialog; true once it lands, so the dialog closes. */
  const sendBack = async (r: FeedRow, note: string): Promise<boolean> => {
    const a = r.act
    if (!a) return false
    try {
      let done: Parameters<typeof snackbar>[0] | null = null
      if (a.kind === 'update') { const x = await sendBackProjectUpdate(a.id, { note }); if ('error' in x) { refused('send the update back', x.error, r); return false } done = { message: `Sent back to ${a.by ?? 'its author'}` } }
      else if (a.kind === 'invoice') { const x = await sendBackInvoice(a.id, { note }); if ('error' in x) { refused('send the invoice back', x.error, r); return false } done = { message: `Sent back to ${a.by ?? 'whoever submitted it'}` } }
      else if (a.kind === 'po') { const x = await sendBackPo(a.id, { note }); if ('error' in x) { refused('send it back', x.error, r); return false } done = { message: `${a.title} sent back with your note` } }
      else if (a.kind === 'expense') {
        const x = await answerExpense(a.id, { approve: false, note }); if ('error' in x) { refused('send it back', x.error, r); return false }
        done = { message: `“${a.title}” sent back with your note`, actionLabel: 'Undo', onAction: undoThen('undo it', () => undoExpenseAnswer(x.undo), 'It waits for approval again') }
      } else if (a.kind === 'handover') { const x = await sendBackHandover(a.id, { note }); if ('error' in x) { refused('send the handover back', x.error, r); return false } done = { message: 'Handover sent back' } }
      else if (a.kind === 'share') {
        const x = await sendBackShareAsk(a.id, { note }); if ('error' in x) { refused('send the changes back', x.error, r); return false }
        done = { message: `Sent back to ${first(a.by, 'whoever asked')} with your note`, actionLabel: 'Undo', onAction: undoThen('undo', () => reopenShareAsk(x.undo), 'The ask waits again') }
      } else if (a.kind === 'done') {
        const x = await sendBackMilestoneDone(a.id, { note }); if ('error' in x) { refused(`send ${a.title} back`, x.error, r); return false }
        done = { message: x.sentence, actionLabel: 'Undo', onAction: undoThen('undo the send-back', () => undoMilestoneStatus(x.undo), 'It waits for approval again') }
      } else if (a.kind === 'more_time') {
        const x = await answerMoreTime(a.id, { approve: false, note, draftUpdate: false }); if ('error' in x) { refused('decline more time', x.error, r); return false }
        done = { key: 'schedule-move', message: x.sentence, actionLabel: 'Undo', onAction: undoThen('undo the answer', () => undoMoreTimeAnswer(x.undo), 'The ask waits again') }
      }
      if (done) snackbar(done)
      reread(r)
      return true
    } catch (e) { refused('send it back', e, r); return false }
  }
  const [noteBusy, setNoteBusy] = useState(false)
  const submitNote = (note: string) => {
    const r = noting
    if (!r || noteBusy) return
    setNoteBusy(true)
    void sendBack(r, note).then((ok) => { if (ok) setNoting(null) }).finally(() => setNoteBusy(false))
  }
  const asksSchedule = rows?.some((r) => r.act?.kind === 'done' || r.act?.kind === 'more_time') ?? false
  /* (the calm UI build 2026-10-27 — the audit's 1-03) the row's words open the Dashboard's Review pane on its record (`/dashboard?review=<record>`) */
  const toReview = (r: FeedRow, a: FeedAct) => {
    setOpen(false)
    if (r.readAt === null) {
      setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, readAt: Date.now() } : x)) ?? rs)
      void markNotificationRead(r.id).catch(() => undefined)
    }
    const href = withFrom(`${DASHBOARD}?${new URLSearchParams({ review: reviewKeyOf(a) })}`, pathname)
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
    if (r.act) { toReview(r, r.act); return }   // (the calm UI build 2026-10-27, 1-03) an approval's words open the Dashboard's Review pane
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
                            <span className={styles.meta}>{also ? <Tooltip label={also}><span className={styles.when}>{when}</span></Tooltip> : when}{alsoSaid ? <span className="visually-hidden">{` · ${alsoSaid}`}</span> : null}</span>   {/* (pending modules S18) its email waits for the member's summary — said in the tooltip */}
                          </span>
                          {r.readAt === null && !r.derived ? <span className={styles.dot} aria-label="Unread" /> : null}
                        </button>
                        {/* (simplify round 2 · P2 §6.7) an approval waiting on you: answered here, phone and desk alike; the words above open the Dashboard's
                            Review pane (the calm UI build) — (Vicky 2026-10-29: brought back) */}
                        {r.act ? (
                          <div className={styles.acts} data-testid="notification-acts" data-act={r.act.kind}>
                            <Button appearance="text" onPress={() => { void approve(r) }} isDisabled={acting === r.id} data-testid="notification-approve">{r.act.door ? 'Approve and send' : 'Approve'}</Button>
                            <Button appearance="text" variant="secondary" onPress={() => setNoting(r)} isDisabled={acting === r.id} data-testid="notification-send-back">{r.act.kind === 'more_time' ? 'Decline' : 'Send back'}</Button>
                          </div>
                        ) : null}
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

  /* (simplify round 2) the records' own Send back dialogs, over the bell (its popover steps under their scrim while one is open) */
  const noteAct = noting?.act ?? null
  const words = noteAct && noteAct.kind !== 'done' && noteAct.kind !== 'more_time' ? noteWords(noteAct) : null
  const dialogs = (
    <>
      <NoteDialog open={!!words} title={words?.title ?? 'Send back'} label={words?.label ?? ''} help={words?.help ?? ''} action={words?.action ?? 'Send back'} required maxLength={300} busy={noteBusy}
                  onClose={() => setNoting(null)} onSubmit={submitNote} />
      {asksSchedule ? (
        <Suspense fallback={null}>
          <AskDialog open={noteAct?.kind === 'done'} title={`Send ${noteAct?.title ?? 'it'} back?`} action="Send back" testId="send-back-dialog" onClose={() => setNoting(null)}
                     lede="It stays as it is, not done. Whoever marked it done reads your note." note={{ label: 'What is still to do', required: true, max: 300 }}
                     onSubmit={async (v) => (noting ? sendBack(noting, v.note) : false)} />
          <AskDialog open={noteAct?.kind === 'more_time'} title={`Decline more time on ${noteAct?.title ?? 'it'}?`} action="Decline" testId="decline-more-dialog" onClose={() => setNoting(null)}
                     lede={noteAct?.kind === 'more_time' ? `It keeps ending ${noteAct.end !== undefined ? dayLabel(noteAct.end) : 'as it is'}. ${first(noteAct.by, 'Whoever asked')} reads your note.` : ''}
                     note={{ label: 'A note (optional)', required: false, max: 300 }}
                     onSubmit={async (v) => (noting ? sendBack(noting, v.note) : false)} />
        </Suspense>
      ) : null}
    </>
  )
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
                        variants={anchoredSurface} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', zIndex: noting ? 105 : 130, transformOrigin: 'top left' }}>
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
