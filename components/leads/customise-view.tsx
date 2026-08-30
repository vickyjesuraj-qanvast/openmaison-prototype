'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Reorder } from 'motion/react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { anchoredSurface } from '@/lib/motion'
import { DEFAULT_COLUMNS, type ColumnConfig, type ColumnKey } from './table'
import styles from './customise-view.module.css'

const MAX_PINNED = 3
const LOCKED: ColumnKey = 'name'   // Lead Name is always pinned and always first (user rule 2026-08-27)

/** Keep the list well-formed: Lead Name first, then the other pinned columns, then the rest — each block in its current order. */
function normalise(cols: ColumnConfig[]): ColumnConfig[] {
  const lead = cols.filter((c) => c.key === LOCKED).map((c) => ({ ...c, pinned: true, visible: true }))
  const pinned = cols.filter((c) => c.key !== LOCKED && c.pinned).map((c) => ({ ...c, visible: true }))   // pinned ⇒ visible
  const rest = cols.filter((c) => c.key !== LOCKED && !c.pinned)
  return [...lead, ...pinned, ...rest]
}

export function CustomiseView({
  open,
  columns,
  onClose,
  onSave,
  position,
  anchor = null,
}: {
  open: boolean
  columns: ColumnConfig[]
  onClose: () => void
  onSave: (cols: ColumnConfig[]) => void
  position: { top: number; left: number } | null
  /** The gear that opened it — a press there toggles instead of close-then-reopen (REG-153). */
  anchor?: HTMLElement | null
}) {
  const [draft, setDraft] = useState<ColumnConfig[]>(() => normalise(columns))
  const [wasOpen, setWasOpen] = useState(open)
  const ref = useRef<HTMLDivElement>(null)

  // React's adjust-state-during-render pattern: re-seed the draft on open.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(normalise(columns))
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchor && anchor.contains(t)) return          // the gear's own click toggles (REG-153)
      if (ref.current && !ref.current.contains(t)) onClose()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)   // capture: DS (React Aria) buttons stop pointerdown propagation (REG-153)
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.removeEventListener('pointerdown', onDown, true) }
  }, [open, onClose, anchor])

  const pinnedCount = draft.filter((c) => c.pinned).length
  const setCol = (key: string, patch: Partial<ColumnConfig>) =>
    setDraft((d) => normalise(d.map((c) => (c.key === key ? { ...c, ...patch } : c))))

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
          aria-label="Customise your view"
        >
          <div className={styles.head}>
            <h2 className={styles.title}>Customise your view</h2>
            <Tooltip label="Close">
              <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                <Icon name="close" size={24} family="outlined" />
              </button>
            </Tooltip>
          </div>
          <div className={styles.body}>
            <p className={styles.desc}>Toggle columns you want to see. Drag columns up or down to reorder them.</p>
            <p className={styles.pinnedNote}>
              <Icon name="push_pin" size={16} fill />
              Pinned ({MAX_PINNED} columns max)
            </p>
            <Reorder.Group axis="y" as="div" values={draft} onReorder={(next: ColumnConfig[]) => setDraft(normalise(next))}>
              {draft.map((col, i) => (
                <Reorder.Item key={col.key} value={col} as="div" className={styles.row}
                              dragListener={col.key !== LOCKED} data-locked={col.key === LOCKED || undefined}
                              data-pin-last={col.pinned && !draft[i + 1]?.pinned || undefined}>
                  <span className={styles.drag} aria-hidden={col.key === LOCKED || undefined}><Icon name="drag_indicator" size={24} /></span>
                  <span className={styles.label}>{col.label}</span>
                  {/* At the 3-column cap only the pinned rows keep their pin (user 2026-08-28). */}
                  {col.pinned || pinnedCount < MAX_PINNED ? (() => {
                    const pinLabel = col.key === LOCKED ? `${col.label} is always pinned` : col.pinned ? `Unpin ${col.label}` : `Pin ${col.label}`
                    return (
                      <Tooltip label={pinLabel}>
                        <button
                          type="button"
                          className={styles.pinBtn}
                          data-pinned={col.pinned || undefined}
                          disabled={col.key === LOCKED}
                          aria-label={pinLabel}
                          onClick={() => setCol(col.key, !col.pinned && pinnedCount < MAX_PINNED ? { pinned: true, visible: true } : { pinned: false })}
                        >
                          <Icon name="push_pin" size={16} fill={col.pinned} />
                        </button>
                      </Tooltip>
                    )
                  })() : <span className={styles.pinSlot} aria-hidden />}
                  <span className={styles.spacer} />
                  <Switch
                    isSelected={col.visible}
                    isDisabled={col.pinned}
                    onChange={(v: boolean) => setCol(col.key, { visible: v })}
                    aria-label={`Show ${col.label} column`}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
          <div className={styles.foot}>
            <Button variant="secondary" appearance="outlined" onPress={() => setDraft(DEFAULT_COLUMNS)}>
              Reset to default
            </Button>
            <Button onPress={() => onSave(normalise(draft))}>Save</Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
