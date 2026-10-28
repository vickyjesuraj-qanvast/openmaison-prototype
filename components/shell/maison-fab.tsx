'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { Tooltip } from '@/components/om/tooltip'
import { MOBILE } from '@/lib/breakpoint'
import { isAskKey, keyboardHeldElsewhere } from '@/lib/maison-ai'
import { markUsed } from '@/lib/keys/store'
import styles from './maison-fab.module.css'

/**
 * Maison AI floating button — 48px, bottom-right 24px, glow per mock asset.
 * A4 (approved): opens the scripted suggestion sheet; the sheet itself ships
 * with M1 (its content depends on the listing context). Until then the press
 * animates but takes no action — replaced within this same milestone train.
 */
export function MaisonFab({ onPress, raised = false, className, quietTop = false }: { onPress?: () => void; raised?: boolean; /** An app frame that fills the bottom-right corner (the AI Visualizer's rail) moves the FAB to its own clear spot. */ className?: string
  /** (S42 audit A-12) A page whose first screen holds its own Ask box and row buttons where the FAB floats (the Dashboard): on a phone the
      button starts tucked and stays tucked at the top — it comes back as the page scrolls up mid-way or stops at its end. */
  quietTop?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  useTuckOnScroll(wrap, quietTop)
  useStepAside(wrap)
  useAskKey(onPress)
  return (
    <div ref={wrap} className={`${styles.wrap} ${className ?? ''}`} data-raised={raised || undefined} data-maison-fab="">
      <Tooltip label="Maison AI" side="left" shortcut="maison">
        <button type="button" className={styles.button} aria-label="Maison AI" onClick={onPress}>
          <span className={styles.glyph}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma-assets/maison-ai-fab.svg" alt="" />
          </span>
        </button>
      </Tooltip>
    </div>
  )
}

/**
 * (the Dashboard redesigned 2026-10-26 — his Q-09, lane D4) ⌘J / Ctrl J asks Maison AI: the sheet this button opens comes up with the caret in its
 * Ask box (or the box takes the caret, when the sheet is already open). One listener per button, so every page that has the button — the shell's
 * and each editor's own — answers it; the Dashboard's docked field answers it there (the button steps aside). A dialog that holds the keyboard
 * keeps it, as ⌘K's rule. Works while typing elsewhere: it is a ⌘ key.
 */
const ASK_FIELD = '[data-testid="maison-ask"] input'
function useAskKey(onPress?: () => void) {
  const press = useRef(onPress)
  useEffect(() => { press.current = onPress })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isAskKey(e) || e.defaultPrevented || keyboardHeldElsewhere()) return
      e.preventDefault()
      markUsed('maison')
      const focus = () => { const f = document.querySelector<HTMLInputElement>(ASK_FIELD); if (f) { f.focus(); return true } return false }
      if (focus()) return
      press.current?.()
      let tries = 0
      const again = () => { if (!focus() && (tries += 1) < 30) requestAnimationFrame(again) }
      requestAnimationFrame(again)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/**
 * (the calm UI build 2026-10-27 — the audit's 5-50 · 6-28 · 1-43 · 3-09, T-15: the Maison AI button never covers what you read or press) The
 * button **steps aside** (`data-aside`) while something of the page sits under its resting place. At a desk (`fade`): a control, a line of
 * words or a picture (it covered "7 leads" on Members, a row's "Open", a column-settings button at 1440) — it fades out of sight and comes back
 * as the pointer nears its corner (within `NEAR` px); its own 48 box still takes a press there, as it always did, so nothing under it changes
 * hands. Under a finger (`pass`): only a filled button (X-Ray's Send to client — 6-28) — it fades AND lets the tap through to that button; the
 * phone's slide-away on scroll and the lists' `--fab-clearance` do the rest. It comes back the moment nothing is under it and whenever it holds
 * keyboard focus; ⌘J always asks. What is under it is read on a scroll, a resize and once a second (a list that loads late). An overlay over
 * the page (a sheet, a menu, the snackbar) is never "the page under it".
 */
const NEAR = 120
/** a filled button — the one a thumb must reach (the DS Button's filled appearance) */
const FILLED = '[data-appearance="filled"]'
/** an open conversation — it has its own composer at the foot, which the button never sits on (B3's `project-conversation`) */
const CONVERSATION = '[data-testid="project-conversation"]'
const OVERLAY = '[role="dialog"], [aria-modal="true"], [data-om-menu], [data-om-snackbar], [data-maison-fab]'
const CONTROL = 'button, a[href], input, textarea, select, [role="button"], [role="link"], [role="tab"], [role="radio"], [role="switch"], [role="checkbox"], [contenteditable="true"]'
function useStepAside(wrap: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const desk = window.matchMedia('(hover: hover) and (min-width: 1025px)')
    let pointer: { x: number; y: number } | null = null
    let frame = 0
    /* where the button rests — read from its own place (right · bottom), not from its box, which a tuck or a step aside moves */
    const rest = () => {
      const cs = getComputedStyle(el)
      const w = el.offsetWidth || 48, h = el.offsetHeight || 48
      const right = parseFloat(cs.right) || 24, bottom = parseFloat(cs.bottom) || 24
      return { left: window.innerWidth - right - w, top: window.innerHeight - bottom - h, w, h }
    }
    const textUnder = (node: Element, box: { left: number; top: number; w: number; h: number }) => {
      for (const c of Array.from(node.childNodes)) {
        if (c.nodeType !== 3 || !c.textContent?.trim()) continue
        const r = document.createRange(); r.selectNodeContents(c)
        for (const q of Array.from(r.getClientRects())) if (q.right > box.left && q.left < box.left + box.w && q.bottom > box.top && q.top < box.top + box.h) return true
      }
      return false
    }
    const covers = (): boolean => {
      const box = rest()
      const pad = 4
      const xs = [box.left + pad, box.left + box.w / 2, box.left + box.w - pad], ys = [box.top + pad, box.top + box.h / 2, box.top + box.h - pad]
      for (const x of xs) for (const y of ys) {
        const top = document.elementsFromPoint(x, y).find((n) => !el.contains(n))
        if (!top || top === document.documentElement || top === document.body) continue
        if (top.closest(OVERLAY)) return false   // something over the page is where the button is — the page isn't under it
        if (!desk.matches) { if (top.closest(FILLED) || top.closest(CONVERSATION)) return true; continue }   // under a finger: a filled button (6-28), an open conversation's composer (1-43)
        if (top.closest(CONTROL)) return true
        if (top.tagName === 'IMG' || textUnder(top, box)) return true
      }
      return false
    }
    const near = () => { if (!pointer) return false; const b = rest(); return pointer.x > b.left - NEAR && pointer.y > b.top - NEAR }
    const apply = () => {
      frame = 0
      if (document.body.hasAttribute('data-om-no-fab-aside')) { el.removeAttribute('data-aside'); return }
      if (near() || !covers()) el.removeAttribute('data-aside'); else el.setAttribute('data-aside', desk.matches ? 'fade' : 'pass')
    }
    const later = () => { if (!frame) frame = requestAnimationFrame(apply) }
    const onMove = (e: PointerEvent) => { if (e.pointerType !== 'mouse') return; const was = near(); pointer = { x: e.clientX, y: e.clientY }; if (near() !== was) later() }
    const tick = window.setInterval(later, 1000)
    window.addEventListener('scroll', later, { passive: true }); window.addEventListener('resize', later)
    window.addEventListener('pointermove', onMove, { passive: true })
    later()
    return () => { window.clearInterval(tick); window.removeEventListener('scroll', later); window.removeEventListener('resize', later); window.removeEventListener('pointermove', onMove); if (frame) cancelAnimationFrame(frame); el.removeAttribute('data-aside') }
  }, [wrap])
}

/** (Leads on the move — the landing's FAB rule, 2026-10-23) A touch tablet: 768–1024 with a finger (REG-307's query, above the phone's own). */
const TOUCH_TABLET_ONLY = '(hover: none) and (min-width: 768px) and (max-width: 1024px)'
/** Every width the rules below can apply at — the desk (≥1025) keeps the mock's button. */
const NARROW = '(max-width: 1024px)'

/**
 * Where the button rests, one rule (written as `data-tucked`; the stylesheet slides it away, reduced motion swaps the slide for an instant change;
 * a button that holds keyboard focus never leaves, `:focus-within`):
 *  · (wave E, E4 — the owner's call on the FAB, gallery-3) On a phone (≤767) it slides away while the page scrolls down — the cards' corner chips
 *    and the last lines it sat on come clear — and comes back the moment the page scrolls up, or when it stops at its end (where the page's own
 *    bottom clearance keeps it off the content). `quietTop` (S42 A-12): it starts tucked at the top.
 *  · (Leads on the move — the landing's FAB rule, 2026-10-23) **At its end only** on a touch tablet (768–1024): it rests out of sight while there
 *    is page below and shows once the page sits at its end, or does not scroll at all. A tablet's table rows carry a frozen ⋮ exactly under the
 *    button's corner (the Leads, Quotes and Contracts tablet tables). The page's height is watched, so a list that grows or shrinks under it
 *    moves it with the page.
 *  · A mouse at 768–1024 keeps the desk's button.
 */
function useTuckOnScroll(wrap: RefObject<HTMLDivElement | null>, quietTop: boolean) {
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const phone = window.matchMedia(MOBILE), tablet = window.matchMedia(TOUCH_TABLET_ONLY), narrow = window.matchMedia(NARROW)
    const atEndOnly = () => tablet.matches
    /** Below this movement a resting finger's jitter is not a scroll. */
    const DEADZONE = 6
    let last = window.scrollY
    let frame = 0
    let on = false
    const show = () => el.removeAttribute('data-tucked')
    const tuck = () => el.setAttribute('data-tucked', '')
    const apply = () => {
      frame = 0
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (atEndOnly()) { last = y; if (y >= max - 2) show(); else tuck(); return }
      if (!phone.matches) { last = y; show(); return }
      /* stopped at the end (a rubber-band past it counts as there): back; at the top: back — but for a quiet-top page, which keeps it tucked */
      if (y >= max - 2 && y > 0) { last = y; show(); return }
      if (y <= 0) { last = y; if (quietTop) tuck(); else show(); return }
      const delta = y - last
      if (Math.abs(delta) < DEADZONE) return
      last = y
      if (delta > 0) tuck()
      else show()
    }
    const later = () => { if (!frame) frame = requestAnimationFrame(apply) }
    const ro = new ResizeObserver(later)
    const enable = () => {
      if (on) return
      on = true; last = window.scrollY
      if (quietTop && last <= 0 && phone.matches) tuck()
      apply()
      window.addEventListener('scroll', later, { passive: true }); window.addEventListener('resize', later)
      ro.observe(document.body)
    }
    const disable = () => {
      if (!on) return
      on = false
      window.removeEventListener('scroll', later); window.removeEventListener('resize', later); ro.disconnect()
      if (frame) cancelAnimationFrame(frame); frame = 0; show()
    }
    /* ≤1024 only, following a rotation across the breakpoints — a tablet that turns into phone width picks the phone's rule up, the desk gets
       its button back */
    const sync = () => (narrow.matches ? (enable(), later()) : disable())
    sync()
    narrow.addEventListener('change', sync); phone.addEventListener('change', later); tablet.addEventListener('change', later)
    return () => { narrow.removeEventListener('change', sync); phone.removeEventListener('change', later); tablet.removeEventListener('change', later); disable() }
  }, [wrap, quietTop])
}
