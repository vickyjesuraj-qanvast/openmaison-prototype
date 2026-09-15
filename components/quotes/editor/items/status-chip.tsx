'use client'

import { useRef, useState } from 'react'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem } from '@/components/leads/dropdown'
import { ITEM_STATUSES, ITEM_STATUS_CHIP, type ItemStatus } from '@/lib/quotes/items-model'
import styles from './items-table.module.css'
import sec from './items-section.module.css'

/**
 * The client's answer on a line (1260:31267 · 31303 · 31337): Pending · Approved · Declined, editable (owner 2026-09-11).
 * On a group row the answer covers the group's lines (spec 03: a child's STATUS cell is empty — REG-417).
 */
export function StatusChip({ status, onChange, label }: { status: ItemStatus; onChange: (s: ItemStatus) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLButtonElement>(null)
  const chip = ITEM_STATUS_CHIP[status]
  return (
    <>
      <button ref={anchor} type="button" className={styles.chip} data-tone={chip.tone} aria-haspopup="menu" aria-expanded={open}
              aria-label={`${label}: ${status}`} onClick={() => setOpen((o) => !o)}>
        <span className={styles.chipMain}><Icon name={chip.icon} size={16} />{status}</span>
        <Icon name="keyboard_arrow_down" size={20} />
      </button>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} role="menu" width={200} sheetTitle="Status">
        {ITEM_STATUSES.map((s) => (
          <DropdownItem key={s} role="menuitemradio" checked={s === status} onSelect={() => { setOpen(false); if (s !== status) onChange(s) }}>
            <span className={sec.menuIcon} data-on={s === status || undefined}><Icon name={ITEM_STATUS_CHIP[s].icon} size={20} /></span>{s}
          </DropdownItem>
        ))}
      </PortalMenu>
    </>
  )
}
