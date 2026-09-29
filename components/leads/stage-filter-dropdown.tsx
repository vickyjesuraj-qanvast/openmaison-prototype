'use client'

import { Icon } from '@/components/om/icon'
import { Dropdown, DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { STAGES, INACTIVE_STAGES, type Stage } from '@/lib/leads/enums'
import styles from './menus.module.css'

/** The "All Leads (99)" pill menu — 1:1 from Dropdown Menu / Leads (780:93630, 200×433).
 *  (REG-728) On the house pieces: its rows are `DropdownItem` radios with the count as their meta (the current one in the Selected
 *  fill), its group titles `DropdownLabel`, and its rules `DropdownDivider` — whose 4px above and below are what make the mock's 433
 *  (the no-margin rule it had drew it 409 tall). */
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
  /* the count as text: a 0 is still printed */
  const item = (label: string, n: number, stage: Stage | null) => (
    <DropdownItem key={label} role="menuitemradio" checked={value === stage} meta={String(n)}
                  onSelect={() => { onSelect(stage); onClose() }}>
      {label}
    </DropdownItem>
  )
  return (
    <Dropdown open={open} onClose={onClose} align="left" width={MENU_WIDTH.standard} sheetTitle="Lead Status">
      {item('All Leads', counts.all, null)}
      <DropdownDivider />
      <DropdownLabel tone="green" dot>Active</DropdownLabel>
      {STAGES.map((s) => item(s, counts[s] ?? 0, s))}
      <DropdownDivider />
      <DropdownLabel tone="orange" dot>Inactive</DropdownLabel>
      {INACTIVE_STAGES.map((s) => item(s, counts[s] ?? 0, s))}
      <DropdownDivider />
      <button type="button" role="menuitem" className={`${styles.item} ${styles.link}`} onClick={() => { onClose(); onManage() }}>
        Manage Stages
        <Icon name="keyboard_arrow_right" size={20} />
      </button>
    </Dropdown>
  )
}
