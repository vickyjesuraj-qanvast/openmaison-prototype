import { cache } from 'react'
import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { memberships, organizations, users } from '@/lib/db/schema'
import type { Membership, Organization, User } from '@/lib/db/schema'
import { readSessionCookie } from './session'

/**
 * Data Access Layer. Every server component / action asks *this* module who the
 * caller is — never the cookie directly — so the membership check happens in
 * exactly one place. `middleware.ts` only checks the cookie signature; it is a
 * redirect optimisation, not the authorisation boundary.
 */

export type AuthContext = {
  user: User
  organization: Organization
  membership: Membership
}

/** Deduped per request by React `cache`, so N components cost one query. */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const session = await readSessionCookie()
  if (!session) return null

  const [row] = await db
    .select({
      user: users,
      organization: organizations,
      membership: memberships,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        eq(memberships.userId, session.userId),
        eq(memberships.organizationId, session.organizationId),
      ),
    )
    .limit(1)

  // Membership revoked (or org deleted) since the cookie was issued.
  return row ?? null
})

export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext()
  if (!context) redirect('/login')
  return context
}

/**
 * Role-based access was REMOVED with the invented schema. Re-introduce it once
 * the mocks show what roles actually exist.
 */

/** Every organisation the current user belongs to — for the org switcher. */
export const listUserOrganizations = cache(async (): Promise<Organization[]> => {
  const session = await readSessionCookie()
  if (!session) return []

  const rows = await db
    .select({ organization: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, session.userId))

  return rows.map((row) => row.organization)
})
