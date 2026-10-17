'use server'

import { and, eq, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leadAssignees, projectMilestones, projectUpdates } from '@/lib/db/schema'
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { logProjectEvent } from '@/lib/projects/events'
import { portalActor } from '@/lib/portal/session'
import { markHouseholdScheduleSeen } from '@/lib/portal/household'
import { stageForAnswer } from '@/lib/portal/schedule'
import { NOTE_MAX, confirmBlock, isStageAnswer, type StageAnswerKind } from '@/lib/portal/schedule-model'
import { openedSince, updatesForVisitor } from '@/lib/portal/updates'

/*
 * (Projects round 4b — Q-16 · Q-41; the Client Portal Proposal, boards 2 · 3) What a client does on their project: answer a finished stage
 * (Looks good · Something is not right, with what they noticed), and the two marks the portal keeps of what they have seen — the Schedule
 * tab's last look and each update opened. Every request goes through `portalActor` (the address, Live / Paused, the session) and, as a
 * write, is refused in a studio's preview: See it as the client and Open as a test client record nothing. The rules of a stage are the
 * server's (lib/portal/schedule-model.ts `confirmBlock`): one not shared as done, not asked, or answered already is refused in words.
 * Nothing here revalidates a path: every studio page that shows an answer or a stamp renders on request (`force-dynamic`), and a
 * revalidation in an action re-renders the page it was called from — the client's own, whose marks of what changed would go under them.
 */
type Refusal = { error: string }
const clean = (s: string | null | undefined, max: number) => (s ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max)

/** A client's answer to a stage the studio asked them to confirm. "Something is not right" needs a word on what. */
export async function answerStage(slug: string, input: { milestoneId: string; answer: StageAnswerKind; note?: string | null }): Promise<Refusal | { answer: StageAnswerKind; at: number }> {
  const who = await portalActor(slug, { write: true, section: 'schedule' })   // (r9) refused while the studio has Schedule switched off
  if ('error' in who) return who
  if (!isStageAnswer(input.answer)) return { error: 'Choose Looks good or Something is not right' }
  const note = input.answer === 'changes' ? clean(input.note, NOTE_MAX) : ''
  if (input.answer === 'changes' && !note) return { error: 'Say what is not right, so your designer can look at it' }
  const s = await stageForAnswer(who.visitor, input.milestoneId)
  if (!s) return { error: 'This stage isn’t on your schedule any more' }
  const block = confirmBlock(s.row, s.live, who.visitor.homeownerId)
  if (block) return { error: block }
  const now = new Date()
  /* the write itself holds the rule, so two presses (two devices, two people of the household) answer once */
  const r = await db.update(projectMilestones).set({ confirmAnswer: input.answer, confirmNote: note || null, confirmAnsweredAt: now, confirmAnsweredBy: who.visitor.homeownerId })
    .where(and(eq(projectMilestones.id, s.milestone.id), isNull(projectMilestones.confirmAnswer), isNotNull(projectMilestones.confirmAskedAt), eq(projectMilestones.status, 'done'), isNull(projectMilestones.deletedAt)))
  if (!r.rowsAffected) {   /* (fix-F, F-03) answered a moment ago — by whom, read again */
    const again = await stageForAnswer(who.visitor, input.milestoneId)
    return { error: (again && confirmBlock(again.row, again.live, who.visitor.homeownerId)) || 'You have already answered for this stage' }
  }
  const title = s.row!.title   // the name as the client read it
  const pid = s.milestone.projectId
  await logProjectEvent(db, s.leadId, pid, input.answer === 'confirmed' ? 'project_stage_confirmed' : 'project_stage_changes',
    { id: s.milestone.id, title, name: who.visitor.name, note: note || null }, { actorId: null, at: now })
  const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, s.leadId))).map((t) => t.id)
  const href = `/projects/${pid}/schedule?open=${encodeURIComponent(s.milestone.id)}`
  if (input.answer === 'confirmed') {
    await notify('stage_confirmed', team, { title: `${who.visitor.name} confirmed ${title}`, body: `On their portal · ${s.projectName}`, href, leadId: s.leadId, actorId: null })
  } else {
    await notify('stage_changes', [...team, ...(await studioRunnerIds())], { title: `${who.visitor.name} says something is not right with ${title}`, body: `“${note}”`, href, leadId: s.leadId, actorId: null })
  }
  return { answer: input.answer, at: now.getTime() }
}

/** The client opened their Schedule tab: what changed since is marked on their next look. Called by the page once it shows — a prefetch
    never runs it, and a preview is refused, so a studio's look never moves the client's marks. */
export async function markScheduleSeen(slug: string, input: { homeIds: string[] }): Promise<Refusal | { ok: true }> {
  const who = await portalActor(slug, { write: true, section: 'schedule' })
  if ('error' in who) return who
  const mine = who.visitor.links.filter((l) => !l.household).map((l) => l.linkId).filter((id) => input.homeIds.includes(id))
  if (mine.length) await db.update(homeownerLeadLinks).set({ scheduleSeenAt: new Date() }).where(inArray(homeownerLeadLinks.id, mine))
  /* (Projects round 9) someone from the household keeps their own last look */
  await markHouseholdScheduleSeen(who.visitor.links.filter((l) => l.household).map((l) => l.linkId).filter((id) => input.homeIds.includes(id)))
  return { ok: true }
}

/**
 * The client opened updates — their cards came into view on the Updates tab or as the home's latest. Each is stamped once for its publish
 * (`client_opened_at`, round 3's Withdraw rule: a withdrawn and republished update is new again). Only published updates of the visitor's
 * own projects; never from a preview.
 */
export async function markUpdatesSeen(slug: string, input: { ids: string[] }): Promise<Refusal | { n: number }> {
  const who = await portalActor(slug, { write: true, section: 'updates' })
  if ('error' in who) return who
  const rows = (await updatesForVisitor(who.visitor, input.ids.filter((x) => typeof x === 'string'))).filter((r) => !openedSince(r.u.clientOpenedAt, r.u.publishedAt, r.u.editedAt))   // (fix-C, C-22) a changed one is opened again
  if (!rows.length) return { n: 0 }
  const now = new Date()
  let n = 0
  for (const { u } of rows) {
    const r = await db.update(projectUpdates).set({ clientOpenedAt: now, clientOpenedBy: who.visitor.homeownerId })   // (fix-F, C-07) who opened it
      .where(and(eq(projectUpdates.id, u.id), eq(projectUpdates.status, 'published'), or(isNull(projectUpdates.clientOpenedAt), lt(projectUpdates.clientOpenedAt, projectUpdates.publishedAt), lt(projectUpdates.clientOpenedAt, projectUpdates.editedAt))))
    n += r.rowsAffected
  }
  return { n }
}
