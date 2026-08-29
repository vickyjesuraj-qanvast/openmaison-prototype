'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { STAGE_MOVEMENT_KEY } from '@/lib/settings/queries'
import { parseStageMovement, type StageMovement } from '@/lib/settings/types'

/** Settings › Leads › Stage movement. Upserts the studio setting and refreshes every screen that moves stages. */
export async function setStageMovement(mode: StageMovement): Promise<void> {
  const value = JSON.stringify(parseStageMovement(mode))
  const now = new Date()
  await db.insert(settings).values({ key: STAGE_MOVEMENT_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/leads')
}
