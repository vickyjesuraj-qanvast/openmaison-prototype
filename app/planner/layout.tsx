import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** `/planner` — Tools › 3D Space Planner (gaps build J) inside the shell; each layout's editor at `/planner/[layoutId]` is the rail-less `(editor)` group. */
export default async function PlannerLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
