import 'server-only'
import { cache } from 'react'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'

/**
 * WHO IS WRITING (REG-286) — the one stand-in for the signed-in user until auth exists.
 *
 * The prototype has no sessions: the signed-in member is the row in `members` that carries `is_you` — Dane, the studio
 * owner, in the base state. (REG-667) Demo Studio › View as moves that flag to another member, so every read (which
 * leads you see, what you may do, whose bell) and every write stamp (who created, sent, deleted) follows the member
 * being viewed; "Reset prototype to base" puts it back on Dane. Each tester runs their own local.db, so the flag is
 * theirs alone.
 *
 * Resolve the real session member here (and nowhere else) when authentication lands.
 */
export const SESSION_MEMBER_ID = 'dane'   // who you are when no member carries the flag

/** The signed-in member's id — read once per request. */
export const sessionMemberId = cache(async (): Promise<string> => {
  const [m] = await db.select({ id: members.id }).from(members).where(eq(members.isYou, true)).limit(1)
  return m?.id ?? SESSION_MEMBER_ID
})

/** The same, as a SQL value — for an insert inside a transaction, where a read through `db` must not run. */
export const sessionMemberSql = sql<string>`coalesce((select ${members.id} from ${members} where ${members.isYou} = 1 limit 1), ${SESSION_MEMBER_ID})`

/** (REG-667) A member as Demo Studio › View as lists them. */
export type SessionMember = { id: string; name: string; role: string; color: string; isYou: boolean; reportsTo: string | null }

/** (REG-667) The studio's active members for the View as menu — Owners first, then Admins, Managers, Designers. */
export async function fetchSessionTeam(): Promise<SessionMember[]> {
  const rows = await db.select({ id: members.id, name: members.name, role: members.role, color: members.color, isYou: members.isYou, managerId: members.managerId, isActive: members.isActive })
    .from(members).orderBy(asc(members.name))
  const byId = new Map(rows.map((m) => [m.id, m.name]))
  const rank: Record<string, number> = { Owner: 0, Admin: 1, Manager: 2, Designer: 3 }
  return rows.filter((m) => m.isActive || m.isYou)
    .map((m) => ({ id: m.id, name: m.name, role: m.role, color: m.color, isYou: m.isYou, reportsTo: m.managerId ? byId.get(m.managerId) ?? null : null }))
    .sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.name.localeCompare(b.name))
}
