import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { railBadges } from '@/lib/leads/tasks'

/** `/quotes` = the studio-wide quotes list (Tools › Quotes, REG-422) inside the shell; the editor at `/quotes/[quoteId]` is the rail-less `(editor)` group. */
export default async function QuotesLayout({ children }: { children: ReactNode }) {
  return <AppShell railBadges={await railBadges()}>{children}</AppShell>   /* (REG-466) the Tasks item's overdue count */
}
