'use server'

import { revalidatePath } from 'next/cache'
import { eq, sql, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, settings } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { runsStudio } from '@/lib/settings/roles'
import { SETUP_KEY, SETUP_RULE, setupRows } from '@/lib/studio-setup/model'
import { fetchSetupFacts } from '@/lib/studio-setup/queries'

/**
 * (pending modules S08) Settings › Studio's **Set up your studio** list — its record (`settings.studio_setup`), each write ONE statement on the
 * row so two tabs never undo each other: an Owner or an Admin hides it for themselves (Undo shows it again), and the list notes when it was
 * first seen with a step open and when it was first seen with every step done (after which it never shows by itself). The steps themselves
 * are never written here — each is done by its own page's record. The two notes revalidate nothing: the page on screen keeps what it drew.
 */

type Result = { ok: true } | { error: string }

async function runner(): Promise<{ id: string } | { error: string }> {
  const id = await sessionMemberId()
  const [m] = await db.select({ role: members.role }).from(members).where(eq(members.id, id)).limit(1)
  return runsStudio(m?.role) ? { id } : { error: SETUP_RULE }
}

/** `value` as the row's JSON, made first when the studio has none. */
const upsert = (expr: (v: SQL) => SQL, now: Date) =>
  db.insert(settings).values({ key: SETUP_KEY, value: expr(sql`'{}'`), updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value: expr(sql`${settings.value}`), updatedAt: now } })

/* a member's key inside `$.hidden` — quoted, so any id is one path step */
const hiddenPath = (id: string) => `$.hidden."${id.replace(/["\\]/g, '')}"`

/** Hide the list for the signed-in Owner or Admin. */
export async function hideStudioSetup(): Promise<Result> {
  const who = await runner()
  if ('error' in who) return who
  const now = new Date()
  await upsert((v) => sql`json_set(json_set(${v}, '$.hidden', json(coalesce(json_extract(${v}, '$.hidden'), '{}'))), ${hiddenPath(who.id)}, cast(${now.getTime()} as integer))`, now)
  revalidatePath('/settings')
  return { ok: true }
}

/** Show it again — the hide's Undo, and the asked-for list's "Show here again". */
export async function showStudioSetup(): Promise<Result> {
  const who = await runner()
  if ('error' in who) return who
  const now = new Date()
  await upsert((v) => sql`json_remove(${v}, ${hiddenPath(who.id)})`, now)
  revalidatePath('/settings')
  return { ok: true }
}

/** The list was seen with a step open — once (the first stamp stays). */
export async function noteSetupSeen(): Promise<Result> {
  const who = await runner()
  if ('error' in who) return who
  const now = new Date()
  await upsert((v) => sql`json_set(${v}, '$.seenOpenAt', coalesce(json_extract(${v}, '$.seenOpenAt'), cast(${now.getTime()} as integer)))`, now)
  return { ok: true }
}

/** Every step is done and the list has said so — the studio is set up; the list never shows by itself again. Checked on the records. */
export async function noteStudioSetUp(): Promise<Result> {
  const who = await runner()
  if ('error' in who) return who
  if (setupRows(await fetchSetupFacts()).some((r) => !r.done)) return { error: 'A step is still open' }
  const now = new Date()
  await upsert((v) => sql`json_set(${v}, '$.doneAt', coalesce(json_extract(${v}, '$.doneAt'), cast(${now.getTime()} as integer)))`, now)
  return { ok: true }
}
