import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { DEFAULT_STAGE_MOVEMENT, parseStageMovement, type StageMovement } from './types'

export const STAGE_MOVEMENT_KEY = 'stage_movement'

/** Studio setting; unset → linear (the default for new studios, user 2026-08-29). */
export async function fetchStageMovement(): Promise<StageMovement> {
  const [row] = await db.select().from(settings).where(eq(settings.key, STAGE_MOVEMENT_KEY)).limit(1)
  if (!row) return DEFAULT_STAGE_MOVEMENT
  try { return parseStageMovement(JSON.parse(row.value)) } catch { return DEFAULT_STAGE_MOVEMENT }
}
