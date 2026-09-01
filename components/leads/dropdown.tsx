'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { anchoredSurface } from '@/lib/motion'
import styles from './menus.module.css'

/** The mocks' 200px dropdown (Add Lead / kebab family) with the layer policy. */
export function Dropdown({
  open,
  onClose,
  align = 'right',
  side = 'down',
  children,
  width = 200,
}: {
  open: boolean
  onClose: () => void
  align?: 'left' | 'right'
  /** 'up' flips the menu above the trigger (bottom rows near a clipping edge). */
  side?: 'down' | 'up'
  children: ReactNode
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    // Anything outside the menu closes it (user 2026-08-29: the wrapper is sometimes a whole toolbar row) —
    // except the open trigger itself (aria-haspopup + aria-expanded="true"), whose own click toggles the menu
    // (no close-then-reopen). Listened in the capture phase: DS Buttons (React Aria) stop pointerdown propagation
    // at React's root, so a bubble-phase document listener would never see presses on them.
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (!t || ref.current?.contains(t)) return
      if (t.closest('[aria-haspopup][aria-expanded="true"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKey, true)   // capture: the open menu owns Esc before its host (Drawer / dialog) — as PortalMenu / TagPicker do (REG-4, REG-124)
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)
    return () => { document.removeEventListener('keydown', onKey, true); clearTimeout(t); document.removeEventListener('pointerdown', onDown, true) }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={ref}
          className={styles.menu}
          role="menu"
          variants={anchoredSurface}
          initial="initial" animate="animate" exit="exit"
          style={{
            width,
            ...(side === 'down' ? { top: 'calc(100% + 4px)' } : { bottom: 'calc(100% + 4px)' }),
            transformOrigin: `${side === 'down' ? 'top' : 'bottom'} ${align}`,
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
          }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function DropdownItem({ children, onSelect, tone, disabled, title }: {
  children: ReactNode
  onSelect: () => void
  /** Destructive item (Delete) — red text, as om/menu's `tone`. */
  tone?: 'danger'
  /** Shown but inert (REG-265: a stage-logged record's Edit / Delete) — `title` says why on hover. */
  disabled?: boolean
  title?: string
}) {
  return (
    <button type="button" role="menuitem" className={styles.item} data-tone={tone} aria-disabled={disabled || undefined} title={title}
            onClick={disabled ? undefined : onSelect}>
      {children}
    </button>
  )
}

export function DropdownDivider() {
  return <div className={styles.divider} role="separator" />
}
