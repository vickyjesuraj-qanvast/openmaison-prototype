'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import styles from './price-book.module.css'

/**
 * (The calm UI build 2026-10-27, the UI audit's 4-40 · T-05) "How the Price book works": the explanations that sat under nearly every field of
 * the item and import dialogs, folded behind one text link — the dialog says what it is in one line, the rest is one press away. Every
 * sentence that was a helper is here, word for word or nearly, so nothing a studio could read before is lost.
 */
export function HowItWorks({ points, label = 'How the Price book works', testId = 'price-book-how' }: { points: string[]; label?: string; testId?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={styles.how} data-open={open || undefined} data-testid={testId}>
      <Button appearance="text" iconStart={<Icon name="help" size={18} />} iconEnd={<span className={styles.howChev} aria-hidden><Icon name="expand_more" size={20} /></span>}
              aria-expanded={open} aria-controls={id} onPress={() => setOpen((o) => !o)}>{label}</Button>
      {open ? (
        <ul id={id} className={styles.howList}>
          {points.map((p) => <li key={p}>{p}</li>)}
        </ul>
      ) : null}
    </div>
  )
}
