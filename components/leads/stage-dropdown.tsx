'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type CSSProperties } from 'react'
import { Button } from '@/components/ds'
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import { anchoredSurface } from '@/lib/motion'
import { STAGES, INACTIVE_STAGES, type Stage } from '@/lib/leads/enums'
import { REFUSED_KEY, Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { Icon } from '@/components/om/icon'
import { Sheet, sheetMenuBody, useSheetLayout } from '@/components/om/sheet'
import { useMenuKeyboard } from '@/components/om/surface'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from './dropdown'
import styles from './menus.module.css'
import ddStyles from './stage-dropdown.module.css'

/**
 * Touch ergonomics (REG-273): a tooltip never fires for a touch pointer, so on a phone or a tablet the reason
 * a stage is out of reach — the whole point of the locked item — was unreachable. The tap that used to do
 * nothing now answers in the app's own snackbar, with the same sentence the tooltip carries. Read in the
 * handler, never in render; a mouse always reports `hover: hover`, so desktop behaviour is untouched.
 */
const isTouchPointer = () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

/**
 * The stage menu (780:86452, with the journey 836:23422). (REG-728) Its rows are the house `DropdownItem`s — "current" as the row's
 * meta, the current stage in the Selected fill, the green check on a passed stage kept at the row's end — its group titles and rule
 * the house `DropdownLabel` / `DropdownDivider`, and the keyboard the house menu's (`useMenuKeyboard`: focus on the current stage,
 * arrows / Home / End over the stages that can be chosen, Tab back to the trigger; Esc consumed in the capture phase, as Dropdown
 * does). Its own placement stays: it hangs from the cell or the pill it belongs to and follows it while the page scrolls (DESIGN.md).
 */
/** (Leads on the move, L3 — P-05 · Q-05 · A-06 · A-07) The lead's next move, first in the sheet: "Move to Contacted" (or "Resume at New" for a parked
 *  lead) as the one filled row; refused, the reason in its place and — where there is one — the fix as the filled button ("Assign"). */
export type NextMove = { label: string; onPress: () => void; why?: string | null; fix?: { label: string; onPress: () => void } | null }

export function StageDropdown({
  open, onClose, onSelect, position, blocked, current = null, doneThrough = -1, subject, next = null,
}: {
  /** (Leads on the move, P-05) A finger's sheet or menu (a phone, a touch tablet) leads with the next move; a mouse keeps the mock's menu. */
  next?: NextMove | null
  open: boolean
  onClose: () => void
  onSelect: (stage: Stage) => void
  position: { top: number; left: number } | null
  /** Linear stage movement: returns why a stage can't be chosen yet (shown as a tooltip), or null when it can. */
  blocked?: (stage: Stage) => string | null
  /** 836:23422: the lead's stage reads "current"; stages it has passed carry a green check. */
  current?: Stage | null
  /** Index (in STAGES) of the last completed active stage — On Hold / Lost leads keep the checks of where they left. */
  doneThrough?: number
  /** ≤767 this is the canvas' "Move stage" sheet (1d) and names the lead it moves: "Olivia Martinez · 9123 4567". */
  subject?: string
}) {
  const snackbar = useSnackbar()
  const sheet = useSheetLayout()
  /* (Leads on the move, P-05 · A-06) a finger's menu: the next move first, and a locked row says why IN the row (REG-656's rule) — a tap never
     had to be spent to learn it. A mouse keeps the mock's rows and the tooltip, byte for byte. */
  const touch = useMediaQuery(TOUCH_TABLET)
  const finger = sheet || touch
  /* A locked stage is a disabled DropdownItem (aria-disabled — it takes no press, and the arrows pass it by); the Tooltip explains the
     lock, and on touch, where no tooltip fires, a tap on the row answers with the same sentence in the snackbar (REG-273). The row's
     press lands on this box (`display: contents`), since the disabled item itself runs nothing. */
  const item = (s: Stage) => {
    const why = blocked?.(s) ?? null
    const isCurrent = s === current
    const done = !isCurrent && (STAGES as readonly string[]).indexOf(s) <= doneThrough && (STAGES as readonly string[]).includes(s)
    return (
      <span key={s} className={ddStyles.row} onClick={why && !finger ? () => { if (isTouchPointer()) snackbar({ message: why, key: REFUSED_KEY }) } : undefined}>   {/* (S43E W1-01) the house Tooltip says it on touch too — one keyed snackbar; (leads on the move, A-06) a finger's row prints it instead */}
        <Tooltip label={why ?? ''} side="right" disabled={!why || finger}>
          <DropdownItem disabled={!!why} title={finger && why ? why : undefined} selected={isCurrent} meta={isCurrent ? 'current' : undefined} onSelect={() => onSelect(s)}>
            <span className={ddStyles.itemText}>{s}</span>
            {done ? <span className={ddStyles.done} aria-hidden><Icon name="check_circle" size={20} fill /></span> : null}
          </DropdownItem>
        </Tooltip>
      </span>
    )
  }
  const ref = useRef<HTMLDivElement>(null)
  useMenuKeyboard(open && !sheet, ref, onClose)   // (REG-728) the house menu keyboard — the sheet keeps its own focus policy
  useEffect(() => {
    if (!open || sheet) return   // the sheet owns Esc and its own scrim press (components/om/sheet.tsx)
    // (REG-728) Capture, consumed: the open menu owns Esc before its host (the Lead Details header's Back) — as Dropdown / PortalMenu do.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (t instanceof Element && t.closest('[aria-haspopup][aria-expanded="true"], [data-stage-anchor]')) return   // the open trigger — or the listing cell that is its anchor (REG-332) — toggles (REG-153)
      if (ref.current && !ref.current.contains(t)) onClose()
    }
    document.addEventListener('keydown', onKey, true)
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)   // capture: DS buttons stop propagation
    return () => { document.removeEventListener('keydown', onKey, true); clearTimeout(t); document.removeEventListener('pointerdown', onDown, true) }
  }, [open, onClose, sheet])

  /* (Leads on the move, P-05 · A-07) The next move as the sheet's first row — the lead page's own primary (Move to {next} · Resume at {stage});
     refused, the reason and its fix ("Assign a member first" · Assign), so a finger never meets a dead end. */
  const nextBlock = finger && next ? (
    <div className={ddStyles.next} data-testid="stage-next" data-blocked={next.why ? '' : undefined}>
      {next.why ? (
        <>
          <span className={ddStyles.nextWhy}><b>{next.label}</b> — {next.why.charAt(0).toLowerCase()}{next.why.slice(1)}</span>
          {next.fix ? <Button onPress={next.fix.onPress} data-testid="stage-next-fix">{next.fix.label}</Button> : null}
        </>
      ) : (
        <Button onPress={next.onPress} data-testid="stage-next-move">{next.label}</Button>
      )}
    </div>
  ) : null

  const groups = (
    <>
      {nextBlock}
      <DropdownLabel tone="green" dot>Active</DropdownLabel>
      {STAGES.map(item)}
      <DropdownDivider />
      <DropdownLabel tone="orange" dot>Inactive</DropdownLabel>
      {INACTIVE_STAGES.map(item)}
    </>
  )

  /* (REG-353) ≤767 the canvas presents this as the "Move stage" bottom sheet (1d): the same two groups and the
     same locks, off the bottom edge under a scrim, with the lead and its current stage named in the heading. */
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title="Move stage" role="menu" bodyClassName={sheetMenuBody}
             subtitle={[subject, current ? `Current stage: ${current}` : null].filter(Boolean).join(' · ') || undefined}>
        {groups}
      </Sheet>
    )
  }

  return (
    <AnimatePresence>
      {open && position ? (
        <motion.div ref={ref} className={styles.menu} role="menu"
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit"
                    style={{ position: 'fixed', top: position.top, left: position.left, transformOrigin: 'top left', width: MENU_WIDTH.standard, '--menu-top': `${position.top}px` } as CSSProperties}>   {/* (responsive audit W2-12) the sideways phone's cap reads the placed top (menus.module.css) */}
          {groups}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
