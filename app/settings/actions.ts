'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { NUMBERING_KEY, QUOTE_APPROVAL_KEY, STAGE_MOVEMENT_KEY, TEMPLATE_APPROVAL_KEY, TRADES_KEY, QUOTE_RULES_KEY, fetchQuoteRules } from '@/lib/settings/queries'
import { parseNumbering, parseQuoteApproval, parseStageMovement, parseTemplateApproval, parseTrades, type Numbering, type QuoteApproval, type StageMovement, type TemplateApproval, parseQuoteRules, type QuoteRules } from '@/lib/settings/types'

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

/** Settings › Leads › Template approval (REG-501). Refreshes the Company pages and the template editor's Publish. */
export async function setTemplateApproval(mode: TemplateApproval): Promise<void> {
  const value = JSON.stringify(parseTemplateApproval(mode))
  const now = new Date()
  await db.insert(settings).values({ key: TEMPLATE_APPROVAL_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/company', 'layout')
}

/** (REG-561) Settings › Quotes › Quote numbers: the pattern new quotes follow. Every list and editor prints numbers, so the leads layout refreshes. */
export async function setNumbering(n: Numbering): Promise<Numbering> {
  const clean = parseNumbering(n)
  const value = JSON.stringify(clean)
  const now = new Date()
  await db.insert(settings).values({ key: NUMBERING_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/leads', 'layout')
  return clean
}

/** (REG-561) Settings › Quotes › Trades: the managed list the Category column offers. */
export async function setTrades(trades: string[]): Promise<string[]> {
  const clean = parseTrades(trades)
  const value = JSON.stringify(clean)
  const now = new Date()
  await db.insert(settings).values({ key: TRADES_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/quotes', 'layout')
  return clean
}

/** (REG-584 · 589 · 590) Settings › Quotes › the studio's rules, one key; a patch merges over what is set. */
export async function setQuoteRules(patch: Partial<QuoteRules>): Promise<QuoteRules> {
  const clean = parseQuoteRules({ ...(await fetchQuoteRules()), ...patch })
  const value = JSON.stringify(clean)
  const now = new Date()
  await db.insert(settings).values({ key: QUOTE_RULES_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/quotes', 'layout')
  revalidatePath('/company', 'layout')
  return clean
}
