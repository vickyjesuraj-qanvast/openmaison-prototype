'use client'

import { useRef, type ClipboardEvent, type KeyboardEvent, type RefObject } from 'react'
import { digitsOnly } from '@/lib/format'
import styles from './code-boxes.module.css'

/** Six empty boxes — a code's starting value. */
export const emptyCode = (n = 6): string[] => Array.from({ length: n }, () => '')

/**
 * (pending modules S30 — the client portal's code step, Projects round 4a board 5, made the house piece) A one-time code typed into its boxes:
 * a digit moves on to the next box, Backspace on an empty box goes back, ← → walk, a paste (or the phone's autofill) fills from where it lands,
 * Enter submits. One fieldset with its legend, each box named "Digit n". The client portal's sign-in, the studio's sign-in, the invitation's
 * page and Your profile's number check all type their codes here. The focus ring wears the page's primary (a portal's, its studio's colour).
 */
export function CodeBoxes({ value, onChange, onEnter, invalid = false, label = 'Your code', testId, firstRef }: {
  value: string[]; onChange: (next: string[]) => void; onEnter?: () => void; invalid?: boolean; label?: string
  /** each box's test id (the portal's probes read `portal-digit`) */ testId?: string
  /** the first box — for a page that focuses it once it can take the focus */ firstRef?: RefObject<HTMLInputElement | null>
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const n = value.length
  const fill = (from: number, d: string) => {
    onChange(value.map((x, j) => (j >= from && j - from < d.length ? d[j - from]! : x)))
    boxes.current[Math.min(n - 1, from + d.length)]?.focus()
  }
  const put = (i: number, raw: string) => {
    const d = digitsOnly(raw)
    if (d.length > 1) { fill(i, d.slice(0, n - i)); return }
    onChange(value.map((x, j) => (j === i ? d : x)))
    if (d && i < n - 1) boxes.current[i + 1]?.focus()
  }
  const key = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) { e.preventDefault(); onChange(value.map((x, j) => (j === i - 1 ? '' : x))); boxes.current[i - 1]?.focus() }
    else if (e.key === 'ArrowLeft' && i > 0) boxes.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < n - 1) boxes.current[i + 1]?.focus()
    else if (e.key === 'Enter') onEnter?.()
  }
  const paste = (i: number, e: ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); fill(i, digitsOnly(e.clipboardData.getData('text')).slice(0, n - i)) }
  return (
    <fieldset className={styles.code}>
      <legend className={styles.codeLabel}>{label}</legend>
      <div className={styles.digits}>
        {value.map((d, i) => (
          <input key={i} ref={(el) => { boxes.current[i] = el; if (i === 0 && firstRef) firstRef.current = el }} className={styles.digit} aria-label={`Digit ${i + 1}`}
                 inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} value={d} maxLength={n} aria-invalid={invalid ? 'true' : undefined} data-testid={testId}
                 onChange={(e) => put(i, e.target.value)} onKeyDown={(e) => key(i, e)} onPaste={(e) => paste(i, e)} onFocus={(e) => e.currentTarget.select()} />
        ))}
      </div>
    </fieldset>
  )
}
