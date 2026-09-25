import 'server-only'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { leadEvents } from '@/lib/db/schema'
import { sessionMemberSql } from '@/lib/db/session'

/*
 * (REG-613, parity Q-20) The lead event log — written by the actions whose work leaves no row behind (a removal, an edit, a
 * deletion, an undo, a send), read back by the Activity feed. Everything else stays derived from the records themselves.
 */
export type LeadEventKind = 'member_removed' | 'field_edited' | 'task_deleted' | 'note_deleted' | 'file_trashed' | 'file_deleted' | 'return_undone' | 'invite_sent' | 'questionnaire_asked'
  | 'contract_unsigned' | 'contract_archived' | 'contract_restored'   // (REG-634, contracts parity E-128) what a contract's own stamps can't show
  | 'comparison_deleted'   // (REG-641, X-Ray parity Q-20) a Quote X-Ray reading removed — the row goes, the trail stays
export type FieldChange = { key: string; label: string; from: string; to: string }
export type LeadEventDetail = {
  memberId?: string; name?: string; title?: string; kind?: string; when?: string | null; reason?: string | null; phone?: string
  fields?: FieldChange[]
}
type Writer = Pick<typeof db, 'insert'>

/** `actorId` left out = the signed-in member (REG-667: resolved inside the insert, so a caller's transaction never waits on a read). */
export async function logLeadEvent(tx: Writer, leadId: string, kind: LeadEventKind, detail: LeadEventDetail = {}, actorId?: string | null): Promise<void> {
  await tx.insert(leadEvents).values({ id: randomUUID(), leadId, kind, actorId: actorId === undefined ? sessionMemberSql : actorId, at: new Date(), detail })
}

/** The lead columns an edit can change, in the form's words — what "You edited the lead — Budget (S$): 68,000 → 72,000" prints. */
export const FIELD_LABELS: Record<string, string> = {
  name: 'Lead name', phone: 'Lead phone number', source: 'Lead source', propertyType: 'Property type', propertyAddress: 'Property address',
  email: 'Lead email', leadAddress: 'Lead address', budgetMinor: 'Budget (S$)', estimatedStartDate: 'Estimated start date', style: 'Style',
  keyCollection: 'Key collection', condition: 'Condition', areaSqft: 'Area size (sq ft)', notes: 'Remarks', area: 'District', icNumber: 'NRIC / FIN', customerId: 'Customer ID',
}
/** A column value as the sentence prints it: money for the budget, a date for a date, "—" for nothing. */
export function printField(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (key === 'budgetMinor') { const n = Number(v); return n ? (n / 100).toLocaleString('en-SG') : '—' }
  if (v instanceof Date) return v.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/(\d{2})$/, '’$1')
  return String(v)
}
/** The changed columns between the row as it was and the columns about to be written — at most six, so a sentence stays a sentence. */
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): FieldChange[] {
  const out: FieldChange[] = []
  for (const key of Object.keys(FIELD_LABELS)) {
    if (!(key in after)) continue
    const a = before[key], b = after[key]
    const same = a instanceof Date || b instanceof Date ? (a instanceof Date ? a.getTime() : a ?? null) === (b instanceof Date ? b.getTime() : b ?? null) : (a ?? null) === (b ?? null)
    if (!same) out.push({ key, label: FIELD_LABELS[key]!, from: printField(key, a), to: printField(key, b) })
  }
  return out.slice(0, 6)
}
