'use client'

import { useRef, useState } from 'react'
import { SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { useSheetLayout } from '@/components/om/sheet'
import { CARD_LABEL, HIDEABLE, SCOPE_WORD, cardsFor, needWords, studioDate, type DashCardKey, type DashScope } from '@/lib/dashboard/frame'
import type { DashboardData } from '@/lib/dashboard/model'
import { SinceLink } from './since-chips'
import styles from '../dashboard.module.css'

/**
 * (the Dashboard redesigned, 2026-10-26 — his marks P-02 · Q-06 · Q-07 · lane D1; **the calm pass 2026-10-26** — his "too busy … simplify" and
 * the Claude Design option he took, brief-calm.md § 1 · § 2.4) **The greeting** is the page's title — "Good morning, Dane" by the studio's clock
 * — and ONE line under it in the secondary ink: the day, what needs you in ink ("51 things need you"), and *Since you were last here* as the
 * line's one link ("3 new leads · all from Hangout", or "4 new since Friday" — components/dashboard/frame/since-chips.tsx). At its right, an
 * Owner's or Admin's **Studio / Mine** as a grey track with the chosen one white (the design system's SegmentedButton; remembered on their
 * record) and the page's **⋮**: the cards on your page, each one you may hide ticked or not (Q-06 — Needs you always stays), and Show all
 * cards. It is the level-1 page's header for the phone's top bar (`data-om-l1-header`, REG-362) without the house header's sticky plate: the
 * page greets you and scrolls on.
 *
 * Optional props beyond the contract's `{ data }`: `hidden` (the frame's own list, live with Undo), `onScope`, `onCards` — the frame passes
 * them; without them the switch and the menu are not drawn.
 */
export function Greeting({ data, hidden, onScope, onCards, busy }: {
  data: DashboardData
  hidden?: DashCardKey[]
  onScope?: (scope: DashScope) => void
  /** The cards to hide, as the menu leaves them (the frame writes them with Undo). */
  onCards?: (hidden: DashCardKey[]) => void
  busy?: boolean
}) {
  const [menu, setMenu] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const phone = useSheetLayout()
  const own = cardsFor(data.viewer.role).filter((k) => HIDEABLE.includes(k))
  const off = hidden ?? data.hidden
  const needs = data.needs.rows.length
  /* (the calm UI build 2026-10-27 — the audit's 1-28) on a phone the scope switch leaves its own row: it is the page ⋮'s first group */
  const scopeInMenu = phone && data.canSwitchScope && !!onScope
  const hasMenu = (!!onCards && own.length > 0) || scopeInMenu
  return (
    <header className={styles.hello} data-om-l1-header data-testid="greeting">
      <div className={styles.helloText}>
        <h1 className={styles.helloTitle} data-testid="greeting-title">{data.greeting.title}</h1>
        <p className={styles.helloLine} data-testid="greeting-line">
          {/* the day and the link each kept whole; a dot clings to the words before it, so a narrow line breaks after it. (the calm UI build
              2026-10-27 — the audit's 1-18, T-04) the count of what needs you is said once, in the card's head; the line keeps it for a screen
              reader only, so the page's first sentence still says it */}
          <span className={styles.helloDate}>{studioDate(data.now)}</span>
          <span className="visually-hidden" data-testid="greeting-needs">{` · ${needWords(needs)}`}</span>
          <SinceLink data={data.since} />
        </p>
      </div>
      <div className={styles.helloEnd}>
        {data.canSwitchScope && onScope && !scopeInMenu ? (
          <SegmentedButton aria-label="Show the whole studio or just your own work" selectedKeys={[data.scope]} isDisabled={busy} className={styles.track}
                           onSelectionChange={(keys) => { const k = [...keys][0]; if ((k === 'studio' || k === 'mine') && k !== data.scope) onScope(k) }} data-testid="scope-switch">
            {/* (the calm UI build 2026-10-27 — the audit's 1-16) "Whole studio · Just me" (was "Studio · Mine": "Studio" also names the tasks on no
                lead and the all-hands chat); the keys stay `studio` · `mine` */}
            <SegmentedButtonItem id="studio" className={styles.trackItem}>{SCOPE_WORD.studio}</SegmentedButtonItem>
            <SegmentedButtonItem id="mine" className={styles.trackItem}>{SCOPE_WORD.mine}</SegmentedButtonItem>
          </SegmentedButton>
        ) : null}
        {hasMenu ? (
          <span ref={anchor} className={styles.dashMenu}>
            <IconButton icon="more_vert" label={scopeInMenu ? 'Your page' : 'Cards on your page'} variant="bare" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} data-testid="page-menu" />
          </span>
        ) : null}
      </div>
      {hasMenu ? (
        <PortalMenu open={menu} anchor={anchor} onClose={() => setMenu(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={scopeInMenu ? 'Your page' : 'Cards on your page'}>
          {scopeInMenu ? (
            <>
              <DropdownLabel>Show</DropdownLabel>
              {(['studio', 'mine'] as const).map((k) => (
                <span key={k} data-testid={`page-scope-${k}`} className={styles.menuRow}>
                  <DropdownItem role="menuitemradio" checked={data.scope === k} selected={data.scope === k} disabled={busy}
                                onSelect={() => { setMenu(false); if (k !== data.scope) onScope?.(k) }}>{SCOPE_WORD[k]}</DropdownItem>
                </span>
              ))}
              {onCards && own.length ? <DropdownDivider /> : null}
            </>
          ) : null}
          {onCards && own.length ? <DropdownLabel>Cards on your page</DropdownLabel> : null}
          {(onCards ? own : []).map((k) => {
            const shown = !off.includes(k)
            return (
              <span key={k} data-testid={`page-card-${k}`} className={styles.menuRow}>
                <DropdownItem role="menuitemcheckbox" checked={shown} selected={false} meta={shown ? undefined : 'Hidden'}
                              onSelect={() => { setMenu(false); onCards?.(shown ? [...off, k] : off.filter((x) => x !== k)) }}>
                  <span className={styles.menuCheck}><Icon name={shown ? 'check_box' : 'check_box_outline_blank'} size={20} fill={shown} />{CARD_LABEL[k]}</span>
                </DropdownItem>
              </span>
            )
          })}
          {onCards && off.some((k) => own.includes(k)) ? (
            <>
              <DropdownDivider />
              <span data-testid="page-show-all" className={styles.menuRow}>
                <DropdownItem onSelect={() => { setMenu(false); onCards([]) }}>Show all cards</DropdownItem>
              </span>
            </>
          ) : null}
        </PortalMenu>
      ) : null}
    </header>
  )
}
