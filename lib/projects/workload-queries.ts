import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import type { Viewer } from '@/lib/leads/assign-policy'
import { CAPACITY_KEY, parseDefaultCapacity, seesWorkload, setsCapacity } from './workload'
import { contractorsFor, type CrewBoardData } from './contractors'

/** (gaps build I, I-Q3) The studio's default capacity — Settings › Projects › Workload (4 until the studio changes it). */
export async function fetchDefaultCapacity(): Promise<number> {
  const [r] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, CAPACITY_KEY)).limit(1)
  return parseDefaultCapacity(r?.value)
}

/** (I-Q1) What the listing hands the Workload view — nothing for a viewer who doesn't see it. */
export async function workloadFor(viewer: Viewer): Promise<{ workload?: { defaultCapacity: number; sets: boolean; teamIds: string[] }; contractors?: CrewBoardData }> {
  /* (S45B · H-UHD-2) the view's Contractors — for everyone who works on projects (Designers too: 1.0's owner · admin · id), the Members half
     staying the Owners', Admins' and Managers' */
  const { contractors } = await contractorsFor(viewer)
  /* shown only when it applies: a Designer meets the view once the studio keeps a contractor (the Owners, Admins and Managers find its start) */
  if (!seesWorkload(viewer.role)) return contractors?.contractors.some((c) => c.isActive) ? { contractors } : {}
  return { workload: { defaultCapacity: await fetchDefaultCapacity(), sets: setsCapacity(viewer.role), teamIds: viewer.teamIds }, ...(contractors ? { contractors } : {}) }
}
