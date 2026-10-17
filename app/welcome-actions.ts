'use server'

import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { acceptInvitationOf } from '@/lib/company/invitations-server'   // (pending modules S09)

/**
 * (pending modules S08 — 1.0's welcome-modal.tsx, kept per browser there) The signed-in member has had their first-visit welcome: they are owed
 * it no more, and `welcomed_at` keeps when they first came in (the first stamp stays). One statement; it revalidates nothing — the page on
 * screen keeps going, and the next one the shell draws reads the record.
 */
export async function markWelcomed(): Promise<{ ok: true } | { error: string }> {
  const id = await sessionMemberId()
  const r = await db.update(members).set({ welcomeDue: false, welcomedAt: sql`coalesce(${members.welcomedAt}, ${Math.floor(Date.now() / 1000)})` })
    .where(and(eq(members.id, id), eq(members.isActive, true)))
  if (!r.rowsAffected) return { error: 'That member is no longer in the studio' }
  /* (pending modules S09) the first visit is when an invited member joins (1.0's first sign-in accepted the invitation) — whoever invited them hears it */
  await acceptInvitationOf(id)
  return { ok: true }
}
