'use client'

import { Icon } from '@/components/om/icon'
import { Dropdown, DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { STAGES, INACTIVE_STAGES, type Stage } from '@/lib/leads/enums'
import { ATTENTION_LABEL, type AttentionScope } from '@/lib/leads/filters'
import styles from './menus.module.css'

/** (UX audit L3) The to-do group, in the morning's order — (parity P-20, Q-07) "To do" on both listings now. */
const TO_DO: AttentionScope[] = ['overdue', 'unassigned', 'unseen']

/** The "All Leads (99)" pill menu — 1:1 from Dropdown Menu / Leads (780:93630, 200×433).
 *  (REG-728) On the house pieces: its rows are `DropdownItem` radios with the count as their meta (the current one in the Selected
 *  fill), its group titles `DropdownLabel`, and its rules `DropdownDivider` — whose 4px above and below are what make the mock's 433
 *  (the no-margin rule it had drew it 409 tall).
 *  (UX audit L3, extends REG-608) Morning triage where the eye already is: "Mine" under All Leads, then a to-do group — Overdue
 *  follow-ups · Unassigned · Unseen, the Filters modal's quick filters, each with its count — above the stages. One pick scopes the listing
 *  (a stage or one of these); the pill then names it. The menu is wider for "Overdue follow-ups" and its count (MENU_WIDTH.wide).
 *  (parity P-20, B-02 · Q-07) One menu order on both listings — the default · Mine · the to-do group · the stages under a label — and one
 *  name for the group, "To do" (the Projects menu's; its item keeps "Needs attention"); the phone sheet names the dimension, "Lead status"
 *  ("Project status" there). The pill counts the rows the list shows (workspace.tsx). */
export function StageFilterDropdown({
  open, onClose, counts, value, onSelect, onManage, attention,
}: {
  open: boolean
  onClose: () => void
  counts: Record<string, number> & { all: number }
  value: Stage | null
  onSelect: (stage: Stage | null) => void
  onManage: () => void
  /** (UX audit L3) Mine and the to-do group: each scope's count, the one picked, the pick. */
  attention?: { counts: Record<AttentionScope, number>; value: AttentionScope | null; onSelect: (key: AttentionScope) => void }
}) {
  /* the count as text: a 0 is still printed */
  const item = (label: string, n: number, stage: Stage | null) => (
    <DropdownItem key={label} role="menuitemradio" checked={value === stage && !attention?.value} meta={String(n)}
                  onSelect={() => { onSelect(stage); onClose() }}>
      {label}
    </DropdownItem>
  )
  const scopeItem = (key: AttentionScope) => attention ? (
    <DropdownItem key={key} role="menuitemradio" checked={attention.value === key} meta={String(attention.counts[key])}
                  onSelect={() => { attention.onSelect(key); onClose() }}>
      {ATTENTION_LABEL[key]}
    </DropdownItem>
  ) : null
  return (
    <Dropdown open={open} onClose={onClose} align="left" width={attention ? MENU_WIDTH.wide : MENU_WIDTH.standard} sheetTitle="Lead status">
      {item('All Leads', counts.all, null)}
      {scopeItem('mine')}
      {attention ? (
        <>
          <DropdownDivider />
          <DropdownLabel>To do</DropdownLabel>
          {TO_DO.map(scopeItem)}
        </>
      ) : null}
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
