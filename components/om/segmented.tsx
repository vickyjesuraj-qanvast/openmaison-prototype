'use client'

import { Icon } from './icon'
import { Tooltip } from './tooltip'
import styles from './segmented.module.css'

export function SegmentedIconToggle({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; icon: string; label: string }[]
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {options.map((o) => (
        <Tooltip key={o.value} label={o.label}>
          <button
            type="button"
            className={styles.seg}
            aria-pressed={o.value === value}
            aria-label={o.label}
            onClick={() => onChange(o.value)}
          >
            <Icon name={o.icon} size={20} />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
