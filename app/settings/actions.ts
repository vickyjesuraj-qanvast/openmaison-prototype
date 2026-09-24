'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { NUMBERING_KEY, QUOTE_APPROVAL_KEY, STAGE_MOVEMENT_KEY, TEMPLATE_APPROVAL_KEY, TRADES_KEY, QUOTE_RULES_KEY, fetchQuoteRules, LEAD_SOURCES_KEY, LEAD_VISIBILITY_KEY, LEAD_REASONS_KEY } from '@/lib/settings/queries'
import { parseNumbering, parseQuoteApproval, parseStageMovement, parseTemplateApproval, parseTrades, type Numbering, type QuoteApproval, type StageMovement, type TemplateApproval, parseQuoteRules, type QuoteRules, parseLeadSources, type LeadSourceEntry, parseLeadVisibility, type LeadVisibility, parseLeadReasons, type LeadReasons } from '@/lib/settings/types'

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

/** (REG-599) Settings › Leads › Lead sources: the whole list, written at once (add · reorder · retire · restore · remove). */
export async function setLeadSources(entries: LeadSourceEntry[]): Promise<LeadSourceEntry[]> {
  const clean = parseLeadSources(entries)
  await db.insert(settings).values({ key: LEAD_SOURCES_KEY, value: JSON.stringify(clean), updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(clean), updatedAt: new Date() } })
  revalidatePath('/settings')
  revalidatePath('/leads', 'layout')   // the lead form's and the filters' pickers read the list
  return clean
}

/** (REG-601) Settings › Leads › Who sees leads. */
export async function setLeadVisibility(mode: LeadVisibility): Promise<void> {
  const clean = parseLeadVisibility(mode)
  await db.insert(settings).values({ key: LEAD_VISIBILITY_KEY, value: JSON.stringify(clean), updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(clean), updatedAt: new Date() } })
  revalidatePath('/settings')
  revalidatePath('/leads', 'layout')
  revalidatePath('/tasks')
}

/** (REG-607) Settings › Leads › Reasons: the Lost and On Hold lists, written at once (add · retire · restore · remove, a contact gate on a Lost reason). */
export async function setLeadReasons(next: LeadReasons): Promise<LeadReasons> {
  const clean = parseLeadReasons(next)
  await db.insert(settings).values({ key: LEAD_REASONS_KEY, value: JSON.stringify(clean), updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(clean), updatedAt: new Date() } })
  revalidatePath('/settings')
  revalidatePath('/leads', 'layout')   // the On Hold / Lost dialogs read the lists
  return clean
}

/* (REG-612, parity Q-25) Settings › Leads › Custom fields — the list saved whole, as 1.0's `save_lead_custom_fields`: rows that left the
   list go (their values with them), the rest are written in the list's order. Owners and Admins only. */
export async function saveCustomFields(list: { id?: string | null; label: string; fieldType: string; options?: string[]; isRequired?: boolean; isActive?: boolean }[]): Promise<{ id: string; label: string }[]> {
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { runsStudio } = await import('@/lib/leads/assign-policy')
  const { leadCustomFields } = await import('@/lib/db/schema')
  const { isCustomFieldType, fieldNeedsOptions } = await import('@/lib/leads/custom-fields-model')
  const { randomUUID } = await import('node:crypto')
  const { eq, inArray, notInArray } = await import('drizzle-orm')
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) throw new Error('owners and admins only')
  const rows = list.slice(0, 30).map((f, i) => {
    const fieldType = isCustomFieldType(f.fieldType) ? f.fieldType : 'text'
    const options = fieldNeedsOptions(fieldType) ? [...new Set((f.options ?? []).map((o) => o.trim()).filter(Boolean))].slice(0, 20) : []
    const label = f.label.trim().slice(0, 60)
    if (!label) throw new Error('label')
    if (fieldNeedsOptions(fieldType) && !options.length) throw new Error('options')
    return { id: f.id || randomUUID(), label, fieldType, options: options.length ? JSON.stringify(options) : null, isRequired: !!f.isRequired, orderIndex: i, isActive: f.isActive !== false }
  })
  const keep = rows.map((r) => r.id)
  await db.transaction(async (tx) => {
    if (keep.length) await tx.delete(leadCustomFields).where(notInArray(leadCustomFields.id, keep)); else await tx.delete(leadCustomFields)
    const existing = keep.length ? (await tx.select({ id: leadCustomFields.id }).from(leadCustomFields).where(inArray(leadCustomFields.id, keep))).map((r) => r.id) : []
    for (const r of rows) {
      if (existing.includes(r.id)) await tx.update(leadCustomFields).set({ label: r.label, fieldType: r.fieldType, options: r.options, isRequired: r.isRequired, orderIndex: r.orderIndex, isActive: r.isActive }).where(eq(leadCustomFields.id, r.id))
      else await tx.insert(leadCustomFields).values({ ...r, createdAt: new Date() })
    }
  })
  revalidatePath('/settings'); revalidatePath('/leads', 'layout')
  return rows.map((r) => ({ id: r.id, label: r.label }))
}
