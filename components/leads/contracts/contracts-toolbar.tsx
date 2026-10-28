'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { ScopePill } from '@/components/om/scope-pill'
import { useSheetLayout } from '@/components/om/sheet'
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import styles from './contracts-toolbar.module.css'

export type ContractsToolbarProps = {
  /** (REG-735) The list is empty (not filtered): only the title and ⋮ — the empty card carries the ways in, and search, Filters and
      the columns have nothing to act on yet. The first record brings them back. */
  bare?: boolean
  query: string
  onQuery: (q: string) => void
  /** New Contract menu — not mocked; the Quotes New Quote menu (910:36664) copied: From Blank · From Template · Import from File. (pending modules
   *  S03, as the card recommends) Create with AI is gone — 1.0 had none, and nothing behind it would write a contract. */
  onNew: (kind: 'blank' | 'template' | 'import') => void
  /** (Contracts on the move, C4 — P-09 · A-10) Tools › Contracts on a phone: the + asks "Who is it for?" first (the Create Quote step), then
      the kind — given, the phone's + opens that instead of the three-row menu. */
  onWho?: () => void
  onFilter: () => void
  /** Column settings (REG-454) — omitted on a phone, where the cards place every cell themselves. */
  onColumns?: () => void
  /** Number of active filter groups — badge on the filter button (listing pattern). */
  filterCount: number
  /** Header kebab — not mocked; the Quotes kebab (910:36729) copied: Manage Templates · Contracts Settings · Deleted Contracts. */
  onMenu: (action: 'templates' | 'settings' | 'archived' | 'deleted' | 'bundle') => void
  /** (REG-591) How many documents could go together — the item is inert below two. (UX audit C4) `bundleBlock` names why instead —
      "Variation Order 2 has nowhere to sign" — and wins over the count. */
  bundleCount?: number
  bundleBlock?: string | null
  /** (UX audit C5) The to-do chip "Awaiting signature (n)" — shown only while something is out for signature; a press narrows the list to
      it, a second press lets go (REG-666's to-do twin). */
  awaiting?: { count: number; on: boolean; onToggle: () => void }
}

/**
 * Lead Details › Contracts — toolbar row (931:38682 "Section items" 1244×36 H g16, spec design-source/context/lead-contracts/
 * 01-listing-empty.txt): "All Contracts" 16/Bold · New Contract (931:38686 primary outlined, trailing keyboard_arrow_down 20) ·
 * Search 280 (931:38687) · filter_list (931:38688) · more_vert (931:38689).
 * Copied from components/leads/quotes/quotes-toolbar.tsx — same geometry, the contracts' copy.
 * Menus toggle on their own trigger (REG-153); every icon-only control carries a Tooltip (REG-75).
 */
export function ContractsToolbar({ query, onQuery, onNew, onWho, onFilter, onColumns, filterCount, onMenu, bundleCount = 0, bundleBlock, awaiting, bare = false }: ContractsToolbarProps) {
  const noBundle = bundleBlock !== undefined ? bundleBlock : bundleCount < 2 ? 'needs two documents ready to go' : null
  const [menu, setMenu] = useState<'new' | 'more' | null>(null)
  const sheet = useSheetLayout()   // (REG-354) the mobile canvas' one-row toolbar
  /* (Contracts on the move, C4 — A-07 · P-08; the Quotes toolbar's rule, K4 — A-04) A touch tablet folds New Contract into its glyph as the
     phone does (the row is one line there, and the labelled button alone cost the to-do chip its words at 768); the chip keeps its words. */
  const touchTablet = useMediaQuery(TOUCH_TABLET)
  const folded = sheet || touchTablet
  const pick = (fn: () => void) => () => { setMenu(null); fn() }
  /* (A-07) The to-do chip keeps its words at every width; only when the row measures that the title, the chip and the tools don't fit side by
     side (the Tasks page's rule, S46C · H4) does it say its glyph and count — its words stay its name and its tooltip — and the words come back
     once the row has room. Never on a phone, where the chip takes a line of its own (REG-354). Measured, never guessed. */
  const barRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  const compactRef = useRef(false)
  const needRef = useRef(0)
  const todoKey = awaiting && awaiting.count > 0 ? `awaiting:${awaiting.count}` : ''
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el || !todoKey || sheet) { if (compactRef.current) { compactRef.current = false; setCompact(false) } return }
    const fit = () => {
      const kids = Array.from(el.children) as HTMLElement[]
      const gap = 16 * Math.max(0, kids.length - 1)
      const needOf = (k: HTMLElement) => { if (k.tagName === 'H2') { const r = document.createRange(); r.selectNodeContents(k); return r.getBoundingClientRect().width } return Math.max(k.scrollWidth, k.getBoundingClientRect().width) }
      const need = kids.reduce((n, k) => n + needOf(k), 0) + gap
      if (!compactRef.current) {
        if (need > el.clientWidth + 1) { needRef.current = need; compactRef.current = true; setCompact(true) }
      } else if (el.clientWidth >= needRef.current) { compactRef.current = false; setCompact(false) }
    }
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [todoKey, sheet])

  return (
    <div className={styles.bar} ref={barRef}>
      <h2 className={styles.title}>All contracts</h2>
      {/* (UX audit C5) What waits today, before the tools — on a phone its own line under the row (A-07: its words, never a pencil and a number) */}
      {!bare && awaiting && awaiting.count > 0 ? (
        <span className={styles.todo} data-testid="contracts-awaiting" data-compact={compact || undefined}>
          <Tooltip label={`Waiting for signature · ${awaiting.count}`} disabled={!compact}>
            <ScopePill tone="attention" icon="draw" menu={false} label={`Waiting for signature · ${awaiting.count}`} short={compact ? String(awaiting.count) : undefined} compact={compact} selected={awaiting.on} onClick={awaiting.onToggle} />
          </Tooltip>
        </span>
      ) : null}
      <div className={styles.actions}>
        {bare ? null : (<>
        <span className={styles.menuWrap}>
          {/* (REG-354) ≤767 the canvas' toolbar is one row of glyphs, so the labelled primary is its icon — (C4) and on a touch tablet;
              the menu, its title and every action behind it are the same. (P-09) Tools' phone + asks who it is for first. */}
          {folded ? (
            <Tooltip shortcut="create" label="New contract">
              <IconButton icon="add" label="New contract" variant="primary"
                          aria-haspopup={sheet && onWho ? 'dialog' : 'menu'} aria-expanded={sheet && onWho ? undefined : menu === 'new'} data-kb="create" data-kb-label="New contract"
                          onClick={() => { if (sheet && onWho) onWho(); else setMenu((m) => (m === 'new' ? null : 'new')) }} />
            </Tooltip>
          ) : (
            <Button
              variant="primary" appearance="outlined"
              iconEnd={<span className={styles.chev} data-open={menu === 'new' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
              aria-haspopup="menu" aria-expanded={menu === 'new'} data-kb="create" data-kb-label="New contract"
              onPress={() => setMenu((m) => (m === 'new' ? null : 'new'))}
            >
              New contract
            </Button>
          )}
          <Dropdown open={menu === 'new'} onClose={() => setMenu(null)} align="left" sheetTitle="New contract">
            <DropdownItem onSelect={pick(() => onNew('blank'))}>From the studio agreement</DropdownItem>   {/* (sweep S2 #20) what it makes — the full agreement, as the picker says; "From Blank" made no blank */}
            <DropdownItem onSelect={pick(() => onNew('template'))}>From a template</DropdownItem>   {/* (the calm UI build 2026-10-27, W-199 · T-13) sentence case, parallel */}
            <DropdownItem onSelect={pick(() => onNew('import'))}>Import a file</DropdownItem>
          </Dropdown>
        </span>
        <ToolbarSearch query={query} onQuery={onQuery} placeholder="Search client, title, quote number…" label="Search contracts" />
        <span className={styles.filterWrap}>
          <Tooltip label="Filters" shortcut="filters">
            <IconButton icon="filter_list" data-kb="filters" data-kb-label="Filters" label={filterCount ? `Filters (${filterCount} active)` : 'Filters'} onClick={onFilter} selected={filterCount > 0} />
          </Tooltip>
          {filterCount > 0 ? <span className={styles.filterBadge} aria-hidden>{filterCount}</span> : null}
        </span>
        {onColumns ? (
          /* Column settings (REG-454): the same drawer as the leads listing, after Filters — hidden ≤767 where the cards place every cell. */
          <Tooltip label="Column settings">
            <IconButton icon="tune" label="Column settings" onClick={onColumns} />
          </Tooltip>
        ) : null}
        </>)}
        <span className={styles.menuWrap}>
          <Tooltip label="More options" disabled={menu === 'more'}>
            <IconButton
              icon="more_vert" label="More options"
              aria-haspopup="menu" aria-expanded={menu === 'more'}
              onClick={() => setMenu((m) => (m === 'more' ? null : 'more'))}
            />
          </Tooltip>
          {/* (REG-728) 240: Send together's row carries its reason as a second line (UX audit C4 names the document) */}
          <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} sheetTitle="All contracts">
            {/* Quotes kebab 910:36729 with "Quotes Settings" → "Contracts Settings", "Deleted Quotes" → "Deleted Contracts". */}
            {/* (REG-591) Send together: every unsigned document of the lead under one signing link. */}
            {/* (sweep S2 #23) greyed with its reason — (REG-728) in the row's own reason line, under its words */}
            {/* (UX audit C4) the reason names the document that holds it back */}
            <DropdownItem disabled={!!noBundle} title={noBundle ?? undefined} onSelect={pick(() => onMenu('bundle'))}>Send together for signature</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('templates'))}>Manage templates</DropdownItem>
            {/* (pending modules S03, as the card recommends) Settings › Quotes & pricing › Contracts — the signing links' window */}
            <DropdownItem onSelect={pick(() => onMenu('settings'))}>Contract settings</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('archived'))}>Archived contracts</DropdownItem>   {/* (sweep S2 · U-07) */}
            <DropdownItem onSelect={pick(() => onMenu('deleted'))}>Deleted contracts</DropdownItem>
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
