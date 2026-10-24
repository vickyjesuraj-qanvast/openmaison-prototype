import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** `/floorplan-3d` — Tools › Floorplan to 3D Isometric (REG-2800), inside the shell like Tools › Quote X-Ray. */
export default async function FloorplanLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
