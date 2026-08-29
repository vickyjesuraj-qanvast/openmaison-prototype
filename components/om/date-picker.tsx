'use client'

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from './icon'
import { Tooltip } from './tooltip'
import { anchoredSurface } from '@/lib/motion'
import styles from './date-picker.module.css'

/**
 * Date picker (789:84100 — Material "Desktop Date Picker", 256×284): month
 * header with a year switch and prev/next, Monday-first weekday row, 6-row
 * day grid with today ring / selected fill / muted adjacent days. Anchored
 * under (or above) any field via `anchorRef`, portalled to the body at the
 * PortalMenu layer so it escapes popovers and modals. Esc is consumed here;
 * hosts check `e.defaultPrevented`.
 */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const WIDTH = 256, HEIGHT = 284, GAP = 4, EDGE = 8
const YEARS_PER_PAGE = 24

const sameDay = (a: Date | null | undefined, b: Date) => !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** 6 × 7 Monday-first grid for a month, padded with adjacent-month days (as in the mock). */
function gridFor(y: number, m: number) {
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(y, m, 1 - offset + i); return { date: d, inMonth: d.getMonth() === m } })
}

const subscribeNoop = () => () => {}
const PANEL_ID = 'om-date-picker'

/** Hosts call this on ArrowDown in the anchor field to hand keyboard focus to the open picker. */
export function focusDatePicker() {
  const root = document.getElementById(PANEL_ID)
  if (!root) return false
  const target = root.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? root.querySelector<HTMLButtonElement>('button[aria-current="date"]') ?? root.querySelector<HTMLButtonElement>('[data-days] button')
  target?.focus()
  return !!target
}

export function DatePicker({
  open, anchorRef, anchorKey = '', value, today, onSelect, onClose, label = 'Choose a date',
}: {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  /** Change this when the host points `anchorRef` at a different field while open (re-positions + re-seeds). */
  anchorKey?: string
  value: Date | null
  /** Day-granular "today" — passed in (never Date.now() in render). */
  today: Date
  onSelect: (date: Date) => void
  onClose: () => void
  label?: string
}) {
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const [seed, setSeed] = useState({ open, anchorKey })
  const [view, setView] = useState(() => { const b = value ?? today; return { y: b.getFullYear(), m: b.getMonth() } })
  const [mode, setMode] = useState<'days' | 'years'>('days')
  if (open !== seed.open || anchorKey !== seed.anchorKey) {   // re-seed on open and when the host swaps anchors (render-phase adjust)
    setSeed({ open, anchorKey })
    if (open) { const b = value ?? today; setView({ y: b.getFullYear(), m: b.getMonth() }); setMode('days') }
  }
  const panel = useRef<HTMLDivElement | null>(null)

  // Position from the anchor before paint (DOM write only); flips above when there is no room below.
  // A layout effect, not a callback ref: motion's ref wrapper only invokes the ref on mount.
  useLayoutEffect(() => {
    const el = panel.current, a = anchorRef.current
    if (!open || !el || !a) return
    const r = a.getBoundingClientRect()
    let top = r.bottom + GAP, flipped = false
    if (top + HEIGHT > window.innerHeight - EDGE) { top = Math.max(EDGE, r.top - GAP - HEIGHT); flipped = true }
    const left = Math.min(Math.max(EDGE, r.left), window.innerWidth - WIDTH - EDGE)
    el.style.top = `${top}px`
    el.style.left = `${left}px`
    el.style.transformOrigin = flipped ? 'bottom left' : 'top left'
  }, [open, anchorKey, anchorRef])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (panel.current?.contains(t) || anchorRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault(); e.stopPropagation()
      if (panel.current?.contains(document.activeElement)) anchorRef.current?.focus()   // keyboard users: focus goes back to the field
      onClose()
    }
    const onResize = () => onClose()
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('pointerdown', onDown, true); window.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize) }
  }, [open, onClose, anchorRef])

  const step = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const yearStart = view.y - 12

  // Arrow keys move focus across the day buttons (±1 / ±7); Enter / Space activate natively.
  const onDaysKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -7 : e.key === 'ArrowDown' ? 7 : 0
    if (!delta) return
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
    const i = buttons.indexOf(e.target as HTMLButtonElement)
    if (i < 0) return
    e.preventDefault()
    const next = i + delta
    if (next < 0) { step(-1); return }
    if (next >= buttons.length) { step(1); return }
    buttons[next]?.focus()
  }

  return isClient ? createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div ref={panel} id={PANEL_ID} className={styles.panel} role="dialog" aria-label={label} tabIndex={-1}
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit"
                    onPointerDown={(e) => e.preventDefault() /* keep the anchor field focused while picking with the mouse */}>
          <div className={styles.head}>
            <button type="button" className={styles.monthBtn} aria-expanded={mode === 'years'}
                    aria-label={mode === 'years' ? 'Back to days' : 'Choose a year'} onClick={() => setMode((m) => (m === 'days' ? 'years' : 'days'))}>
              {MONTHS[view.m]} {view.y}
              <Icon name="arrow_drop_down" size={24} fill className={mode === 'years' ? styles.flip : undefined} />
            </button>
            <span className={styles.pager}>
              <Tooltip label={mode === 'years' ? 'Earlier years' : 'Previous month'}>
                <button type="button" className={styles.pageBtn} aria-label={mode === 'years' ? 'Earlier years' : 'Previous month'}
                        onClick={() => (mode === 'years' ? setView((v) => ({ ...v, y: v.y - YEARS_PER_PAGE })) : step(-1))}>
                  <Icon name="chevron_left" size={20} />
                </button>
              </Tooltip>
              <Tooltip label={mode === 'years' ? 'Later years' : 'Next month'}>
                <button type="button" className={styles.pageBtn} aria-label={mode === 'years' ? 'Later years' : 'Next month'}
                        onClick={() => (mode === 'years' ? setView((v) => ({ ...v, y: v.y + YEARS_PER_PAGE })) : step(1))}>
                  <Icon name="chevron_right" size={20} />
                </button>
              </Tooltip>
            </span>
          </div>
          {mode === 'days' ? (
            <>
              <div className={styles.weekdays} aria-hidden>
                {WEEKDAYS.map((w, i) => <span key={i} className={styles.weekday}>{w}</span>)}
              </div>
              <div className={styles.grid} data-days onKeyDown={onDaysKey}>
                {gridFor(view.y, view.m).map(({ date, inMonth }) => (
                  <button key={date.getTime()} type="button" className={styles.day}
                          data-muted={!inMonth || undefined} data-today={sameDay(today, date) || undefined} data-selected={sameDay(value, date) || undefined}
                          aria-pressed={sameDay(value, date) || undefined} aria-current={sameDay(today, date) ? 'date' : undefined}
                          aria-label={`${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`}
                          onClick={() => onSelect(date)}>
                    {date.getDate()}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.years} role="listbox" aria-label="Year">
              {Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearStart + i).map((y) => (
                <button key={y} type="button" role="option" className={styles.year} aria-selected={y === view.y || undefined}
                        data-current={y === today.getFullYear() || undefined} data-selected={y === view.y || undefined}
                        onClick={() => { setView((v) => ({ ...v, y })); setMode('days') }}>
                  {y}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  ) : null
}
