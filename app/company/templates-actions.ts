'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { quoteItems, quotePayments, quoteTemplateVersions, quoteTemplates, quotes, settings } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { revalidateEveryLead } from '@/lib/leads/queries'
import { STUDIO_KEY, fetchTemplateApproval } from '@/lib/settings/queries'
import { members } from '@/lib/db/schema'
import { presetOf } from '@/lib/quotes/payments'
import { DEFAULT_DEFAULTS, isPaper, parseDefaults, parseDesign, type Paper, type TemplateDefaults, type TemplateDesign } from '@/lib/templates/model'
import { isPresetKey, presetByKey, type PresetKey } from '@/lib/templates/presets'
import { fallbackDesign, fetchQuoteDocData } from '@/lib/templates/queries'
import { clientViewDiff, clientViewFromDesign, type ClientView } from '@/lib/templates/client-view'
import { BRAND_KEY, parseBrandSetting, type BrandSetting } from '@/lib/templates/brand'
import type { DocData } from '@/lib/templates/data'

/* Company › Templates › Quote templates (REG-485 / REG-489): the template lifecycle — Draft → Published vN → Default —
   and the quote-side touchpoints (which template a quote prints through, at which version, with which client view). */

const ME = SESSION_MEMBER_ID
const touch = (templateId?: string) => {
  revalidatePath('/company', 'layout')
  if (templateId) revalidatePath(`/templates/${templateId}`)
  revalidatePath('/quotes', 'layout')
  revalidateEveryLead()
}
const touchQuote = (quoteId: string) => { revalidatePath(`/quotes/${quoteId}`); revalidatePath(`/quotes/${quoteId}/preview`); revalidatePath('/quotes'); revalidateEveryLead() }

async function templateRow(id: string) {
  const [row] = await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, id))
  if (!row) throw new Error('template not found')
  return row
}
const uniqueName = async (base: string) => {
  const names = new Set((await db.select({ name: quoteTemplates.name }).from(quoteTemplates)).map((r) => r.name.toLowerCase()))
  if (!names.has(base.toLowerCase())) return base
  let n = 2; while (names.has(`${base} ${n}`.toLowerCase())) n += 1
  return `${base} ${n}`
}

export type TemplateSource =
  | { kind: 'blank' }
  | { kind: 'preset'; key: PresetKey; sourceFile?: string }
  | { kind: 'quote'; quoteId: string; key?: PresetKey; sourceFile?: string }
  | { kind: 'template'; templateId: string }

/**
 * New template: a Draft from nothing, from a house style, from a quote ("Recreate from my current quote" — the curated match
 * plus the quote's own defaults) or as a copy of another template. Returns the new id; the editor opens on it.
 */
export async function createTemplate(input: { name?: string; source: TemplateSource }): Promise<string> {
  const now = new Date()
  let design: TemplateDesign
  let defaults: TemplateDefaults = { ...DEFAULT_DEFAULTS }
  let name = input.name?.trim() || 'Untitled template'
  let sourceFile: string | null = null
  const s = input.source
  if (s.kind === 'preset') { const p = presetByKey(s.key); design = p.design(); defaults = { ...p.defaults }; if (!input.name) name = p.name; sourceFile = s.sourceFile ?? null }
  else if (s.kind === 'quote') {
    const p = presetByKey(s.key && isPresetKey(s.key) ? s.key : 'letter'); design = p.design(); defaults = { ...p.defaults }
    const [q] = await db.select().from(quotes).where(eq(quotes.id, s.quoteId))
    if (q) {
      const pays = await db.select().from(quotePayments).where(eq(quotePayments.quoteId, q.id)).orderBy(quotePayments.position)
      defaults = { ...defaults, gstEnabled: q.gstEnabled, signatureRequired: q.clientSignatureRequired, paymentPreset: pays.length ? presetOf(pays) : defaults.paymentPreset }
      if (!input.name) name = `${q.title} template`
    }
    sourceFile = s.sourceFile ?? null
  } else if (s.kind === 'template') {
    const row = await templateRow(s.templateId)
    const draft = row.draftJson ? (JSON.parse(row.draftJson) as { design?: unknown; defaults?: unknown }) : null
    design = parseDesign(draft?.design ? JSON.stringify(draft.design) : row.designJson, fallbackDesign())
    defaults = parseDefaults(draft?.defaults ? JSON.stringify(draft.defaults) : row.defaultsJson)
    if (!input.name) name = `Copy of ${row.name}`
    sourceFile = row.sourceFile
  } else { design = presetByKey('letter').design(); design.blocks = design.blocks.filter((b) => b.kind === 'items' || b.kind === 'totals'); design.brand = {}; design.page = { paper: 'A4', margins: { top: 18, right: 18, bottom: 18, left: 18 }, watermark: '' } }
  const id = randomUUID()
  await db.insert(quoteTemplates).values({
    id, name: await uniqueName(name), kind: 'design', isDefault: false, createdAt: now, status: 'draft', version: 0, paper: design.page.paper,
    designJson: null, defaultsJson: null, draftJson: JSON.stringify({ design, defaults }), draftUpdatedAt: now, updatedAt: now, updatedBy: ME, sourceFile,
  })
  touch(id)
  return id
}

/** The editor's autosave: the working draft (design + defaults), the name and the paper. Never touches what is published. */
export async function saveTemplateDraft(id: string, patch: { design: TemplateDesign; defaults: TemplateDefaults; name?: string; paper?: Paper }): Promise<{ savedAt: number }> {
  await templateRow(id)
  const now = new Date()
  await db.update(quoteTemplates).set({
    draftJson: JSON.stringify({ design: patch.design, defaults: patch.defaults }), draftUpdatedAt: now, updatedAt: now, updatedBy: ME,
    ...(patch.name?.trim() ? { name: patch.name.trim() } : {}), ...(patch.paper && isPaper(patch.paper) ? { paper: patch.paper } : {}),
  }).where(eq(quoteTemplates.id, id))
  revalidatePath('/company', 'layout')
  return { savedAt: now.getTime() }
}

/** Discard the draft: a published template goes back to its published state; a never-published one is removed. */
export async function discardTemplateDraft(id: string): Promise<{ removed: boolean }> {
  const row = await templateRow(id)
  if (row.status === 'draft') { await db.delete(quoteTemplates).where(eq(quoteTemplates.id, id)); touch(); return { removed: true } }
  await db.update(quoteTemplates).set({ draftJson: null, draftUpdatedAt: null, updatedAt: new Date(), updatedBy: ME }).where(eq(quoteTemplates.id, id))
  touch(id)
  return { removed: false }
}

/**
 * Publish (REG-485): the draft becomes version n+1, a version row keeps it, the draft clears. `setDefault` makes it the
 * studio's default; `updateDrafts` re-pins every open Draft quote on this template to the new version (sent quotes stay
 * on the version they were sent with).
 */
export async function publishTemplate(id: string, opts: { note?: string; setDefault?: boolean; updateDrafts?: boolean } = {}): Promise<{ version: number }> {
  const row = await templateRow(id)
  const now = new Date()
  // (REG-501) With approval required, only an Owner or Admin publishes; a Designer submits (submitTemplate).
  const [approval, [me]] = await Promise.all([fetchTemplateApproval(), db.select({ role: members.role }).from(members).where(eq(members.id, ME))])
  if (approval === 'required' && !(me?.role === 'Owner' || me?.role === 'Admin')) throw new Error('approval required')
  let design: TemplateDesign, defaults: TemplateDefaults
  if (row.draftJson) {
    const j = JSON.parse(row.draftJson) as { design?: unknown; defaults?: unknown }
    design = parseDesign(JSON.stringify(j.design ?? null), parseDesign(row.designJson, fallbackDesign()))
    defaults = parseDefaults(JSON.stringify(j.defaults ?? null))
  } else { design = parseDesign(row.designJson, fallbackDesign()); defaults = parseDefaults(row.defaultsJson) }
  const version = (row.status === 'published' || row.status === 'archived' ? row.version : 0) + 1
  const note = opts.note?.trim() || row.submitNote?.trim() || (version === 1 ? 'First published' : '')
  // Publishing clears a pending submission: this IS the approval (REG-501).
  await db.update(quoteTemplates).set({ status: 'published', version, designJson: JSON.stringify(design), defaultsJson: JSON.stringify(defaults), draftJson: null, draftUpdatedAt: null, publishedAt: now, updatedAt: now, updatedBy: ME, paper: design.page.paper, note, submittedAt: null, submitNote: null, reviewNote: null }).where(eq(quoteTemplates.id, id))
  await db.insert(quoteTemplateVersions).values({ id: randomUUID(), templateId: id, version, designJson: JSON.stringify(design), defaultsJson: JSON.stringify(defaults), note, publishedAt: now, publishedBy: ME })
  if (opts.setDefault) { await db.update(quoteTemplates).set({ isDefault: false }); await db.update(quoteTemplates).set({ isDefault: true }).where(eq(quoteTemplates.id, id)) }
  if (opts.updateDrafts) await db.update(quotes).set({ templateVersion: version }).where(and(eq(quotes.templateId, id), eq(quotes.status, 'Draft'), isNull(quotes.deletedAt)))
  touch(id)
  return { version }
}

/** (REG-501) A Designer's Publish: the template waits for an Owner or Admin, with the designer's note on what changed. */
export async function submitTemplate(id: string, note: string): Promise<void> {
  await templateRow(id)
  await db.update(quoteTemplates).set({ submittedBy: ME, submittedAt: new Date(), submitNote: note.trim() || null, reviewNote: null, updatedAt: new Date(), updatedBy: ME }).where(eq(quoteTemplates.id, id))
  touch(id)
}

/** (REG-501) Request changes: the submission ends and the note waits at the top of the designer's editor until they submit again. */
export async function requestTemplateChanges(id: string, note: string): Promise<void> {
  await templateRow(id)
  await db.update(quoteTemplates).set({ submittedAt: null, reviewNote: note.trim() || 'Changes requested', updatedAt: new Date(), updatedBy: ME }).where(eq(quoteTemplates.id, id))
  touch(id)
}

/** History › Roll back: the chosen version is published again as a new version, so nothing is ever lost. */
export async function rollbackTemplate(id: string, version: number): Promise<{ version: number }> {
  const row = await templateRow(id)
  const [v] = await db.select().from(quoteTemplateVersions).where(and(eq(quoteTemplateVersions.templateId, id), eq(quoteTemplateVersions.version, version)))
  if (!v) throw new Error('version not found')
  const now = new Date()
  const next = row.version + 1
  const note = `Rolled back to v${version}`
  await db.update(quoteTemplates).set({ status: 'published', version: next, designJson: v.designJson, defaultsJson: v.defaultsJson, publishedAt: now, updatedAt: now, updatedBy: ME, note }).where(eq(quoteTemplates.id, id))
  await db.insert(quoteTemplateVersions).values({ id: randomUUID(), templateId: id, version: next, designJson: v.designJson, defaultsJson: v.defaultsJson, note, publishedAt: now, publishedBy: ME })
  touch(id)
  return { version: next }
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  const clean = name.trim()
  if (!clean) throw new Error('empty')
  await templateRow(id)
  await db.update(quoteTemplates).set({ name: clean, updatedAt: new Date(), updatedBy: ME }).where(eq(quoteTemplates.id, id))
  touch(id)
}

export async function setDefaultTemplate(id: string): Promise<void> {
  const row = await templateRow(id)
  if (row.status !== 'published' || row.deletedAt) throw new Error('not published')
  await db.update(quoteTemplates).set({ isDefault: false })
  await db.update(quoteTemplates).set({ isDefault: true }).where(eq(quoteTemplates.id, id))
  touch(id)
}

export async function duplicateTemplate(id: string): Promise<string> {
  return createTemplate({ source: { kind: 'template', templateId: id } })
}

/**
 * (REG-502) Delete is soft, as for leads and quotes: the template leaves every list and picker and waits under Deleted
 * templates with Restore; the quotes on it keep printing their pinned version. The default and a template awaiting
 * approval cannot be deleted.
 */
export async function deleteTemplate(id: string): Promise<void> {
  const row = await templateRow(id)
  if (row.isDefault) throw new Error('default')
  if (row.submittedAt) throw new Error('awaiting approval')
  await db.update(quoteTemplates).set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: ME }).where(eq(quoteTemplates.id, id))
  touch(id)
}
export async function restoreTemplate(id: string): Promise<void> {
  await templateRow(id)
  await db.update(quoteTemplates).set({ deletedAt: null, updatedAt: new Date(), updatedBy: ME }).where(eq(quoteTemplates.id, id))
  touch(id)
}
/** Delete forever: only once no live quote is on the template — they would lose what they print through. */
export async function deleteTemplateForever(id: string): Promise<void> {
  const row = await templateRow(id)
  if (!row.deletedAt) throw new Error('not deleted')
  const [uses] = await db.select({ n: sql<number>`count(*)` }).from(quotes).where(and(eq(quotes.templateId, id), isNull(quotes.deletedAt)))
  if ((uses?.n ?? 0) > 0) throw new Error('in use')
  await db.delete(quoteTemplates).where(eq(quoteTemplates.id, id))
  touch()
}

/* ── the quote side (REG-489 / REG-490) ── */

/** General Info › Template: the quote prints through this template from now on, pinned to its current version. */
export async function setQuoteTemplate(quoteId: string, templateId: string | null): Promise<void> {
  const [q] = await db.select({ id: quotes.id }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  let version: number | null = null
  if (templateId) { const t = await templateRow(templateId); if (t.deletedAt) throw new Error('deleted'); version = t.version }
  await db.update(quotes).set({ templateId, templateVersion: version, clientViewJson: null, updatedAt: new Date() }).where(eq(quotes.id, quoteId))
  if (templateId) await db.update(quoteTemplates).set({ lastUsedAt: new Date() }).where(eq(quoteTemplates.id, templateId))
  touchQuote(quoteId)
}

/** The banner's one click: the quote moves to the template's latest version. */
export async function updateQuoteTemplateVersion(quoteId: string): Promise<{ version: number }> {
  const [q] = await db.select({ templateId: quotes.templateId }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q?.templateId) throw new Error('no template')
  const t = await templateRow(q.templateId)
  await db.update(quotes).set({ templateVersion: t.version, updatedAt: new Date() }).where(eq(quotes.id, quoteId))
  touchQuote(quoteId)
  return { version: t.version }
}

/** Preview › "What your client sees": this quote's switches, stored as the difference from the template's own view. */
export async function saveQuoteClientView(quoteId: string, view: ClientView | null, design: TemplateDesign): Promise<void> {
  const [q] = await db.select({ id: quotes.id }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  const base = clientViewFromDesign(design)
  const json = view && clientViewDiff(view, base).length ? JSON.stringify(view) : null
  await db.update(quotes).set({ clientViewJson: json }).where(eq(quotes.id, quoteId))
  touchQuote(quoteId)
}

/** Quote editor › ⋯ › Save as template: a Draft template from the quote's own settings (its house style is the default's). */
export async function saveQuoteAsTemplate(quoteId: string, name: string): Promise<string> {
  const [q] = await db.select({ templateId: quotes.templateId }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  if (q.templateId) {
    const row = await templateRow(q.templateId)
    const now = new Date()
    const id = randomUUID()
    const design = parseDesign(row.designJson, fallbackDesign())
    const [pays, quote] = await Promise.all([db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(quotePayments.position), db.select().from(quotes).where(eq(quotes.id, quoteId))])
    const defaults: TemplateDefaults = { ...parseDefaults(row.defaultsJson), gstEnabled: quote[0]?.gstEnabled ?? true, signatureRequired: quote[0]?.clientSignatureRequired ?? true, paymentPreset: pays.length ? presetOf(pays) : 'default' }
    await db.insert(quoteTemplates).values({ id, name: await uniqueName(name.trim() || 'Untitled template'), kind: 'design', isDefault: false, createdAt: now, status: 'draft', version: 0, paper: design.page.paper, draftJson: JSON.stringify({ design, defaults }), draftUpdatedAt: now, updatedAt: now, updatedBy: ME })
    touch(id)
    return id
  }
  return createTemplate({ name, source: { kind: 'quote', quoteId } })
}

/** Editor › ⋯ › Match an existing template: the reference file this template is being rebuilt from (REG-491). */
export async function setTemplateSource(id: string, sourceFile: string | null): Promise<void> {
  await templateRow(id)
  await db.update(quoteTemplates).set({ sourceFile, updatedAt: new Date(), updatedBy: ME }).where(eq(quoteTemplates.id, id))
  touch(id)
}

/** The editor's "Preview with" picker: one quote's document data. */
export async function loadQuoteDocData(quoteId: string): Promise<DocData | null> {
  return fetchQuoteDocData(quoteId)
}

/** Company › Profile: the brand kit and the company details every template prints. */
export async function saveBrand(setting: BrandSetting): Promise<void> {
  const clean = parseBrandSetting(setting)
  const now = new Date()
  await db.insert(settings).values({ key: BRAND_KEY, value: JSON.stringify(clean), updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(clean), updatedAt: now } })
  // The studio record (settings key `studio`, REG-415) owns the name and phone the quote editor prints: keep it in step.
  const [studioRow] = await db.select().from(settings).where(eq(settings.key, STUDIO_KEY)).limit(1)
  let studio: Record<string, unknown> = {}
  if (studioRow) { try { studio = JSON.parse(studioRow.value) as Record<string, unknown> } catch { studio = {} } }
  const studioValue = JSON.stringify({ ...studio, name: clean.details.name, phone: clean.details.phone })
  await db.insert(settings).values({ key: STUDIO_KEY, value: studioValue, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value: studioValue, updatedAt: now } })
  touch()
  revalidatePath('/settings')
}

/** (REG-492) A line marked optional prints in its own section and stays out of the totals. */
export async function setItemOptional(quoteId: string, itemId: string, optional: boolean): Promise<void> {
  await db.update(quoteItems).set({ optional }).where(and(eq(quoteItems.id, itemId), eq(quoteItems.quoteId, quoteId)))
  touchQuote(quoteId)
}
