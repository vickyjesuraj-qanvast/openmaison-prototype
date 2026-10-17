'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { Drawer } from '@/components/om/drawer'
import { SurfaceHead } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useSheetLayout } from '@/components/om/sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { anchoredSurface } from '@/lib/motion'
import { ago } from '@/lib/templates/ago'
import { markAllBellRead, markBellRead, readPortalBell } from '@/app/portal/bell-actions'
import type { BellRow } from '@/lib/portal/notifications-model'
import { SIGNED_OUT, loginPath, portalPath } from '@/lib/portal/model'
import styles from './bell.module.css'
import portal from './portal.module.css'

/**
 * (Projects round 9 — Q-41; I-104…I-114) The client's bell on the portal's bar — the studio's bell (components/shell/notifications-panel.tsx)
 * on the portal's frame: its rows, its unread dot, its Mark all as read, its empty state; at a desk a popover under the bell, on a phone the
 * house bottom sheet. The rows come from what reaches the client — the schedule shared, an update, a stage to confirm, a choice, an invoice
 * sent / due / overdue, a payment — each opening where it is done, read for this person once opened. Read when the page shows (every tab is
 * its own page, so each press reads it fresh). In a studio's preview it reads as the client has it and marks nothing.
 */
/** (fix-F, F-15) A page tells the bell it has just read something the bell names (an update seen): the bell reads its rows again. */
export const BELL_REFRESH = 'om:portal-bell-refresh'
const noSubscribe = () => () => {}

export function PortalBell({ slug, preview, studio, brand }: { slug: string; preview: boolean; studio: string; /** the studio's colour, for the sheet portalled out of the page's root */ brand?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const sheet = useSheetLayout()
  const [rows, setRows] = useState<BellRow[] | null>(null)
  /** (fix-F, F-47) why the last read was refused — the rows go with it (a withdrawn or ended session must not keep showing them) */
  const [failed, setFailed] = useState<string | false>(false)
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(0)
  const button = useRef<HTMLSpanElement | null>(null)
  const panel = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const r = await readPortalBell(slug)
      if ('error' in r) { setRows(null); setFailed(r.error); return }
      setRows(r.rows); setNow(Date.now())
    } catch { setFailed('') }
  }, [slug])
  /* the first read when the page shows — its answer lands in a callback (never a set in the effect's body); (fix-F, F-15) and again when the
     page reads something the bell names (an update seen on the page reads its row) */
  useEffect(() => {
    let live = true
    const read = () => readPortalBell(slug).then((r) => { if (!live) return; if ('error' in r) { setRows(null); setFailed(r.error) } else { setFailed(false); setRows(r.rows); setNow(Date.now()) } }, () => { if (live) setFailed('') })
    void read()
    window.addEventListener(BELL_REFRESH, read)
    return () => { live = false; window.removeEventListener(BELL_REFRESH, read) }
  }, [slug])

  const close = useCallback(() => setOpen(false), [])
  const place = useCallback((el: HTMLDivElement | null) => {
    panel.current = el
    if (!el) return
    const b = button.current?.getBoundingClientRect()
    const h = Math.min(560, window.innerHeight - 16 - (b ? b.bottom + 8 : 72))
    el.style.top = `${b ? b.bottom + 8 : 72}px`
    el.style.right = `${Math.max(16, b ? window.innerWidth - b.right : 16)}px`
    el.style.maxHeight = `${Math.max(240, h)}px`
  }, [])
  useEffect(() => {
    if (!open || sheet) return
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (panel.current?.contains(t) || button.current?.contains(t) || (t instanceof Element && t.closest('[data-om-snackbar]'))) return; close() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', close) }
  }, [open, sheet, close])

  /* (fix-F) the portalled surfaces come after hydration — a portal with content while the page hydrates read as a mismatch (React #418) */
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false)
  const unread = rows?.filter((r) => !r.read).length ?? 0
  const brandVars = (brand ? { '--brand': brand } : undefined) as CSSProperties | undefined
  const toggle = () => { if (open) { setOpen(false); return } setOpen(true); void load() }
  const openRow = (r: BellRow) => {
    setOpen(false)
    /* read for this person — put back if the server refuses; a preview marks nothing (the client's bell stays theirs) */
    if (!r.read && !preview) {
      setRows((rs) => rs?.map((x) => (x.key === r.key ? { ...x, read: true } : x)) ?? rs)
      void markBellRead(slug, { keys: [r.key] }).then((m) => { if ('error' in m) setRows((rs) => rs?.map((x) => (x.key === r.key ? { ...x, read: false } : x)) ?? rs) },
        () => setRows((rs) => rs?.map((x) => (x.key === r.key ? { ...x, read: false } : x)) ?? rs))
    }
    router.push(preview && r.previewHref !== undefined ? r.previewHref ?? portalPath(slug) : r.href)   // (gaps build D, item 3) a document opens as the studio's own read in a preview
  }
  const readAll = () => {
    if (preview) { snackbar({ message: 'This is a preview — nothing here is marked as read for the client' }); return }
    const prev = rows
    setRows((rs) => rs?.map((x) => ({ ...x, read: true })) ?? rs)
    void markAllBellRead(slug).then(
      (m) => { if ('error' in m) { setRows(prev); snackbar({ message: `Couldn’t mark them as read — ${m.error.charAt(0).toLowerCase()}${m.error.slice(1)}` }) } else snackbar({ message: 'All caught up' }) },
      () => { setRows(prev); snackbar({ message: 'Couldn’t mark them as read — please try again' }) })
  }

  const actions = unread > 0 ? (
    <Tooltip label="Mark all as read"><IconButton icon="check_circle" label="Mark all as read" size={36} variant="bare" iconSize={24} iconWeight={300} onClick={readAll} data-testid="portal-bell-read-all" /></Tooltip>
  ) : undefined
  const content = (
    <div className={styles.body} data-testid="portal-bell-panel">
      {rows === null ? (
        failed === SIGNED_OUT ? <p className={styles.empty} role="status" data-testid="portal-bell-signed-out">You’re signed out — <button type="button" className={styles.retry} onClick={() => router.replace(loginPath(slug, `${window.location.pathname}${window.location.search}`))}>sign in again</button></p>
          : failed !== false ? <p className={styles.empty} role="status">{failed ? `Couldn’t load the notifications — ${failed.charAt(0).toLowerCase()}${failed.slice(1)}. ` : 'Couldn’t load the notifications — '}<button type="button" className={styles.retry} onClick={() => { void load() }}>try again</button></p>
          : <p className={styles.empty}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyGlyph}><Icon name="notifications" size={40} weight={300} /></span>
          <span className={styles.emptyTitle}>Nothing to catch up on</span>
          <span className={styles.emptyHelp}>{`When ${studio} shares your schedule, posts an update or sends something for you, it shows here.`}</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.key} className={styles.row} data-unread={!r.read || undefined} data-testid="portal-bell-row" data-kind={r.kind}>
              <button type="button" className={styles.rowBtn} onClick={() => openRow(r)}>
                <span className={styles.glyph} data-kind={r.kind}><Icon name={r.icon} size={20} weight={300} /></span>
                <span className={styles.text}>
                  <span className={styles.title}>{r.title}</span>
                  {r.body ? <span className={styles.sub}>{r.body}</span> : null}
                  <span className={styles.meta}>{ago(r.at, now || r.at)}</span>
                </span>
                {!r.read ? <span className={styles.dot} aria-label="Unread" /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <>
      <span ref={button} className={styles.bellWrap}>
        <button type="button" className={styles.bell} aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'} aria-haspopup="dialog" aria-expanded={open}
                onClick={toggle} data-testid="portal-bell" data-unread={unread || undefined}>
          <Icon name="notifications" size={24} weight={300} fill={open} />
          {unread ? <span className={styles.badge} aria-hidden data-testid="portal-bell-count">{unread}</span> : null}
        </button>
      </span>
      {sheet ? (
        /* (fix-F, F-01) through a portal to the page's body, as the desk popover: rendered in the sticky bar, the sheet and its scrim sat
           under the phone bar (the bar's own stacking context held them) and its last row could not be pressed */
        !mounted ? null : createPortal(<div className={portal.brandScope} style={brandVars}><Drawer open={open} onClose={close} title="Notifications" label="Notifications" actions={actions}>{content}</Drawer></div>, document.body)
      ) : !mounted ? null : createPortal(
        <div className={portal.brandScope} style={brandVars}><AnimatePresence>
          {open ? (
            <motion.div ref={place} className={styles.panel} role="dialog" aria-label="Notifications" data-om-menu
                        variants={anchoredSurface} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', zIndex: 130, transformOrigin: 'top right' }}>
              <SurfaceHead title="Notifications" actions={actions} onClose={close} />
              <div className={styles.scroll}>{content}</div>
            </motion.div>
          ) : null}
        </AnimatePresence></div>,
        document.body,
      )}
    </>
  )
}
