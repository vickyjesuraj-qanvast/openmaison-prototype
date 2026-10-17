import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'

/** (S42 audit A-11 — the S41b-2 note) A contract that isn't there, or isn't one this member may open (Who sees leads, REG-634), answers with
    the app-wide "page not found" and its 404 status: checked here, above the editor's and Preview's loaders, so a shared or indexed dead link
    is never a streamed 200 (REG-2121's way). The pages keep their own check. */
export default async function ContractRecordLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const [c] = await db.select({ leadId: contracts.leadId }).from(contracts).where(and(eq(contracts.id, id), isNull(contracts.deletedAt))).limit(1)
  if (!c || !(await canOpenLead(await fetchViewer(), c.leadId))) notFound()
  return children
}
