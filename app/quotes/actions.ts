'use server'

import { randomUUID } from 'node:crypto'
import { and, asc, eq, gte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, notifications, quoteItems, quotePayments, quoteVersions, quotes, leads } from '@/lib/db/schema'
import { PROPERTY_TYPES } from '@/lib/leads/enums'
import { revalidateLead } from '@/lib/leads/queries'
import { quoteStatuses, type QuoteStatus } from '@/lib/leads/quote-filters'
import { parseSections, serializeSections, type QuoteSectionState } from '@/lib/quotes/sections'
import { fetchQuoteApproval, isApprover } from '@/lib/settings/queries'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'
import { approverIds } from '@/lib/notifications/approvers'
import { reviveSnapshot } from '@/lib/templates/queries'
import { parseDiscounts, quoteTotals } from '@/lib/quotes/math'
import { offersQuoteSent, statusBlock } from '@/lib/quotes/policy'
import { moveStageHref } from '@/lib/leads/move-link'
import { isQuoteStatus } from '@/lib/leads/quote-filters'
import { setQuoteStatus } from '@/app/leads/quotes-actions'

/* Quote editor (1271:40301). Autosave writes land here; the editor keeps its own state, so nothing here refreshes the
   route — the lead's pages are revalidated because the Quotes tab, the Overview card and Activity print these fields. */

const touch = (leadId: string, quoteId: string) => { revalidateLead(leadId); revalidatePath(`/quotes/${quoteId}`) }

async function load(quoteId: string) {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId))
  return q ?? null
}

const clean = (v: string | undefined, max = 200) => (v === undefined ? undefined : v.slice(0, max))

/** The signed-in member (the demo's `is_you`) and whether they approve quotes. */
async function whoAmI(): Promise<{ id: string | null; name: string; approver: boolean }> {
  const [m] = await db.select({ id: members.id, name: members.name, role: members.role }).from(members).where(eq(members.isYou, true))
  return { id: m?.id ?? null, name: m?.name ?? 'The studio', approver: await isApprover(m?.id, m?.role) }
}
const leadName = async (leadId: string) => (await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)))[0]?.name ?? null
/** (UX audit Q1) The lead's next stage, offered where the quote now is: the Move stage window at Quote Sent with this quote picked — only
    while the lead is before Quote Sent and the quote is with the client (Sent to Client · Confirmed). `null` = nothing to offer. */
async function moveOffer(leadId: string, quoteId: string, status: string): Promise<string | null> {
  const [l] = await db.select({ stage: leads.stage }).from(leads).where(eq(leads.id, leadId))
  return offersQuoteSent(l?.stage, status) ? moveStageHref(leadId, 'quote-sent', { quote: quoteId }) : null
}

export type GeneralPatch = {
  title?: string
  preparedBy?: string | null
  /** Epoch ms, or null to clear. */
  validUntil?: number | null
  projectRef?: string
  nric?: string
  customerId?: string
  propertyType?: string
  siteAddress?: string
  /** (REG-588) The second client; '' clears. */
  client2Name?: string
  client2Nric?: string
}

/** General Info (1271:39680) autosave. A public endpoint: every string is bounded and the property type must be one of ours. */
export async function saveQuoteGeneral(quoteId: string, patch: GeneralPatch): Promise<{ updatedAt: number }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const now = new Date()
  const set: Partial<typeof quotes.$inferInsert> = { updatedAt: now }
  const title = clean(patch.title)
  if (title !== undefined) set.title = title.trim() || q.title   // a quote always has a title: an emptied field keeps the last one
  if (patch.preparedBy !== undefined) set.preparedBy = patch.preparedBy
  if (patch.validUntil !== undefined) set.validUntil = patch.validUntil === null ? null : new Date(patch.validUntil)
  if (patch.projectRef !== undefined) set.projectRef = clean(patch.projectRef)
  if (patch.nric !== undefined) set.nric = clean(patch.nric, 20)
  if (patch.customerId !== undefined) set.customerId = clean(patch.customerId, 60)
  if (patch.propertyType !== undefined) {
    if (patch.propertyType !== '' && !(PROPERTY_TYPES as readonly string[]).includes(patch.propertyType)) throw new Error(`Unknown property type: ${patch.propertyType}`)
    set.propertyType = patch.propertyType || null
  }
  if (patch.siteAddress !== undefined) set.siteAddress = clean(patch.siteAddress, 300)
  if (patch.client2Name !== undefined) set.client2Name = clean(patch.client2Name, 120)?.trim() || null   // (REG-588)
  if (patch.client2Nric !== undefined) set.client2Nric = clean(patch.client2Nric, 20)?.trim() || null
  await db.update(quotes).set(set).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId)
  return { updatedAt: now.getTime() }
}

/** Section order + collapsed state (owner 2026-09-11) — stored per quote, validated through `parseSections`. */
export async function saveQuoteSections(quoteId: string, sections: QuoteSectionState[]): Promise<void> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const safe = parseSections(JSON.stringify(sections))
  await db.update(quotes).set({ sections: serializeSections(safe) }).where(eq(quotes.id, quoteId))
  revalidatePath(`/quotes/${quoteId}`)
}

/**
 * Header › Send (1201:33817): the quote takes the next step of the studio's lifecycle (Settings › Leads › Quote approval —
 * Draft → Sent for Approval → Approved → Sent to Client → Signed, or Draft → Sent to Client → Signed). Only a Draft or an
 * Approved quote has somewhere to be sent; anything else is returned unchanged. The first send stamps Sent.
 */
export async function sendQuote(quoteId: string): Promise<{ status: QuoteStatus; sentAt: number | null; updatedAt: number; /** (UX audit Q1) the Move stage link, when the lead is before Quote Sent */ moveTo?: string | null }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const steps = quoteStatuses(await fetchQuoteApproval())
  const current = q.status as QuoteStatus
  const me = await whoAmI()
  let next: QuoteStatus | null = current === 'Draft' ? (steps[1] ?? null) : current === 'Approved' ? 'Sent to Client' : null
  if (!next) return { status: current, sentAt: q.sentAt?.getTime() ?? null, updatedAt: (q.updatedAt ?? q.createdAt).getTime() }
  const now = new Date()
  const set: Partial<typeof quotes.$inferInsert> = { updatedAt: now }
  /* (REG-624, parity Q-23) An approver's own send is the approval — 1.0's rule, and template approval's ("publishing is the approval"):
     the quote goes past Sent for Approval straight to the client, approved by them. */
  if (next === 'Sent for Approval' && me.approver) { next = 'Sent to Client'; set.approvedAt = q.approvedAt ?? now; set.approvedBy = me.id }
  set.status = next
  if (!q.sentAt) set.sentAt = now
  if (next === 'Sent to Client' && !q.clientSentAt) set.clientSentAt = now
  if (next === 'Sent to Client') set.visibility = 'Shared'   /* (REG-625, parity §8.2 · E-124) the client has it: the lists read Shared, not Private */
  if (next === 'Sent for Approval') { set.submittedAt = now; set.submittedBy = me.id }   /* the approver's last note stays on the record; the editor shows it only while it is newer than the last send */
  await db.update(quotes).set(set).where(eq(quotes.id, quoteId))
  if (next === 'Sent for Approval') { const l = await leadName(q.leadId); await notify('quote_approval', await approverIds(), { title: `Quote ${q.number} needs your approval`, body: l ? `For ${l}` : null, href: `/quotes/${quoteId}`, leadId: q.leadId, quoteId, actorId: me.id }) }   /* (REG-604) */
  touch(q.leadId, quoteId)
  return { status: next, sentAt: (set.sentAt ?? q.sentAt ?? null)?.getTime() ?? null, updatedAt: now.getTime(), moveTo: await moveOffer(q.leadId, quoteId, next) }
}

/**
 * (REG-624, parity Q-22) The review bar's Approve: a quote waiting at Sent for Approval becomes Approved, on the record as this approver's
 * (who and when); whoever sent it hears so. Only an approver — an Owner, an Admin or the backup approver — may.
 */
export async function approveQuote(quoteId: string): Promise<{ status: QuoteStatus; updatedAt: number; approvedBy: string | null }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const me = await whoAmI()
  if (!me.approver) throw new Error('only an approver approves a quote')
  if (q.status !== 'Sent for Approval') throw new Error('the quote is not waiting for approval')
  const now = new Date()
  await db.update(quotes).set({ status: 'Approved', approvedAt: now, approvedBy: me.id, updatedAt: now }).where(eq(quotes.id, quoteId))
  const l = await leadName(q.leadId)
  if (q.submittedBy) await notify('quote_approved', [q.submittedBy], { title: `${me.name} approved quote ${q.number}`, body: l ? `For ${l} — send it to the client when you’re ready` : 'Send it to the client when you’re ready', href: `/quotes/${quoteId}`, leadId: q.leadId, quoteId, actorId: me.id })
  touch(q.leadId, quoteId)
  return { status: 'Approved', updatedAt: now.getTime(), approvedBy: me.id }
}

/**
 * (REG-624, parity Q-22) Request changes: the quote goes back to Draft with the approver's note — 1.0's Reject with a reason, in 2.0's
 * words. The note stays at the top of the quote for whoever prepared it until the next send; they hear of it at once.
 */
export async function requestQuoteChanges(quoteId: string, note: string): Promise<{ status: QuoteStatus; updatedAt: number }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const me = await whoAmI()
  if (!me.approver) throw new Error('only an approver sends a quote back')
  if (q.status !== 'Sent for Approval') throw new Error('the quote is not waiting for approval')
  const text = (clean(note, 300) ?? '').trim()
  if (!text) throw new Error('a note says what to change')
  const now = new Date()
  await db.update(quotes).set({ status: 'Draft', reviewNote: text, reviewedBy: me.id, reviewedAt: now, updatedAt: now }).where(eq(quotes.id, quoteId))
  if (q.submittedBy) await notify('quote_changes', [q.submittedBy], { title: `${me.name} asked for changes on quote ${q.number}`, body: text, href: `/quotes/${quoteId}`, leadId: q.leadId, quoteId, actorId: me.id })
  touch(q.leadId, quoteId)
  return { status: 'Draft', updatedAt: now.getTime() }
}

/**
 * (REG-565) ⋯ › Revise: the quote as it stands — its fields, lines and payment rows — is kept whole as version n in
 * `quote_versions`, and the quote row moves on as version n + 1: a Draft again under the same number, its sent / approved
 * stamps cleared, its lines untouched. The kept version opens read-only from Version History (the preview at `?version=n`).
 * A Draft that was never sent has nothing to keep, so Revise refuses it.
 */
export async function reviseQuote(quoteId: string, note?: string): Promise<{ version: number; updatedAt: number }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  if (q.status === 'Draft' && !q.sentAt) throw new Error('a draft is not revised — it is edited')
  const [items, payments, me] = await Promise.all([
    db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(asc(quoteItems.position), asc(quoteItems.createdAt)),
    db.select().from(quotePayments).where(eq(quotePayments.quoteId, quoteId)).orderBy(asc(quotePayments.position), asc(quotePayments.createdAt)),
    db.select({ id: members.id }).from(members).where(eq(members.isYou, true)),
  ])
  const now = new Date()
  await db.insert(quoteVersions).values({ id: randomUUID(), quoteId, version: q.version, snapshotJson: JSON.stringify({ quote: q, items, payments }), note: clean(note, 200) ?? null, createdBy: me[0]?.id ?? null, createdAt: now })
  /* (parity §8.2 · E-100, REG-624) The new version starts clean: the client's confirmation, the approval and its notes belong to the kept one. */
  await db.update(quotes).set({ version: q.version + 1, status: 'Draft', visibility: 'Private', sentAt: null, approvedAt: null, approvedBy: null, submittedAt: null, submittedBy: null, reviewNote: null, reviewedBy: null, reviewedAt: null, clientSentAt: null, confirmedAt: null, confirmedBy: null, signedAt: null, revisedAt: now, updatedAt: now }).where(eq(quotes.id, quoteId))
  await db.update(quoteItems).set({ clientChoice: null }).where(eq(quoteItems.quoteId, quoteId))   /* (REG-626) the client's optional picks answered the kept version */
  touch(q.leadId, quoteId); revalidatePath(`/quotes/${quoteId}/preview`)
  return { version: q.version + 1, updatedAt: now.getTime() }
}

/**
 * (REG-587) Send for confirmation: the quote goes to the client with its confirmation link — no signature yet. From a Draft the
 * studio need not approve, or from Approved; with approval required a Draft goes for approval first (`sendQuote`). Sending again
 * from Sent to Client is allowed (a second nudge with the same link).
 */
export async function sendQuoteForConfirmation(quoteId: string): Promise<{ status: QuoteStatus; sentAt: number; updatedAt: number; /** (UX audit Q1) */ moveTo: string | null }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  const approval = await fetchQuoteApproval()
  const current = q.status as QuoteStatus
  const me = await whoAmI()
  /* (REG-624, parity Q-23) An approver's own quote needs no one else's approval: from a Draft it goes to the client, approved by them. */
  const selfApproves = current === 'Draft' && approval === 'required' && me.approver
  if (!(current === 'Approved' || current === 'Sent to Client' || (current === 'Draft' && approval !== 'required') || selfApproves)) throw new Error('not ready for the client')
  const now = new Date()
  const sentAt = q.sentAt ?? now
  await db.update(quotes).set({ status: 'Sent to Client', sentAt, clientSentAt: q.clientSentAt ?? now, visibility: 'Shared', ...(selfApproves ? { approvedAt: q.approvedAt ?? now, approvedBy: me.id } : {}), updatedAt: now }).where(eq(quotes.id, quoteId))
  touch(q.leadId, quoteId); revalidatePath(`/confirm/${quoteId}`)
  return { status: 'Sent to Client', sentAt: sentAt.getTime(), updatedAt: now.getTime(), moveTo: await moveOffer(q.leadId, quoteId, 'Sent to Client') }
}

/**
 * (REG-587) The client's Confirm on the link: the quote becomes Confirmed with the name typed; one already confirmed or signed is left as it is.
 * (REG-626, parity §8.2 · E-110) Only a quote the studio has sent (or approved for the client) is confirmed — a draft's link says it is still
 * being prepared. (Q-32) With it, the client's answer on every optional line: the ones ticked are wanted, the others skipped.
 */
export async function confirmQuoteOnline(quoteId: string, name: string, picks: string[] = []): Promise<{ confirmedAt: number; by: string }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  if (q.status === 'Confirmed' || q.status === 'Signed') return { confirmedAt: (q.confirmedAt ?? new Date()).getTime(), by: q.confirmedBy ?? name }
  if (q.status !== 'Approved' && q.status !== 'Sent to Client') throw new Error('not sent yet')
  const who = (clean(name, 80) ?? '').trim()
  if (!who) throw new Error('name')
  const now = new Date()
  const optional = await db.select({ id: quoteItems.id, name: quoteItems.name }).from(quoteItems).where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.optional, true), eq(quoteItems.kind, 'item')))
  const wanted = new Set(picks.filter((id) => optional.some((o) => o.id === id)))
  await db.update(quotes).set({ status: 'Confirmed', confirmedAt: now, confirmedBy: who, sentAt: q.sentAt ?? now, clientSentAt: q.clientSentAt ?? now, visibility: 'Shared', updatedAt: now }).where(eq(quotes.id, quoteId))
  for (const o of optional) await db.update(quoteItems).set({ clientChoice: wanted.has(o.id) ? 'want' : 'skip', updatedAt: now }).where(eq(quoteItems.id, o.id))
  const picked = optional.filter((o) => wanted.has(o.id)).map((o) => o.name)
  const body = optional.length ? `${picked.length ? `Wants ${picked.length} of ${optional.length} optional works — ${picked.join(', ')}` : `Passed on the ${optional.length} optional ${optional.length === 1 ? 'work' : 'works'}`}. Next: add the T&Cs and send for signature` : 'Next: add the T&Cs and send for signature'
  /* (UX audit Q1, the confirmation's bell line) A confirmation on a lead still before Quote Sent opens the Move stage window at Quote Sent with this
     quote picked — the pipeline catches up first, then the quote goes for signature. */
  const moveTo = await moveOffer(q.leadId, quoteId, 'Confirmed')
  await notify('quote_confirmed', [...await leadMemberIds(q.leadId), ...await studioRunnerIds(), ...(q.createdBy ? [q.createdBy] : [])], { title: `${who} confirmed quote ${q.number}`, body: moveTo ? `${body.replace(/Next: add the T&Cs and send for signature$/, '')}Next: move the lead to Quote Sent, then send for signature` : body, href: moveTo ?? `/quotes/${quoteId}`, leadId: q.leadId, quoteId, actorId: null })   /* (REG-604) */
  touch(q.leadId, quoteId); revalidatePath(`/confirm/${quoteId}`)
  return { confirmedAt: now.getTime(), by: who }
}

/**
 * (REG-625, quote editor parity Q-25) Version History › Bring back: a kept version's lines, payment schedule, pricing, texts and title
 * replace the Draft's own (1.0's restore, which could not complete). Only a Draft takes one back — a quote the client has is revised
 * first — and the kept version stays in the history as it was. The quote's number, status, dates, client details and template stay.
 */
export async function restoreQuoteVersion(quoteId: string, version: number): Promise<{ updatedAt: number; amountMinor: number }> {
  const q = await load(quoteId)
  if (!q) throw new Error('quote not found')
  if (q.status !== 'Draft') throw new Error('only a draft takes a version back — revise first')
  const [row] = await db.select().from(quoteVersions).where(and(eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.version, Math.round(version))))
  const snap = row ? reviveSnapshot(row.snapshotJson) : null
  if (!snap) throw new Error('version not found')
  const now = new Date()
  const k = snap.quote
  const pricing = { additionalDiscountMode: k.additionalDiscountMode === 'amount' ? 'amount' : 'pct', additionalDiscountValue: Number(k.additionalDiscountValue) || 0, gstEnabled: k.gstEnabled !== false, discountsJson: k.discountsJson ?? null }
  const totals = quoteTotals(snap.items, { ...pricing, discounts: parseDiscounts(pricing.discountsJson) })
  await db.transaction(async (tx) => {
    await tx.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId))
    await tx.delete(quotePayments).where(eq(quotePayments.quoteId, quoteId))
    for (let at = 0; at < snap.items.length; at += 50) await tx.insert(quoteItems).values(snap.items.slice(at, at + 50).map((i) => ({ ...i, quoteId, updatedAt: now })))
    if (snap.payments.length) await tx.insert(quotePayments).values(snap.payments.map((p) => ({ ...p, quoteId, updatedAt: now })))
    await tx.update(quotes).set({
      title: k.title || q.title, ...pricing, issuingEntity: k.issuingEntity ?? null,
      termsHtml: k.termsHtml ?? null, notesHtml: k.notesHtml ?? null, termsVisible: k.termsVisible !== false, notesVisible: k.notesVisible !== false,
      clientSignatureRequired: k.clientSignatureRequired !== false, filesVisible: k.filesVisible !== false,
      amountMinor: totals.totalMinor, updatedAt: now,
    }).where(eq(quotes.id, quoteId))
  })
  touch(q.leadId, quoteId); revalidatePath(`/quotes/${quoteId}/preview`)
  return { updatedAt: now.getTime(), amountMinor: totals.totalMinor }
}

/**
 * (UX audit Q6) The confirmation link's "Ask for a change": the client's request reaches the studio's bell — the lead's members, the
 * Owners and Admins, whoever made the quote — with their words, while WhatsApp opens to the designer on the page. A public endpoint: only
 * a quote the client holds (sent, not yet confirmed or signed) takes one, and the words are bounded. The words travel in one object.
 */
export async function askQuoteChange(quoteId: string, ask: { name: string; note: string }): Promise<{ ok: true } | { error: string }> {
  const q = await load(quoteId)
  if (!q || q.deletedAt) return { error: 'This quote is no longer available' }
  if (q.status !== 'Approved' && q.status !== 'Sent to Client') return { error: 'This quote can’t take a change request now' }
  const who = (clean(ask?.name, 80) ?? '').trim() || (await leadName(q.leadId)) || 'The client'
  const note = (clean(ask?.note, 500) ?? '').trim()
  await notify('quote_change_asked', [...await leadMemberIds(q.leadId), ...await studioRunnerIds(), ...(q.createdBy ? [q.createdBy] : [])], { title: `${who} asked for a change to quote ${q.number}`, body: note ? `“${note}”` : 'On the confirmation link — they will say what on WhatsApp', href: `/quotes/${quoteId}`, leadId: q.leadId, quoteId, actorId: null })
  return { ok: true }
}

/* ── (UX audit 2026-09-30, Q3) The status menu's marks: rules first, the approvers told, and a way back ── */

/** What a mark changed, so its Undo puts every stamp back as it was (the status alone would leave "sent" dates behind). */
export type StatusUndo = {
  status: string; visibility: string; sentAt: number | null; clientSentAt: number | null; approvedAt: number | null; approvedBy: string | null
  submittedAt: number | null; submittedBy: string | null; confirmedAt: number | null; confirmedBy: string | null; signedAt: number | null
  /** When the approvers were told (a mark to Sent for Approval) — Undo takes those rows back out of the bell. */
  raisedAt: number | null
}
const ms = (d: Date | null) => (d ? d.getTime() : null)

/**
 * (Q3 — supersedes REG-176's one-tap row menu, extends REG-590) A status picked from a status menu (the Quotes rows and cards, the editor's
 * pill). Sent for Approval is the real submission — stamped as the member's and the approvers are told, as the editor's Send tells them;
 * the client's statuses (Sent to Client · Confirmed · Signed) are asked about in the menu first ("nothing reaches the client") and, with
 * approval required, wait for an approver's OK (`statusBlock`). A refusal answers `{ error }` in the rule's words; a mark answers what
 * Undo needs and — for a quote now with the client on a lead before Quote Sent — the Move stage link (Q1).
 */
export async function markQuoteStatus(quoteId: string, status: string): Promise<{ status: QuoteStatus; number: string; undo: StatusUndo; told: number; moveTo: string | null } | { error: string }> {
  if (!isQuoteStatus(status)) return { error: 'That isn’t a quote status' }
  const q = await load(quoteId)
  if (!q) return { error: 'The quote is gone — it was deleted' }
  const me = await whoAmI()
  const approval = await fetchQuoteApproval()
  if (status === 'Approved' && approval === 'required' && !me.approver) return { error: 'Only an Owner, an Admin or the backup approver approves a quote' }
  const blocked = statusBlock({ target: status, current: q.status, approval, approver: me.approver })
  if (blocked) return { error: blocked }
  const undo: StatusUndo = {
    status: q.status, visibility: q.visibility, sentAt: ms(q.sentAt), clientSentAt: ms(q.clientSentAt), approvedAt: ms(q.approvedAt), approvedBy: q.approvedBy,
    submittedAt: ms(q.submittedAt), submittedBy: q.submittedBy, confirmedAt: ms(q.confirmedAt), confirmedBy: q.confirmedBy, signedAt: ms(q.signedAt), raisedAt: null,
  }
  if (status === q.status) return { status, number: q.number, undo, told: 0, moveTo: null }
  const before = Date.now()
  await setQuoteStatus(quoteId, status)
  let told = 0
  if (status === 'Sent for Approval') {
    undo.raisedAt = before
    const l = await leadName(q.leadId)
    told = await notify('quote_approval', await approverIds(), { title: `Quote ${q.number} needs your approval`, body: l ? `For ${l}` : null, href: `/quotes/${quoteId}`, leadId: q.leadId, quoteId, actorId: me.id })   /* (REG-604) as the editor's Send */
  }
  revalidatePath(`/quotes/${quoteId}`); revalidatePath('/quotes')
  return { status, number: q.number, undo, told, moveTo: await moveOffer(q.leadId, quoteId, status) }
}

/** (Q3) The mark's Undo: the status and every stamp as they were, and the approvers' bell lines it raised taken back. */
export async function undoQuoteStatus(quoteId: string, undo: StatusUndo): Promise<{ status: QuoteStatus } | { error: string }> {
  if (!undo || !isQuoteStatus(undo.status)) return { error: 'Nothing to undo' }
  const q = await load(quoteId)
  if (!q) return { error: 'The quote is gone — it was deleted' }
  const d = (n: number | null) => (typeof n === 'number' && Number.isFinite(n) ? new Date(n) : null)
  const s = (v: string | null) => (typeof v === 'string' ? v.slice(0, 200) : null)
  await db.update(quotes).set({
    status: undo.status, visibility: undo.visibility === 'Shared' ? 'Shared' : 'Private', sentAt: d(undo.sentAt), clientSentAt: d(undo.clientSentAt), approvedAt: d(undo.approvedAt), approvedBy: s(undo.approvedBy),
    submittedAt: d(undo.submittedAt), submittedBy: s(undo.submittedBy), confirmedAt: d(undo.confirmedAt), confirmedBy: s(undo.confirmedBy), signedAt: d(undo.signedAt), updatedAt: new Date(),
  }).where(eq(quotes.id, quoteId))
  if (typeof undo.raisedAt === 'number') await db.delete(notifications).where(and(eq(notifications.quoteId, quoteId), eq(notifications.kind, 'quote_approval'), gte(notifications.createdAt, new Date(undo.raisedAt - 1000))))
  touch(q.leadId, quoteId); revalidatePath('/quotes')
  return { status: undo.status }
}
