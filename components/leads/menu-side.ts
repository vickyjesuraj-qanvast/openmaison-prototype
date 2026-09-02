'use client'

import { MOBILE } from '@/lib/breakpoint'

/**
 * (REG-286) Which way a row / card kebab menu opens — ONE rule, shared by every list.
 *
 * Fixes the audit's "kebab direction" finding. The answer had been written out five times over (the leads table,
 * the kanban card, the Quotes and Contracts twins, and — as a ROW COUNT — the Tasks and Files tables), and the
 * copies had drifted: the count version was the bug. On a three-row Tasks or Files table the last two kebabs
 * flipped UP, over the toolbar and the tab strip, with half a screen still free below them.
 *
 * The rule is a measurement, never a row index: where does this trigger actually sit, and does the menu it is
 * about to open fit underneath it? `items` is how many rows that menu will draw, so a 2-item leads menu and a
 * 6-item quote menu each ask for their own height instead of sharing one worst-case constant.
 *
 * Call it on the press, BEFORE the menu opens — the trigger is on screen and its rect is the real one.
 */

/** menus.module.css `.item`: 36 tall, lifted to 40 under the touch media query (REG-273). */
const ITEM_H = 36
const ITEM_H_TOUCH = 40
/** menus.module.css `.menu`: 4px list padding top and bottom, plus its 1px border on each side. */
const LIST_CHROME = 2 * 4 + 2 * 1
/** The Dropdown hangs at `calc(100% + 4px)` on whichever side it opens. */
const GAP = 4

/** The height the Dropdown will draw for `items` rows, in the viewport it is opening in. */
function menuHeight(items: number): number {
  const row = typeof window !== 'undefined' && window.matchMedia(MOBILE).matches ? ITEM_H_TOUCH : ITEM_H
  return items * row + LIST_CHROME
}

/**
 * The box the menu has to live inside: the viewport, narrowed by every ancestor that CLIPS — a scroller, or a
 * body on `overflow: clip`. An ancestor whose overflow-y computes to `visible` cannot cut the menu off, so it is
 * skipped; note that `overflow-x: auto` alone makes overflow-y compute to `auto`, which is exactly how the
 * listing's horizontal scroller clips a menu below its own bottom edge.
 */
function clipBox(trigger: HTMLElement): { top: number; bottom: number } {
  let top = 0
  let bottom = window.innerHeight
  for (let n = trigger.parentElement; n; n = n.parentElement) {
    if (getComputedStyle(n).overflowY === 'visible') continue
    const r = n.getBoundingClientRect()
    top = Math.max(top, r.top)
    bottom = Math.min(bottom, r.bottom)
  }
  return { top, bottom }
}

/**
 * Down whenever the menu fits below the trigger; up when it does not and it fits above. When NEITHER side can
 * hold it — a single-row table inside a card that clips — the side with more room wins, which is the fallback the
 * leads table and the kanban card already had and the Quotes/Contracts copy had dropped.
 */
export function menuSideFor(trigger: HTMLElement, items: number): 'up' | 'down' {
  const need = menuHeight(items) + GAP
  const { top, bottom } = clipBox(trigger)
  const k = trigger.getBoundingClientRect()
  const below = bottom - k.bottom
  const above = k.top - top
  if (below >= need) return 'down'
  return above >= need || above > below ? 'up' : 'down'
}
