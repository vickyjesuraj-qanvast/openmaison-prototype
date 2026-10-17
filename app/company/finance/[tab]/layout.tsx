import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { FINANCE_TABS } from '@/lib/finance/sections'

const known = (tab: string) => FINANCE_TABS.some((t) => t.key === tab)

/** (pending modules S41b-2) A Finance tab 2.0 doesn't have (1.0's `/finance/operations` once fell through to `/company/finance/operations`)
    is no page: the app-wide "page not found" with its 404 status — checked here, above the tab's loader, so the answer is
    not a streamed 200 (the page's title says so too). */
export default async function FinanceTabLayout({ children, params }: { children: ReactNode; params: Promise<{ tab: string }> }) {
  if (!known((await params).tab)) notFound()
  return children
}
