'use client'

import { Icon } from '@/components/om/icon'
import styles from './progress-card.module.css'

/**
 * (REG-2801) A tool's run, said as it goes: a glyph, what it is doing, a line on the wait, a bar and the steps — done, now, to do. Quote
 * X-Ray's reading card (REG-529), made the house's so Tools › Floorplan to 3D Isometric (1.0's "Read the plan · Confirm the rooms · 3D
 * render") draws the same one. Sits inside its page's own card; `role="status"` reads the title out as it changes.
 */
export function ProgressCard({ glyph, title, help, steps, at, testId }: {
  glyph: string
  title: string
  help: string
  steps: readonly string[]
  /** the step running now — those before it are done */ at: number
  testId?: string
}) {
  return (
    <div className={styles.progress} role="status" aria-live="polite" data-testid={testId}>
      <span className={styles.progressGlyph}><Icon name={glyph} size={28} weight={300} /></span>
      <span className={styles.progressTitle}>{title}</span>
      <span className={styles.progressHelp}>{help}</span>
      <span className={styles.bar} aria-hidden><span className={styles.barFill} style={{ width: `${Math.round(((at + 1) / steps.length) * 100)}%` }} /></span>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={s} className={styles.step} data-state={i < at ? 'done' : i === at ? 'now' : 'todo'}>
            <span className={styles.stepGlyph}>{i < at ? <Icon name="check_circle" size={18} weight={300} /> : i === at ? <Icon name="progress_activity" size={18} weight={300} className={styles.spin} /> : <span className={styles.dot} />}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  )
}
