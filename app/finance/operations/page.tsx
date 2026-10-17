import { redirect } from 'next/navigation'
import { oldOperationsTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S41b-2) 1.0's Finance › Operations — the address its invoice, payment, PO and expense notifications sent. It used to fall
    through `/finance/<tab>` into `/company/finance/operations`, a tab 2.0 doesn't have (a 404). Now: `?invoiceId=` the invoice on its project's
    Money, `&project=` that project's Money (each when the member may open it), `?tab=` its 2.0 register, else Finance › To do. A plain 307. */
export default async function OldOperationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(await oldOperationsTarget(await searchParams))
}
