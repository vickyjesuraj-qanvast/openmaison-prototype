import { redirect } from 'next/navigation'
import { FINANCE_BASE, OLD_FINANCE_TABS } from '@/lib/finance/sections'
import { fetchViewer } from '@/lib/leads/visibility'
import { seesBooks } from '@/lib/settings/roles'
import { keepQuery } from '@/lib/nav'

export const dynamic = 'force-dynamic'   // where it lands depends on who is signed in

/** (simplify S-11) Finance › Payments out is Money out › Paid now — the Owners' and Admins' (F-16); anyone else lands on Money out's first kind.
    Its own route, with no loader, so the answer is a plain 307 rather than a streamed page. */
export default async function OldPaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const runs = seesBooks((await fetchViewer()).role)   // (parity map, MO-098) Money out › Paid is the books' — Accounting's too
  redirect(keepQuery(runs ? OLD_FINANCE_TABS.payments! : `${FINANCE_BASE}/money-out`, await searchParams))
}
