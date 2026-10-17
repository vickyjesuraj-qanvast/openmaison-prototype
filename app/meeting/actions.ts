'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { meetings } from '@/lib/db/schema'
import { fetchedForPreview } from '@/lib/link-cards/origin'
import { isStudioVisit } from '@/lib/auth/studio-visit'   // (S42F — B-02's sibling)
import { notify } from '@/lib/notifications/emit'
import { titleCaseName } from '@/lib/format'
import { meetingHref } from '@/lib/meetings/model'
import { whenWords } from '@/lib/meetings/words'
import { aimWords, answerableOf, linkStateOf, meetingByToken } from '@/lib/meetings/client'
import { meetingPeople } from '@/lib/meetings/queries'
import { ANSWER_NOTE_MAX } from '@/components/meetings/client/client-notes'

/*
 * (pending modules S23 — the client's meeting link) The two things a client does on `/meeting/<token>`, with no session: the token is the
 * permission, and every refusal says the rule in plain words (pending modules S23) (invented copy). Neither revalidates the client's own page
 * (the client links' rule, S02); the answer refreshes the meeting's studio page, whose people hear it in their bell.
 */

const NO_LINK = 'This link is no longer active'

/**
 * Viewed: the page's first ask from a browser that ran it (S04's rule — a chat app drawing the link's card never runs the page, and a
 * fetcher's own ask is turned away here too). Only the first open is kept (`client_viewed_at`); a closed link stamps nothing. (S42F, B-02's
 * sibling) The studio opening its own link in its own browser is never the client's open (`isStudioVisit`).
 */
export async function recordMeetingView(token: string): Promise<{ ok: boolean }> {
  if (typeof token !== 'string' || (await fetchedForPreview()) || (await isStudioVisit())) return { ok: false }
  const hit = await meetingByToken(token)
  if (!hit || linkStateOf(hit.m, Date.now()) === 'closed') return { ok: false }
  await db.update(meetings).set({ clientViewedAt: sql`coalesce(${meetings.clientViewedAt}, ${Date.now()})` }).where(eq(meetings.id, hit.m.id))
  return { ok: true }
}

export type MeetingAnswer = { ok: true; answer: 'yes' | 'no'; note: string | null; at: number }

/**
 * The client's answer to the invitation — "I'll be there", or "The time doesn't suit" with what suits them. Recorded on the meeting
 * (`client_answer` · `client_answer_at` · `client_answer_note`); the meeting's people hear it in their bell (`meeting_answered`) when it is
 * new or changed. A cancelled meeting, one already under way or past, or a closed link can't be answered.
 */
export async function answerMeetingInvite(token: string, o: { answer: 'yes' | 'no'; note?: string }): Promise<MeetingAnswer | { error: string }> {
  if (typeof token !== 'string') return { error: NO_LINK }
  const answer = o?.answer === 'yes' || o?.answer === 'no' ? o.answer : null
  if (!answer) return { error: 'Choose whether you can make it' }
  const hit = await meetingByToken(token)
  if (!hit) return { error: NO_LINK }
  const { m, leadName } = hit
  const now = Date.now()
  const state = linkStateOf(m, now)
  if (state === 'closed') return { error: NO_LINK }
  if (state === 'cancelled') return { error: 'This meeting was cancelled' }
  if (state === 'held' || m.status === 'held') return { error: 'This meeting has already taken place' }
  if (!answerableOf(m, now)) return { error: 'This meeting has already started' }
  const note = answer === 'no' && typeof o.note === 'string' ? o.note.replace(/\s+/g, ' ').trim().slice(0, ANSWER_NOTE_MAX) || null : null
  const changed = m.clientAnswer !== answer || (m.clientAnswerNote ?? null) !== note
  await db.update(meetings).set({ clientAnswer: answer, clientAnswerAt: new Date(now), clientAnswerNote: note, clientViewedAt: m.clientViewedAt ?? new Date(now) })
    .where(and(eq(meetings.id, m.id), isNull(meetings.deletedAt)))
  if (changed) {
    const client = titleCaseName(leadName)
    const aim = aimWords(m.aim)
    await notify('meeting_answered', await meetingPeople(m.id), {
      title: answer === 'yes' ? `${client} is coming to the ${aim}` : `${client} can’t make the ${aim}`,
      body: note ?? whenWords(m.startsAt.getTime()),
      href: meetingHref(m.id), leadId: m.leadId, actorId: null,
    }).catch(() => 0)   // the answer is on the record either way; a bell that fails never refuses the client
  }
  revalidatePath(meetingHref(m.id))
  return { ok: true, answer, note, at: now }
}
