'use client'

import { useCallback, useEffect, useRef, useTransition, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { anchoredSurface } from '@/lib/motion'
import type { SessionMember } from '@/lib/db/session'
import { viewAs } from '@/app/view-as-actions'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { useMenuKeyboard } from '@/components/om/surface'
import menuStyles from '@/components/leads/menus.module.css'
import panel from '@/components/company/company-popover.module.css'
import styles from './view-as-popover.module.css'

/** "Designer · reports to James" — the second line of a member's row. */
export const memberLine = (m: SessionMember): string => (m.reportsTo ? `${m.role} · reports to ${m.reportsTo}` : m.role)

/**
 * Demo Studio › View as (REG-667, user-directed 2026-09-25 for the UAT; no mock — on the Company panel's chrome, REG-484): the
 * studio's active members with their roles; picking one makes the whole prototype that member (app/view-as-actions.ts). The
 * snackbar offers the way back. ≤767 it is a bottom sheet, opened from More.
 */
export function ViewAsPopover({ open, anchor, onClose, team }: { open: boolean; anchor: RefObject<HTMLElement | null> | null; onClose: () => void; team: SessionMember[] }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const sheet = useSheetLayout()
  const [, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = useRef(anchor); useEffect(() => { anchorRef.current = anchor })
  useMenuKeyboard(open && !sheet, menuRef, onClose)

  /* Beside the rail, bottom-aligned with the Demo Studio block (it sits at the rail's foot). */
  const place = useCallback((el: HTMLDivElement | null) => {
    menuRef.current = el
    const a = anchorRef.current?.current
    if (!el || !a) return
    const r = a.getBoundingClientRect()
    const EDGE = 8
    const rail = a.closest('nav') ?? a
    el.style.left = `${rail.getBoundingClientRect().right + 8}px`
    el.style.top = `${Math.max(EDGE, Math.min(r.bottom, window.innerHeight - EDGE) - el.offsetHeight)}px`
    el.style.transformOrigin = 'bottom left'
  }, [])

  useEffect(() => {
    if (!open || sheet) return
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (anchor?.current?.contains(t) || menuRef.current?.contains(t)) return; onClose() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }
    let lastW = window.innerWidth
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; onClose() } }
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize) }
  }, [open, onClose, anchor, sheet])

  const current = team.find((m) => m.isYou) ?? null
  const become = (m: SessionMember, back: SessionMember | null) => startTransition(async () => {
    const r = await viewAs(m.id)
    if (r.error) { snackbar({ message: r.error }); return }
    router.refresh()
    snackbar({
      message: `Viewing as ${m.name} · ${m.role}`,
      ...(back ? { actionLabel: `Back to ${back.name}`, onAction: () => become(back, null) } : {}),
    })
  })
  const pick = (m: SessionMember) => { onClose(); if (!m.isYou) become(m, current) }

  const list = (
    <div className={panel.group} role="group" aria-label="Members">
      {team.map((m) => (
        <button key={m.id} type="button" role="menuitemradio" aria-checked={m.isYou} className={panel.row} data-on={m.isYou || undefined} onClick={() => pick(m)}>
          <Avatar name={m.name} color={m.color} size={36} tooltip={false} />
          <span className={panel.text}>
            <span className={panel.label}>{m.name}</span>
            <span className={panel.help}>{memberLine(m)}</span>
          </span>
          {m.isYou ? <Icon name="check" size={20} weight={300} /> : null}
        </button>
      ))}
    </div>
  )
  const head = (
    <>
      <p className={styles.help}>See the prototype as another member of the studio — the leads they see and what they may do.</p>
    </>
  )
  if (typeof document === 'undefined') return null
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title="View as" label="View as" role="menu">
        <div className={panel.sheetBody}>{head}{list}</div>
      </Sheet>
    )
  }
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div ref={place} className={`${menuStyles.menu} ${panel.popover}`} role="menu" aria-label="View as" data-om-menu
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', zIndex: 130 }}>
          <span className={styles.titleRow}>
            <span className={panel.title}>View as</span>
            <span className={panel.soon}>Demo only</span>
          </span>
          {head}
          {list}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
