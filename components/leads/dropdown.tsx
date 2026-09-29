'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { anchoredSurface } from '@/lib/motion'
import { useMenuKeyboard } from '@/components/om/surface'
import { Sheet, sheetMenuBody, useSheetLayout } from '@/components/om/sheet'
import { Keys } from '@/components/om/keys'
import { ariaKeys } from '@/lib/keys/spec'
import { keysOf } from '@/lib/keys/registry'
import styles from './menus.module.css'

/**
 * The mocks' 200px dropdown (Add Lead / kebab family) with the layer policy.
 *
 * Keyboard (REG-286): opening it used to leave focus on the trigger, so the items could only be reached by
 * tabbing past everything the menu covers. Focus now moves onto the checked (or first) item, arrows / Home / End
 * walk the items, and Tab or Esc — or any close — hand focus back to the trigger (components/om/surface.ts).
 */
export function Dropdown({
  open,
  onClose,
  align = 'right',
  side = 'down',
  children,
  width = 200,
  sheetTitle,
  sheetSubtitle,
}: {
  open: boolean
  onClose: () => void
  align?: 'left' | 'right'
  /** 'up' flips the menu above the trigger (bottom rows near a clipping edge). */
  side?: 'down' | 'up'
  children: ReactNode
  /** (REG-728) One of MENU_WIDTH — standard 200 by default. */
  width?: number
  /** ≤767 the menu is a bottom sheet and takes a heading (REG-353) — the canvas titles it after what it acts on
   *  ("Add Lead" 1f, the task's own name 2f). Ignored on the desktop, where the menu stays anchored. */
  sheetTitle?: string
  sheetSubtitle?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const sheet = useSheetLayout()
  useMenuKeyboard(open, ref, onClose)   // (REG-286) keyboard reach — see the note above
  /* (REG-347) A menu opened low on a phone ran past the viewport and its last items were drawn under the fixed
     dock — the ≤767 cap in menus.module.css was a constant that could not know where the anchor sat. The menu
     reports its own top once it is on screen; the stylesheet subtracts that and the dock from the cap. Layout is
     read in an effect, after paint, never during render. */
  useEffect(() => {
    const el = ref.current
    if (!open || !el || sheet) return   // a sheet is bottom-anchored: it has no anchor top to measure (REG-353)
    el.style.setProperty('--menu-top', `${Math.max(0, Math.round(el.getBoundingClientRect().top))}px`)
  }, [open, sheet])
  useEffect(() => {
    if (!open || sheet) return   // the sheet owns Esc and its own scrim press (components/om/sheet.tsx)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    }
    // Anything outside the menu closes it (user 2026-08-29: the wrapper is sometimes a whole toolbar row) —
    // except the open trigger itself (aria-haspopup + aria-expanded="true"), whose own click toggles the menu
    // (no close-then-reopen). Listened in the capture phase: DS Buttons (React Aria) stop pointerdown propagation
    // at React's root, so a bubble-phase document listener would never see presses on them.
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (!t || ref.current?.contains(t)) return
      if (t.closest('[aria-haspopup][aria-expanded="true"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKey, true)   // capture: the open menu owns Esc before its host (Drawer / dialog) — as PortalMenu / TagPicker do (REG-4, REG-124)
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0)
    return () => { document.removeEventListener('keydown', onKey, true); clearTimeout(t); document.removeEventListener('pointerdown', onDown, true) }
  }, [open, onClose, sheet])

  /* (REG-353) ≤767 the canvas draws this menu as a bottom sheet — full width over the dock, under a scrim,
     with the grabber and a heading — instead of a 200px card anchored to a trigger that can sit anywhere. */
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title={sheetTitle} subtitle={sheetSubtitle} label={sheetTitle ?? 'Menu'}
             role="menu" bodyClassName={sheetMenuBody}>
        {children}
      </Sheet>
    )
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={ref}
          className={styles.menu}
          role="menu"
          variants={anchoredSurface}
          initial="initial" animate="animate" exit="exit"
          style={{
            width,
            ...(side === 'down' ? { top: 'calc(100% + 4px)' } : { bottom: 'calc(100% + 4px)' }),
            transformOrigin: `${side === 'down' ? 'top' : 'bottom'} ${align}`,
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
          }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/** (REG-728) The menu width scale — one width per kind of menu, not one per menu: standard rows · a status list or rows with a second
 *  line or a key hint · rows with a description. A field's list takes its field's width; the mock-backed exceptions keep theirs
 *  (the notes family's 140, 931:45488; the Add Item box's 360, 1271:40932; the 400 popovers). */
export const MENU_WIDTH = { standard: 200, wide: 240, detail: 320 } as const

export function DropdownItem({ children, onSelect, tone, disabled, title, help, meta, selected, role = 'menuitem', checked, submenu, keys, shortcut }: {
  children: ReactNode
  onSelect: () => void
  /** Destructive item (Delete) — red text, as om/menu's `tone`. A disabled one reads disabled, not dangerous (REG-265). */
  tone?: 'danger'
  /** Shown but inert (REG-265: a stage-logged record's Edit / Delete). (REG-728) Its `title` — the reason — is printed IN the row, under
   *  the label, never as a native tooltip (it never shows on touch, and REG-656 says a refused choice says why in the row). */
  disabled?: boolean
  title?: string
  /** (REG-728) A second line under the label, 12/16 grey: a description, a rule. */
  help?: ReactNode
  /** (REG-728) At the row's end, 12/16 grey: "current", a count. */
  meta?: ReactNode
  /** (REG-728) The DS Selected state (primary-variant fill) for a row whose label is not plain text — a row with an icon, a swatch, a
   *  second line — which `checked` alone cannot mark. */
  selected?: boolean
  /** A radio / checkbox row (View by, density, a status) says which value is current through `checked` (aria-checked);
   *  the keyboard then opens the menu on that row (components/om/surface.ts). Plain rows stay `menuitem`. */
  role?: 'menuitem' | 'menuitemradio' | 'menuitemcheckbox'
  checked?: boolean
  /** The row opens a further level in place (aria-haspopup="menu"). */
  submenu?: boolean
  /** (REG-715) The row's keyboard shortcut at its right end, as desktop menus show it — a spec, or an id in `lib/keys/registry.ts`. */
  keys?: string
  shortcut?: string
}) {
  /* (audit 2026-09-26, fresh-phone 10) A radio / checkbox row whose label is plain text drew nothing for its checked state, so a scope
     pill's sheet ("Kind: All ▾") could not say which choice was current. It now wears the DS menu item's Selected state (primary/variant
     fill — `.item[data-selected]`, the one the "All Leads" pill's current stage wears, 780:93630). A row that draws its own mark (a radio
     glyph, a "current" tag) passes elements, and is left as it is. */
  const isSelected = selected ?? (role !== 'menuitem' && !!checked && plainText(children))
  const line2 = help ?? (disabled && title ? title : undefined)
  return (
    <button type="button" role={role} className={styles.item} data-tone={tone} aria-disabled={disabled || undefined} title={disabled ? undefined : title}
            aria-checked={role === 'menuitem' ? undefined : !!checked} aria-haspopup={submenu ? 'menu' : undefined}
            data-selected={isSelected || undefined} data-kb={shortcut} aria-keyshortcuts={keys || shortcut ? ariaKeys(keys ?? keysOf(shortcut!) ?? '') : undefined}
            onClick={disabled ? undefined : onSelect}>
      {line2 ? (
        <span className={styles.itemStack}><span className={styles.itemLabel}>{children}</span><span className={styles.itemHelp}>{line2}</span></span>
      ) : children}
      {meta ? <span className={styles.itemMeta}>{meta}</span> : null}
      {keys || shortcut ? <Keys spec={keys} shortcut={shortcut} className={styles.itemKeys} /> : null}
    </button>
  )
}

const plainText = (c: ReactNode): boolean => typeof c === 'string' || typeof c === 'number' || (Array.isArray(c) && c.every((x) => typeof x === 'string' || typeof x === 'number'))

export function DropdownDivider() {
  return <div className={styles.divider} role="separator" />
}

/** (REG-728) A group's title inside a menu — the stage menu's recipe (780:86452), now every menu's: 10/500 uppercase, 12 padding, grey,
 *  or a stage's tone with its 8px dot. */
export function DropdownLabel({ children, tone, dot = false }: { children: ReactNode; tone?: 'green' | 'orange' | 'blue'; dot?: boolean }) {
  return (
    <div className={styles.label} data-tone={tone} data-menu-label="" role="presentation">
      {dot ? <span className={styles.labelDot} data-tone={tone} aria-hidden /> : null}{children}
    </div>
  )
}
