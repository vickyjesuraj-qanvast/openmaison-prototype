'use server'

import { db } from '@/lib/db'
import { portalBellReads } from '@/lib/db/schema'
import { fetchPortalBell } from '@/lib/portal/notifications'
import type { BellRow } from '@/lib/portal/notifications-model'
import { portalActor } from '@/lib/portal/session'

/*
 * (Projects round 9 — Q-41) The portal's bell, asked for by the page once it shows. Every request is checked as every portal request is
 * (`portalActor`: the address, Live / Paused, the session); a read mark is a write, so a studio's preview (See it as the client · Open as a
 * test client) reads the bell as the client has it and marks nothing. Nothing here revalidates a path — the client's page is never re-rendered
 * under them (round 4b's rule).
 */
type Refusal = { error: string }

export async function readPortalBell(slug: string): Promise<Refusal | { rows: BellRow[]; unread: number }> {
  const who = await portalActor(slug, { write: false })
  if ('error' in who) return who
  return fetchPortalBell(who.visitor, slug, who.look)
}

const KEY = /^[a-z]+:[A-Za-z0-9:_-]{1,160}$/
async function mark(homeownerId: string, keys: string[]): Promise<number> {
  const clean = [...new Set(keys.filter((k) => typeof k === 'string' && KEY.test(k)))].slice(0, 60)
  if (!clean.length) return 0
  const now = new Date()
  await db.insert(portalBellReads).values(clean.map((rowKey) => ({ homeownerId, rowKey, readAt: now }))).onConflictDoNothing()
  return clean.length
}

/** A row opened — read for this person (someone else from the household keeps their own). */
export async function markBellRead(slug: string, input: { keys: string[] }): Promise<Refusal | { n: number }> {
  const who = await portalActor(slug, { write: true })
  if ('error' in who) return who
  /* only rows this person has now — an id from another client's bell answers nothing */
  const { rows } = await fetchPortalBell(who.visitor, slug, who.look)
  const mine = new Set(rows.map((r) => r.key))
  return { n: await mark(who.visitor.homeownerId, (Array.isArray(input?.keys) ? input.keys : []).filter((k) => mine.has(k))) }
}

/** Mark all as read. */
export async function markAllBellRead(slug: string): Promise<Refusal | { n: number }> {
  const who = await portalActor(slug, { write: true })
  if ('error' in who) return who
  const { rows } = await fetchPortalBell(who.visitor, slug, who.look)
  return { n: await mark(who.visitor.homeownerId, rows.filter((r) => !r.read).map((r) => r.key)) }
}
