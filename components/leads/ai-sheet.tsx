'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { duration, spring } from '@/lib/motion'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { useResetPrototype } from '@/components/maison-ai/reset-prototype'
import styles from './ai-sheet.module.css'

/**
 * A4 (approved decision): the Maison AI suggestion sheet.
 * Styling follows the "Maison AI Brief" pattern from the Lead Details mocks
 * (outlined purple suggestion buttons under a ✨ header). Springs from the
 * FAB's corner. (pending modules S10) Every page's and every editor's sheet is the shell's `MaisonAiSheet`
 * (components/shell/maison-ai.tsx) — the Ask box, the page's suggestions that act, Recent; nothing answers Coming soon.
 * (Quotes on the move, B-23 — 2026-10-22) ≤767 it is the house bottom sheet (REG-353: every anchored surface is one on a phone), not a
 * 302px card floating over the page — the same head, Ask box, suggestions, Recent and the reset in its foot.
 */
export function AiSheet({
  open,
  suggestions,
  onSelect,
  onClose,
  anchorRef,
  panel,
  ask,
  recent,
}: {
  open: boolean
  suggestions: string[]
  onSelect: (s: string) => void
  onClose: () => void
  /** The FAB that opens it — a press there toggles instead of close-then-reopen (REG-153). */
  anchorRef?: RefObject<HTMLElement | null>
  /** (gaps build I, I-Q18) A pressed suggestion's answer or proposal, in the body's place — the head and the foot stay. */
  panel?: ReactNode
  /** (parity map, TD-107) The shell's Ask box, under the head — above the suggestions and above an answer. A sheet without it is as it was. */
  ask?: ReactNode
  /** (pending modules S10) The member's recent questions, under the suggestions — only while no answer is open. */
  recent?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Prototype-only: put everything back to the base state (user 2026-08-29) — leads, imports, tasks, settings and browser prefs.
  /* (the Dashboard redesigned 2026-10-26, lane D4) the reset and its confirm, shared with the docked field (components/maison-ai/reset-prototype.tsx) */
  const { open: confirmReset, ask: askReset, dialog: confirm } = useResetPrototype()
  /* (S42 D-06 — reach for everyone) opened from the keyboard, the sheet takes focus to its first control (the Ask box, else the first
     suggestion) so Tab walks the sheet; when it closes with focus inside it, focus goes back to what opened it (the FAB, a menu's ⋮). A
     press with a mouse or a finger leaves focus where it was — a phone's keyboard never pops up unasked. */
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    const was = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
    opener.current = was
    let byKeys = false
    try { byKeys = !!was && was.matches(':focus-visible') } catch { byKeys = false }
    const raf = byKeys ? requestAnimationFrame(() => { ref.current?.querySelector<HTMLElement>('[data-testid="maison-ask"] input, button')?.focus() }) : 0
    const sheet = ref.current
    const anchor = anchorRef?.current ?? null
    return () => {
      cancelAnimationFrame(raf)
      requestAnimationFrame(() => {
        const now = document.activeElement
        if (now && now !== document.body && !(sheet?.contains(now) ?? false)) return   // something else took focus (a dialog the press opened)
        const back = opener.current?.isConnected ? opener.current : anchor?.querySelector<HTMLElement>('button') ?? anchor
        back?.focus({ preventScroll: true })
      })
    }
  }, [open, anchorRef])
  const phone = useSheetLayout()   // (B-23) ≤767 the house Sheet owns Esc, the scrim and the focus
  useEffect(() => {
    if (!open || confirmReset || phone) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchorRef?.current?.contains(t)) return   // the FAB's own press toggles (REG-153)
      if (ref.current && !ref.current.contains(t)) onClose()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)   // capture: DS (React Aria) buttons stop pointerdown propagation (REG-153)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.removeEventListener('pointerdown', onDown, true) }
  }, [open, onClose, confirmReset, anchorRef, phone])

  const resetRow = (
    <button type="button" className={styles.reset} onClick={askReset}>
      <Icon name="restart_alt" size={18} />
      Reset prototype to base
    </button>
  )
  /* (B-23) the phone: the house bottom sheet — its grabber, head and foot; the middle is the card's own middle */
  if (phone) {
    return (
      <>
        <Sheet open={open} onClose={onClose} title="Maison AI" label="Maison AI suggestions" footer={resetRow}>
          <div className={styles.sheetMiddle} data-testid="maison-sheet">
            {ask}
            {panel ? panel : suggestions.length > 0 ? <div className={styles.body}>
              {suggestions.map((s) => <button key={s} type="button" className={styles.suggestion} onClick={() => onSelect(s)}>{s}</button>)}
            </div> : null}
            {panel ? null : recent}
          </div>
        </Sheet>
        {confirm}
      </>
    )
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={ref}
          className={styles.sheet}
          role="dialog"
          aria-label="Maison AI suggestions"
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: spring.settle }}
          exit={{ opacity: 0, scale: 0.95, y: 6, transition: { duration: duration.toggle } }}
          style={{ transformOrigin: 'bottom right' }}
        >
          <div className={styles.head}>
            {/* The Maison AI mark — the FAB's own sparkle (REG-249), not a stock glyph. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className={styles.spark}><img src="/figma-assets/brief-sparkle.svg" width={16} height={16} alt="" /></span>
            Maison AI
          </div>
          {/* (pending modules S10) the middle scrolls inside the sheet when the Ask box, the suggestions and Recent outgrow a short window */}
          <div className={styles.scroll}>
          {ask}
          {/* (REG-507) A page with nothing scripted opens straight onto the foot — no empty body. */}
          {panel ? panel : suggestions.length > 0 ? <div className={styles.body}>
            {suggestions.map((s, i) => (
              <motion.button
                key={s}
                type="button"
                className={styles.suggestion}
                onClick={() => onSelect(s)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.04 * i, duration: duration.menu } }}
              >
                {s}
              </motion.button>
            ))}
          </div> : null}
          {panel ? null : recent}
          </div>
          <div className={styles.foot}>{resetRow}</div>
        </motion.div>
      ) : null}
      {confirm}
    </AnimatePresence>
  )
}
