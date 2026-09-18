import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { DEFAULT_QUOTE_APPROVAL, DEFAULT_STAGE_MOVEMENT, DEFAULT_STUDIO, DEFAULT_TEMPLATE_APPROVAL, parseQuoteApproval, parseStageMovement, parseStudio, parseTemplateApproval, type QuoteApproval, type StageMovement, type Studio, type TemplateApproval } from './types'

export const STAGE_MOVEMENT_KEY = 'stage_movement'

/** Studio setting; unset → linear (the default for new studios, user 2026-08-29). */
export async function fetchStageMovement(): Promise<StageMovement> {
  const [row] = await db.select().from(settings).where(eq(settings.key, STAGE_MOVEMENT_KEY)).limit(1)
  if (!row) return DEFAULT_STAGE_MOVEMENT
  try { return parseStageMovement(JSON.parse(row.value)) } catch { return DEFAULT_STAGE_MOVEMENT }
}

export const QUOTE_APPROVAL_KEY = 'quote_approval'

/** Studio setting; unset → approval required (the studio the mocks were drawn for, user 2026-08-30). */
export async function fetchQuoteApproval(): Promise<QuoteApproval> {
  const [row] = await db.select().from(settings).where(eq(settings.key, QUOTE_APPROVAL_KEY)).limit(1)
  if (!row) return DEFAULT_QUOTE_APPROVAL
  try { return parseQuoteApproval(JSON.parse(row.value)) } catch { return DEFAULT_QUOTE_APPROVAL }
}

export const STUDIO_KEY = 'studio'

/** The studio record (REG-415): name + GST registration; the row is seeded by scripts/repair-demo-data.ts R23. */
export async function fetchStudio(): Promise<Studio> {
  const [row] = await db.select().from(settings).where(eq(settings.key, STUDIO_KEY)).limit(1)
  if (!row) return DEFAULT_STUDIO
  try { return parseStudio(JSON.parse(row.value)) } catch { return DEFAULT_STUDIO }
}

export const TEMPLATE_APPROVAL_KEY = 'template_approval'

/** Studio setting (REG-501); unset → approval required. */
export async function fetchTemplateApproval(): Promise<TemplateApproval> {
  const [row] = await db.select().from(settings).where(eq(settings.key, TEMPLATE_APPROVAL_KEY)).limit(1)
  if (!row) return DEFAULT_TEMPLATE_APPROVAL
  try { return parseTemplateApproval(JSON.parse(row.value)) } catch { return DEFAULT_TEMPLATE_APPROVAL }
}
