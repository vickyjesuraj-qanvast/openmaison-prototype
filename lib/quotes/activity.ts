import type { LeadFile, Member, Quote, QuoteItem, QuotePayment } from '@/lib/db/schema'
import { presetLabel, presetOf } from './payments'

/**
 * The editor's Activity section (1254:3755, REG-421): the quote's own trail, derived from its records the way the lead's
 * feed is (REG-191 — no event log): created, the lines written, the schedule set, files attached, sent, approved.
 * Newest first; the first row wears the primary dot.
 */
export type QuoteEvent = { id: string; at: Date; text: string }

export function deriveQuoteActivity(q: Quote, items: QuoteItem[], payments: QuotePayment[], files: { createdAt: Date }[] | LeadFile[], members: Member[]): QuoteEvent[] {
  const who = (id: string | null) => members.find((m) => m.id === id)?.name ?? 'the studio'
  const ev: QuoteEvent[] = [{ id: 'created', at: q.createdAt, text: `Quote created by ${who(q.preparedBy)}` }]
  const lines = items.filter((i) => i.kind === 'item')
  if (lines.length) ev.push({ id: 'items', at: new Date(Math.min(...lines.map((l) => l.createdAt.getTime()))), text: `${lines.length} ${lines.length === 1 ? 'item' : 'items'} added to the quote` })
  if (payments.length) ev.push({ id: 'payments', at: new Date(Math.max(...payments.map((p) => (p.updatedAt ?? p.createdAt).getTime()))), text: `Payment schedule set to ${presetLabel(presetOf(payments)).replace('Default: ', '')}` })
  if (files.length) ev.push({ id: 'files', at: new Date(Math.max(...files.map((f) => f.createdAt.getTime()))), text: `${files.length} ${files.length === 1 ? 'file' : 'files'} attached` })
  if (q.sentAt) ev.push({ id: 'sent', at: q.sentAt, text: q.status === 'Sent for Approval' ? 'Quote sent for approval' : 'Quote sent to the client' })
  if (q.approvedAt) ev.push({ id: 'approved', at: q.approvedAt, text: 'Quote approved' })
  return ev.sort((a, b) => b.at.getTime() - a.at.getTime())
}
