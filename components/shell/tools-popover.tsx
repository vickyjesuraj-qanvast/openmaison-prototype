'use client'

import { type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { usePathname, useRouter } from 'next/navigation'
import { anchoredSurface } from '@/lib/motion'
import { Icon } from '@/components/om/icon'
import { useComingSoon } from '@/components/om/snackbar'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { Tooltip } from '@/components/om/tooltip'
import menuStyles from '@/components/leads/menus.module.css'
import styles from './tools-popover.module.css'
import { useRailPopover } from '@/components/shell/rail-popover'
import { leaveThen } from '@/components/company/leave-guard'   // (UX audit S2) unsaved Company / Settings edits ask before the move
import { badgeCount } from '@/lib/format'   // (pending modules S16) 99+
import { useCredits } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import type { ProFeature } from '@/lib/credits/features'

/** The 1.0 tools in their order (owner 2026-09-11); the first is the way into Quotes and is labelled so (REG-413).
    (S46A — the findability audit's T-1 · M4, her "fix everything" 2026-10-19) `help` — what a tile holds, said on hover and keyboard focus (the
    house tooltip): the Quotes tile names Upload a quote, 1.0's Quote Digitizer, which no tile is called any more. *(invented copy — the lines
    are ⌘K's own subs for the same pages)* */
export const TOOLS: { key: string; icon: string; label: string; href?: string; /** (pending modules S19) a Pro feature: the Pro tag on Free */ pro?: ProFeature; help?: string }[] = [
  { key: 'quotes', icon: 'request_quote', label: 'Quotes', href: '/quotes', help: 'Every quote in the studio — create one, or upload an existing quote' },
  { key: 'xray', icon: 'scan', label: 'Quote X-Ray', href: '/quote-x-ray', pro: 'quote_xray', help: 'Compare a quote with another studio’s' },
  { key: 'contracts', icon: 'contract', label: 'Contracts', href: '/contracts', help: 'Every contract in the studio' },   /* (REG-534) Tools › Contracts — every contract in the studio */   /* (REG-529) */
  { key: 'visualizer', icon: 'wand_shine', label: 'AI Visualizer', href: '/visualizer', help: 'Every design — start from a room photo' },   /* (REG-673) live — every design, a lead's or personal */
  { key: 'isometric', icon: 'view_in_ar', label: 'Floorplan to 3D Isometric', href: '/planner?view=iso&photo=1', help: 'A 3D picture from a floor-plan photo' },   /* (parity map, TD-098) live — the 3D Space Planner, every layout opening in its isometric view; (pending modules S28) it opens on Make a 3D picture, 1.0's tool's first step */
  { key: 'insights', icon: 'trending_up', label: 'Market Insights', href: '/market-insights', help: 'Articles from OpenMaison’s editors' },   /* (pending modules S25) live — the articles OpenMaison's editors publish */
  { key: 'compliance', icon: 'verified_user', label: 'Compliance Navigator', href: '/compliance', help: 'The studio’s registrations and Singapore’s rules by home' },   /* (gaps build I, I-Q12) live — the studio's own steps and Singapore's rules by home */
  { key: 'planner', icon: 'space_dashboard', label: '3D Space Planner', href: '/planner', help: 'Every 3D layout' },   /* (gaps build J) live — every layout, a project's or personal */
  { key: 'copilot', icon: 'analytics', label: 'Meeting Copilot', href: '/meetings', help: 'Every meeting, and the co-pilot in each' },   /* (pending modules S23) live — every meeting in the studio, and the co-pilot in each */
]

/** (UX audit V7) A page that belongs to Tools — its list or anything opened from it — lights the rail's Tools item, as Company lights on /company. */
export const toolOf = (pathname: string) => TOOLS.find((t) => !!t.href && (pathname === t.href || pathname.startsWith(`${t.href}/`))) ?? null
export const onToolsPage = (pathname: string) => !!toolOf(pathname)
/** (S42 audit C-24) A meeting lives on its lead (or its project — S23's one home): its page opened from there lights Leads or Projects in the
    rail and the dock, as its crumb reads; opened from Tools › Meeting Copilot (or anywhere else) it stays a Tools page. Null = the usual rule. */
export function recordHome(pathname: string, from: string | undefined): '/leads' | '/projects' | null {
  if (!/^\/meetings\/[^/]+/.test(pathname) || !from) return null
  return from.startsWith('/projects') ? '/projects' : from.startsWith('/leads') ? '/leads' : null
}

/**
 * Tools (the rail's item; design reference "Create Quote Reference" §Tools, approved 2026-09-11 — REG-422): the quick-links
 * tile grid inside the anchored-menu chrome, 8px to the right of the rail and aligned to the item's top, bottom-aligned
 * when it would run past the viewport. "TOOLS" eyebrow, 92×96 tiles three across (the Create strip's tile). Quotes opens
 * the studio-wide list; Quote X-Ray opens the comparison tool (REG-529); (pending modules S25) every tile is live now — a tile without an `href` would still wear Soon and answer coming soon. ≤767 (REG-353) it is a bottom sheet titled Tools, tiles 3-up.
 */
export function ToolsPopover({ open, anchor, onClose, counts = {} }: { open: boolean; anchor: RefObject<HTMLElement | null> | null; onClose: () => void; /** (UX audit Q4) a tile's count — Quotes: the quotes waiting for this approver, the rail's Tools badge */ counts?: Record<string, number> }) {
  const router = useRouter()
  const on = toolOf(usePathname())?.key ?? null   // (UX audit V7) the tool you are in is marked, as the Company panel marks its section
  const comingSoon = useComingSoon()
  const sheet = useSheetLayout()
  const { place } = useRailPopover({ open, anchor, onClose, sheet, align: 'top' })   // (REG-728) the rail's popovers open one way

  const pick = (tool: (typeof TOOLS)[number]) => { onClose(); const href = tool.href; if (href) leaveThen(() => router.push(href)); else comingSoon() }
  /* (pending modules S19 — 1.0's plan gating: "the sidebar Tools entry" wears the Pro badge) the tool still opens — its page shows the lock */
  const locked = useCredits(null)?.locked ?? []
  const isPro = (t: (typeof TOOLS)[number]) => !!t.pro && locked.includes(t.pro)
  const tiles = (
    <div className={styles.grid} role="group" aria-label="Tools">
      {TOOLS.map((t) => (
        /* (UX audit V6) a tool that isn't built wears the Company panel's "Soon" tag and says so in its name; its press still answers "Coming soon"
           (S46A) its help on hover and keyboard focus — a phone's sheet shows none (no hover), its ⌘K finds the same words */
        <Tooltip key={t.key} label={t.help ?? t.label} disabled={!t.help || sheet}>
          <button type="button" role="menuitem" className={styles.tile} onClick={() => pick(t)} data-on={on === t.key || undefined} aria-current={on === t.key ? 'page' : undefined}
                  aria-label={!t.href ? `${t.label}, coming soon` : isPro(t) ? `${t.label}, Pro feature` : counts[t.key] ? `${t.label} (${counts[t.key]} waiting for your approval)` : t.label} data-soon={t.href ? undefined : ''} data-pro={isPro(t) || undefined}>
            {counts[t.key] ? <span className={styles.count} aria-hidden>{badgeCount(counts[t.key] ?? 0)}</span> : null}
            <Icon name={t.icon} size={24} weight={300} fill={on === t.key} />
            <span className={styles.label}>{t.label}</span>
            {t.href ? null : <span className={styles.soon} aria-hidden>Soon</span>}
            {isPro(t) ? <ProTag className={styles.pro} /> : null}
          </button>
        </Tooltip>
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
