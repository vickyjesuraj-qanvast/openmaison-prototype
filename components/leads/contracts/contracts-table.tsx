'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
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
import { Tooltip } from '@/components/om/tooltip'
import { MetaChip } from '@/components/om/meta-chip'
import { useSheetLayout } from '@/components/om/sheet'
import { TOUCH_TABLET, useMediaQuery } from '@/lib/breakpoint'
import type { Contract } from '@/lib/db/schema'
import { displayDate, displayDateTime, money } from '@/lib/format'
import { CONTRACT_STATUSES, type ContractStatus } from '@/lib/leads/contract-filters'
import { CLIENT_SIGNED_RULE, UNSIGN_ROLE_RULE } from '@/lib/contracts/policy'
import { awaitingLine } from '@/lib/contracts/model'
import { isContractSortKey, type ContractHeadSort, type ContractSortKey } from '@/lib/leads/contract-filters'
import { contractCardChip, contractSignsLine, contractSinceWords } from './contract-card-words'
import { useLongPress } from '@/components/leads/quotes/use-long-press'
import styles from './contracts-table.module.css'

/** (Dane UAT 8.23) A date cell: the mock's date, its time in the house tooltip on hover (a finger never leaves one behind). */
function DateTip({ at }: { at: Date }) {
  return <Tooltip label={displayDateTime(at)}><span data-testid="contract-date">{displayDate(at)}</span></Tooltip>
}

/** Row kebab — not mocked for Contracts; copied from the Quotes row kebab (910:36723, REG-177…179):
 *  Preview and Share · Copy Link · Download as PDF · Print · Archive · Delete. (UX audit C5 · C9) After Copy Link: Send a reminder (out for
 *  signature) and Mark as signed… (not signed yet). (Contracts on the move, C4 — A-13) On touch "Download as PDF · Print" are one Share PDF
 *  (the print sheet stand-in, as the quote Preview's — `pdf`). */
export type ContractRowAction = 'share' | 'copy' | 'remind' | 'signed' | 'pdf' | 'print' | 'archive' | 'delete' | /** (pending modules S03) */ 'stop' | 'signedCopy'

export type ContractsTableProps = {
  contracts: Contract[]
  onStatus: (contract: Contract, status: ContractStatus) => void
  onView: (contract: Contract) => void
  onRowMenu: (contract: Contract, action: ContractRowAction) => void
  /** (REG-534) Tools › Contracts: the lead each row belongs to, as a link to its Contracts tab. */
  leadOf?: (contract: Contract) => { name: string; href: string } | null
  /** (Contracts on the move, C4 — P-07) The quote a contract signs — its number and amount for the phone card's first and second lines. */
  quoteOf?: (contract: Contract) => { number: string; amountMinor: number } | null
  columns: readonly TableColumn[]
  /** A head dropped in a new place — the visible keys in their new order (useTableColumns.reorder). */
  onReorder: (keys: string[]) => void
  /** (REG-631, contracts parity Q-04) Why a status is out of reach for this row (a signature the client made; not an Owner / Admin), else null. */
  statusBlock?: (contract: Contract, status: ContractStatus) => string | null
  /** (REG-634, contracts parity Q-21) Why this row's Delete is out of reach (not its creator, an Owner or an Admin), else null. */
  deleteBlock?: (contract: Contract) => string | null
  /** (UX audit C5) The host's clock (never Date.now() in render) — "Sent 3d ago · not opened" under a status out for signature. */
  now?: number
  /** (pending modules S03 — REG-178's inert heads) the head's own order, and its press (the projects table's model) */
  sort?: ContractHeadSort
  onSort?: (key: ContractSortKey) => void
  /** (Contracts on the move, C4 — P-07) A phone's selection: a hold on a card selects it (the Quotes card's), and while anything is selected a tap
      toggles a card; the host's bulk bar carries Delete. The desk keeps no selection column (REG-177). */
  selected?: ReadonlySet<string>
  onToggleSelect?: (id: string) => void
}

/* Column order + head copy — exactly as the mock types it (931:38691, spec 01-listing-empty.txt). Every head carries unfold_more 16. */
/** The card's mocked tracks by head key (contracts-table.module.css) — the user's dragged widths replace them (REG-427). */
/** The table's columns (931:38691, spec 01): Title locked first; the user's order, visibility and pins come from Column settings (REG-454).
    (Contracts on the move, C4 — P-08 · A-04) `tabletHidden`: a touch tablet opens with Title · Lead · Status (+ its since) · Sent — the ⋮ frozen
    beside them — and keeps Created · Signed Copy · Updated in Column settings, remembered for the tablet (components/om/table-columns.ts). */
export const CONTRACT_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'title', label: 'Title', track: 'minmax(555px, 1fr)', locked: true },
  { key: 'lead', label: 'Lead', track: '180px' },   /* (REG-534) Tools › Contracts only — the quotes list's Client column */
  { key: 'status', label: 'Status', track: 'minmax(128px, max-content)' },
  { key: 'created', label: 'Created', track: '120px', tabletHidden: true },
  { key: 'signedCopy', label: 'Signed Copy', track: '142px', tabletHidden: true },
  { key: 'sent', label: 'Sent', track: '140px' },
  { key: 'updated', label: 'Updated', track: '157px', tabletHidden: true },
]
/** (P-08 · A-04) A touch tablet's tracks: Title from 160, the names and dates at their own widths — Title · Lead · Status · Sent stand on a
    768 frame's first screen with the ⋮ frozen beside them (the Quotes table's rule: every track but the Title a fixed width, so a grid wider
    than its frame never lets a `max-content` Status run under the next column). Status holds "Sent to Client" and its since line. */
const TABLET_TRACKS: Record<string, string> = { title: 'minmax(160px, 1fr)', lead: '124px', status: '168px', created: '100px', signedCopy: '128px', sent: '128px', updated: '100px' }
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
 * (Contracts on the move, C4 — P-07 · P-08) ≤767 the rows are the Quotes card (the client first, the amount it signs, a read-only chip with
 * its since, the whole card a press); a touch tablet keeps the table with its default set and the row's ⋮ frozen at the right, View dropped
 * (the title opens). The server renders the desk; the CSS decides the first paint, these only what a press does and how wide the trail is.
 */
export function ContractsTable({ contracts, onStatus, onView, onRowMenu, leadOf, quoteOf, columns, onReorder, statusBlock, deleteBlock, now, sort = null, onSort, selected, onToggleSelect }: ContractsTableProps) {
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [statusRow, setStatusRow] = useState<string | null>(null)
  const colWidths = useColumnWidths('lead-contracts')
  const phone = useSheetLayout()
  const touchTablet = useMediaQuery(TOUCH_TABLET) && !phone
  /* (P-08 · A-04) the tracks tighten on a touch tablet — the mock's 555 Title floor alone took most of a 768 frame; a dragged width still wins (REG-427) */
  const tabletColumns = useMemo(() => (touchTablet ? columns.map((c) => ({ ...c, track: TABLET_TRACKS[c.key] ?? c.track })) : columns), [columns, touchTablet])
  const tracks = gridTemplateFor(tabletColumns, colWidths, undefined, touchTablet ? ACTIONS_TRAIL.kebab : ACTIONS_TRAIL.pair)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)   /* drag a head to reorder (REG-462) */
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()   // REG-430: the card scrolls sideways only once its tracks run past it

  return (
    <div ref={frame} className={styles.card} role="table" data-drag-root="" aria-label="Contracts" data-kb-list="contract" data-cols="lead-contracts" data-overflow={overflowing || undefined} data-lead={columns.some((c) => c.key === 'lead') || undefined}
         data-select-mode={phone && !!selected && selected.size > 0 ? '' : undefined}
         style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => { const el = e.currentTarget; el.toggleAttribute('data-scrolled', el.scrollLeft > 0); el.toggleAttribute('data-at-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) }}>
      {/* Head row 56 (931:38691 "Table / Row / Contracts" Type=HD) — no selection head in this table. */}
      <div ref={headRow} className={styles.head} role="row">
        {/* (P-08) the ⋮ column's head on a touch tablet — frozen right with the rows' cell, so the column reads as one */}
        {touchTablet ? <div className={`${styles.hCell} ${styles.hActions}`} role="columnheader" aria-label="Actions" data-col="actions" data-testid="contracts-actions-head" /> : null}
        {columns.map((c) => {
          const sorted = sort?.key === c.key
          return (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}
               aria-sort={sorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
            {SORTABLE[c.key] === false || !isContractSortKey(c.key) || !onSort ? (
              <span className={styles.hLabel}>{c.label}</span>
            ) : (
              /* (pending modules S03) the head sorts its column — A→Z, Z→A, off (the projects table's model) */
              <button type="button" className={styles.hSort} data-sorted={sorted || undefined} onClick={() => onSort(c.key as ContractSortKey)}
                      aria-label={sorted ? `${c.label} — sorted ${sort.dir === 'asc' ? 'oldest first' : 'newest first'}; press to ${sort.dir === 'asc' ? 'reverse' : 'stop sorting'}` : `Sort by ${c.label}`}>
                <span className={styles.hLabel}>{c.label}</span>
                <Icon name={sorted ? (sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'} size={16} />
              </button>
            )}
            <ColumnResizer table="lead-contracts" column={c.key} label={c.label} min={c.key === 'title' ? 120 : 72} />
          </div>
          )
        })}
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
          lead={leadOf ? leadOf(contract) : null} showLead={columns.some((c) => c.key === 'lead')} quote={quoteOf ? quoteOf(contract) : null}
          phone={phone} touch={phone || touchTablet}
          selected={!!selected?.has(contract.id)} selectMode={phone && !!selected && selected.size > 0} onToggleSelect={onToggleSelect ? () => onToggleSelect(contract.id) : undefined}
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
  onStatus, onView, onRowMenu, L, lead, showLead, quote, statusBlock, deleteBlock, now, phone, touch, selected, selectMode, onToggleSelect,
}: {
  contract: Contract
  lead: { name: string; href: string } | null
  showLead: boolean
  quote: { number: string; amountMinor: number } | null
  /** (P-07) ≤767: the row is a card — the whole card a press, the ⋮ the phone's rows. */
  phone: boolean
  /** A finger drives the table (a phone or a touch tablet): Open leads the row's menu, since the title is the only other way in; PDF and Print are one Share PDF (A-13). */
  touch: boolean
  /** (P-07) this card is selected; something is (a tap toggles instead of opening); the hold's toggle — a phone's only */
  selected: boolean
  selectMode: boolean
  onToggleSelect?: () => void
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
  /* (P-07, Q-03) The card: a press anywhere that is not a control opens the contract — or, once something is selected, toggles this card; a
     hold selects it (the Quotes card's, use-long-press.ts). The chip and its "since" are the card's own words (contract-card-words.ts). */
  const hold = useLongPress(() => onToggleSelect?.(), { enabled: phone && !!onToggleSelect })
  const cardPress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!phone || hold.swallowClick()) return
    if ((e.target as HTMLElement).closest('button, a, input, [role="menu"], [role="dialog"]')) return
    if (selectMode && onToggleSelect) onToggleSelect(); else onView(contract)
  }
  /* the name is the card's own press (a button for the keyboard): it opens — or toggles while selecting, never after a hold */
  const namePress = () => { if (hold.swallowClick()) return; if (selectMode && onToggleSelect) onToggleSelect(); else onView(contract) }
  const clock = now ?? contract.createdAt.getTime()
  const chip = contractCardChip(contract, clock)
  const since = contractSinceWords(contract, clock)
  const canRemind = contract.status === 'Sent to Client' && !contract.toRead
  const remindLabel = waiting?.expired ? 'Send the link again' : 'Send a reminder'

  return (
    <div className={styles.row} role="row" data-kb-row data-kb-id={contract.id} data-selected={selected || undefined}
         onClick={phone ? cardPress : undefined} onContextMenu={phone ? (e) => e.preventDefault() : undefined} {...(phone ? hold.handlers : {})}>
      {/* Title cell "Cell / Two line" 557×68 p24/24/24/16 (931:38692): ONE line — "General Contract Agreement" 14/Medium
          (subtitle-m); the mock's Two-line cell carries no secondary text. */}
      <div className={`${styles.cell} ${styles.colTitle} ${L.pinned('title') ? styles.pin : ''}`} role="cell" data-col="title" data-pin-edge={L.edge('title') || undefined} style={L.style('title')}>
        <div className={styles.titleData}>
          {/* (P-07 · A-01) The card's first line: the client's name leads (the title where the list is one lead's) — a press that opens; drawn ≤767 only */}
          <button type="button" className={styles.cardName} onClick={namePress} data-testid="contract-card-name">{lead ? lead.name : contract.title}</button>
          <button type="button" className={styles.title} onClick={() => onView(contract)} data-kb-open>{contract.title}</button>
          {/* (P-07) the card's second line: what it signs, and the title where the client leads — ≤767 only */}
          <span className={styles.cardSigns} data-testid="contract-card-signs">{contractSignsLine(contract, quote?.number ?? null, !!lead)}</span>
        </div>
      </div>
      {/* (P-07) the amount the contract signs — the quote's total, 18 tabular at the card's right; none → the title alone */}
      {quote ? <span className={styles.cardAmount} data-testid="contract-card-amount" aria-label={`Quote total S$${money(quote.amountMinor)}`}>{`S$${money(quote.amountMinor)}`}</span> : null}

      {/* (REG-534) Tools › Contracts: the lead, a link to its Contracts tab — the quotes list's Client column (REG-422). */}
      {showLead ? (
        <div className={`${styles.cell} ${styles.colLead} ${L.pinned('lead') ? styles.pin : ''}`} role="cell" data-col="lead" data-pin-edge={L.edge('lead') || undefined} style={L.style('lead')}>
          {lead ? <Link href={lead.href} className={styles.leadLink}>{lead.name}</Link> : <span>--</span>}
        </div>
      ) : null}

      {/* Status cell: "Draft" 14/Regular + keyboard_arrow_down 20 (H g4) → status menu over CONTRACT_STATUSES
          (not mocked — the Quotes status menu 910:36673 pattern, current marked; REG-178). */}
      <div className={`${styles.cell} ${styles.colStatus} ${L.pinned('status') ? styles.pin : ''}`} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')} data-sub={waiting ? '' : undefined}>
        {/* (P-07 · A-03 · A-08, Q-03) ≤767 the card's third line: a READ-ONLY chip and its "since" — sent · opened · link expired · signed · edited —
            then the chevron that says the card opens. The status changes on the contract, or through the ⋮'s Change status (the same menu,
            below). Drawn ≤767 only; the desk keeps its status button. */}
        <span className={styles.cardStatus} data-testid="contract-card-status">
          <MetaChip color={chip.color} className={styles.cardChip}>{chip.label}</MetaChip>
          {since.length ? (
            <span className={styles.since} data-testid="contract-card-since">
              {since.map((w, i) => <span key={i} className={styles.sinceWord} data-tone={w.tone}>{i ? <span className={styles.sinceDot} aria-hidden>·</span> : null}{w.text}</span>)}
            </span>
          ) : null}
          <span className={styles.cardChev} aria-hidden><Icon name="keyboard_arrow_right" size={20} weight={300} /></span>
        </span>
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
          <PortalMenu open={statusOpen} anchor={statusAnchor} onClose={onStatusClose} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Change status">
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
          <span className={styles.waiting} data-form="short" data-testid="contract-waiting" data-expired={waiting.expired || undefined}>{waiting.short}</span>
          <span className={styles.waiting} data-form="full" data-testid="contract-waiting-full" data-expired={waiting.expired || undefined}>{waiting.full}</span>
        </> : null}
        </span>
      </div>

      {/* Created · Signed Copy · Sent · Updated — "17 Jul ‘26" / file name 14/Regular ink, "-" when empty (931:38692). (Dane UAT 8.23) The mock's
          dates and widths stay; hovering one says its date and time in the house tooltip ("17 Jul ’26, 3:05 PM"). */}
      <div className={`${styles.cell} ${styles.colCreated} ${L.pinned('created') ? styles.pin : ''}`} role="cell" data-col="created" data-pin-edge={L.edge('created') || undefined} style={L.style('created')}><DateTip at={contract.createdAt} /></div>
      <div className={`${styles.cell} ${styles.colSignedCopy} ${L.pinned('signedCopy') ? styles.pin : ''}`} role="cell" data-col="signedCopy" data-pin-edge={L.edge('signedCopy') || undefined} style={L.style('signedCopy')}>
        {/* (pending modules S03) a signed contract's copy opens — the kept file, else the copy kept at signing */}
        {contract.status === 'Signed' && contract.signedCopy
          ? <button type="button" className={`${styles.oneLine} ${styles.copyLink}`} onClick={() => onRowMenu(contract, 'signedCopy')} title={contract.signedCopy} data-testid="contract-signed-copy-cell">{contract.signedCopy}</button>
          : <span className={styles.oneLine}>{contract.signedCopy ?? '-'}</span>}
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
          <PortalMenu open={menuOpen} anchor={kebab} onClose={onMenuClose} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={lead ? `${lead.name} · ${contract.title}` : contract.title}>
            {phone ? (
              /* (Contracts on the move, C4 — P-07, Q-03) The phone's rows: Open · Send a reminder (Send the link again once expired) · Copy link ·
                 Mark as signed… · Stop the signing link · Change status › · Share PDF · Archive · Delete. Preview lives on the contract itself
                 — one tap further, never lost. */
              <>
                <DropdownItem onSelect={() => { onMenuClose(); onView(contract) }}>Open</DropdownItem>
                {canRemind ? <DropdownItem onSelect={pick('remind')} help={waiting?.expired ? 'Opens the link again' : 'A WhatsApp nudge, the same link'}>{remindLabel}</DropdownItem> : null}
                <DropdownItem onSelect={pick('copy')} help={contract.status === 'Draft' ? 'Marks it Sent to Client' : undefined}>Copy link</DropdownItem>
                {contract.status !== 'Signed' ? <DropdownItem onSelect={pick('signed')}>Mark as signed…</DropdownItem> : null}
                {contract.status === 'Sent to Client' ? <DropdownItem onSelect={pick('stop')} help={contract.bundleId ? 'Every document on its link goes back to Draft' : 'Back to Draft — the link stops opening'}>Stop the signing link</DropdownItem> : null}
                <DropdownItem submenu onSelect={() => { onMenuClose(); onStatusToggle() }} meta={contract.status}>Change status</DropdownItem>
                <DropdownItem onSelect={pick('pdf')} help="Through WhatsApp, mail or AirDrop">Share PDF</DropdownItem>
                <DropdownItem onSelect={pick('archive')}>Archive</DropdownItem>
                <DropdownItem tone="danger" disabled={!!noDelete} title={noDelete ? 'creator, Owner or Admin' : undefined} onSelect={pick('delete')}>Delete</DropdownItem>
              </>
            ) : (
              <>
                {/* (P-08 · A-05) a touch tablet dropped the row's View: the title opens, and so does the menu's first row */}
                {touch ? <DropdownItem onSelect={() => { onMenuClose(); onView(contract) }}>Open</DropdownItem> : null}
                {/* Quotes row kebab 910:36723 — verbatim order (REG-177). */}
                <DropdownItem onSelect={pick('share')}>Preview and Share</DropdownItem>
                {/* (UX audit C8) on a Draft the copy sends it — said in the row before the press */}
                <DropdownItem onSelect={pick('copy')} help={contract.status === 'Draft' ? 'Marks it Sent to Client' : undefined}>Copy Link</DropdownItem>
                {/* (UX audit C5) a nudge on WhatsApp with the same link, through the Send dialog */}
                {canRemind ? <DropdownItem onSelect={pick('remind')} help={waiting?.expired ? 'Opens the link again' : undefined}>{remindLabel}</DropdownItem> : null}
                {/* (pending modules S03 — 1.0's cancel) back to Draft, the client's address dead; Undo puts it back */}
                {contract.status === 'Sent to Client' ? <DropdownItem onSelect={pick('stop')} help={contract.bundleId ? 'Every document on its link goes back to Draft' : 'Back to Draft — the link stops opening'}>Stop the signing link</DropdownItem> : null}
                {/* (UX audit C9) a paper signature, or one made elsewhere — the status pill was the only way in */}
                {contract.status !== 'Signed' ? <DropdownItem onSelect={pick('signed')}>Mark as signed…</DropdownItem> : null}
                {/* (A-13) on touch one Share PDF — the print sheet stand-in (it shares on iOS, saves on Android); a mouse keeps Download and Print */}
                {touch ? <DropdownItem onSelect={pick('pdf')} help="Through WhatsApp, mail or AirDrop">Share PDF</DropdownItem> : <>
                  <DropdownItem onSelect={pick('pdf')}>Download as PDF</DropdownItem>
                  <DropdownItem onSelect={pick('print')}>Print</DropdownItem>
                </>}
                <DropdownItem onSelect={pick('archive')}>Archive</DropdownItem>
                {/* (sweep S2 #23) the quotes kebab's words. (REG-728) The row's own tone, and a refused Delete's reason in the row's reason line */}
                <DropdownItem tone="danger" disabled={!!noDelete} title={noDelete ? 'creator, Owner or Admin' : undefined} onSelect={pick('delete')}>Delete</DropdownItem>
              </>
            )}
          </PortalMenu>
        </span>
        </span>
      </span>
    </div>
  )
}
