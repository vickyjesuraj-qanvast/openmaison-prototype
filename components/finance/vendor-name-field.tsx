'use client'

import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { TextField } from '@/components/om/text-field'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { findVendor, vendorMatches, type VendorName } from '@/lib/finance/model'

/**
 * (one-home N-16) A vendor named in words — the Price book item's Vendor — picked from Company › Finance › Vendors: the house text field with
 * the directory under it as you type (type-ahead over names and trades, every vendor while the box is empty or holds a picked one), and, for a
 * name the directory doesn't hold, F1's *Add {name} as a vendor* (F1-Q4: anyone adds one — the vendor's own dialog fills in the rest later). A
 * name the directory refuses, or one never added, is kept as typed. ↓ steps into the list, Esc closes it, the field keeps the focus.
 */
export function VendorNameField({ label = 'Vendor', value, onChange, directory, onAdd, helper, maxLength = 80, testId = 'vendor-name-field', autoFocus, disabled = false }: {
  label?: string
  value: string
  onChange: (v: string) => void
  /** the directory (useVendorDirectory) — null while it loads: the field still takes a name as typed */
  directory: VendorName[] | null
  onAdd: (name: string) => Promise<{ vendor: VendorName } | { error: string }>
  helper?: string
  maxLength?: number
  testId?: string
  /** (pending modules S12) the caret goes in on opening — the bulk Set vendor's one field */ autoFocus?: boolean
  /** (pending modules S12) the box rests (the bulk dialog's "Clear the vendor instead") — its list stays shut */ disabled?: boolean
}) {
  const snackbar = useSnackbar()
  const listId = useId()
  const anchor = useRef<HTMLDivElement | null>(null)   // the field's box — the list opens under it, above the helper line
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  /* (pending modules S12) a caret placed on opening (the bulk Set vendor) leaves the list shut until the member types or presses — it covered
     the dialog's "Clear the vendor instead" the moment it opened */
  const quietFocus = useRef(!!autoFocus)
  const list = directory ?? []
  const typed = value.trim()
  /* a picked vendor shows the whole list again (its row marked); anything else narrows it */
  const picked = list.find((v) => v.name === typed) ?? null
  const known = findVendor(list, typed)
  const matches = vendorMatches(list, picked ? '' : typed)
  const shown = known && !matches.some((v) => v.id === known.id) ? [known, ...matches] : matches
  const canAdd = directory !== null && !!typed && !known
  const showing = open && !disabled && (shown.length > 0 || canAdd)
  const pick = (v: VendorName) => { onChange(v.name); setOpen(false) }
  const add = async () => {
    if (busy || !typed) return
    setBusy(true)
    try {
      const r = await onAdd(typed)
      if ('error' in r) { snackbar({ message: couldnt('add the vendor', refusalOf(r.error)) }); return }   // the name stays as typed
      onChange(r.vendor.name); setOpen(false); inputRef.current?.focus()
      snackbar({ message: `${r.vendor.name} is in the directory` })
    } catch (e) { snackbar({ message: couldnt('add the vendor', refusalOf(e)) }) } finally { setBusy(false) }
  }
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown') return
    e.preventDefault()
    setOpen(true)
    requestAnimationFrame(() => document.getElementById(listId)?.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')?.focus())
  }
  /* focus leaving the field closes the list — unless it went into the list (a row taken by the keyboard) */
  const onBlur = (e: FocusEvent<HTMLInputElement>) => { const t = e.relatedTarget; if (!(t instanceof Element && t.closest('[data-om-menu]'))) setOpen(false) }
  return (
    <div data-testid={testId}>
      <TextField label={label} value={value} onChange={(v) => { onChange(v); setOpen(true) }} maxLength={maxLength} helper={helper} boxRef={anchor} inputRef={inputRef} onKeyDown={onKey} autoFocus={autoFocus} disabled={disabled}
                 inputProps={{ role: 'combobox', 'aria-expanded': showing, 'aria-controls': showing ? listId : undefined, 'aria-autocomplete': 'list', autoComplete: 'off', onFocus: () => { if (quietFocus.current) { quietFocus.current = false; return } setOpen(true) }, onClick: () => setOpen(true), onBlur }} />
      <PortalMenu open={showing} anchor={anchor} onClose={() => setOpen(false)} role="menu" id={listId}>
        {/* a press keeps the caret in the field (a row's click still lands) */}
        <div onMouseDown={(e) => e.preventDefault()} data-testid={`${testId}-list`}>
          {shown.map((v) => (
            <DropdownItem key={v.id} role="menuitemradio" checked={known?.id === v.id} meta={v.trade ?? undefined} onSelect={() => { pick(v); inputRef.current?.focus() }}>{v.name}</DropdownItem>
          ))}
          {canAdd ? (
            <>
              {shown.length ? <DropdownDivider /> : null}
              <DropdownItem disabled={busy} onSelect={() => { void add() }}><Icon name="add" size={20} />{`Add ${typed} as a vendor`}</DropdownItem>
            </>
          ) : null}
        </div>
      </PortalMenu>
    </div>
  )
}
