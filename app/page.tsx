import { redirect } from 'next/navigation'
import { fetchViewer } from '@/lib/leads/visibility'
import { homeOfRole } from '@/lib/settings/roles'

export const dynamic = 'force-dynamic'   // (parity map, FR-040) where it lands depends on who is signed in

/** The app's front door: (pending modules S22 — 1.0's getDefaultRoute: Owners, Admins and Designers land on /dashboard) the Dashboard — it was
    the Leads listing until the Dashboard existed; (parity map, FR-040, kept) an Accounting member's is Company › Finance › To do, their own
    "what needs me" (their Dashboard is the rail's first item). */
export default async function Home() {
  redirect(homeOfRole((await fetchViewer()).role))   // (S44O — C6) the role's own front door: Finance for Accounting, the Dashboard for the rest
}
