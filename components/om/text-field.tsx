'use client'

import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { SearchBar } from '@/components/ds'
import { Icon } from './icon'
import { PortalMenu } from './portal-menu'
import { useReadOnly } from './read-only'
import menuStyles from '@/components/leads/menus.module.css'
import styles from './text-field.module.css'
import { digitsOnly, groupDigits, decimalTyped, moneyTyped } from '@/lib/format'

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
  /**
   * Content rendered INSIDE the box, on its own row under the control — picked chips and the like. The box then
   * grows downwards instead of holding 48px, and the label floats, because a box with content is never empty.
   * Callers that pass nothing keep exactly today's markup.
   */
  below?: ReactNode
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
  /** digits · whole dollars grouped ("70,500") · (REG-651) money — dollars and cents · decimal — up to three places (a quantity, a rate). */
  numeric?: 'digits' | 'amount' | 'money' | 'decimal'
  maxLength?: number
  autoComplete?: string
  name?: string
  /** The box element, for anchoring pickers / menus. */
  boxRef?: RefObject<HTMLDivElement | null>
  inputRef?: RefObject<HTMLInputElement | null>
  autoFocus?: boolean
  className?: string
  /** m = the DS 48px field (default) · s = the 36px field the quote editor's table draws (spec 03: "TextField 36 'Add Item'", "Issuing Entity select 36"). */
  size?: 'm' | 's'
  /** Extra attributes for the text input — a combobox's role / aria-* (REG-417). Explicit props win over these. */
  inputProps?: InputHTMLAttributes<HTMLInputElement>
  /** (Dane UAT 6.41) A select whose list is long (the studio's clients): a search box heads the open list and narrows it to the options that
   *  hold the typed words anywhere, any case — ↓ into the list, ↑ from its top back to the box, Enter takes the first match, Esc closes,
   *  "No matches" when none do. A letter typed on the closed field opens the list with it in the box. */
  searchable?: boolean
  /** (fix-C, C-30) A text field that takes a few lines and keeps their breaks — a textarea with this many rows, the box growing with it;
   *  the label, states and messages are the field's own. Text mode only, never with `below`. */
  multiline?: number
  /** (S44P — her UAT ask 2026-10-15, row 319) A select's last row, under a rule: an action that makes a new option ("New category…") — it
   *  opens what makes it, the field keeps its value until the caller picks the new one. `help` is its second line — the rule, when the
   *  viewer may not (the row then reads disabled and says why, REG-728). */
  action?: { label: string; onSelect: () => void; disabled?: boolean; help?: string; testId?: string }
}

/**
 * The prototype's one text field (DS Text Field / 48px). Label rests inside the
 * box while empty and floats to the border on focus or when there is a value;
 * error and helper messages render underneath in the DS error/helper styles.
 */
export function TextField({
  label, value, onChange, mode = 'text', options, placeholder, trailingIcon, trailing, leading, below, helper, error,
  disabled: disabledProp = false, required = false, open: openProp, onOpen, onFocus, onBlur, onKeyDown,
  type = 'text', inputMode, numeric, maxLength, autoComplete, name, boxRef, inputRef, autoFocus, className, size = 'm', inputProps, searchable = false, multiline, action,
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
  const floated = focused || open || value !== '' || !!leading || !!below
  const message = typeof error === 'string' && error ? error : helper
  const hasError = !!error
  const icon = trailingIcon === undefined ? (isSelect ? 'expand_more' : null) : trailingIcon
  const supportId = `${id}-support`

  const setBox = (el: HTMLDivElement | null) => { ownBox.current = el; if (boxRef) boxRef.current = el }

  /* (Dane UAT 6.41) The searchable list's words: every opening starts with an empty box (or the letter that opened it). */
  const [query, setQuery] = useState('')
  const openMenu = (seed = '') => { setQuery(seed); setMenuOpen(true) }
  const searchBox = () => listRef.current?.querySelector<HTMLInputElement>('input') ?? null
  const focusSearch = () => { const i = searchBox(); if (i) { i.focus({ preventScroll: true }); const L = i.value.length; i.setSelectionRange(L, L) } }
  const q = query.trim().toLowerCase()
  const shownOptions = options ? (searchable && q ? options.filter((o) => o.toLowerCase().includes(q)) : options) : undefined
  // Open menu: focus lands on the current option so arrows / Enter work at once — or, searchable, in the search box with the caret at its end.
  useEffect(() => {
    if (!menuOpen) return
    const list = listRef.current
    if (searchable) { const i = list?.querySelector<HTMLInputElement>('input'); if (i) { i.focus({ preventScroll: true }); const L = i.value.length; i.setSelectionRange(L, L) } return }
    ;(list?.querySelector<HTMLElement>('[data-selected]') ?? list?.querySelector<HTMLElement>('[role="option"]'))?.focus()
  }, [menuOpen, searchable])
  const closeMenu = () => {
    setMenuOpen(false)
    if (listRef.current?.contains(document.activeElement)) controlRef.current?.focus()   // never strand focus on a removed option
  }
  const pickOption = (o: string) => { onChange?.(o); setMenuOpen(false); controlRef.current?.focus() }
  /* The search box's keys (React Aria hands them here and stops them at the box): ↓ steps into the list; Home / End stay the caret's —
     the menu's own walk (useMenuKeyboard) would otherwise take them to the first and last option. Enter is the field's submit (below). */
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); listRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus(); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); return }   // the box is the list's top: nothing above it to walk to
    if (e.key === 'Home' || e.key === 'End') e.nativeEvent.stopImmediatePropagation()
  }
  /* (REG-639) Type to find: letters typed in quick succession move to the first option that starts with them, as a native
     list does — the lead lists run to dozens of names (X-Ray parity Q-11, 1.0's searchable picker). */
  const typed = useRef({ text: '', at: 0 })
  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    const go = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus() }
    if (searchable && i >= 0) {
      /* (Dane UAT 6.41) On an option: a letter or Backspace goes on in the search box; ↑ from the first option returns to it. */
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setQuery((v) => v + e.key); requestAnimationFrame(focusSearch); return }
      if (e.key === 'Backspace') { e.preventDefault(); setQuery((v) => v.slice(0, -1)); requestAnimationFrame(focusSearch); return }
      if (e.key === 'ArrowUp' && i === 0) { e.preventDefault(); focusSearch(); return }
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key !== ' ' || typed.current.text !== '')) {
      const now = e.timeStamp
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now }
      const hit = items.find((el) => !el.hasAttribute('data-action') && (el.textContent ?? '').trim().toLowerCase().startsWith(typed.current.text))   // (S44P) the foot's action is no option to find by its letters
      if (hit) { e.preventDefault(); hit.focus() }
      return
    }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(items.length - 1)
    else if (e.key === 'Tab') { setMenuOpen(false); controlRef.current?.focus() }   // Tab then continues from the field
  }

  const activate = () => {
    if (disabled) return
    if (isSelect) { if (menuOpen) setMenuOpen(false); else openMenu() }
    else if (mode === 'trigger') onOpen?.()
  }
  const onControlKey = (e: KeyboardEvent<HTMLElement>) => {
    if (!disabled && mode !== 'text' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') && !(mode === 'trigger' && open && e.key === 'ArrowDown')) {
      e.preventDefault()
      if (isSelect) openMenu(); else onOpen?.()
      return
    }
    /* (Dane UAT 6.41) A letter on the closed searchable field opens its list with that letter in the search box. */
    if (!disabled && isSelect && searchable && !menuOpen && e.key.length === 1 && e.key !== ' ' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault(); openMenu(e.key); return
    }
    onKeyDown?.(e)
  }

  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}
         data-kind={mode} data-size={size === 's' ? 's' : undefined} data-floated={floated || undefined} data-active={(focused || open) || undefined}
         data-error={hasError || undefined} data-disabled={disabled || undefined} data-open={open || undefined}
         data-trail={(icon || trailing) ? '' : undefined} data-below={below ? '' : undefined} data-multiline={multiline && mode === 'text' && !below ? '' : undefined}>
      <div ref={setBox} className={styles.box}
           onMouseDown={(e) => { if (mode !== 'text') { e.preventDefault(); (e.currentTarget.querySelector('button') as HTMLButtonElement | null)?.focus(); activate() } }}>
        {/* The control row. It only gets a wrapper when `below` is in play — otherwise the DOM is exactly as it was. */}
        {below ? <div className={styles.row}>
        {leading ? <span className={styles.leading}>{leading}</span> : null}
        {mode === 'text' ? (
          <input
            {...inputProps}
            id={id} ref={inputRef} autoFocus={autoFocus} className={styles.control} name={name}
            value={value} placeholder={placeholder} type={type} inputMode={inputMode ?? (numeric === 'money' || numeric === 'decimal' ? 'decimal' : numeric ? 'numeric' : undefined)} maxLength={maxLength} autoComplete={autoComplete}
            disabled={disabled} required={required}
            aria-invalid={hasError || undefined} aria-describedby={message ? supportId : undefined}
            onChange={(e) => onChange?.(numeric === 'amount' ? groupDigits(e.target.value) : numeric === 'digits' ? digitsOnly(e.target.value) : numeric === 'money' ? moneyTyped(e.target.value) : numeric === 'decimal' ? decimalTyped(e.target.value) : e.target.value)}
            onFocus={(e) => { setFocused(true); onFocus?.(); inputProps?.onFocus?.(e) }}
            onBlur={(e) => { setFocused(false); onBlur?.(); inputProps?.onBlur?.(e) }}
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
        {trailing ? <span className={styles.trailSlot}>{trailing}</span> : null}
        {icon ? <span className={styles.trail} aria-hidden><Icon name={icon} size={16} /></span> : null}
        </div> : (<>
        {leading ? <span className={styles.leading}>{leading}</span> : null}
        {mode === 'text' && multiline ? (
          /* (fix-C, C-30) a few lines, their breaks kept */
          <textarea
            id={id} autoFocus={autoFocus} className={styles.control} name={name} rows={multiline}
            value={value} placeholder={placeholder} maxLength={maxLength} disabled={disabled} required={required}
            aria-invalid={hasError || undefined} aria-describedby={message ? supportId : undefined}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => { setFocused(true); onFocus?.() }}
            onBlur={() => { setFocused(false); onBlur?.() }}
            onKeyDown={onKeyDown}
          />
        ) : mode === 'text' ? (
          <input
            {...inputProps}
            id={id} ref={inputRef} autoFocus={autoFocus} className={styles.control} name={name}
            value={value} placeholder={placeholder} type={type} inputMode={inputMode ?? (numeric === 'money' || numeric === 'decimal' ? 'decimal' : numeric ? 'numeric' : undefined)} maxLength={maxLength} autoComplete={autoComplete}
            disabled={disabled} required={required}
            aria-invalid={hasError || undefined} aria-describedby={message ? supportId : undefined}
            onChange={(e) => onChange?.(numeric === 'amount' ? groupDigits(e.target.value) : numeric === 'digits' ? digitsOnly(e.target.value) : numeric === 'money' ? moneyTyped(e.target.value) : numeric === 'decimal' ? decimalTyped(e.target.value) : e.target.value)}
            onFocus={(e) => { setFocused(true); onFocus?.(); inputProps?.onFocus?.(e) }}
            onBlur={(e) => { setFocused(false); onBlur?.(); inputProps?.onBlur?.(e) }}
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
        {trailing ? <span className={styles.trailSlot}>{trailing}</span> : null}
        {icon ? <span className={styles.trail} aria-hidden><Icon name={icon} size={16} /></span> : null}
        </>)}
        {/* A required field's label carries the mock's asterisk ("Designer Name*", 1239:31250; "Title*", 1238:33173) — one convention for every form. */}
        <label id={`${id}-label`} htmlFor={mode === 'text' ? id : undefined} className={styles.label}>{required ? `${label}*` : label}</label>
        {below ? <div className={styles.below}>{below}</div> : null}
      </div>
      {message ? <span id={supportId} className={styles.support} role={hasError ? 'alert' : undefined}>{message}</span> : null}
      {isSelect && shownOptions ? (
        <PortalMenu open={menuOpen} anchor={anchor} onClose={closeMenu} autoFocus={!searchable}>
          <div ref={listRef} onKeyDown={onListKey}>
            {searchable ? (
              /* (Dane UAT 6.41) The DS search bar heads the list and stays put while the options scroll under it. */
              <div className={styles.menuSearch}>
                <SearchBar size="md" appearance="filled" placeholder="Search" aria-label={`Search ${label}`} value={query} onChange={setQuery}
                           onKeyDown={onSearchKey} onSubmit={() => { const first = shownOptions[0]; if (q && first !== undefined) pickOption(first) }} />
              </div>
            ) : null}
            {shownOptions.map((o) => (
              <button key={o} type="button" role="option" aria-selected={o === value} className={menuStyles.item}
                      data-selected={o === value || undefined}
                      onClick={() => pickOption(o)}>
                {o}
              </button>
            ))}
            {searchable && shownOptions.length === 0 ? <div className={`${menuStyles.item} ${styles.noMatches}`} role="status">No matches</div> : null}
            {action ? (
              /* (S44P, row 319) the list's own action at its foot — walked by the arrows as the options are; picking it closes the list on
                 the field (focus comes back there when what it opens closes) and hands over */
              <>
                <div className={menuStyles.divider} role="separator" />
                <button type="button" role="option" aria-selected={false} aria-disabled={action.disabled || undefined} className={menuStyles.item} data-action="" data-testid={action.testId}
                        onClick={action.disabled ? undefined : () => { setMenuOpen(false); controlRef.current?.focus(); action.onSelect() }}>
                  <span className={menuStyles.itemStack}>
                    <span className={menuStyles.itemLabel}><Icon name="add" size={20} />{action.label}</span>
                    {action.help ? <span className={menuStyles.itemHelp}>{action.help}</span> : null}
                  </span>
                </button>
              </>
            ) : null}
          </div>
        </PortalMenu>
      ) : null}
    </div>
  )
}
