import type { Metadata } from 'next'
import { fetchProjectRows } from '@/lib/projects/queries'
import { deletedProjectFor } from '@/lib/projects/handover'
import { ProjectsWorkspace } from '@/components/projects/projects-workspace'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'

export const metadata: Metadata = { title: 'Projects' }
export const dynamic = 'force-dynamic'

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? null : v ?? null)

/**
 * (REG-924) Projects — every project this member may see (Settings › Who sees leads, the lead's rule), with the view the address carries
 * (`?scope=` `?q=` `?sort=` `?type=` `?team=` `?col=` `?dir=`; `?new=1` opens New project — ⌘K's Create; (fix-E, E-28) `?deleted=<id>`, a
 * deleted project's own address, says once that it is in Deleted Projects).
 */
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await refusesPath('/projects')) return <AccessGate section="Projects" />   // (parity map, PR-022) Accounting reaches a project through Finance's rows, never the listing
  const [data, sp] = await Promise.all([fetchProjectRows(), searchParams])
  const deleted = await deletedProjectFor(one(sp.deleted))
  return <ProjectsWorkspace data={data} url={{ scope: one(sp.scope), q: one(sp.q), sort: one(sp.sort), type: one(sp.type), team: one(sp.team), col: one(sp.col), dir: one(sp.dir), new: one(sp.new), deleted, view: one(sp.view), of: one(sp.of) }} />
}
