import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { spaceLayouts } from '@/lib/db/schema'
import { fetchPlannerEditor } from '@/lib/planner/queries'
import { readFrom } from '@/lib/nav'
import { PlannerEditor } from '@/components/planner/editor/planner-editor'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ layoutId: string }> }): Promise<Metadata> {
  const { layoutId } = await params
  if (await refusesPath(`/planner/${layoutId}`)) return { title: '3D Space Planner' }   // (S44Z) no record's name in a tab that is not theirs
  const [l] = await db.select({ name: spaceLayouts.name }).from(spaceLayouts).where(and(eq(spaceLayouts.id, layoutId), isNull(spaceLayouts.deletedAt)))
  return { title: l ? `${l.name} · 3D Space Planner` : '3D Space Planner' }
}

/**
 * (gaps build J) A layout in the 3D Space Planner: the rail-less app frame of the `(editor)` group. `?from=` is where Back goes;
 * `?view=3d|walk` opens on that view — (parity map, TD-098) `?view=iso` on the 3D view's isometric camera (Tools › Floorplan to 3D
 * Isometric opens layouts so); `?share=1` opens Share with client. A layout this member may not see is not found.
 */
export default async function PlannerLayoutPage({ params, searchParams }: { params: Promise<{ layoutId: string }>; searchParams: Promise<{ from?: string; view?: string; share?: string }> }) {
  const { layoutId } = await params
  if (await refusesPath(`/planner/${layoutId}`)) return <AccessGate section="3D Space Planner" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const sp = await searchParams
  const data = await fetchPlannerEditor(layoutId)
  if (!data) notFound()
  const view = sp.view === '3d' || sp.view === 'walk' ? sp.view : sp.view === 'iso' ? '3d' : 'top'
  return <PlannerEditor data={data} from={readFrom(sp.from)} initialView={view} initialIso={sp.view === 'iso'} initialShare={sp.share === '1'} />
}
