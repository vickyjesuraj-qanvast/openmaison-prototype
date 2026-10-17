'use client'

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from './icon'
import { Tooltip } from './tooltip'
import { anchoredSurface } from '@/lib/motion'
import { PortalMenu } from './portal-menu'
import { Sheet, useSheetLayout } from './sheet'
import menuStyles from '@/components/leads/menus.module.css'
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
const WIDTH = 256, TIME_WIDTH = 296, HEIGHT = 284, TIME_HEIGHT = 340, GAP = 4, EDGE = 8   // date-only = the mock; with time: + 56px time row
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))   // every minute (user 2026-08-29)
const PERIODS = ['AM', 'PM'] as const
const YEARS_PER_PAGE = 24

const sameDay = (a: Date | null | undefined, b: Date) => !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** 6 × 7 Monday-first grid for a month, padded with adjacent-month days (as in the mock). */
function gridFor(y: number, m: number) {
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(y, m, 1 - offset + i); return { date: d, inMonth: d.getMonth() === m } })
}

const subscribeNoop = () => () => {}
/** Anchors may be a field box (DateField) rather than the focusable control itself. */
function focusAnchor(a: HTMLElement | null) {
  if (!a) return
  const t = a.matches('button,input,[tabindex]') ? a : a.querySelector<HTMLElement>('button,input,[tabindex]')
  ;(t ?? a).focus()
}
const PANEL_ID = 'om-date-picker'

/** Hosts call this on ArrowDown in the anchor field to hand keyboard focus to the open picker. */
export function focusDatePicker() {
  const root = document.getElementById(PANEL_ID)
  if (!root) return false
  const target = root.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? root.querySelector<HTMLButtonElement>('button[aria-current="date"]') ?? root.querySelector<HTMLButtonElement>('[data-days] button')
  target?.focus()
  return !!target
}

/** (fix-D, D-32) A day before `min` or after `max` (day-granular). */
const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const outside = (d: Date, min: Date | null, max: Date | null) => (!!min && dayOf(d) < dayOf(min)) || (!!max && dayOf(d) > dayOf(max))

export function DatePicker({
  open, anchorRef, anchorKey = '', value, today, onSelect, onClose, label = 'Choose a date', withTime = false, defaultHour = 10, defaultNow = false, min = null, max = null,
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
  /** Adds an hour / minute / AM-PM row under the grid (no mock — REG-119). Picking a day keeps the picker open; Done closes it. */
  withTime?: boolean
  /** Hour applied to a freshly picked day when the field had no time yet. */
  defaultHour?: number
  /** (UX audit 2026-09-30, L9) Opt-in: a freshly picked day takes the time it is NOW instead of `defaultHour` — a contact or meeting
      log records when it happened, and a silent 10:00 AM put a 12:21 PM call before the lead existed. Read at the press, never in render. */
  defaultNow?: boolean
  /** (fix-D, D-32) Days that can't be picked are greyed and refuse the press — e.g. a payment's day is never in the future. Day-granular. */
  min?: Date | null
  max?: Date | null
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
  /* (REG-728) ≤767 the picker is a bottom sheet, as every other picker on a phone (REG-353; the owner, 2026-09-29, "as recommended"):
     the same calendar in the house Sheet — its head, grabber, scrim — instead of a 256px card anchored to a field. The close rules
     below hold as they are: a press outside the calendar (the scrim, the sheet's close) closes it, as does Esc. */
  const sheet = useSheetLayout()

  // Position from the anchor before paint (DOM write only); flips above when there is no room below.
  // A layout effect, not a callback ref: motion's ref wrapper only invokes the ref on mount.
  useLayoutEffect(() => {
    const el = panel.current, a = anchorRef.current
    if (!open || !el || !a || sheet) return   // a sheet sits on the bottom edge: nothing to anchor
    const r = a.getBoundingClientRect()
    let top = r.bottom + GAP, flipped = false
    const height = withTime ? TIME_HEIGHT : HEIGHT, width = withTime ? TIME_WIDTH : WIDTH
    if (top + height > window.innerHeight - EDGE) { top = Math.max(EDGE, r.top - GAP - height); flipped = true }
    const left = Math.min(Math.max(EDGE, r.left), window.innerWidth - width - EDGE)
    el.style.top = `${top}px`
    el.style.left = `${left}px`
    el.style.transformOrigin = flipped ? 'bottom left' : 'top left'
  }, [open, anchorKey, anchorRef, withTime, sheet])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (panel.current?.contains(t) || anchorRef.current?.contains(t)) return
      if (t instanceof Element && t.closest('[data-om-menu]')) return   // the time row's option menus live in their own portal
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      /* (REG-286, a11y audit "anchored popovers are unreachable by keyboard"): the panel is portalled to the end
         of <body>, so tabbing out of it landed past the whole page. Close it and put focus back on the field —
         no preventDefault, so the browser's own Tab carries on from there. (Focus inside the time row's portalled
         option menu is not inside the panel: PortalMenu handles its own Tab.) */
      if (e.key === 'Tab') {
        if (panel.current?.contains(document.activeElement)) { focusAnchor(anchorRef.current); onClose() }
        return
      }
      if (e.key !== 'Escape') return
      if (document.querySelector('[data-om-menu]')) return   // an open time-row menu consumes Esc first
      e.preventDefault(); e.stopPropagation()
      if (panel.current?.contains(document.activeElement)) focusAnchor(anchorRef.current)   // keyboard users: focus goes back to the field
      onClose()
    }
    // The anchor scrolls with its container while the panel is fixed — close rather than float away (as PortalMenu does).
    const onScroll = (e: Event) => {
      const t = e.target
      if (t instanceof Node && panel.current?.contains(t)) return
      if (t instanceof Element && t.closest('[data-om-menu]')) return
      onClose()
    }
    const onResize = () => onClose()
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('scroll', onScroll, true)
    return () => { window.removeEventListener('pointerdown', onDown, true); window.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize); document.removeEventListener('scroll', onScroll, true) }
  }, [open, onClose, anchorRef])

  /* (REG-286) Focus restore. Picking a day with Enter closed the picker with focus still on that day button, and
     the panel then unmounted — focus fell to <body> and the next Tab restarted from the top of the page. Its own
     effect, keyed on `open` alone: hosts pass an inline `onClose`, so a cleanup that depended on it would fire on
     every re-render and yank focus out of the grid mid-use. */
  useEffect(() => {
    if (!open) return
    const el = panel.current
    // The anchor is read at CLOSE time on purpose — the host may re-point `anchorRef` at another field while the
    // picker stays open (`anchorKey`), so the field focus goes back to is the one it is anchored to then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { if (el?.contains(document.activeElement)) focusAnchor(anchorRef.current) }
  }, [open, anchorRef])

  // Time row: edits apply to the current value (or today at defaultHour when nothing is picked yet).
  const base = () => {
    const d = value ? new Date(value) : new Date(today)
    if (!value) { if (defaultNow) { const n = new Date(); d.setHours(n.getHours(), n.getMinutes(), 0, 0) } else d.setHours(defaultHour, 0, 0, 0) }
    return d
  }
  const withDay = (day: Date) => { const d = new Date(day); const b = base(); d.setHours(b.getHours(), b.getMinutes(), 0, 0); return d }
  const setHour12 = (h: string) => { const d = base(); const pm = d.getHours() >= 12; d.setHours((Number(h) % 12) + (pm ? 12 : 0)); onSelect(d) }
  const setMinute = (m: string) => { const d = base(); d.setMinutes(Number(m)); onSelect(d) }
  const setPeriod = (p: string) => { const d = base(); const h = d.getHours() % 12; d.setHours(h + (p === 'PM' ? 12 : 0)); onSelect(d) }
  /** Today CTA (invented — REG-125): date-only picks today and lets the host close; with time it keeps the time and stays open. */
  const pickToday = () => {
    setView({ y: today.getFullYear(), m: today.getMonth() }); setMode('days')
    if (withTime) onSelect(withDay(today)); else onSelect(today)
  }
  const cur = value ?? null
  const hour12 = cur ? String(cur.getHours() % 12 || 12) : ''
  const minute = cur ? String(cur.getMinutes()).padStart(2, '0') : ''
  const period = cur ? (cur.getHours() >= 12 ? 'PM' : 'AM') : ''
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

  const body = (
    <>
    <div className={styles.head}>
      <button type="button" className={styles.monthBtn} aria-expanded={mode === 'years'}
              aria-label={mode === 'years' ? 'Back to days' : 'Choose a year'} onClick={() => setMode((m) => (m === 'days' ? 'years' : 'days'))}>
        {MONTHS[view.m]} {view.y}
        <Icon name="arrow_drop_down" size={24} fill className={mode === 'years' ? styles.flip : undefined} />
      </button>
      <span className={styles.pager}>
        <Tooltip label="Today">
          <button type="button" className={styles.pageBtn} aria-label="Today" onClick={pickToday}>
            <Icon name="today" size={20} />
          </button>
        </Tooltip>
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
            <button key={date.getTime()} type="button" className={styles.day} disabled={outside(date, min, max) || undefined}
                    data-muted={!inMonth || undefined} data-today={sameDay(today, date) || undefined} data-selected={sameDay(value, date) || undefined}
                    aria-pressed={sameDay(value, date) || undefined} aria-current={sameDay(today, date) ? 'date' : undefined}
                    aria-label={`${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`}
                    onClick={() => onSelect(withTime ? withDay(date) : date)}>
              <span>{date.getDate()}</span>{/* wrapped: the ::before fill would otherwise paint over a bare text node */}
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
    {withTime && mode === 'days' ? (
      <div className={styles.timeRow} role="group" aria-label="Time">
        <TimeSelect label="Hour" value={hour12} options={HOURS} placeholder="hh" onChange={setHour12} />
        <span className={styles.colon} aria-hidden>:</span>
        <TimeSelect label="Minute" value={minute} options={MINUTES} placeholder="mm" onChange={setMinute} />
        <TimeSelect label="AM or PM" value={period} options={PERIODS} placeholder="AM" onChange={setPeriod} />
        <button type="button" className={styles.done} onClick={() => { focusAnchor(anchorRef.current); onClose() }}>Done</button>
      </div>
    ) : null}
    </>
  )
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title={label}>
        <div ref={panel} id={PANEL_ID} className={styles.sheetPanel} data-time={withTime || undefined} role="group" aria-label={label}
             onPointerDown={(e) => e.preventDefault() /* keep the anchor field focused while picking */}>
          {body}
        </div>
      </Sheet>
    )
  }
  return isClient ? createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div ref={panel} id={PANEL_ID} className={styles.panel} data-time={withTime || undefined} role="dialog" aria-label={label} tabIndex={-1}
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit"
                    onPointerDown={(e) => e.preventDefault() /* keep the anchor field focused while picking with the mouse */}>
          {body}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  ) : null
}

/** Compact select for the time row — a bordered 32px trigger with the shared PortalMenu. */
function TimeSelect({ label, value, options, placeholder, onChange }: { label: string; value: string; options: readonly string[]; placeholder: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement | null>(null)
  return (
    <>
      <button ref={ref} type="button" className={styles.timeSelect} aria-label={label} aria-expanded={open} aria-haspopup="listbox"
              data-empty={!value || undefined} onClick={() => setOpen((o) => !o)}
              onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } }}>
        {value || placeholder}
        <Icon name="expand_more" size={16} className={open ? styles.flip : undefined} />
      </button>
      <PortalMenu open={open} anchor={ref} onClose={() => setOpen(false)} width={72}>
        {options.map((o) => (
          <button key={o} type="button" role="option" aria-selected={o === value} className={menuStyles.item} data-selected={o === value || undefined}
                  ref={o === value ? (el) => { const m = el?.parentElement; if (el && m) m.scrollTop = el.offsetTop - m.clientHeight / 2 + el.offsetHeight / 2 } : undefined}
                  onClick={() => { onChange(o); setOpen(false) }}>
            {o}
          </button>
        ))}
      </PortalMenu>
    </>
  )
}
