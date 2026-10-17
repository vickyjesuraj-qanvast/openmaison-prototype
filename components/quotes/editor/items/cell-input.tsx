'use client'

import { useId, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type RefObject } from 'react'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { money2 } from '@/lib/quotes/math'
import { cleanLink, shortLink } from '@/lib/quotes/items-model'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { filterNumeric, readNumber } from '@/lib/quotes/arith'
import styles from './items-table.module.css'

/**
 * A table cell that edits in place (1271:40867 "Active Cells"): plain text at rest, the DS box while its row is active.
 * The value is committed on blur and the draft dropped on Escape; the parent decides what a change means. Enter, Tab and
 * the arrows belong to the table's grid (grid-keys.ts, REG-475): moving the focus on is what commits. `data-col` names the
 * column a vertical move keeps; `data-dirty` says the box holds typing the browser's own undo should take (Cmd+Z, REG-475).
 * A number box also takes a sum — "=12*3.5", "=1200/4" — worked out on commit (lib/quotes/arith.ts, REG-477).
 *
 * Escape (REG-417): `blur()` fires onBlur synchronously, before React commits the cleared draft, so the commit closure
 * still holds the typed text — a `cancelled` ref is read live and makes that commit a no-op.
 */
function useCancel() {
  const cancelled = useRef(false)
  const cancel = (e: KeyboardEvent<HTMLInputElement>) => { e.preventDefault(); cancelled.current = true; e.currentTarget.blur() }
  const takeCancel = () => { const c = cancelled.current; cancelled.current = false; return c }
  return { cancel, takeCancel }
}

/**
 * (Dane UAT, Figma Fix 1 1490:5390 — g-zero) A number box a press lands in selects its value, as a cell reached by key does (grid-keys.ts):
 * "0.00" was a caret inside the figure and took a double-click and a delete before anything could be typed. The selection is made once the
 * box shows its edit text (a frame after focus) and held through the press's own mouseup, which would otherwise drop the caret where the
 * pointer let go. A second press in a box that already has the focus places the caret as usual, so part of a figure can still be edited.
 */
function useSelectOnPress() {
  const pressed = useRef(false)
  const select = (el: HTMLInputElement) => { if (document.activeElement === el) el.select() }
  return {
    onMouseDown: (e: MouseEvent<HTMLInputElement>) => { pressed.current = document.activeElement !== e.currentTarget },
    onFocused: (e: FocusEvent<HTMLInputElement>) => { const el = e.currentTarget; requestAnimationFrame(() => select(el)) },
    onMouseUp: (e: MouseEvent<HTMLInputElement>) => { if (!pressed.current) return; pressed.current = false; e.preventDefault(); select(e.currentTarget) },
  }
}

/** (S44I — row 290) Words a box offers as it is typed in — a section's name offers the studio's trades. */
export type Suggest = { title: string; help?: string; options: (typed: string) => string[]; onPick: (v: string) => void }

export function TextCell({ value, placeholder, onCommit, kind = 'text', ariaLabel, autoFocus, inputRef, onEscape, suggest }: {
  value: string
  placeholder?: string
  onCommit: (v: string) => void
  kind?: 'text' | 'name' | 'desc'
  ariaLabel: string
  autoFocus?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
  /** (S44I, B10) Esc on a line an add press just made: the box's words go to the caller (they are kept), instead of being dropped (REG-417) */
  onEscape?: (v: string) => void
  /** (S44I — row 290) a list under the box while it is typed in: ↓ ↑ walk it, Enter takes the one lit (the caret stays in the box) */
  suggest?: Suggest
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const [shut, setShut] = useState(false)
  /* the list waits for the box to stop moving: a new section's name takes the caret while it is scrolled into view (REG-573), and a menu
     open during that scroll closed itself at once (PortalMenu's scroll rule) */
  const [ready, setReady] = useState(false)
  const still = useRef<number | null>(null)
  const waitStill = (el: HTMLInputElement) => {
    let last = el.getBoundingClientRect().top, tries = 0
    const check = () => { const now = el.getBoundingClientRect().top; if (Math.abs(now - last) < 0.5 || ++tries > 20) { still.current = null; setReady(true); return } last = now; still.current = window.setTimeout(check, 90) }
    if (still.current) window.clearTimeout(still.current)
    still.current = window.setTimeout(check, 90)
  }
  const { cancel, takeCancel } = useCancel()
  const wrap = useRef<HTMLSpanElement>(null)
  const listId = useId()
  const commit = () => { if (!takeCancel() && draft !== null && draft !== value) onCommit(draft); setDraft(null) }
  const shown = draft ?? value
  const options = suggest && focused && !shut ? suggest.options(draft ?? '') : []
  const listOpen = options.length > 0 && (ready || draft !== null)
  const pick = (v: string) => { setDraft(null); setActive(-1); setShut(true); suggest?.onPick(v) }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (listOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); e.stopPropagation(); setActive((a) => (a < 0 ? (e.key === 'ArrowDown' ? 0 : options.length - 1) : (a + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)); return }
    if (listOpen && e.key === 'Enter' && active >= 0 && options[active]) { e.preventDefault(); e.stopPropagation(); pick(options[active]!); return }
    if (listOpen && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShut(true); setActive(-1); return }
    if (e.key === 'Escape' && onEscape) { e.preventDefault(); e.stopPropagation(); onEscape(e.currentTarget.value); return }
    if (e.key === 'Escape') cancel(e)
  }
  const input = (
    /* A name is as wide as its text so the group's cards glyph / a child's eye follow it (1260:31357 · 31395): `field-sizing:
       content` where the browser has it, the `size` attribute as the fallback (the placeholder's length when empty). */
    <input ref={inputRef} className={styles.input} data-edit="" data-name={kind === 'name' || undefined} data-desc={kind === 'desc' || undefined}
           data-col={kind === 'text' ? undefined : kind} data-dirty={draft !== null && draft !== value ? '' : undefined}
           size={kind === 'name' ? Math.max(1, (shown || placeholder || '').length) : undefined}
           value={shown} placeholder={placeholder} aria-label={ariaLabel} autoFocus={autoFocus}
           {...(suggest ? { role: 'combobox', 'aria-expanded': listOpen, 'aria-controls': listOpen ? listId : undefined, 'aria-autocomplete': 'list' as const, 'aria-activedescendant': listOpen && active >= 0 ? `${listId}-${active}` : undefined } : {})}
           onFocus={suggest ? (e) => { setFocused(true); setShut(false); setReady(false); waitStill(e.currentTarget) } : undefined}
           onChange={(e) => { setDraft(e.target.value); setActive(-1); setShut(false) }} onBlur={() => { setFocused(false); setActive(-1); if (still.current) { window.clearTimeout(still.current); still.current = null } commit() }} onKeyDown={onKey} />
  )
  if (!suggest) return input
  return (
    <span ref={wrap} className={styles.suggestWrap}>
      {input}
      <PortalMenu open={listOpen} anchor={wrap} onClose={() => setShut(true)} role="listbox" width={MENU_WIDTH.wide} id={listId} autoFocus={false}>
        <div data-testid="name-suggest">
          <DropdownLabel>{suggest.title}</DropdownLabel>
          {options.map((o, i) => (
            <button key={o} id={`${listId}-${i}`} type="button" role="option" aria-selected={i === active} data-active={i === active || undefined} className={styles.suggestRow}
                    onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)}>
              <span>{o}</span>{suggest.help ? <span className={styles.suggestHelp}>{suggest.help}</span> : null}
            </button>
          ))}
        </div>
      </PortalMenu>
    </span>
  )
}

/**
 * Money in cents: shows "S$1,000.00", edits as "1000.00" (junk filtered as typed, REG-150; no sign — a price is never
 * negative). `fit` sizes the box to its figure so a neighbour (the markup's "(x%)") never squeezes it into an ellipsis.
 */
export function MoneyCell({ minor, onCommit, ariaLabel, fit, signed = false }: { minor: number; onCommit: (minor: number) => void; ariaLabel: string; fit?: boolean; /** (sweep S1) a markup may be below zero — a line sold under its cost keeps its minus while typed */ signed?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null)
  const { cancel, takeCancel } = useCancel()
  const commit = () => {
    if (!takeCancel() && draft !== null) { const n = Math.round(readNumber(draft) * 100); if (Number.isFinite(n) && (signed || n >= 0) && n !== minor) onCommit(n) }
    setDraft(null)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') cancel(e) }
  const base = (minor / 100).toFixed(2)
  const shown = draft ?? money2(minor)
  const press = useSelectOnPress()
  return (
    <input className={styles.input} data-edit="" data-money data-fit={fit || undefined} size={fit ? shown.length + 2 : undefined} inputMode="decimal" aria-label={ariaLabel}
           data-dirty={draft !== null && draft !== base ? '' : undefined}
           value={shown}
           onMouseDown={press.onMouseDown} onMouseUp={press.onMouseUp}
           onFocus={(e) => { setDraft(base); press.onFocused(e) }}
           onChange={(e) => { const v = e.target.value; setDraft(signed && /^\s*[-−–]/.test(v) && !v.trimStart().startsWith('=') ? `-${filterNumeric(v, ',')}` : filterNumeric(v, ',')) }}
           onBlur={commit} onKeyDown={onKey} />
  )
}

/** A number (qty, %): filtered as typed; `suffix` prints after the value at rest ("10%"). */
export function NumberCell({ value, onCommit, ariaLabel, suffix = '', max = 1_000_000, decimals = 2, signed = false }: {
  value: number; onCommit: (v: number) => void; ariaLabel: string; suffix?: string; max?: number; decimals?: number
  /** (Projects round 5) A variation order's quantity may be below zero — an omission keeps its minus while typed. */
  signed?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const { cancel, takeCancel } = useCancel()
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(decimals).replace(/\.?0+$/, '')
  const commit = () => {
    if (!takeCancel() && draft !== null) { const n = readNumber(draft); if (Number.isFinite(n) && (signed ? n >= -max : n >= 0) && n <= max && n !== value) onCommit(n) }
    setDraft(null)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') cancel(e) }
  const press = useSelectOnPress()
  return (
    <input className={styles.input} data-edit="" data-money inputMode={signed ? 'text' : 'decimal'} aria-label={ariaLabel}
           data-dirty={draft !== null && draft !== shown ? '' : undefined}
           value={draft ?? `${shown}${suffix}`}
           onMouseDown={press.onMouseDown} onMouseUp={press.onMouseUp}
           onFocus={(e) => { setDraft(shown); press.onFocused(e) }}
           onChange={(e) => { const v = e.target.value; setDraft(signed && /^\s*[-−–]/.test(v) ? `-${filterNumeric(v)}` : filterNumeric(v)) }}
           onBlur={commit} onKeyDown={onKey} />
  )
}

/**
 * (REG-623, parity Q-09) A product or spec link — 1.0's "Spec Sheet / Product Link", never printed. At rest the cell shows the short
 * address ("ikea.com/sg/…") and an Open button; in the box it edits the whole link. A bare address takes https:// in front; text that
 * is not a web address is refused on commit (`onInvalid` says why) and the stored link stays.
 */
export function LinkCell({ value, onCommit, onInvalid, ariaLabel, placeholder }: { value: string | null; onCommit: (v: string | null) => void; onInvalid: () => void; ariaLabel: string; placeholder: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const { cancel, takeCancel } = useCancel()
  const commit = () => {
    if (!takeCancel() && draft !== null && draft.trim() !== (value ?? '')) {
      const u = cleanLink(draft)
      if (u === undefined) onInvalid()
      else if (u !== value) onCommit(u)
    }
    setDraft(null)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') cancel(e) }
  return (
    <span className={styles.linkCell}>
      <input className={styles.input} data-edit="" data-link={value ? '' : undefined} data-dirty={draft !== null && draft !== (value ?? '') ? '' : undefined}
             value={draft ?? shortLink(value)} placeholder={placeholder} aria-label={ariaLabel} inputMode="url" spellCheck={false}
             onFocus={() => setDraft(value ?? '')} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={onKey} />
      {value && draft === null ? (
        <Tooltip label="Open the link">
          <a className={styles.linkOpen} href={value} target="_blank" rel="noopener noreferrer" aria-label={`Open ${shortLink(value)}`}><Icon name="open_in_new" size={16} /></a>
        </Tooltip>
      ) : null}
    </span>
  )
}
