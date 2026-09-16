'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { menuSideFor } from '@/components/leads/menu-side'
import menuStyles from '@/components/leads/menus.module.css'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { gridTemplateFor, useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { useRef } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import type { Contract } from '@/lib/db/schema'
import { displayDate } from '@/lib/format'
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/leads/contract-filters'
import styles from './contracts-table.module.css'

/** Row kebab — not mocked for Contracts; copied from the Quotes row kebab (910:36723, REG-177…179):
 *  Preview and Share · Copy Link · Download as PDF · Print · Archive · Delete. */
export type ContractRowAction = 'share' | 'copy' | 'pdf' | 'print' | 'archive' | 'delete'

export type ContractsTableProps = {
  contracts: Contract[]
  onStatus: (contract: Contract, status: ContractStatus) => void
  onView: (contract: Contract) => void
  onRowMenu: (contract: Contract, action: ContractRowAction) => void
  columns: readonly TableColumn[]
  /** A head dropped in a new place — the visible keys in their new order (useTableColumns.reorder). */
  onReorder: (keys: string[]) => void
}

/* Column order + head copy — exactly as the mock types it (931:38691, spec 01-listing-empty.txt). Every head carries unfold_more 16. */
/** The card's mocked tracks by head key (contracts-table.module.css) — the user's dragged widths replace them (REG-427). */
/** The table's columns (931:38691, spec 01): Title locked first; the user's order, visibility and pins come from Column settings (REG-454). */
export const CONTRACT_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'title', label: 'Title', track: 'minmax(555px, 1fr)', locked: true },
  { key: 'status', label: 'Status', track: 'minmax(128px, max-content)' },
  { key: 'created', label: 'Created', track: '120px' },
  { key: 'signedCopy', label: 'Signed Copy', track: '142px' },
  { key: 'sent', label: 'Sent', track: '140px' },
  { key: 'updated', label: 'Updated', track: '157px' },
]
const COL_CLASS: Record<string, string | undefined> = { title: styles.colTitle, status: styles.colStatus, created: styles.colCreated, signedCopy: styles.colSignedCopy, sent: styles.colSent, updated: styles.colUpdated }

/* Which way a row kebab opens is measured when it is pressed, not counted from the row index: a 3-row table leaves
   ~550px of empty frame under the last row, and the old count flipped the menu up over the tabs and the toolbar.
   (REG-286) The measurement was copied from the quotes twin into this file verbatim; both now call the one shared
   rule in components/leads/menu-side.ts. The row kebab draws six items. */
const MENU_ITEMS = 6

/**
 * Lead Details › Contracts table (931:38690, frame 112 listing 931:38666) — spec design-source/context/lead-contracts/
 * 01-listing-empty.txt + 00-build-plan.md. Head 48 · rows 68; columns 557 (fluid) · 128 · 120 · 142 · 140 · 157 (= 1244).
 * No selection column, no bottom bar. Structure copied from components/leads/quotes/quotes-table.tsx (the Quotes twin):
 * every icon-only control carries a Tooltip (REG-75); sorting is inert (coming soon); menus toggle on their own trigger (REG-153).
 */
export function ContractsTable({ contracts, onStatus, onView, onRowMenu, columns, onReorder }: ContractsTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [menuSide, setMenuSide] = useState<'up' | 'down'>('down')   /* measured on open — only one row menu is open at a time */
  const [statusRow, setStatusRow] = useState<string | null>(null)
  const colWidths = useColumnWidths('lead-contracts')
  const tracks = gridTemplateFor(columns, colWidths)
  const headRow = useRef<HTMLDivElement>(null)
  const L = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)   /* drag a head to reorder (REG-462) */
  const [frame, overflowing] = useOverflowX()   // REG-430: the card scrolls sideways only once its tracks run past it

  return (
    <div ref={frame} className={styles.card} role="table" aria-label="Contracts" data-cols="lead-contracts" data-overflow={overflowing || undefined}
         style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      {/* Head row 48 (931:38691 "Table / Row / Contracts" Type=HD) — no selection head in this table. */}
      <div ref={headRow} className={styles.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={{ ...L.style(c.key), ...D.style(c.key) }} {...D.head(c.key)}>
            {/* Sort is inert in this prototype — the head answers coming soon. */}
            <button type="button" className={styles.hSort} onClick={comingSoon}>
              <span className={styles.hLabel}>{c.label}</span>
              <Icon name="unfold_more" size={16} />
            </button>
            <ColumnResizer table="lead-contracts" column={c.key} label={c.label} min={c.key === 'title' ? 120 : 72} />
          </div>
        ))}
      </div>

      {contracts.map((contract) => (
        <ContractRowView L={L}
          key={contract.id}
          contract={contract}
          statusOpen={statusRow === contract.id}
          onStatusToggle={() => setStatusRow((s) => (s === contract.id ? null : contract.id))}
          onStatusClose={() => setStatusRow(null)}
          menuOpen={menuRow === contract.id}
          onMenuToggle={(trigger) => {
            if (menuRow !== contract.id) setMenuSide(menuSideFor(trigger, MENU_ITEMS))   /* measure the room below the kebab before it opens */
            setMenuRow((m) => (m === contract.id ? null : contract.id))
          }}
          onMenuClose={() => setMenuRow(null)}
          /* Kebab flips up only when the menu would not fit below the row (measured above), never by row count. */
          menuSide={menuSide}
          onStatus={onStatus} onView={onView} onRowMenu={onRowMenu}
        />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function ContractRowView({
  contract,
  statusOpen, onStatusToggle, onStatusClose,
  menuOpen, onMenuToggle, onMenuClose, menuSide,
  onStatus, onView, onRowMenu, L,
}: {
  contract: Contract
  statusOpen: boolean
  onStatusToggle: () => void
  onStatusClose: () => void
  menuOpen: boolean
  onMenuToggle: (trigger: HTMLElement) => void
  onMenuClose: () => void
  menuSide: 'up' | 'down'
  onStatus: (contract: Contract, status: ContractStatus) => void
  onView: (contract: Contract) => void
  onRowMenu: (contract: Contract, action: ContractRowAction) => void
  L: ReturnType<typeof useColumnLayout>
}) {
  const pick = (action: ContractRowAction) => () => { onMenuClose(); onRowMenu(contract, action) }
  const pickStatus = (status: ContractStatus) => () => { onStatusClose(); onStatus(contract, status) }

  return (
    <div className={styles.row} role="row">
      {/* Title cell "Cell / Two line" 557×68 p24/24/24/16 (931:38692): ONE line — "General Contract Agreement" 14/Medium
          (subtitle-m); the mock's Two-line cell carries no secondary text. */}
      <div className={`${styles.cell} ${styles.colTitle} ${L.pinned('title') ? styles.pin : ''}`} role="cell" data-col="title" data-pin-edge={L.edge('title') || undefined} style={L.style('title')}>
        <button type="button" className={styles.title} onClick={() => onView(contract)}>{contract.title}</button>
      </div>

      {/* Status cell: "Draft" 14/Regular + keyboard_arrow_down 20 (H g4) → status menu over CONTRACT_STATUSES
          (not mocked — the Quotes status menu 910:36673 pattern, current marked; REG-178). */}
      <div className={`${styles.cell} ${styles.colStatus} ${L.pinned('status') ? styles.pin : ''}`} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')}>
        <span className={styles.statusWrap}>
          <button
            type="button" className={styles.statusBtn}
            aria-haspopup="menu" aria-expanded={statusOpen}
            aria-label={`Status ${contract.status} — change status`}
            onClick={onStatusToggle}
          >
            {contract.status}
            <span className={styles.chev} data-open={statusOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
          </button>
          <Dropdown open={statusOpen} onClose={onStatusClose} align="left" sheetTitle="Status">
            {/* Items are raw menu buttons (like components/leads/stage-dropdown.tsx) so the current status can carry
                aria-current + the "current" meta — DropdownItem takes no attributes. */}
            {CONTRACT_STATUSES.map((s) => {
              const isCurrent = s === contract.status
              return (
                <button
                  key={s} type="button" role="menuitem" className={menuStyles.item}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={pickStatus(s)}
                >
                  <span className={styles.itemText}>{s}</span>
                  {isCurrent ? <span className={styles.meta}>current</span> : null}
                </button>
              )
            })}
          </Dropdown>
        </span>
      </div>

      {/* Created · Signed Copy · Sent · Updated — "17 Jul ‘26" / file name 14/Regular ink, "-" when empty (931:38692). */}
      <div className={`${styles.cell} ${styles.colCreated} ${L.pinned('created') ? styles.pin : ''}`} role="cell" data-col="created" data-pin-edge={L.edge('created') || undefined} style={L.style('created')}>{displayDate(contract.createdAt)}</div>
      <div className={`${styles.cell} ${styles.colSignedCopy} ${L.pinned('signedCopy') ? styles.pin : ''}`} role="cell" data-col="signedCopy" data-pin-edge={L.edge('signedCopy') || undefined} style={L.style('signedCopy')}>
        <span className={styles.oneLine}>{contract.signedCopy ?? '-'}</span>
      </div>
      <div className={`${styles.cell} ${styles.colSent} ${L.pinned('sent') ? styles.pin : ''}`} role="cell" data-col="sent" data-pin-edge={L.edge('sent') || undefined} style={L.style('sent')}>{contract.sentAt ? displayDate(contract.sentAt) : '-'}</div>
      <div className={`${styles.cell} ${styles.colUpdated} ${L.pinned('updated') ? styles.pin : ''}`} role="cell" data-col="updated" data-pin-edge={L.edge('updated') || undefined} style={L.style('updated')}>{displayDate(contract.updatedAt ?? contract.createdAt)}</div>

      {/* Row hover actions — not mocked for Contracts; the Quotes "Hover button" (910:36644 / 910:36709) copied:
          View + kebab, level-1 shadow, right 24, vertically centred in the 68 row. */}
      <span className={styles.actions} data-open={menuOpen || undefined}>
        <span className={styles.actionsInner}>
        <span className={styles.float}>
          <Button variant="primary" appearance="outlined" onPress={() => onView(contract)}>View</Button>
        </span>
        <span className={styles.menuWrap}>
          <span className={styles.float}>
            <Tooltip label="More actions" disabled={menuOpen}>
              <IconButton icon="more_vert" label={`More actions for ${contract.title}`} variant="primary"
                          aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => onMenuToggle(e.currentTarget)} />
            </Tooltip>
          </span>
          <Dropdown open={menuOpen} onClose={onMenuClose} align="right" side={menuSide} sheetTitle={contract.title}>
            {/* Quotes row kebab 910:36723 — verbatim order (REG-177). */}
            <DropdownItem onSelect={pick('share')}>Preview and Share</DropdownItem>
            <DropdownItem onSelect={pick('copy')}>Copy Link</DropdownItem>
            <DropdownItem onSelect={pick('pdf')}>Download as PDF</DropdownItem>
            <DropdownItem onSelect={pick('print')}>Print</DropdownItem>
            <DropdownItem onSelect={pick('archive')}>Archive</DropdownItem>
            <DropdownItem onSelect={pick('delete')}><span className={styles.danger}>Delete</span></DropdownItem>
          </Dropdown>
        </span>
        </span>
      </span>
    </div>
  )
}
