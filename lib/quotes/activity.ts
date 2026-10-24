import type { LeadFile, Member, Quote, QuoteItem, QuotePayment, QuoteVersion } from '@/lib/db/schema'
import { presetLabel, presetOf } from './payments'

/**
 * The editor's Activity section (1254:3755, REG-421): the quote's own trail, derived from its records the way the lead's
 * feed is (REG-191 — no event log): created, the lines written, the schedule set, files attached, sent, approved.
 * Newest first. (activity by date 2026-10-24) By day on the house timeline, each line its glyph — the mock's dots (the first one primary) are gone.
 */
export type QuoteEvent = { id: string; at: Date; text: string
  /** (activity by date 2026-10-24 — his "add type icons … to represent what type of activity it is") the line's glyph on the trail's rail
      (`QUOTE_GLYPH`): the quote's own moments wear the icon the app already gives that moment — the bell's for an approval, a change asked,
      an approval, a confirmation, a signature; the lead feed's for a view and a link; Files' folder for files attached. */
  icon: string }
/** (activity by date 2026-10-24) Each line's glyph, by its id's kind (`rev-…` = a version kept). */
export const QUOTE_GLYPH: Readonly<Record<string, string>> = {
  created: 'docs',          // the Quote quick link's mark
  items: 'list_alt',        // the lines
  payments: 'payments',     // the schedule
  files: 'folder',          // the Files kind (lib/leads/activity-glyph.ts)
  submitted: 'approval',    // the bell's quote_approval
  changes: 'edit',          // the bell's quote_changes
  approved: 'verified',     // the bell's quote_approved
  sent: 'send',
  confirmed: 'task',        // the bell's quote_confirmed
  signed: 'draw',           // the bell's quote_signed
  viewed: 'visibility',     // the lead feed's view line
  'view-link': 'link',
  rev: 'history',           // a version kept
}
const glyphOf = (id: string) => QUOTE_GLYPH[id.startsWith('rev-') ? 'rev' : id] ?? 'docs'
/** A brief as a line quotes it — its first 80 characters. */
const clip = (s: string) => (s.length > 80 ? `${s.slice(0, 79).trimEnd()}…` : s)

export function deriveQuoteActivity(q: Quote, items: QuoteItem[], payments: QuotePayment[], files: { createdAt: Date }[] | LeadFile[], members: Member[], versions: QuoteVersion[] = []): QuoteEvent[] {
  const who = (id: string | null) => members.find((m) => m.id === id)?.name ?? 'the studio'
  const ev: Omit<QuoteEvent, 'icon'>[] = [{ id: 'created', at: q.createdAt, text: q.draftBrief ? `Quote drafted by Maison AI for ${who(q.preparedBy)}, from the brief “${clip(q.draftBrief)}”` : `Quote created by ${who(q.preparedBy)}` }]   // (pending modules S04) Draft with Maison AI
  const lines = items.filter((i) => i.kind === 'item')
  if (lines.length) ev.push({ id: 'items', at: new Date(Math.min(...lines.map((l) => l.createdAt.getTime()))), text: `${lines.length} ${lines.length === 1 ? 'item' : 'items'} added to the quote` })
  if (payments.length) ev.push({ id: 'payments', at: new Date(Math.max(...payments.map((p) => (p.updatedAt ?? p.createdAt).getTime()))), text: `Payment schedule set to ${presetLabel(presetOf(payments)).replace('Default: ', '')}` })
  if (files.length) ev.push({ id: 'files', at: new Date(Math.max(...files.map((f) => f.createdAt.getTime()))), text: `${files.length} ${files.length === 1 ? 'file' : 'files'} attached` })
  /* (REG-624, parity §8.2 · E-98) Each send reads its own stamp: the line used to say "for approval" or "to the client" by the quote's CURRENT
     status. Who sent it for approval, the approver's last note, who approved, when it went to the client, when the client confirmed. */
  if (q.submittedAt) ev.push({ id: 'submitted', at: q.submittedAt, text: `Quote sent for approval by ${who(q.submittedBy)}` })
  if (q.reviewedAt && q.reviewNote) ev.push({ id: 'changes', at: q.reviewedAt, text: `Changes asked by ${who(q.reviewedBy)} — “${q.reviewNote}”` })
  if (q.approvedAt) ev.push({ id: 'approved', at: q.approvedAt, text: q.approvedBy ? `Quote approved by ${who(q.approvedBy)}` : 'Quote approved' })
  if (q.clientSentAt) ev.push({ id: 'sent', at: q.clientSentAt, text: 'Quote sent to the client' })
  else if (q.sentAt && !q.submittedAt) ev.push({ id: 'sent', at: q.sentAt, text: q.status === 'Sent for Approval' ? 'Quote sent for approval' : 'Quote sent to the client' })   // a quote from before the stamps
  if (q.confirmedAt) {
    /* (REG-626, parity Q-32) with the client's answer on the optional works */
    const asked = items.filter((i) => i.kind === 'item' && i.optional && i.clientChoice)
    const wants = asked.filter((i) => i.clientChoice === 'want').map((i) => i.name)
    ev.push({ id: 'confirmed', at: q.confirmedAt, text: q.confirmedVia === 'marked' ? `Marked as confirmed by ${who(q.confirmedMarkedBy)}`   // (S44F — NB-04) by hand, by whom
      : `Confirmed by ${q.confirmedBy ?? 'the client'} on the link${asked.length ? (wants.length ? ` — wants ${wants.length} of ${asked.length} optional works: ${wants.join(', ')}` : ` — no optional works`) : ''}` })
  }
  if (q.signedAt) ev.push({ id: 'signed', at: q.signedAt, text: 'Quote signed' })   // (REG-626, parity Q-31)
  /* (pending modules S04 — 1.0's view count) the client opened it on their link — the last time, and how many times */
  if (q.clientLastViewedAt) ev.push({ id: 'viewed', at: q.clientLastViewedAt, text: `The client opened the quote on their link${q.clientViewCount > 1 ? ` — ${q.clientViewCount} times` : ''}` })
  if (q.viewTokenAt) ev.push({ id: 'view-link', at: q.viewTokenAt, text: `View-only link made by ${who(q.viewTokenBy)} — the client can look at the quote, live` })   // (pending modules S02)
  for (const v of versions) ev.push({ id: `rev-${v.id}`, at: v.createdAt, text: `Version ${v.version} kept and version ${v.version + 1} started by ${who(v.createdBy)}` })   // (REG-565)
  return ev.sort((a, b) => b.at.getTime() - a.at.getTime()).map((e) => ({ ...e, icon: glyphOf(e.id) }))
}
