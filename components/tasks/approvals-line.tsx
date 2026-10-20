'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { leaveThen } from '@/components/company/leave-guard'
import { withFrom } from '@/lib/nav'
import { DASHBOARD } from '@/lib/dashboard/model'
import note from '@/components/company/read-only-note.module.css'
import styles from './approvals-line.module.css'

/**
 * (pending modules S46C · M3 — his "fix everything" 2026-10-19 after the findability audit, finding L-2) 1.0's Owners approved from Tasks ›
 * Approvals; 2.0 gathers every approval on the Dashboard's *Needs your OK*. The rail's Tasks page says so, in one line at its top, while any
 * waits for this member — the number is the Dashboard's own (`countApprovalsWaiting`), the door opens it with the way back. Never at 0, never
 * for a member nothing waits on. The house info strip's look (the read-only line, components/company/read-only-note.module.css).
 * INVENTED COPY (logged REG-S46C.2): "{n} approval(s) wait(s) for you on the Dashboard" · "Open Dashboard".
 */
export const approvalsWords = (n: number) => `${n === 1 ? '1 approval waits' : `${n} approvals wait`} for you on the Dashboard`
export const APPROVALS_DOOR = 'Open Dashboard'
/** The ghost key the line is remembered under (REG-708) — the loader draws it where the page last showed it; the shell's seed answers a
    browser's first visit (lib/ghost-shapes.server.ts). */
export const APPROVALS_SHAPE = 'tasks.approvals'
/** …and the count it last showed, so the loader's sentence is the page's (lib/prefs.ts `useCountPref`; 0 = no line). */
export const APPROVALS_COUNT_KEY = 'om.shape.tasks.approvals.n'

export function ApprovalsLine({ count }: { count: number }) {
  const router = useRouter()
  if (count <= 0) return null
  return (
    <div className={`${note.note} ${styles.line}`} data-testid="tasks-approvals">
      <Icon name="approval" size={20} weight={300} />
      <span className={styles.text}>{approvalsWords(count)}</span>
      <Button appearance="text" className={styles.door} onPress={() => leaveThen(() => router.push(withFrom(DASHBOARD, '/tasks')))} data-testid="tasks-approvals-door">{APPROVALS_DOOR}</Button>
    </div>
  )
}
