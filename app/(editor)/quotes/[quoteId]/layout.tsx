import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { quotes } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'

/** (S42 audit A-11 — the S41b-2 note) A quote that isn't there, or isn't one this member may open (Who sees leads, REG-625), answers with the
    app-wide "page not found" and its 404 status: checked here, above the editor's and Preview's loaders, so a shared or indexed dead link is
    never a streamed 200 (as the Finance and Reports tab layouts do, REG-2121). The pages keep their own check. */
export default async function QuoteRecordLayout({ children, params }: { children: ReactNode; params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const [q] = await db.select({ leadId: quotes.leadId }).from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt))).limit(1)
  if (!q || !(await canOpenLead(await fetchViewer(), q.leadId))) notFound()
  return children
}
