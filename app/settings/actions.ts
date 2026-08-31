'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { QUOTE_APPROVAL_KEY, STAGE_MOVEMENT_KEY } from '@/lib/settings/queries'
import { parseQuoteApproval, parseStageMovement, type QuoteApproval, type StageMovement } from '@/lib/settings/types'

/** Settings › Leads › Stage movement. Upserts the studio setting and refreshes every screen that moves stages. */
export async function setStageMovement(mode: StageMovement): Promise<void> {
  const value = JSON.stringify(parseStageMovement(mode))
  const now = new Date()
  await db.insert(settings).values({ key: STAGE_MOVEMENT_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/leads')
}

/**
 * Settings › Leads › Quote approval. Upserts the studio setting and refreshes every screen that lists quote statuses —
 * the Quotes tab's row menu and filters, and the Overview QUOTES widget's track (a layout revalidate: the lead detail
 * routes are nested under /leads).
 */
export async function setQuoteApproval(mode: QuoteApproval): Promise<void> {
  const value = JSON.stringify(parseQuoteApproval(mode))
  const now = new Date()
  await db.insert(settings).values({ key: QUOTE_APPROVAL_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/leads', 'layout')
}
