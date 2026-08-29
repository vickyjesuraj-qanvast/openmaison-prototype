import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { importRows, imports, leadAssignees, leadTasks, leads, members, stageLogs } from '@/lib/db/schema'
import type { ImportBatch, ImportRow, Lead, LeadTask, Member } from '@/lib/db/schema'
import { STAGES, type Stage } from '@/lib/leads/enums'
import { mergeStageData, type WizardData } from '@/lib/leads/stage-data'

export type LeadRow = Lead & {
  tasks: LeadTask[]
  assignees: Member[]
  /** C4: next follow-up date for On Hold leads (from the move-stage payload). */
  onHoldFollowUp: string | null
  /** Details the Move stage window has recorded per stage (latest wizard payload per stage, folded). */
  stageData: Partial<WizardData>
  /** For On Hold / Lost leads: the active stage they left from, so linear movement resumes there. */
  resumeStage: Stage | null
}

/** Full listing payload — 18 rows; joins resolved in memory. */
export async function fetchLeadRows(): Promise<{ rows: LeadRow[]; team: Member[]; now: number }> {
  const [allLeads, allTasks, links, team, logs] = await Promise.all([
    db.select().from(leads).where(isNull(leads.deletedAt)).orderBy(desc(leads.createdAt)),
    db.select().from(leadTasks).orderBy(sql`${leadTasks.dueAt} is null, ${leadTasks.dueAt} asc`),
    db.select().from(leadAssignees),
    db.select().from(members),
    db.select().from(stageLogs).orderBy(asc(stageLogs.createdAt)),
  ])
  const byMember = new Map(team.map((m) => [m.id, m]))
  const holdFollowUps = new Map<string, string>()
  const logsByLead = new Map<string, typeof logs>()
  for (const log of logs) {
    if (log.toStage === 'On Hold' && log.payload && typeof log.payload === 'object') {
      const f = (log.payload as { followUpAt?: string }).followUpAt
      if (f) holdFollowUps.set(log.leadId, f)
    }
    const list = logsByLead.get(log.leadId)
    if (list) list.push(log); else logsByLead.set(log.leadId, [log])
  }
  const isActive = (s: string): s is (typeof STAGES)[number] => (STAGES as readonly string[]).includes(s)
  const resumeStageOf = (l: Lead): Stage | null => {
    if (isActive(l.stage)) return null
    const last = logsByLead.get(l.id)?.filter((g) => g.toStage === l.stage).at(-1)
    return last && isActive(last.fromStage) ? last.fromStage : null
  }
  const rows = allLeads.map((l) => ({
    ...l,
    tasks: allTasks.filter((t) => t.leadId === l.id && !t.done),
    assignees: links
      .filter((a) => a.leadId === l.id)
      .map((a) => byMember.get(a.memberId))
      .filter((m): m is Member => !!m),
    onHoldFollowUp: l.stage === 'On Hold' ? (holdFollowUps.get(l.id) ?? null) : null,
    stageData: mergeStageData(logsByLead.get(l.id) ?? []),
    resumeStage: resumeStageOf(l),
  }))
  return { rows, team, now: Date.now() }
}

/** Deleted Leads folder (779:26316): soft-deleted leads, most recently archived first. */
export async function fetchDeletedLeads(): Promise<Lead[]> {
  return db.select().from(leads).where(isNotNull(leads.deletedAt)).orderBy(desc(leads.deletedAt))
}

/** Lead Import History (779:20147) — newest first. */
export async function fetchImports(): Promise<ImportBatch[]> {
  return db.select().from(imports).orderBy(desc(imports.createdAt))
}

export async function fetchSkippedRows(importId: string): Promise<ImportRow[]> {
  return db.select().from(importRows)
    .where(and(eq(importRows.importId, importId), eq(importRows.status, 'skipped')))
}

export type ReviewRow = {
  row: ImportRow
  data: Record<string, string>
  receivedAt: Date
  fileName: string
  existing: Lead | null
}

/** Review queue (779:26221): every imported row still pending or flagged duplicate. */
export async function fetchReviewRows(): Promise<ReviewRow[]> {
  const rows = await db.select().from(importRows).where(inArray(importRows.status, ['pending', 'duplicate']))
  if (rows.length === 0) return []
  const batchIds = Array.from(new Set(rows.map((r) => r.importId)))
  const batches = await db.select().from(imports).where(inArray(imports.id, batchIds))
  const dupIds = rows.map((r) => r.duplicateOfLeadId).filter((id): id is string => !!id)
  // Trashed targets are not merge targets: the row falls back to the plain approve/reject flow.
  const existing = dupIds.length ? await db.select().from(leads).where(and(inArray(leads.id, dupIds), isNull(leads.deletedAt))) : []
  const batchById = new Map(batches.map((b) => [b.id, b]))
  const leadById = new Map(existing.map((l) => [l.id, l]))
  return rows
    .map((row) => {
      const target = row.duplicateOfLeadId ? leadById.get(row.duplicateOfLeadId) ?? null : null
      return {
        // A duplicate whose target was deleted/purged is reviewed as a plain new lead.
        row: row.status === 'duplicate' && row.duplicateOfLeadId && !target ? { ...row, status: 'pending' } : row,
        data: row.data as Record<string, string>,
        receivedAt: batchById.get(row.importId)?.createdAt ?? new Date(0),
        fileName: batchById.get(row.importId)?.fileName ?? '',
        existing: target,
      }
    })
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
}
