'use server'

import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { db, type Db } from '@/lib/db'
import { leadAssignees, leads } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { ALL_STAGES } from '@/lib/leads/enums'
// (REG-287) The app's one phone rule and one strict d/m/yyyy parser — the CSV import used to carry private copies
// of both, and the date copy accepted impossible dates (32/13/2026) the UI refuses.
import { digitsOnly, parseInputDate, phoneDigits, titleCaseName } from '@/lib/format'
import { revalidateEveryLead, revalidateLead, revalidateLeadListings } from '@/lib/leads/queries'

const ME = SESSION_MEMBER_ID   // (REG-286) one stand-in for the signed-in member, shared by every module that stamps a write

/**
 * (REG-286) A server action is a public endpoint: its TypeScript parameter types are not runtime guarantees, and a
 * stage string lands in `leads.stage` and `stage_logs`, where every policy helper, filter and kanban column reads it
 * back. A value outside the mock's vocabulary makes a lead that no column shows and no policy can move. Reject it.
 * (Same shape as the `kind` guard REG-285 added to updateTask; the vocabulary itself stays in lib/leads/enums.ts.)
 */
const isStage = (s: unknown): s is string => typeof s === 'string' && (ALL_STAGES as readonly string[]).includes(s)
function assertStage(...stages: unknown[]): void {
  for (const s of stages) if (!isStage(s)) throw new Error(`Unknown stage: ${String(s)}`)
}

/** The transaction handle Drizzle hands a `db.transaction` callback. */
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Replaces a lead's assignees. One writer for both doors — the Assign popover and the Lead form's Assign member
 * field (REG-231) — and de-duplicated, because `lead_assignees` carries unique(leadId, memberId).
 */
async function writeAssignees(tx: Tx, leadId: string, memberIds: string[]): Promise<void> {
  await tx.delete(leadAssignees).where(eq(leadAssignees.leadId, leadId))
  const ids = [...new Set(memberIds)]
  if (ids.length) {
    await tx.insert(leadAssignees).values(ids.map((m) => ({ id: randomUUID(), leadId, memberId: m })))
  }
}

export async function assignMembers(leadId: string, memberIds: string[]): Promise<void> {
  await db.transaction((tx) => writeAssignees(tx, leadId, memberIds))   // atomic: no window with the rows deleted
  revalidateLead(leadId)
}

export async function moveStage(input: {
  leadId: string
  fromStage: string
  toStage: string
  payload: unknown
  tasks: string[]
  followUpAt?: string | null
}): Promise<void> {
  assertStage(input.fromStage, input.toStage)   // (REG-286)
  const { leads, stageLogs, leadTasks } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const now = new Date()
  // (REG-286) One transaction: the lead's new stage, the log that records the move and the suggested tasks are one
  // fact. Unwrapped, a failure after the update left a lead sitting in a stage its journey has no log for — which is
  // what `resumeStage`, the stage timeline and Activity all read.
  await db.transaction(async (tx) => {
    await tx.update(leads)
      .set({ stage: input.toStage, updatedAt: now })
      .where(eq(leads.id, input.leadId))
    await tx.insert(stageLogs).values({
      id: uuid(), leadId: input.leadId,
      fromStage: input.fromStage, toStage: input.toStage,
      payload: input.payload as object, createdAt: now,
    })
    // Suggested tasks are raised by the signed-in member, like every task createTask() writes. Unstamped they read
    // "System created the task" in Activity, left the drawer's Creator row blank and hid under Filters › Creators › Dane.
    for (const title of input.tasks) {
      await tx.insert(leadTasks).values({
        id: uuid(), leadId: input.leadId, title, kind: 'General',
        dueAt: null, done: false, createdAt: now, creatorId: ME, updatedAt: now,
      })
    }
  })
  revalidateLead(input.leadId)
}

export async function deleteLead(leadId: string, reason: string): Promise<void> {
  const { leads } = await import('@/lib/db/schema')
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) return
  await db.update(leads)
    .set({ deletedAt: new Date(), deleteReason: reason, stageBeforeDelete: lead.stage })
    .where(eq(leads.id, leadId))
  revalidateLead(leadId)
}

type LeadFormInput = {
  name: string
  phone: string
  source: string
  propertyType: string
  propertyAddress: string
  email: string
  leadAddress: string
  budget: string        // grouped digits, e.g. "70,000"
  startDate: string     // d/m/yyyy
  style: string
  keyCollection: string
  condition: string
  areaSize: string
  areaUnit: string
  notes: string
  /** Member ids from the form's Assign member field (REG-231). Replaces the lead's assignees wholesale. */
  assignees: string[]
}

function leadColumns(input: LeadFormInput) {
  // (REG-287) One phone rule (`phoneDigits`) and one date parser (`parseInputDate`, strict) — the hand-written
  // `digits(input.phone)` and the lax inline d/m/yyyy regex that stood here were two more copies of both.
  return {
    name: titleCaseName(input.name),   // (REG-329) typed in any case, saved as "Farah Ahmad"
    phone: phoneDigits(input.phone),
    source: input.source || 'Others',
    propertyType: input.propertyType || 'Others',
    propertyAddress: input.propertyAddress.trim() || null,
    email: input.email.trim() || null,
    leadAddress: input.leadAddress.trim() || null,
    budgetMinor: Number(digitsOnly(input.budget) || 0) * 100,
    estimatedStartDate: parseInputDate(input.startDate),
    style: input.style || null,
    keyCollection: input.keyCollection || null,
    condition: input.condition || null,
    areaSqft: (() => {
      const n = Number(digitsOnly(input.areaSize))
      if (!n) return null
      return input.areaUnit === 'sq m' ? Math.round(n * 10.7639) : n
    })(),
    notes: input.notes.trim() || null,
  }
}

export async function createLead(input: LeadFormInput): Promise<string> {
  const now = new Date()
  const id = randomUUID()
  // One transaction: a lead is never visible without the owners it was created with, so a retry cannot leave two.
  await db.transaction(async (tx) => {
    await tx.insert(leads).values({ id, ...leadColumns(input), stage: 'New', createdAt: now, updatedAt: now })   // every new lead carries the band until someone clicks it (user 2026-08-29)
    await writeAssignees(tx, id, input.assignees)
  })
  revalidateLead(id)
  return id
}

export async function updateLead(leadId: string, input: LeadFormInput): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ ...leadColumns(input), updatedAt: new Date() }).where(eq(leads.id, leadId))
    await writeAssignees(tx, leadId, input.assignees)
  })
  revalidateLead(leadId)
}

export async function addTask(leadId: string, title: string): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  const now = new Date()
  // Stamped like createTask(): without a creator the same task read as 'System' in Activity and '—' in the drawer.
  await db.insert(leadTasks).values({
    id: randomUUID(), leadId, title, kind: 'General', createdAt: now, creatorId: ME, updatedAt: now,
  })
  revalidateLead(leadId)
}

/** The task's own lead, so the Tasks and Activity tabs are evicted too (REG-286) — the listing popover knows only the task id. */
async function leadOfTask(taskId: string): Promise<string | null> {
  const { leadTasks } = await import('@/lib/db/schema')
  const [t] = await db.select({ leadId: leadTasks.leadId }).from(leadTasks).where(eq(leadTasks.id, taskId)).limit(1)
  return t?.leadId ?? null
}

export async function completeTask(taskId: string): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  await db.update(leadTasks).set({ done: true }).where(eq(leadTasks.id, taskId))
  const leadId = await leadOfTask(taskId)
  if (leadId) revalidateLead(leadId); else revalidateLeadListings()
}

export async function setTaskDue(taskId: string, due: Date): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  await db.update(leadTasks).set({ dueAt: due }).where(eq(leadTasks.id, taskId))
  const leadId = await leadOfTask(taskId)
  if (leadId) revalidateLead(leadId); else revalidateLeadListings()
}

/** Bulk soft delete — one statement; SQLite evaluates SET against the pre-update row. */
export async function deleteLeads(leadIds: string[], reason: string): Promise<void> {
  if (leadIds.length === 0) return
  await db.update(leads)
    .set({ deletedAt: new Date(), deleteReason: reason, stageBeforeDelete: sql`stage` })
    .where(and(inArray(leads.id, leadIds), isNull(leads.deletedAt)))
  revalidateEveryLead()   // (REG-286) a bulk op touches many leads: one layout revalidate beats a path per lead per tab
}

/** Bulk restore — returns how many leads were actually still in the trash. */
export async function restoreLeads(leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0
  const res = await db.update(leads)
    .set({ deletedAt: null, deleteReason: null, stage: sql`coalesce(stage_before_delete, stage)`, stageBeforeDelete: null })
    .where(and(inArray(leads.id, leadIds), isNotNull(leads.deletedAt)))
  revalidateEveryLead()   // (REG-286)
  return res.rowsAffected
}

/** Permanent removal (Deleted Leads → Delete Forever / Empty Trash).
 *  Resolves the target set SERVER-SIDE to leads still in the trash, so a stale
 *  client snapshot (Undo/Restore raced, another tab) can never purge a live lead. */
export async function deleteForever(leadIds: string[]): Promise<void> {
  if (leadIds.length === 0) return
  const { leadTasks, leadAssignees: la, stageLogs } = await import('@/lib/db/schema')
  await db.transaction(async (tx) => {
    const gone = await tx.select({ id: leads.id }).from(leads)
      .where(and(inArray(leads.id, leadIds), isNotNull(leads.deletedAt)))
    const ids = gone.map((g) => g.id)
    if (ids.length === 0) return
    await tx.delete(leadTasks).where(inArray(leadTasks.leadId, ids))
    await tx.delete(la).where(inArray(la.leadId, ids))
    await tx.delete(stageLogs).where(inArray(stageLogs.leadId, ids))
    await tx.delete(leads).where(inArray(leads.id, ids))
  })
  revalidateEveryLead()   // (REG-286)
}

export async function emptyTrash(): Promise<void> {
  const gone = await db.select({ id: leads.id }).from(leads).where(isNotNull(leads.deletedAt))
  await deleteForever(gone.map((g) => g.id))
}

export type ImportDestination = 'listing' | 'review'
type ImportPayloadInput = { fileName: string; headers: string[]; mapping: (string | null)[]; rows: string[][]; destination?: ImportDestination }

/** Import wizard step 3 → 4: persists the batch + every row into the review
 *  queue (M8). Rows without a Lead Name are skipped; phone/email matches
 *  against live leads (or earlier rows in the file) are flagged as duplicates. */
export async function importLeads(input: ImportPayloadInput): Promise<{
  importId: string; total: number; imported: number; skipped: number; duplicates: number
  destination: ImportDestination; approved: number; flagged: number
}> {
  const { imports, importRows } = await import('@/lib/db/schema')
  const existing = await db.select({ id: leads.id, phone: leads.phone, email: leads.email }).from(leads).where(isNull(leads.deletedAt))
  const byPhone = new Map<string, string>()
  const byEmail = new Map<string, string>()
  for (const l of existing) {
    if (l.phone) byPhone.set(phoneDigits(l.phone), l.id)
    if (l.email) byEmail.set(l.email.trim().toLowerCase(), l.id)
  }
  const importId = randomUUID()
  const now = new Date()
  const rowsOut: { id: string; importId: string; data: Record<string, string>; status: string; duplicateOfLeadId: string | null; matchedOn: string | null }[] = []
  let skipped = 0, duplicates = 0
  const seenPhone = new Set<string>(), seenEmail = new Set<string>()
  // Rows already waiting for review count as seen, so a re-import is flagged instead of queued twice.
  const queued = await db.select({ data: importRows.data }).from(importRows).where(inArray(importRows.status, ['pending', 'duplicate']))
  for (const qd of queued) {
    const d = qd.data as Record<string, string>
    const p = phoneDigits(d['Lead Phone Number'] ?? ''); if (p) seenPhone.add(p)
    const e = (d['Lead Email'] ?? '').trim().toLowerCase(); if (e) seenEmail.add(e)
  }
  for (const raw of input.rows) {
    const rec: Record<string, string> = {}
    input.mapping.forEach((f, i) => { if (f && f !== 'Ignore') rec[f] = (raw[i] ?? '').trim() })
    const name = rec['Lead Name'] ?? ''
    if (!name) {
      skipped++
      rowsOut.push({ id: randomUUID(), importId, data: { ...rec, __reason: 'Missing Lead Name' }, status: 'skipped', duplicateOfLeadId: null, matchedOn: null })
      continue
    }
    const phone = phoneDigits(rec['Lead Phone Number'] ?? '')
    if (rec['Lead Phone Number'] !== undefined) rec['Lead Phone Number'] = phone
    const email = (rec['Lead Email'] ?? '').toLowerCase()
    let dupOf: string | null = null, matchedOn: string | null = null
    if (phone && (byPhone.has(phone) || seenPhone.has(phone))) { dupOf = byPhone.get(phone) ?? null; matchedOn = 'phone' }
    else if (email && (byEmail.has(email) || seenEmail.has(email))) { dupOf = byEmail.get(email) ?? null; matchedOn = 'email' }
    if (phone) seenPhone.add(phone)
    if (email) seenEmail.add(email)
    if (matchedOn) duplicates++
    rowsOut.push({ id: randomUUID(), importId, data: rec, status: matchedOn ? 'duplicate' : 'pending', duplicateOfLeadId: dupOf, matchedOn })
  }
  const total = input.rows.length
  const imported = total - skipped
  // One transaction, chunked rows (500 × 6 params ≪ SQLite's 32,766 cap): no orphan batch on failure.
  await db.transaction(async (tx) => {
    await tx.insert(imports).values({
      id: importId, fileName: input.fileName, totalRows: total, importedRows: imported, skippedRows: skipped,
      errorNote: skipped ? `${skipped} error${skipped === 1 ? '' : 's'} detected across ${skipped} skipped lead${skipped === 1 ? '' : 's'}` : null,
      createdAt: now,
    })
    const CHUNK = 500
    for (let i = 0; i < rowsOut.length; i += CHUNK) {
      await tx.insert(importRows).values(rowsOut.slice(i, i + CHUNK))
    }
  })
  // "Add to my lead listing": clean rows go straight in as leads; duplicates stay in the review queue.
  const destination: ImportDestination = input.destination ?? 'review'
  let approved = 0, flagged = 0
  if (destination === 'listing') {
    const pending = await db.select({ id: importRows.id }).from(importRows).where(and(eq(importRows.importId, importId), eq(importRows.status, 'pending')))
    const res = await approveImportRows(pending.map((r) => r.id))
    approved = res.approved; flagged = res.flagged
  }
  revalidateLeadListings()   // (REG-286) Qanvast Ops lists imported Qanvast leads too
  revalidatePath('/leads/imports')
  return { importId, total, imported, skipped, duplicates, destination, approved, flagged }
}

/* ---------- Review imported leads (M8) ---------- */

/** Imported row → lead columns; enum values outside the mock vocab fall back to 'Others' / 'New'. */
async function leadFromImport(data: Record<string, string>) {
  const { SOURCES, PROPERTY_TYPES, ALL_STAGES } = await import('@/lib/leads/enums')
  const pick = (v: string | undefined, list: readonly string[], fallback: string) => {
    const hit = list.find((x) => x.toLowerCase() === (v ?? '').trim().toLowerCase())
    return hit ?? fallback
  }
  const now = new Date()
  return {
    name: titleCaseName(data['Lead Name'] ?? ''),   // (REG-329) imported in any case, saved as "Farah Ahmad"
    phone: phoneDigits(data['Lead Phone Number'] ?? ''),
    email: (data['Lead Email'] ?? '').trim() || null,
    source: pick(data['Lead Source'], SOURCES, 'Others'),
    stage: pick(data['Lead Stage'], ALL_STAGES, 'New'),   // the full vocabulary: STAGES is active-only, so an imported 'On Hold' / 'Lost' row landed silently in New
    propertyType: pick(data['Property Type'], PROPERTY_TYPES, 'Others'),
    propertyAddress: (data['Property Address'] ?? '').trim() || null,
    leadAddress: (data['Lead Address'] ?? '').trim() || null,
    budgetMinor: Number(digitsOnly(data['Estimated Budget (S$)'] ?? '') || 0) * 100,
    // (REG-287) The STRICT shared parser. The `parseDMY` copy that stood here accepted 32/13/2026 and rolled it into
    // a real Date, so a CSV could put a date on a lead that no field in the UI would ever have taken.
    estimatedStartDate: parseInputDate(data['Estimated Start Date']),
    style: (data['Style'] ?? '').trim() || null,
    keyCollection: (data['Key Collection'] ?? '').trim() || null,
    condition: (data['Condition'] ?? '').trim() || null,
    areaSqft: Number(digitsOnly(data['Area Size'] ?? '')) || null,
    notes: (data['Remarks'] ?? '').trim() || null,   // the import vocabulary's Remarks (REG-266); the DB column stays `notes`
    createdAt: now, updatedAt: now,
  }
}

/** Approve → real leads (also used by 'Keep Both', which approves a 'duplicate' row deliberately).
 *  Pending rows are RE-MATCHED against live leads at approval time: a lead created since the
 *  import (or by an earlier row in this batch) turns the row into a duplicate instead of a twin. */
export async function approveImportRows(rowIds: string[]): Promise<{ approved: number; flagged: number }> {
  if (rowIds.length === 0) return { approved: 0, flagged: 0 }
  const { importRows } = await import('@/lib/db/schema')
  let approved = 0, flagged = 0
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(importRows)
      .where(and(inArray(importRows.id, rowIds), inArray(importRows.status, ['pending', 'duplicate'])))
    const live = await tx.select({ id: leads.id, phone: leads.phone, email: leads.email }).from(leads).where(isNull(leads.deletedAt))
    const byPhone = new Map<string, string>(), byEmail = new Map<string, string>()
    for (const l of live) {
      if (l.phone) byPhone.set(phoneDigits(l.phone), l.id)
      if (l.email) byEmail.set(l.email.trim().toLowerCase(), l.id)
    }
    for (const r of rows) {
      const cols = await leadFromImport(r.data as Record<string, string>)
      if (!cols.name) continue
      if (r.status === 'pending') {
        const hitPhone = cols.phone ? byPhone.get(cols.phone) : undefined
        const hitEmail = cols.email ? byEmail.get(cols.email.toLowerCase()) : undefined
        if (hitPhone || hitEmail) {
          await tx.update(importRows)
            .set({ status: 'duplicate', duplicateOfLeadId: hitPhone ?? hitEmail ?? null, matchedOn: hitPhone ? 'phone' : 'email' })
            .where(eq(importRows.id, r.id))
          flagged++
          continue
        }
      }
      const id = randomUUID()
      await tx.insert(leads).values({ id, ...cols })
      if (cols.phone) byPhone.set(cols.phone, id)
      if (cols.email) byEmail.set(cols.email.toLowerCase(), id)
      await tx.update(importRows).set({ status: 'approved' }).where(eq(importRows.id, r.id))
      approved++
    }
  })
  revalidateLeadListings()   // (REG-286)
  return { approved, flagged }
}

export async function rejectImportRows(rowIds: string[]): Promise<number> {
  if (rowIds.length === 0) return 0
  const { importRows } = await import('@/lib/db/schema')
  const res = await db.update(importRows).set({ status: 'rejected' })
    .where(and(inArray(importRows.id, rowIds), inArray(importRows.status, ['pending', 'duplicate'])))
  revalidateLeadListings()   // (REG-286)
  return res.rowsAffected
}

/** Merge a duplicate into its existing lead: fields where the reviewer picked 'new' overwrite the existing lead. */
export async function mergeImportRow(rowId: string, picks: Record<string, 'existing' | 'new'>): Promise<boolean> {
  const { importRows } = await import('@/lib/db/schema')
  const [row] = await db.select().from(importRows).where(eq(importRows.id, rowId)).limit(1)
  if (!row || !row.duplicateOfLeadId || !['pending', 'duplicate'].includes(row.status)) return false
  // Server-side re-validation: never merge into a trashed lead (client snapshot may be stale).
  const [existing] = await db.select().from(leads).where(and(eq(leads.id, row.duplicateOfLeadId), isNull(leads.deletedAt))).limit(1)
  if (!existing) return false
  const incoming = await leadFromImport(row.data as Record<string, string>)
  const patch: Record<string, unknown> = {}
  const map: Record<string, keyof typeof incoming> = {
    'Lead name': 'name', Phone: 'phone', Email: 'email', 'Budget (S$)': 'budgetMinor',
    Source: 'source', 'Property type': 'propertyType', Address: 'propertyAddress',
  }
  for (const [label, choice] of Object.entries(picks)) {
    const key = map[label]
    if (!key || choice !== 'new') continue
    const v = incoming[key]
    // An empty incoming value never overwrites a real one.
    if (v === '' || v === null || v === undefined || (key === 'budgetMinor' && v === 0)) continue
    patch[key] = v
  }
  // The mock promises the other phone is "kept as alt": keep it (and any import notes) in Notes.
  const keptPhone = picks.Phone === 'new' && incoming.phone ? incoming.phone : existing.phone
  const altPhone = keptPhone === existing.phone ? incoming.phone : existing.phone
  const noteBits: string[] = []
  if (altPhone && keptPhone && altPhone !== keptPhone) noteBits.push(`Alt phone: ${altPhone}`)
  if (incoming.notes && incoming.notes !== existing.notes) noteBits.push(incoming.notes)
  if (noteBits.length) patch.notes = [existing.notes, ...noteBits].filter(Boolean).join('\n')
  await db.transaction(async (tx) => {
    if (Object.keys(patch).length) await tx.update(leads).set({ ...patch, updatedAt: new Date() }).where(eq(leads.id, existing.id))
    await tx.update(importRows).set({ status: 'merged' }).where(eq(importRows.id, rowId))
  })
  revalidateLead(existing.id)
  return true
}

/** Flexible stage movement (and linear moves backwards / out of On Hold): the lead moves at once; no details are captured. */
export async function quickMoveStage(input: { leadId: string; fromStage: string; toStage: string }): Promise<{ logId: string }> {
  assertStage(input.fromStage, input.toStage)   // (REG-286)
  const { leads, stageLogs } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const now = new Date()
  const logId = uuid()
  // (REG-286) Atomic, like moveStage: the stage and the log that lets Undo take it back are one fact — half of it
  // is a lead that moved with no way home.
  await db.transaction(async (tx) => {
    await tx.update(leads).set({ stage: input.toStage, updatedAt: now }).where(eq(leads.id, input.leadId))
    await tx.insert(stageLogs).values({
      id: logId, leadId: input.leadId, fromStage: input.fromStage, toStage: input.toStage,
      payload: { quick: true }, createdAt: now,
    })
  })
  revalidateLead(input.leadId)
  return { logId }
}

/** Snackbar Undo for a quick move: the lead returns to where it was and the move leaves no trace in its journey. */
export async function undoStageMove(input: { leadId: string; logId: string; toStage: string }): Promise<void> {
  assertStage(input.toStage)   // (REG-286)
  const { leads, stageLogs } = await import('@/lib/db/schema')
  await db.transaction(async (tx) => {   // (REG-286) both halves of the undo, or neither
    await tx.update(leads).set({ stage: input.toStage, updatedAt: new Date() }).where(eq(leads.id, input.leadId))
    await tx.delete(stageLogs).where(eq(stageLogs.id, input.logId))
  })
  revalidateLead(input.leadId)
}

/** Corrections to a completed stage (Move stage window, linear movement): the stage's latest log takes the new details. */
export async function updateStageDetails(input: { leadId: string; stage: string; data: unknown }): Promise<void> {
  assertStage(input.stage)   // (REG-286)
  const { stageLogs } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const { desc } = await import('drizzle-orm')
  const [latest] = await db.select({ id: stageLogs.id }).from(stageLogs)
    .where(and(eq(stageLogs.leadId, input.leadId), eq(stageLogs.toStage, input.stage)))
    .orderBy(desc(stageLogs.createdAt)).limit(1)
  if (latest) {
    await db.update(stageLogs).set({ payload: input.data as object }).where(eq(stageLogs.id, latest.id))
  } else {
    // A stage the lead reached before any log existed (seeded data): record the details against it.
    await db.insert(stageLogs).values({
      id: uuid(), leadId: input.leadId, fromStage: input.stage, toStage: input.stage,
      payload: input.data as object, createdAt: new Date(),
    })
  }
  revalidateLead(input.leadId)
}

/** The left band marks a lead nobody has opened or clicked yet (user 2026-08-29); the first interaction clears it. */
export async function markLeadSeen(leadId: string): Promise<void> {
  const { leads } = await import('@/lib/db/schema')
  await db.update(leads).set({ seenAt: new Date() }).where(and(eq(leads.id, leadId), isNull(leads.seenAt)))
  revalidatePath('/leads')
}

/** Maison AI › "Reset prototype": every table back to fixtures/baseline.json (user 2026-08-29). */
export async function resetPrototype(): Promise<{ rows: number }> {
  const { restoreBaseline } = await import('@/lib/db/baseline')
  const r = await restoreBaseline()
  // (REG-286) Every table changed, so every cached page is wrong — including the lead detail routes, which the old
  // three paths never named and `staleTimes.dynamic = 300` then served for five minutes after a reset.
  revalidatePath('/', 'layout')
  return { rows: r.rows }
}
