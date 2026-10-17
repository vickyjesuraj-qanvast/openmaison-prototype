'use server'

import { requirePlan } from '@/lib/credits/plan-gate'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { fetchLeadStageRules, LEAD_STAGE_RULES_KEY } from '@/lib/settings/queries'
import { parseLeadStageRules, type LeadStageRules } from '@/lib/settings/types'
import { fetchStudio, STUDIO_KEY, NUMBERING_KEY, QUOTE_APPROVAL_KEY, STAGE_MOVEMENT_KEY, TEMPLATE_APPROVAL_KEY, TRADES_KEY, TRADE_NOTES_KEY, QUOTE_RULES_KEY, fetchQuoteRules, LEAD_SOURCES_KEY, LEAD_VISIBILITY_KEY, LEAD_REASONS_KEY } from '@/lib/settings/queries'
import { cleanGstPct, parseStudio, type Studio, parseNumbering, parseQuoteApproval, parseStageMovement, parseTemplateApproval, parseTrades, parseTradeNotes, tradeKey, type Numbering, type QuoteApproval, type StageMovement, type TemplateApproval, parseQuoteRules, type QuoteRules, parseLeadSources, type LeadSourceEntry, parseLeadVisibility, type LeadVisibility, parseLeadReasons, type LeadReasons } from '@/lib/settings/types'

/** (REG-624, quote editor parity §8.2 · E-135) The studio's settings are changed by its Owners and Admins only — the page reads the same rule
    (`canManage`) and shows the rest read-only; a public endpoint must not take the page's word for it. */
async function assertRunsStudio(): Promise<void> {
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { runsStudio } = await import('@/lib/leads/assign-policy')
  if (!runsStudio((await fetchViewer()).role)) throw new Error('owners and admins only')
}
/** (S44O — call C6, her UAT ask 2026-10-15) Settings › Lead management is the lead set-up — Owners, Admins and Marketing change it (the page
    reads the same rule, `runsLeadSetup`). */
async function assertRunsLeadSetup(): Promise<void> {
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { runsLeadSetup } = await import('@/lib/settings/roles')
  if (!runsLeadSetup((await fetchViewer()).role)) throw new Error('owners, admins and marketing only')
}

/** Settings › Leads › Stage movement. Upserts the studio setting and refreshes every screen that moves stages. */
/** (pending modules S05) Settings › Lead management › Lead stages: what a stage asks for — written whole from a patch; Owners and Admins. */
export async function setLeadStageRules(patch: Partial<LeadStageRules>): Promise<LeadStageRules> {
  await assertRunsLeadSetup()   // (S44O — C6)
  { const lock = await requirePlan('custom_stages'); if (lock) throw new Error(lock.error) }   // (pending modules S19) Lead stage rules are Pro
  const next = parseLeadStageRules({ ...(await fetchLeadStageRules()), ...(patch && typeof patch === 'object' ? patch : {}) })
  const value = JSON.stringify(next)
  const now = new Date()
  await db.insert(settings).values({ key: LEAD_STAGE_RULES_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/leads', 'layout')
  return next
}

export async function setStageMovement(mode: StageMovement): Promise<void> {
  await assertRunsLeadSetup()   // (S44O — C6)
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
  await assertRunsStudio()
  { const lock = await requirePlan('internal_approvals'); if (lock) throw new Error(lock.error) }   // (pending modules S19) approvals are Pro
  const value = JSON.stringify(parseQuoteApproval(mode))
  const now = new Date()
  await db.insert(settings).values({ key: QUOTE_APPROVAL_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/leads', 'layout')
}

/** Settings › Leads › Template approval (REG-501). Refreshes the Company pages and the template editor's Publish. */
export async function setTemplateApproval(mode: TemplateApproval): Promise<void> {
  await assertRunsStudio()
  { const lock = await requirePlan('internal_approvals'); if (lock) throw new Error(lock.error) }   // (pending modules S19) approvals are Pro
  const value = JSON.stringify(parseTemplateApproval(mode))
  const now = new Date()
  await db.insert(settings).values({ key: TEMPLATE_APPROVAL_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  revalidatePath('/company', 'layout')
}

/** (REG-561) Settings › Quotes › Quote numbers: the pattern new quotes follow. Every list and editor prints numbers, so the leads layout refreshes. */
export async function setNumbering(n: Numbering): Promise<Numbering> {
  await assertRunsStudio()
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
  await assertRunsStudio()
  const clean = parseTrades(trades)
  const value = JSON.stringify(clean)
  const now = new Date()
  await db.insert(settings).values({ key: TRADES_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  // (REG-617) A removed trade takes its note with it — a section named like it would otherwise keep printing the note.
  const notes = await readTradeNotes()
  const keep = new Set(clean.map(tradeKey))
  if (Object.keys(notes).some((k) => !keep.has(k))) await writeTradeNotes(Object.fromEntries(Object.entries(notes).filter(([k]) => keep.has(k))))
  revalidatePath('/settings')
  revalidatePath('/quotes', 'layout')
  return clean
}

async function readTradeNotes(): Promise<Record<string, string>> {
  const [row] = await db.select().from(settings).where(eq(settings.key, TRADE_NOTES_KEY)).limit(1)
  if (!row) return {}
  try { return parseTradeNotes(JSON.parse(row.value)) } catch { return {} }
}
async function writeTradeNotes(notes: Record<string, string>) {
  const value = JSON.stringify(parseTradeNotes(notes))
  const now = new Date()
  await db.insert(settings).values({ key: TRADE_NOTES_KEY, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
}

/** (REG-617, parity Q-08) Settings › Quotes › Trades: the note a trade's section prints when the quote writes none of its own. Empty removes it. */
export async function setTradeNote(trade: string, note: string): Promise<Record<string, string>> {
  await assertRunsStudio()
  const key = tradeKey(trade)
  if (!key) return readTradeNotes()
  const notes = await readTradeNotes()
  const text = note.trim().slice(0, 600)
  if (text) notes[key] = text; else delete notes[key]
  await writeTradeNotes(notes)
  revalidatePath('/settings')
  revalidatePath('/quotes', 'layout')
  revalidatePath('/templates', 'layout')
  revalidatePath('/company', 'layout')
  revalidatePath('/leads', 'layout')
  return parseTradeNotes(notes)
}

/** (REG-584 · 589 · 590) Settings › Quotes › the studio's rules, one key; a patch merges over what is set. */
export async function setQuoteRules(patch: Partial<QuoteRules>): Promise<QuoteRules> {
  await assertRunsStudio()
  if (patch && 'backupApproverId' in patch) { const lock = await requirePlan('internal_approvals'); if (lock) throw new Error(lock.error) }   // (pending modules S19) the backup approver is an approval's
  /* (REG-646, settings parity Q-07 · E-108) The backup approver is an active member who is neither an Owner nor an Admin — the select's own rule, held here too. */
  if (patch.backupApproverId) {
    const { members } = await import('@/lib/db/schema')
    const [m] = await db.select({ role: members.role, isActive: members.isActive }).from(members).where(eq(members.id, patch.backupApproverId))
    if (!m || !m.isActive || m.role === 'Owner' || m.role === 'Admin') throw new Error('not a backup approver')
  }
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

/** (REG-645, settings parity Q-05) The studio's GST: whether the studio charges GST, and the rate a new line starts with.
    Quotes already written keep their lines' rates; the letterhead prints the studio's GST number only while it is registered.
    (one-home N-13) The registration is written from Company › Profile — the studio's own issuing entity's switch, saved with the company
    details — and the rate from Settings › Quotes & pricing; both into this one record (settings `studio`), which every reader reads unchanged. */
export async function setStudioGst(patch: { gstRegistered?: boolean; gstPct?: number }): Promise<Studio> {
  await assertRunsStudio()
  const current = await fetchStudio()
  const next = parseStudio({ ...current, ...(patch.gstRegistered === undefined ? {} : { gstRegistered: !!patch.gstRegistered }), ...(patch.gstPct === undefined ? {} : { gstPct: cleanGstPct(patch.gstPct) }) })
  const value = JSON.stringify(next)
  const now = new Date()
  await db.insert(settings).values({ key: STUDIO_KEY, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  for (const p of ['/quotes', '/leads', '/company', '/templates', '/contracts']) revalidatePath(p, 'layout')
  return next
}

/** (REG-599) Settings › Leads › Lead sources: the whole list, written at once (add · reorder · retire · restore · remove). */
export async function setLeadSources(entries: LeadSourceEntry[]): Promise<LeadSourceEntry[]> {
  await assertRunsLeadSetup()   // (S44O — C6)
  const clean = parseLeadSources(entries)
  await db.insert(settings).values({ key: LEAD_SOURCES_KEY, value: JSON.stringify(clean), updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(clean), updatedAt: new Date() } })
  revalidatePath('/settings')
  revalidatePath('/leads', 'layout')   // the lead form's and the filters' pickers read the list
  return clean
}

/** (REG-601) Settings › Leads › Who sees leads. */
export async function setLeadVisibility(mode: LeadVisibility): Promise<void> {
  await assertRunsStudio()
  const clean = parseLeadVisibility(mode)
  await db.insert(settings).values({ key: LEAD_VISIBILITY_KEY, value: JSON.stringify(clean), updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(clean), updatedAt: new Date() } })
  revalidatePath('/settings')
  revalidatePath('/leads', 'layout')
  revalidatePath('/tasks')
}

/** (REG-607) Settings › Leads › Reasons: the Lost and On Hold lists, written at once (add · retire · restore · remove, a contact gate on a Lost reason). */
export async function setLeadReasons(next: LeadReasons): Promise<LeadReasons> {
  await assertRunsLeadSetup()   // (S44O — C6)
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
  if (!runsStudio(viewer.role) && viewer.role !== 'Marketing') throw new Error('owners and admins only')   // (S44O — C6) the lead set-up is Marketing's too
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

/* ── (REG-647, settings parity Q-09) Renaming a list's entry carries every record that holds the old name — 1.0 made a new row and left
   the leads, the logs and the price book on the old word (B-23, C-07). The order is the list's own, written whole by the setters above. */
const LIST_NAME = /^[^\x00-\x1f]{1,40}$/
async function renameIn<T extends { name: string }>(list: T[], from: string, to: string): Promise<T[]> {
  const name = to.trim().replace(/\s+/g, ' ')
  if (!LIST_NAME.test(name)) throw new Error('name')
  if (list.some((x) => x.name !== from && x.name.toLowerCase() === name.toLowerCase())) throw new Error('taken')
  if (!list.some((x) => x.name === from)) throw new Error('not found')
  return list.map((x) => (x.name === from ? { ...x, name } : x))
}
/** A lead source renamed: the leads carrying it, and a webhook labelled with it, follow. */
export async function renameLeadSource(from: string, to: string): Promise<LeadSourceEntry[]> {
  await assertRunsLeadSetup()   // (S44O — C6)
  const { fetchLeadSources } = await import('@/lib/settings/queries')
  const next = await renameIn((await fetchLeadSources()).sources, from, to)
  const name = to.trim().replace(/\s+/g, ' ')
  const { leads } = await import('@/lib/db/schema')
  await db.update(leads).set({ source: name }).where(eq(leads.source, from))
  const { fetchLeadCapture, LEAD_CAPTURE_KEY } = await import('@/lib/settings/queries')
  const cap = await fetchLeadCapture()
  if (cap.webhooks.some((w) => w.label === from)) {
    const value = JSON.stringify({ ...cap, webhooks: cap.webhooks.map((w) => (w.label === from ? { ...w, label: name } : w)) })
    await db.insert(settings).values({ key: LEAD_CAPTURE_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  }
  const saved = await setLeadSources(next)
  revalidatePath('/company/integrations')
  return saved
}
/** A Lost or On Hold reason renamed — and a Lost reason's contact gate set or cleared: the parking logs that carry it follow. */
export async function editLeadReason(kind: 'lost' | 'hold', from: string, patch: { name?: string; minContacts?: number }): Promise<LeadReasons> {
  await assertRunsLeadSetup()   // (S44O — C6)
  const { fetchLeadReasons } = await import('@/lib/settings/queries')
  const cur = (await fetchLeadReasons()).reasons
  let list = cur[kind]
  if (patch.name !== undefined && patch.name.trim() !== from) list = await renameIn(list, from, patch.name)
  const name = patch.name !== undefined ? patch.name.trim().replace(/\s+/g, ' ') : from
  if (kind === 'lost' && patch.minContacts !== undefined) {
    const gate = Math.max(0, Math.min(20, Math.floor(Number(patch.minContacts) || 0)))
    list = list.map((r) => { if (r.name !== name) return r; const { minContacts: _drop, ...rest } = r; void _drop; return gate > 0 ? { ...rest, minContacts: gate } : rest })
  }
  if (name !== from) {
    const { stageLogs } = await import('@/lib/db/schema')
    const { sql, and } = await import('drizzle-orm')
    await db.update(stageLogs).set({ payload: sql`json_set(${stageLogs.payload}, '$.reason', ${name})` })
      .where(and(eq(stageLogs.toStage, kind === 'lost' ? 'Lost' : 'On Hold'), sql`json_extract(${stageLogs.payload}, '$.reason') = ${from}`))
  }
  return setLeadReasons({ ...cur, [kind]: list })
}
/** A trade renamed: the quote lines filed under it, the price book's items and its note follow. */
export async function renameTrade(from: string, to: string): Promise<{ trades: string[]; notes: Record<string, string> }> {
  await assertRunsStudio()
  const { fetchTrades } = await import('@/lib/settings/queries')
  const named = await renameIn((await fetchTrades()).trades.map((t) => ({ name: t })), from, to)
  const name = to.trim().replace(/\s+/g, ' ')
  const { quoteItems, priceBookItems, priceBookSections } = await import('@/lib/db/schema')
  const { sql } = await import('drizzle-orm')
  /* (REG-651, price book parity Q-07) Whatever the case it was typed in — and My Sections' lines, which carry the trade into every insert. */
  await db.update(quoteItems).set({ category: name }).where(sql`lower(${quoteItems.category}) = lower(${from})`)
  await db.update(priceBookItems).set({ category: name }).where(sql`lower(${priceBookItems.category}) = lower(${from})`)
  const same = (c: unknown) => typeof c === 'string' && c.trim().toLowerCase() === from.trim().toLowerCase()
  for (const sec of await db.select({ id: priceBookSections.id, linesJson: priceBookSections.linesJson }).from(priceBookSections)) {
    try {
      const body = JSON.parse(sec.linesJson) as { lines?: { category?: unknown }[]; subs?: { lines?: { category?: unknown }[] }[] }
      let hit = false
      for (const l of [...(body.lines ?? []), ...(body.subs ?? []).flatMap((g) => g.lines ?? [])]) if (same(l.category)) { l.category = name; hit = true }
      if (hit) await db.update(priceBookSections).set({ linesJson: JSON.stringify(body) }).where(eq(priceBookSections.id, sec.id))
    } catch { /* an unreadable section is left as it is */ }
  }
  /* (S45B · H-UHD-2) a contractor's trades and their places on projects follow the rename (the trades are the studio's one list) */
  {
    const { vendors, projectContractors } = await import('@/lib/db/schema')
    const { parseCrewTrades } = await import('@/lib/projects/contractors-model')
    await db.update(vendors).set({ trade: name }).where(sql`lower(${vendors.trade}) = lower(${from})`)
    await db.update(projectContractors).set({ trade: name }).where(sql`lower(${projectContractors.trade}) = lower(${from})`)
    for (const v of await db.select({ id: vendors.id, tradesJson: vendors.tradesJson }).from(vendors).where(sql`${vendors.tradesJson} IS NOT NULL`)) {
      const list = parseCrewTrades(v.tradesJson)
      if (list.some(same)) await db.update(vendors).set({ tradesJson: JSON.stringify(parseCrewTrades(list.map((t) => (same(t) ? name : t)))) }).where(eq(vendors.id, v.id))
    }
    revalidatePath('/projects', 'layout'); revalidatePath('/company/finance', 'layout')
  }
  const notes = await readTradeNotes()
  if (tradeKey(from) !== tradeKey(name) && notes[tradeKey(from)]) { notes[tradeKey(name)] = notes[tradeKey(from)]!; delete notes[tradeKey(from)]; await writeTradeNotes(notes) }
  const trades = await setTrades(named.map((x) => x.name))
  revalidatePath('/company/price-book'); revalidatePath('/leads', 'layout')
  return { trades, notes: parseTradeNotes(await readTradeNotes()) }
}

/** (REG-651, price book parity Q-07) Categories an import brings that the studio doesn't list join its trades — said on the import's
    preview; the list is written whole (the derived list first when it was never saved). Owners and Admins only, like every setter. */
export async function addTrades(names: string[]): Promise<string[]> {
  await assertRunsStudio()
  const { fetchTrades } = await import('@/lib/settings/queries')
  const cur = (await fetchTrades()).trades
  const have = new Set(cur.map((t) => t.toLowerCase()))
  const add = [...new Set(names.map((n) => n.trim().replace(/\s+/g, ' ')).filter((n) => n && !have.has(n.toLowerCase())))]
  return add.length ? setTrades([...cur, ...add]) : cur
}

/** (REG-921, Projects round 1) Settings › Projects › Project numbers — the pattern new projects take (the quotes' numbering model). */
export async function setProjectNumbering(n: unknown): Promise<import('@/lib/projects/model').ProjectNumbering | { error: string }> {
  /* (fix-E, E-30) a refusal is the rule in words — the house `{ error }` — where a throw read "please try again" */
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { runsStudio } = await import('@/lib/leads/assign-policy')
  if (!runsStudio((await fetchViewer()).role)) { const { SETTINGS_RULE } = await import('@/lib/projects/handover-model'); return { error: SETTINGS_RULE } }
  const { parseProjectNumbering, PROJECT_NUMBERING_KEY } = await import('@/lib/projects/model')
  const clean = parseProjectNumbering(n)
  const value = JSON.stringify(clean)
  const now = new Date()
  await db.insert(settings).values({ key: PROJECT_NUMBERING_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings')
  return clean
}

/**
 * (pending modules S03 — Settings › Quotes & pricing › Contracts, the target of the Contracts list's "Contracts Settings") How long a
 * contract's signing link stays open after each send or reminder: 7 days (1.0's, the default) · 14 · 30. Links already out keep the day
 * they were given; the next send or reminder uses the new length. Owners and Admins only.
 */
export async function setContractRules(rules: { linkDays: number }): Promise<{ linkDays: number } | { error: string }> {
  try { await assertRunsStudio() } catch { return { error: 'Only an Owner or an Admin changes the studio’s settings' } }
  const { CONTRACT_RULES_KEY, parseContractRules } = await import('@/lib/contracts/link')
  const next = parseContractRules(rules)
  const value = JSON.stringify(next), now = new Date()
  await db.insert(settings).values({ key: CONTRACT_RULES_KEY, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings'); revalidatePath('/contracts')
  return next
}

/**
 * (pending modules S41b-1 — 1.0's Cost & Margin Visibility, `PUT /api/studio-config/cost-visibility`) Settings › Roles & access › Who sees costs
 * and margins: one role's switch, merged into the stored value. The Owner's alone (1.0: "the API refuses non-owner saves") — anyone else is
 * answered with the rule. Every page that shows a cost reads the setting on its next request, so the paths below are refreshed whole.
 */
export async function setCostVisibility(patch: { role: string; on: boolean }): Promise<{ visibility: import('@/lib/settings/cost-visibility').CostVisibility } | { error: string }> {
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { changesCostVisibility, COST_ROLES, COST_VISIBILITY_KEY, COST_VISIBILITY_RULE, storedCostVisibility } = await import('@/lib/settings/cost-visibility')
  const { fetchCostVisibility } = await import('@/lib/settings/queries')
  if (!changesCostVisibility((await fetchViewer()).role)) return { error: COST_VISIBILITY_RULE }
  const role = (COST_ROLES as readonly string[]).find((r) => r === patch?.role) as (typeof COST_ROLES)[number] | undefined
  if (!role || typeof patch?.on !== 'boolean') return { error: 'Pick a role and whether it sees costs' }
  const next = { ...(await fetchCostVisibility()), [role]: patch.on }
  const value = JSON.stringify(storedCostVisibility(next))
  const now = new Date()
  await db.insert(settings).values({ key: COST_VISIBILITY_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/', 'layout')   // every quote, the price book, Finance, Reports, the Dashboard — each reads the switch on its next request
  return { visibility: next }
}

/* ── (S44I — M9, UAT rows 350 · 325; as recommended, her ask 2026-10-15) Settings › Quotes & pricing › Units — the Trades card's rules ── */
/** The studio's unit list, written whole (add · remove · move). Owners and Admins only, as every setter here. */
export async function setUnits(units: string[]): Promise<string[]> {
  await assertRunsStudio()
  const { UNITS_KEY, parseUnits } = await import('@/lib/settings/units')
  const clean = parseUnits(units)
  const value = JSON.stringify(clean)
  const now = new Date()
  await db.insert(settings).values({ key: UNITS_KEY, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  revalidatePath('/settings'); revalidatePath('/quotes', 'layout'); revalidatePath('/company/price-book', 'layout')
  return clean
}
/** (S44I — M9, with S44P's "New category…" as the pattern: `addTrade` in ./trades-actions.ts) "New unit…" at the foot of the Price book item
    dialog's Unit list: the name joins the studio's units — said back with the list, or the rule that refused it (`{ error }`, the house rule). */
export async function addUnit(typed: string): Promise<{ units: string[]; name: string } | { error: string }> {
  const { fetchViewer } = await import('@/lib/leads/visibility')
  const { runsStudio } = await import('@/lib/leads/assign-policy')
  const { UNITS_FULL, UNITS_MAX, UNITS_RULE } = await import('@/lib/settings/units')
  const { listedAs } = await import('@/lib/settings/trades')
  const { fetchUnits } = await import('@/lib/settings/queries')
  if (!runsStudio((await fetchViewer()).role)) return { error: UNITS_RULE }
  const name = (typeof typed === 'string' ? typed : '').trim().replace(/\s+/g, ' ')
  if (!name) return { error: 'A unit needs a name' }
  if (!/^[^\x00-\x1f]{1,40}$/.test(name)) return { error: 'A unit takes up to 40 letters' }
  const cur = (await fetchUnits()).units
  const taken = listedAs(cur, name); if (taken) return { error: taken }
  if (cur.length >= UNITS_MAX) return { error: UNITS_FULL }
  const units = await setUnits([...cur, name])
  return { units, name }
}
/** A unit renamed: the quote lines that carry it (any case), the Price book's items and My Sections' lines follow — as a trade's do (REG-647).
    Refused as `{ error }` when another unit already has the name. */
export async function renameUnit(from: string, to: string): Promise<{ units: string[] } | { error: string }> {
  await assertRunsStudio()
  const { fetchUnits } = await import('@/lib/settings/queries')
  const name = to.trim().replace(/\s+/g, ' ')
  const cur = (await fetchUnits()).units
  const { listedAs } = await import('@/lib/settings/trades')   // (S44P — M14) one wording for a name already in a list
  const other = listedAs(cur, name, from)
  if (other) return { error: other }
  let named: { name: string }[]
  try { named = await renameIn(cur.map((u) => ({ name: u })), from, name) } catch { return { error: 'A unit takes up to 40 letters' } }
  const { quoteItems, priceBookItems, priceBookSections } = await import('@/lib/db/schema')
  const { sql } = await import('drizzle-orm')
  await db.update(quoteItems).set({ unit: name }).where(sql`lower(${quoteItems.unit}) = lower(${from})`)
  await db.update(priceBookItems).set({ unit: name }).where(sql`lower(${priceBookItems.unit}) = lower(${from})`)
  const same = (u: unknown) => typeof u === 'string' && u.trim().toLowerCase() === from.trim().toLowerCase()
  for (const sec of await db.select({ id: priceBookSections.id, linesJson: priceBookSections.linesJson }).from(priceBookSections)) {
    try {
      const body = JSON.parse(sec.linesJson) as { lines?: { unit?: unknown }[]; subs?: { lines?: { unit?: unknown }[] }[] }
      let hit = false
      for (const l of [...(body.lines ?? []), ...(body.subs ?? []).flatMap((g) => g.lines ?? [])]) if (same(l.unit)) { l.unit = name; hit = true }
      if (hit) await db.update(priceBookSections).set({ linesJson: JSON.stringify(body) }).where(eq(priceBookSections.id, sec.id))
    } catch { /* an unreadable section is left as it is */ }
  }
  const units = await setUnits(named.map((x) => x.name))
  revalidatePath('/leads', 'layout')
  return { units }
}
