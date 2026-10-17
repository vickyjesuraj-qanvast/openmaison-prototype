'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Layered surfaces — one Esc policy and one focus policy for every dialog, drawer, menu and picker (REG-4 R3:
 * "Esc closes the topmost layer"; audit 2026-08-30).
 *
 * Who is topmost is read from the DOM, not from listener order: portals append to <body> and nested dialogs render
 * inside their host, so a surface that FOLLOWS mine in document order (and is not my ancestor) sits above me.
 * The topmost surface claims Esc in the capture phase with preventDefault; every parent — this hook or a legacy
 * `!e.defaultPrevented` listener — then leaves its own surface open.
 */
const SURFACE = '[data-om-surface], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [aria-modal="true"]'
/** (fix-G, G-04) A dialog opened from inside a drawer or a dialog renders inside it — a descendant, yet the layer above: Esc is its own. An
    inline list (the assignee picker's listbox, REG-287) is not a layer and never demotes its host. */
const NESTED_LAYER = '[role="dialog"], [role="alertdialog"], [aria-modal="true"]'

export function isTopmostSurface(el: Element | null): boolean {
  if (!el) return false
  for (const other of Array.from(document.querySelectorAll(SURFACE))) {
    if (other !== el && el.contains(other) && other.matches(NESTED_LAYER) && other.getClientRects().length > 0) return false
    /* Skip my ancestors AND my descendants (REG-287). `compareDocumentPosition` reports a DESCENDANT as
       CONTAINED_BY | FOLLOWING, so the old check — which only skipped ancestors — let any surface nested inside
       a panel demote that panel: the Lead form holds an inline `role="listbox"` (the assignee picker), so from
       the moment that field existed the form considered itself covered and switched OFF its own focus trap.
       Tab then walked out into the listing behind an `aria-modal` dialog. A surface that genuinely sits above
       this one is a SIBLING that follows it (a body portal, or a dialog rendered after it), which still returns
       false here. */
    if (other === el || other.contains(el) || el.contains(other)) continue
    if (el.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING) return false
  }
  return true
}

/** Esc closes this surface when it is the topmost one. `ref` = the surface element (the panel with role="dialog"). */
export function useEscapeLayer(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (!isTopmostSurface(ref.current)) return   // a menu / picker / nested dialog above owns Esc
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, ref, onClose])
}

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const tabbables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter((el) => el.getClientRects().length > 0 && el.getAttribute('aria-hidden') !== 'true')

/**
 * WAI-ARIA dialog focus: focus moves into the surface on open (the panel itself, unless a field already auto-focused),
 * Tab cycles inside it while it is topmost (`trap`; off for non-modal drawers), and focus returns to the opener on close.
 * The panel needs `tabIndex={-1}`.
 */
export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>, { trap = true }: { trap?: boolean } = {}) {
  useEffect(() => {
    if (!open) return
    const panel = ref.current
    if (!panel) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    /* (REG-286, a11y audit "aria-modal without a focus trap"): a panel that forgot `tabIndex={-1}` is not
       focusable, so the hook would leave focus outside the surface it claims to own. Give it the -1 itself —
       invisible in the DOM, and it makes adopting this hook a one-liner for the hand-rolled modal panels. */
    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1')
    if (!panel.contains(document.activeElement)) panel.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (!trap || e.key !== 'Tab' || e.defaultPrevented) return
      /* No `isTopmostSurface` guard here (REG-287). Esc needs it — the topmost layer owns Esc — but a TAB trap
         must not stand down merely because some other surface exists above: the assignee picker's listbox
         portals to <body> and stays mounted while focus tabs on through the form, which switched the trap off
         for the whole rest of the Lead form and let Tab walk into the listing behind an `aria-modal` dialog.
         What actually matters is where focus IS, and the next line already answers that: focus inside another
         surface keeps that surface's own tab order. */
      const active = document.activeElement
      // Focus inside a portaled menu / picker above the panel keeps its own tab order.
      if (active instanceof Element && !panel.contains(active) && active.closest(SURFACE) && active.closest(SURFACE) !== panel) return
      const items = tabbables(panel)
      const first = items[0], last = items[items.length - 1]
      if (!first || !last) { e.preventDefault(); panel.focus(); return }
      const inside = panel.contains(active)
      if (e.shiftKey && (!inside || active === first || active === panel)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (!inside || active === last)) { e.preventDefault(); first.focus() }
    }
    /* CAPTURE (REG-287): the DS Button is a react-aria pressable and stops keydown propagation, so a bubble-phase
       listener never saw the Tab that leaves the LAST control — focus walked out of the Lead form into the page
       behind it. Esc is claimed in capture for the same reason; the trap now is too. */
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      const active = document.activeElement
      if (previous && previous.isConnected && (!active || active === document.body || panel.contains(active))) previous.focus({ preventScroll: true })
    }
  }, [open, ref, trap])
}

/* ---------------------------------------------------------------------------------------------------------
 * Anchored menus (REG-286, a11y audit "anchored menus are unreachable by keyboard"). An open menu left focus
 * on its trigger, and every menu renders after the page content (a body portal, or the very end of a toolbar),
 * so the only way to an item was tabbing through the rest of the page — and Esc / an outside click stranded
 * focus on <body>. One policy for every anchored surface: focus moves onto the current (or first) item on open,
 * Up / Down / Home / End walk the items, Tab leaves the menu from the TRIGGER, and closing returns focus there.
 * ------------------------------------------------------------------------------------------------------- */
const MENU_ITEM = '[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'
/** A menu whose trigger is a text box (a search / combobox field) keeps focus in the field so typing still filters. */
const TEXT_ENTRY = 'input:not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]), textarea, [contenteditable=""], [contenteditable="true"]'

/** The menu's own rows when it has them (role="option" / "menuitem"…), otherwise whatever is tabbable inside it. */
function menuItems(menu: HTMLElement): HTMLElement[] {
  const rows = Array.from(menu.querySelectorAll<HTMLElement>(MENU_ITEM))
  const list = rows.length ? rows : Array.from(menu.querySelectorAll<HTMLElement>(TABBABLE))
  return list.filter((el) => el.getClientRects().length > 0 && el.getAttribute('aria-disabled') !== 'true' && !el.hasAttribute('disabled'))
}

/**
 * WAI-ARIA menu keyboard for an anchored surface (`ref` = the menu element; PortalMenu, Dropdown).
 * Escape stays with the host, which consumes it for its own layer policy (see `useEscapeLayer`).
 *
 * Arrow handling stands down when the event is already handled (`defaultPrevented`), so a consumer that runs its
 * own roving list — TextField's select menu — keeps its behaviour instead of moving twice.
 */
export function useMenuKeyboard(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  { autoFocus = true }: { autoFocus?: boolean } = {},
) {
  // Hosts pass an inline `onClose`, so it cannot be a dependency: the effect would tear down its listeners
  // (and restore focus) on every render of the open menu.
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose })

  useEffect(() => {
    if (!open) return
    const menu = ref.current
    if (!menu) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (autoFocus && !opener?.matches(TEXT_ENTRY)) {
      const items = menuItems(menu)
      const current = menu.querySelector<HTMLElement>('[aria-selected="true"], [aria-checked="true"], [data-selected]')
      // preventScroll: consumers pre-scroll their selected row into view (the picker's minute list) — don't fight it.
      ;(current && items.includes(current) ? current : items[0])?.focus({ preventScroll: true })
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const active = document.activeElement
      if (!(active instanceof HTMLElement) || !menu.contains(active)) return
      if (e.key === 'Tab') {
        // No preventDefault: focus goes back to the trigger and the browser's own Tab carries on from there
        // (the menu is portalled to the end of <body>, so tabbing out of it would land past the whole page).
        if (opener?.isConnected) opener.focus()
        close.current()
        return
      }
      const items = menuItems(menu)
      if (items.length === 0) return
      const i = items.indexOf(active)
      const go = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus() }
      if (e.key === 'ArrowDown') go(i + 1)
      else if (e.key === 'ArrowUp') go(i < 0 ? items.length - 1 : i - 1)
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(items.length - 1)
    }
    document.addEventListener('keydown', onKey)   // bubble, after React's own handlers — see `defaultPrevented` above
    return () => {
      document.removeEventListener('keydown', onKey)
      const active = document.activeElement
      // Only when the menu still holds focus: an outside click has already put it where the user meant it to go.
      if (opener?.isConnected && (!active || active === document.body || menu.contains(active))) opener.focus({ preventScroll: true })
    }
  }, [open, ref, autoFocus])
}
