import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { FINANCE_REPORT_COOKIE } from '@/lib/finance/report-memory'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads } from '@/lib/db/schema'
import { REPORTS_TABS } from '@/lib/company/sections'
import { fetchInsights } from '@/lib/leads/insights'
import { fetchSales } from '@/lib/leads/sales-queries'
import { fetchProjectInsights } from '@/lib/projects/insights'
import { fetchBooks } from '@/lib/finance/books'
import { fetchMeetingReports } from '@/lib/meetings/reports'
import { fetchStudioHealth } from '@/lib/studio-health/queries'
import { readRange } from '@/lib/leads/tat'
import { canOpenLead, fetchViewer, refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'
import { runsStudio } from '@/lib/leads/assign-policy'
import { runsLeadSetup, seesBooks } from '@/lib/settings/roles'
import { backLabel, readFrom } from '@/lib/nav'
import { ReportsWorkspace } from '@/components/company/reports/reports-workspace'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const { tab } = await params
  const def = REPORTS_TABS.find((t) => t.key === tab)
  /* (pending modules S41b-2) a tab that isn't one is the app-wide not found (the layout's check) — its title too */
  return def ? { title: `${def.label} · Reports` } : { title: { absolute: 'Page not found' } }
}

/**
 * (REG-1361) One tab of Company › Reports. Each tab's figures are worked out on the server for whoever may read them — Leads (REG-611: Owners
 * and Admins), Projects (gaps build I: Owners, Admins, a Manager for their team), (pending modules S23) Meetings (Owners and Admins), Finance
 * (F2-Q1: Owners and Admins), (pending modules S39) Studio health (Owners and Admins); anyone else gets the tab's gate, never the numbers.
 * (pending modules S45A) Leads holds two reports — Response time and Sales (`?report=sales`, Owners and Admins).
 * (pending modules S39) `?range=30|90|365|all` opens Leads, Projects, Meetings and Studio health on that range — Studio health's tiles open
 * Reports › Leads and › Projects on its own range, so the figure the tile said is the figure the page shows.
 */
export default async function ReportsTabPage({ params, searchParams }: { params: Promise<{ tab: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ tab }, sp, viewer] = await Promise.all([params, searchParams, fetchViewer()])
  const def = REPORTS_TABS.find((t) => t.key === tab)
  if (!def) notFound()
  if (await refusesPath(`/company/reports/${def.key}`, viewer)) return <AccessGate section="Reports" />   // (S44Z — S44O's note) a tab the role doesn't open answers before a figure is read
  const one = (k: string) => { const v = sp[k]; return typeof v === 'string' ? v : null }
  const from = readFrom(one('from') ?? undefined)
  const runs = runsStudio(viewer.role)
  /* (Dane's UAT 11.09, kept) Opened from a lead (its LEAD STAGES card's Response time), Back names that lead — only one the viewer may open (REG-601). */
  const leadId = from?.split('?')[0]?.match(/^\/leads\/([^/]+)/)?.[1]
  const leadName = leadId && leadId !== 'imports' && await canOpenLead(viewer, leadId)
    ? (await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)))[0]?.name ?? null
    : null
  const frame = { from, origin: leadName ?? undefined, backLabel: from && leadName ? backLabel(from, { leadName, fallback: 'Back to Leads' }) : undefined }
  const range = readRange(one('range'))
  if (def.key === 'leads') {
    /* (pending modules S45A — H-UHD-1) the Sales report beside Response time — an Owner's and an Admin's (fetchSales answers null for anyone else:
       Marketing reads Response time alone); `?report=sales` opens it. The two read one set of turnaround facts. */
    const insights = runsLeadSetup(viewer.role) ? await fetchInsights() : null   // (S44O — call C6) and Marketing's
    const sales = insights && runs ? await fetchSales({ insights }) : null
    return <ReportsWorkspace tab="leads" {...frame} range={range} leads={insights} sales={sales} report={one('report')} />
  }
  if (def.key === 'projects') return <ReportsWorkspace tab="projects" {...frame} range={range} projects={await fetchProjectInsights()} />
  /* (pending modules S23) 1.0's Meeting Insights — Owners and Admins (fetchMeetingReports answers null for anyone else, the tab's gate) */
  if (def.key === 'meetings') return <ReportsWorkspace tab="meetings" {...frame} range={range} meetings={runs ? await fetchMeetingReports() : null} />
  /* (pending modules S39) 1.0's Studio Health — Owners and Admins (fetchStudioHealth answers null for anyone else, the tab's gate) */
  if (def.key === 'health') return <ReportsWorkspace tab="health" {...frame} range={range} health={runs ? await fetchStudioHealth() : null} />
  /* (simplify S-13) no report in the address: the one this browser read last (the address wins) */
  const report = one('report') ?? (await cookies()).get(FINANCE_REPORT_COOKIE)?.value ?? null
  return <ReportsWorkspace tab="finance" {...frame} books={seesBooks(viewer.role) ? await fetchBooks() : null}   /* (parity map, FB-114) the books — Accounting's too */ report={report} period={one('period')} project={one('project')} entity={one('entity')} />
}
