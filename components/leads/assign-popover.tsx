'use client'

import { useEffect, useRef, useState } from 'react'
import { MSG } from '@/lib/forms'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { anchoredSurface } from '@/lib/motion'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { FootStart, SurfaceFoot, SurfaceHead } from '@/components/om/dialog'
import { useOverflow } from '@/components/om/use-overflow'
import type { Member } from '@/lib/db/schema'
import { pickable } from '@/lib/leads/assign-policy'
import type { Suggestion } from '@/lib/leads/suggest'
import styles from './assign-popover.module.css'

export function AssignPopover({
  open,
  team,
  value,
  onClose,
  anchor = null,
  onApply,
  requireOne = false,
  position,
  assignable = null,
  hint = null,
  suggestion = null,
}: {
  /** (REG-612, parity Q-27 · B-35) The member the studio's rules suggest for an unassigned lead — shown while nobody is on it. */
  suggestion?: Suggestion | null
  open: boolean
  team: Member[]
  value: string[]
  /** (REG-601) The member ids this viewer may put on the lead — null = everyone. A row outside it keeps its state and cannot be ticked. */
  assignable?: string[] | null
  /** (REG-601) Set for a viewer who assigns nobody (a Designer): the rows only show, the foot reads this. */
  hint?: string | null
  anchor?: HTMLElement | null
  onClose: () => void
  onApply: (memberIds: string[]) => void
  /** Past New a lead must keep an owner (user 2026-08-29): saving with nobody assigned is blocked with a message. */
  requireOne?: boolean
  position: { top: number; left: number } | null
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set(value))
  const [wasOpen, setWasOpen] = useState(open)
  const sheet = useSheetLayout()
  const ref = useRef<HTMLDivElement>(null)
  const [scrollRef, bodyScrolls] = useOverflow()   // (REG-725) the foot's shadow only while the member list scrolls under it

  // React's adjust-state-during-render pattern: re-seed the draft on open.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setPicked(new Set(value))
  }
  useEffect(() => {
    if (!open || sheet) return   // ≤767 the Sheet owns Esc and its own scrim press (REG-353)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchor && anchor.contains(t)) return          // the trigger's own click toggles (REG-136)
      if (ref.current && !ref.current.contains(t)) onClose()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)   // capture: DS (React Aria) buttons stop pointerdown propagation (REG-153)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.removeEventListener('pointerdown', onDown, true) }
  }, [open, onClose, anchor, sheet])

  const toggle = (id: string) =>
    setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const locked = !!hint
  const mayPick = (id: string) => !locked && (assignable === null || assignable.includes(id))
  const rows = pickable(team, value).map((m) => (   // (REG-646) a deactivated member leaves the picker unless already on it
    <button key={m.id} type="button" className={styles.row} data-locked={mayPick(m.id) ? undefined : ''} onClick={() => { if (mayPick(m.id)) toggle(m.id) }}>
      <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
      <span className={styles.rowText}>
        <span className={styles.rowName}>{m.name}</span>
        <span className={styles.rowRole}>{m.isYou ? `${m.role} (you)` : m.role}{!locked && !mayPick(m.id) ? ' · outside your team' : ''}</span>
      </span>
      <Checkbox isSelected={picked.has(m.id)} isDisabled={!mayPick(m.id)} onChange={() => toggle(m.id)} aria-label={`Assign ${m.name}`} />
    </button>
  ))
  /* (REG-612) The suggestion sits above the rows while the lead has nobody: 1.0's AI Recommendation card, scored without AI. */
  const tip = suggestion && value.length === 0 && !locked ? (
    <div className={styles.suggest} data-testid="assign-suggestion">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <span className={styles.suggestHead}><img src="/figma-assets/brief-sparkle.svg" alt="" width={17} height={17} />Suggested · {suggestion.name}</span>
      <span className={styles.suggestReason}>{suggestion.reason}</span>
      <Button appearance="text" onPress={() => setPicked(new Set([suggestion.id]))}>Assign to {suggestion.name}</Button>
    </div>
  ) : null
  /* (REG-725) The message rides on the foot's left (FootStart) — in the popover's house foot and in the phone sheet's. */
  const foot = locked ? (
    <>
      <FootStart><span className={styles.footMsg} data-testid="assign-hint">{hint}</span></FootStart>
      <Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>
    </>
  ) : (
    <>
      {requireOne && picked.size === 0 ? <FootStart><span className={styles.footMsg} role="alert">{MSG.assignee}</span></FootStart> : null}
      <Button variant="secondary" appearance="outlined" onPress={() => setPicked(new Set(assignable === null ? [] : [...picked].filter((id) => !assignable.includes(id))))}>
        Clear All
      </Button>
      <Button isDisabled={requireOne && picked.size === 0} onPress={() => onApply(Array.from(picked))}>Assign</Button>
    </>
  )

  /* (REG-353) ≤767 the canvas draws every anchored popover as a bottom sheet: the same member rows, the same
     Clear All / Assign row, off the bottom edge under a scrim instead of floating over the cell it came from. */
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title="Assign Member" footer={foot} bodyClassName={styles.sheetBody}>
        {tip}{rows}
      </Sheet>
    )
  }

  return (
    <AnimatePresence>
      {open && position ? (
        <motion.div
          ref={ref}
          className={styles.card}
          variants={anchoredSurface}
          initial="initial" animate="animate" exit="exit"
          style={{ top: position.top, left: position.left, transformOrigin: 'top left' }}
          role="dialog"
          aria-label="Assign Member"
        >
          {/* (REG-725) the house head and foot (components/om/dialog.tsx): the 64 head with its rule inside and the outlined close; the
              foot's top rule always, its shadow only while the members scroll. */}
          <SurfaceHead title="Assign Member" onClose={onClose} />
          <div ref={scrollRef} className={styles.body}>
            {tip}{rows}
          </div>
          <SurfaceFoot shadow={bodyScrolls}>
            {foot}
          </SurfaceFoot>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
