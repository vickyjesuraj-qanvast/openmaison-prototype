'use client'

import { Switch } from '@/components/ds'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { COST_ROLES, COST_ROLE_HELP, COST_VISIBILITY_HELP, COST_VISIBILITY_RULE, MARKETING_COST_HELP, type CostRole, type CostVisibility } from '@/lib/settings/cost-visibility'
import styles from './settings.module.css'
import own from './cost-visibility-card.module.css'

const plural = (r: 'Owner' | CostRole) => (r === 'Accounting' ? 'Accounting' : `${r}s`)

/**
 * (pending modules S41b-1 — 1.0's Accounts › Studio › *Cost & Margin Visibility*, `cost-visibility-tab.tsx`) Settings › Roles & access ›
 * **Who sees costs and margins**: a switch per role on the house card table (the Notifications event table, REG-614 · REG-727) — Owners
 * always (a switch on and fixed, 1.0's "Always"), then Admins · Managers · Designers · Accounting, each saying what it hides. The Owner alone
 * changes it; anyone else reads it with the rule (1.0: "Only the studio owner can change cost and margin visibility"). Every switch is
 * optimistic, put back when refused, and answers one sentence with Undo (settings-view.tsx `chooseCost`). Its one home: here, beside Who may
 * do what, whose three cost rows follow it at once.
 */
export function CostVisibilityCard({ value, counts, owner, onChange }: {
  value: CostVisibility
  /** active members per role — the row's name says how many it reaches */
  counts: Record<string, number>
  /** the viewer is an Owner — the only one who changes it */
  owner: boolean
  onChange: (role: CostRole, on: boolean) => void
}) {
  const name = (r: 'Owner' | CostRole | 'Marketing') => `${r === 'Marketing' ? r : plural(r)}${counts[r] ? ` · ${counts[r]}` : ''}`   // (S44O — C6) "Marketing", as "Accounting"
  return (
    <div className={styles.setting} data-testid="cost-visibility" id="cost-visibility">
      <div className={styles.settingHead}>
        <span className={styles.settingTitle}>Who sees costs and margins</span>
        <span className={styles.settingHelp}>{COST_VISIBILITY_HELP}</span>
      </div>
      {owner ? null : <ReadOnlyNote text={`${COST_VISIBILITY_RULE}.`} />}
      <div className={`${styles.eventTable} ${own.table}`} role="table" aria-label="Who sees costs and margins" data-card-table="">
        <div className={styles.eventHead} role="row">
          <span role="columnheader">Role</span>
          <span role="columnheader" className={styles.eventCol}>Sees costs</span>
        </div>
        <div className={styles.eventRow} role="row" data-testid="cost-role-Owner">
          <span role="cell" className={styles.eventName}><span><span>{name('Owner')}</span><span className={styles.eventHelp}>{COST_ROLE_HELP.Owner}</span></span></span>
          <span role="cell" className={styles.eventCol} data-label="Sees costs"><Switch size="sm" isSelected isDisabled aria-label="Owners always see costs and margins" /></span>
        </div>
        {COST_ROLES.map((r) => (
          <div key={r} className={styles.eventRow} role="row" data-testid={`cost-role-${r}`} data-on={value[r] || undefined}>
            <span role="cell" className={styles.eventName}><span><span>{name(r)}</span><span className={styles.eventHelp}>{COST_ROLE_HELP[r]}</span></span></span>
            <span role="cell" className={styles.eventCol} data-label="Sees costs">
              <Switch size="sm" isSelected={value[r]} isDisabled={!owner} onChange={(on: boolean) => onChange(r, on)} aria-label={`${plural(r)} see costs and margins`} />
            </span>
          </div>
        ))}
        {/* (S44O — call C6) Marketing never sees them — a quote's money is not the lead desk's; fixed, as the Owner's row is */}
        <div className={styles.eventRow} role="row" data-testid="cost-role-Marketing">
          <span role="cell" className={styles.eventName}><span><span>{name('Marketing')}</span><span className={styles.eventHelp}>{MARKETING_COST_HELP}</span></span></span>
          <span role="cell" className={styles.eventCol} data-label="Sees costs"><Switch size="sm" isSelected={false} isDisabled aria-label="Marketing never sees costs and margins" /></span>
        </div>
      </div>
    </div>
  )
}
