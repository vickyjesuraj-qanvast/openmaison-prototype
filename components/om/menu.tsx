'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { anchoredSurface } from '@/lib/motion'
import { Icon } from './icon'
import styles from './menu.module.css'

/**
 * Anchored overlay shell for menus/popovers. Layer policy (R3):
 * Esc and click-outside close it; the anchor's parent supplies positioning
 * context (position: relative on the wrapper).
 */
export function AnchoredMenu({
  open,
  onClose,
  children,
  align = 'left',
  top = 'calc(100% + 4px)',
  width,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  align?: 'left' | 'right'
  top?: string
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    // defer so the opening click doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={ref}
          className={styles.surface}
          role="menu"
          variants={anchoredSurface}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            top,
            transformOrigin: align === 'left' ? 'top left' : 'top right',
            ...(align === 'left' ? { left: 0 } : { right: 0 }),
            ...(width ? { width } : null),
          }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function MenuItem({
  icon,
  children,
  tone,
  onSelect,
}: {
  icon?: string
  children: ReactNode
  tone?: 'danger'
  onSelect?: () => void
}) {
  return (
    <button type="button" role="menuitem" className={styles.item} data-tone={tone} onClick={onSelect}>
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  )
}

export function MenuDivider() {
  return <div className={styles.divider} role="separator" />
}
