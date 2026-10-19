import { redirect } from 'next/navigation'
import { fetchViewer } from '@/lib/leads/visibility'
import { homeOfRole } from '@/lib/settings/roles'
import { readPlanIntent, withPlanIntent } from '@/lib/credits/plan-intent'

export const dynamic = 'force-dynamic'   // (parity map, FR-040) where it lands depends on who is signed in

/** The app's front door: (pending modules S22 — 1.0's getDefaultRoute: Owners, Admins and Designers land on /dashboard) the Dashboard — it was
    the Leads listing until the Dashboard existed; (parity map, FR-040, kept) an Accounting member's is Company › Finance › To do, their own
    "what needs me" (their Dashboard is the rail's first item). (S46D — D4) A plan picked on the website rides through (`?plan=…`): a new studio
    lands at its front door with Plans opening on it. */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const intent = readPlanIntent({ get: (k) => { const v = sp[k]; return typeof v === 'string' ? v : null } })
  redirect(withPlanIntent(homeOfRole((await fetchViewer()).role), intent))   // (S44O — C6) the role's own front door: Finance for Accounting, the Dashboard for the rest
}
