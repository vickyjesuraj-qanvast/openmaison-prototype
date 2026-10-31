'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { quoteItems, quotePayments, quoteTemplateVersions, quoteTemplates, quoteTextTemplates, quotes, settings } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { revalidateEveryLead } from '@/lib/leads/queries'
import { STUDIO_KEY, fetchTemplateApproval, isApprover } from '@/lib/settings/queries'
import { fetchViewer } from '@/lib/leads/visibility'
import { changeBlock, defaultBlock } from '@/lib/company/template-guard'
import { landingFolder } from '@/lib/company/folder-landing'
import { BRAND_RULE, TEMPLATE_AWAITING_DELETE_RULE, TEMPLATE_DEFAULT_DELETE_RULE, TEMPLATE_DELETED_LINE, TEMPLATE_GONE_LINE, TEMPLATE_IN_USE_RULE, TEMPLATE_PUBLISH_RULE, TEMPLATE_REVIEW_RULE, TEMPLATE_UNPUBLISHED_RULE, refuse, templateChangeBlock, type Refusal } from '@/lib/company/template-rules'
import { findSplit, presetOf } from '@/lib/quotes/payments'
import { fetchPaymentSplits } from '@/lib/company/payment-templates'
import { createPaymentTemplate } from '@/app/company/payment-templates-actions'
import { DEFAULT_DEFAULTS, isPaper, parseDefaults, parseDesign, type Paper, type TemplateDefaults, type TemplateDesign } from '@/lib/templates/model'
import { isPresetKey, presetByKey, type PresetKey } from '@/lib/templates/presets'
import { applyReading, parseReading, type Reading } from '@/lib/templates/recreate'
import { fallbackDesign } from '@/lib/templates/queries'
import { carryClientView, clientViewChoices, clientViewFromDesign, type ClientView } from '@/lib/templates/client-view'
import { BRAND_KEY, parseBrandSetting, type BrandSetting } from '@/lib/templates/brand'
import { reviewLinkProblem } from '@/lib/company/review-link'   // (pending modules S14)
import type { DocData } from '@/lib/templates/data'
import { requirePlan } from '@/lib/credits/plan-gate'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule
import { deskRefusal, offDesk } from '@/lib/quotes/desk'   // (S45C) the editors' role rule (S44Z)
import { orThrow } from '@/lib/company/template-rules'   // (S45C) a refused action's rule becomes the caller's "Couldn’t …"
import { SIGNED_TEMPLATE_RULE, keepsItsTemplate } from '@/lib/quotes/policy'   // (the close-out round 2026-10-31) a signed quote keeps its paper

/* Company › Templates › Quote templates (REG-485 / REG-489): the template lifecycle — Draft → Published vN → Default —
   and the quote-side touchpoints (which template a quote prints through, at which version, with which client view). */

/* (REG-667 · pending modules S43A) Every write stamp is the signed-in member — this browser's (`sessionMemberId()`), passed in as a value. */
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
/* (wave E, E7) The library's actions answer a refusal — the rule, or a template gone from under a stale page — as `{ error }`. */
const findTemplate = async (id: string) => (await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, id)))[0] ?? null
const uniqueName = async (base: string) => {
  const names = new Set((await db.select({ name: quoteTemplates.name }).from(quoteTemplates)).map((r) => r.name.toLowerCase()))
  if (!names.has(base.toLowerCase())) return base
  let n = 2; while (names.has(`${base} ${n}`.toLowerCase())) n += 1
  return `${base} ${n}`
}

/* (pending modules S19 — 1.0's plan gating: "Template editor: authoring and choosing are locked") the studio's own quote templates are Pro:
   on Free nothing here makes, changes, picks or removes one — a quote keeps printing as it does (its pinned version, or the default) */
const tplLock = (): Promise<Refusal | null> => requirePlan('template_editor')
async function tplOrThrow(): Promise<void> { const l = await requirePlan('template_editor'); if (l) throw new Error(l.error) }

export type TemplateSource =
  | { kind: 'blank' }
  | { kind: 'preset'; key: PresetKey; sourceFile?: string; /** (pending modules S11) what reading the uploaded quote found */ reading?: Reading }
  | { kind: 'quote'; quoteId: string; key?: PresetKey; sourceFile?: string }
  | { kind: 'template'; templateId: string }

/**
 * New template: a Draft from nothing, from a house style, from a quote ("Recreate from my current quote" — the curated match
 * plus the quote's own defaults) or as a copy of another template. Returns the new id; the editor opens on it.
 */
export async function createTemplate(input: { name?: string; source: TemplateSource
  /** (Dane UAT 3.03) The folder open in the gallery — the new template is filed there when its maker may file a quote template (an Owner or
      an Admin: a quote template keeps no author); else it lands at the top of Quotes. */
  folderId?: string | null }): Promise<string | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  await tplOrThrow()
  const now = new Date()
  let design: TemplateDesign
  let defaults: TemplateDefaults = { ...DEFAULT_DEFAULTS }
  let name = input.name?.trim() || 'Untitled template'
  let sourceFile: string | null = null
  const s = input.source
  if (s.kind === 'preset') {
    const p = presetByKey(s.key)
    /* (pending modules S11) "Upload my existing quote": the reading's paper, columns, grouping, grand total and validity laid on the house style */
    const read = applyReading(p.design(), { ...p.defaults }, parseReading(s.reading))
    design = read.design; defaults = read.defaults; if (!input.name) name = p.name; sourceFile = s.sourceFile ?? null
  }
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
  } else {
    /* (Figma 1546:28, Dane UAT g-blank) A blank template keeps the Letter design's header and footer too — the letterhead and the signatures a
       quote always carries — with its Items table and Totals; the rest of the page is the studio's to add. */
    design = presetByKey('letter').design(); design.blocks = design.blocks.filter((b) => b.kind === 'header' || b.kind === 'items' || b.kind === 'totals' || b.kind === 'footer'); design.brand = {}; design.page = { paper: 'A4', margins: { top: 18, right: 18, bottom: 18, left: 18 }, watermark: '', dateFormat: 'short' }
  }
  const id = randomUUID()
  const { folderId } = await landingFolder('quotes', input.folderId, templateChangeBlock(await fetchViewer(), undefined))
  await db.insert(quoteTemplates).values({
    id, name: await uniqueName(name), kind: 'design', isDefault: false, createdAt: now, status: 'draft', version: 0, paper: design.page.paper,
    designJson: null, defaultsJson: null, draftJson: JSON.stringify({ design, defaults }), draftUpdatedAt: now, updatedAt: now, updatedBy: await sessionMemberId(), sourceFile, folderId,
  })
  touch(id)
  return id
}

/** The editor's autosave: the working draft (design + defaults), the name and the paper. Never touches what is published.
    (REG-577) A draft that equals the published design and defaults is no draft and is stored as none: the autosave timer that
    fires after Publish (it races the flush Publish does) used to leave "Unpublished changes" on a template nobody had edited. */
export async function saveTemplateDraft(id: string, patch: { design: TemplateDesign; defaults: TemplateDefaults; name?: string; paper?: Paper }): Promise<{ savedAt: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  await tplOrThrow()
  const row = await templateRow(id)
  const now = new Date()
  const canon = (d: TemplateDesign) => JSON.stringify(parseDesign(JSON.stringify(d), fallbackDesign()))
  const same = row.status !== 'draft'
    && canon(patch.design) === canon(parseDesign(row.designJson, fallbackDesign()))
    && JSON.stringify(parseDefaults(JSON.stringify(patch.defaults))) === JSON.stringify(parseDefaults(row.defaultsJson))
  await db.update(quoteTemplates).set({
    /* (S44T — handed over by S44Q) the draft is stored as read back — a Text block's words through the house allowlist (`parseDesign`) */
    draftJson: same ? null : JSON.stringify({ design: parseDesign(JSON.stringify(patch.design), patch.design), defaults: patch.defaults }), draftUpdatedAt: same ? null : now, updatedAt: now, updatedBy: await sessionMemberId(),
    ...(patch.name?.trim() ? { name: patch.name.trim() } : {}), ...(patch.paper && isPaper(patch.paper) ? { paper: patch.paper } : {}),
  }).where(eq(quoteTemplates.id, id))
  revalidatePath('/company', 'layout')
  return { savedAt: now.getTime() }
}

/** Discard the draft: a published template goes back to its published state; a never-published one is removed. */
export async function discardTemplateDraft(id: string): Promise<{ removed: boolean } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  await tplOrThrow()
  const row = await templateRow(id)
  if (row.status === 'draft') { await db.delete(quoteTemplates).where(eq(quoteTemplates.id, id)); touch(); return { removed: true } }
  await db.update(quoteTemplates).set({ draftJson: null, draftUpdatedAt: null, updatedAt: new Date(), updatedBy: await sessionMemberId() }).where(eq(quoteTemplates.id, id))
  touch(id)
  return { removed: false }
}

/**
 * Publish (REG-485): the draft becomes version n+1, a version row keeps it, the draft clears. `setDefault` makes it the
 * studio's default; `updateDrafts` re-pins every open Draft quote on this template to the new version (sent quotes stay
 * on the version they were sent with).
 */
export async function publishTemplate(id: string, opts: { note?: string; setDefault?: boolean; updateDrafts?: boolean } = {}): Promise<{ version: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const row = await findTemplate(id)
  if (!row) return refuse(TEMPLATE_GONE_LINE)
  if (row.deletedAt) return refuse(TEMPLATE_DELETED_LINE)   // (REG-502) a deleted template cannot publish — the client flag was the only guard
  const now = new Date()
  // (REG-501) With approval required, only an Owner or Admin publishes; a Designer submits (submitTemplate). (REG-646) The signed-in member's role decides.
  const [approval, viewer] = await Promise.all([fetchTemplateApproval(), fetchViewer()])
  if (approval === 'required' && !(await isApprover(viewer.id, viewer.role))) return refuse(TEMPLATE_PUBLISH_RULE)   // (REG-590) the backup approver may publish too
  let design: TemplateDesign, defaults: TemplateDefaults
  if (row.draftJson) {
    const j = JSON.parse(row.draftJson) as { design?: unknown; defaults?: unknown }
    design = parseDesign(JSON.stringify(j.design ?? null), parseDesign(row.designJson, fallbackDesign()))
    defaults = parseDefaults(JSON.stringify(j.defaults ?? null))
  } else { design = parseDesign(row.designJson, fallbackDesign()); defaults = parseDefaults(row.defaultsJson) }
  const version = (row.status === 'published' || row.status === 'archived' ? row.version : 0) + 1
  const note = opts.note?.trim() || row.submitNote?.trim() || (version === 1 ? 'First published' : '')
  // Publishing clears a pending submission: this IS the approval (REG-501).
  await db.update(quoteTemplates).set({ status: 'published', version, designJson: JSON.stringify(design), defaultsJson: JSON.stringify(defaults), draftJson: null, draftUpdatedAt: null, publishedAt: now, updatedAt: now, updatedBy: await sessionMemberId(), paper: design.page.paper, note, submittedAt: null, submitNote: null, reviewNote: null }).where(eq(quoteTemplates.id, id))
  await db.insert(quoteTemplateVersions).values({ id: randomUUID(), templateId: id, version, designJson: JSON.stringify(design), defaultsJson: JSON.stringify(defaults), note, publishedAt: now, publishedBy: await sessionMemberId() })
  if (opts.setDefault) { await db.update(quoteTemplates).set({ isDefault: false }); await db.update(quoteTemplates).set({ isDefault: true }).where(eq(quoteTemplates.id, id)) }
  if (opts.updateDrafts) await db.update(quotes).set({ templateVersion: version }).where(and(eq(quotes.templateId, id), eq(quotes.status, 'Draft'), isNull(quotes.deletedAt)))
  touch(id)
  return { version }
}

/** (REG-501) A Designer's Publish: the template waits for an Owner or Admin, with the designer's note on what changed. */
export async function submitTemplate(id: string, note: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const row = await findTemplate(id)
  if (!row) return refuse(TEMPLATE_GONE_LINE)
  if (row.deletedAt) return refuse(TEMPLATE_DELETED_LINE)
  await db.update(quoteTemplates).set({ submittedBy: await sessionMemberId(), submittedAt: new Date(), submitNote: note.trim() || null, reviewNote: null, updatedAt: new Date(), updatedBy: await sessionMemberId() }).where(eq(quoteTemplates.id, id))
  touch(id)
}

/** (REG-501) Request changes: the submission ends and the note waits at the top of the designer's editor until they submit again. */
export async function requestTemplateChanges(id: string, note: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const viewer = await fetchViewer()
  if (!(await isApprover(viewer.id, viewer.role))) return refuse(TEMPLATE_REVIEW_RULE)   // (REG-646, E-87) only an approver answers a submission
  if (!(await findTemplate(id))) return refuse(TEMPLATE_GONE_LINE)
  await db.update(quoteTemplates).set({ submittedAt: null, reviewNote: note.trim() || 'Changes requested', updatedAt: new Date(), updatedBy: await sessionMemberId() }).where(eq(quoteTemplates.id, id))
  touch(id)
}

/** History › Roll back: the chosen version is published again as a new version, so nothing is ever lost. */
export async function rollbackTemplate(id: string, version: number): Promise<{ version: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const row = await findTemplate(id)
  if (!row) return refuse(TEMPLATE_GONE_LINE)
  if (row.deletedAt) return refuse(TEMPLATE_DELETED_LINE)
  // (REG-501) A rollback publishes: under approval it is an Owner's / Admin's move, exactly like Publish.
  const [approval, viewer] = await Promise.all([fetchTemplateApproval(), fetchViewer()])
  if (approval === 'required' && !(await isApprover(viewer.id, viewer.role))) return refuse(TEMPLATE_PUBLISH_RULE)   // (REG-590) the backup approver may publish too
  const [v] = await db.select().from(quoteTemplateVersions).where(and(eq(quoteTemplateVersions.templateId, id), eq(quoteTemplateVersions.version, version)))
  if (!v) throw new Error('version not found')
  const now = new Date()
  const next = row.version + 1
  const note = `Rolled back to v${version}`
  await db.update(quoteTemplates).set({ status: 'published', version: next, designJson: v.designJson, defaultsJson: v.defaultsJson, draftJson: null, draftUpdatedAt: null, submittedBy: null, submittedAt: null, submitNote: null, reviewNote: null, publishedAt: now, updatedAt: now, updatedBy: await sessionMemberId(), note }).where(eq(quoteTemplates.id, id))
  await db.insert(quoteTemplateVersions).values({ id: randomUUID(), templateId: id, version: next, designJson: v.designJson, defaultsJson: v.defaultsJson, note, publishedAt: now, publishedBy: await sessionMemberId() })
  touch(id)
  return { version: next }
}

export async function renameTemplate(id: string, name: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const block = await changeBlock(undefined); if (block) return refuse(block)   // (REG-646) a quote template keeps no author: Owners and Admins
  const clean = name.trim()
  if (!clean) return refuse('Give the template a name')
  if (!(await findTemplate(id))) return refuse(TEMPLATE_GONE_LINE)
  await db.update(quoteTemplates).set({ name: clean, updatedAt: new Date(), updatedBy: await sessionMemberId() }).where(eq(quoteTemplates.id, id))
  touch(id)
}

export async function setDefaultTemplate(id: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const block = await defaultBlock(); if (block) return refuse(block)   // (REG-646) what every Blank Quote starts with is the Owners' and Admins' call
  const row = await findTemplate(id)
  if (!row) return refuse(TEMPLATE_GONE_LINE)
  if (row.status !== 'published' || row.deletedAt) return refuse(TEMPLATE_UNPUBLISHED_RULE)
  await db.update(quoteTemplates).set({ isDefault: false })
  await db.update(quoteTemplates).set({ isDefault: true }).where(eq(quoteTemplates.id, id))
  touch(id)
}

export async function duplicateTemplate(id: string): Promise<string | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  await tplOrThrow()
  return createTemplate({ source: { kind: 'template', templateId: id } })
}

/**
 * (REG-502) Delete is soft, as for leads and quotes: the template leaves every list and picker and waits under Deleted
 * templates with Restore; the quotes on it keep printing their pinned version. The default and a template awaiting
 * approval cannot be deleted.
 */
export async function deleteTemplate(id: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const block = await changeBlock(undefined); if (block) return refuse(block)
  const row = await findTemplate(id)
  if (!row) return refuse(TEMPLATE_GONE_LINE)
  if (row.isDefault) return refuse(TEMPLATE_DEFAULT_DELETE_RULE)
  if (row.submittedAt) return refuse(TEMPLATE_AWAITING_DELETE_RULE)
  await db.update(quoteTemplates).set({ deletedAt: new Date(), deletedBy: await sessionMemberId(), updatedAt: new Date(), updatedBy: await sessionMemberId() }).where(eq(quoteTemplates.id, id))   // (REG-538) deletedBy: the sheet's "Deleted by"
  touch(id)
}
export async function restoreTemplate(id: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const block = await changeBlock(undefined); if (block) return refuse(block)
  if (!(await findTemplate(id))) return refuse(TEMPLATE_GONE_LINE)
  await db.update(quoteTemplates).set({ deletedAt: null, updatedAt: new Date(), updatedBy: await sessionMemberId() }).where(eq(quoteTemplates.id, id))
  touch(id)
}
/** Delete forever: only once no live quote is on the template — they would lose what they print through. */
export async function deleteTemplateForever(id: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const block = await changeBlock(undefined); if (block) return refuse(block)
  const row = await findTemplate(id)
  if (!row) return refuse(TEMPLATE_GONE_LINE)
  if (!row.deletedAt) return refuse('Delete it first — only a deleted template can go for good')
  const [uses] = await db.select({ n: sql<number>`count(*)` }).from(quotes).where(and(eq(quotes.templateId, id), isNull(quotes.deletedAt), isNull(quotes.archivedAt)))   // the gallery's usedBy predicate: live, unarchived quotes
  if ((uses?.n ?? 0) > 0) return refuse(TEMPLATE_IN_USE_RULE)
  await db.delete(quoteTemplates).where(eq(quoteTemplates.id, id))
  touch()
}

/* ── the quote side (REG-489 / REG-490) ── */

/** (S44Q — row 352) The design a quote prints through: its template at the pinned version (the latest when none or newer), or the default's. */
async function printedDesign(templateId: string | null, version: number | null): Promise<TemplateDesign> {
  const [row] = templateId ? await db.select().from(quoteTemplates).where(eq(quoteTemplates.id, templateId))
    : await db.select().from(quoteTemplates).where(and(eq(quoteTemplates.isDefault, true), eq(quoteTemplates.status, 'published'), isNull(quoteTemplates.deletedAt)))
  if (!row) return fallbackDesign()
  if (version && version < row.version) {
    const [v] = await db.select({ designJson: quoteTemplateVersions.designJson }).from(quoteTemplateVersions).where(and(eq(quoteTemplateVersions.templateId, row.id), eq(quoteTemplateVersions.version, version)))
    if (v) return parseDesign(v.designJson, fallbackDesign())
  }
  return parseDesign(row.designJson, fallbackDesign())
}

/** General Info › Template: the quote prints through this template from now on, pinned to its current version.
    (S44Q — row 352) What the quote changed in "What your client sees" comes along wherever it still applies — re-picking used to wipe it. */
export async function setQuoteTemplate(quoteId: string, templateId: string | null): Promise<void | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S45C) the editors' role rule (S44Z) — before anything is read
  await tplOrThrow()
  const [q] = await db.select({ id: quotes.id, status: quotes.status, templateId: quotes.templateId, templateVersion: quotes.templateVersion, clientViewJson: quotes.clientViewJson }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  if (keepsItsTemplate(q.status)) return refuse(SIGNED_TEMPLATE_RULE)   // (the close-out round 2026-10-31) the Template card's test, kept here too: a page left open while the quote was signed can't change its paper
  let version: number | null = null
  if (templateId) { const t = await templateRow(templateId); if (t.deletedAt) throw new Error('deleted'); if (t.status !== 'published') throw new Error('unpublished'); version = t.version }
  const clientViewJson = q.clientViewJson ? carryClientView(q.clientViewJson, await printedDesign(q.templateId, q.templateVersion), await printedDesign(templateId, version)) : null
  await db.update(quotes).set({ templateId, templateVersion: version, clientViewJson, updatedAt: new Date() }).where(eq(quotes.id, quoteId))
  if (templateId) await db.update(quoteTemplates).set({ lastUsedAt: new Date() }).where(eq(quoteTemplates.id, templateId))
  touchQuote(quoteId)
}

/** The banner's one click: the quote moves to the template's latest version. */
export async function updateQuoteTemplateVersion(quoteId: string): Promise<{ version: number } | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S45C) the editors' role rule (S44Z) — before anything is read
  await tplOrThrow()
  const [q] = await db.select({ templateId: quotes.templateId, templateVersion: quotes.templateVersion, status: quotes.status, clientViewJson: quotes.clientViewJson }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q?.templateId) throw new Error('no template')
  if (q.status !== 'Draft') throw new Error('only a draft moves version')   // (REG-579) a sent quote keeps the version it was sent with — the publish dialog's promise
  const t = await templateRow(q.templateId)
  /* (S44Q — row 352) the quote's own view choices carried to the new version (a column the version no longer prints is dropped) */
  const clientViewJson = q.clientViewJson ? carryClientView(q.clientViewJson, await printedDesign(q.templateId, q.templateVersion), parseDesign(t.designJson, fallbackDesign())) : null
  await db.update(quotes).set({ templateVersion: t.version, clientViewJson, updatedAt: new Date() }).where(eq(quotes.id, quoteId))
  touchQuote(quoteId)
  return { version: t.version }
}

/** Preview › "What your client sees": this quote's switches, stored as the difference from the template's own view.
    (S44Q — row 352) Only the keys the quote changed are stored, read against the design it prints through (its pinned version) — never the
    design the browser sent — so a later template change still reaches every switch the quote never touched. */
export async function saveQuoteClientView(quoteId: string, view: ClientView | null): Promise<void | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S45C) the editors' role rule (S44Z) — before anything is read
  const [q] = await db.select({ id: quotes.id, templateId: quotes.templateId, templateVersion: quotes.templateVersion }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  const base = clientViewFromDesign(await printedDesign(q.templateId, q.templateVersion))
  const own = view && typeof view === 'object' && view.columns && typeof view.columns === 'object' ? clientViewChoices(view, base) : null
  const json = own ? JSON.stringify(own) : null
  await db.update(quotes).set({ clientViewJson: json }).where(eq(quotes.id, quoteId))
  touchQuote(quoteId)
}

/** Quote editor › ⋯ › Save as template: a Draft template from the quote's own settings (its house style is the default's). */
export async function saveQuoteAsTemplate(quoteId: string, name: string, opts: { includeText?: boolean; includeSections?: boolean } = {}): Promise<string | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S45C) the editors' role rule (S44Z) — before anything is read
  await tplOrThrow()
  const [q] = await db.select({ templateId: quotes.templateId }).from(quotes).where(eq(quotes.id, quoteId))
  if (!q) throw new Error('quote not found')
  if (q.templateId) {
    const row = await templateRow(q.templateId)
    const now = new Date()
    const id = randomUUID()
    const [pays, quote] = await Promise.all([db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(quotePayments.position), db.select().from(quotes).where(eq(quotes.id, quoteId))])
    /* The design the quote actually prints: its pinned version when it is behind the template's latest. */
    const pinned = quote[0]?.templateVersion ?? null
    const pinnedRow = pinned !== null && pinned !== row.version ? (await db.select().from(quoteTemplateVersions).where(and(eq(quoteTemplateVersions.templateId, row.id), eq(quoteTemplateVersions.version, pinned))))[0] : null
    const design = parseDesign(pinnedRow?.designJson ?? row.designJson, fallbackDesign())
    const defaults: TemplateDefaults = { ...parseDefaults(row.defaultsJson), gstEnabled: quote[0]?.gstEnabled ?? true, signatureRequired: quote[0]?.clientSignatureRequired ?? true, paymentPreset: pays.length ? presetOf(pays) : 'default' }
    await db.insert(quoteTemplates).values({ id, name: await uniqueName(name.trim() || 'Untitled template'), kind: 'design', isDefault: false, createdAt: now, status: 'draft', version: 0, paper: design.page.paper, draftJson: JSON.stringify({ design, defaults }), draftUpdatedAt: now, updatedAt: now, updatedBy: await sessionMemberId() })
    await carryQuoteExtras(id, quoteId, name, opts.includeText ?? false, opts.includeSections ?? false)
    touch(id)
    return id
  }
  const id = await orThrow(createTemplate({ name, source: { kind: 'quote', quoteId } }))
  await carryQuoteExtras(id, quoteId, name, opts.includeText ?? false, opts.includeSections ?? false)
  touch(id)
  return id
}

/**
 * (REG-538) Save as template keeps what the quote wrote instead of dropping it: its Terms and Notes become text templates
 * (when the dialog's switch says so), a split no library template matches becomes a payment template, and the draft's
 * Defaults point at them — so a quote from the new template opens the way this one reads.
 */
async function carryQuoteExtras(templateId: string, quoteId: string, name: string, includeText: boolean, includeSections = false): Promise<void> {
  const [q] = await db.select({ termsHtml: quotes.termsHtml, notesHtml: quotes.notesHtml, createdAt: quotes.createdAt, validUntil: quotes.validUntil }).from(quotes).where(eq(quotes.id, quoteId))
  const row = await templateRow(templateId)
  let draft: { design: TemplateDesign; defaults: TemplateDefaults }
  try { draft = JSON.parse(row.draftJson ?? '') as { design: TemplateDesign; defaults: TemplateDefaults } } catch { return }
  if (!q || !draft || typeof draft !== 'object') return
  const patch: Partial<TemplateDefaults> = {}
  const now = new Date()
  const base = name.trim() || 'Untitled template'
  if (includeText) {
    const add = async (kind: 'terms' | 'notes', html: string | null) => {
      const body = (html ?? '').trim()
      if (!body || /^<p>(<br\s*\/?>)?<\/p>$/.test(body)) return null
      const id = randomUUID()
      await db.insert(quoteTextTemplates).values({ id, kind, title: `${base} — ${kind === 'terms' ? 'Terms and Conditions' : 'Additional Notes'}`, body, createdAt: now, updatedAt: now, createdBy: await sessionMemberId() })
      return id
    }
    const [t, n] = await Promise.all([add('terms', q.termsHtml), add('notes', q.notesHtml)])
    if (t) patch.termsTemplateId = t
    if (n) patch.notesTemplateId = n
  }
  const pays = await db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(quotePayments.position)
  if (pays.length) {
    const splits = await fetchPaymentSplits()
    const key = presetOf(pays, splits)
    patch.paymentPreset = findSplit(key, splits) ? key : await orThrow(createPaymentTemplate({ name: `${base} split`, source: { kind: 'quote', quoteId } }))
  }
  /* (REG-582) What the quote itself says — the dialog promised "this quote's … validity": Valid Until less its date, in days; and, when
     asked, its top-level sections as the starter sections. */
  if (q.validUntil) patch.validityDays = Math.min(365, Math.max(1, Math.round((q.validUntil.getTime() - q.createdAt.getTime()) / 86_400_000)))
  if (includeSections) { const groups = await db.select({ name: quoteItems.name }).from(quoteItems).where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.kind, 'group'), isNull(quoteItems.parentId))).orderBy(quoteItems.position); patch.starterGroups = groups.map((g) => g.name.trim()).filter(Boolean) }
  if (!Object.keys(patch).length) return
  draft.defaults = { ...parseDefaults(JSON.stringify(draft.defaults ?? {})), ...patch }
  await db.update(quoteTemplates).set({ draftJson: JSON.stringify(draft), updatedAt: now, updatedBy: await sessionMemberId() }).where(eq(quoteTemplates.id, templateId))
}

/** Editor › ⋯ › Match an existing template: the reference file this template is being rebuilt from (REG-491). */
/** (pending modules S11) The kept file rides inside one object: a PDF of a few hundred KB is a data URL past the 1,000,000 characters a server
    action's decoder allows a bare string when the action takes more than one argument. */
export async function setTemplateSource(id: string, input: { sourceFile: string | null }): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  await tplOrThrow()
  await templateRow(id)
  const sourceFile = typeof input?.sourceFile === 'string' ? input.sourceFile : null
  await db.update(quoteTemplates).set({ sourceFile, updatedAt: new Date(), updatedBy: await sessionMemberId() }).where(eq(quoteTemplates.id, id))
  touch(id)
}

/** The editor's "Preview with" picker: one quote's document data. */
export async function loadQuoteDocData(quoteId: string): Promise<DocData | null> {
  if (await offDesk()) return null   // (S45C) the editors' role rule (S44Z): Marketing reads nothing here
  /* (pending modules S41b-1) only a quote this member may open, its lines as they may see them */
  const { fetchQuoteDocDataForViewer } = await import('@/lib/templates/queries')
  return fetchQuoteDocDataForViewer(typeof quoteId === 'string' ? quoteId : '')
}

/** Company › Templates › Brand kit (the kit) and Company › Profile (the company details): one `brand` record every template prints (REG-554).
    (REG-646, settings parity Q-07 · E-86) Owners and Admins only; each page sends only its own half, merged onto the record as it is now —
    Profile and the Brand kit open in two tabs no longer overwrite each other's changes. */
export async function saveBrand(part: { kit?: BrandSetting['kit']; details?: BrandSetting['details'] }): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (viewer.role !== 'Owner' && viewer.role !== 'Admin') return refuse(BRAND_RULE)   // (wave E, E7) the rule reaches the page
  /* (pending modules S14) the review link is a web address or nothing — refused, never quietly dropped */
  const review = (part.details as { reviewLink?: unknown } | undefined)?.reviewLink
  if (typeof review === 'string' && reviewLinkProblem(review)) return refuse(reviewLinkProblem(review)!)
  const [cur] = await db.select().from(settings).where(eq(settings.key, BRAND_KEY)).limit(1)
  let stored: Partial<BrandSetting> = {}
  if (cur) { try { stored = JSON.parse(cur.value) as Partial<BrandSetting> } catch { stored = {} } }
  const clean = parseBrandSetting({ ...stored, ...(part.kit ? { kit: part.kit } : {}), ...(part.details ? { details: part.details } : {}) })
  /* (REG-647, settings parity Q-12 · E-90) The website's intake address keeps the slug it was first given: a studio renamed before it set
     one of its own keeps the address its form already points at. */
  if (part.details) {
    const before = parseBrandSetting(stored).details.name
    if (before && before !== clean.details.name) {
      const { fetchLeadCapture, LEAD_CAPTURE_KEY } = await import('@/lib/settings/queries')
      const { intakeSlug } = await import('@/lib/settings/types')
      const cap = await fetchLeadCapture()
      if (!cap.emailSlug) {
        const value = JSON.stringify({ ...cap, emailSlug: intakeSlug(before) })
        await db.insert(settings).values({ key: LEAD_CAPTURE_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
      }
    }
  }
  /* (REG-647, settings parity Q-10) An entity in use is retired, never removed; a renamed entity's quotes and contracts follow it. */
  if (part.details) {
    const { reconcileEntities } = await import('@/lib/company/entities')
    const refusal = await reconcileEntities(parseBrandSetting(stored).details.entities, clean.details.entities)
    if (refusal) return refuse(refusal)   // (wave E, E7) "… is on n quotes" reaches the page whole
  }
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
export async function setItemOptional(quoteId: string, itemId: string, optional: boolean): Promise<void | Refusal> {
  { const no = await deskRefusal(); if (no) return no }   // (S45C) the editors' role rule (S44Z) — before anything is read
  await db.update(quoteItems).set({ optional }).where(and(eq(quoteItems.id, itemId), eq(quoteItems.quoteId, quoteId)))
  touchQuote(quoteId)
}

/** (REG-524) The Deleted Templates sheet's bulk Restore — one action, one revalidation. */
export async function restoreTemplates(ids: string[]): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const block = await changeBlock(undefined); if (block) return refuse(block)
  const now = new Date()
  for (const id of ids) await db.update(quoteTemplates).set({ deletedAt: null, updatedAt: now, updatedBy: await sessionMemberId() }).where(eq(quoteTemplates.id, id))
  touch()
}
/** (REG-524) Bulk Delete Forever: the in-use ones are skipped (the sheet never offers them), the rest go in one pass. */
export async function deleteTemplatesForever(ids: string[]): Promise<{ removed: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const block = await changeBlock(undefined); if (block) return refuse(block)
  let removed = 0, kept = 0
  for (const id of ids) {
    const [row] = await db.select({ deletedAt: quoteTemplates.deletedAt }).from(quoteTemplates).where(eq(quoteTemplates.id, id))
    if (!row?.deletedAt) { kept++; continue }
    const [uses] = await db.select({ n: sql<number>`count(*)` }).from(quotes).where(and(eq(quotes.templateId, id), isNull(quotes.deletedAt), isNull(quotes.archivedAt)))
    if ((uses?.n ?? 0) > 0) { kept++; continue }
    await db.delete(quoteTemplates).where(eq(quoteTemplates.id, id)); removed++
  }
  touch()
  return { removed, kept }
}
/** (REG-524) Empty Trash: every deleted template no live quote prints through. */
export async function emptyTemplateTrash(): Promise<{ removed: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const lock = await tplLock(); if (lock) return lock
  const rows = await db.select({ id: quoteTemplates.id }).from(quoteTemplates).where(sql`${quoteTemplates.deletedAt} is not null`)
  return deleteTemplatesForever(rows.map((r) => r.id))
}
