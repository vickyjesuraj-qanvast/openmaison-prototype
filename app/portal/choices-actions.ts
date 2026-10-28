'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { leadAssignees, leadFiles, projectSelectionOptions, projectSelections, projects } from '@/lib/db/schema'
import { revalidateLead } from '@/lib/leads/queries'
import { notify } from '@/lib/notifications/emit'
import { portalPath } from '@/lib/portal/model'
import { portalActor } from '@/lib/portal/session'
import { portalPeopleOf, portalWho } from '@/lib/portal/household'
import { logProjectEvent } from '@/lib/projects/events'
import { CLIENT_NOTE_MAX, PROJECT_DONE, clientPickBlock, contractLine, normPrice } from '@/lib/projects/choices-model'
import { endWaitForPick, pickGstPct } from '@/lib/projects/choices'
import { DECLINE_NOTE_MAX, answerNeedsWhy, answerOf, isChoiceAnswer, type ChoiceAnswer } from '@/lib/projects/decline'
import { fileSelectionReceipt } from '@/lib/projects/choice-receipt'
import { draftVariationForPick, projectOwnMember } from '@/lib/projects/draft-variation'   // (simplify S-21 · round 2, R2-A) money's own draft, on the system path

/*
 * (Projects round 8) The client's pick on their portal's Choices. Checked here, on the server, as every portal request is (lib/portal/session.ts
 * `portalActor`): the address, Live / Paused, the session — and a write is refused in a studio's preview (See it as the client · Open as a test
 * client record nothing). Then the choice: one of this visitor's homes, shared (not a Draft, not taken back), not chosen yet; the option one
 * of its own. The update is conditional on the choice still waiting, so two presses — or the client and the studio at once — make one pick.
 * The team hears it on the bell (`choice_made`), Activity files the pick's summary card (`project_choice_chosen`, by the client).
 * (Round 6) A pick with a price difference is where a variation order's draft starts: `pickPriceDifference` (lib/projects/choices.ts).
 * (simplify S-21, his "build everything" 2026-10-09) The client's priced pick drafts it at once — money's own draft (since round 2, R2-A, the
 * server-only `draftVariationForPick` as the project's own member, so it drafts whoever "you" are in View as), linked to
 * the choice (`quotes.selection_id`) and titled "{choice} — {option}", so Money's Needs you can say "{client} chose {option} · Send VO-n"
 * (lib/projects/pick-variation.ts `fetchPickVariations`). A Draft never reaches the client: sending it stays the studio's press.
 */
type Refusal = { error: string }

/** (fix-F, F-03) Who made a pick already, when it wasn't the reader — someone else from the household by name; a studio pick or the reader's
    own reads as before. */
async function pickerName(s: { status: string; chosenBy: string | null; chosenHomeownerId: string | null }, leadId: string, readerId: string): Promise<string | null> {
  if (s.status !== 'chosen' || s.chosenBy !== 'client') return null
  const w = portalWho((await portalPeopleOf([leadId])).get(leadId), s.chosenHomeownerId, readerId)
  return w.mine ? null : w.name
}

export async function chooseOption(slug: string, input: { selectionId: string; optionId: string; note: string }): Promise<Refusal | { chosen: string }> {
  const who = await portalActor(slug, { write: true, section: 'choices' })   // (r9) refused while the studio has Choices switched off
  if ('error' in who) return who
  const [row] = await db.select({ s: projectSelections, p: projects }).from(projectSelections).innerJoin(projects, eq(projects.id, projectSelections.projectId))
    .where(and(eq(projectSelections.id, input.selectionId ?? ''), isNull(projects.deletedAt))).limit(1)
  if (!row || !who.visitor.links.some((l) => l.leadId === row.p.leadId)) return { error: 'This choice isn’t one of yours' }
  const { s, p } = row
  const chosenName = s.chosenOptionId ? (await db.select({ name: projectSelectionOptions.name }).from(projectSelectionOptions).where(eq(projectSelectionOptions.id, s.chosenOptionId)).limit(1))[0]?.name ?? null : null
  const block = clientPickBlock(s, chosenName, await pickerName(s, p.leadId, who.visitor.homeownerId))
  if (block) return { error: block }
  if (p.stage === 'completed') return { error: PROJECT_DONE }
  const [opt] = await db.select().from(projectSelectionOptions).where(and(eq(projectSelectionOptions.id, input.optionId ?? ''), eq(projectSelectionOptions.selectionId, s.id), isNull(projectSelectionOptions.deletedAt))).limit(1)
  if (!opt) return { error: 'That option isn’t there any more — pick another' }
  const note = (typeof input.note === 'string' ? input.note : '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (note.length > CLIENT_NOTE_MAX) return { error: `Keep your note to ${CLIENT_NOTE_MAX} characters` }
  const now = new Date()
  const r = await db.update(projectSelections).set({ status: 'chosen', chosenOptionId: opt.id, chosenBy: 'client', chosenMemberId: null, chosenHomeownerId: who.visitor.homeownerId, chosenAt: now, chosenNote: note || null, updatedAt: now })
    .where(and(eq(projectSelections.id, s.id), eq(projectSelections.status, 'shared'), isNull(projectSelections.deletedAt)))
  if (!r.rowsAffected) {
    const [again] = await db.select().from(projectSelections).where(eq(projectSelections.id, s.id)).limit(1)
    const name = again?.chosenOptionId ? (await db.select({ name: projectSelectionOptions.name }).from(projectSelectionOptions).where(eq(projectSelectionOptions.id, again.chosenOptionId)).limit(1))[0]?.name ?? null : null
    return { error: clientPickBlock(again ?? null, name, again ? await pickerName(again, p.leadId, who.visitor.homeownerId) : null) ?? 'Couldn’t save your choice — please try again' }
  }
  const price = normPrice(opt.priceMinor)
  const thumb = opt.fileId ? (await db.select({ thumb: leadFiles.thumb }).from(leadFiles).where(eq(leadFiles.id, opt.fileId)).limit(1))[0]?.thumb ?? null : null
  const gst = (await pickGstPct([p.id])).get(p.id) ?? 0   // (REG-1068) the team's bell and Activity say what the contract moves by
  /* (fix-C, C-04) the milestone's wait for this choice ends with the pick — the bell row says so */
  const wait = await endWaitForPick({ id: s.id, projectId: p.id, milestoneId: s.milestoneId, title: s.title })
  /* (simplify S-21) a pick that moves the price drafts its variation order — a refusal (the studio's own rules) leaves it to the card's
     "Draft a variation order", as before; the pick itself never fails on it */
  const drafter = price ? await projectOwnMember(p.id) : null   // (simplify round 2, R2-A) the project's own member — no studio member pressed anything
  const vo = price && drafter ? await draftVariationForPick(s.id, { memberId: drafter, eventActorId: null }).then((r) => ('error' in r ? null : r), () => null) : null
  await logProjectEvent(db, p.leadId, p.id, 'project_choice_chosen', { id: s.id, title: s.title, name: p.name, number: p.number, option: opt.name, by: 'client', price, gst, thumb, hex: opt.hex, note: note || null, person: who.visitor.name, ...(wait ? { waitEnded: wait.title } : {}), ...(vo ? { vo: vo.number } : {}) }, { actorId: null })
  const team = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))
  const body = [contractLine(price, gst), note ? `“${note.length > 120 ? `${note.slice(0, 119)}…` : note}”` : null, wait ? `${wait.title} no longer waits` : null, vo ? `${vo.number} drafted — send it from Payments` : null].filter(Boolean).join(' · ') || p.name   // (simplify S-21) (invented copy)
  await notify('choice_made', team.map((t) => t.id), { title: `${who.visitor.name} chose ${opt.name} for ${s.title}`, body, href: `/projects/${p.id}/choices?open=${encodeURIComponent(s.id)}`, leadId: p.leadId, actorId: null })
  await fileSelectionReceipt(s.id)   // (gaps build D, item 7) the pick's receipt — in Files › Choices and the portal's Documents
  revalidateLead(p.leadId)
  revalidatePath(portalPath(slug), 'layout')
  return { chosen: opt.name }
}

/**
 * (gaps build D, item 2 — M-07; 1.0's Reject · Request changes, I-284) The client's no on a shared choice: *None of these work* → **Turn them
 * down** or **Ask for other options**, with a reason (required). Checked as the pick is — the portal's gate, the Choices section, a write
 * (never in a preview), one of the visitor's homes, still shared — and conditional on it still waiting, so a pick and a no at once make one
 * answer. The choice goes back to the studio (`declined`), its answer kept; the team hears it (`choice_declined`) and Activity files it
 * (`project_choice_declined`). The milestone's wait for it stays — the answer is the studio's to give now.
 */
export async function answerChoice(slug: string, input: { selectionId: string; kind: ChoiceAnswer; note: string }): Promise<Refusal | { answered: ChoiceAnswer }> {
  const who = await portalActor(slug, { write: true, section: 'choices' })
  if ('error' in who) return who
  if (!isChoiceAnswer(input?.kind)) return { error: 'Pick an answer' }
  const [row] = await db.select({ s: projectSelections, p: projects }).from(projectSelections).innerJoin(projects, eq(projects.id, projectSelections.projectId))
    .where(and(eq(projectSelections.id, input.selectionId ?? ''), isNull(projects.deletedAt))).limit(1)
  if (!row || !who.visitor.links.some((l) => l.leadId === row.p.leadId)) return { error: 'This choice isn’t one of yours' }
  const { s, p } = row
  const chosenName = s.chosenOptionId ? (await db.select({ name: projectSelectionOptions.name }).from(projectSelectionOptions).where(eq(projectSelectionOptions.id, s.chosenOptionId)).limit(1))[0]?.name ?? null : null
  const block = clientPickBlock(s, chosenName, await pickerName(s, p.leadId, who.visitor.homeownerId))
  if (block) return { error: block }
  if (p.stage === 'completed') return { error: PROJECT_DONE }
  const note = (typeof input.note === 'string' ? input.note : '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (!note) return { error: answerNeedsWhy(input.kind) }
  if (note.length > DECLINE_NOTE_MAX) return { error: `Keep it to ${DECLINE_NOTE_MAX} characters` }
  const now = new Date()
  const r = await db.update(projectSelections).set({ status: 'declined', clientAnswer: input.kind, clientAnswerNote: note, clientAnswerAt: now, clientAnswerBy: who.visitor.homeownerId, updatedAt: now })
    .where(and(eq(projectSelections.id, s.id), eq(projectSelections.status, 'shared'), isNull(projectSelections.deletedAt)))
  if (!r.rowsAffected) return { error: 'This choice was answered just now — have a look at it again' }
  await logProjectEvent(db, p.leadId, p.id, 'project_choice_declined', { id: s.id, title: s.title, name: p.name, number: p.number, kind: input.kind, note, by: 'client', person: who.visitor.name }, { actorId: null })
  await fileSelectionReceipt(s.id)   // (parity map, TD-044) a no keeps its receipt too — filed in Files › Choices
  const team = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, p.leadId))
  await notify('choice_declined', team.map((t) => t.id), { title: `${who.visitor.name} ${answerOf(input.kind).studio} for ${s.title}`, body: `“${note.length > 120 ? `${note.slice(0, 119)}…` : note}” — add other options and share it again`, href: `/projects/${p.id}/choices?open=${encodeURIComponent(s.id)}`, leadId: p.leadId, actorId: null })
  revalidateLead(p.leadId)
  return { answered: input.kind }
}
