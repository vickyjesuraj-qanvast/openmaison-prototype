'use client'

import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { SearchBar } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { findVendor, vendorMatches, type VendorName } from '@/lib/finance/model'
import field from '@/components/om/text-field.module.css'
import styles from './items-section.module.css'

/** (one-home N-16) Company › Finance › Vendors for the Items table — items-section loads the directory once (useVendorDirectory) and every
    row's Vendor/Sub reads it here. null while it loads. */
export const VendorDirectoryContext = createContext<VendorName[] | null>(null)

/**
 * (one-home N-16) The Vendor/Sub cell's menu (REG-623's cell): the vendor directory, with the searchable list's search box at its head (Dane UAT
 * 6.41's — type-ahead over names and trades). A name the directory doesn't hold — typed, or the line's own kept as typed — offers F1's *Add
 * {name} as a vendor* (F1-Q4: anyone adds a vendor); with nothing typed, *Add vendor* names one in the house name dialog. Clear empties the cell.
 * ↓ from the box steps into the rows, Enter takes the first match (or adds what is typed), Esc closes.
 */
export function VendorMenu({ open, anchor, value, onClose, onPick, onAdd, onAddNamed }: {
  open: boolean; anchor: RefObject<HTMLElement | null>; value: string | null; onClose: () => void; onPick: (v: string | null) => void
  /** *Add vendor* — the name dialog */ onAdd: () => void
  /** *Add {name} as a vendor* — that name, into the directory, onto the line */ onAddNamed: (name: string) => void
}) {
  const directory = useContext(VendorDirectoryContext)
  const list = directory ?? []
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setQuery('') }   // every opening starts with an empty box (render-phase adjust)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const r = requestAnimationFrame(() => box.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(r)
  }, [open])
  const typed = query.trim()
  const current = findVendor(list, value)
  const matches = vendorMatches(list, typed)
  /* the line's own name when the directory doesn't hold it — shown, marked, while it fits what is typed */
  const ownName = value && !current && (!typed || value.toLowerCase().includes(typed.toLowerCase())) ? value : null
  const addName = typed || ownName || ''
  const canAdd = directory !== null && !!addName && !findVendor(list, addName)
  const take = (v: string | null) => { onClose(); onPick(v) }
  const addTyped = () => { onClose(); onAddNamed(addName) }
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); box.current?.parentElement?.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')?.focus(); return }
    if (e.key === 'Home' || e.key === 'End') e.nativeEvent.stopImmediatePropagation()   // the caret's, not the menu's walk
  }
  const submit = () => { const first = matches[0]; if (typed && first) take(first.name); else if (typed && canAdd) addTyped() }
  return (
    <PortalMenu open={open} anchor={anchor} onClose={onClose} role="menu" width={MENU_WIDTH.detail} sheetTitle="Vendor/Sub" autoFocus={false}>
      <div ref={box} className={field.menuSearch}>
        <SearchBar size="md" appearance="filled" placeholder="Search" aria-label="Search vendors" value={query} onChange={setQuery} onKeyDown={onSearchKey} onSubmit={submit} />
      </div>
      {ownName ? <DropdownItem role="menuitemradio" checked onSelect={() => take(ownName)}>{ownName}</DropdownItem> : null}
      {matches.map((v) => <DropdownItem key={v.id} role="menuitemradio" checked={current?.id === v.id} meta={v.trade ?? undefined} onSelect={() => take(v.name)}>{v.name}</DropdownItem>)}
      {ownName || matches.length ? <DropdownDivider /> : null}
      {canAdd
        ? <DropdownItem onSelect={addTyped}><span className={styles.menuIcon}><Icon name="add" size={20} /></span>{`Add ${addName} as a vendor`}</DropdownItem>
        : <DropdownItem onSelect={() => { onClose(); onAdd() }}><span className={styles.menuIcon}><Icon name="add" size={20} /></span>Add vendor</DropdownItem>}
      {value ? <DropdownItem onSelect={() => take(null)}>Clear</DropdownItem> : null}
    </PortalMenu>
  )
}
