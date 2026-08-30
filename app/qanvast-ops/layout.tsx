import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'

/** Same frame as app/leads/layout.tsx: the rail + snackbar host live in AppShell, once per route group. */
export default function QanvastOpsLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
