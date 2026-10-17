import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** (pending modules S23) `/meetings` = Tools › Meeting Copilot, every meeting in the studio, and `/meetings/[id]` = a meeting's page — both in the shell. */
export default async function MeetingsLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
