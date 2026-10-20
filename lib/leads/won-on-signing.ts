import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, leadAssignees, leads, projectInvoices, projects, quotes, stageLogs, type Contract } from '@/lib/db/schema'
import { titleCaseName } from '@/lib/format'
import { fetchLeadStageRules, fetchStageMovement } from '@/lib/settings/queries'
import { blockedReason, isActiveStage } from '@/lib/leads/stage-policy'
import { emptyWizardData, stageRefusal, validateStage, type WizardData } from '@/lib/leads/stage-data'
import { revalidateLead, type LeadRow } from '@/lib/leads/queries'
import { notifyStageChange } from '@/lib/leads/stage-notify'
import { ensureProjectForLead } from '@/lib/projects/create'
import { fetchProjectStart } from '@/lib/projects/start-rule-server'

/**
 * (S44R — UAT row 358, call C7, as recommended — his UAT ask 2026-10-15; PARTLY REVERSES REG-911's "signing the quote starts the project")
 * Settings › Projects › *When a project starts* = **The agreement is signed**: an agreement the client signs (online, in a set, or marked
 * signed by the studio) moves its lead to Won by itself — THROUGH the Won step's own rules, never around them:
 *   · the lead is in an active stage the studio's stage movement allows Won from (Linear: from Quote Sent only), with a member (REG-130) —
 *     `blockedReason`, the same function the stage menu, the kanban and the Move stage window ask; a parked lead (On Hold / Lost) waits for its
 *     studio's "Resume at …?" — a signature never answers that question;
 *   · the step's fields are filled the way the window fills them when it is opened from the agreement (UX audit C1): the quote it names (signed
 *     through it, REG-626) as the signed quote, the agreement as the signed contract, the step's default split and project type — and checked
 *     by `validateStage` with the studio's own asks (pending modules S05);
 *   · then the move is written as the window writes it (the lead's stage, its stage log), Won makes the project (`ensureProjectForLead`, REG-911)
 *     and the project drafts its stage invoices — the deposit first (REG-994).
 * A lead the Won step can't take yet stays where it is and the answer says why (the bell's line). Nothing happens with today's rule.
 */
export type WonOnSigning = { moved: true; projectId: string; number: string; lead: string; /** its deposit invoice is drafted */ deposit: boolean } | { moved: false; why: string | null }
/** The bell's and the snackbar's words for what the signature did to the lead (invented copy, S44R). */
export const startedWords = (s: Extract<WonOnSigning, { moved: true }>) => `${s.lead} is Won — project ${s.number} is made${s.deposit ? ', its deposit invoice drafted' : ''}`
export const notStartedWords = (why: string) => `Couldn’t move it to Won by itself — ${why.charAt(0).toLowerCase()}${why.slice(1)}`
/** A contract that starts a project when signed: a written or uploaded agreement — never a standard PDF from the library, nor a letter issued at handover. */
async function startsProjects(c: Contract): Promise<boolean> {
  if (c.purpose === 'handover' || c.toRead) return false
  if (!c.templateId) return true
  const [t] = await db.select({ kind: contractTemplates.kind }).from(contractTemplates).where(eq(contractTemplates.id, c.templateId)).limit(1)
  return t?.kind !== 'pdf'
}

export async function wonOnSigning(c: Contract, o: { at: Date; signer: string | null }): Promise<WonOnSigning> {
  if ((await fetchProjectStart()).startsWhen !== 'agreement') return { moved: false, why: null }
  if (!(await startsProjects(c))) return { moved: false, why: null }
  const [lead] = await db.select({ id: leads.id, name: leads.name, stage: leads.stage, direct: leads.direct, deletedAt: leads.deletedAt }).from(leads).where(eq(leads.id, c.leadId)).limit(1)
  if (!lead || lead.deletedAt || lead.direct || lead.stage === 'Won') return { moved: false, why: null }
  const name = titleCaseName(lead.name)
  /* a parked lead resumes only on the studio's own "Resume at …?" — a signature never answers it (REG-111) */
  if (!isActiveStage(lead.stage)) return { moved: false, why: `${name} is ${lead.stage} — resume the lead, then move it to Won` }
  const assignees = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, lead.id))).map((r) => r.memberId)
  const [live] = await db.select({ id: projects.id, number: projects.number }).from(projects).where(and(eq(projects.leadId, lead.id), isNull(projects.deletedAt))).limit(1)
  const mode = await fetchStageMovement()
  /* the policy reads only how many members the lead has, its stage and its project — the rows themselves never */
  const team = assignees.map((id) => ({ id })) as unknown as LeadRow['assignees']
  const blocked = blockedReason({ stage: lead.stage as LeadRow['stage'], resumeStage: null, assignees: team, project: live ?? null }, 'Won', mode)
  if (blocked) return { moved: false, why: blocked }
  /* the Won step, filled from the agreement: the quote it signs (signed through it), the agreement itself, the step's own defaults */
  const [q] = c.fromQuoteId ? await db.select({ id: quotes.id, number: quotes.number, title: quotes.title, status: quotes.status }).from(quotes).where(and(eq(quotes.id, c.fromQuoteId), isNull(quotes.deletedAt))).limit(1) : []
  if (!q) return { moved: false, why: 'The agreement names no quote — the Won step needs the signed quote' }
  if (q.status !== 'Signed') return { moved: false, why: `${q.number} isn’t signed — the Won step needs the signed quote` }
  const base = emptyWizardData(assignees)
  const data: WizardData & { agreementSigned: { by: string | null; title: string; contractId: string } } = {
    ...base, wonQuoteTab: 'system', wonQuote: q.title, wonQuoteUploaded: null, wonQuoteAmount: '',
    wonContractTab: 'system', wonContract: c.signedCopy ?? `${c.title}.pdf`, wonContractUploaded: null,
    agreementSigned: { by: o.signer, title: c.title, contractId: c.id },
  }
  const asks = await fetchLeadStageRules()
  const refusal = stageRefusal('Won', validateStage('Won', data, { wonContract: asks.wonContract }))
  if (refusal) return { moved: false, why: refusal }
  /* the move, as the window writes it — nobody pressed it, so no member is its mover; Activity names the signature (lib/leads/activity.ts) */
  const at = o.at
  const moved = await db.transaction(async (tx) => {
    const done = await tx.update(leads).set({ stage: 'Won', updatedAt: at }).where(and(eq(leads.id, lead.id), eq(leads.stage, lead.stage))).returning({ id: leads.id })
    if (!done.length) return false   // moved meanwhile — that move stands
    await tx.insert(stageLogs).values({ id: randomUUID(), leadId: lead.id, fromStage: lead.stage, toStage: 'Won', payload: data as object, createdAt: at, movedBy: null })
    return true
  })
  if (!moved) return { moved: false, why: null }
  const made = await ensureProjectForLead(lead.id, { payload: data, at, by: c.sentBy ?? c.createdBy ?? undefined, byClient: true })   // (REG-911) Won makes the project; its Drafts with it
  const [first] = await db.select({ id: projectInvoices.id }).from(projectInvoices).where(and(eq(projectInvoices.projectId, made.id), eq(projectInvoices.kind, 'stage'), eq(projectInvoices.status, 'draft'))).orderBy(asc(projectInvoices.position)).limit(1)
  const out = { moved: true as const, projectId: made.id, number: made.number, lead: name, deposit: !!first }
  await notifyStageChange(lead.id, lead.stage, 'Won', data, { body: `${o.signer ?? 'The client'} signed ${c.title} — project ${made.number} is made${out.deposit ? ', its deposit invoice drafted' : ''}`, actorId: null })
  revalidateLead(lead.id)
  return out
}
