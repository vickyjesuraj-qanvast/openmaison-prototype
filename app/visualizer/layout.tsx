import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** `/visualizer` — Tools › AI Visualizer (REG-673) inside the shell; each design's editor at `/visualizer/[designId]` is the rail-less `(editor)` group. */
export default async function VisualizerLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
