'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dashboardSnoozes } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { studioDay } from '@/lib/dashboard/inbox'

/*
 * (the Dashboard redesigned, 2026-10-26 — his Q-05 "Yes: it comes back tomorrow" · lane D2) **Not today** on a Needs you row, and the
 * Dashboard's own note that a quote's reminder went: one row per member and row key in `dashboard_snoozes`, resting until the studio's next
 * day (`until_day` = tomorrow's day number, Singapore). The row's key carries a word of what it says (`snoozeKeyOf`), so a row that changes
 * comes back at once; an Undo takes the note away. Each answers `{ error }` when it can't, the house way; a member only ever touches their own.
 *
 * Who may: anyone with a Dashboard — it sets aside a row on their own page and changes no record of the studio's. The rows that can't wait
 * (late and ours, an approval past its day) never offer it (lib/dashboard/inbox-queries.ts `stays`); the action refuses a key it wasn't given.
 */

type Refusal = { error: string }
const KEY = /^[a-z][a-z0-9-]*:[^\s]{1,280}#[a-z0-9]{1,13}$|^[a-z][a-z0-9-]*#[a-z0-9]{1,13}$/i
const okKey = (k: unknown): k is string => typeof k === 'string' && k.length <= 320 && KEY.test(k)

async function note(rowKey: string): Promise<{ ok: true; key: string } | Refusal> {
  const me = await sessionMemberId()
  const now = Date.now()
  await db.insert(dashboardSnoozes).values({ memberId: me, rowKey, untilDay: studioDay(now) + 1, createdAt: new Date(now) })
    .onConflictDoUpdate({ target: [dashboardSnoozes.memberId, dashboardSnoozes.rowKey], set: { untilDay: studioDay(now) + 1, createdAt: new Date(now) } })
  revalidatePath('/dashboard')
  return { ok: true, key: rowKey }
}
async function drop(rowKey: string): Promise<{ ok: true } | Refusal> {
  const me = await sessionMemberId()
  await db.delete(dashboardSnoozes).where(and(eq(dashboardSnoozes.memberId, me), eq(dashboardSnoozes.rowKey, rowKey)))
  revalidatePath('/dashboard')
  return { ok: true }
}

/** Not today: the row rests until tomorrow. */
export async function setAside(o: { key: string }): Promise<{ ok: true; key: string } | Refusal> {
  if (!okKey(o?.key)) return { error: 'This row can’t be set aside' }
  return note(o.key)
}
/** Not today's Undo, and the set-aside list's Bring back. */
export async function bringBack(o: { key: string }): Promise<{ ok: true } | Refusal> {
  if (!okKey(o?.key)) return { error: 'This row can’t be brought back' }
  return drop(o.key)
}
