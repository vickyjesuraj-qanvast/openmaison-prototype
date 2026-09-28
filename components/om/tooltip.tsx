'use client'

import { useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { duration, ease } from '@/lib/motion'
import { Keys } from './keys'
import { keysOf } from '@/lib/keys/registry'
import { ariaKeys } from '@/lib/keys/spec'
import styles from './tooltip.module.css'

/**
 * Tooltip (789:83369) — the one tooltip for every page. Wrap any control:
 *   <Tooltip label="Filters"><IconButton … /></Tooltip>
 * Hover / keyboard focus shows it after a short delay; moving between
 * tooltipped controls is instant and the single bubble glides to the next
 * one. Scroll, pointer-down, Esc and `disabled` hide it. There is exactly one
 * bubble on the page: `<TooltipLayer />` (mounted once in the root layout)
 * renders whatever the store holds, fixed-positioned, so it escapes
 * overflow-hidden / sticky containers. Centring uses the CSS `translate`
 * property so the motion transform can't knock it off-centre.
 */
export type TooltipSide = 'top' | 'bottom' | 'left' | 'right'
type TipState = { owner: string; label: string; keys?: string; side: TooltipSide; top: number; left: number } | null

const SHOW_DELAY_MS = 150
const WARM_WINDOW_MS = 400
const GAP = 8
const EDGE = 8
const TIP_H = 32   // single-line bubble (body-s + 4px padding ×2) + 4px marker

/* ---- tiny external store: one active tooltip per document ---- */
let state: TipState = null
let lastHiddenAt = 0
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const getSnapshot = () => state
const getServerSnapshot = () => null
function commit(next: TipState) {
  if (state && !next) lastHiddenAt = Date.now()
  state = next
  listeners.forEach((l) => l())
}
const SHIFT: Record<TooltipSide, { x?: number; y?: number }> = { right: { x: -4 }, left: { x: 4 }, bottom: { y: -4 }, top: { y: 4 } }

/** Flip top↔bottom when the bubble would leave the viewport (rows near the bottom edge). */
function resolveSide(r: DOMRect, side: TooltipSide): TooltipSide {
  if (side === 'bottom' && r.bottom + GAP + TIP_H + EDGE > window.innerHeight) return 'top'
  if (side === 'top' && r.top - GAP - TIP_H - EDGE < 0) return 'bottom'
  return side
}

function place(el: HTMLElement, wanted: TooltipSide) {
  const r = el.getBoundingClientRect()
  const side = resolveSide(r, wanted)
  switch (side) {
    case 'right': return { side, top: r.top + r.height / 2, left: r.right + GAP }
    case 'left': return { side, top: r.top + r.height / 2, left: r.left - GAP }
    case 'top': return { side, top: r.top - GAP, left: r.left + r.width / 2 }
    default: return { side, top: r.bottom + GAP, left: r.left + r.width / 2 }
  }
}

export function Tooltip({
  label,
  side = 'bottom',
  disabled = false,
  keys,
  shortcut,
  children,
}: {
  label: string
  side?: TooltipSide
  /** (REG-715) The control's keyboard shortcut, drawn after the label ("New lead  C") — a spec ('mod+z') … */
  keys?: string
  /** … or its id in the one list (`lib/keys/registry.ts`), which keeps the hint and the key in step. */
  shortcut?: string
  /** Hide and never show — e.g. rail items once their labels are visible, a kebab while its menu is open. */
  disabled?: boolean
  children: ReactNode
}) {
  const owner = useId()
  /* (REG-715) the control's keys reach screen readers too — on the control itself, from the same spec as the bubble */
  const anchor = useRef<HTMLSpanElement | null>(null)
  const spec = keys ?? (shortcut ? keysOf(shortcut) : undefined)
  useEffect(() => {
    const el = anchor.current?.firstElementChild
    const aria = spec ? ariaKeys(spec) : undefined
    if (el && aria && !el.hasAttribute('aria-keyshortcuts')) el.setAttribute('aria-keyshortcuts', aria)
  }, [spec])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }

  const hide = () => { clear(); if (state?.owner === owner) commit(null) }
  const show = (wrapper: HTMLElement) => {
    if (disabled) return
    clear()
    const el = (wrapper.firstElementChild as HTMLElement | null) ?? wrapper
    const next = { owner, label, keys: keys ?? (shortcut ? keysOf(shortcut) : undefined), ...place(el, side) }
    if (state || Date.now() - lastHiddenAt < WARM_WINDOW_MS) commit(next)
    else timer.current = setTimeout(() => commit(next), SHOW_DELAY_MS)
  }

  useEffect(() => {
    if (disabled) hide()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hide is stable per owner
  }, [disabled])
  useEffect(() => () => { clear(); if (state?.owner === owner) commit(null) }, [owner])

  return (
    <span ref={anchor} className={styles.anchor}
          onPointerEnter={(e) => { if (e.pointerType !== 'touch') show(e.currentTarget) }}   // no hover on touch — a tap must not leave a bubble behind
          onPointerLeave={hide}
          onPointerDown={hide}                                                            // a press cancels a pending show, so nothing pops over what the press opened
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') hide() }}
          onFocus={(e) => { if ((e.target as HTMLElement).matches?.(':focus-visible')) show(e.currentTarget) }}
          onBlur={hide}>
      {children}
    </span>
  )
}

function Marker({ side }: { side: TooltipSide }) {
  // Mock marker is a 24×4 triangle (tooltip-marker.svg); one path per orientation.
  if (side === 'bottom') return <svg className={styles.marker} width="24" height="4" viewBox="0 0 24 4" aria-hidden><path d="M12 0L16 4H8Z" /></svg>
  if (side === 'top') return <svg className={styles.marker} width="24" height="4" viewBox="0 0 24 4" aria-hidden><path d="M8 0H16L12 4Z" /></svg>
  if (side === 'right') return <svg className={styles.marker} width="4" height="24" viewBox="0 0 4 24" aria-hidden><path d="M4 8L0 12L4 16Z" /></svg>
  return <svg className={styles.marker} width="4" height="24" viewBox="0 0 4 24" aria-hidden><path d="M0 8L4 12L0 16Z" /></svg>
}

type Tip = NonNullable<TipState>

/** One keyed instance per side so an exiting bubble can't null the live one's ref. */
function Bubble({ tip }: { tip: Tip }) {
  const ref = useRef<HTMLDivElement>(null)
  // Keep top/bottom bubbles inside the viewport — computed from the TARGET
  // position (the bubble may still be gliding), DOM write only, before paint.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || (tip.side !== 'top' && tip.side !== 'bottom')) return
    const half = el.offsetWidth / 2
    const over = tip.left + half - (window.innerWidth - EDGE)
    const under = EDGE - (tip.left - half)
    el.style.marginLeft = over > 0 ? `${-over}px` : under > 0 ? `${under}px` : '0px'
  }, [tip])
  return (
    <motion.div ref={ref} className={styles.tip} data-side={tip.side} role="tooltip"
                initial={{ opacity: 0, top: tip.top, left: tip.left, ...SHIFT[tip.side] }}
                animate={{ opacity: 1, top: tip.top, left: tip.left, x: 0, y: 0 }}
                exit={{ opacity: 0, transition: { duration: duration.menuExit } }}
                transition={{ duration: duration.menu, ease: ease.standard }}>
      <Marker side={tip.side} />
      <span className={styles.bubble} data-keys={tip.keys ? '' : undefined}>{tip.label}{tip.keys ? <Keys spec={tip.keys} tone="inverse" /> : null}</span>
    </motion.div>
  )
}

/** Mount once (root layout). Renders the active tooltip; hides it on scroll / pointer-down / Esc / resize. */
export function TooltipLayer() {
  const tip = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (!tip) return
    const off = () => commit(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') commit(null) }
    window.addEventListener('scroll', off, true)
    window.addEventListener('resize', off)
    window.addEventListener('pointerdown', off, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('scroll', off, true)
      window.removeEventListener('resize', off)
      window.removeEventListener('pointerdown', off, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [tip])

  return <AnimatePresence>{tip ? <Bubble key={tip.side} tip={tip} /> : null}</AnimatePresence>
}
