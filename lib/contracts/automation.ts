import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leadTasks, leads, taskAssignees, type Contract } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds, studioRunnerIds } from '@/lib/notifications/queries'
import { revalidatePath } from 'next/cache'
import { fetchViewer } from '@/lib/leads/visibility'

/** (REG-634) Who is acting — the member the session stands for (the prototype's `is_you`), stamped on sends, markings, deletes and edits. */
export const actingMember = async (): Promise<string> => (await fetchViewer()).id ?? SESSION_MEMBER_ID

/**
 * (REG-634, contracts parity Q-23 · Q-25) What follows a contract going out and coming back signed. Automation's two switches are tasks —
 * the follow-up model of the Leads round (REG-608): *Remind me to follow up* adds a Follow-up three days after sending, for whoever sent
 * it, closed once the contract is signed; *Remind me to thank the client* adds one on the signing day. Notifications: a contract sent
 * for signature, and one marked signed by the studio (the client's own signature notifies from the signing page's action).
 */
const DAY = 24 * 60 * 60 * 1000
async function addTask(c: Contract, title: string, dueAt: Date, assignee: string): Promise<void> {
  const id = randomUUID(), now = new Date()
  await db.insert(leadTasks).values({ id, leadId: c.leadId, contractId: c.id, title, kind: 'Follow-up', dueAt, done: false, createdAt: now, creatorId: assignee, updatedAt: now })
  await db.insert(taskAssignees).values({ taskId: id, memberId: assignee })
  revalidatePath('/tasks')
}
const openFollowUps = (contractId: string) => and(eq(leadTasks.contractId, contractId), eq(leadTasks.done, false))
const leadName = async (leadId: string) => (await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)))[0]?.name ?? 'the lead'

/** Sent (on WhatsApp, by a shared link, in a bundle): the follow-up when Automation asks for one; the studio is told unless `quiet`. */
export async function afterSent(c: Contract, at: Date, o: { quiet?: boolean } = {}): Promise<void> {
  const by = c.sentBy ?? await actingMember()
  if (c.reminders) {
    const [open] = await db.select({ id: leadTasks.id }).from(leadTasks).where(openFollowUps(c.id))
    if (!open) await addTask(c, `Follow up on “${c.title}” — not signed yet`, new Date(at.getTime() + 3 * DAY), by)
  }
  if (!o.quiet) await notify('contract_sent', [...await studioRunnerIds(), ...await leadMemberIds(c.leadId)], { title: `“${c.title}” went out for signature`, body: `To ${c.recipientName ?? await leadName(c.leadId)}`, href: `/leads/${c.leadId}/contracts`, leadId: c.leadId })
}
/** Signed, by any path: open follow-ups close, the thank-you task when asked; a studio-marked signature tells the studio (`marked`). */
export async function afterSigned(c: Contract, at: Date, o: { marked?: boolean } = {}): Promise<void> {
  await db.update(leadTasks).set({ done: true, updatedAt: new Date() }).where(openFollowUps(c.id))
  if (c.thankYou) await addTask(c, `Thank ${c.recipientName ?? 'the client'} for signing “${c.title}”`, at, c.sentBy ?? c.createdBy ?? await actingMember())
  if (o.marked) await notify('quote_signed', [...await leadMemberIds(c.leadId), ...await studioRunnerIds()], { title: `“${c.title}” was marked signed`, body: c.signedCopy ? `Signed copy: ${c.signedCopy}` : 'Signed on paper or elsewhere', href: `/leads/${c.leadId}/contracts`, leadId: c.leadId })
}
/** The latest row, for a caller holding a stale one. */
export const freshContract = async (id: string) => (await db.select().from(contracts).where(and(eq(contracts.id, id), isNull(contracts.deletedAt))))[0] ?? null
