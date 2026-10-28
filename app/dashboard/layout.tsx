import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'
import { openShellGate, shellComing } from '@/lib/dashboard/shell-gate'

/** (pending modules S22) `/dashboard` — the studio's front door (1.0's address), the rail's first item, inside the shell. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  shellComing()   // (P-14) before the first await: the page, starting beside it, waits for the shell
  return <AppShell railBadges={await railBadges()}><ShellDrawn />{children}</AppShell>
}

/** (the Dashboard redesigned, P-14) The shell has drawn its own reads: the page may read now (lib/dashboard/shell-gate.ts). */
function ShellDrawn() {
  openShellGate()
  return null
}
