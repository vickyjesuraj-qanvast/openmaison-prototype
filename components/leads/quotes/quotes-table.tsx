'use client'

import { useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { menuSideFor } from '@/components/leads/menu-side'
import menuStyles from '@/components/leads/menus.module.css'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import type { Quote } from '@/lib/db/schema'
import { displayDate, money } from '@/lib/format'
import { isQuoteOverdue, quoteStatuses, type QuoteStatus } from '@/lib/leads/quote-filters'
import type { QuoteApproval } from '@/lib/settings/types'
import styles from './quotes-table.module.css'

/** Row kebab (910:36723): Preview and Share · Copy Link · Download as PDF · Print · Archive · Delete. */
export type QuoteRowAction = 'share' | 'copy' | 'pdf' | 'print' | 'archive' | 'delete'

export type QuotesTableProps = {
  quotes: Quote[]
  /** Clock captured by the caller (purity rule) — overdue = not Signed + due before today. */
  now: number
  /** Settings › Leads › Quote approval — decides which statuses the row menu can offer. */
  approval: QuoteApproval
  selected: Set<string>
  onSelect: (ids: Set<string>) => void
  onStatus: (quote: Quote, status: QuoteStatus) => void
  onDue: (quote: Quote, anchor: HTMLElement) => void
  onView: (quote: Quote) => void
  onRowMenu: (quote: Quote, action: QuoteRowAction) => void
}

/* Column order + head copy — exactly as the mock types it (910:36323, spec 01). Every head carries unfold_more 16.
   Approval Date is part of the approval lifecycle, so it is dropped with it (see `showApproval` below). */
const HEADS: { key: string; label: string; col: string | undefined }[] = [
  { key: 'title', label: 'Title', col: styles.colTitle },
  { key: 'status', label: 'Status', col: styles.colStatus },
  { key: 'total', label: 'Total', col: styles.colTotal },
  { key: 'due', label: 'Due', col: styles.colDue },
  { key: 'created', label: 'Created', col: styles.colCreated },
  { key: 'sent', label: 'Sent', col: styles.colSent },
  { key: 'updated', label: 'Updated', col: styles.colUpdated },
  { key: 'approval', label: 'Approval Date', col: styles.colApproval },
]

/* Which way a row kebab opens is measured when it is pressed, not counted from the row index: a 3-row table leaves
   ~560px of empty frame under the last row, and the old count flipped the menu up over the tabs and the toolbar.
   (REG-286) That measurement used to be copied out into this file, the Contracts twin, the leads table and the kanban
   card — four hand-written answers to one question, and Tasks / Files never got it at all. It now lives once in
   components/leads/menu-side.ts; the row kebab draws six items. */
const MENU_ITEMS = 6

/**
 * Lead Details › Quotes table (910:36322) — specs design-source/context/lead-quotes/01-listing-table.txt +
 * 02-rows-menus.txt. Head 56 · rows 64; columns 40 · 319 · 128 · 120 · 120 · 120 · 120 · 120 · 157 (Title fills).
 * Structure copied from components/leads/tasks/tasks-table.tsx: every icon-only control carries a Tooltip (REG-75);
 * sorting is inert (coming soon); menus toggle on their own trigger (REG-153).
 */
export function QuotesTable({ quotes, now, approval, selected, onSelect, onStatus, onDue, onView, onRowMenu }: QuotesTableProps) {
  const comingSoon = useComingSoon()
  const [menuRow, setMenuRow] = useState<string | null>(null)
  const [menuSide, setMenuSide] = useState<'up' | 'down'>('down')   /* measured on open — only one row menu is open at a time */
  const [statusRow, setStatusRow] = useState<string | null>(null)
  const statuses = quoteStatuses(approval)
  /* The head list follows the studio's lifecycle like the status menu does (REG-214): a studio that does not review
     quotes internally has no approval date to show, and the column headed one for every row. A quote approved before
     the setting was switched off keeps its date visible — the same courtesy the row menu pays a retired status. */
  const showApproval = statuses.includes('Approved') || quotes.some((q) => q.approvedAt)
  const heads = showApproval ? HEADS : HEADS.filter((h) => h.key !== 'approval')

  const allSelected = quotes.length > 0 && quotes.every((q) => selected.has(q.id))
  const toggleAll = () => onSelect(allSelected ? new Set() : new Set(quotes.map((q) => q.id)))
  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    onSelect(next)
  }

  return (
    <div className={styles.card} role="table" aria-label="Quotes" data-no-approval={showApproval ? undefined : ''}>
      {/* Head row — selection head = a real select-all checkbox (check_box_outline_blank 24/Light in the mock). */}
      <div className={styles.head} role="row">
        <div className={`${styles.hCell} ${styles.colSel}`} role="columnheader">
          <Checkbox isSelected={allSelected} isDisabled={quotes.length === 0} onChange={toggleAll} aria-label="Select all quotes" />
        </div>
        {heads.map((h) => (
          <div key={h.key} className={`${styles.hCell} ${h.col ?? ''}`} role="columnheader">
            {/* Sort is inert in this prototype — the head answers coming soon. */}
            <button type="button" className={styles.hSort} onClick={comingSoon}>
              <span className={styles.hLabel}>{h.label}</span>
              <Icon name="unfold_more" size={16} />
            </button>
          </div>
        ))}
      </div>

      {quotes.map((quote) => (
        <QuoteRowView
          key={quote.id}
          quote={quote}
          now={now}
          selected={selected.has(quote.id)}
          onToggleSelect={() => toggleOne(quote.id)}
          statuses={statuses}
          showApproval={showApproval}
          statusOpen={statusRow === quote.id}
          onStatusToggle={() => setStatusRow((s) => (s === quote.id ? null : quote.id))}
          onStatusClose={() => setStatusRow(null)}
          menuOpen={menuRow === quote.id}
          onMenuToggle={(trigger) => {
            if (menuRow !== quote.id) setMenuSide(menuSideFor(trigger, MENU_ITEMS))   /* measure the room below the kebab before it opens */
            setMenuRow((m) => (m === quote.id ? null : quote.id))
          }}
          onMenuClose={() => setMenuRow(null)}
          /* Kebab flips up only when the menu would not fit below the row (measured above), never by row count. */
          menuSide={menuSide}
          onStatus={onStatus} onDue={onDue} onView={onView} onRowMenu={onRowMenu}
        />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */

function QuoteRowView({
  quote, now, selected, onToggleSelect, statuses, showApproval,
  statusOpen, onStatusToggle, onStatusClose,
  menuOpen, onMenuToggle, onMenuClose, menuSide,
  onStatus, onDue, onView, onRowMenu,
}: {
  quote: Quote
  now: number
  selected: boolean
  onToggleSelect: () => void
  statuses: readonly QuoteStatus[]
  showApproval: boolean
  statusOpen: boolean
  onStatusToggle: () => void
  onStatusClose: () => void
  menuOpen: boolean
  onMenuToggle: (trigger: HTMLElement) => void
  onMenuClose: () => void
  menuSide: 'up' | 'down'
  onStatus: (quote: Quote, status: QuoteStatus) => void
  onDue: (quote: Quote, anchor: HTMLElement) => void
  onView: (quote: Quote) => void
  onRowMenu: (quote: Quote, action: QuoteRowAction) => void
}) {
  const overdue = isQuoteOverdue(quote, now)
  const pick = (action: QuoteRowAction) => () => { onMenuClose(); onRowMenu(quote, action) }
  const pickStatus = (status: QuoteStatus) => () => { onStatusClose(); onStatus(quote, status) }

  return (
    <div className={styles.row} role="row" data-selected={selected ? '' : undefined}>
      {/* Selection cell 40: checkbox 24/Light secondary → check_box 24 primary when selected. */}
      <div className={`${styles.cell} ${styles.colSel}`} role="cell">
        <Checkbox isSelected={selected} onChange={onToggleSelect} aria-label={`Select ${quote.title}`} />
      </div>

      {/* Title cell "Cell / Two line" (V g4): Name 14/Bold + "OM-10001 · Private" 12/Regular secondary (H g8). */}
      <div className={`${styles.cell} ${styles.colTitle}`} role="cell">
        <div className={styles.titleData}>
          <span className={styles.title}>{quote.title}</span>
          <span className={styles.sub}>
            <span>{quote.number}</span>
            <span>·</span>
            <span>{quote.visibility}</span>
          </span>
        </div>
      </div>

      {/* Status cell: "Draft" 14/Regular + keyboard_arrow_down 20 (H g4) → status menu 910:36673 (all five, current marked). */}
      <div className={`${styles.cell} ${styles.colStatus}`} role="cell">
        <span className={styles.statusWrap}>
          <button
            type="button" className={styles.statusBtn}
            aria-haspopup="menu" aria-expanded={statusOpen}
            aria-label={`Status ${quote.status} — change status`}
            onClick={onStatusToggle}
          >
            {quote.status}
            <span className={styles.chev} data-open={statusOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>
          </button>
          <Dropdown open={statusOpen} onClose={onStatusClose} align="left" sheetTitle="Status">
            {/* Items are raw menu buttons (like components/leads/stage-dropdown.tsx) so the current status can carry
                aria-current + the "current" meta — DropdownItem takes no attributes. */}
            {/* The studio's lifecycle, not the full five: a studio that does not review quotes internally can never
                set "Sent for Approval" or "Approved" (Settings › Leads › Quote approval, user 2026-08-30). Same list the
                Overview widget draws its track from. A quote already holding a retired status still shows it above. */}
            {statuses.map((s) => {
              const isCurrent = s === quote.status
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

      {/* Total: "S$70,000" — no space after S$ (910:36324). */}
      <div className={`${styles.cell} ${styles.colTotal}`} role="cell">{`S$${money(quote.amountMinor)}`}</div>

      {/* Due cell: calendar_add_on 24 primary outlined when empty; the date (underlined, red when overdue) otherwise. */}
      <div className={`${styles.cell} ${styles.colDue}`} role="cell">
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
      <div className={`${styles.cell} ${styles.colCreated}`} role="cell">{displayDate(quote.createdAt)}</div>
      <div className={`${styles.cell} ${styles.colSent}`} role="cell">{quote.sentAt ? displayDate(quote.sentAt) : '-'}</div>
      <div className={`${styles.cell} ${styles.colUpdated}`} role="cell">{displayDate(quote.updatedAt ?? quote.createdAt)}</div>
      {showApproval ? <div className={`${styles.cell} ${styles.colApproval}`} role="cell">{quote.approvedAt ? displayDate(quote.approvedAt) : '-'}</div> : null}

      {/* Row hover actions (910:36644 / 910:36709 "Hover button"): View + kebab, level-1 shadow, right 24 — tasks pattern with "View". */}
      <span className={styles.actions} data-open={menuOpen || undefined}>
        <span className={styles.float}>
          <Button variant="primary" appearance="outlined" onPress={() => onView(quote)}>View</Button>
        </span>
        <span className={styles.menuWrap}>
          <span className={styles.float}>
            <Tooltip label="More actions" disabled={menuOpen}>
              <IconButton icon="more_vert" label={`More actions for ${quote.title}`} variant="primary"
                          aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => onMenuToggle(e.currentTarget)} />
            </Tooltip>
          </span>
          <Dropdown open={menuOpen} onClose={onMenuClose} align="right" side={menuSide} sheetTitle={quote.title}>
            {/* 910:36723 — verbatim order. */}
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
