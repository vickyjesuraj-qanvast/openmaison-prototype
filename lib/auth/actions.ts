'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { memberships, users } from '@/lib/db/schema'
import { signInSchema, toFieldErrors, type ActionState } from '@/lib/validation'
import { verifyPassword } from './password'
import { clearSessionCookie, createSessionCookie } from './session'

/**
 * Sign-in / sign-out plumbing. Sign-up was REMOVED along with the invented
 * trial + plan logic; rebuild it from the mocks once the real flow is known.
 *
 * The post-login destination is deliberately unset — it must come from the
 * mocks, not from a guess.
 */

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) }
  }

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1)

  // Same message either way so the form can't be used to enumerate accounts.
  const invalid: ActionState = { ok: false, message: 'Incorrect email or password' }
  if (!user) return invalid
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return invalid

  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id))
    .limit(1)

  if (!membership) return { ok: false, message: 'This account is not part of any workspace yet.' }

  await createSessionCookie(user.id, membership.organizationId)
  return { ok: true }
}

export async function signOut(): Promise<void> {
  await clearSessionCookie()
  redirect('/')
}
