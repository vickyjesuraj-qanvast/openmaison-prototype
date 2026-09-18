import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** `/contracts` = Tools › Contracts, the studio-wide list inside the shell (REG-534); the editor at `/contracts/[id]` is the rail-less `(editor)` group. */
export default async function ContractsLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
