'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'   // (REG-1060) the payment and the move, as the house chip
import { PortalMenu } from '@/components/om/portal-menu'
import { SideScrollbar } from '@/components/om/side-scrollbar'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'   // (gaps build, package C — 13) the name column's handle
import { spring } from '@/lib/motion'
import { SCHEDULE_KEYS } from '@/lib/keys/registry'
import { useShortcutsHere } from '@/lib/keys/store'
import {
  DAY_MS, MILESTONE_STATUSES, STATUS_LABEL, colorOf, dayLabel, dayMonth, isLate, linkLines, mondayOf, moveWith, paymentDay, payShareWord, rangeLabel, rowLine, spanWord,
  type ClientLayer, type Milestone, type MilestoneStatus, type PaymentOption,
} from '@/lib/projects/schedule-model'
import styles from './schedule.module.css'

export type Zoom = 'weeks' | 'months'
export type RowAction = { kind: 'open' | 'rename' | 'up' | 'down' | 'delete' | 'add-after' } | { kind: 'status'; status: MilestoneStatus }
type Mode = 'move' | 'start' | 'end'
type Drag = { id: string; mode: Mode; x0: number; scroll0: number; pxPerDay: number; dx: number; pointerId: number | null; moved: boolean; lifted: boolean; touch: boolean }

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const utc = (n: number) => new Date(n * DAY_MS)
const firstOfMonth = (n: number) => { const u = utc(n); return Math.round(Date.UTC(u.getUTCFullYear(), u.getUTCMonth(), 1) / DAY_MS) }
const nextMonth = (n: number) => { const u = utc(n); return Math.round(Date.UTC(u.getUTCFullYear(), u.getUTCMonth() + 1, 1) / DAY_MS) }
/** (B-30) Months zooms out to whole quarters: the first of the quarter, and the first of the next quarter. */
const firstOfQuarter = (n: number) => { const u = utc(n); return Math.round(Date.UTC(u.getUTCFullYear(), u.getUTCMonth() - (u.getUTCMonth() % 3), 1) / DAY_MS) }
const nextQuarter = (n: number) => { const u = utc(firstOfQuarter(n)); return Math.round(Date.UTC(u.getUTCFullYear(), u.getUTCMonth() + 3, 1) / DAY_MS) }
/** The day width each scale keeps at least (px): a whole-home job (~15 weeks) fits a 1440 screen in Weeks, as the canvas draws it; Months
    shows its quarters in less room. */
const DAY_PX: Record<Zoom, number> = { weeks: 7, months: 2 }
const STATUS_ICON: Record<MilestoneStatus, string> = { done: 'check_circle', in_progress: 'radio_button_checked', blocked: 'pending', not_started: 'radio_button_unchecked' }
/** (B-56) The room a head label needs (px): a week's "28 Sep", a month's "Sep 2026". */
const WEEK_LABEL_PX = 40, MONTH_LABEL_PX = 64
/** (B-50) On touch a bar lifts after a press held this long without moving — a swipe that starts on a bar scrolls the timeline. */
const LIFT_MS = 350
/** (B-32) Near the scroller's visible edge a drag scrolls the timeline (px from the frozen columns, px per frame at most). */
const EDGE_PX = 48, EDGE_STEP = 14
const NAME_W = 360, ACT_W = 140
/** (gaps build, package C — 13) The name column's width: dragged between these (1.0's 180–400); REG-430 keeps a dragged width while the
    schedule is on screen, never across a reload. */
const NAME_MIN = 180, NAME_MAX = 400
/** The bar's middle in its 64 row (top 22 + half its 20). */
const BAR_MID = 32

/** A move's dates from the drag's whole days. */
function datesOf(m: Milestone, mode: Mode, days: number): { start: number; end: number } {
  if (mode === 'move') return { start: m.start + days, end: m.end + days }
  if (mode === 'start') return { start: Math.min(m.start + days, m.end), end: m.end }
  return { start: m.start, end: Math.max(m.end + days, m.start) }
}

/**
 * (Projects round 2 · Main.dc.html · Moved.dc.html) The list that is also the timeline: each row carries its own bar, to scale — calendar days,
 * weekends shaded, today's line, Weeks or Months. The name column and the actions stay put while the timeline scrolls sideways (the table core's
 * frozen columns, REG-727) on the house sideways bar (REG-570). A bar is pressed to open its milestone; dragged to move it, or by an end to
 * change that date — the dates show while it moves and snap to whole days, whatever moves with it moves along, the range grows and the timeline
 * scrolls at its edge, Escape puts it back, and on release it settles on the house spring (the kanban's drop, `spring.settle`). On touch a bar
 * lifts after a long press, so a swipe scrolls. The arrow keys move a focused bar a day (Shift: a week; Alt: its end). A dashed outline is where
 * the client last saw it. Each row is a real box across the grid (a subgrid), so J / K and ↵ walk the milestones as on every list.
 */
export function ScheduleTimeline({ list, zoom, today, was, payments, decider, waitingWho, client, mayChange, fresh, todayTick, onOpen, onMove, onAction, moreTo, onReorderTo, crewLine }: {
  /** (S45B · H-UHD-2) a milestone's crew words for its line, or its gap */
  crewLine?: (milestoneId: string) => { text: string; warn: boolean } | null
  list: Milestone[]
  zoom: Zoom
  today: number
  /** The dates the client last saw, where they differ (the dashed outline, "+7 days"). */
  was: Map<string, { start: number; end: number }>
  payments: PaymentOption[] | null
  decider: string | null
  waitingWho: (m: Milestone) => string | null
  /** (r4b) Layer 6 — what the client has of a milestone (shared as done, their answer), for its line. */
  client?: (m: Milestone) => ClientLayer | null
  mayChange: boolean
  /** A milestone just added or moved here: brought into view and pulsed once. */
  fresh: string | null
  /** Changes when Today is pressed: the timeline scrolls today into view. */
  todayTick: number
  onOpen: (m: Milestone) => void
  onMove: (m: Milestone, to: { start: number; end: number }) => void
  onAction: (m: Milestone, a: RowAction) => void
  /** (gaps build, package C — 5) the last day more time is asked for on a milestone, for its line */
  moreTo?: (m: Milestone) => number | null
  /** (gaps build, package C — 13) a row dragged to a new place in the list (its index there) */
  onReorderTo?: (m: Milestone, index: number) => void
}) {
  useShortcutsHere(SCHEDULE_KEYS)   // the ? panel lists the bars' own keys while the Schedule is open
  /* (gaps build, package C — 13) the name column's width, as its head's handle left it */
  const widths = useColumnWidths('schedule')
  const nameW = Math.max(NAME_MIN, Math.min(NAME_MAX, widths.name ?? NAME_W))

  /* ── dragging ── */
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  useEffect(() => { dragRef.current = drag }, [drag])
  const dragged = drag ? list.find((m) => m.id === drag.id) ?? null : null
  const snap = drag ? Math.round(drag.dx) : 0
  const target = dragged && drag?.moved ? datesOf(dragged, drag.mode, snap) : null

  /* the range: a little before the first start (or today) to a little after the last end, whole weeks — or whole quarters in Months;
     (B-32) a drag past either end grows it, at the day width the drag started with */
  const { from, n, months, weeks } = useMemo(() => {
    const extra = target ? [target.start, target.end] : []
    const lo = Math.min(today, ...list.map((m) => m.start), ...[...was.values()].map((w) => w.start), ...extra) - 3
    const hi = Math.max(today, ...list.map((m) => m.end), ...[...was.values()].map((w) => w.end), ...extra) + 10
    const f = zoom === 'weeks' ? mondayOf(lo) : firstOfQuarter(lo)
    const t = zoom === 'weeks' ? mondayOf(hi) + 6 : nextQuarter(hi) - 1
    const ms: { at: number; label: string }[] = []
    for (let d = firstOfMonth(f); d <= t; d = nextMonth(d)) { const u = utc(d); ms.push({ at: Math.max(d, f), label: u.getUTCMonth() === 0 || ms.length === 0 ? `${MON[u.getUTCMonth()]} ${u.getUTCFullYear()}` : MON[u.getUTCMonth()]! }) }
    const ws: { at: number; label: string }[] = []
    if (zoom === 'weeks') for (let d = f; d <= t; d += 7) ws.push({ at: d, label: dayMonth(d) })
    return { from: f, n: t - f + 1, months: ms, weeks: ws }
  }, [list, was, today, zoom, target?.start, target?.end])   // eslint-disable-line react-hooks/exhaustive-deps
  const pct = (d: number) => `${((d - from) / n) * 100}%`
  const width = (a: number, b: number) => `${((b - a + 1) / n) * 100}%`
  const payBy = useMemo(() => new Map((payments ?? []).map((p) => [p.ref, p])), [payments])

  const preview = useMemo(() => (dragged && target ? moveWith(list, dragged.id, target.start, target.end) : null), [list, dragged, target?.start, target?.end])   // eslint-disable-line react-hooks/exhaustive-deps
  const shownOf = useMemo(() => new Map((preview?.list ?? list).map((m) => [m.id, m])), [preview, list])
  const following = useMemo(() => new Set(preview?.followed ?? []), [preview])
  /* Escape puts a dragged bar back where it was */
  useEffect(() => {
    if (!drag) return
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDrag(null) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [drag])

  const scroller = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const comp = useRef(0)
  const liftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const down = (e: ReactPointerEvent<HTMLElement>, m: Milestone, mode: Mode) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const track = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-track]')
    if (!track) return
    const touch = e.pointerType === 'touch'
    const d: Drag = { id: m.id, mode, x0: e.clientX, scroll0: scroller.current?.scrollLeft ?? 0, pxPerDay: track.getBoundingClientRect().width / n, dx: 0, pointerId: e.pointerId, moved: false, lifted: !touch && mayChange, touch }
    pointer.current = e.clientX
    comp.current = 0
    if (mayChange && !touch) { try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* a synthetic event */ } }
    setDrag(d)
    /* (B-50) a finger lifts the bar only after a still, long press — before it, a swipe belongs to the scroller */
    if (touch && mayChange) {
      if (liftTimer.current) clearTimeout(liftTimer.current)
      liftTimer.current = setTimeout(() => { const cur = dragRef.current; if (cur && cur.id === m.id && !cur.moved) { if (navigator.vibrate) navigator.vibrate(10); setDrag({ ...cur, lifted: true }) } }, LIFT_MS)
    }
  }
  const moveP = (e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    pointer.current = e.clientX
    const px = e.clientX - d.x0
    if (!d.lifted) { if (Math.abs(px) > 8) { if (liftTimer.current) clearTimeout(liftTimer.current); setDrag(null) } return }   // a swipe: the scroller has it
    const scrolled = (scroller.current?.scrollLeft ?? 0) - d.scroll0 - comp.current
    setDrag({ ...d, dx: (px + scrolled) / d.pxPerDay, moved: d.moved || Math.abs(px) > 3 })
  }
  const up = (e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    if (liftTimer.current) clearTimeout(liftTimer.current)
    const m = list.find((x) => x.id === d.id)
    setDrag(null)
    if (!m) return
    if (!d.moved) { onOpen(m); return }
    const days = Math.round(d.dx)
    if (days !== 0) onMove(m, datesOf(m, d.mode, days))
  }
  /* (B-50) once lifted by a finger, the page stays still under it */
  useEffect(() => {
    if (!drag?.lifted) return
    const hold = (e: TouchEvent) => { if (e.cancelable) e.preventDefault() }
    document.addEventListener('touchmove', hold, { passive: false })
    return () => document.removeEventListener('touchmove', hold)
  }, [drag?.lifted])
  /* (B-32) the timeline scrolls while a dragged bar rides its visible edge; the drag keeps its day under the pointer */
  const dragging = !!drag?.moved
  useEffect(() => {
    if (!dragging) return
    let raf = 0
    const tick = () => {
      const el = scroller.current, d = dragRef.current, x = pointer.current
      if (el && d && x !== null) {
        const r = el.getBoundingClientRect()
        const left = r.left + nameW, right = r.right - ACT_W
        const step = x < left + EDGE_PX ? -Math.ceil(((left + EDGE_PX - x) / EDGE_PX) * EDGE_STEP) : x > right - EDGE_PX ? Math.ceil(((x - (right - EDGE_PX)) / EDGE_PX) * EDGE_STEP) : 0
        if (step) {
          const before = el.scrollLeft
          el.scrollLeft = before + step
          const moved = el.scrollLeft - before
          if (moved) { const cur = dragRef.current!; const next = { ...cur, dx: cur.dx + moved / cur.pxPerDay }; dragRef.current = next; setDrag(next) }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [dragging, nameW])
  /* (B-32) when the range grows to the left, everything shifts right by the new days: scroll by as much, so the bar stays under the pointer
     (`comp` keeps that scroll out of the pointer's travel) */
  const fromRef = useRef(from)
  useLayoutEffect(() => {
    const el = scroller.current, d = dragRef.current
    if (el && d?.moved && from !== fromRef.current) {
      const before = el.scrollLeft
      el.scrollLeft = before + (fromRef.current - from) * d.pxPerDay
      comp.current += el.scrollLeft - before
    }
    fromRef.current = from
  }, [from])

  /* ── the keyboard on a focused bar: ← → a day, Shift a week, Alt its end; held moves gather and land once ── */
  const [kb, setKb] = useState<{ id: string; mode: Mode; days: number } | null>(null)
  const kbTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kbPreview = useMemo(() => { const m = kb ? list.find((x) => x.id === kb.id) : null; return m && kb ? moveWith(list, m.id, datesOf(m, kb.mode, kb.days).start, datesOf(m, kb.mode, kb.days).end) : null }, [kb, list])
  const commitKb = (k: { id: string; mode: Mode; days: number }) => { const m = list.find((x) => x.id === k.id); setKb(null); if (m && k.days) onMove(m, datesOf(m, k.mode, k.days)) }
  const onBarKey = (e: KeyboardEvent<HTMLElement>, m: Milestone) => {
    if (e.key === 'Enter') { e.preventDefault(); if (kb) { if (kbTimer.current) clearTimeout(kbTimer.current); commitKb(kb) } else onOpen(m); return }
    if (e.key === 'Escape' && kb) { e.preventDefault(); e.stopPropagation(); if (kbTimer.current) clearTimeout(kbTimer.current); setKb(null); return }
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || !mayChange) return
    e.preventDefault()
    const step = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 7 : 1)
    const mode: Mode = e.altKey ? 'end' : 'move'
    const next = { id: m.id, mode, days: kb && kb.id === m.id && kb.mode === mode ? kb.days + step : step }
    setKb(next)
    if (kbTimer.current) clearTimeout(kbTimer.current)
    kbTimer.current = setTimeout(() => commitKb(next), 700)
  }
  useEffect(() => () => { if (kbTimer.current) clearTimeout(kbTimer.current); if (liftTimer.current) clearTimeout(liftTimer.current) }, [])
  const kbOf = useMemo(() => new Map((kbPreview?.list ?? []).map((m) => [m.id, m])), [kbPreview])

  /* ── the track's width, for the heads' labels (B-56) ── */
  const [trackW, setTrackW] = useState(0)
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[data-scale]')
    if (!el) return
    const ro = new ResizeObserver(() => setTrackW(el.getBoundingClientRect().width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pxDay = trackW ? trackW / n : DAY_PX[zoom]
  /* a month label is dropped when the next one starts too close (a range that opens late in a month: "Sep 2026 Oct") */
  const monthsShown = months.filter((mo, i) => { const nx = months[i + 1]; return !nx || (nx.at - mo.at) * pxDay >= MONTH_LABEL_PX })
  /* week labels thin out when the weeks are narrow, and never run past the track's end */
  const every = pxDay * 7 >= WEEK_LABEL_PX ? 1 : pxDay * 14 >= WEEK_LABEL_PX ? 2 : 4
  const weeksShown = weeks.filter((w, i) => i % every === 0 && (w.at - from) * pxDay + WEEK_LABEL_PX <= (trackW || Infinity))

  /* ── Today, and a fresh row brought into view ── */
  const scrollToday = (smooth: boolean) => {
    const el = scroller.current
    const track = el?.querySelector<HTMLElement>('[data-track]')
    if (!el || !track) return
    /* (B-31) today lands about a third of the way into the visible timeline — on arrival too, wherever it is */
    const x = track.offsetLeft + ((today - from + 0.5) / n) * track.offsetWidth
    const visible = el.clientWidth - nameW - ACT_W
    el.scrollTo({ left: Math.max(0, x - nameW - visible / 3), behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' })
  }
  const scrollRef = useRef(scrollToday); useEffect(() => { scrollRef.current = scrollToday })
  useEffect(() => { scrollRef.current(todayTick > 0) }, [todayTick, zoom])
  useEffect(() => {
    if (!fresh) return
    const row = scroller.current?.querySelector<HTMLElement>(`[data-kb-id="${CSS.escape(fresh)}"]`)
    const r = row?.getBoundingClientRect()
    if (row && r && (r.top < 0 || r.bottom > window.innerHeight - 64)) row.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [fresh])

  /* (B-32) while dragging, the grid keeps the day width the drag started with, so a growing range widens it instead of squeezing the bars */
  const vars = { '--tl-min': drag?.moved ? `${n * drag.pxPerDay}px` : `${n * DAY_PX[zoom]}px`, '--week': `${(7 / n) * 100}%`, '--name-w': `${nameW}px` } as CSSProperties
  const todayLeft = `calc(${pct(today)} + ${(0.5 / n) * 100}%)`

  /* ── (gaps build, package C — 13) a row dragged by its grip: it lifts, follows the pointer, a line shows where it lands; Escape puts it back ── */
  const [lift, setLift] = useState<{ id: string; from: number; to: number; dy: number; y0: number; pointerId: number } | null>(null)
  const liftRef = useRef(lift); useEffect(() => { liftRef.current = lift }, [lift])
  const rowsAt = useRef<{ top: number; height: number }[]>([])
  const grab = (e: ReactPointerEvent<HTMLElement>, m: Milestone, i: number) => {
    if (e.button !== 0 || !mayChange || !onReorderTo) return
    e.preventDefault(); e.stopPropagation()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* a synthetic event */ }
    rowsAt.current = [...(gridRef.current?.querySelectorAll<HTMLElement>('[data-kb-row]') ?? [])].map((el) => ({ top: el.getBoundingClientRect().top, height: el.getBoundingClientRect().height }))
    setLift({ id: m.id, from: i, to: i, dy: 0, y0: e.clientY, pointerId: e.pointerId })
  }
  const slide = (e: ReactPointerEvent<HTMLElement>) => {
    const l = liftRef.current
    if (!l || l.pointerId !== e.pointerId) return
    const dy = e.clientY - l.y0
    const me = rowsAt.current[l.from]
    const mid = me ? me.top + me.height / 2 + dy : e.clientY
    let to = 0
    rowsAt.current.forEach((r, i) => { if (i !== l.from && mid > r.top + r.height / 2) to = i >= l.from ? i : i + 1 })
    if (mid <= (rowsAt.current[0]?.top ?? 0) + (rowsAt.current[0]?.height ?? 0) / 2) to = 0
    setLift({ ...l, dy, to: Math.max(0, Math.min(list.length - 1, to)) })
  }
  const drop = (e: ReactPointerEvent<HTMLElement>) => {
    const l = liftRef.current
    if (!l || l.pointerId !== e.pointerId) return
    setLift(null)
    const m = list.find((x) => x.id === l.id)
    if (m && l.to !== l.from) onReorderTo?.(m, l.to)
  }
  useEffect(() => {
    if (!lift) return
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setLift(null) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [lift])
  const dropMark = (i: number): 'before' | 'after' | undefined => (!lift || lift.to === lift.from || i !== lift.to ? undefined : lift.to < lift.from ? 'before' : 'after')

  /* ── (gaps build, package C — 6) the links, drawn from where each bar ends to where the one waiting starts ── */
  const gridRef = useRef<HTMLDivElement>(null)
  const [rowTops, setRowTops] = useState<number[]>([])
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const measure = () => {
      const rows = [...grid.querySelectorAll<HTMLElement>('[data-kb-row]')]
      const head = rows[0]?.offsetTop ?? 0
      const next = rows.map((r) => r.offsetTop - head)
      setRowTops((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(grid)
    return () => ro.disconnect()
  }, [list.length])
  const shownList = list.map((m0) => kbOf.get(m0.id) ?? shownOf.get(m0.id) ?? m0)
  const lines = linkLines(shownList)
  const lit = useMemo(() => new Set([...(preview?.followed ?? []), ...(kbPreview?.followed ?? []), ...(drag ? [drag.id] : []), ...(kb ? [kb.id] : [])]), [preview, kbPreview, drag, kb])
  const xOf = (d: number) => ((d - from) / n) * trackW
  const linkPaths = trackW && rowTops.length === list.length ? lines.flatMap((ln) => {
    const a = shownList.findIndex((x) => x.id === ln.from), b = shownList.findIndex((x) => x.id === ln.to)
    if (a < 0 || b < 0) return []
    const A = shownList[a]!, B = shownList[b]!
    const x1 = xOf(A.end + 1), y1 = rowTops[a]! + BAR_MID, x2 = xOf(B.start), y2 = rowTops[b]! + BAR_MID
    const down = y2 > y1 ? 1 : -1
    const mid = rowTops[b]! + (down > 0 ? 6 : 58)
    const d = x2 - 6 >= x1 + 6
      ? `M ${x1} ${y1} H ${x1 + 6} V ${y2} H ${x2 - 4}`
      : `M ${x1} ${y1} H ${x1 + 6} V ${mid} H ${x2 - 10} V ${y2} H ${x2 - 4}`
    return [{ key: `${ln.from}-${ln.to}`, d, head: `M ${x2 - 4} ${y2 - 4} L ${x2 + 1} ${y2} L ${x2 - 4} ${y2 + 4} Z`, broken: ln.broken, lit: lit.has(ln.to) || lit.has(ln.from) }]
  }) : []

  return (
    <section className={styles.frame} aria-label="Milestones" data-kb-list="milestone" data-testid="schedule-timeline">
      <div ref={scroller} className={styles.scroller}>
        {/* (B-49) a real table for screen readers: rows of cells under their heads, each status said in words */}
        <div ref={gridRef} className={styles.grid} style={vars} role="table" aria-label="Milestones">
          <div className={styles.headRow} role="row">
            <div className={styles.nameHead} role="columnheader"><span className={styles.hLabel}>Milestone</span><ColumnResizer table="schedule" column="name" label="Milestone" min={NAME_MIN} max={NAME_MAX} /></div>
            <div className={styles.scale} role="columnheader" aria-label="Dates" data-scale="">
              <div className={styles.months} aria-hidden>{monthsShown.map((mo) => <span key={mo.at} className={styles.month} style={{ left: pct(mo.at) }}>{mo.label}</span>)}</div>
              <div className={styles.weeks} aria-hidden>
                {weeksShown.map((w) => {
                  /* (B-56) a label whose first days today's line crosses starts just after the line */
                  const crossed = today >= w.at && today < w.at + 5
                  return <span key={w.at} className={styles.week} data-after-today={crossed || undefined} style={{ left: crossed ? `calc(${todayLeft} + 2px)` : pct(w.at) }}>{w.label}</span>
                })}
                <span className={styles.today} style={{ left: todayLeft }} />
              </div>
            </div>
            <div className={styles.actHead} role="columnheader" aria-label="Actions" />
          </div>

          {/* (gaps build, package C — 6) the links between milestones, over the tracks and under the frozen columns */}
          {linkPaths.length ? (
            <div className={styles.links} style={{ gridRow: `2 / span ${list.length}` }} aria-hidden data-testid="schedule-links">
              <svg>
                {linkPaths.map((p) => <g key={p.key}><path className={styles.linkPath} d={p.d} data-broken={p.broken || undefined} data-lit={p.lit || undefined} data-testid="schedule-link" /><path className={styles.linkHead} d={p.head} data-broken={p.broken || undefined} data-lit={p.lit || undefined} /></g>)}
              </svg>
            </div>
          ) : null}
          {list.map((m0, i0) => {
            const m = kbOf.get(m0.id) ?? shownOf.get(m0.id) ?? m0
            const isDragging = drag?.id === m0.id && drag.moved
            const raw = isDragging && drag ? (() => { const d = drag.dx; return drag.mode === 'move' ? { start: m0.start + d, end: m0.end + d } : drag.mode === 'start' ? { start: Math.min(m0.start + d, m0.end), end: m0.end } : { start: m0.start, end: Math.max(m0.end + d, m0.start) } })() : null
            const at = raw ?? m
            const w = was.get(m0.id) ?? null
            const late = isLate(m, today)
            const line = rowLine(m, today, { was: w, waitingWho: waitingWho(m), client: client?.(m), moreTo: moreTo?.(m0) ?? null, crew: crewLine?.(m0.id) ?? null })
            const col = colorOf(m.color)   // (gaps build, package C — 12)
            const lifting = lift?.id === m0.id
            const pay = m.paymentRef ? payBy.get(m.paymentRef) : undefined
            const fill = m.tasks.total ? Math.round((m.tasks.done / m.tasks.total) * 100) : 0
            const shift = w ? (m.end !== w.end ? m.end - w.end : m.start - w.start) : 0
            const statusWord = late ? `Late (${STATUS_LABEL[m.status].toLowerCase()})` : STATUS_LABEL[m.status]
            /* the drag's date tip stays inside the track: centred on the bar, pulled in at either end */
            const tipAt = isDragging && target ? Math.max(4, Math.min(96, (((target.start + target.end + 1) / 2 - from) / n) * 100)) : 0
            return (
              <div key={m0.id} className={styles.row} role="row" data-kb-row data-kb-id={m0.id} data-moved={w ? '' : undefined} data-fresh={fresh === m0.id || undefined}
                   data-lifting={lifting || undefined} data-drop={dropMark(i0)} style={{ gridRow: i0 + 2, ...(lifting ? { '--lift-dy': `${lift!.dy}px` } : {}) } as CSSProperties}>
                <div className={styles.nameCell} role="cell">
                  {/* (gaps build, package C — 13) the grip: drag the row to a new place in the list (its dates stay), Undo after */}
                  {mayChange && onReorderTo ? (
                    <Tooltip label="Drag to move it in the list" disabled={!!lift}>
                      <button type="button" className={styles.grip} aria-label={`Move ${m0.title} in the list — drag, or Move up / down in its menu`} data-testid="milestone-grip"
                              onPointerDown={(e) => grab(e, m0, i0)} onPointerMove={slide} onPointerUp={drop} onPointerCancel={() => setLift(null)}>
                        <Icon name="drag_indicator" size={20} weight={300} />
                      </button>
                    </Tooltip>
                  ) : null}
                  <Tooltip label={late ? 'Late' : STATUS_LABEL[m.status]}><span className={styles.glyph} data-s={m.status} data-late={late || undefined}><Icon name={late ? 'warning' : STATUS_ICON[m.status]} size={24} weight={300} fill={m.status === 'done'} /><span className="visually-hidden">{statusWord}</span></span></Tooltip>
                  <button type="button" className={styles.nameBtn} onClick={() => onOpen(m0)} data-kb-open data-testid="milestone-name">
                    {/* (B-34) a cut name or line says itself in full on hover (REG-820's whenCut) */}
                    <Tooltip label={m.title} whenCut><span className={styles.name}>{m.title}</span></Tooltip>
                    <Tooltip label={line.text} whenCut><span className={styles.line} data-alert={line.alert || undefined} data-warn={line.warn || undefined}>{line.text}</span></Tooltip>
                  </button>
                  {shift ? <MetaChip color="blue">{shift > 0 ? '+' : '−'}{spanWord(shift)}</MetaChip> : pay ? <MetaChip color="yellow">{payShareWord(pay)} · {dayMonth(paymentDay(m))}</MetaChip> : null}
                </div>
                <div className={styles.track} role="cell" data-track="" data-zoom={zoom}>
                  <span className={styles.today} style={{ left: todayLeft }} aria-hidden />
                  {w ? <span className={styles.ghostBar} style={{ left: pct(w.start), width: width(w.start, w.end) }} aria-hidden /> : null}   {/* (REG-1057) its hint could never show — the bar sits over it */}
                  {/* (B-34) a bar says its dates on hover */}
                  <Tooltip label={`${m.title} · ${rangeLabel(m.start, m.end)}`} disabled={!!drag}>
                    <motion.button type="button" className={styles.bar} data-s={m.status} data-late={late || undefined} data-waiting={m.waiting && m.status !== 'done' ? '' : undefined}
                                   data-color={col?.key} style={col ? ({ '--bar-c': col.hex } as CSSProperties) : undefined}
                                   data-moved={w ? '' : undefined} data-dragging={isDragging || undefined} data-lifted={(drag?.id === m0.id && drag.touch && drag.lifted && !isDragging) || undefined}
                                   data-following={following.has(m0.id) || (kbPreview?.followed.includes(m0.id) ?? false) || undefined}
                                   data-kb-own="" data-testid="milestone-bar"
                                   aria-label={`${m.title}, ${statusWord}, ${rangeLabel(m.start, m.end)}. ${mayChange ? 'Arrow keys move it a day, Shift a week, Alt its end; Enter opens it.' : 'Enter opens it.'}`}
                                   initial={false} animate={{ left: pct(at.start), width: width(at.start, at.end) }} transition={raw ? { duration: 0 } : spring.settle}
                                   onPointerDown={(e) => down(e, m0, 'move')} onPointerMove={moveP} onPointerUp={up} onPointerCancel={() => { if (liftTimer.current) clearTimeout(liftTimer.current); setDrag(null) }}
                                   onKeyDown={(e) => onBarKey(e, m0)}>
                      {m.status === 'in_progress' || m.status === 'blocked' ? <span className={styles.fill} style={{ width: `${fill}%` }} /> : null}
                      {mayChange ? <><span className={styles.edge} data-edge="start" onPointerDown={(e) => down(e, m0, 'start')} aria-hidden /><span className={styles.edge} data-edge="end" onPointerDown={(e) => down(e, m0, 'end')} aria-hidden /></> : null}
                    </motion.button>
                  </Tooltip>
                  {decider === m0.id && !isDragging ? <span className={styles.cap} style={{ left: `calc(${pct(m.end)} + ${(1 / n) * 100}%)` }} aria-hidden /> : null}   {/* (REG-1057) no hint: it sits on the bar's end handle */}
                  {pay ? <Tooltip label={`${pay.name} falls due`}><span className={styles.diamond} style={{ left: `calc(${pct(paymentDay(m))} + ${(0.5 / n) * 100}%)` }} data-testid="payment-diamond" /></Tooltip> : null}   {/* (REG-1057) the house Tooltip, on a mark that takes the pointer */}
                  {isDragging && target ? <span className={styles.dragTip} style={{ left: `${tipAt}%` }} data-edge={tipAt <= 4 ? 'start' : tipAt >= 96 ? 'end' : undefined} data-testid="drag-tip">{target.start === target.end ? dayLabel(target.start) : `${dayLabel(target.start)} – ${dayLabel(target.end)}`}</span> : null}
                </div>
                <div className={styles.actCell} role="cell">
                  {mayChange && (m.status === 'in_progress' || m.status === 'blocked') ? <Button variant="primary" appearance="outlined" onPress={() => onAction(m0, { kind: 'status', status: 'done' })} data-testid="mark-done">Mark done</Button> : null}
                  <RowMenu m={m0} first={list[0]?.id === m0.id} last={list[list.length - 1]?.id === m0.id} mayChange={mayChange} onAction={(a) => onAction(m0, a)} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <SideScrollbar scroller={scroller} />
    </section>
  )
}

/** A row's ⋮: Open · Rename · the four statuses · Move up / down · Add a milestone after · Delete. */
function MilestoneMenuItems({ m, first, last, mayChange, pick }: { m: Milestone; first: boolean; last: boolean; mayChange: boolean; pick: (a: RowAction) => () => void }) {
  return (
    <>
      <DropdownItem onSelect={pick({ kind: 'open' })}>Open</DropdownItem>
      {mayChange ? (
        <>
          <DropdownItem onSelect={pick({ kind: 'rename' })}>Rename</DropdownItem>
          <DropdownDivider />
          {MILESTONE_STATUSES.map((s) => <DropdownItem key={s} role="menuitemradio" checked={m.status === s} onSelect={pick({ kind: 'status', status: s })}>{STATUS_LABEL[s]}</DropdownItem>)}
          <DropdownDivider />
          <DropdownItem disabled={first} help={first ? 'It is first' : undefined} onSelect={pick({ kind: 'up' })}>Move up</DropdownItem>
          <DropdownItem disabled={last} help={last ? 'It is last' : undefined} onSelect={pick({ kind: 'down' })}>Move down</DropdownItem>
          {/* (B-15) a milestone lands right after this one, following it */}
          <DropdownItem onSelect={pick({ kind: 'add-after' })}>Add a milestone after</DropdownItem>
          <DropdownDivider />
          <DropdownItem tone="danger" onSelect={pick({ kind: 'delete' })}>Delete</DropdownItem>
        </>
      ) : null}
    </>
  )
}

function RowMenu({ m, first, last, mayChange, onAction }: { m: Milestone; first: boolean; last: boolean; mayChange: boolean; onAction: (a: RowAction) => void }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const pick = (a: RowAction) => () => { setOpen(false); onAction(a) }
  return (
    <span ref={anchor}>
      <Tooltip label="More for this milestone" disabled={open}>
        <IconButton icon="more_vert" label={`More for ${m.title}`} variant="bare" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="milestone-kebab" />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={m.title}>
        <MilestoneMenuItems m={m} first={first} last={last} mayChange={mayChange} pick={pick} />
      </PortalMenu>
    </span>
  )
}
