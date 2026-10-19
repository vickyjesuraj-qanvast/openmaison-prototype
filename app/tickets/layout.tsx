import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** (S46 — REG-2524) `/tickets` = every ticket on the projects the member sees, inside the shell — the rail's item after Tasks, as 1.0's
    Escalations sat (her ask 2026-10-19). */
export default async function TicketsLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
