import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** Same frame as app/leads/layout.tsx: the rail + snackbar host live in AppShell, once per route group. */
export default async function QanvastOpsLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>   /* (REG-466) the Tasks item's overdue count */
}
