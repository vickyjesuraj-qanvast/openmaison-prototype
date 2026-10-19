// S46C · the pure part, on sample rows (no server, no database): the port of 1.0's archived leads (lib/port/archived-leads.ts).
// Run: npx tsx design-source/verify/pending-modules/pm2-s46c-pure.mts (verify-pm2-s46c.cjs runs it and counts its checks). Each check asserts
// the rule, with the sample row it reads.
import { ARCHIVED_REASON, archivedAtOf, archivedLogId, isArchivedReason, portArchivedLead, portArchivedLeads, withoutArchivedReason, type V1ArchivedLead } from '../../../lib/port/archived-leads.ts'

let pass = 0, fail = 0
const ok = (cond: boolean, name: string) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const PORTED = new Date('2026-11-02T01:00:00.000Z')
const members: Record<string, string> = { 'u-dane': 'dane', 'u-sarah': 'sarah' }
const memberFor = (u: string) => members[u] ?? null

console.log('1.0’s archived leads → Lost, never Deleted Leads (lib/port/archived-leads.ts)')
{
  const live: V1ArchivedLead = { id: 'L1', archived_at: null, stage: 'Contacted' }
  const r = portArchivedLead(live, memberFor, PORTED)
  ok(!r.archived && r.stage === 'Contacted' && r.log === null && r.deletedAt === null && r.notes.length === 0, 'a lead never archived comes back as it is')
  ok(!portArchivedLead({ ...live, archived_at: '  ' }, memberFor, PORTED).archived, '…and a blank archive date is no archive')
}
{
  const a: V1ArchivedLead = { id: 'L2', archived_at: '2026-03-04T09:15:00.000Z', stage: 'Contacted', archived_by: 'u-sarah' }
  const r = portArchivedLead(a, memberFor, PORTED)
  ok(r.archived && r.stage === 'Lost' && r.deletedAt === null, 'an archived Contacted lead lands in Lost — deleted_at stays null (never trash)')
  ok(!!r.log && r.log.fromStage === 'Contacted' && r.log.toStage === 'Lost', '…with one Lost stage log from the stage it was in (Resume reads it)')
  ok(r.log?.payload.reason === ARCHIVED_REASON && ARCHIVED_REASON === 'Archived in 1.0', '…its reason “Archived in 1.0”')
  ok(r.log?.createdAt.toISOString() === '2026-03-04T09:15:00.000Z', '…at the archive’s own moment')
  ok(r.log?.movedBy === 'sarah', '…moved by the member 1.0’s “Lead archived” line names')
  ok(r.log?.id === archivedLogId('L2') && portArchivedLead(a, memberFor, PORTED).log?.id === r.log?.id, '…under an id from the lead’s own — a second run writes the same row')
}
{
  const r = portArchivedLead({ id: 'L3', archived_at: 1772615700000, stage: 'Quote Sent', archived_by: 'u-gone' }, memberFor, PORTED)
  ok(r.log?.createdAt.getTime() === 1772615700000, 'an epoch archive date is read as one')
  ok(r.log?.movedBy === null && r.notes.includes('archived-by-unknown'), 'a user the members’ port doesn’t know: the log names nobody, and says so')
  ok(portArchivedLead({ id: 'L3b', archived_at: new Date(1772615700000), stage: 'Met' }, memberFor, PORTED).log?.movedBy === null, 'no archive line found: the log names nobody, nothing noted')
}
{
  const r = portArchivedLead({ id: 'L4', archived_at: 'not a date', stage: 'New' }, memberFor, PORTED)
  ok(r.stage === 'Lost' && r.log?.createdAt.getTime() === PORTED.getTime() && r.notes.includes('bad-date'), 'an archive date that can’t be read lands at the port’s moment, noted')
  ok(archivedAtOf('not a date') === undefined && archivedAtOf(null) === null && archivedAtOf('2026-01-02')?.getUTCFullYear() === 2026, 'archivedAtOf: unreadable, none, a date')
}
{
  const r = portArchivedLead({ id: 'L5', archived_at: '2026-02-01T00:00:00Z', stage: 'Lost', archived_by: 'u-dane' }, memberFor, PORTED)
  ok(r.archived && r.stage === 'Lost' && r.log === null && r.notes.includes('already-lost'), 'a lead 1.0 had closed keeps its own Lost log — the archive adds none')
}
{
  const r = portArchivedLead({ id: 'L6', archived_at: '2026-02-01T00:00:00Z', stage: 'Won', hasProject: true }, memberFor, PORTED)
  ok(r.stage === 'Won' && r.log === null && r.notes.includes('kept-by-project') && r.deletedAt === null, 'a lead with a project stays where the project holds it (2.0 refuses Lost)')
}
{
  const r = portArchivedLead({ id: 'L7', archived_at: '2026-02-01T00:00:00Z', stage: 'On Hold' }, memberFor, PORTED)
  ok(r.stage === 'Lost' && r.log?.fromStage === 'On Hold', 'an archived On Hold lead goes on to Lost from On Hold, as a Qanvast return does')
}
{
  const all = portArchivedLeads([
    { id: 'A', archived_at: null, stage: 'New' },
    { id: 'B', archived_at: '2026-01-05T00:00:00Z', stage: 'Met' },
    { id: 'C', archived_at: '2026-01-06T00:00:00Z', stage: 'Lost' },
  ], memberFor, PORTED)
  ok(all.leads.length === 3 && all.leads.every((l) => l.deletedAt === null), 'a whole studio: every lead kept, none to the trash')
  ok(all.leads.filter((l) => l.log).length === 1 && all.notes.length === 1 && all.notes[0]?.kind === 'already-lost' && all.notes[0]?.leadId === 'C', '…one Lost log written, one note for the port log')
}
{
  const studio = [{ name: 'Went with another firm', retired: false }, { name: 'Budget mismatch', retired: false }]
  ok(withoutArchivedReason(studio) === studio, 'the studio’s Lost reasons are left as they are — the archive’s is the system’s, never added')
  const typed = [...studio, { name: 'archived in 1.0', retired: false }]
  ok(withoutArchivedReason(typed).length === 2, '…and a hand-made list carrying the same words is cleaned of it (any case)')
  ok(isArchivedReason('Archived in 1.0') && !isArchivedReason('Lead returned to Qanvast') && !isArchivedReason(null), 'isArchivedReason knows the archive’s reason alone')
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
