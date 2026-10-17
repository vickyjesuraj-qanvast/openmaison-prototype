import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { REPORTS_TABS } from '@/lib/company/sections'

const known = (tab: string) => REPORTS_TABS.some((t) => t.key === tab)

/** (pending modules S41b-2) A Reports tab 2.0 doesn't have is no page: the app-wide "page not found" with its 404 status —
    checked here, above the tab's loader, so the answer is not a streamed 200 (the page's title says so too). */
export default async function ReportsTabLayout({ children, params }: { children: ReactNode; params: Promise<{ tab: string }> }) {
  if (!known((await params).tab)) notFound()
  return children
}
