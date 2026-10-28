'use client'

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Tag as TagChip } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { anchoredSurface } from '@/lib/motion'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import type { Tag } from '@/lib/db/schema'
import styles from './tag-picker.module.css'

/**
 * Add Tag dropdown (902:27363 frame 65 · picked state frame 54): the search field ("Search for any tags, hit enter to add",
 * keyboard_arrow_down) with the tag checklist beneath and a "Manage Tags" footer. Renders absolutely under its host's
 * positioned Tags head (12 below it, the drawer body's full 352). Typing filters; Enter on an exact name ticks it, Enter on
 * a new name calls `onCreate`; a picked tag shows as an outlined chip in the field (a press on it un-picks). Closes on an
 * outside press (pointerdown, capture — the anchor exempt, REG-153) and Esc (consumed, so the Drawer stays open).
 * Spec: design-source/context/lead-tasks/03-panel-tags.txt.
 */
export function TagPicker({
  open, tags, value, onChange, onManage, onClose, anchor = null, onCreate, position,
}: {
  open: boolean
  tags: Tag[]
  /** Ids of the task's tags. */
  value: string[]
  onChange: (ids: string[]) => void
  onManage: () => void
  onClose: () => void
  /** The "+ Add Tag" trigger — its own press toggles the picker instead of closing-and-reopening it (REG-153). */
  anchor?: HTMLElement | null
  /** Enter with text that matches no tag (the mock's "hit enter to add"). */
  onCreate?: (name: string) => void
  /** Fixed viewport placement (the table's tags cell, as AssignPopover); omitted → absolute under the host's positioned Tags head (the panel). */
  position?: { top: number; left: number } | null
}) {
  const [query, setQuery] = useState('')
  const sheet = useSheetLayout()   // (REG-378) ≤767 the picker is a bottom sheet
  const [focused, setFocused] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fresh search on every open — render-phase adjust pattern (as AssignPopover).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null
      if (!t) return
      if (anchor?.contains(t) || ref.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('keydown', onKey, true)   // capture: the open picker owns Esc before the Drawer
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)   // capture: DS buttons stop pointerdown propagation
    return () => {
      document.removeEventListener('keydown', onKey, true)
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [open, onClose, anchor])

  const q = query.trim().toLowerCase()
  const rows = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags
  const picked = tags.filter((t) => value.includes(t.id))

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const name = query.trim()
    if (!name) return
    const exact = tags.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (exact) { if (!value.includes(exact.id)) onChange([...value, exact.id]) }
    else onCreate?.(name)
    setQuery('')
  }

  const body = (
    <>
          <div className={styles.field} data-active={focused || undefined} onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); inputRef.current?.focus() } }}>
            {/* The input holds the top line and the picked tags flow beneath it, so the field grows downwards instead
                of squeezing the input further right with every tag added (user 2026-08-30). */}
            <div className={styles.fieldTop}>
            <input
              ref={inputRef} className={styles.input} type="text" autoFocus
              placeholder="Search for any tags, hit enter to add" aria-label="Search for any tags, hit enter to add"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={onInputKey}
            />
            <span className={styles.chevron} aria-hidden><Icon name="keyboard_arrow_down" size={16} /></span>
            </div>
            {picked.length > 0 ? (
              <div className={styles.picked}>
                {picked.map((t) => (
                  <button key={t.id} type="button" className={styles.chip} aria-label={`Remove ${t.name}`} onClick={() => toggle(t.id)}>
                    <TagChip appearance="outlined" iconEnd={<Icon name="close" size={12} />}>{t.name}</TagChip>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className={styles.list}>
            <div className={styles.rows} role="group" aria-label="Tags">
              {rows.map((t) => {
                const checked = value.includes(t.id)
                return (
                  <button key={t.id} type="button" role="checkbox" aria-checked={checked} className={styles.row} onClick={() => toggle(t.id)}>
                    <span className={styles.check}><Icon name={checked ? 'check_box' : 'check_box_outline_blank'} size={20} fill={checked} /></span>
                    <span className={styles.rowName}>{t.name}</span>
                  </button>
                )
              })}
            </div>
            <div className={styles.rule} />
            <div className={styles.foot}>
              <button type="button" className={styles.link} onClick={onManage}>Manage tags</button>
            </div>
          </div>
    </>
  )

  /* (REG-378) ≤767 this is a bottom sheet like every other anchored surface (REG-353). Anchored inside the task
     panel's scrolling body it had no heading, no close, and its own footer fell below the fold; the Sheet portals
     to the document so nothing can clip it. ≥768 keeps the anchored picker byte-for-byte. */
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title="Tags"
             footer={<button type="button" className={styles.link} onClick={onManage}>Manage tags</button>}>
        <div className={styles.sheetBody}>{body}</div>
      </Sheet>
    )
  }

  return (
    <AnimatePresence>
      {open && position !== null ? (
        <motion.div ref={ref} className={styles.picker} role="dialog" aria-label="Add tag"
                    data-fixed={position ? '' : undefined}
                    style={position ? { position: 'fixed', top: position.top, left: position.left, width: 352 } : undefined}
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit">
          {body}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
