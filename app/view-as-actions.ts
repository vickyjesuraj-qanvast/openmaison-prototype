'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'

/**
 * (REG-667, user-directed 2026-09-25 for the UAT) Demo Studio › View as: the prototype becomes this member — which leads they
 * see, what they may do, whose bell, whose name on what they do. It moves the `is_you` flag lib/db/session.ts reads, so every
 * page and action follows at once; "Reset prototype to base" puts it back on Dane. Demo only — the product has sign-in.
 */
export async function viewAs(memberId: string): Promise<{ error?: string; name?: string; role?: string }> {
  const [m] = await db.select({ id: members.id, name: members.name, role: members.role, isActive: members.isActive }).from(members).where(eq(members.id, memberId))
  if (!m) return { error: 'That member is no longer in the studio.' }
  if (!m.isActive) return { error: `${m.name} is deactivated — reactivate them in Company › Members first.` }
  await db.transaction(async (tx) => {
    await tx.update(members).set({ isYou: false }).where(eq(members.isYou, true))
    await tx.update(members).set({ isYou: true }).where(eq(members.id, m.id))
  })
  revalidatePath('/', 'layout')
  return { name: m.name, role: m.role }
}
