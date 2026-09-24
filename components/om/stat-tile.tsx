import type { ReactNode } from 'react'
import styles from './stat-tile.module.css'

/**
 * A number tile (REG-614): the Quote X-Ray's tile (xray-result.module.css), shared — surface-bg, radius 8, 12/16 padding, an
 * uppercase caption, the number in heading-h3, a body-s help line. `grade` colours the number (Insights' turnaround grades);
 * `tone="primary"` is the X-Ray's primary tile.
 */
export function StatTile({ label, value, help, grade, tone, children, testId }: {
  label: string
  value: ReactNode
  help?: ReactNode
  grade?: 'good' | 'warn' | 'bad'
  tone?: 'primary'
  children?: ReactNode
  testId?: string
}) {
  return (
    <div className={styles.tile} data-tone={tone} data-testid={testId}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} data-grade={grade}>{value}</span>
      {help ? <span className={styles.help}>{help}</span> : null}
      {children}
    </div>
  )
}
