'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { Tooltip } from '@/components/om/tooltip'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { AiMark } from '@/components/writing/writing-help'
import { askAbout } from '@/components/maison-ai/dock/maison-dock'
import { useDashFrame } from '@/components/dashboard/frame/frame-context'
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import { useSheetLayout } from '@/components/om/sheet'
import styles from './cards.module.css'

/**
 * (the Dashboard redesigned, 2026-10-26 — lane D3; brief § 4 "Shared marks") A card of the grid, and its head: one frame for Needs you and the
 * five cards, so every card reads the same. `askAbout('<card>')` puts the card in Maison AI's context (lane D4's dock); (lane D1, his Q-06) the
 * card's ⋮ › Hide this card hides it for yourself, with Undo (the page's frame does it — components/dashboard/frame/frame-context.tsx; outside
 * the Dashboard's frame there is no Hide).
 *
 * (the calm pass, 2026-10-26 — his "too busy … simplify" and the Claude Design option, brief-calm.md § 1 · § 2.4 · § 2.6; lane C3) **A white card
 * with no border and no shadow**, 8 round (the house's card radius, not the option's 16), the page's own padding inside (`--dash-card-pad`, set
 * by the page — lane C1). **Its head at rest is three things:** the title in sentence case, its count in the secondary ink right after it
 * ("Needs you 51"), and at its right ONE quiet fact or control (`legend`: Needs you's tabs, Your day's week, "22 open", "All photos"). **What he
 * marked Build stays, out of sight until wanted:** the ✦ Ask and the ⋮ (Hide this card) sit at the head's end, after the slot — invisible but
 * holding their room at rest, so nothing in the head moves when they appear on the card's hover or the keyboard's focus in its head; under a
 * finger (a phone, a touch tablet — REG-307's rule: no hover there) they are one ⋮, holding Ask Maison AI and Hide this card. The slot may
 * shrink (Needs you's tabs scroll in their rail) — the title never gives way to it.
 *
 * Props are the first pass's (lane C2's Needs you passes them as it did): `meta` is the count — a first-pass "· 51" reads "51" —; `legend` the
 * one right slot. `wide` lets the slot take a row of its own when the card is narrow (Your day's week). `inset` — the frame pads the card's body
 * with the page's padding; Needs you pads its own (its rows keep 8 of it for their hover wash — lane C2), so its body takes none.
 */
export function CardFrame({ card, title, meta, legend, wide = false, inset = card !== 'needs', testId, children }: {
  /** the card's key — `data-card` (the phone's reading order) and Ask's context; (lane D2) Needs you wears the same head */
  card: 'needs' | 'day' | 'pipeline' | 'projects' | 'team' | 'site'
  title: string
  /** the count after the title, in the secondary ink ("51") */
  meta?: ReactNode
  /** the head's one right slot: a quiet fact or one control */
  legend?: ReactNode
  /** (the calm pass) the right slot takes a row of its own under the title when the card is too narrow for both (Your day's week) */
  wide?: boolean
  /** (the calm pass) the frame pads the body with the page's padding — Needs you's body pads itself (false by default for it) */
  inset?: boolean
  testId: string
  children: ReactNode
}) {
  const frame = useDashFrame()
  const hideable = !!frame?.canHide(card)
  /* under a finger the tools are always on — hover never comes (REG-307 · REG-310: hover-revealed controls are always on there) */
  const touch = useMediaQuery(TOUCH_TABLET)
  /* (the calm UI build 2026-10-27 — the audit's 1-28) a phone's cards carry no ⋮ of their own: a card hides from the page's ⋮ beside the
     greeting, and Maison AI is the dock at the page's foot */
  const phone = useSheetLayout()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const headId = useId()
  const count = typeof meta === 'string' ? meta.replace(/^\s*·\s*/, '') : meta
  const menu = !phone
  /* (the calm UI build 2026-10-27 — the audit's 1-19: one door for Maison AI) at the head's end, after the slot: ONE ⋮ — Ask Maison AI about
     this, Hide this card — shown on hover / focus at a desk, always under a finger (the ✦ Ask button beside it went into the ⋮) */
  const tools = (
    <span className={styles.tools} data-touch={touch || undefined}>
      {menu ? (
        <span ref={anchor} className={styles.cardMenu}>
          <Tooltip label="More" disabled={open}>
            <IconButton icon="more_vert" label={`More on ${title}`} variant="bare" size={24} aria-haspopup="menu" aria-expanded={open}
                        onClick={() => setOpen((o) => !o)} data-testid={`menu-${card}`} />
          </Tooltip>
        </span>
      ) : null}
    </span>
  )
  return (
    <div data-card={card} className={styles.frame}>
      <section className={styles.card} data-card={testId} aria-labelledby={headId}>
        <div className={styles.head} data-wide={wide || undefined}>
          <h2 className={styles.headTitle} id={headId}>
            <span className={styles.headName}>{title}</span>
            {count !== undefined && count !== null && count !== '' ? <span className={styles.headCount} data-testid={`${testId}-count`}>{count}</span> : null}
          </h2>
          {legend ? <div className={styles.headRight}>{legend}</div> : null}
          {menu ? tools : null}
        </div>
        <div className={styles.body} data-inset={inset || undefined}>{children}</div>
      </section>
      {menu ? (
        <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={title}>
          <span data-testid={`ask-${card}`} className={styles.menuRow}>
            <span data-testid={`${testId}-ask`} className={styles.menuRow}>
              <DropdownItem onSelect={() => { setOpen(false); askAbout(card) }}><span className={styles.menuGlyph}><AiMark />Ask Maison AI about this</span></DropdownItem>
            </span>
          </span>
          {hideable ? (
            <span data-testid={`hide-${card}`} className={styles.menuRow}>
              <DropdownItem help="Only for you — show it again from ⋮ beside the greeting" onSelect={() => { setOpen(false); frame?.hide(card) }}>Hide this card</DropdownItem>
            </span>
          ) : null}
        </PortalMenu>
      ) : null}
    </div>
  )
}
