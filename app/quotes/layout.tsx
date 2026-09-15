import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'

/** `/quotes` = the studio-wide quotes list (Tools › Quotes, REG-422) inside the shell; the editor at `/quotes/[quoteId]` is the rail-less `(editor)` group. */
export default function QuotesLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
