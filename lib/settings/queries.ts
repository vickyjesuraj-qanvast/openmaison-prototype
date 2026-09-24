import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { DEFAULT_LEAD_SOURCES, parseLeadSources, type LeadSourceEntry, DEFAULT_LEAD_VISIBILITY, parseLeadVisibility, type LeadVisibility, DEFAULT_LEAD_CAPTURE, parseLeadCapture, type LeadCapture, DEFAULT_LEAD_REASONS, parseLeadReasons, type LeadReasons } from '@/lib/settings/types'
import { quoteItems, settings } from '@/lib/db/schema'
import { DEFAULT_NUMBERING, DEFAULT_QUOTE_APPROVAL, DEFAULT_QUOTE_RULES, DEFAULT_STAGE_MOVEMENT, DEFAULT_STUDIO, DEFAULT_TEMPLATE_APPROVAL, parseNumbering, parseQuoteApproval, parseQuoteRules, parseStageMovement, parseStudio, parseTemplateApproval, parseTrades, type Numbering, type QuoteApproval, type QuoteRules, type StageMovement, type Studio, type TemplateApproval } from './types'

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

export const NUMBERING_KEY = 'quote_numbering'

/** (REG-561) The studio's quote-number pattern; unset → the seed's OM-nnnnn. */
export async function fetchNumbering(): Promise<Numbering> {
  const [row] = await db.select().from(settings).where(eq(settings.key, NUMBERING_KEY)).limit(1)
  if (!row) return DEFAULT_NUMBERING
  try { return parseNumbering(JSON.parse(row.value)) } catch { return DEFAULT_NUMBERING }
}

export const TRADES_KEY = 'trades'

/** (REG-561) The studio's trades; unset → the categories its quotes already use, so nothing is invented for the demo. */
export async function fetchTrades(): Promise<{ trades: string[]; managed: boolean }> {
  const [row] = await db.select().from(settings).where(eq(settings.key, TRADES_KEY)).limit(1)
  if (row) { try { const t = parseTrades(JSON.parse(row.value)); return { trades: t, managed: true } } catch { /* fall through to the quotes' own */ } }
  const used = await db.select({ category: quoteItems.category }).from(quoteItems).where(and(isNotNull(quoteItems.category), eq(quoteItems.kind, 'item')))
  return { trades: [...new Set(used.map((u) => u.category!).filter(Boolean))].sort((a, b) => a.localeCompare(b)), managed: false }
}

export const QUOTE_RULES_KEY = 'quote_rules'

/** (REG-584 · 589 · 590) The studio's quote rules; unset → none of them on. */
export async function fetchQuoteRules(): Promise<QuoteRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, QUOTE_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_QUOTE_RULES
  try { return parseQuoteRules(JSON.parse(row.value)) } catch { return DEFAULT_QUOTE_RULES }
}

/** (REG-590) Who may approve a quote or a template: an Owner, an Admin, or the studio's backup approver. */
export async function isApprover(memberId: string | null | undefined, role: string | null | undefined): Promise<boolean> {
  if (role === 'Owner' || role === 'Admin') return true
  if (!memberId) return false
  const rules = await fetchQuoteRules()
  return rules.backupApproverId !== null && rules.backupApproverId === memberId
}

export const LEAD_SOURCES_KEY = 'lead_sources'
/** (REG-599) The studio's lead sources; `managed` false = the defaults, nothing saved yet. */
export async function fetchLeadSources(): Promise<{ sources: LeadSourceEntry[]; managed: boolean }> {
  const [row] = await db.select().from(settings).where(eq(settings.key, LEAD_SOURCES_KEY)).limit(1)
  if (!row) return { sources: DEFAULT_LEAD_SOURCES, managed: false }
  try { return { sources: parseLeadSources(JSON.parse(row.value)), managed: true } } catch { return { sources: DEFAULT_LEAD_SOURCES, managed: false } }
}

export const LEAD_VISIBILITY_KEY = 'lead_visibility'
/** (REG-601) Who sees which leads. */
export async function fetchLeadVisibility(): Promise<LeadVisibility> {
  const [row] = await db.select().from(settings).where(eq(settings.key, LEAD_VISIBILITY_KEY)).limit(1)
  if (!row) return DEFAULT_LEAD_VISIBILITY
  try { return parseLeadVisibility(JSON.parse(row.value)) } catch { return DEFAULT_LEAD_VISIBILITY }
}

export const LEAD_CAPTURE_KEY = 'lead_capture'
/** (REG-602) The website's intake address and the Meta connection. */
export async function fetchLeadCapture(): Promise<LeadCapture> {
  const [row] = await db.select().from(settings).where(eq(settings.key, LEAD_CAPTURE_KEY)).limit(1)
  if (!row) return DEFAULT_LEAD_CAPTURE
  try { return parseLeadCapture(JSON.parse(row.value)) } catch { return DEFAULT_LEAD_CAPTURE }
}

export const LEAD_REASONS_KEY = 'lead_reasons'
/** (REG-607) The Lost and On Hold reasons the dialogs offer; `managed` false = the defaults, nothing saved yet. */
export async function fetchLeadReasons(): Promise<{ reasons: LeadReasons; managed: boolean }> {
  const [row] = await db.select().from(settings).where(eq(settings.key, LEAD_REASONS_KEY)).limit(1)
  if (!row) return { reasons: DEFAULT_LEAD_REASONS, managed: false }
  try { return { reasons: parseLeadReasons(JSON.parse(row.value)), managed: true } } catch { return { reasons: DEFAULT_LEAD_REASONS, managed: false } }
}
