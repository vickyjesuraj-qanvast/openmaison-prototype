'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { displayDate, money } from '@/lib/format'
import type { QanvastLeadRow } from '@/lib/leads/qanvast'
import styles from './qanvast-leads.module.css'

/* Column order + head copy (931:49232, spec 02) — the head style uppercases them, as the Leads listing head. Every head carries unfold_more 16 (inert). */
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
export function QanvastTable({ rows, onView }: { rows: QanvastLeadRow[]; onView: (id: string) => void }) {
  const comingSoon = useComingSoon()
  return (
    <div className={styles.card} role="table" aria-label="Qanvast leads" data-testid="qanvast-leads">
      <div className={styles.head} role="row">
        {HEADS.map((h, i) => (
          <div key={h.key} className={`${styles.hCell} ${h.col ?? ''}`} role="columnheader">
            <button type="button" className={styles.hSort} onClick={comingSoon}>
              <span className={styles.hLabel}>{h.label}</span>
              <Icon name="unfold_more" size={16} />
            </button>
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
          <div className={`${styles.cell} ${styles.colName}`} role="cell">
            <div className={styles.nameData}>
              <span className={styles.name}>{row.name}</span>
              <span className={styles.phone}>{row.phone}</span>
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

          {/* Row hover (209): ["Lead Return Updates" ·] "View Lead" — secondary outlined 36, 12 apart, floating at right 24. */}
          <span className={styles.actions}>
            {row.ret ? (
              <span className={styles.float}>
                <Button variant="secondary" appearance="outlined" onPress={comingSoon} aria-label={`Lead return updates for ${row.name}`}>Lead Return Updates</Button>
              </span>
            ) : null}
            <span className={styles.float}>
              <Button variant="secondary" appearance="outlined" onPress={() => onView(row.id)} aria-label={`View lead ${row.name}`}>View Lead</Button>
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
