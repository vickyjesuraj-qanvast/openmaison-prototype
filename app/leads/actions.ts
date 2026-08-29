'use server'

import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { leadAssignees, leads } from '@/lib/db/schema'

export async function assignMembers(leadId: string, memberIds: string[]): Promise<void> {
  await db.delete(leadAssignees).where(eq(leadAssignees.leadId, leadId))
  if (memberIds.length) {
    await db.insert(leadAssignees).values(memberIds.map((m) => ({ id: randomUUID(), leadId, memberId: m })))
  }
  revalidatePath('/leads')
}

export async function moveStage(input: {
  leadId: string
  fromStage: string
  toStage: string
  payload: unknown
  tasks: string[]
  followUpAt?: string | null
}): Promise<void> {
  const { leads, stageLogs, leadTasks } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const now = new Date()
  await db.update(leads)
    .set({ stage: input.toStage, updatedAt: now })
    .where(eq(leads.id, input.leadId))
  await db.insert(stageLogs).values({
    id: uuid(), leadId: input.leadId,
    fromStage: input.fromStage, toStage: input.toStage,
    payload: input.payload as object, createdAt: now,
  })
  for (const title of input.tasks) {
    await db.insert(leadTasks).values({
      id: uuid(), leadId: input.leadId, title, kind: 'General',
      dueAt: null, done: false, createdAt: now,
    })
  }
  revalidatePath('/leads')
}

export async function deleteLead(leadId: string, reason: string): Promise<void> {
  const { leads } = await import('@/lib/db/schema')
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) return
  await db.update(leads)
    .set({ deletedAt: new Date(), deleteReason: reason, stageBeforeDelete: lead.stage })
    .where(eq(leads.id, leadId))
  revalidatePath('/leads')
}

export async function restoreLead(leadId: string): Promise<boolean> {
  const { leads } = await import('@/lib/db/schema')
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead || !lead.deletedAt) return false
  await db.update(leads)
    .set({ deletedAt: null, deleteReason: null, stage: lead.stageBeforeDelete ?? lead.stage, stageBeforeDelete: null })
    .where(eq(leads.id, leadId))
  revalidatePath('/leads')
  return true
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
}

function leadColumns(input: LeadFormInput) {
  const digits = (s: string) => s.replace(/\D/g, '')
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input.startDate.trim())
  return {
    name: input.name.trim(),
    phone: digits(input.phone),
    source: input.source || 'Others',
    propertyType: input.propertyType || 'Others',
    propertyAddress: input.propertyAddress.trim() || null,
    email: input.email.trim() || null,
    leadAddress: input.leadAddress.trim() || null,
    budgetMinor: Number(digits(input.budget) || 0) * 100,
    estimatedStartDate: m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null,
    style: input.style || null,
    keyCollection: input.keyCollection || null,
    condition: input.condition || null,
    areaSqft: (() => {
      const n = Number(digits(input.areaSize))
      if (!n) return null
      return input.areaUnit === 'sq m' ? Math.round(n * 10.7639) : n
    })(),
    notes: input.notes.trim() || null,
  }
}

export async function createLead(input: LeadFormInput): Promise<string> {
  const now = new Date()
  const id = randomUUID()
  await db.insert(leads).values({ id, ...leadColumns(input), stage: 'New', createdAt: now, updatedAt: now })
  revalidatePath('/leads')
  return id
}

export async function updateLead(leadId: string, input: LeadFormInput): Promise<void> {
  await db.update(leads).set({ ...leadColumns(input), updatedAt: new Date() }).where(eq(leads.id, leadId))
  revalidatePath('/leads')
}

export async function addTask(leadId: string, title: string): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  await db.insert(leadTasks).values({
    id: randomUUID(), leadId, title, kind: 'General', createdAt: new Date(),
  })
  revalidatePath('/leads')
}

export async function completeTask(taskId: string): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  await db.update(leadTasks).set({ done: true }).where(eq(leadTasks.id, taskId))
  revalidatePath('/leads')
}

export async function setTaskDue(taskId: string, due: Date): Promise<void> {
  const { leadTasks } = await import('@/lib/db/schema')
  await db.update(leadTasks).set({ dueAt: due }).where(eq(leadTasks.id, taskId))
  revalidatePath('/leads')
}

/** Bulk soft delete — one statement; SQLite evaluates SET against the pre-update row. */
export async function deleteLeads(leadIds: string[], reason: string): Promise<void> {
  if (leadIds.length === 0) return
  await db.update(leads)
    .set({ deletedAt: new Date(), deleteReason: reason, stageBeforeDelete: sql`stage` })
    .where(and(inArray(leads.id, leadIds), isNull(leads.deletedAt)))
  revalidatePath('/leads')
}

/** Bulk restore — returns how many leads were actually still in the trash. */
export async function restoreLeads(leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0
  const res = await db.update(leads)
    .set({ deletedAt: null, deleteReason: null, stage: sql`coalesce(stage_before_delete, stage)`, stageBeforeDelete: null })
    .where(and(inArray(leads.id, leadIds), isNotNull(leads.deletedAt)))
  revalidatePath('/leads')
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
  revalidatePath('/leads')
}

export async function emptyTrash(): Promise<void> {
  const gone = await db.select({ id: leads.id }).from(leads).where(isNotNull(leads.deletedAt))
  await deleteForever(gone.map((g) => g.id))
}

export type ImportDestination = 'listing' | 'review'
type ImportPayloadInput = { fileName: string; headers: string[]; mapping: (string | null)[]; rows: string[][]; destination?: ImportDestination }

/** "+65 9123 4567" | "6591234567" | "91234567" → "91234567" (leads store 8-digit local numbers). */
function canonicalPhone(s: string): string {
  const d = s.replace(/\D/g, '')
  return d.length === 10 && d.startsWith('65') ? d.slice(2) : d
}

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
    if (l.phone) byPhone.set(canonicalPhone(l.phone), l.id)
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
    const p = canonicalPhone(d['Lead Phone Number'] ?? ''); if (p) seenPhone.add(p)
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
    const phone = canonicalPhone(rec['Lead Phone Number'] ?? '')
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
  revalidatePath('/leads')
  revalidatePath('/leads/imports')
  return { importId, total, imported, skipped, duplicates, destination, approved, flagged }
}

/* ---------- Review imported leads (M8) ---------- */

function parseDMY(s: string | undefined): Date | null {
  if (!s) return null
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim())
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null
}

/** Imported row → lead columns; enum values outside the mock vocab fall back to 'Others' / 'New'. */
async function leadFromImport(data: Record<string, string>) {
  const { SOURCES, PROPERTY_TYPES, STAGES } = await import('@/lib/leads/enums')
  const pick = (v: string | undefined, list: readonly string[], fallback: string) => {
    const hit = list.find((x) => x.toLowerCase() === (v ?? '').trim().toLowerCase())
    return hit ?? fallback
  }
  const digits = (v: string | undefined) => (v ?? '').replace(/\D/g, '')
  const now = new Date()
  return {
    name: (data['Lead Name'] ?? '').trim(),
    phone: canonicalPhone(data['Lead Phone Number'] ?? ''),
    email: (data['Lead Email'] ?? '').trim() || null,
    source: pick(data['Lead Source'], SOURCES, 'Others'),
    stage: pick(data['Lead Stage'], STAGES, 'New'),
    propertyType: pick(data['Property Type'], PROPERTY_TYPES, 'Others'),
    propertyAddress: (data['Property Address'] ?? '').trim() || null,
    leadAddress: (data['Lead Address'] ?? '').trim() || null,
    budgetMinor: Number(digits(data['Estimated Budget (S$)']) || 0) * 100,
    estimatedStartDate: parseDMY(data['Estimated Start Date']),
    style: (data['Style'] ?? '').trim() || null,
    keyCollection: (data['Key Collection'] ?? '').trim() || null,
    condition: (data['Condition'] ?? '').trim() || null,
    areaSqft: Number(digits(data['Area Size'])) || null,
    notes: (data['Notes'] ?? '').trim() || null,
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
      if (l.phone) byPhone.set(canonicalPhone(l.phone), l.id)
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
  revalidatePath('/leads')
  return { approved, flagged }
}

export async function rejectImportRows(rowIds: string[]): Promise<number> {
  if (rowIds.length === 0) return 0
  const { importRows } = await import('@/lib/db/schema')
  const res = await db.update(importRows).set({ status: 'rejected' })
    .where(and(inArray(importRows.id, rowIds), inArray(importRows.status, ['pending', 'duplicate'])))
  revalidatePath('/leads')
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
  revalidatePath('/leads')
  return true
}

/** Flexible stage movement (and linear moves backwards / out of On Hold): the lead moves at once; no details are captured. */
export async function quickMoveStage(input: { leadId: string; fromStage: string; toStage: string }): Promise<{ logId: string }> {
  const { leads, stageLogs } = await import('@/lib/db/schema')
  const { randomUUID: uuid } = await import('node:crypto')
  const now = new Date()
  const logId = uuid()
  await db.update(leads).set({ stage: input.toStage, updatedAt: now }).where(eq(leads.id, input.leadId))
  await db.insert(stageLogs).values({
    id: logId, leadId: input.leadId, fromStage: input.fromStage, toStage: input.toStage,
    payload: { quick: true }, createdAt: now,
  })
  revalidatePath('/leads')
  return { logId }
}

/** Snackbar Undo for a quick move: the lead returns to where it was and the move leaves no trace in its journey. */
export async function undoStageMove(input: { leadId: string; logId: string; toStage: string }): Promise<void> {
  const { leads, stageLogs } = await import('@/lib/db/schema')
  await db.update(leads).set({ stage: input.toStage, updatedAt: new Date() }).where(eq(leads.id, input.leadId))
  await db.delete(stageLogs).where(eq(stageLogs.id, input.logId))
  revalidatePath('/leads')
}

/** Corrections to a completed stage (Move stage window, linear movement): the stage's latest log takes the new details. */
export async function updateStageDetails(input: { leadId: string; stage: string; data: unknown }): Promise<void> {
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
  revalidatePath('/leads')
}
