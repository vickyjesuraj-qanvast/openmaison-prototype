'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { fetchPlatform, savePlatform, type PlatformSettings } from '@/lib/platform'
import { THIS_STUDIO } from '@/lib/platform-studios'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (parity map, CP-148 · UC-082's operator pause) Qanvast Ops › Studios' two switches, OpenMaison's — not the studio's: the studio's portal On /
 * Off and Pause the studio's messages. Each answers the switches as they now stand, or `{ error: <why> }`; each write is one settings row
 * (`platform`, lib/platform.ts), and Undo is the same action with the old value.
 *
 * A stand-in: in the prototype whoever opens Qanvast Ops acts as OpenMaison's operator (the rail carries it for the demo) and is recorded by
 * name; OpenMaison's real console signs in its own people and checks them here.
 */

type Refusal = { error: string }

async function operatorName(): Promise<string> {
  const id = await sessionMemberId()
  const [m] = await db.select({ name: members.name }).from(members).where(eq(members.id, id)).limit(1)
  return m?.name ?? 'Qanvast Ops'
}
const touch = () => {
  revalidatePath('/qanvast-ops', 'layout')
  revalidatePath('/company/portal', 'layout')   // "Closed by OpenMaison" on the studio's own page
  revalidatePath('/my', 'layout')               // every portal page reads the switch on its next request
  revalidatePath('/settings')                   // Settings › Notifications › Sent messages tells a hold
}

/** (CP-148) Close or open the studio's client portal for every client. */
export async function setStudioPortalOff(studioId: string, off: boolean): Promise<PlatformSettings | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (studioId !== THIS_STUDIO) return { error: 'That studio isn’t one OpenMaison runs here' }
  const cur = await fetchPlatform()
  if (cur.portalOff === off) return cur
  const next: PlatformSettings = off
    ? { ...cur, portalOff: true, portalOffAt: Date.now(), portalOffBy: await operatorName() }
    : { ...cur, portalOff: false, portalOffAt: null, portalOffBy: null }
  await savePlatform(next)
  touch()
  return next
}

/** (UC-082) Hold every message the studio sends (email and WhatsApp) until this is turned off — P-G's delivery layer reads it. */
export async function setStudioMessagesPaused(studioId: string, paused: boolean): Promise<PlatformSettings | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (studioId !== THIS_STUDIO) return { error: 'That studio isn’t one OpenMaison runs here' }
  const cur = await fetchPlatform()
  if (cur.messagesPaused === paused) return cur
  const next: PlatformSettings = paused
    ? { ...cur, messagesPaused: true, messagesPausedAt: Date.now(), messagesPausedBy: await operatorName() }
    : { ...cur, messagesPaused: false, messagesPausedAt: null, messagesPausedBy: null }
  await savePlatform(next)
  touch()
  return next
}
