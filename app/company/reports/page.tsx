import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { REPORTS_TABS, reportsHome } from '@/lib/company/sections'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { isMarketing, seesBooks } from '@/lib/settings/roles'
import { withQuery } from '@/lib/nav'
import { REPORTS_TAB_COOKIE } from '@/lib/finance/report-memory'

export const dynamic = 'force-dynamic'   // where it lands depends on who is signed in — never prerendered

/** (REG-1361) Company › Reports lands on the first tab the viewer reads — Leads for Owners and Admins, Projects for a Manager.
    (simplify S-13, her "build everything" 2026-10-09) … unless this browser read another tab last that this viewer reads too — an Owner who reads
    Finance lands on Finance (the Leads listing's remembered view, as a pattern). The address wins: a tab's own address is never redirected. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await fetchViewer()
  const runs = runsStudio(viewer.role), manager = viewer.role === 'Manager', books = seesBooks(viewer.role)   // (parity map, FB-114) Accounting reads Finance's
  const remembered = (await cookies()).get(REPORTS_TAB_COOKIE)?.value
  const last = REPORTS_TABS.find((t) => t.key === remembered)
  const desk = isMarketing(viewer.role)   // (S44O — call C6) Marketing reads Leads' tab alone
  const reads = last && (runs || (last.managers && manager) || (books && last.key === 'finance') || (desk && last.key === 'leads'))
  redirect(withQuery(reads ? last.href : reportsHome(runs || desk, manager, books), await searchParams))
}
