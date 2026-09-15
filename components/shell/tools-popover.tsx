'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { anchoredSurface } from '@/lib/motion'
import { Icon } from '@/components/om/icon'
import { useComingSoon } from '@/components/om/snackbar'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { useMenuKeyboard } from '@/components/om/surface'
import menuStyles from '@/components/leads/menus.module.css'
import styles from './tools-popover.module.css'

/** The 1.0 tools in their order (owner 2026-09-11); the first is the way into Quotes and is labelled so (REG-413). */
export const TOOLS: { key: string; icon: string; label: string; href?: string }[] = [
  { key: 'quotes', icon: 'request_quote', label: 'Quotes', href: '/quotes' },
  { key: 'visualizer', icon: 'wand_shine', label: 'AI Visualizer' },
  { key: 'isometric', icon: 'view_in_ar', label: 'Floorplan to 3D Isometric' },
  { key: 'insights', icon: 'trending_up', label: 'Market Insights' },
  { key: 'compliance', icon: 'verified_user', label: 'Compliance Navigator' },
  { key: 'planner', icon: 'space_dashboard', label: '3-D Space Planner' },
  { key: 'copilot', icon: 'analytics', label: 'Meeting Copilot' },
]

/**
 * Tools (the rail's item; design reference "Create Quote Reference" §Tools, approved 2026-09-11 — REG-422): the quick-links
 * tile grid inside the anchored-menu chrome, 8px to the right of the rail and aligned to the item's top, bottom-aligned
 * when it would run past the viewport. "TOOLS" eyebrow, 92×96 tiles three across (the Create strip's tile). Quotes opens
 * the studio-wide list; the other six answer coming soon. ≤767 (REG-353) it is a bottom sheet titled Tools, tiles 3-up.
 */
export function ToolsPopover({ open, anchor, onClose }: { open: boolean; anchor: RefObject<HTMLElement | null> | null; onClose: () => void }) {
  const router = useRouter()
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
    // 8 right of the RAIL's edge (the reference), not the item's — the item sits inside the rail's padding.
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

  const pick = (tool: (typeof TOOLS)[number]) => { onClose(); if (tool.href) router.push(tool.href); else comingSoon() }
  const tiles = (
    <div className={styles.grid} role="group" aria-label="Tools">
      {TOOLS.map((t) => (
        <button key={t.key} type="button" role="menuitem" className={styles.tile} onClick={() => pick(t)}>
          <Icon name={t.icon} size={24} weight={300} />
          <span className={styles.label}>{t.label}</span>
        </button>
      ))}
    </div>
  )
  if (typeof document === 'undefined') return null
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title="Tools" label="Tools" role="menu">
        <div className={styles.sheetBody}>{tiles}</div>
      </Sheet>
    )
  }
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div ref={place} className={`${menuStyles.menu} ${styles.popover}`} role="menu" aria-label="Tools" data-om-menu
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', zIndex: 130 }}>
          <span className={styles.eyebrow}>Tools</span>
          {tiles}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
