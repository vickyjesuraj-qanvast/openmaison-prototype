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
