'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import styles from './tasks-empty.module.css'

/**
 * Lead Details › Tasks — empty state (audit 2026-08-30, T9; the Tasks section 902-36216 mocks no empty frame, so this is
 * the Quotes / Contracts tabs' 784px card (components/leads/quotes/quotes-empty.tsx, 910:36266) carrying the copy of the
 * Overview MY TASKS card's mocked empty state (858:24171) plus the New task menu's second row as the secondary button.
 * (the calm UI build 2026-10-27, 2-23 · W-384 · W-507 · W-021) One plain line, "No tasks yet" (the marketing line under it went), and the New task
 * menu's own words: "Add a task" · "From a template". `quiet` — on a record's page (a lead, a project) the header already carries the page's one
 * filled button (2-04, T-03): the card's add is outlined there; the rail's Tasks page, whose header steps back while it is empty, keeps it filled.
 */
export function TasksEmpty({ onCreate, onTemplate, quiet = false }: { onCreate: () => void; onTemplate: () => void; quiet?: boolean }) {
  return (
    <div className={styles.card} data-testid="tasks-empty">
      <div className={styles.inner}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/figma-assets/empty-tasks.svg" width={180} height={138} alt="" className={styles.art} />
        <div className={styles.texts}>
          <p className={styles.title}>No tasks yet</p>
        </div>
        <div className={styles.buttons}>
          <Button variant="secondary" appearance="outlined" onPress={onTemplate}>From a template</Button>
          <Button variant="primary" appearance={quiet ? 'outlined' : 'filled'} iconStart={<Icon name="add" size={20} />} onPress={onCreate} data-kb="create" data-kb-label="Add a task">Add a task</Button>   {/* (REG-735) C, while New task steps back */}
        </div>
      </div>
    </div>
  )
}
