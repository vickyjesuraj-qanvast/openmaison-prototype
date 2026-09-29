'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Checkbox } from '@/components/ds'
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
import type { Member, Quote } from '@/lib/db/schema'
import { Avatar } from '@/components/om/avatar'
import { displayDate, money } from '@/lib/format'
import { isQuoteOverdue, quoteStatuses, type QuoteStatus } from '@/lib/leads/quote-filters'
import { validityPassed } from '@/lib/quotes/policy'
import type { QuoteApproval } from '@/lib/settings/types'
import styles from './quotes-table.module.css'

/** Row kebab (910:36723): Preview and Share · Copy Link · Download as PDF · Print · Archive · Delete. */
export type QuoteRowAction = 'share' | 'copy' | 'pdf' | 'print' | 'xray' | 'archive' | 'delete'

export type QuotesTableProps = {
  quotes: (Quote & { creator?: Member | null })[]
  /** Clock captured by the caller (purity rule) — overdue = not Signed + due before today. */
  now: number
  /** Settings › Leads › Quote approval — decides which statuses the row menu can offer. */
  approval: QuoteApproval
  /** (REG-624, parity §8.2 · E-104) Whether the viewer may mark a quote Approved — else the menu shows it "approvers only", as the editor's pill does. */
  canApprove?: boolean
  /** (REG-625, parity Q-28) Whether the viewer may delete this quote — its creator, an Owner or an Admin; else the kebab's Delete waits. */
  canDelete?: (quote: Quote) => boolean
  selected: Set<string>
  onSelect: (ids: Set<string>) => void
  onStatus: (quote: Quote, status: QuoteStatus) => void
  onDue: (quote: Quote, anchor: HTMLElement) => void
  onView: (quote: Quote) => void
  onRowMenu: (quote: Quote, action: QuoteRowAction) => void
  /** Tools › Quotes (REG-422): the studio-wide list adds a Client column after Title — the lead the quote belongs to, linked. */
  clientOf?: (quote: Quote) => { name: string; href: string } | null
  /** The visible columns in the user's order (useTableColumns, REG-454). */
  columns: readonly TableColumn[]
  /** A head dropped in a new place — the visible keys in their new order (useTableColumns.reorder). */
  onReorder: (keys: string[]) => void
}

/* Column order + head copy — exactly as the mock types it (910:36323, spec 01). Every head carries unfold_more 16.
   Approval Date is part of the approval lifecycle, so it is dropped with it (see `showApproval` below). */
/** The card's mocked tracks by head key (quotes-table.module.css) — the user's dragged widths replace them (REG-427). */
/** The table's columns (910:36323, spec 01): Title locked first; Client only where a caller names one (Tools › Quotes); Approval Date
    only with the approval lifecycle. The user's order, visibility and pins come from Column settings (REG-454). */
export const QUOTE_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'title', label: 'Title', track: 'minmax(317px, 1fr)', locked: true },
  { key: 'client', label: 'Client', track: '180px' },
  { key: 'status', label: 'Status', track: 'minmax(128px, max-content)' },
  { key: 'creator', label: 'Creator', track: '160px' },   /* (REG-471) who created the quote — avatar + name, as the Tasks table's Creator */
  { key: 'total', label: 'Total', track: '120px' },
  { key: 'due', label: 'Due', track: '120px' },
  { key: 'created', label: 'Created', track: '120px' },
  { key: 'sent', label: 'Sent', track: '120px' },
  { key: 'updated', label: 'Updated', track: '120px' },
  { key: 'approval', label: 'Approval Date', track: '157px' },
]
/** Whether the Approval Date column exists at all — the lifecycle has it, or a quote was approved before the setting was switched off. */
export const quoteShowApproval = (quotes: readonly Pick<Quote, 'approvedAt'>[], approval: QuoteApproval) => quoteStatuses(approval).includes('Approved') || quotes.some((q) => q.approvedAt)
export const quoteColumnDefs = (withClient: boolean, withApproval: boolean) => QUOTE_COLUMN_DEFS.filter((d) => (d.key !== 'client' || withClient) && (d.key !== 'approval' || withApproval))
/* (REG-468) No sort glyph where ordering means nothing — see the sort audit of 2026-09-16. */
const SORTABLE: Record<string, boolean> = { title: false, creator: false }
const COL_CLASS: Record<string, string | undefined> = { title: styles.colTitle, client: styles.colClient, status: styles.colStatus, creator: styles.colCreator, total: styles.colTotal, due: styles.colDue, created: styles.colCreated, sent: styles.colSent, updated: styles.colUpdated, approval: styles.colApproval }

/* (REG-639) The row kebab opens through the body portal (PortalMenu flips on the viewport), so no count of its items is needed. */

/**
 * Lead Details › Quotes table (910:36322) — specs design-source/context/lead-quotes/01-listing-table.txt +
 * 02-rows-menus.txt. Head 56 · rows 64; columns 40 · 319 · 128 · 120 · 120 · 120 · 120 · 120 · 157 (Title fills).
 * Structure copied from components/leads/tasks/tasks-table.tsx: every icon-only control carries a Tooltip (REG-75);
 * sorting is inert (coming soon); menus toggle on their own trigger (REG-153).
 */
export function QuotesTable({ quotes, now, approval, canApprove = true, canDelete, selected, onSelect, onStatus, onDue, onView, onRowMenu, clientOf, columns, onReorder }: QuotesTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [statusRow, setStatusRow] = useState<string | null>(null)
  const statuses = quoteStatuses(approval)
  /* The head list follows the studio's lifecycle like the status menu does (REG-214): a studio that does not review
     quotes internally has no approval date to show, and the column headed one for every row. A quote approved before
     the setting was switched off keeps its date visible — the same courtesy the row menu pays a retired status. */
  const showApproval = quoteShowApproval(quotes, approval)
  const colWidths = useColumnWidths('lead-quotes')
  const tracks = gridTemplateFor(columns, colWidths, '40px', ACTIONS_TRAIL.pair)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow, { leading: 40 })
  const D = useColumnDrag(columns, onReorder)   /* drag a head to reorder (REG-462) */
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  const [frame, overflowing] = useOverflowX()   // REG-430: the card scrolls sideways only once its tracks run past it

  const allSelected = quotes.length > 0 && quotes.every((q) => selected.has(q.id))
  const toggleAll = () => onSelect(allSelected ? new Set() : new Set(quotes.map((q) => q.id)))
  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    onSelect(next)
  }

  return (
    <div ref={frame} className={styles.frame} data-overflow={overflowing || undefined}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
    <div className={styles.card} role="table" data-drag-root="" aria-label="Quotes" data-kb-list="quote" data-cols="lead-quotes" style={{ '--tracks': tracks } as React.CSSProperties}>
      {/* Head row — selection head = a real select-all checkbox (check_box_outline_blank 24/Light in the mock). */}
      <div ref={headRow} className={styles.head} role="row">
        <div className={`${styles.hCell} ${styles.colSel} ${styles.pin}`} role="columnheader" data-col="sel" data-kb-select-all data-pin-edge={L.edge('sel') || undefined} style={L.style('sel')}>
          <Checkbox isSelected={allSelected} isIndeterminate={!allSelected && quotes.some((q) => selected.has(q.id))} isDisabled={quotes.length === 0} onChange={toggleAll} aria-label="Select all quotes" />
        </div>
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
            <ColumnResizer table="lead-quotes" column={c.key} label={c.label} min={c.key === 'title' ? 120 : 72} />
          </div>
        ))}
      </div>

      {quotes.map((quote) => (
        <QuoteRowView L={L}
          key={quote.id}
          quote={quote}
          now={now}
          selected={selected.has(quote.id)}
          onToggleSelect={() => toggleOne(quote.id)}
          statuses={statuses}
          lockApproved={approval === 'required' && !canApprove}
          deletable={canDelete ? canDelete(quote) : true}
          showApproval={showApproval}
          statusOpen={statusRow === quote.id}
          onStatusToggle={() => setStatusRow((s) => (s === quote.id ? null : quote.id))}
          onStatusClose={() => setStatusRow(null)}
          menuOpen={menuRow === quote.id}
          onMenuToggle={() => setMenuRow((m) => (m === quote.id ? null : quote.id))}
          onMenuClose={() => setMenuRow(null)}
          onStatus={onStatus} onDue={onDue} onView={onView} onRowMenu={onRowMenu}
          client={clientOf ? clientOf(quote) : null}
        />
      ))}
    </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function QuoteRowView({
  quote, now, selected, onToggleSelect, statuses, lockApproved, deletable, showApproval,
  statusOpen, onStatusToggle, onStatusClose,
  menuOpen, onMenuToggle, onMenuClose,
  onStatus, onDue, onView, onRowMenu, client, L,
}: {
  quote: Quote & { creator?: Member | null }
  now: number
  client: { name: string; href: string } | null
  selected: boolean
  onToggleSelect: () => void
  statuses: readonly QuoteStatus[]
  /** (REG-624) Approved is an approver's word: shown, not pickable, as the editor's pill shows it. */
  lockApproved: boolean
  deletable: boolean
  showApproval: boolean
  statusOpen: boolean
  onStatusToggle: () => void
  onStatusClose: () => void
  menuOpen: boolean
  onMenuToggle: (trigger: HTMLElement) => void
  onMenuClose: () => void
  onStatus: (quote: Quote, status: QuoteStatus) => void
  onDue: (quote: Quote, anchor: HTMLElement) => void
  onView: (quote: Quote) => void
  onRowMenu: (quote: Quote, action: QuoteRowAction) => void
  L: ReturnType<typeof useColumnLayout>
}) {
  const overdue = isQuoteOverdue(quote, now)
  const pick = (action: QuoteRowAction) => () => { onMenuClose(); onRowMenu(quote, action) }
  /* (REG-639) The row menu goes through the body portal: an inline menu was clipped by the card's sideways scroller — on a
     one-row table neither side had room, and the eighth item (Compare with another quote) made it worse. */
  const kebab = useRef<HTMLSpanElement>(null)
  const statusAnchor = useRef<HTMLSpanElement>(null)
  const pickStatus = (status: QuoteStatus) => () => { onStatusClose(); onStatus(quote, status) }

  return (
    <div className={styles.row} role="row" data-kb-row data-kb-id={quote.id} data-selected={selected ? '' : undefined}>
      {/* Selection cell 40: checkbox 24/Light secondary → check_box 24 primary when selected. */}
      <div className={`${styles.cell} ${styles.colSel} ${styles.pin}`} role="cell" data-col="sel" data-kb-select data-pin-edge={L.edge('sel') || undefined} style={L.style('sel')}>
        <Checkbox isSelected={selected} onChange={onToggleSelect} aria-label={`Select ${quote.title}`} />
      </div>

      {/* Title cell "Cell / Two line" (V g4): Name 14/Bold + "OM-10001 · Private" 12/Regular secondary (H g8). */}
      <div className={`${styles.cell} ${styles.colTitle} ${L.pinned('title') ? styles.pin : ''}`} role="cell" data-col="title" data-pin-edge={L.edge('title') || undefined} style={L.style('title')}>
        <div className={styles.titleData}>
          <button type="button" className={styles.title} onClick={() => onView(quote)} data-kb-open>{quote.title}</button>
          <span className={styles.sub}>
            <span>{quote.number}</span>
            <span>·</span>
            <span>{quote.visibility}</span>
            {/* (REG-625, parity Q-29) Out with the client past its Valid until: marked, never blocked. */}
            {validityPassed(quote, now) ? <><span>·</span><Tooltip label={`Valid until ${displayDate(quote.validUntil!)} has passed — nothing is blocked; extend Quote Valid Until if the price still stands`}><span className={styles.expired} data-testid="validity-passed" tabIndex={0}>Expired {displayDate(quote.validUntil!)}</span></Tooltip></> : null}
            {client ? <><span className={styles.subClient}>·</span><span className={styles.subClient}>{client.name}</span></> : null}
          </span>
        </div>
      </div>
      {client ? (
        /* (REG-422) Client: the lead's name, a link to its Quotes tab. */
        <div className={`${styles.cell} ${styles.colClient} ${L.pinned('client') ? styles.pin : ''}`} role="cell" data-col="client" data-pin-edge={L.edge('client') || undefined} style={L.style('client')}>
          <Link href={client.href} className={styles.clientLink}>{client.name}</Link>
        </div>
      ) : null}

      {/* Status cell: "Draft" 14/Regular + keyboard_arrow_down 20 (H g4) → status menu 910:36673 (all five, current marked). */}
      <div className={`${styles.cell} ${styles.colStatus} ${L.pinned('status') ? styles.pin : ''}`} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')}>
        <span className={styles.statusWrap} ref={statusAnchor}>
          <button
            type="button" className={styles.statusBtn}
            aria-haspopup="menu" aria-expanded={statusOpen}
            aria-label={`Status ${quote.status} — change status`}
            onClick={onStatusToggle}
          >
            {quote.status}
            <span className={styles.chev} data-open={statusOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
          </button>
          {/* (sweep S1 · U-01) through the portal, as the kebab since REG-639: a short table's scroller can't clip it, a sticky layer can't cover it */}
          <PortalMenu open={statusOpen} anchor={statusAnchor} onClose={onStatusClose} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Status">
            {/* (REG-728) The house row: the current status marked "current" at its end, as the stage menu marks the lead's stage (836:23422);
                a refused one greyed, "approvers only" in the same place. */}
            {/* The studio's lifecycle, not the full five: a studio that does not review quotes internally can never
                set "Sent for Approval" or "Approved" (Settings › Leads › Quote approval, user 2026-08-30). Same list the
                Overview widget draws its track from. A quote already holding a retired status still shows it above. */}
            {statuses.map((s) => {
              const isCurrent = s === quote.status
              const locked = lockApproved && s === 'Approved' && !isCurrent
              return (
                <DropdownItem key={s} disabled={locked} meta={isCurrent ? 'current' : locked ? 'approvers only' : undefined} onSelect={pickStatus(s)}>{s}</DropdownItem>
              )
            })}
          </PortalMenu>
        </span>
      </div>

      {/* Total: "S$70,000" — no space after S$ (910:36324). */}
      <div className={`${styles.cell} ${styles.colCreator} ${L.pinned('creator') ? styles.pin : ''}`} role="cell" data-col="creator" data-pin-edge={L.edge('creator') || undefined} style={L.style('creator')}>
        {quote.creator ? (
          <>
            <Avatar name={quote.creator.name} color={quote.creator.color} size={24} tooltip={false} />
            <span className={styles.creatorName}>{quote.creator.name}</span>
          </>
        ) : <span className={styles.creatorName}>—</span>}
      </div>
      <div className={`${styles.cell} ${styles.colTotal} ${L.pinned('total') ? styles.pin : ''}`} role="cell" data-col="total" data-pin-edge={L.edge('total') || undefined} style={L.style('total')}>{`S$${money(quote.amountMinor)}`}</div>

      {/* Due cell: calendar_add_on 24 primary outlined when empty; the date (underlined, red when overdue) otherwise. */}
      <div className={`${styles.cell} ${styles.colDue} ${L.pinned('due') ? styles.pin : ''}`} role="cell" data-col="due" data-pin-edge={L.edge('due') || undefined} style={L.style('due')}>
        {quote.dueAt ? (
          <button type="button" className={styles.dueBtn} data-overdue={overdue || undefined}
                  aria-label={`Due ${displayDate(quote.dueAt)}${overdue ? ', overdue' : ''} — change due date`}
                  onClick={(e) => onDue(quote, e.currentTarget)}>
            {displayDate(quote.dueAt)}
          </button>
        ) : (
          <Tooltip label="Set due date">
            <IconButton icon="calendar_add_on" label={`Set due date for ${quote.title}`} size={24} variant="primary"
                        onClick={(e) => onDue(quote, e.currentTarget)} />
          </Tooltip>
        )}
      </div>

      {/* Created · Sent · Updated · Approval Date — "17 Jul ’26" 14/Regular, "-" when empty (910:36324). */}
      <div className={`${styles.cell} ${styles.colCreated} ${L.pinned('created') ? styles.pin : ''}`} role="cell" data-col="created" data-pin-edge={L.edge('created') || undefined} style={L.style('created')}>{displayDate(quote.createdAt)}</div>
      <div className={`${styles.cell} ${styles.colSent} ${L.pinned('sent') ? styles.pin : ''}`} role="cell" data-col="sent" data-pin-edge={L.edge('sent') || undefined} style={L.style('sent')}>{quote.sentAt ? displayDate(quote.sentAt) : '-'}</div>
      <div className={`${styles.cell} ${styles.colUpdated} ${L.pinned('updated') ? styles.pin : ''}`} role="cell" data-col="updated" data-pin-edge={L.edge('updated') || undefined} style={L.style('updated')}>{displayDate(quote.updatedAt ?? quote.createdAt)}</div>
      {showApproval ? <div className={`${styles.cell} ${styles.colApproval} ${L.pinned('approval') ? styles.pin : ''}`} role="cell" data-col="approval" data-pin-edge={L.edge('approval') || undefined} style={L.style('approval')}>{quote.approvedAt ? displayDate(quote.approvedAt) : '-'}</div> : null}

      {/* Row hover actions (910:36644 / 910:36709 "Hover button"): View + kebab, level-1 shadow, right 24 — tasks pattern with "View". */}
      <span className={styles.actions} data-open={menuOpen || undefined}>
        <span className={styles.actionsInner}>
        <span className={styles.float}>
          <Button variant="primary" appearance="outlined" onPress={() => onView(quote)}>View</Button>
        </span>
        <span className={styles.menuWrap} ref={kebab}>
          <span className={styles.float}>
            <Tooltip label="More actions" disabled={menuOpen}>
              <IconButton icon="more_vert" label={`More actions for ${quote.title}`} variant="primary"
                          aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => onMenuToggle(e.currentTarget)} />
            </Tooltip>
          </span>
          <PortalMenu open={menuOpen} anchor={kebab} onClose={onMenuClose} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={quote.title}>
            {/* 910:36723 — verbatim order. */}
            <DropdownItem onSelect={pick('share')}>Preview and Share</DropdownItem>
            <DropdownItem onSelect={pick('copy')}>Copy Link</DropdownItem>
            <DropdownItem onSelect={pick('pdf')}>Download as PDF</DropdownItem>
            <DropdownItem onSelect={pick('print')}>Print</DropdownItem>
            {/* (REG-639, X-Ray parity Q-12) the quote editor's kebab entry, on the row — and a phone's way into X-Ray from a lead */}
            <DropdownItem onSelect={pick('xray')}>Compare with another quote</DropdownItem>
            <DropdownItem onSelect={pick('archive')}>Archive</DropdownItem>
            {/* (sweep S1) the rule's own people — Admins may too. (REG-728) The row's own tone — a locked Delete reads disabled, not red — and
                its reason in the row's reason line, under its words (the full rule was a native title, which never shows on touch). */}
            <DropdownItem tone="danger" disabled={!deletable} title={deletable ? undefined : 'creator, Owner or Admin'} onSelect={pick('delete')}>Delete</DropdownItem>
          </PortalMenu>
        </span>
        </span>
      </span>
    </div>
  )
}
