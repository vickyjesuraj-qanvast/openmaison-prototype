'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { usePathname, useRouter } from 'next/navigation'
import { anchoredSurface } from '@/lib/motion'
import { COMPANY_GROUPS, type CompanySection } from '@/lib/company/sections'
import { Icon } from '@/components/om/icon'
import { useComingSoon } from '@/components/om/snackbar'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { useMenuKeyboard } from '@/components/om/surface'
import menuStyles from '@/components/leads/menus.module.css'
import styles from './company-popover.module.css'

/**
 * Company (REG-484; owner 2026-09-17: "the navigation is in the sidebar only"): the rail's item opens the Tools panel's
 * shell (REG-422) with the company's sections in two groups; Profile and Templates are pages, the rest answer coming
 * soon. The section you are on is marked. ≤767 (REG-353) it is a bottom sheet titled Company.
 */
export function CompanyPopover({ open, anchor, onClose, awaiting = 0 }: { open: boolean; anchor: RefObject<HTMLElement | null> | null; onClose: () => void; /** (REG-501) templates awaiting approval — on the Templates row */ awaiting?: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const comingSoon = useComingSoon()
  const sheet = useSheetLayout()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = useRef(anchor); useEffect(() => { anchorRef.current = anchor })
  useMenuKeyboard(open && !sheet, menuRef, onClose)

  const place = useCallback((el: HTMLDivElement | null) => {
    menuRef.current = el
    const a = anchorRef.current?.current
    if (!el || !a) return
    const r = a.getBoundingClientRect()
    const EDGE = 8
    const rail = a.closest('nav') ?? a
    el.style.left = `${rail.getBoundingClientRect().right + 8}px`
    const h = el.offsetHeight
    const top = r.top + h > window.innerHeight - EDGE ? Math.max(EDGE, r.bottom - h) : r.top
    el.style.top = `${top}px`
    el.style.transformOrigin = top < r.top ? 'bottom left' : 'top left'
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

  const isOn = (s: CompanySection) => !!s.href && (s.key === 'templates' ? pathname.startsWith('/company/templates') : pathname === s.href || pathname.startsWith(`${s.href}/`))
  const pick = (s: CompanySection) => { onClose(); if (s.href) router.push(s.href); else comingSoon() }
  const list = (
    <div className={styles.groups}>
      {COMPANY_GROUPS.map((g) => (
        <div key={g.title} className={styles.group} role="group" aria-label={g.title}>
          <span className={styles.eyebrow}>{g.title}</span>
          {g.items.map((s) => (
            <button key={s.key} type="button" role="menuitem" className={styles.row} data-on={isOn(s) || undefined} aria-current={isOn(s) ? 'page' : undefined} onClick={() => pick(s)}>
              <span className={styles.glyph}><Icon name={s.icon} size={20} weight={300} fill={isOn(s)} /></span>
              <span className={styles.text}>
                <span className={styles.label}>{s.label}</span>
                <span className={styles.help}>{s.help}</span>
              </span>
              {s.key === 'templates' && awaiting > 0 ? <span className={styles.await}>{awaiting} awaiting</span> : null}
              {s.href ? null : <span className={styles.soon}>Soon</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
  if (typeof document === 'undefined') return null
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title="Company" label="Company" role="menu">
        <div className={styles.sheetBody}>{list}</div>
      </Sheet>
    )
  }
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div ref={place} className={`${menuStyles.menu} ${styles.popover}`} role="menu" aria-label="Company" data-om-menu
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', zIndex: 130 }}>
          <span className={styles.title}>Company</span>
          {list}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
