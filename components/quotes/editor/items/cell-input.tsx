'use client'

import { useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { money2 } from '@/lib/quotes/math'
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

export function TextCell({ value, placeholder, onCommit, kind = 'text', ariaLabel, autoFocus, inputRef }: {
  value: string
  placeholder?: string
  onCommit: (v: string) => void
  kind?: 'text' | 'name' | 'desc'
  ariaLabel: string
  autoFocus?: boolean
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const { cancel, takeCancel } = useCancel()
  const commit = () => { if (!takeCancel() && draft !== null && draft !== value) onCommit(draft); setDraft(null) }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') cancel(e) }
  const shown = draft ?? value
  return (
    /* A name is as wide as its text so the group's cards glyph / a child's eye follow it (1260:31357 · 31395): `field-sizing:
       content` where the browser has it, the `size` attribute as the fallback (the placeholder's length when empty). */
    <input ref={inputRef} className={styles.input} data-edit="" data-name={kind === 'name' || undefined} data-desc={kind === 'desc' || undefined}
           data-col={kind === 'text' ? undefined : kind} data-dirty={draft !== null && draft !== value ? '' : undefined}
           size={kind === 'name' ? Math.max(1, (shown || placeholder || '').length) : undefined}
           value={shown} placeholder={placeholder} aria-label={ariaLabel} autoFocus={autoFocus}
           onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={onKey} />
  )
}

/**
 * Money in cents: shows "S$1,000.00", edits as "1000.00" (junk filtered as typed, REG-150; no sign — a price is never
 * negative). `fit` sizes the box to its figure so a neighbour (the markup's "(x%)") never squeezes it into an ellipsis.
 */
export function MoneyCell({ minor, onCommit, ariaLabel, fit }: { minor: number; onCommit: (minor: number) => void; ariaLabel: string; fit?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null)
  const { cancel, takeCancel } = useCancel()
  const commit = () => {
    if (!takeCancel() && draft !== null) { const n = Math.round(readNumber(draft) * 100); if (Number.isFinite(n) && n >= 0 && n !== minor) onCommit(n) }
    setDraft(null)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') cancel(e) }
  const base = (minor / 100).toFixed(2)
  const shown = draft ?? money2(minor)
  return (
    <input className={styles.input} data-edit="" data-money data-fit={fit || undefined} size={fit ? shown.length + 2 : undefined} inputMode="decimal" aria-label={ariaLabel}
           data-dirty={draft !== null && draft !== base ? '' : undefined}
           value={shown}
           onFocus={() => setDraft(base)}
           onChange={(e) => setDraft(filterNumeric(e.target.value, ','))}
           onBlur={commit} onKeyDown={onKey} />
  )
}

/** A number (qty, %): filtered as typed; `suffix` prints after the value at rest ("10%"). */
export function NumberCell({ value, onCommit, ariaLabel, suffix = '', max = 1_000_000, decimals = 2 }: {
  value: number; onCommit: (v: number) => void; ariaLabel: string; suffix?: string; max?: number; decimals?: number
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const { cancel, takeCancel } = useCancel()
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(decimals).replace(/\.?0+$/, '')
  const commit = () => {
    if (!takeCancel() && draft !== null) { const n = readNumber(draft); if (Number.isFinite(n) && n >= 0 && n <= max && n !== value) onCommit(n) }
    setDraft(null)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') cancel(e) }
  return (
    <input className={styles.input} data-edit="" data-money inputMode="decimal" aria-label={ariaLabel}
           data-dirty={draft !== null && draft !== shown ? '' : undefined}
           value={draft ?? `${shown}${suffix}`}
           onFocus={() => setDraft(shown)}
           onChange={(e) => setDraft(filterNumeric(e.target.value))}
           onBlur={commit} onKeyDown={onKey} />
  )
}
