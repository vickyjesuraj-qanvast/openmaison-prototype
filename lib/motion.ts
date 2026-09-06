/**
 * Motion tokens — build plan §03.
 * Anchored on the designer's own Figma reaction timings:
 *   hover micro-motion  = 50ms ease-out        (56 reactions)
 *   control toggles     = 150ms ease-in-out    (10 reactions)
 * extended into a coherent scale for surfaces Figma cannot express.
 * All animation is transform/opacity only; prefers-reduced-motion collapses
 * everything to an 80ms opacity fade (see globals.css).
 */

export const duration = {
  hover: 0.05,      // Figma: 50ms
  toggle: 0.15,     // Figma: 150ms
  menu: 0.15,
  menuExit: 0.1,
  modal: 0.2,
  modalExit: 0.14,
  step: 0.22,
  sheet: 0.28,
  sheetExit: 0.18,
  snackbar: 0.2,
} as const

export const ease = {
  standard: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
}

export const spring = {
  /** Kanban drop / layout re-stacks / FAB sheet. */
  settle: { type: 'spring' as const, stiffness: 380, damping: 30 },
  /** Badge pop-ins. */
  pop: { type: 'spring' as const, stiffness: 500, damping: 28 },
}

/** Framer Motion variants for the anchored-overlay family (menus, popovers). */
export const anchoredSurface = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: duration.menu, ease: ease.decelerate } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: duration.menuExit, ease: ease.standard } },
}

export const modalPanel = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: duration.modal, ease: ease.decelerate } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: duration.modalExit, ease: ease.standard } },
}

export const overlayFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
}

export const sheetRise = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.sheet, ease: ease.decelerate } },
  exit: { opacity: 0, y: 18, transition: { duration: duration.sheetExit, ease: ease.standard } },
}

/** Mobile bottom sheet (REG-353): the surface slides up off the bottom edge and back down — the canvas'
 *  presentation for every menu, popover, picker and form modal at ≤767 (screens 1d…3k). */
export const bottomSheet = {
  initial: { y: '100%' },
  animate: { y: 0, transition: { duration: duration.sheet, ease: ease.decelerate } },
  exit: { y: '100%', transition: { duration: duration.sheetExit, ease: ease.standard } },
}

export const snackbarRise = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.snackbar, ease: ease.decelerate } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}
