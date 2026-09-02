import type { ReactNode } from 'react'
import styles from './highlight.module.css'

/** C2: emphasise the matched substring of a search hit (weight only — no background). */
export function highlightMatch(text: string, query: string): ReactNode {
  const q = query.trim()
  if (!q) return text
  const lower = text.toLowerCase(), needle = q.toLowerCase()
  const parts: ReactNode[] = []
  let i = 0, k = 0
  while (i < text.length) {
    const j = lower.indexOf(needle, i)
    if (j === -1) { parts.push(text.slice(i)); break }
    if (j > i) parts.push(text.slice(i, j))
    parts.push(<mark key={k++} className={styles.hit}>{text.slice(j, j + needle.length)}</mark>)
    i = j + needle.length
  }
  return <>{parts}</>
}

/**
 * (REG-275) Phone hits, mapped back onto the phone AS DISPLAYED. Phones are matched digits-to-digits on both
 * sides (lib/search.ts), so a lead found by "9812 0443" or "+65 9812 0443" carries no literal substring for
 * highlightMatch to find and the row would show nothing emphasised — the very confusion REG-274 set out to fix.
 * A query with no digits, or digits this number does not contain, leaves the text exactly as it was.
 */
export function highlightPhone(text: string, query: string): ReactNode {
  const needle = query.replace(/\D/g, '')
  if (!needle) return text
  const at: number[] = []   // where each digit of `text` sits in `text`
  let flat = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i)
    if (ch >= '0' && ch <= '9') { at.push(i); flat += ch }
  }
  const j = flat.indexOf(needle)
  if (j === -1) return text
  const start = at[j] ?? 0
  const end = (at[j + needle.length - 1] ?? start) + 1
  return <>{text.slice(0, start)}<mark className={styles.hit}>{text.slice(start, end)}</mark>{text.slice(end)}</>
}
