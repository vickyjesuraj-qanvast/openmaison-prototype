'use client'

import { useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { duration, ease } from '@/lib/motion'
import { Keys } from './keys'
import { useSnackbar } from './snackbar'
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
/** (S43E W1-01) The wrapped control is refused — natively disabled or `aria-disabled` — so its tooltip is the reason it can't be pressed. */
export const REFUSED_KEY = 'refused-reason'
const refused = (wrapper: HTMLElement, label: string): boolean => {
  const el = wrapper.querySelector<HTMLElement>('[aria-disabled="true"], button:disabled, input:disabled, select:disabled, textarea:disabled, [data-disabled="true"]')
  if (!el) return false
  /* a tooltip that only names the control ("Undo" on a greyed Undo) is no reason — only a sentence the control doesn't already say is spoken */
  const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase(), said = label.replace(/\s+/g, ' ').trim().toLowerCase()
  return !!said && said !== name && !name.startsWith(said)
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
  whenCut = false,
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
  /** (REG-820) Only while the control's text is cut (its ellipsis shows) — a name in a narrow column says itself in full on hover. */
  whenCut?: boolean
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
  /* (Contracts on the move, C4 — C-06) A finger's press leaves focus on the control, and the focus-visible branch below used to pin the bubble
     under it ("New · C" under the +, on a phone, after the press) — and a key hint means nothing to a finger. The pointer type is kept from the
     press, so the focus it leaves shows no bubble, and a touch pointer never shows the keys. */
  const touched = useRef(false)

  const hide = () => { clear(); if (state?.owner === owner) commit(null) }
  const show = (wrapper: HTMLElement) => {
    if (disabled) return
    clear()
    const el = (wrapper.firstElementChild as HTMLElement | null) ?? wrapper
    if (whenCut && el.scrollWidth <= el.clientWidth + 1) return
    const next = { owner, label, keys: touched.current ? undefined : keys ?? (shortcut ? keysOf(shortcut) : undefined), ...place(el, side) }
    if (state || Date.now() - lastHiddenAt < WARM_WINDOW_MS) commit(next)
    else timer.current = setTimeout(() => commit(next), SHOW_DELAY_MS)
  }

  /* (pending modules S43E, F3-01 W1-01 — DESIGN-PRINCIPLES #5 · #8, REG-273's second channel) A refused control — greyed, its reason in this
     tooltip — has no hover on a phone or a touch tablet, so a tap says the reason in the house snackbar, as the stage menu's and the Move stage
     rail's locked rows always did; one keyed snackbar, so a host that says it too never stacks a second. */
  const say = useSnackbar()
  useEffect(() => {
    if (disabled) hide()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hide is stable per owner
  }, [disabled])
  useEffect(() => () => { clear(); if (state?.owner === owner) commit(null) }, [owner])

  return (
    <span ref={anchor} className={styles.anchor}
          onPointerEnter={(e) => { touched.current = e.pointerType === 'touch'; if (e.pointerType !== 'touch') show(e.currentTarget) }}   // no hover on touch — a tap must not leave a bubble behind
          onPointerLeave={hide}
          onPointerDown={(e) => { touched.current = e.pointerType === 'touch'; hide(); if (e.pointerType === 'touch' && label && !disabled && refused(e.currentTarget, label)) say({ message: label, key: REFUSED_KEY }) }}   // a press cancels a pending show, so nothing pops over what the press opened — (S43E W1-01) and a finger on a refused control hears its reason
          onKeyDown={(e) => { touched.current = false; if (e.key === 'Enter' || e.key === ' ') hide() }}
          onFocus={(e) => { if (!touched.current && (e.target as HTMLElement).matches?.(':focus-visible')) show(e.currentTarget) }}   // (C-06) the focus a tap leaves shows nothing
          onBlur={hide}>
      {children}
    </span>
  )
}

/**
 * (UX audit 2026-09-30, C7) The same one bubble for an element React does not render as a child — a Smart Text chip inside the contract's
 * contenteditable paper, which a <Tooltip> cannot wrap. The same delay, warm window, placement and dismissals (scroll, a press, Esc):
 * `showTooltipFor(el, label)` as the pointer comes over it, `hideTooltipFor(el)` as it leaves.
 */
const domOwners = new WeakMap<Element, string>()
let domSeq = 0
let domTimer: ReturnType<typeof setTimeout> | null = null
export function showTooltipFor(el: HTMLElement, label: string, side: TooltipSide = 'top') {
  let owner = domOwners.get(el)
  if (!owner) { owner = `dom-tip-${++domSeq}`; domOwners.set(el, owner) }
  if (domTimer) { clearTimeout(domTimer); domTimer = null }
  const next = { owner, label, ...place(el, side) }
  if (state || Date.now() - lastHiddenAt < WARM_WINDOW_MS) commit(next)
  else domTimer = setTimeout(() => { domTimer = null; commit(next) }, SHOW_DELAY_MS)
}
export function hideTooltipFor(el: HTMLElement) {
  if (domTimer) { clearTimeout(domTimer); domTimer = null }
  const owner = domOwners.get(el)
  if (owner && state?.owner === owner) commit(null)
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
