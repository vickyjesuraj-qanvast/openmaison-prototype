import { redirect } from 'next/navigation'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { financeHome } from '@/lib/finance/sections'
import { withQuery } from '@/lib/nav'

export const dynamic = 'force-dynamic'

/** (gaps build F1 — F1-Q1) Finance lands on its first tab. (REG-1360) Company › Operations › Finance; the rail no longer has its own item.
    (simplify S-10, his "build everything" 2026-10-09) The first tab is To do, for everyone — an Owner's approvals, payments and money to collect,
    a member's own drafts and claims; the query rides along (`?open=` from an old link lands on its row). */
export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await refusesPath('/company/finance')) return <AccessGate section="Finance" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  redirect(withQuery(financeHome(), await searchParams))
}
