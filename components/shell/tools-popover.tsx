'use client'

import { type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { anchoredSurface } from '@/lib/motion'
import { Icon } from '@/components/om/icon'
import { useComingSoon } from '@/components/om/snackbar'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import menuStyles from '@/components/leads/menus.module.css'
import styles from './tools-popover.module.css'
import { useRailPopover } from '@/components/shell/rail-popover'

/** The 1.0 tools in their order (owner 2026-09-11); the first is the way into Quotes and is labelled so (REG-413). */
export const TOOLS: { key: string; icon: string; label: string; href?: string }[] = [
  { key: 'quotes', icon: 'request_quote', label: 'Quotes', href: '/quotes' },
  { key: 'xray', icon: 'scan', label: 'Quote X-Ray', href: '/quote-x-ray' },
  { key: 'contracts', icon: 'contract', label: 'Contracts', href: '/contracts' },   /* (REG-534) Tools › Contracts — every contract in the studio */   /* (REG-529) */
  { key: 'visualizer', icon: 'wand_shine', label: 'AI Visualizer', href: '/visualizer' },   /* (REG-673) live — every design, a lead's or personal */
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
 * the studio-wide list; Quote X-Ray opens the comparison tool (REG-529); the other six answer coming soon. ≤767 (REG-353) it is a bottom sheet titled Tools, tiles 3-up.
 */
export function ToolsPopover({ open, anchor, onClose }: { open: boolean; anchor: RefObject<HTMLElement | null> | null; onClose: () => void }) {
  const router = useRouter()
  const comingSoon = useComingSoon()
  const sheet = useSheetLayout()
  const { place } = useRailPopover({ open, anchor, onClose, sheet, align: 'top' })   // (REG-728) the rail's popovers open one way

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
