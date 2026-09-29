'use client'

import { type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { usePathname, useRouter } from 'next/navigation'
import { anchoredSurface } from '@/lib/motion'
import { COMPANY_GROUPS, type CompanySection } from '@/lib/company/sections'
import { Icon } from '@/components/om/icon'
import { useComingSoon } from '@/components/om/snackbar'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import menuStyles from '@/components/leads/menus.module.css'
import styles from './company-popover.module.css'
import { useRailPopover } from '@/components/shell/rail-popover'

/**
 * Company (REG-484; owner 2026-09-17: "the navigation is in the sidebar only"): the rail's item opens the Tools panel's
 * shell (REG-422) with the company's sections in two groups; Profile and Templates are pages, the rest answer coming
 * soon. The section you are on is marked. ≤767 (REG-353) it is a bottom sheet titled Company.
 */
export function CompanyPopover({ open, anchor, onClose, awaiting = 0, proposed = 0, asks = 0 }: { open: boolean; anchor: RefObject<HTMLElement | null> | null; onClose: () => void; /** (REG-501) templates awaiting approval — on the Templates row */ awaiting?: number; /** (REG-652) proposed items for an Owner or an Admin — on the Price book row */ proposed?: number; /** (REG-703) members waiting for AI credits, for the Owner — on the Plan & AI credits row */ asks?: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const comingSoon = useComingSoon()
  const sheet = useSheetLayout()
  const { place } = useRailPopover({ open, anchor, onClose, sheet, align: 'top' })   // (REG-728) the rail's popovers open one way

  const isOn = (s: CompanySection) => !!s.href && (s.key === 'templates' ? pathname.startsWith('/company/templates') : pathname === s.href || pathname.startsWith(`${s.href}/`))
  const pick = (s: CompanySection) => { onClose(); if (s.href) router.push(s.href); else comingSoon() }
  const list = (
    <div className={styles.groups}>
      {COMPANY_GROUPS.map((g) => (
        <div key={g.title} className={styles.group} role="group" aria-label={g.title}>
          <span className={styles.eyebrow} data-menu-label="" role="presentation">{g.title}</span>   {/* (REG-728) the house group title */}
          {g.items.map((s) => (
            <button key={s.key} type="button" role="menuitem" className={styles.row} data-on={isOn(s) || undefined} aria-current={isOn(s) ? 'page' : undefined} onClick={() => pick(s)}>
              <span className={styles.glyph}><Icon name={s.icon} size={20} weight={300} fill={isOn(s)} /></span>
              <span className={styles.text}>
                <span className={styles.label}>{s.label}</span>
                <span className={styles.help}>{s.help}</span>
              </span>
              {s.key === 'templates' && awaiting > 0 ? <span className={styles.await}>{awaiting} awaiting</span> : null}
              {s.key === 'price-book' && proposed > 0 ? <span className={styles.await}>{proposed} proposed</span> : null}
              {s.key === 'plan' && asks > 0 ? <span className={styles.await}>{asks} {asks === 1 ? 'ask' : 'asks'}</span> : null}
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
