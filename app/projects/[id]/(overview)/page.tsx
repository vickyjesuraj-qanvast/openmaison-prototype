import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { isDeletedProject } from '@/lib/projects/handover'
import { readFrom } from '@/lib/nav'
import { fetchProjectDetail } from '@/lib/projects/queries'
import { ProjectFrame } from '@/components/projects/project-frame'
import { isAccounting } from '@/lib/settings/roles'
import { projectHref } from '@/lib/projects/tabs'
import { withQuery } from '@/lib/nav'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — C6)
import { AccessGate } from '@/components/shell/access-gate'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  if (await refusesPath(`/projects/${id}`)) return { title: 'Projects' }   // (S44O — C6) no project's name in a tab that is not theirs
  const d = await fetchProjectDetail(id)
  return { title: d ? `${d.project.name} · Projects` : 'Project' }
}

/** (REG-931) A project's Overview. A project the viewer may not see (its lead's rule) answers not found. `?from=` names where it was opened from. */
export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/projects/${id}`)) return <AccessGate section="Projects" />   // (S44O — call C6) a project is never Marketing's — before a record is read
  const d = await fetchProjectDetail(id)
  if (!d) { if (await isDeletedProject(id)) redirect(`/projects?deleted=${encodeURIComponent(id)}`); notFound() }   // (Projects round 7) a deleted project's address lands on the listing — (fix-E, E-28) which says where it is
  if (isAccounting(d.viewer.role)) redirect(withQuery(projectHref(id, 'money'), sp))   // (parity map, PR-022 · FR-040) Accounting opens a project on its Money
  return <ProjectFrame d={d} tab="" origin={readFrom(sp.from)} />
}
