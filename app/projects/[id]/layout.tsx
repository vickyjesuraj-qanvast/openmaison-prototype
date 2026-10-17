import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'

/** (S42 audit A-11 — the S41b-2 note) A project that isn't there, or isn't one this member may open (Who sees a project = who sees its lead),
    answers with its record-not-found and the 404 status: checked here, above the pages' loaders, so a shared or indexed dead link is never a
    streamed 200 (REG-2121's way). A deleted project passes — its page sends the address to the listing that says where it is (fix-E, E-28). */
export default async function ProjectRecordLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const [p] = await db.select({ leadId: projects.leadId }).from(projects).where(eq(projects.id, id)).limit(1)
  if (!p || !(await canOpenLead(await fetchViewer(), p.leadId))) notFound()
  return children
}
