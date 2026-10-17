import 'server-only'
import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { and, desc, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import type { Client } from '@libsql/client'
import { demoDatabase, forgetStudioClient, openStudioUrl, schema, setOpenStudioUrl, studioClient } from '@/lib/db'
import { members, settings, studioInvitations } from '@/lib/db/schema'
import type { Contact } from '@/lib/auth/model'
import { parseStudio, shortStudioName } from '@/lib/settings/types'
import { DEMO_KEY, ORIGIN_KEY, isStudioKey, parseOrigin, type StudioOrigin } from './model'

/*
 * (pending modules S31 — her "build all of them" 2026-10-11; card onboarding:studio-sign-up) The studios on THIS PROTOTYPE: the demo's database
 * (DATABASE_URL) and the studios started here by signing up, each a database of its own in `<the demo's file>.studios/` (`<key>.db`) — so a
 * new studio never mixes with the demo's records and the demo's file is never written by one. One is open at a time (lib/db/index.ts):
 * signing up opens the new one, signing in with a studio's number opens that studio, the studio block's Studios group (demo only) switches,
 * and Reset prototype to base opens the demo and clears the studios started here. A remote database (Turso) has no folder beside it: there
 * signing up says the developers set studios up (their tenancy replaces all of this).
 */

/** Where this prototype keeps the studios started on it — beside the demo's database file; null for a remote database. */
export function studiosHome(): string | null {
  const u = demoDatabase.url
  if (!u.startsWith('file:')) return null
  const file = u.slice('file:'.length).split('?')[0]!
  return `${path.resolve(file)}.studios`
}
const fileOf = (home: string, key: string) => path.join(home, `${key}.db`)
export const studioUrlOf = (home: string, key: string) => `file:${fileOf(home, key)}`

/** The studio this server has open — its key, or DEMO_KEY. */
export function openStudioKey(): string {
  const u = openStudioUrl()
  return u ? path.basename(u.slice('file:'.length), '.db') : DEMO_KEY
}

/** The keys of the studios started on this prototype, oldest name first (no folder yet → none). */
export async function madeStudioKeys(): Promise<string[]> {
  const home = studiosHome()
  if (!home) return []
  try { return (await readdir(home)).filter((f) => f.endsWith('.db')).map((f) => f.slice(0, -3)).filter(isStudioKey).sort() }
  catch { return [] }
}

/** A studio's own client — the demo's for DEMO_KEY. */
function clientOf(key: string): Client | null {
  if (key === DEMO_KEY) return demoDatabase.client
  const home = studiosHome()
  return home && isStudioKey(key) ? studioClient(studioUrlOf(home, key)) : null
}
const dbOf = (c: Client) => drizzle(c, { schema })

/** Brings a studio's database up to this build's schema (additive migrations, once per process) — a studio started on an older build opens
    with every column the code reads. The demo's is migrated by `npm run dev` / the deploy. */
const migrated = ((globalThis as unknown as { __openmaisonStudiosMigrated?: Set<string> }).__openmaisonStudiosMigrated ??= new Set<string>())
export async function migrateStudio(c: Client, key: string): Promise<void> {
  if (migrated.has(key)) return
  await migrate(drizzle(c), { migrationsFolder: path.join(process.cwd(), 'drizzle') })
  migrated.add(key)
}

/** Open a studio on this server: the demo's (DEMO_KEY) or one started here. Answers false for a key this prototype doesn't hold. */
export async function openStudio(key: string): Promise<boolean> {
  if (key === DEMO_KEY) { setOpenStudioUrl(null); return true }
  const home = studiosHome()
  if (!home || !isStudioKey(key) || !(await madeStudioKeys()).includes(key)) return false
  const c = clientOf(key)!
  await migrateStudio(c, key)
  setOpenStudioUrl(studioUrlOf(home, key))
  return true
}

/** A studio as the menu and the sign-in page name it: its name, its first Owner, when it was made. */
export type StudioSummary = { key: string; name: string; owner: string | null; origin: StudioOrigin | null }
async function summaryOf(key: string): Promise<StudioSummary | null> {
  const c = clientOf(key)
  if (!c) return null
  try {
    const d = dbOf(c)
    const rows = await d.select({ key: settings.key, value: settings.value }).from(settings).where(sql`${settings.key} in ('studio', ${ORIGIN_KEY})`)
    const read = (k: string) => { const r = rows.find((x) => x.key === k); if (!r) return null; try { return JSON.parse(r.value) as unknown } catch { return null } }
    const origin = parseOrigin(read(ORIGIN_KEY))
    const [o] = origin ? await d.select({ name: members.name }).from(members).where(eq(members.id, origin.ownerId)).limit(1)
      : await d.select({ name: members.name }).from(members).where(and(eq(members.role, 'Owner'), eq(members.isActive, true))).limit(1)
    return { key, name: shortStudioName(parseStudio(read('studio')).name), owner: o?.name ?? null, origin }
  } catch { return null }   // a file that can't be read is not offered
}

/** Every studio on this prototype — the demo first, then the ones started here (in the order they were made) — or [] while none was. */
export async function prototypeStudios(): Promise<StudioSummary[]> {
  const keys = await madeStudioKeys()
  if (!keys.length) return []
  const all = await Promise.all([DEMO_KEY, ...keys].map(summaryOf))
  const [demo, ...made] = all
  return [...(demo ? [demo] : []), ...made.filter((s): s is StudioSummary => !!s).sort((a, b) => (a.origin?.madeAt ?? 0) - (b.origin?.madeAt ?? 0))]
}

/** Someone found in another of this prototype's studios by their mobile or email — what sign-in needs to refuse or to go on with the code. */
export type FoundElsewhere = { key: string; member: { id: string; isActive: boolean; welcomedAt: Date | null }; invitation: { status: string; expiresAt: Date } | null }
/** Whether a mobile number or an email belongs to a member of another studio on this prototype (the open one is asked by the caller) — the
    demo's included while a studio started here is open. Signing in there opens that studio. */
export async function findElsewhere(c: Contact): Promise<FoundElsewhere | null> {
  const open = openStudioKey()
  for (const key of [DEMO_KEY, ...(await madeStudioKeys())]) {
    if (key === open) continue
    const client = clientOf(key)
    if (!client) continue
    try {
      if (key !== DEMO_KEY) await migrateStudio(client, key)
      const d = dbOf(client)
      const cols = { id: members.id, isActive: members.isActive, welcomedAt: members.welcomedAt }
      const [m] = c.kind === 'phone'
        ? await d.select(cols).from(members).where(eq(members.phone, c.value)).limit(1)
        : await d.select(cols).from(members).where(sql`lower(${members.email}) = ${c.value}`).limit(1)
      if (!m) continue
      const [inv] = await d.select({ status: studioInvitations.status, expiresAt: studioInvitations.expiresAt }).from(studioInvitations)
        .where(eq(studioInvitations.memberId, m.id)).orderBy(desc(studioInvitations.createdAt)).limit(1)
      return { key, member: m, invitation: inv ?? null }
    } catch { /* a studio that can't be read is skipped */ }
  }
  return null
}

/** Reset prototype to base: the demo opens and the studios started here go (their files and their folder). */
export async function clearPrototypeStudios(): Promise<number> {
  setOpenStudioUrl(null)
  const home = studiosHome()
  if (!home) return 0
  const keys = await madeStudioKeys()
  for (const k of keys) { forgetStudioClient(studioUrlOf(home, k)); migrated.delete(k) }
  await rm(home, { recursive: true, force: true })
  return keys.length
}

/** A studio file that failed half-way through being made goes, with its journal. */
export async function dropStudioFile(home: string, key: string): Promise<void> {
  for (const f of [fileOf(home, key), `${fileOf(home, key)}-wal`, `${fileOf(home, key)}-shm`, `${fileOf(home, key)}-journal`]) await rm(f, { force: true })
}
