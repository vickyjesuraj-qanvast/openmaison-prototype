'use client'

import { Button } from '@/components/ds'
import { ColumnResizer, gridTracks, useColumnWidths } from '@/components/om/column-resize'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate, money } from '@/lib/format'
import type { QanvastLeadRow } from '@/lib/leads/qanvast'
import styles from './qanvast-leads.module.css'

/* Column order + head copy (931:49232, spec 02) — the head style uppercases them, as the Leads listing head. Every head carries unfold_more 16 (inert). */
/** The card's mocked tracks (qanvast-leads.module.css) — the user's dragged widths replace them (REG-427). */
const TRACKS = [{ key: 'name', track: 'minmax(238px, 240fr)' }, { key: 'credits', track: 'minmax(132px, 132fr)' }, { key: 'budget', track: 'minmax(138px, 138fr)' }, { key: 'type', track: 'minmax(158px, 158fr)' }, { key: 'created', track: 'minmax(115px, 115fr)' }, { key: 'status', track: '369px' }]
const HEADS: { key: string; label: string; col: string | undefined }[] = [
  { key: 'name', label: 'Name', col: styles.colName },
  { key: 'credits', label: 'Credits', col: styles.colCredits },
  { key: 'budget', label: 'Budget (S$)', col: styles.colBudget },
  { key: 'type', label: 'Property type', col: styles.colType },
  { key: 'created', label: 'Created', col: styles.colCreated },
  { key: 'status', label: 'Status', col: styles.colStatus },
]

/**
 * Qanvast Ops › Leads table (931:49232, hover 931:49435) — spec design-source/context/lead-return/02-qanvast-ops.txt.
 * Head 56 · rows 64; columns 240 · 132 · 138 · 158 · 115 · 369 (Status fluid). Structure copied from
 * components/leads/contracts/contracts-table.tsx + components/leads/quotes/quotes-table.tsx: icon-only controls carry a
 * Tooltip (REG-75); sorting and customise are inert (coming soon); the row hover floats "View Lead" at the right — and
 * "Lead Return Updates" before it on a returned row (931:49435; coming soon until the flow is specified, audit 2026-08-30).
 */
export function QanvastTable({ rows, onView, onCopyPhone }: { rows: QanvastLeadRow[]; onView: (id: string) => void; onCopyPhone: (row: QanvastLeadRow) => void }) {
  const comingSoon = useComingSoon()
  const colWidths = useColumnWidths('qanvast-leads')
  const tracks = gridTracks(TRACKS, colWidths)
  return (
    /* data-scrolled drives the frozen Name column's shadow ≤1024 (REG-269) — the listing's own handler
       (components/leads/table.tsx .scroller); inert at desktop, where the card never scrolls. */
    <div className={styles.card} role="table" aria-label="Qanvast leads" data-testid="qanvast-leads" data-cols="qanvast-leads" style={tracks ? ({ '--tracks': tracks } as React.CSSProperties) : undefined}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div className={styles.head} role="row">
        {HEADS.map((h, i) => (
          <div key={h.key} className={`${styles.hCell} ${h.col ?? ''}`} role="columnheader">
            <button type="button" className={styles.hSort} onClick={comingSoon}>
              <span className={styles.hLabel}>{h.label}</span>
              <Icon name="unfold_more" size={16} />
            </button>
            <ColumnResizer table="qanvast-leads" column={h.key} label={h.label} min={h.key === 'name' ? 160 : 72} />
            {i === 0 ? (
              /* Name head: tune 16 = Customise view (the listing's components/leads/table.tsx head control) — coming soon here. */
              <span className={styles.hTools}>
                <Tooltip label="Customise your view">
                  <button type="button" className={styles.hTune} aria-label="Customise your view" onClick={comingSoon}>
                    <Icon name="tune" size={16} />
                  </button>
                </Tooltip>
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {rows.map((row) => (
        <div key={row.id} className={styles.row} role="row" data-testid="qanvast-row">
          {/* Name "Cell / Two line": "Jasmine Lee" 14/Bold + the phone 12 secondary — eight unbroken digits everywhere (REG-162; the mock's 4+4 space is not reproduced). */}
          {/* (REG-351) The listing's name cell, exactly: the whole cell opens the lead, the name reads as a link on
              hover, and the phone carries the same copy affordance. Its own controls keep their click. */}
          <div className={`${styles.cell} ${styles.colName}`} role="cell"
               onClick={(e) => { if ((e.target as HTMLElement).closest('button, a')) return; onView(row.id) }}>
            <div className={styles.nameData}>
              <span className={styles.name} role="link" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onView(row.id)}>{row.name}</span>
              <span className={styles.phoneRow}>
                <span className={styles.phone}>{row.phone}</span>
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
          <div className={`${styles.cell} ${styles.colCredits}`} role="cell">{row.credits}</div>
          <div className={`${styles.cell} ${styles.colBudget}`} role="cell">{money(row.budgetMinor)}</div>
          <div className={`${styles.cell} ${styles.colType}`} role="cell"><span className={styles.oneLine}>{row.propertyType}</span></div>
          <div className={`${styles.cell} ${styles.colCreated}`} role="cell">{displayDate(row.createdAt)}</div>
          {/* Status: stage / return states as the 20px "Tag Outlined" MetaChip (title case, as the Lead Details header and the
              LEAD RETURNED card render the same returnTags — UI-01); Yellow / Green / Red per lib/leads/return-tags.ts, H g8. */}
          <div className={`${styles.cell} ${styles.colStatus}`} role="cell">
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
