import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** (REG-919) `/projects` — the listing and every project's page, inside the shell (the rail's third item, the dock's fourth). */
export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
