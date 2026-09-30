import 'server-only'   // (REG-286) libSQL must never reach the browser bundle: every client import of this module is `import type`
import { parseInputDate, parseInputDateTime, titleCaseName } from '@/lib/format'
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { importRows, imports, leadAssignees, leadReturns, leadTasks, leads, members, stageLogs, leadNotes, quoteComparisons } from '@/lib/db/schema'
import type { ImportBatch, ImportRow, Lead, LeadTask, Member, StageLog } from '@/lib/db/schema'
import { STAGES, type Stage } from '@/lib/leads/enums'
import { DETAIL_TABS, detailHref } from '@/lib/leads/stage-policy'
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
  /** Qanvast lead return (931:48236): the latest return's status, so the listing menus gate "Return Lead" like the overview does. */
  returnStatus: 'processing' | 'rejected' | 'approved' | null
  /** (REG-600) The latest contact — a Notes-tab contact log or a Contacted-stage log entry — for the listing's column and the Overview. */
  lastContact: LastContact | null
  /** (REG-607) How many contacts are logged — the Contacted stage's entries and the Notes tab's logs — for the Lost dialog's "n of 3 contacts logged" hint. */
  contactCount: number
  /** (REG-640, X-Ray parity Q-18) The lead's latest Quote X-Ray: the other studio it was compared with — the Lost dialog's competitor. */
  lastComparison: { studio: string; at: number } | null
  /** (UX audit L3) Since when the lead has sat in its stage: the latest move into it, else its creation (a lead still in New) — the cards'
   *  "5d in Met" and the In stage column. */
  stageSince: Date
}
export type LastContact = { at: Date; channel: string | null; outcome: string | null }

/**
 * REVALIDATION (REG-286) — the one eviction for a lead, used by every server action that writes about it.
 *
 * `next.config.ts` holds dynamic route entries for 300s on the promise that "every mutation goes through a server
 * action that calls revalidatePath". That promise was kept by six hand-copied `touch(leadId)` helpers, each naming
 * the sibling paths it happened to remember: the Activity tab was named by NONE of them (so a new task or note took
 * up to five minutes to appear there), Files named Tasks but Notes did not, and `app/leads/actions.ts` — stage
 * moves, assignment, lead edits — refreshed only the listing, leaving the lead's own pages stale.
 *
 * This walks DETAIL_TABS, so a tab added there is covered the day it ships, and never by hand again.
 */
export function revalidateLead(leadId: string): void {
  for (const tab of DETAIL_TABS) revalidatePath(detailHref(leadId, tab.slug))
  revalidateLeadListings()
}

/** The screens that list leads rather than show one: the listing (table + kanban) and Qanvast Ops › Leads. */
export function revalidateLeadListings(): void {
  revalidatePath('/leads')
  revalidatePath('/qanvast-ops')
}

/**
 * Studio-level writes with no single lead to name — the tag catalogue, task templates. A layout revalidate reaches
 * every route nested under /leads (the pattern app/settings/actions.ts already uses for Quote approval).
 */
export function revalidateEveryLead(): void {
  revalidatePath('/leads', 'layout')
  revalidatePath('/qanvast-ops')
}

/**
 * Everything a `LeadRow` needs beside the lead record. The listing passes every row of each table; the by-id path
 * passes only the rows of one lead — the builder filters by lead id either way, so both get identical rows.
 */
type RowParts = {
  tasks: LeadTask[]
  links: (typeof leadAssignees.$inferSelect)[]
  team: Member[]
  logs: StageLog[]
  rets: { leadId: string; status: string }[]
  /** (REG-600) The Notes tab's contact logs — when, how, what came of it. */
  contacts: { leadId: string; contactedAt: Date | null; createdAt: Date; channel: string | null; outcome: string | null }[]
  /** (REG-640) The leads' comparisons, newest first — the latest names the competitor. */
  xrays: { leadId: string | null; otherStudio: string; createdAt: Date }[]
}

/** (REG-600) The latest contact of a lead: the Notes tab's logs and the Contacted stage's entries (their typed "when", else the move's time). */
function lastContactOf(leadId: string, contacts: RowParts['contacts'], logs: StageLog[], stageData: Partial<WizardData>): LastContact | null {
  let best: LastContact | null = null
  const consider = (at: Date | null, channel: string | null, outcome: string | null) => { if (at && !Number.isNaN(at.getTime()) && (!best || at > best.at)) best = { at, channel, outcome } }
  for (const c of contacts) if (c.leadId === leadId) consider(c.contactedAt ?? c.createdAt, c.channel, c.outcome)
  const movedAt = logs.filter((g) => g.toStage === 'Contacted').at(-1)?.createdAt ?? null
  for (const l of stageData.logs ?? []) consider(parseInputDateTime(l.when) ?? parseInputDate(l.when) ?? movedAt, l.channel, l.outcome || null)
  return best
}

/**
 * THE row builder (REG-286). `fetchLeadRows` (listing) and `fetchLeadRow` (one lead) both come through here, so a
 * lead can never render differently in the table than on its own page — the second assembler this replaced would
 * have drifted the first time one of them learnt a new field.
 */
function buildLeadRows(rows: Lead[], { tasks, links, team, logs, rets, contacts, xrays }: RowParts): LeadRow[] {
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
  const latestReturn = new Map<string, LeadRow['returnStatus']>()
  for (const r of rets) latestReturn.set(r.leadId, r.status === 'processing' || r.status === 'rejected' || r.status === 'approved' ? r.status : null)
  const isActive = (s: string): s is (typeof STAGES)[number] => (STAGES as readonly string[]).includes(s)
  const resumeStageOf = (l: Lead): Stage | null => {
    if (isActive(l.stage)) return null
    const last = logsByLead.get(l.id)?.filter((g) => g.toStage === l.stage).at(-1)
    return last && isActive(last.fromStage) ? last.fromStage : null
  }
  return rows.map((l) => {
    const stageData = mergeStageData(logsByLead.get(l.id) ?? [])
    return {
      ...l,
      name: titleCaseName(l.name),   // (REG-329) every surface reads the name as "Farah Ahmad", whatever case it was saved in
      tasks: tasks.filter((t) => t.leadId === l.id && !t.done),
      assignees: links
        .filter((a) => a.leadId === l.id)
        .map((a) => byMember.get(a.memberId))
        .filter((m): m is Member => !!m),
      onHoldFollowUp: l.stage === 'On Hold' ? (holdFollowUps.get(l.id) ?? null) : null,
      stageData,
      resumeStage: resumeStageOf(l),
      returnStatus: latestReturn.get(l.id) ?? null,
      lastContact: lastContactOf(l.id, contacts, logsByLead.get(l.id) ?? [], stageData),
      contactCount: contacts.filter((c) => c.leadId === l.id).length + (stageData.logs?.filter((x) => !x.noteId).length ?? 0),   // (REG-607; UX audit 2026-09-30, L2: a Notes log carried into Contacted counts once)
      lastComparison: ((x) => (x ? { studio: x.otherStudio, at: x.createdAt.getTime() } : null))(xrays.find((x) => x.leadId === l.id)),   // (REG-640)
      stageSince: logsByLead.get(l.id)?.filter((g) => g.toStage === l.stage).at(-1)?.createdAt ?? l.createdAt,   // (UX audit L3) logs are oldest first
    }
  })
}

/** Full listing payload — 18 rows; joins resolved in memory. */
export async function fetchLeadRows(): Promise<{ rows: LeadRow[]; team: Member[]; now: number }> {
  const [allLeads, tasks, links, team, logs, rets, contacts, xrays] = await Promise.all([
    db.select().from(leads).where(isNull(leads.deletedAt)).orderBy(desc(leads.createdAt)),
    db.select().from(leadTasks).orderBy(sql`${leadTasks.dueAt} is null, ${leadTasks.dueAt} asc`),
    db.select().from(leadAssignees),
    db.select().from(members),
    db.select().from(stageLogs).orderBy(asc(stageLogs.createdAt)),
    db.select({ leadId: leadReturns.leadId, status: leadReturns.status }).from(leadReturns).orderBy(asc(leadReturns.returnedAt)),
    db.select({ leadId: leadNotes.leadId, contactedAt: leadNotes.contactedAt, createdAt: leadNotes.createdAt, channel: leadNotes.channel, outcome: leadNotes.outcome }).from(leadNotes).where(eq(leadNotes.kind, 'contact')),   // (REG-600)
    db.select({ leadId: quoteComparisons.leadId, otherStudio: quoteComparisons.otherStudio, createdAt: quoteComparisons.createdAt }).from(quoteComparisons).where(isNotNull(quoteComparisons.leadId)).orderBy(desc(quoteComparisons.createdAt)),   // (REG-640)
  ])
  return { rows: buildLeadRows(allLeads, { tasks, links, team, logs, rets, contacts, xrays }), team, now: Date.now() }
}

/**
 * ONE lead, assembled by the same builder (REG-286). `fetchLeadDetail` used to call `fetchLeadRows()` and then
 * `rows.find(...)`: six unfiltered selects — every lead, every task, every assignment, every stage log and every
 * return in the database — to render one page. Each select here is bounded by the lead id; `team` stays the full
 * members roster, because the pickers (Assign, task assignees, filters) list the whole studio.
 *
 * `logs` rides along because the caller needs the lead's stage logs too, and this already loaded them.
 */
export async function fetchLeadRow(id: string): Promise<{ row: LeadRow | null; team: Member[]; logs: StageLog[]; now: number }> {
  const [rows, tasks, links, team, logs, rets, contacts, xrays] = await Promise.all([
    db.select().from(leads).where(and(eq(leads.id, id), isNull(leads.deletedAt))).limit(1),   // a trashed lead has no detail page, exactly as the listing path excluded it
    db.select().from(leadTasks).where(eq(leadTasks.leadId, id)).orderBy(sql`${leadTasks.dueAt} is null, ${leadTasks.dueAt} asc`),
    db.select().from(leadAssignees).where(eq(leadAssignees.leadId, id)),
    db.select().from(members),
    db.select().from(stageLogs).where(eq(stageLogs.leadId, id)).orderBy(asc(stageLogs.createdAt)),
    db.select({ leadId: leadReturns.leadId, status: leadReturns.status }).from(leadReturns).where(eq(leadReturns.leadId, id)).orderBy(asc(leadReturns.returnedAt)),
    db.select({ leadId: leadNotes.leadId, contactedAt: leadNotes.contactedAt, createdAt: leadNotes.createdAt, channel: leadNotes.channel, outcome: leadNotes.outcome }).from(leadNotes).where(and(eq(leadNotes.leadId, id), eq(leadNotes.kind, 'contact'))),
    db.select({ leadId: quoteComparisons.leadId, otherStudio: quoteComparisons.otherStudio, createdAt: quoteComparisons.createdAt }).from(quoteComparisons).where(eq(quoteComparisons.leadId, id)).orderBy(desc(quoteComparisons.createdAt)),   // (REG-640)
  ])
  return { row: buildLeadRows(rows, { tasks, links, team, logs, rets, contacts, xrays })[0] ?? null, team, logs, now: Date.now() }
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
  /** Queue duplicate: the other import row it collided with — same file, or an earlier import still in the queue (no existing lead to merge into). */
  twin: { data: Record<string, string>; status: string; sameFile: boolean; fileName: string } | null
}

/** Review queue (779:26221): every imported row still pending or flagged duplicate. */
export async function fetchReviewRows(): Promise<ReviewRow[]> {
  const rows = await db.select().from(importRows).where(inArray(importRows.status, ['pending', 'duplicate']))
  if (rows.length === 0) return []
  const batchIds = Array.from(new Set(rows.map((r) => r.importId)))
  // Every row of those imports (approved ones included) so an in-file duplicate can show the row it collided with.
  const siblings = await db.select().from(importRows).where(inArray(importRows.importId, batchIds))
  const keyOf = (d: Record<string, string>, on: string | null) => on === 'email' ? (d['Lead Email'] ?? '').trim().toLowerCase() : (d['Lead Phone Number'] ?? '').replace(/\D/g, '')
  const twinOf = (row: ImportRow): ReviewRow['twin'] => {
    if (row.status !== 'duplicate' || row.duplicateOfLeadId) return null
    const d = row.data as Record<string, string>; const on = row.matchedOn ?? 'phone'; const k = keyOf(d, on)
    if (!k) return null
    // The importer flags against earlier rows of the same file AND against rows still queued from earlier imports.
    const rank = (r: ImportRow) => (r.importId === row.importId ? 0 : 10) + (r.status === 'approved' ? 0 : r.status === 'pending' ? 1 : 2)
    const hit = siblings.filter((r) => r.id !== row.id && keyOf(r.data as Record<string, string>, on) === k).sort((a, b) => rank(a) - rank(b))[0]
    return hit ? { data: hit.data as Record<string, string>, status: hit.status, sameFile: hit.importId === row.importId, fileName: batchById.get(hit.importId)?.fileName ?? '' } : null
  }
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
        twin: twinOf(row),
      }
    })
    .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
}
