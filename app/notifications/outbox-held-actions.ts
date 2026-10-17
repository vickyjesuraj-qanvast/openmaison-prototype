'use server'

import { and, asc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, notificationOutbox } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { dropHeldBatch, retryMessageNow, sendHeldBatch } from '@/lib/notifications/delivery'
import { messagesPaused } from '@/lib/platform'
import { batchIdOf } from '@/lib/notifications/safeguards'
import type { SentEvent } from '@/lib/notifications/outbox'

/*
 * (parity map 2026-10-10 — UC-082 · UC-083) Settings › Notifications › Sent messages' answers to the safeguards: a large send held for the
 * Owner (Send · Drop — the Owner's alone, as `send_held` is theirs), Try again now on a message that failed (Owners and Admins, who read the
 * whole log), and whether OpenMaison has paused the studio's messages. Every refusal is `{ error: <the rule> }`.
 */
type Refusal = { error: string }
const OWNER_RULE = 'Only the Owner sends or drops a large send'
const RETRY_RULE = 'Only Owners and Admins try a message again'

export type HeldSend = { batch: string; event: SentEvent; messages: number; people: number; title: string; at: number }
/** The large sends waiting for the Owner, newest first, and whether the studio's messages are paused — the card's banner reads them. */
export async function fetchHeldSends(): Promise<{ sends: HeldSend[]; paused: boolean; owner: boolean }> {
  const viewer = await fetchViewer()
  const [rows, paused, [me]] = await Promise.all([
    db.select({ error: notificationOutbox.error, event: notificationOutbox.event, toName: notificationOutbox.toName, subject: notificationOutbox.subject, body: notificationOutbox.body, at: notificationOutbox.createdAt })
      .from(notificationOutbox).where(eq(notificationOutbox.status, 'held_large')).orderBy(asc(notificationOutbox.createdAt)),
    messagesPaused().catch(() => false),
    db.select({ role: members.role }).from(members).where(eq(members.id, viewer.id)).limit(1),
  ])
  if (!runsStudio(viewer.role)) return { sends: [], paused, owner: false }
  const by = new Map<string, HeldSend & { names: Set<string> }>()
  for (const r of rows) {
    const batch = batchIdOf(r.error); if (!batch) continue
    const had = by.get(batch)
    if (had) { had.messages++; had.names.add(r.toName); continue }
    by.set(batch, { batch, event: r.event as SentEvent, messages: 1, people: 0, names: new Set([r.toName]), title: (r.subject || r.body.split('\n')[0] || '').trim(), at: r.at.getTime() })
  }
  const sends = [...by.values()].map(({ names, ...x }) => ({ ...x, people: names.size })).sort((a, b) => b.at - a.at)
  return { sends, paused, owner: me?.role === 'Owner' }
}

export async function sendLargeSend(batch: string): Promise<{ sent: number } | Refusal> {
  const viewer = await fetchViewer()
  if (viewer.role !== 'Owner') return { error: OWNER_RULE }
  if (typeof batch !== 'string' || !/^[0-9a-f-]{36}$/i.test(batch)) return { error: 'This send isn’t there any more' }
  const sent = await sendHeldBatch(batch)
  revalidatePath('/settings')
  return { sent }
}
export async function dropLargeSend(batch: string): Promise<{ dropped: number } | Refusal> {
  const viewer = await fetchViewer()
  if (viewer.role !== 'Owner') return { error: OWNER_RULE }
  if (typeof batch !== 'string' || !/^[0-9a-f-]{36}$/i.test(batch)) return { error: 'This send isn’t there any more' }
  const [me] = await db.select({ name: members.name }).from(members).where(eq(members.id, viewer.id)).limit(1)
  const dropped = await dropHeldBatch(batch, me?.name ?? 'the Owner')
  if (!dropped) return { error: 'This send isn’t there any more' }
  revalidatePath('/settings')
  return { dropped }
}
/** Try again now — a failed message goes through the provider at once. */
export async function tryMessageAgain(id: string): Promise<{ status: string } | Refusal> {
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: RETRY_RULE }
  if (await messagesPaused().catch(() => false)) return { error: 'OpenMaison has paused the studio’s messages — it goes when the pause lifts' }
  const [r] = await db.select({ status: notificationOutbox.status }).from(notificationOutbox).where(and(eq(notificationOutbox.id, String(id ?? '')))).limit(1)
  if (!r || r.status !== 'failed') return { error: 'This message isn’t waiting to be tried again' }
  const st = await retryMessageNow(String(id))
  if (!st) return { error: 'This message isn’t waiting to be tried again' }
  revalidatePath('/settings')
  return { status: st }
}
