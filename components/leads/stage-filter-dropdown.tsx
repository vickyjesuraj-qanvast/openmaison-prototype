'use client'

import { Icon } from '@/components/om/icon'
import { Dropdown } from '@/components/leads/dropdown'
import { STAGES, INACTIVE_STAGES, type Stage } from '@/lib/leads/enums'
import styles from './menus.module.css'
import dd from './stage-dropdown.module.css'

/** The "All Leads (99)" pill menu — 1:1 from Dropdown Menu / Leads (780:93630, 200×433). */
export function StageFilterDropdown({
  open, onClose, counts, value, onSelect, onManage,
}: {
  open: boolean
  onClose: () => void
  counts: Record<string, number> & { all: number }
  value: Stage | null
  onSelect: (stage: Stage | null) => void
  onManage: () => void
}) {
  const item = (label: string, n: number, stage: Stage | null) => (
    <button key={label} type="button" role="menuitemradio" aria-checked={value === stage}
            className={styles.item} data-selected={value === stage || undefined}
            onClick={() => { onSelect(stage); onClose() }}>
      <span>{label}</span>
      <span className={styles.count}>{n}</span>
    </button>
  )
  return (
    <Dropdown open={open} onClose={onClose} align="left">
      {item('All Leads', counts.all, null)}
      <div className={styles.divider} />
      <div className={dd.groupTitle} data-tone="green"><span className={dd.dot} data-tone="green" />Active</div>
      {STAGES.map((s) => item(s, counts[s] ?? 0, s))}
      <div className={styles.divider} />
      <div className={dd.groupTitle} data-tone="orange"><span className={dd.dot} data-tone="orange" />Inactive</div>
      {INACTIVE_STAGES.map((s) => item(s, counts[s] ?? 0, s))}
      <div className={styles.divider} />
      <button type="button" role="menuitem" className={`${styles.item} ${styles.link}`} onClick={() => { onClose(); onManage() }}>
        Manage Stages
        <Icon name="keyboard_arrow_right" size={20} />
      </button>
    </Dropdown>
  )
}
