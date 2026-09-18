import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** `/quote-x-ray` — Tools › Quote X-Ray (REG-529), inside the shell like Tools › Quotes. */
export default async function XrayLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>
}
