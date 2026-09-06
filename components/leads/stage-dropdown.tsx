'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { anchoredSurface } from '@/lib/motion'
import { STAGES, INACTIVE_STAGES, type Stage } from '@/lib/leads/enums'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { Icon } from '@/components/om/icon'
import { Sheet, sheetMenuBody, useSheetLayout } from '@/components/om/sheet'
import styles from './menus.module.css'
import ddStyles from './stage-dropdown.module.css'

/**
 * Touch ergonomics (REG-273): a tooltip never fires for a touch pointer, so on a phone or a tablet the reason
 * a stage is out of reach — the whole point of the locked item — was unreachable. The tap that used to do
 * nothing now answers in the app's own snackbar, with the same sentence the tooltip carries. Read in the
 * handler, never in render; a mouse always reports `hover: hover`, so desktop behaviour is untouched.
 */
const isTouchPointer = () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

export function StageDropdown({
  open, onClose, onSelect, position, blocked, current = null, doneThrough = -1, subject,
}: {
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
  // aria-disabled rather than `disabled`: disabled buttons swallow pointer events, and the tooltip explains the lock
  // (on touch, where no tooltip fires, the tap answers with the same sentence in the snackbar — REG-273).
  const item = (s: Stage) => {
    const why = blocked?.(s) ?? null
    const isCurrent = s === current
    const done = !isCurrent && (STAGES as readonly string[]).indexOf(s) <= doneThrough && (STAGES as readonly string[]).includes(s)
    return (
      <Tooltip key={s} label={why ?? ''} side="right" disabled={!why}>
        <button type="button" role="menuitem" className={styles.item} aria-disabled={why ? true : undefined}
                aria-current={isCurrent ? 'step' : undefined} data-done={done || undefined}
                onClick={why ? () => { if (isTouchPointer()) snackbar({ message: why }) } : () => onSelect(s)}>
          <span className={ddStyles.itemText}>{s}</span>
          {isCurrent ? <span className={ddStyles.meta}>current</span> : null}
          {done ? <span className={ddStyles.done} aria-hidden><Icon name="check_circle" size={20} fill /></span> : null}
        </button>
      </Tooltip>
    )
  }
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (t instanceof Element && t.closest('[aria-haspopup][aria-expanded="true"], [data-stage-anchor]')) return   // the open trigger — or the listing cell that is its anchor (REG-332) — toggles (REG-153)
      if (ref.current && !ref.current.contains(t)) onClose()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)   // capture: DS buttons stop propagation
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.removeEventListener('pointerdown', onDown, true) }
  }, [open, onClose])

  const groups = (
    <>
      <div className={ddStyles.groupTitle} data-tone="green">
        <span className={ddStyles.dot} data-tone="green" />
        Active
      </div>
      {STAGES.map(item)}
      <div className={ddStyles.rule} role="separator" />
      <div className={ddStyles.groupTitle} data-tone="orange">
        <span className={ddStyles.dot} data-tone="orange" />
        Inactive
      </div>
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
                    style={{ position: 'fixed', top: position.top, left: position.left, transformOrigin: 'top left', width: 200 }}>
          {groups}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
