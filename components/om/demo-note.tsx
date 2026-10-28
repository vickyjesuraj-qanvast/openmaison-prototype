'use client'

import { MetaChip } from './meta-chip'
import { Tooltip } from './tooltip'
import styles from './demo-note.module.css'

/**
 * (the calm UI build 2026-10-27 — the audit's 2-09 · 5-16, T-05: prototype talk never sits on a studio's screen) **One quiet "Demo" chip** in
 * place of a stand-in's sentence ("Simulated on this prototype — …", lib/services/registry.ts `SIMULATED_WORDS`): the chip says the place is a
 * demo, the sentence is its tooltip — on hover, on keyboard focus and on a tap. A real service drops the chip with its sentence. `testId` is
 * the handle the sentence's own line carried.
 */
export function DemoNote({ text, testId, className }: { text: string; testId?: string; className?: string }) {
  return (
    <Tooltip label={text}>
      <span tabIndex={0} role="note" aria-label={text} className={className ? `${styles.note} ${className}` : styles.note} data-testid={testId}>
        <MetaChip icon="info">Demo</MetaChip>
      </span>
    </Tooltip>
  )
}
