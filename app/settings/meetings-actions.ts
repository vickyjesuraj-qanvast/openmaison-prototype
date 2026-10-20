'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings, studioChecklistItems, studioCompetitorList, studioObjectionResponses, type StudioChecklistItem } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import type { Refusal } from '@/lib/company/template-rules'
import { fetchCopilotSettings } from '@/lib/meetings/queries'
import { COPILOT_SETTINGS_KEY, DIMENSIONS, FEATURES, idsOf, isAim, weightsTotal, type CopilotSettings, type Weights } from '@/lib/meetings/model'
import { isCategory, parseWords, type ChecklistCategory } from '@/lib/meetings/checklists'
import { SG_DEFAULTS, answersFrom, defaultKey, isObjectionKind, type ObjectionAnswer } from '@/lib/meetings/objections'

/*
 * (pending modules S23 — Meetings and the Meeting Co-Pilot; his "build all of them" 2026-10-11) Settings › Meetings — the co-pilot's playbook,
 * 1.0's Accounts › AI & Copilot group (Copilot Tuning · Objection Responses · Meeting Checklists · Competitor List) and its nine session
 * switches, as one Settings module. 1.0 kept the switches in one browser's storage and its engine never read the answers, the competitors or the
 * studio's own checklist items; here they are the studio's records and every meeting reads them (lib/meetings/engine.ts). Owners and Admins
 * change them; every member reads them. Each refusal answers `{ error: <the rule> }` in the rule's words; long text travels inside one object.
 * Removes are soft (`deleted_at`) and come back with Undo. *(invented copy: every refusal below, pending modules S23)*
 */

/* ── what the module reads ── */
/** One of the studio's own checklist items as Settings edits it: the words it was given (blank = it ticks on its name's words). */
export type OwnChecklistItem = { id: string; label: string; category: ChecklistCategory; aims: string[]; words: string[]; sortOrder: number; createdAt: number }
export type CompetitorRow = { id: string; name: string; notes: string | null }
export type MeetingsSettingsData = { copilot: CopilotSettings; answers: ObjectionAnswer[]; items: OwnChecklistItem[]; competitors: CompetitorRow[] }

const RULE = 'Only Owners and Admins change the meeting settings'   // (invented copy)
const NAME_MAX = 80, NOTES_MAX = 300, LABEL_MAX = 80, TITLE_MAX = 160, CONTEXT_MAX = 400, ANSWER_MAX = 2000
const now = () => new Date()
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/[ \t]+/g, ' ').slice(0, max) : '')
const cleanName = (v: unknown) => clean(v, NAME_MAX).replace(/\s+/g, ' ')

/** The signed-in member when they run the studio (Owners and Admins, `runsStudio`), else the rule. */
async function runner(): Promise<{ id: string } | Refusal> {
  const viewer = await fetchViewer()
  return runsStudio(viewer.role) ? { id: viewer.id } : { error: RULE }
}
function touch() {
  revalidatePath('/settings')
  revalidatePath('/meetings', 'layout')
}

const itemOf = (r: StudioChecklistItem): OwnChecklistItem => ({
  id: r.id, label: r.label, category: isCategory(r.category) ? r.category : 'important', aims: idsOf(r.objectiveTypes), words: idsOf(r.detectionKeywords),
  sortOrder: r.sortOrder, createdAt: r.createdAt.getTime(),
})
async function liveItems(): Promise<OwnChecklistItem[]> {
  const rows = await db.select().from(studioChecklistItems).where(isNull(studioChecklistItems.deletedAt)).orderBy(asc(studioChecklistItems.sortOrder), asc(studioChecklistItems.createdAt))
  return rows.map(itemOf)
}
async function liveAnswers(): Promise<ObjectionAnswer[]> {
  return answersFrom(await db.select().from(studioObjectionResponses))
}
async function liveCompetitors(): Promise<CompetitorRow[]> {
  const rows = await db.select().from(studioCompetitorList).where(isNull(studioCompetitorList.deletedAt)).orderBy(sql`${studioCompetitorList.competitorName} collate nocase`)   // A to Z, whatever the case
  return rows.map((r) => ({ id: r.id, name: r.competitorName, notes: r.notes }))
}

/** Settings › Meetings' records: the co-pilot's switches and weights, the studio's objection answers (its defaults with its edits, then its
    own), its own checklist items and its competitors. Every member reads them (the module shows read-only to whoever may not change it). */
export async function readMeetingsSettings(): Promise<MeetingsSettingsData> {
  const [copilot, answers, items, competitors] = await Promise.all([fetchCopilotSettings(), liveAnswers(), liveItems(), liveCompetitors()])
  return { copilot, answers, items, competitors }
}

/* ── During a meeting · Deal score — one settings key, `meeting_copilot` ── */
async function writeCopilot(next: CopilotSettings): Promise<CopilotSettings> {
  const value = JSON.stringify(next)
  const at = now()
  await db.insert(settings).values({ key: COPILOT_SETTINGS_KEY, value, updatedAt: at }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: at } })
  touch()
  return next
}

/** One co-pilot part on or off for every meeting. */
export async function saveCopilotFeature(key: string, on: boolean): Promise<{ copilot: CopilotSettings } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  if (!FEATURES.some((f) => f.key === key)) return { error: 'That part of the co-pilot isn’t there any more' }
  const cur = await fetchCopilotSettings()
  return { copilot: await writeCopilot({ ...cur, features: { ...cur.features, [key]: on === true } }) }
}

/** The deal score's six weights, whole percentages 0–50 that add up to 100 (1.0 saved percentages and read them as fractions; 2.0 reads
    percentages — `scoreOf`). */
export async function saveDealWeights(weights: Record<string, unknown>): Promise<{ copilot: CopilotSettings } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const w = {} as Weights
  for (const d of DIMENSIONS) {
    const n = Number(weights?.[d.key] ?? 0)
    if (!Number.isInteger(n) || n < 0 || n > 50) return { error: `${d.label} takes a whole number from 0 to 50` }
    w[d.key] = n
  }
  const total = weightsTotal(w)
  if (total !== 100) return { error: `The six add up to ${total}% — they need to make 100%` }
  const cur = await fetchCopilotSettings()
  return { copilot: await writeCopilot({ ...cur, weights: w }) }
}

/* ── Meeting checklists — the studio's own items, each under the kind of meeting it was added for ── */
type ItemInput = { label: string; category: string; words: string }
function itemProblem(o: ItemInput): string | null {
  if (!clean(o?.label, LABEL_MAX)) return 'Name what to cover'
  if (!isCategory(o.category)) return 'Choose how important it is'
  return null
}

export async function addChecklistItem(o: ItemInput & { aim: string }): Promise<{ items: OwnChecklistItem[]; id: string } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  if (!isAim(o?.aim)) return { error: 'Choose the kind of meeting first' }
  const why = itemProblem(o); if (why) return { error: why }
  const all = await db.select({ sortOrder: studioChecklistItems.sortOrder }).from(studioChecklistItems)
  const id = randomUUID()
  await db.insert(studioChecklistItems).values({
    id, label: clean(o.label, LABEL_MAX), category: o.category, objectiveTypes: JSON.stringify([o.aim]), detectionKeywords: JSON.stringify(parseWords(o.words ?? '')),
    sortOrder: all.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1, createdBy: who.id, createdAt: now(),
  })
  touch()
  return { items: await liveItems(), id }
}

export async function updateChecklistItem(id: string, o: ItemInput): Promise<{ items: OwnChecklistItem[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const why = itemProblem(o); if (why) return { error: why }
  const [row] = typeof id === 'string' ? await db.select().from(studioChecklistItems).where(and(eq(studioChecklistItems.id, id), isNull(studioChecklistItems.deletedAt))).limit(1) : []
  if (!row) return { error: 'That item isn’t there any more' }
  await db.update(studioChecklistItems).set({ label: clean(o.label, LABEL_MAX), category: o.category, detectionKeywords: JSON.stringify(parseWords(o.words ?? '')), updatedAt: now() })
    .where(eq(studioChecklistItems.id, id))
  touch()
  return { items: await liveItems() }
}

/** Soft: the item leaves every meeting from now on and comes back with Undo (`restoreChecklistItem`). */
export async function removeChecklistItem(id: string): Promise<{ items: OwnChecklistItem[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  if (typeof id !== 'string') return { error: 'That item isn’t there any more' }
  await db.update(studioChecklistItems).set({ deletedAt: now() }).where(and(eq(studioChecklistItems.id, id), isNull(studioChecklistItems.deletedAt)))
  touch()
  return { items: await liveItems() }
}
export async function restoreChecklistItem(id: string): Promise<{ items: OwnChecklistItem[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  if (typeof id !== 'string') return { error: 'That item isn’t there any more' }
  await db.update(studioChecklistItems).set({ deletedAt: null, updatedAt: now() }).where(eq(studioChecklistItems.id, id))
  touch()
  return { items: await liveItems() }
}

/** One place up or down among the items of its own kind of meeting and importance — the order a meeting lists them in (it lists Must ask
    first, then Important, then Good to cover; `checklistFor`). */
export async function moveChecklistItem(id: string, dir: 'up' | 'down'): Promise<{ items: OwnChecklistItem[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const items = await liveItems()
  const me = items.find((i) => i.id === id)
  if (!me) return { error: 'That item isn’t there any more' }
  const sameAims = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
  const peers = items.filter((i) => i.category === me.category && sameAims(i.aims, me.aims))   // already in sortOrder · createdAt order
  const at = peers.findIndex((i) => i.id === id)
  const to = dir === 'up' ? at - 1 : at + 1
  if (to < 0 || to >= peers.length) return { items }
  const order = [...peers]; [order[at], order[to]] = [order[to]!, order[at]!]
  /* the peers take the places they held between them, in the new order — the other items keep theirs */
  const places = peers.map((p) => p.sortOrder).sort((a, b) => a - b)
  const distinct = new Set(places).size === places.length
  const base = items.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1
  await Promise.all(order.map((p, i) => db.update(studioChecklistItems).set({ sortOrder: distinct ? places[i]! : base + i, updatedAt: now() }).where(eq(studioChecklistItems.id, p.id))))
  touch()
  return { items: await liveItems() }
}

/* ── Objection answers — the 26 platform defaults are the studio's from the first day; an edit of one is a row over it (`default_key`),
      the studio's own answers are rows of their own ── */
const defaultIndex = (key: unknown): number => {
  const m = typeof key === 'string' ? /^sg:(\d+)$/.exec(key) : null
  const i = m ? Number(m[1]) - 1 : -1
  return i >= 0 && i < SG_DEFAULTS.length ? i : -1
}
async function overRow(key: string) {
  const [row] = await db.select().from(studioObjectionResponses).where(and(eq(studioObjectionResponses.defaultKey, key), isNull(studioObjectionResponses.deletedAt))).limit(1)
  return row ?? null
}
async function ownRow(id: unknown) {
  if (typeof id !== 'string') return null
  const [row] = await db.select().from(studioObjectionResponses).where(and(eq(studioObjectionResponses.id, id), isNull(studioObjectionResponses.defaultKey))).limit(1)
  return row ?? null
}

/** What an answer says, as the dialog sends it — one object (the answer runs long). `key`: a platform default's (`sg:<n>`), the studio's own
    answer's id, or null for a new one. */
export type AnswerInput = { key: string | null; kind: string; title: string; context: string | null; answer: string }
export async function saveObjectionAnswer(o: AnswerInput): Promise<{ answers: ObjectionAnswer[]; key: string } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const title = clean(o?.title, TITLE_MAX), answer = clean(o?.answer, ANSWER_MAX), context = clean(o?.context, CONTEXT_MAX) || null
  if (!title) return { error: 'Say what the client says' }
  if (!answer) return { error: 'Write your answer' }
  const at = now()
  const d = defaultIndex(o.key)
  if (d >= 0) {
    const key = defaultKey(d)
    const row = await overRow(key)
    if (row) await db.update(studioObjectionResponses).set({ objectionTitle: title, objectionDescription: context, recommendedResponse: answer, updatedAt: at, updatedBy: who.id }).where(eq(studioObjectionResponses.id, row.id))
    else await db.insert(studioObjectionResponses).values({ id: randomUUID(), defaultKey: key, objectionType: SG_DEFAULTS[d]!.kind, objectionTitle: title, objectionDescription: context, recommendedResponse: answer, isActive: true, sortOrder: d, createdBy: who.id, createdAt: at, updatedAt: at, updatedBy: who.id })
    touch()
    return { answers: await liveAnswers(), key }
  }
  if (!isObjectionKind(o.kind)) return { error: 'Choose the kind of objection' }
  if (o.key) {
    const row = await ownRow(o.key)
    if (!row || row.deletedAt) return { error: 'That answer isn’t there any more' }
    await db.update(studioObjectionResponses).set({ objectionType: o.kind, objectionTitle: title, objectionDescription: context, recommendedResponse: answer, updatedAt: at, updatedBy: who.id }).where(eq(studioObjectionResponses.id, row.id))
    touch()
    return { answers: await liveAnswers(), key: row.id }
  }
  const all = await db.select({ sortOrder: studioObjectionResponses.sortOrder }).from(studioObjectionResponses).where(isNull(studioObjectionResponses.defaultKey))
  const id = randomUUID()
  await db.insert(studioObjectionResponses).values({ id, defaultKey: null, objectionType: o.kind, objectionTitle: title, objectionDescription: context, recommendedResponse: answer, isActive: true,
    sortOrder: all.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1, createdBy: who.id, createdAt: at, updatedAt: at, updatedBy: who.id })
  touch()
  return { answers: await liveAnswers(), key: id }
}

/** An answer on or off in meetings — a platform default switched off is a row over it with the default's words. */
export async function setObjectionAnswerOn(key: string, on: boolean): Promise<{ answers: ObjectionAnswer[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const at = now()
  const d = defaultIndex(key)
  if (d >= 0) {
    const k = defaultKey(d), def = SG_DEFAULTS[d]!
    const row = await overRow(k)
    if (row) await db.update(studioObjectionResponses).set({ isActive: on === true, updatedAt: at, updatedBy: who.id }).where(eq(studioObjectionResponses.id, row.id))
    else await db.insert(studioObjectionResponses).values({ id: randomUUID(), defaultKey: k, objectionType: def.kind, objectionTitle: def.title, objectionDescription: def.context, recommendedResponse: def.answer, isActive: on === true, sortOrder: d, createdBy: who.id, createdAt: at, updatedAt: at, updatedBy: who.id })
  } else {
    const row = await ownRow(key)
    if (!row || row.deletedAt) return { error: 'That answer isn’t there any more' }
    await db.update(studioObjectionResponses).set({ isActive: on === true, updatedAt: at, updatedBy: who.id }).where(eq(studioObjectionResponses.id, row.id))
  }
  touch()
  return { answers: await liveAnswers() }
}

/** A platform answer the studio edited goes back to the platform's words (kept off when it was off); `was` is what Undo saves again. */
export async function resetObjectionAnswer(key: string): Promise<{ answers: ObjectionAnswer[]; was: { title: string; context: string | null; answer: string } } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const d = defaultIndex(key)
  if (d < 0) return { error: 'Only a platform answer goes back to the platform’s words' }
  const row = await overRow(defaultKey(d))
  if (!row) return { error: 'This answer already says the platform’s words' }
  const def = SG_DEFAULTS[d]!, at = now()
  if (row.isActive) await db.update(studioObjectionResponses).set({ deletedAt: at, updatedAt: at, updatedBy: who.id }).where(eq(studioObjectionResponses.id, row.id))
  else await db.update(studioObjectionResponses).set({ objectionTitle: def.title, objectionDescription: def.context, recommendedResponse: def.answer, updatedAt: at, updatedBy: who.id }).where(eq(studioObjectionResponses.id, row.id))
  touch()
  return { answers: await liveAnswers(), was: { title: row.objectionTitle, context: row.objectionDescription, answer: row.recommendedResponse } }
}

/** The studio's own answer, removed softly (Undo: `restoreObjectionAnswer`). A platform answer is never removed — it is switched off. */
export async function removeObjectionAnswer(key: string): Promise<{ answers: ObjectionAnswer[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  if (defaultIndex(key) >= 0) return { error: 'A platform answer can’t be removed — switch it off instead' }
  const row = await ownRow(key)
  if (!row || row.deletedAt) return { error: 'That answer isn’t there any more' }
  const at = now()
  await db.update(studioObjectionResponses).set({ deletedAt: at, updatedAt: at, updatedBy: who.id }).where(eq(studioObjectionResponses.id, row.id))
  touch()
  return { answers: await liveAnswers() }
}
export async function restoreObjectionAnswer(key: string): Promise<{ answers: ObjectionAnswer[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const row = await ownRow(key)
  if (!row) return { error: 'That answer isn’t there any more' }
  await db.update(studioObjectionResponses).set({ deletedAt: null, updatedAt: now(), updatedBy: who.id }).where(eq(studioObjectionResponses.id, row.id))
  touch()
  return { answers: await liveAnswers() }
}

/* ── Competitors — the rival studios, by name (unique in any case), with the studio's own notes ── */
/** (S44Z — S44P's M14, every Settings list alike) The competitor a name matches (any case) — its own spelling — else null. */
async function nameTaken(name: string, except?: string): Promise<string | null> {
  const rows = await liveCompetitors()
  return rows.find((r) => r.id !== except && r.name.toLowerCase() === name.toLowerCase())?.name ?? null
}
const takenLine = (name: string) => `You have “${name}” already`

export async function addCompetitor(o: { name: string; notes?: string | null }): Promise<{ competitors: CompetitorRow[]; id: string } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const name = cleanName(o?.name)
  if (!name) return { error: 'Name the studio' }
  { const hit = await nameTaken(name); if (hit) return { error: takenLine(hit) } }
  const id = randomUUID()
  await db.insert(studioCompetitorList).values({ id, competitorName: name, notes: clean(o?.notes, NOTES_MAX) || null, createdBy: who.id, createdAt: now() })
  touch()
  return { competitors: await liveCompetitors(), id }
}
export async function updateCompetitor(id: string, o: { name: string; notes: string | null }): Promise<{ competitors: CompetitorRow[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const name = cleanName(o?.name)
  if (!name) return { error: 'Name the studio' }
  const [row] = typeof id === 'string' ? await db.select().from(studioCompetitorList).where(and(eq(studioCompetitorList.id, id), isNull(studioCompetitorList.deletedAt))).limit(1) : []
  if (!row) return { error: 'That competitor isn’t there any more' }
  { const hit = await nameTaken(name, id); if (hit) return { error: takenLine(hit) } }
  await db.update(studioCompetitorList).set({ competitorName: name, notes: clean(o?.notes, NOTES_MAX) || null, updatedAt: now() }).where(eq(studioCompetitorList.id, id))
  touch()
  return { competitors: await liveCompetitors() }
}
export async function removeCompetitor(id: string): Promise<{ competitors: CompetitorRow[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  if (typeof id !== 'string') return { error: 'That competitor isn’t there any more' }
  await db.update(studioCompetitorList).set({ deletedAt: now() }).where(and(eq(studioCompetitorList.id, id), isNull(studioCompetitorList.deletedAt)))
  touch()
  return { competitors: await liveCompetitors() }
}
export async function restoreCompetitor(id: string): Promise<{ competitors: CompetitorRow[] } | Refusal> {
  const who = await runner(); if ('error' in who) return who
  const [row] = typeof id === 'string' ? await db.select().from(studioCompetitorList).where(eq(studioCompetitorList.id, id)).limit(1) : []
  if (!row) return { error: 'That competitor isn’t there any more' }
  { const hit = await nameTaken(row.competitorName, id); if (hit) return { error: takenLine(hit) } }
  await db.update(studioCompetitorList).set({ deletedAt: null, updatedAt: now() }).where(eq(studioCompetitorList.id, id))
  touch()
  return { competitors: await liveCompetitors() }
}

/** The studio's competitors' names, A to Z — what the Lost dialog offers for "Competitor" (every member who moves a lead reads them). */
export async function fetchCompetitorNames(): Promise<string[]> {
  return (await liveCompetitors()).map((c) => c.name)
}
