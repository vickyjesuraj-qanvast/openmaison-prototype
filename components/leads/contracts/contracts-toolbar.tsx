'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { ScopePill } from '@/components/om/scope-pill'
import { useSheetLayout } from '@/components/om/sheet'
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
export function ContractsToolbar({ query, onQuery, onNew, onFilter, onColumns, filterCount, onMenu, bundleCount = 0, bundleBlock, awaiting, bare = false }: ContractsToolbarProps) {
  const noBundle = bundleBlock !== undefined ? bundleBlock : bundleCount < 2 ? 'needs two documents ready to go' : null
  const [menu, setMenu] = useState<'new' | 'more' | null>(null)
  const sheet = useSheetLayout()   // (REG-354) the mobile canvas' one-row toolbar
  const pick = (fn: () => void) => () => { setMenu(null); fn() }

  return (
    <div className={styles.bar}>
      <h2 className={styles.title}>All Contracts</h2>
      <div className={styles.actions}>
        {bare ? null : (<>
        {awaiting && awaiting.count > 0 ? (
          <span className={styles.todo} data-testid="contracts-awaiting">
            <ScopePill tone="attention" icon="draw" menu={false} label={`Awaiting signature (${awaiting.count})`} short={String(awaiting.count)} selected={awaiting.on} onClick={awaiting.onToggle} />
          </span>
        ) : null}
        <span className={styles.menuWrap}>
          {/* (REG-354) ≤767 the canvas' toolbar is one row of glyphs, so the labelled primary is its icon;
              the menu, its title and every action behind it are the same. */}
          {sheet ? (
            <Tooltip shortcut="create" label="New Contract">
              <IconButton icon="add" label="New Contract" variant="primary"
                          aria-haspopup="menu" aria-expanded={menu === 'new'} data-kb="create" data-kb-label="New Contract"
                          onClick={() => setMenu((m) => (m === 'new' ? null : 'new'))} />
            </Tooltip>
          ) : (
            <Button
              variant="primary" appearance="outlined"
              iconEnd={<span className={styles.chev} data-open={menu === 'new' || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
              aria-haspopup="menu" aria-expanded={menu === 'new'} data-kb="create" data-kb-label="New Contract"
              onPress={() => setMenu((m) => (m === 'new' ? null : 'new'))}
            >
              New Contract
            </Button>
          )}
          <Dropdown open={menu === 'new'} onClose={() => setMenu(null)} align="left" sheetTitle="New Contract">
            <DropdownItem onSelect={pick(() => onNew('blank'))}>From the studio agreement</DropdownItem>   {/* (sweep S2 #20) what it makes — the full agreement, as the picker says; "From Blank" made no blank */}
            <DropdownItem onSelect={pick(() => onNew('template'))}>From Template</DropdownItem>
            <DropdownItem onSelect={pick(() => onNew('import'))}>Import from File</DropdownItem>
          </Dropdown>
        </span>
        <ToolbarSearch query={query} onQuery={onQuery} placeholder="Search title, status, date…" label="Search contracts" />
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
          <Dropdown open={menu === 'more'} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.wide} sheetTitle="All Contracts">
            {/* Quotes kebab 910:36729 with "Quotes Settings" → "Contracts Settings", "Deleted Quotes" → "Deleted Contracts". */}
            {/* (REG-591) Send together: every unsigned document of the lead under one signing link. */}
            {/* (sweep S2 #23) greyed with its reason — (REG-728) in the row's own reason line, under its words */}
            {/* (UX audit C4) the reason names the document that holds it back */}
            <DropdownItem disabled={!!noBundle} title={noBundle ?? undefined} onSelect={pick(() => onMenu('bundle'))}>Send together for signature</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('templates'))}>Manage Templates</DropdownItem>
            {/* (pending modules S03, as the card recommends) Settings › Quotes & pricing › Contracts — the signing links' window */}
            <DropdownItem onSelect={pick(() => onMenu('settings'))}>Contracts Settings</DropdownItem>
            <DropdownItem onSelect={pick(() => onMenu('archived'))}>Archived Contracts</DropdownItem>   {/* (sweep S2 · U-07) */}
            <DropdownItem onSelect={pick(() => onMenu('deleted'))}>Deleted Contracts</DropdownItem>
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
