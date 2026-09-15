'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { menuSideFor } from '@/components/leads/menu-side'
import menuStyles from '@/components/leads/menus.module.css'
import { ColumnResizer, gridTracks, useColumnWidths } from '@/components/om/column-resize'
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
}

/* Column order + head copy — exactly as the mock types it (931:38691, spec 01-listing-empty.txt). Every head carries unfold_more 16. */
/** The card's mocked tracks by head key (contracts-table.module.css) — the user's dragged widths replace them (REG-427). */
const TRACKS = [{ key: 'title', track: 'minmax(120px, 1fr)' }, { key: 'status', track: 'minmax(128px, max-content)' }, { key: 'created', track: 'minmax(96px, 120px)' }, { key: 'signedCopy', track: 'minmax(112px, 142px)' }, { key: 'sent', track: 'minmax(112px, 140px)' }, { key: 'updated', track: 'minmax(112px, 157px)' }]
const HEADS: { key: string; label: string; col: string | undefined }[] = [
  { key: 'title', label: 'Title', col: styles.colTitle },
  { key: 'status', label: 'Status', col: styles.colStatus },
  { key: 'created', label: 'Created', col: styles.colCreated },
  { key: 'signedCopy', label: 'Signed Copy', col: styles.colSignedCopy },
  { key: 'sent', label: 'Sent', col: styles.colSent },
  { key: 'updated', label: 'Updated', col: styles.colUpdated },
]

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
export function ContractsTable({ contracts, onStatus, onView, onRowMenu }: ContractsTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [menuSide, setMenuSide] = useState<'up' | 'down'>('down')   /* measured on open — only one row menu is open at a time */
  const [statusRow, setStatusRow] = useState<string | null>(null)
  const colWidths = useColumnWidths('lead-contracts')
  const tracks = gridTracks(TRACKS, colWidths)

  return (
    <div className={styles.card} role="table" aria-label="Contracts" data-cols="lead-contracts" style={tracks ? ({ '--tracks': tracks } as React.CSSProperties) : undefined}>
      {/* Head row 48 (931:38691 "Table / Row / Contracts" Type=HD) — no selection head in this table. */}
      <div className={styles.head} role="row">
        {HEADS.map((h) => (
          <div key={h.key} className={`${styles.hCell} ${h.col ?? ''}`} role="columnheader">
            {/* Sort is inert in this prototype — the head answers coming soon. */}
            <button type="button" className={styles.hSort} onClick={comingSoon}>
              <span className={styles.hLabel}>{h.label}</span>
              <Icon name="unfold_more" size={16} />
            </button>
            <ColumnResizer table="lead-contracts" column={h.key} label={h.label} min={h.key === 'title' ? 120 : 72} />
          </div>
        ))}
      </div>

      {contracts.map((contract) => (
        <ContractRowView
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
  onStatus, onView, onRowMenu,
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
}) {
  const pick = (action: ContractRowAction) => () => { onMenuClose(); onRowMenu(contract, action) }
  const pickStatus = (status: ContractStatus) => () => { onStatusClose(); onStatus(contract, status) }

  return (
    <div className={styles.row} role="row">
      {/* Title cell "Cell / Two line" 557×68 p24/24/24/16 (931:38692): ONE line — "General Contract Agreement" 14/Medium
          (subtitle-m); the mock's Two-line cell carries no secondary text. */}
      <div className={`${styles.cell} ${styles.colTitle}`} role="cell">
        <span className={styles.title}>{contract.title}</span>
      </div>

      {/* Status cell: "Draft" 14/Regular + keyboard_arrow_down 20 (H g4) → status menu over CONTRACT_STATUSES
          (not mocked — the Quotes status menu 910:36673 pattern, current marked; REG-178). */}
      <div className={`${styles.cell} ${styles.colStatus}`} role="cell">
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
      <div className={`${styles.cell} ${styles.colCreated}`} role="cell">{displayDate(contract.createdAt)}</div>
      <div className={`${styles.cell} ${styles.colSignedCopy}`} role="cell">
        <span className={styles.oneLine}>{contract.signedCopy ?? '-'}</span>
      </div>
      <div className={`${styles.cell} ${styles.colSent}`} role="cell">{contract.sentAt ? displayDate(contract.sentAt) : '-'}</div>
      <div className={`${styles.cell} ${styles.colUpdated}`} role="cell">{displayDate(contract.updatedAt ?? contract.createdAt)}</div>

      {/* Row hover actions — not mocked for Contracts; the Quotes "Hover button" (910:36644 / 910:36709) copied:
          View + kebab, level-1 shadow, right 24, vertically centred in the 68 row. */}
      <span className={styles.actions} data-open={menuOpen || undefined}>
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
    </div>
  )
}
