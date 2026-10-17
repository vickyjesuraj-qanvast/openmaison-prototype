import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** (pending modules S22) `/dashboard` — the studio's front door (1.0's address), the rail's first item, inside the shell. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
