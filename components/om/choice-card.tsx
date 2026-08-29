'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import styles from './choice-card.module.css'

/**
 * Generic radio-as-card (821:24010). Used by the import wizard's Lead routing
 * dialog and Settings › Leads. Wrap a group in `role="radiogroup"`.
 */
export function ChoiceCard({
  title, help, selected, onSelect, disabled = false, badge,
}: {
  title: string
  help?: ReactNode
  selected: boolean
  onSelect: () => void
  disabled?: boolean
  /** Optional trailing element inside the title row (a Tag, for instance). */
  badge?: ReactNode
}) {
  return (
    <button type="button" role="radio" aria-checked={selected} className={styles.card}
            data-selected={selected || undefined} disabled={disabled} onClick={onSelect}>
      <span className={styles.text}>
        <span className={styles.title}>{title}{badge}</span>
        {help ? <span className={styles.help}>{help}</span> : null}
      </span>
      <Icon name={selected ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} weight={300} className={styles.radio} />
    </button>
  )
}
