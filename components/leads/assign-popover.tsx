'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Avatar } from '@/components/om/avatar'
import { anchoredSurface } from '@/lib/motion'
import type { Member } from '@/lib/db/schema'
import styles from './assign-popover.module.css'

export function AssignPopover({
  open,
  team,
  value,
  onClose,
  onApply,
  position,
}: {
  open: boolean
  team: Member[]
  value: string[]
  onClose: () => void
  onApply: (memberIds: string[]) => void
  position: { top: number; left: number } | null
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set(value))
  const [wasOpen, setWasOpen] = useState(open)
  const ref = useRef<HTMLDivElement>(null)

  // React's adjust-state-during-render pattern: re-seed the draft on open.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setPicked(new Set(value))
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.removeEventListener('mousedown', onDown) }
  }, [open, onClose])

  const toggle = (id: string) =>
    setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <AnimatePresence>
      {open && position ? (
        <motion.div
          ref={ref}
          className={styles.card}
          variants={anchoredSurface}
          initial="initial" animate="animate" exit="exit"
          style={{ top: position.top, left: position.left, transformOrigin: 'top left', position: 'fixed' }}
          role="dialog"
          aria-label="Assign Member"
        >
          <div className={styles.head}>
            <h2 className={styles.title}>Assign Member</h2>
            <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
              <Icon name="close" size={24} family="outlined" />
            </button>
          </div>
          <div className={styles.body}>
            {team.map((m) => (
              <button key={m.id} type="button" className={styles.row} onClick={() => toggle(m.id)}>
                <Avatar name={m.name} color={m.color} size={40} />
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{m.name}</span>
                  <span className={styles.rowRole}>{m.isYou ? `${m.role} (you)` : m.role}</span>
                </span>
                <Checkbox isSelected={picked.has(m.id)} onChange={() => toggle(m.id)} aria-label={`Assign ${m.name}`} />
              </button>
            ))}
          </div>
          <div className={styles.foot}>
            <Button variant="secondary" appearance="outlined" onPress={() => setPicked(new Set())}>
              Clear All
            </Button>
            <Button onPress={() => onApply(Array.from(picked))}>Assign</Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
