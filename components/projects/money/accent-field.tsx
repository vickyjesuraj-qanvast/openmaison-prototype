'use client'

import { useState } from 'react'
import { TextField } from '@/components/om/text-field'
import { hexOf, hexTyped } from '@/lib/format'
import styles from './accent-field.module.css'

/**
 * (parity map, FB-101 · FB-103) A colour as the brand kit's Colours card takes one (F121's grammar): the swatch opens the native picker, the
 * hex box beside it takes six digits at once and three when it is left; a half-typed colour keeps its box with its error. Blank is allowed —
 * the field then follows `fallback` (the swatch shows it, dashed) — and clearing the box clears the colour.
 */
export function AccentField({ label, value, fallback, onChange, helper, disabled, testId }: {
  label: string; value: string; fallback: string | null; onChange: (hex: string) => void; helper?: string; disabled?: boolean; testId?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [bad, setBad] = useState(false)
  const swatch = value || fallback || ''
  const take = (h: string) => { onChange(h); setDraft(null); setBad(false) }
  return (
    <div className={styles.colour} data-testid={testId}>
      <label className={styles.swatch} style={swatch ? { background: swatch } : undefined} data-empty={value ? undefined : ''}>
        <input type="color" value={swatch || '#000000'} aria-label={`${label}: pick a colour`} disabled={disabled} onChange={(e) => take(e.target.value.toUpperCase())} />
      </label>
      <div className={styles.colourField}>
        <TextField label={label} value={draft ?? value} maxLength={7} disabled={disabled} helper={helper}
                   error={bad ? 'Six hex digits, like #5500FF' : undefined}
                   onChange={(v) => {
                     const t = hexTyped(v), h = hexOf(t)
                     if (h && t.replace('#', '').length === 6) take(h)   // six digits land at once; three wait for the box to be left
                     else { setDraft(t); if (!t) { onChange(''); setBad(false) } }
                   }}
                   onBlur={() => {
                     if (draft === null) return
                     if (!draft.replace('#', '')) { take(''); return }
                     const h = hexOf(draft)
                     if (h) take(h); else setBad(true)
                   }} />
      </div>
    </div>
  )
}
