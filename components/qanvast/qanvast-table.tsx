'use client'

import { Button } from '@/components/ds'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { gridTemplateFor, useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { useRef } from 'react'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate, money, phoneLocal } from '@/lib/format'
import type { QanvastLeadRow } from '@/lib/leads/qanvast'
import { RETURN_RULES_TEXT } from '@/lib/leads/return-model'
import styles from './qanvast-leads.module.css'

/* Column order + head copy (931:49232, spec 02) — the head style uppercases them, as the Leads listing head. Every head carries unfold_more 16 (inert). */
/** The card's mocked tracks (qanvast-leads.module.css) — the user's dragged widths replace them (REG-427). */
/** The table's columns (931:49232, spec 02): Name locked first; the user's order, visibility and pins come from Column settings (REG-454). */
export const QANVAST_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'name', label: 'Name', track: 'minmax(238px, 240fr)', locked: true },
  { key: 'credits', label: 'Credits', track: 'minmax(132px, 132fr)' },
  { key: 'budget', label: 'Budget (S$)', track: 'minmax(138px, 138fr)' },
  { key: 'type', label: 'Property type', track: 'minmax(158px, 158fr)' },
  { key: 'created', label: 'Created', track: 'minmax(115px, 115fr)' },
  { key: 'window', label: 'Return window', track: 'minmax(176px, 176fr)' },   /* (REG-609, parity Q-44) Qanvast's rules, display only */
  { key: 'qanvastId', label: 'Qanvast ID', track: 'minmax(120px, 120fr)', hidden: true },   /* (REG-609, parity T-10) 1.0's qanvast_lead_id, off until switched on */
  { key: 'status', label: 'Status', track: '369px' },
]
/* (REG-468) No sort glyph where ordering means nothing — see the sort audit of 2026-09-16. */
const SORTABLE: Record<string, boolean> = { type: false, status: false, window: false, qanvastId: false }
const COL_CLASS: Record<string, string | undefined> = { name: styles.colName, credits: styles.colCredits, budget: styles.colBudget, type: styles.colType, created: styles.colCreated, status: styles.colStatus }

/**
 * Qanvast Ops › Leads table (931:49232, hover 931:49435) — spec design-source/context/lead-return/02-qanvast-ops.txt.
 * Head 56 · rows 64; columns 240 · 132 · 138 · 158 · 115 · 369 (Status fluid). Structure copied from
 * components/leads/contracts/contracts-table.tsx + components/leads/quotes/quotes-table.tsx: icon-only controls carry a
 * Tooltip (REG-75); sorting and customise are inert (coming soon); the row hover floats "View Lead" at the right — and
 * "Lead Return Updates" before it on a returned row (931:49435; coming soon until the flow is specified, audit 2026-08-30).
 */
export function QanvastTable({ rows, onView, onCopyPhone, columns, onReorder }: { rows: QanvastLeadRow[]; onView: (id: string) => void; onCopyPhone: (row: QanvastLeadRow) => void; columns: readonly TableColumn[]; onReorder: (keys: string[]) => void }) {
  const comingSoon = useComingSoon()
  const colWidths = useColumnWidths('qanvast-leads')
  const tracks = gridTemplateFor(columns, colWidths)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)   /* drag a head to reorder (REG-462) */
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  return (
    /* data-scrolled drives the frozen Name column's shadow ≤1024 (REG-269) — the listing's own handler
       (components/leads/table.tsx .scroller); inert at desktop, where the card never scrolls. */
    <div className={styles.card} role="table" data-drag-root="" aria-label="Qanvast leads" data-testid="qanvast-leads" data-cols="qanvast-leads" style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
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
            <ColumnResizer table="qanvast-leads" column={c.key} label={c.label} min={c.key === 'name' ? 160 : 72} />
          </div>
        ))}
      </div>

      {rows.map((row) => (
        <div key={row.id} className={styles.row} role="row" data-testid="qanvast-row">
          {/* Name "Cell / Two line": "Jasmine Lee" 14/Bold + the phone 12 secondary — eight unbroken digits everywhere (REG-162; the mock's 4+4 space is not reproduced). */}
          {/* (REG-351) The listing's name cell, exactly: the whole cell opens the lead, the name reads as a link on
              hover, and the phone carries the same copy affordance. Its own controls keep their click. */}
          <div className={`${styles.cell} ${styles.colName} ${L.pinned('name') ? styles.pin : ''}`} role="cell" data-col="name" data-pin-edge={L.edge('name') || undefined} style={L.style('name')}
               onClick={(e) => { if ((e.target as HTMLElement).closest('button, a')) return; onView(row.id) }}>
            <div className={styles.nameData}>
              <span className={styles.name} role="link" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onView(row.id)}>{row.name}</span>
              <span className={styles.phoneRow}>
                <span className={styles.phone}>{phoneLocal(row.phone)}</span>
                <Tooltip label="Copy phone number">
                  <button type="button" className={styles.copyBtn} aria-label={`Copy ${row.name}'s phone number`}
                          onClick={() => onCopyPhone(row)}>
                    <Icon name="content_copy" size={14} weight={300} />
                  </button>
                </Tooltip>
              </span>
            </div>
          </div>
          {/* Credits "200" · Budget (S$) "70,500" (no S$ prefix — the head carries it) · Property type · created "17 Jul ’26". */}
          <div className={`${styles.cell} ${styles.colCredits} ${L.pinned('credits') ? styles.pin : ''}`} role="cell" data-col="credits" data-pin-edge={L.edge('credits') || undefined} style={L.style('credits')}>{row.credits}</div>
          <div className={`${styles.cell} ${styles.colBudget} ${L.pinned('budget') ? styles.pin : ''}`} role="cell" data-col="budget" data-pin-edge={L.edge('budget') || undefined} style={L.style('budget')}>{money(row.budgetMinor)}</div>
          <div className={`${styles.cell} ${styles.colType} ${L.pinned('type') ? styles.pin : ''}`} role="cell" data-col="type" data-pin-edge={L.edge('type') || undefined} style={L.style('type')}><span className={styles.oneLine}>{row.propertyType}</span></div>
          <div className={`${styles.cell} ${styles.colCreated} ${L.pinned('created') ? styles.pin : ''}`} role="cell" data-col="created" data-pin-edge={L.edge('created') || undefined} style={L.style('created')}>{displayDate(row.createdAt)}</div>
          {/* (REG-609, parity Q-44) Where the lead stands against Qanvast's return rules — shown, never enforced; the tooltip carries the rules. */}
          <div className={`${styles.cell} ${L.pinned('window') ? styles.pin : ''}`} role="cell" data-col="window" data-pin-edge={L.edge('window') || undefined} style={L.style('window')}>
            <Tooltip label={RETURN_RULES_TEXT}><span className={styles.window} data-state={row.window.state} tabIndex={0}>{row.window.short}</span></Tooltip>
          </div>
          <div className={`${styles.cell} ${L.pinned('qanvastId') ? styles.pin : ''}`} role="cell" data-col="qanvastId" data-pin-edge={L.edge('qanvastId') || undefined} style={L.style('qanvastId')}><span className={styles.oneLine}>{row.qanvastLeadId ?? '—'}</span></div>
          {/* Status: stage / return states as the 20px "Tag Outlined" MetaChip (title case, as the Lead Details header and the
              LEAD RETURNED card render the same returnTags — UI-01); Yellow / Green / Red per lib/leads/return-tags.ts, H g8. */}
          <div className={`${styles.cell} ${styles.colStatus} ${L.pinned('status') ? styles.pin : ''}`} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')}>
            <span className={styles.tags}>
              {row.tags.map((t) => <MetaChip key={t.label} color={t.color}>{t.label}</MetaChip>)}
            </span>
          </div>

          {/* Row hover (209): "Lead Return Updates" on a returned lead, and nothing else. "View Lead" stood here until
              the Name cell itself became the way in (REG-351) — two controls for one destination, one of them only
              reachable with a mouse (user 2026-09-05). A row with no return raises no hover bar at all now. */}
          {row.ret ? (
            <span className={styles.actions}>
              <span className={styles.actionsInner}>
              <span className={styles.float}>
                <Button appearance="outlined" onPress={comingSoon} aria-label={`Lead return updates for ${row.name}`}>Lead Return Updates</Button>
              </span>
              </span>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
