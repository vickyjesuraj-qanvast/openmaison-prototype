'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { asc, eq, inArray, sql } from 'drizzle-orm'
import { changeBlock, changeableIds, nothingChangeable } from '@/lib/company/template-guard'
import { TEMPLATE_DELETED_LINE, TEMPLATE_GONE_LINE, refuse, templateChangeBlock, type Refusal } from '@/lib/company/template-rules'
import { landingFolder } from '@/lib/company/folder-landing'
import { fetchViewer } from '@/lib/leads/visibility'
import { db } from '@/lib/db'
import { scheduleTemplateItems, scheduleTemplates } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { PHASES, TEMPLATE_DESCRIPTION_MAX, followsToStore, parseFollows } from '@/lib/projects/schedule-phases'
import { MILESTONE_COLORS } from '@/lib/projects/schedule-model'   // (parity map, SC-016)
import { presetByKey } from '@/lib/projects/schedule-presets'   // (gaps build, package C — 3)
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/* (Projects round 2, Q-12) Company › Templates › Schedules — create · save · rename · duplicate · soft delete · restore · forever, the payment
   splits' actions (app/company/payment-templates-actions.ts) on the schedule's rows. A refusal answers `{ error: <the rule> }`. */

const touch = (id?: string) => { revalidatePath('/company/templates/schedules'); revalidatePath('/company', 'layout'); if (id) revalidatePath(`/templates/schedules/${id}`); revalidatePath('/projects', 'layout') }
const clean = (s: string | null | undefined, max = 80) => (s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
export type ScheduleItemInput = { title: string; days: number; gap: number; askConfirm: boolean
  /* (parity map, SC-016) its words, its colour (a MILESTONE_COLORS key) and the items it waits on, by position */
  description?: string | null; color?: string | null; follows?: number[] | null }
/** Items as the editor sends them: names trimmed, a length of 1–365 days, a gap of −60…+60, at most forty. (SC-016) A description kept to its
    lines, a colour from the eight, the links to earlier items only — the one before alone stores nothing (the default). */
function cleanItems(items: ScheduleItemInput[]): ScheduleItemInput[] {
  const int = (v: number, lo: number, hi: number, d: number) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d)
  const text = (s: unknown) => (typeof s === 'string' ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, TEMPLATE_DESCRIPTION_MAX) : '')
  return items.slice(0, 40).map((it, i) => {
    const follows = followsToStore(Array.isArray(it.follows) ? it.follows.filter((k): k is number => typeof k === 'number') : null, i)
    const description = text(it.description) || null
    const color = typeof it.color === 'string' && MILESTONE_COLORS.some((c) => c.key === it.color) ? it.color : null
    return { title: clean(it.title, 80) || 'Milestone', days: int(it.days, 1, 365, 5), gap: i === 0 && !follows ? int(it.gap, 0, 60, 0) : int(it.gap, -60, 60, 1), askConfirm: !!it.askConfirm,
      ...(description ? { description } : {}), ...(color ? { color } : {}), ...(follows ? { follows } : {}) }
  })
}
const refusalFor = async (id: string) => { const [r] = await db.select({ createdBy: scheduleTemplates.createdBy }).from(scheduleTemplates).where(eq(scheduleTemplates.id, id)); return r ? changeBlock(r.createdBy) : TEMPLATE_GONE_LINE }
async function writeItems(id: string, items: ScheduleItemInput[]) {
  await db.delete(scheduleTemplateItems).where(eq(scheduleTemplateItems.templateId, id))
  if (items.length) await db.insert(scheduleTemplateItems).values(items.map((it, i) => ({ id: randomUUID(), templateId: id, position: i, title: it.title, days: it.days, gapDays: it.gap, askConfirm: it.askConfirm,
    description: it.description ?? null, color: it.color ?? null, followsJson: it.follows?.length ? JSON.stringify(it.follows) : null })))   // (parity map, SC-016)
}

/** The site stages a whole-home renovation runs through, at their usual lengths (lib/projects/schedule-phases.ts `PHASES`): services and carpentry
    overlap the stage before by four days; the rest start after it — New ▾ › "Start from a whole-home renovation". */
const GAP_AFTER: Record<string, number> = { hacking: 0, masonry: 3, services: -4, carpentry: -4, painting: 3, cleaning: 1, handover: 1 }
const RENOVATION: ScheduleItemInput[] = PHASES.filter((p) => p.key in GAP_AFTER).map((p) => ({ title: p.title, days: p.days, gap: GAP_AFTER[p.key]!, askConfirm: p.key === 'handover' }))

export type CreateScheduleTemplateInput = { name?: string; source: { kind: 'blank' } | { kind: 'renovation' } | { kind: 'copy'; id: string } | /** (gaps build, package C — 3) a ready-made one, afresh */ { kind: 'preset'; key: string }; folderId?: string | null }
export async function createScheduleTemplate(input: CreateScheduleTemplateInput): Promise<string | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const now = new Date()
  const id = randomUUID()
  let name = clean(input.name) || 'Untitled schedule'
  let items: ScheduleItemInput[] = [{ title: 'Works start', days: 5, gap: 0, askConfirm: false }, { title: 'Handover', days: 3, gap: 1, askConfirm: true }]
  if (input.source.kind === 'renovation') { items = RENOVATION; if (!clean(input.name)) name = 'Whole-home renovation' }
  if (input.source.kind === 'preset') {
    const p = presetByKey(input.source.key)
    if (!p) return refuse('That ready-made schedule is not there any more')
    items = p.items.map((it) => ({ ...it }))
    if (!clean(input.name)) name = p.name
  }
  if (input.source.kind === 'copy') {
    const [src] = await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.id, input.source.id))
    if (!src) return refuse(TEMPLATE_GONE_LINE)
    items = (await db.select().from(scheduleTemplateItems).where(eq(scheduleTemplateItems.templateId, src.id)).orderBy(asc(scheduleTemplateItems.position))).map((r) => {
      const follows = parseFollows(r.followsJson)   // (parity map, SC-016) a copy keeps the words, the colours and the links
      return { title: r.title, days: r.days, gap: r.gapDays, askConfirm: r.askConfirm, description: r.description, color: r.color, ...(follows ? { follows } : {}) }
    })
    if (!clean(input.name)) name = `${src.name} (copy)`
  }
  const viewer = await fetchViewer()
  const { folderId } = await landingFolder('schedules', input.folderId, templateChangeBlock(viewer, viewer.id))
  await db.insert(scheduleTemplates).values({ id, name, createdBy: stampBy, updatedBy: stampBy, createdAt: now, updatedAt: now, folderId })
  await writeItems(id, cleanItems(items))
  touch(id)
  return id
}
/** The editor's autosave: the name and the items. */
export async function saveScheduleTemplate(id: string, patch: { name?: string; items?: ScheduleItemInput[] }): Promise<number | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  const [r] = await db.select({ id: scheduleTemplates.id, deletedAt: scheduleTemplates.deletedAt, createdBy: scheduleTemplates.createdBy }).from(scheduleTemplates).where(eq(scheduleTemplates.id, id))
  if (!r) return refuse(TEMPLATE_GONE_LINE)
  /* (B-11) a template is changed by those who may rename or delete it — its author, Owners and Admins — and never while it is in Deleted Templates */
  const block = await changeBlock(r.createdBy); if (block) return refuse(block)
  if (r.deletedAt) return refuse(TEMPLATE_DELETED_LINE)
  const now = new Date()
  const set: Partial<typeof scheduleTemplates.$inferInsert> = { updatedAt: now }
  if (patch.name !== undefined) set.name = clean(patch.name) || 'Untitled schedule'
  await db.update(scheduleTemplates).set({ ...set, updatedBy: stampBy }).where(eq(scheduleTemplates.id, id))
  if (patch.items !== undefined) await writeItems(id, cleanItems(patch.items))
  touch(id)
  return now.getTime()
}
export async function renameScheduleTemplate(id: string, name: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
   const block = await refusalFor(id); if (block) return refuse(block); const r = await saveScheduleTemplate(id, { name }); if (typeof r !== 'number') return r }
export async function duplicateScheduleTemplate(id: string): Promise<string | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
   return createScheduleTemplate({ source: { kind: 'copy', id } }) }
export async function deleteScheduleTemplate(id: string): Promise<void | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const block = await refusalFor(id); if (block) return refuse(block)
  await db.update(scheduleTemplates).set({ deletedAt: new Date() }).where(eq(scheduleTemplates.id, id))
  touch(id)
}
export async function restoreScheduleTemplates(ids: string[]): Promise<{ restored: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  if (!ids.length) return { restored: 0, kept: 0 }
  const rows = await db.select({ id: scheduleTemplates.id, createdBy: scheduleTemplates.createdBy }).from(scheduleTemplates).where(inArray(scheduleTemplates.id, ids))
  const none = await nothingChangeable(rows, 'restore'); if (none) return refuse(none)
  const mine = await changeableIds(rows)
  if (mine.length) await db.update(scheduleTemplates).set({ deletedAt: null }).where(inArray(scheduleTemplates.id, mine))
  touch()
  return { restored: mine.length, kept: ids.length - mine.length }
}
export async function deleteScheduleTemplatesForever(ids: string[]): Promise<{ removed: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const rows = ids.length ? await db.select({ id: scheduleTemplates.id, createdBy: scheduleTemplates.createdBy, deletedAt: scheduleTemplates.deletedAt }).from(scheduleTemplates).where(inArray(scheduleTemplates.id, ids)) : []
  const none = await nothingChangeable(rows, 'purge'); if (none) return refuse(none)
  const mine = new Set(await changeableIds(rows))
  const go = rows.filter((r) => r.deletedAt && mine.has(r.id)).map((r) => r.id)
  if (go.length) await db.delete(scheduleTemplates).where(inArray(scheduleTemplates.id, go))   // its items go with it (cascade)
  touch()
  return { removed: go.length, kept: ids.length - go.length }
}
export async function emptyScheduleTemplateTrash(): Promise<{ removed: number; kept: number } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const rows = await db.select({ id: scheduleTemplates.id }).from(scheduleTemplates).where(sql`${scheduleTemplates.deletedAt} is not null`)
  return deleteScheduleTemplatesForever(rows.map((r) => r.id))
}
