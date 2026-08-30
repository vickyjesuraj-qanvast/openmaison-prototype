'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Icon } from './icon'
import { PortalMenu } from './portal-menu'
import { useReadOnly } from './read-only'
import menuStyles from '@/components/leads/menus.module.css'
import styles from './text-field.module.css'
import { digitsOnly, groupDigits } from '@/lib/format'

export type TextFieldProps = {
  label: string
  value: string
  onChange?: (v: string) => void
  /** text = editable input · select = option menu · trigger = read-only button that opens something (a picker). */
  mode?: 'text' | 'select' | 'trigger'
  options?: readonly string[]
  /** Only visible once the label has floated (focus / value) — Material behaviour. */
  placeholder?: string
  /** Default: select → expand_more, otherwise none. Pass null to force none. */
  trailingIcon?: string | null
  /** Custom trailing element (unit switch, clear button). */
  trailing?: ReactNode
  /** Prefix rendered before the value (e.g. +65). The label floats while it is shown. */
  leading?: ReactNode
  helper?: string
  /** A string shows inline; `true` only paints the error state. */
  error?: string | boolean
  disabled?: boolean
  required?: boolean
  /** Host-controlled open state for trigger fields (floats the label, rotates the chevron). */
  open?: boolean
  onOpen?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void
  type?: 'text' | 'email' | 'tel' | 'search'
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel'
  /**
   * Numeric-only field: every keystroke and paste is filtered before it reaches `onChange` —
   * 'digits' keeps 0-9 (phone, area, %), 'amount' keeps digits and groups thousands ("70,500").
   * Junk never shows in the box; validation only has to check emptiness / length.
   */
  numeric?: 'digits' | 'amount'
  maxLength?: number
  autoComplete?: string
  name?: string
  /** The box element, for anchoring pickers / menus. */
  boxRef?: RefObject<HTMLDivElement | null>
  inputRef?: RefObject<HTMLInputElement | null>
  autoFocus?: boolean
  className?: string
}

/**
 * The prototype's one text field (DS Text Field / 48px). Label rests inside the
 * box while empty and floats to the border on focus or when there is a value;
 * error and helper messages render underneath in the DS error/helper styles.
 */
export function TextField({
  label, value, onChange, mode = 'text', options, placeholder, trailingIcon, trailing, leading, helper, error,
  disabled: disabledProp = false, required = false, open: openProp, onOpen, onFocus, onBlur, onKeyDown,
  type = 'text', inputMode, numeric, maxLength, autoComplete, name, boxRef, inputRef, autoFocus, className,
}: TextFieldProps) {
  const id = useId()
  const readOnlyScope = useReadOnly()
  const disabled = disabledProp || readOnlyScope   // a read-only scope (completed stage) renders the DS disabled state
  const [focused, setFocused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const ownBox = useRef<HTMLDivElement | null>(null)
  const anchor = boxRef ?? ownBox
  const controlRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const isSelect = mode === 'select'
  const open = isSelect ? menuOpen : !!openProp
  const floated = focused || open || value !== '' || !!leading
  const message = typeof error === 'string' && error ? error : helper
  const hasError = !!error
  const icon = trailingIcon === undefined ? (isSelect ? 'expand_more' : null) : trailingIcon
  const supportId = `${id}-support`

  const setBox = (el: HTMLDivElement | null) => { ownBox.current = el; if (boxRef) boxRef.current = el }

  // Open menu: focus lands on the current option so arrows / Enter work at once.
  useEffect(() => {
    if (!menuOpen) return
    const list = listRef.current
    ;(list?.querySelector<HTMLElement>('[data-selected]') ?? list?.querySelector<HTMLElement>('[role="option"]'))?.focus()
  }, [menuOpen])
  const closeMenu = () => {
    setMenuOpen(false)
    if (listRef.current?.contains(document.activeElement)) controlRef.current?.focus()   // never strand focus on a removed option
  }
  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    const go = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus() }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(items.length - 1)
    else if (e.key === 'Tab') { setMenuOpen(false); controlRef.current?.focus() }   // Tab then continues from the field
  }

  const activate = () => {
    if (disabled) return
    if (isSelect) setMenuOpen((o) => !o)
    else if (mode === 'trigger') onOpen?.()
  }
  const onControlKey = (e: KeyboardEvent<HTMLElement>) => {
    if (!disabled && mode !== 'text' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') && !(mode === 'trigger' && open && e.key === 'ArrowDown')) {
      e.preventDefault()
      if (isSelect) setMenuOpen(true); else onOpen?.()
      return
    }
    onKeyDown?.(e)
  }

  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}
         data-kind={mode} data-floated={floated || undefined} data-active={(focused || open) || undefined}
         data-error={hasError || undefined} data-disabled={disabled || undefined} data-open={open || undefined}
         data-trail={(icon || trailing) ? '' : undefined}>
      <div ref={setBox} className={styles.box}
           onMouseDown={(e) => { if (mode !== 'text') { e.preventDefault(); (e.currentTarget.querySelector('button') as HTMLButtonElement | null)?.focus(); activate() } }}>
        {leading ? <span className={styles.leading}>{leading}</span> : null}
        {mode === 'text' ? (
          <input
            id={id} ref={inputRef} autoFocus={autoFocus} className={styles.control} name={name}
            value={value} placeholder={placeholder} type={type} inputMode={inputMode ?? (numeric ? 'numeric' : undefined)} maxLength={maxLength} autoComplete={autoComplete}
            disabled={disabled} required={required}
            aria-invalid={hasError || undefined} aria-describedby={message ? supportId : undefined}
            onChange={(e) => onChange?.(numeric === 'amount' ? groupDigits(e.target.value) : numeric === 'digits' ? digitsOnly(e.target.value) : e.target.value)}
            onFocus={() => { setFocused(true); onFocus?.() }}
            onBlur={() => { setFocused(false); onBlur?.() }}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button
            ref={controlRef}
            type="button" id={id} className={styles.control} disabled={disabled}
            role={isSelect ? 'combobox' : undefined} aria-haspopup={isSelect ? 'listbox' : 'dialog'} aria-expanded={open}
            aria-labelledby={`${id}-label`} aria-invalid={hasError || undefined} aria-describedby={message ? supportId : undefined}
            aria-required={required || undefined}
            onFocus={() => { setFocused(true); onFocus?.() }}
            onBlur={(e) => {
              setFocused(false)
              const next = e.relatedTarget as Node | null   // keyboard focus leaving the field closes the menu; option clicks (inside the menu) don't
              if (isSelect && next && !(next instanceof Element && next.closest('[data-om-menu]'))) setMenuOpen(false)
              onBlur?.()
            }}
            onKeyDown={onControlKey}
          >
            {value ? value : floated && placeholder ? <span className={styles.placeholder}>{placeholder}</span> : null}
          </button>
        )}
        <label id={`${id}-label`} htmlFor={mode === 'text' ? id : undefined} className={styles.label}>{label}</label>
        {trailing ? <span className={styles.trailSlot}>{trailing}</span> : null}
        {icon ? <span className={styles.trail} aria-hidden><Icon name={icon} size={16} /></span> : null}
      </div>
      {message ? <span id={supportId} className={styles.support} role={hasError ? 'alert' : undefined}>{message}</span> : null}
      {isSelect && options ? (
        <PortalMenu open={menuOpen} anchor={anchor} onClose={closeMenu}>
          <div ref={listRef} onKeyDown={onListKey}>
            {options.map((o) => (
              <button key={o} type="button" role="option" aria-selected={o === value} className={menuStyles.item}
                      data-selected={o === value || undefined}
                      onClick={() => { onChange?.(o); setMenuOpen(false); controlRef.current?.focus() }}>
                {o}
              </button>
            ))}
          </div>
        </PortalMenu>
      ) : null}
    </div>
  )
}
