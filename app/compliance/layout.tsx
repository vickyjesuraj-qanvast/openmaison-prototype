import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** (gaps build I, I-Q12) `/compliance` = Tools › Compliance Navigator, inside the shell. */
export default async function ComplianceLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
