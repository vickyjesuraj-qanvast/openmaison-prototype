import 'server-only'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, quotes, type Contract } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { fetchQuoteApproval, isApprover } from '@/lib/settings/queries'
import { notify } from '@/lib/notifications/emit'

/**
 * (S44Q — row 334, his UAT ask 2026-10-15, as recommended) An approver's Send is the approval, wherever they press it. Their own quote's Send
 * already went past Sent for Approval (REG-624, `sendQuote` · `sendQuoteForConfirmation`); Send for signature made the agreement and then
 * refused it — "… is still a Draft — approve and send it first" — with no Approve on a Draft anywhere. Now a contract an approver sends (Send,
 * Copy link, Send together, a list's status menu) approves the quote it names, on the record as theirs, as `sendQuote` stamps it; the send
 * checks tell them so first ("sending approves it", lib/contracts/readiness.ts). Anyone else keeps the rule.
 */
export type Sender = { id: string | null; name: string; approver: boolean }
export async function contractSender(): Promise<Sender> {
  const v = await fetchViewer()
  const [m] = v.id ? await db.select({ name: members.name }).from(members).where(eq(members.id, v.id)) : []
  return { id: v.id ?? null, name: m?.name ?? 'An approver', approver: await isApprover(v.id, v.role) }
}

/** After an approver's send: the named quote — a Draft, or one waiting for approval, while Settings requires approval — is Approved by them. */
export async function approveNamedQuote(c: Pick<Contract, 'fromQuoteId'>, who: Sender): Promise<string | null> {
  if (!who.approver || !c.fromQuoteId || (await fetchQuoteApproval()) !== 'required') return null
  const [q] = await db.select({ id: quotes.id, number: quotes.number, status: quotes.status, approvedAt: quotes.approvedAt, submittedBy: quotes.submittedBy, leadId: quotes.leadId }).from(quotes).where(eq(quotes.id, c.fromQuoteId))
  if (!q || (q.status !== 'Draft' && q.status !== 'Sent for Approval')) return null
  const now = new Date()
  await db.update(quotes).set({ status: 'Approved', approvedAt: q.approvedAt ?? now, approvedBy: who.id, updatedAt: now }).where(eq(quotes.id, q.id))
  /* a designer's submission answered by the send: they hear it was approved, as the review bar's Approve tells them */
  if (q.status === 'Sent for Approval' && q.submittedBy && q.submittedBy !== who.id) await notify('quote_approved', [q.submittedBy], { title: `${who.name} approved quote ${q.number}`, body: 'It went out with the agreement for signature', href: `/quotes/${q.id}`, leadId: q.leadId, quoteId: q.id, actorId: who.id })
  revalidatePath(`/quotes/${q.id}`); revalidatePath('/quotes')
  return q.number
}
