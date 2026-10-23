'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * (Quotes on the move, P-02 — his "please go ahead" 2026-10-22) The section screen's contract with `SectionCard`: on a phone and a touch
 * tablet (≤1024) a section opens as its own full-height screen, and the card that section already renders through draws the screen's
 * bar — the section's title, its `actions` as the bar's trailing controls, ← to the section list — with no fold, no handle, and its body as
 * the screen's own scroller. The editor provides the value on the ONE host that is open; every other section's card gets null and renders
 * as the desk's card (hidden by the host). A section package (the Items table, the Payment Schedule…) needs nothing for this: its body
 * renders as it is, and anything it pins at the bottom it renders itself as `position: sticky; bottom: 0` inside its body.
 */
export type SectionScreen = {
  /** ← : back to the section list. */
  onBack: () => void
  /** The bar's title — the section list's own words ("Payment schedule"); the card's title when absent. */
  title?: ReactNode
  /** One line under the title (the Items screen's "16 lines · S$49,838"). */
  subtitle?: ReactNode
}

export const SectionScreenContext = createContext<SectionScreen | null>(null)

/** The screen a section card is drawn in — null on the desk and inside a hidden host. */
export const useSectionScreen = () => useContext(SectionScreenContext)
