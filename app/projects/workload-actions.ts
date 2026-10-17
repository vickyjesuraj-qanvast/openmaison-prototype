'use server'

import { revalidatePath } from 'next/cache'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, settings } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { SETTINGS_RULE } from '@/lib/projects/handover-model'
import { CAPACITY_KEY, clampCapacity, setsCapacity } from '@/lib/projects/workload'
import { fetchDefaultCapacity } from '@/lib/projects/workload-queries'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (gaps build I, I-Q3) Capacity — how many running projects a person can carry at once, set by Owners and Admins: the studio's default
 * (Settings › Projects › Workload) and each person's own (the Workload view's Set capacity). Every change hands back its Undo. A refusal
 * answers `{ error }`.
 */
type Refusal = { error: string }
const CAPACITY_RULE = 'Only Owners and Admins set how many projects someone can run'

function touch() {
  revalidatePath('/projects', 'layout')
  revalidatePath('/settings')
}

export async function setDefaultCapacity(input: { n: number }): Promise<{ n: number; before: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!setsCapacity(viewer.role)) return { error: SETTINGS_RULE }
  const n = clampCapacity(input?.n)
  if (n === null) return { error: 'Pick a number from 1 to 20' }
  const before = await fetchDefaultCapacity()
  const v = JSON.stringify(n)
  await db.insert(settings).values({ key: CAPACITY_KEY, value: v, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value: v, updatedAt: new Date() } })
  touch()
  return { n, before }
}

/** Each listed person's own capacity — a number, or null for the studio's default. Answers what each was, for Undo. */
export async function setCapacities(input: { caps: Record<string, number | null> }): Promise<{ changed: number; before: Record<string, number | null> } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!setsCapacity(viewer.role)) return { error: CAPACITY_RULE }
  const caps = input && typeof input.caps === 'object' && input.caps ? input.caps : {}
  const ids = Object.keys(caps).filter((k) => typeof k === 'string').slice(0, 200)
  if (!ids.length) return { changed: 0, before: {} }
  const rows = await db.select({ id: members.id, cap: members.projectCapacity }).from(members).where(inArray(members.id, ids))
  const before: Record<string, number | null> = {}
  let changed = 0
  for (const r of rows) {
    const raw = caps[r.id]
    const next = raw === null || raw === undefined ? null : clampCapacity(raw)
    if (raw !== null && raw !== undefined && next === null) return { error: 'Pick a number from 1 to 20' }
    if ((r.cap ?? null) === next) continue
    before[r.id] = r.cap ?? null
    await db.update(members).set({ projectCapacity: next }).where(eq(members.id, r.id))
    changed++
  }
  touch()
  return { changed, before }
}
