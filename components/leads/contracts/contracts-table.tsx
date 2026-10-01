'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ds'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { ACTIONS_TRAIL, gridTemplateFor, useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { useRef } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import type { Contract } from '@/lib/db/schema'
import { displayDate, displayDateTime } from '@/lib/format'
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/leads/contract-filters'
import { CLIENT_SIGNED_RULE, UNSIGN_ROLE_RULE } from '@/lib/contracts/policy'
import { awaitingLine } from '@/lib/contracts/model'
import styles from './contracts-table.module.css'

/** (Dane UAT 8.23) A date cell: the mock's date, its time in the house tooltip on hover (a finger never leaves one behind). */
function DateTip({ at }: { at: Date }) {
  return <Tooltip label={displayDateTime(at)}><span data-testid="contract-date">{displayDate(at)}</span></Tooltip>
}

/** Row kebab — not mocked for Contracts; copied from the Quotes row kebab (910:36723, REG-177…179):
 *  Preview and Share · Copy Link · Download as PDF · Print · Archive · Delete. (UX audit C5 · C9) After Copy Link: Send a reminder (out for
 *  signature) and Mark as signed… (not signed yet). */
export type ContractRowAction = 'share' | 'copy' | 'remind' | 'signed' | 'pdf' | 'print' | 'archive' | 'delete'

export type ContractsTableProps = {
  contracts: Contract[]
  onStatus: (contract: Contract, status: ContractStatus) => void
  onView: (contract: Contract) => void
  onRowMenu: (contract: Contract, action: ContractRowAction) => void
  /** (REG-534) Tools › Contracts: the lead each row belongs to, as a link to its Contracts tab. */
  leadOf?: (contract: Contract) => { name: string; href: string } | null
  columns: readonly TableColumn[]
  /** A head dropped in a new place — the visible keys in their new order (useTableColumns.reorder). */
  onReorder: (keys: string[]) => void
  /** (REG-631, contracts parity Q-04) Why a status is out of reach for this row (a signature the client made; not an Owner / Admin), else null. */
  statusBlock?: (contract: Contract, status: ContractStatus) => string | null
  /** (REG-634, contracts parity Q-21) Why this row's Delete is out of reach (not its creator, an Owner or an Admin), else null. */
  deleteBlock?: (contract: Contract) => string | null
  /** (UX audit C5) The host's clock (never Date.now() in render) — "Sent 3d ago · not opened" under a status out for signature. */
  now?: number
}

/* Column order + head copy — exactly as the mock types it (931:38691, spec 01-listing-empty.txt). Every head carries unfold_more 16. */
/** The card's mocked tracks by head key (contracts-table.module.css) — the user's dragged widths replace them (REG-427). */
/** The table's columns (931:38691, spec 01): Title locked first; the user's order, visibility and pins come from Column settings (REG-454). */
export const CONTRACT_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'title', label: 'Title', track: 'minmax(555px, 1fr)', locked: true },
  { key: 'lead', label: 'Lead', track: '180px' },   /* (REG-534) Tools › Contracts only — the quotes list's Client column */
  { key: 'status', label: 'Status', track: 'minmax(128px, max-content)' },
  { key: 'created', label: 'Created', track: '120px' },
  { key: 'signedCopy', label: 'Signed Copy', track: '142px' },
  { key: 'sent', label: 'Sent', track: '140px' },
  { key: 'updated', label: 'Updated', track: '157px' },
]
/* (REG-468) No sort glyph where ordering means nothing — see the sort audit of 2026-09-16. */
const SORTABLE: Record<string, boolean> = { title: false, signedCopy: false, lead: false }
/** The tab's columns (no Lead) or the studio list's (with it) — the quotes table's `quoteColumnDefs` (REG-422). */
export const contractColumnDefs = (withLead: boolean) => CONTRACT_COLUMN_DEFS.filter((d) => d.key !== 'lead' || withLead)
const COL_CLASS: Record<string, string | undefined> = { title: styles.colTitle, lead: styles.colLead, status: styles.colStatus, created: styles.colCreated, signedCopy: styles.colSignedCopy, sent: styles.colSent, updated: styles.colUpdated }

/* (sweep S2 #4 · U-09) The row kebab and the Status menu open through the body portal (PortalMenu flips on the viewport), as the quotes
   twin's do — inline in the scrolling card, a one-row table showed only Archive and Delete and the Status list was cut. */

/**
 * Lead Details › Contracts table (931:38690, frame 112 listing 931:38666) — spec design-source/context/lead-contracts/
 * 01-listing-empty.txt + 00-build-plan.md. Head 56 · rows 68; columns 557 (fluid) · 128 · 120 · 142 · 140 · 157 (= 1244).
 * No selection column, no bottom bar. Structure copied from components/leads/quotes/quotes-table.tsx (the Quotes twin):
 * every icon-only control carries a Tooltip (REG-75); sorting is inert (coming soon); menus toggle on their own trigger (REG-153).
 */
export function ContractsTable({ contracts, onStatus, onView, onRowMenu, leadOf, columns, onReorder, statusBlock, deleteBlock, now }: ContractsTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [statusRow, setStatusRow] = useState<string | null>(null)
  const colWidths = useColumnWidths('lead-contracts')
  const tracks = gridTemplateFor(columns, colWidths, undefined, ACTIONS_TRAIL.pair)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)   /* drag a head to reorder (REG-462) */
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()   // REG-430: the card scrolls sideways only once its tracks run past it

  return (
    <div ref={frame} className={styles.card} role="table" data-drag-root="" aria-label="Contracts" data-kb-list="contract" data-cols="lead-contracts" data-overflow={overflowing || undefined} data-lead={columns.some((c) => c.key === 'lead') || undefined}
         style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      {/* Head row 56 (931:38691 "Table / Row / Contracts" Type=HD) — no selection head in this table. */}
      <div ref={headRow} className={styles.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            {SORTABLE[c.key] === false ? (
              <span className={styles.hLabel}>{c.label}</span>
            ) : (
              /* Sort is inert in this prototype — the head answers coming soon. */
              <button type="button" className={styles.hSort} onClick={comingSoon}>
                <span className={styles.hLabel}>{c.label}</span>
                <Icon name="unfold_more" size={16} />
              </button>
            )}
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
          onMenuToggle={() => setMenuRow((m) => (m === contract.id ? null : contract.id))}
          onMenuClose={() => setMenuRow(null)}
          onStatus={onStatus} onView={onView} onRowMenu={onRowMenu} statusBlock={statusBlock} deleteBlock={deleteBlock} now={now}
          lead={leadOf ? leadOf(contract) : null} showLead={columns.some((c) => c.key === 'lead')}
        />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function ContractRowView({
  contract,
  statusOpen, onStatusToggle, onStatusClose,
  menuOpen, onMenuToggle, onMenuClose,
  onStatus, onView, onRowMenu, L, lead, showLead, statusBlock, deleteBlock, now,
}: {
  contract: Contract
  lead: { name: string; href: string } | null
  showLead: boolean
  statusOpen: boolean
  onStatusToggle: () => void
  onStatusClose: () => void
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  onStatus: (contract: Contract, status: ContractStatus) => void
  onView: (contract: Contract) => void
  onRowMenu: (contract: Contract, action: ContractRowAction) => void
  L: ReturnType<typeof useColumnLayout>
  statusBlock?: (contract: Contract, status: ContractStatus) => string | null
  deleteBlock?: (contract: Contract) => string | null
  now?: number
}) {
  /* (UX audit C5) how long it has waited, and whether the client opened it */
  const waiting = contract.status === 'Sent to Client' && now ? awaitingLine(contract, now) : null
  const pick = (action: ContractRowAction) => () => { onMenuClose(); onRowMenu(contract, action) }
  const noDelete = deleteBlock?.(contract) ?? null
  const pickStatus = (status: ContractStatus) => () => { onStatusClose(); onStatus(contract, status) }
  const statusAnchor = useRef<HTMLSpanElement>(null)
  const kebab = useRef<HTMLSpanElement>(null)

  return (
    <div className={styles.row} role="row" data-kb-row data-kb-id={contract.id}>
      {/* Title cell "Cell / Two line" 557×68 p24/24/24/16 (931:38692): ONE line — "General Contract Agreement" 14/Medium
          (subtitle-m); the mock's Two-line cell carries no secondary text. */}
      <div className={`${styles.cell} ${styles.colTitle} ${L.pinned('title') ? styles.pin : ''}`} role="cell" data-col="title" data-pin-edge={L.edge('title') || undefined} style={L.style('title')}>
        <button type="button" className={styles.title} onClick={() => onView(contract)} data-kb-open>{contract.title}</button>
      </div>

      {/* (REG-534) Tools › Contracts: the lead, a link to its Contracts tab — the quotes list's Client column (REG-422). */}
      {showLead ? (
        <div className={`${styles.cell} ${styles.colLead} ${L.pinned('lead') ? styles.pin : ''}`} role="cell" data-col="lead" data-pin-edge={L.edge('lead') || undefined} style={L.style('lead')}>
          {lead ? <Link href={lead.href} className={styles.leadLink}>{lead.name}</Link> : <span>--</span>}
        </div>
      ) : null}

      {/* Status cell: "Draft" 14/Regular + keyboard_arrow_down 20 (H g4) → status menu over CONTRACT_STATUSES
          (not mocked — the Quotes status menu 910:36673 pattern, current marked; REG-178). */}
      <div className={`${styles.cell} ${styles.colStatus} ${L.pinned('status') ? styles.pin : ''}`} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')} data-sub={waiting ? '' : undefined}>
        <span className={styles.statusStack}>
        <span className={styles.statusWrap} ref={statusAnchor}>
          <button
            type="button" className={styles.statusBtn}
            aria-haspopup="menu" aria-expanded={statusOpen}
            aria-label={`Status ${contract.status} — change status`}
            onClick={onStatusToggle}
          >
            {contract.status}
            <span className={styles.chev} data-open={statusOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
          </button>
          <PortalMenu open={statusOpen} anchor={statusAnchor} onClose={onStatusClose} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Status">
            {/* (REG-728) The house row, as the Quotes twin's status menu: the current status marked "current" at its end. (sweep S2 #23) A
                refused status says why in the row itself — (REG-728) in the row's reason line, under its words (the full rule was a native
                title, which never shows on touch); a press on it does nothing. */}
            {CONTRACT_STATUSES.map((s) => {
              const isCurrent = s === contract.status
              const block = isCurrent ? null : statusBlock?.(contract, s) ?? null
              const why = block === CLIENT_SIGNED_RULE ? 'signed by the client' : block === UNSIGN_ROLE_RULE ? 'Owner or Admin' : block
              return (
                <DropdownItem key={s} disabled={!!block} title={why ?? undefined} meta={isCurrent ? 'current' : undefined} onSelect={pickStatus(s)}>{s}</DropdownItem>
              )
            })}
          </PortalMenu>
        </span>
        {waiting ? <>
          <span className={styles.waiting} data-form="short" data-testid="contract-waiting">{waiting.short}</span>
          <span className={styles.waiting} data-form="full" data-testid="contract-waiting-full">{waiting.full}</span>
        </> : null}
        </span>
      </div>

      {/* Created · Signed Copy · Sent · Updated — "17 Jul ‘26" / file name 14/Regular ink, "-" when empty (931:38692). (Dane UAT 8.23) The mock's
          dates and widths stay; hovering one says its date and time in the house tooltip ("17 Jul ’26, 3:05 PM"). */}
      <div className={`${styles.cell} ${styles.colCreated} ${L.pinned('created') ? styles.pin : ''}`} role="cell" data-col="created" data-pin-edge={L.edge('created') || undefined} style={L.style('created')}><DateTip at={contract.createdAt} /></div>
      <div className={`${styles.cell} ${styles.colSignedCopy} ${L.pinned('signedCopy') ? styles.pin : ''}`} role="cell" data-col="signedCopy" data-pin-edge={L.edge('signedCopy') || undefined} style={L.style('signedCopy')}>
        <span className={styles.oneLine}>{contract.signedCopy ?? '-'}</span>
      </div>
      <div className={`${styles.cell} ${styles.colSent} ${L.pinned('sent') ? styles.pin : ''}`} role="cell" data-col="sent" data-pin-edge={L.edge('sent') || undefined} style={L.style('sent')}>
        {contract.sentAt ? (
          <span className={styles.sentCell}>
            <DateTip at={contract.sentAt} />
            {/* (REG-633, contracts parity Q-17) the client's first open of the link, while it is out for signature */}
            {contract.viewedAt && contract.status !== 'Draft' ? <span className={styles.viewed} data-testid="contract-viewed">Viewed {displayDate(contract.viewedAt)}</span> : null}
          </span>
        ) : '-'}
      </div>
      <div className={`${styles.cell} ${styles.colUpdated} ${L.pinned('updated') ? styles.pin : ''}`} role="cell" data-col="updated" data-pin-edge={L.edge('updated') || undefined} style={L.style('updated')}><DateTip at={contract.updatedAt ?? contract.createdAt} /></div>

      {/* Row hover actions — not mocked for Contracts; the Quotes "Hover button" (910:36644 / 910:36709) copied:
          View + kebab, level-1 shadow, right 24, vertically centred in the 68 row. */}
      <span className={styles.actions} data-open={menuOpen || undefined}>
        <span className={styles.actionsInner}>
        <span className={styles.float}>
          <Button variant="primary" appearance="outlined" onPress={() => onView(contract)}>View</Button>
        </span>
        <span className={styles.menuWrap} ref={kebab}>
          <span className={styles.float}>
            <Tooltip label="More actions" disabled={menuOpen}>
              <IconButton icon="more_vert" label={`More actions for ${contract.title}`} variant="primary"
                          aria-haspopup="menu" aria-expanded={menuOpen} onClick={onMenuToggle} />
            </Tooltip>
          </span>
          {/* (REG-728) 240: rows with a second line (Copy Link on a Draft, a refused Delete) */}
          <PortalMenu open={menuOpen} anchor={kebab} onClose={onMenuClose} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={contract.title}>
            {/* Quotes row kebab 910:36723 — verbatim order (REG-177). */}
            <DropdownItem onSelect={pick('share')}>Preview and Share</DropdownItem>
            {/* (UX audit C8) on a Draft the copy sends it — said in the row before the press */}
            <DropdownItem onSelect={pick('copy')} help={contract.status === 'Draft' ? 'Marks it Sent to Client' : undefined}>Copy Link</DropdownItem>
            {/* (UX audit C5) a nudge on WhatsApp with the same link, through the Send dialog */}
            {contract.status === 'Sent to Client' ? <DropdownItem onSelect={pick('remind')}>Send a reminder</DropdownItem> : null}
            {/* (UX audit C9) a paper signature, or one made elsewhere — the status pill was the only way in */}
            {contract.status !== 'Signed' ? <DropdownItem onSelect={pick('signed')}>Mark as signed…</DropdownItem> : null}
            <DropdownItem onSelect={pick('pdf')}>Download as PDF</DropdownItem>
            <DropdownItem onSelect={pick('print')}>Print</DropdownItem>
            <DropdownItem onSelect={pick('archive')}>Archive</DropdownItem>
            {/* (sweep S2 #23) the quotes kebab's words. (REG-728) The row's own tone, and a refused Delete's reason in the row's reason line */}
            <DropdownItem tone="danger" disabled={!!noDelete} title={noDelete ? 'creator, Owner or Admin' : undefined} onSelect={pick('delete')}>Delete</DropdownItem>
          </PortalMenu>
        </span>
        </span>
      </span>
    </div>
  )
}
