import type { Metadata } from 'next'
import { fetchDashboard } from '@/lib/dashboard/queries'
import { DashboardView } from '@/components/dashboard/dashboard-view'

/**
 * (pending modules S22 — cards studio:dashboard · held:dashboard · api:industry-news · public:industry-news-feed; his "build all of them"
 * 2026-10-11) The Dashboard: what needs you, what is next and where the studio stands, for whoever is signed in — every role, Accounting's
 * books included (1.0's dashboard was every role's but Accounting's; their 2.0 page is their money). The studio lands here (app/page.tsx).
 */
export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // `now` is stamped inside the loader: client render must not read Date.now() (purity rule).
  return <DashboardView data={await fetchDashboard()} />
}
