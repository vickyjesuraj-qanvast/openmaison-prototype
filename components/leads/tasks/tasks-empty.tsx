'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import styles from './tasks-empty.module.css'

/**
 * Lead Details › Tasks — empty state (audit 2026-08-30, T9; the Tasks section 902-36216 mocks no empty frame, so this is
 * the Quotes / Contracts tabs' 784px card (components/leads/quotes/quotes-empty.tsx, 910:36266) carrying the copy of the
 * Overview MY WORK card's mocked empty state (858:24171: "Add your first task" · "Stay organised — …" · "Create New Task")
 * plus the Add Task menu's second item, "Use Template", as the secondary button.
 */
export function TasksEmpty({ onCreate, onTemplate }: { onCreate: () => void; onTemplate: () => void }) {
  return (
    <div className={styles.card} data-testid="tasks-empty">
      <div className={styles.inner}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-tasks.svg" width={180} height={138} alt="" className={styles.art} />
        <div className={styles.texts}>
          <p className={styles.title}>Add your first task</p>
          <p className={styles.body}>Stay organised — track, prioritise, and complete everything from one place.</p>
        </div>
        <div className={styles.buttons}>
          <Button variant="secondary" appearance="outlined" onPress={onTemplate}>Use Template</Button>
          <Button iconStart={<Icon name="add" size={20} />} onPress={onCreate}>Create New Task</Button>
        </div>
      </div>
    </div>
  )
}
