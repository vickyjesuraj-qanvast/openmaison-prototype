import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** (pending modules S01) `/profile` — Your profile, inside the shell; the rail's studio block and the phone's avatar open it. */
export default async function ProfileLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
