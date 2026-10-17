'use server'

import { recordAnswerChange } from '@/lib/leads/answer-history'   // (gaps build D, item 9)

import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { homeownerHouseholdLinks, homeownerLeadLinks, leadAssignees, questions } from '@/lib/db/schema'
import { isSgPhone, phoneDigits, titleCaseName } from '@/lib/format'
import { validateAnswer } from '@/lib/leads/question-model'
import { revalidateLead } from '@/lib/leads/queries'
import { notify } from '@/lib/notifications/emit'
import { CODE_LENGTH, phoneEnding, portalPath, safeNext, splitPortalSlug } from '@/lib/portal/model'
import { fetchPortalLook, fetchPortalSettings, homeownerByPhone, resolvePortalSlug } from '@/lib/portal/queries'
import { endSession, linksOf, portalActor, stampOpened, startClientSession } from '@/lib/portal/session'
import { fetchPortalQuestions, homeOf } from '@/lib/portal/home'
import { isStandInProvider, signInProvider } from '@/lib/auth/provider'   // (pending modules S34) the one sign-in provider, the portal's too
import { takeTry } from '@/lib/auth/limit'
import { visitorTry } from '@/lib/auth/visitor'

/*
 * (Projects round 4a) What a client does on the portal. Every request is checked here, on the server (Q-50 · M bottom line: 1.0's pause
 * stopped the pages and left every request answering): the address, Live / Paused, the session — and a write is refused in a studio's
 * preview, so nothing there is recorded as the client's. Each refusal answers `{ error }` in words the page shows.
 */

type Refusal = { error: string }

/** (fix-F, F-21) Why a number opens nothing: never added — or added once and its access stopped since (withdrawn), which reads as that. */
async function notAdded(homeownerId: string | null, studio: string): Promise<string> {
  if (homeownerId) {
    const [own, hh] = await Promise.all([
      db.select({ id: homeownerLeadLinks.id }).from(homeownerLeadLinks).where(and(eq(homeownerLeadLinks.homeownerId, homeownerId), isNotNull(homeownerLeadLinks.withdrawnAt))).limit(1),
      db.select({ id: homeownerHouseholdLinks.id }).from(homeownerHouseholdLinks).where(and(eq(homeownerHouseholdLinks.homeownerId, homeownerId), isNotNull(homeownerHouseholdLinks.withdrawnAt), isNull(homeownerHouseholdLinks.removedAt))).limit(1),
    ])
    if (own.length || hh.length) return `${studio} has stopped this number’s access. Ask your designer if you need it again.`
  }
  return `${studio} hasn’t added this number. Ask your designer to add it, then try again.`
}

/** Before any sign-in step: the address opens a live portal. */
async function liveOrRefuse(slug: string): Promise<Refusal | { studio: string }> {
  const where = await resolvePortalSlug(slug)
  if (!where) return { error: 'This address doesn’t open a portal' }
  const [look, s] = await Promise.all([fetchPortalLook(), fetchPortalSettings()])
  if (s.paused) return { error: `${look.studio}’s portal is paused` }
  return { studio: look.studio }
}

/**
 * Sign-in, step one: the number. Only a number the studio added — a link that was invited and not withdrawn — gets a code; anything else
 * reads plainly. (pending modules S34) The code goes through the studio app's one sign-in provider (lib/auth/provider.ts `sendCode`, the
 * client's mobile) — the prototype's stand-in sends nothing, and the page says so (`demo`); with a real provider 1.0's limits hold too: five
 * tries a minute for a number and for a visitor (lib/auth/visitor.ts) — never on the stand-in, whose probes and testers sign in again and
 * again (S13's reason).
 */
const TOO_MANY = 'Too many tries — wait a minute and try again'
async function codeTry(step: 'send' | 'check', phone: string): Promise<boolean> {
  if (isStandInProvider()) return true
  return takeTry(`portal-${step}:${phone}`) && (await visitorTry(step))
}
export async function requestCode(slug: string, input: { phone: string }): Promise<Refusal | { ending: string; /** the stand-in: no text goes, any six digits open it */ demo: boolean }> {
  const live = await liveOrRefuse(slug)
  if ('error' in live) return live
  const phone = phoneDigits(input.phone)
  if (!isSgPhone(phone)) return { error: 'Enter your 8-digit mobile number' }
  if (!(await codeTry('send', phone))) return { error: TOO_MANY }
  const h = await homeownerByPhone(phone)
  const links = h ? await linksOf(h.id, false) : []   // (Projects round 9) the client's own homes and those they open from a household
  if (!h || !links.length) return { error: await notAdded(h?.id ?? null, live.studio) }
  const sent = await signInProvider().sendCode({ kind: 'phone', value: phone }).catch(() => ({ error: 'unsent' }))
  if ('error' in sent) return { error: 'Couldn’t send the code — please try again' }
  /* (REG-1164, F-37) nothing about who the client is with or who designs for them before the code: anyone can type a number */
  return { ending: phoneEnding(phone), demo: isStandInProvider() }
}

/** Sign-in, step two: the code — checked by the sign-in provider (the stand-in takes any six digits); the number is checked again (it may have
    been withdrawn since). */
export async function verifyCode(slug: string, input: { phone: string; code: string; next?: string | null }): Promise<Refusal | { to: string }> {
  const live = await liveOrRefuse(slug)
  if ('error' in live) return live
  const code = String(input?.code ?? '').replace(/\D/g, '')
  if (code.length !== CODE_LENGTH) return { error: 'Enter all 6 digits of the code' }
  const phone = phoneDigits(input.phone)
  if (isSgPhone(phone) && !(await codeTry('check', phone))) return { error: TOO_MANY }
  const h = isSgPhone(phone) ? await homeownerByPhone(phone) : null
  const links = h ? await linksOf(h.id, false) : []
  if (!h || !links.length) return { error: await notAdded(h?.id ?? null, live.studio) }
  if (!(await signInProvider().checkCode({ kind: 'phone', value: phone }, code).catch(() => false))) return { error: 'That code isn’t right — check it and try again' }
  await startClientSession(h.id)
  await stampOpened({ sessionId: '', homeownerId: h.id, name: titleCaseName(h.name), phone: h.phone, preview: false, memberId: null, memberName: null, links })
  for (const l of links) revalidateLead(l.leadId)
  return { to: safeNext(slug, input.next) ?? portalPath(slug) }   // (fix-F, F-20) back to the page they asked for
}

/** Sign out — or close a studio's preview. The session ends on the server, not only in the browser. */
export async function signOut(slug: string): Promise<{ to: string }> {
  /* (fix-G, G-43) closing a preview returns the studio member to the client's project (or lead), never to the client's sign-in */
  const back = await endSession(slug)
  return { to: back ?? portalPath(splitPortalSlug(slug).slug, 'login') }
}

/**
 * The client's answers to the questions the studio asked — "Tell us about your home" (board 6). Only questions this client was asked, on
 * a home their number opens; each answer by the questionnaire's own rules. They read back on the lead's Questionnaire tab as the client's.
 */
export async function answerQuestions(slug: string, input: { homeId: string; answers: { id: string; value: string | string[] }[] }): Promise<Refusal | { saved: number }> {
  const who = await portalActor(slug, { write: true })
  if ('error' in who) return who
  const home = homeOf(who.visitor, input.homeId)
  if (!home) return { error: 'This home isn’t one of yours' }
  const asked = await fetchPortalQuestions(home.leadId)
  const byId = new Map(asked.map((q) => [q.id, q]))
  const given = input.answers.filter((a) => byId.has(a.id) && (Array.isArray(a.value) ? a.value.length : String(a.value).trim()))
  for (const a of given) {
    const q = byId.get(a.id)!
    const problem = validateAnswer(q.type, a.value)
    if (problem) return { error: `${q.text.replace(/\?$/, '')}: ${problem.toLowerCase()}` }
  }
  if (!given.length) return { error: 'Answer at least one question' }
  const now = new Date()
  for (const a of given) {
    const next = Array.isArray(a.value) ? JSON.stringify(a.value) : a.value.trim()
    await db.update(questions).set({ answer: next, answeredBy: 'client', answeredAt: now }).where(and(eq(questions.id, a.id), eq(questions.leadId, home.leadId)))
    /* (gaps build D, item 9) every change kept — old → new, who (the client, or someone of their household), when */
    await recordAnswerChange(db, { leadId: home.leadId, questionId: a.id, before: byId.get(a.id)?.answer ?? null, after: next, byKind: 'client', byHomeownerId: who.visitor.homeownerId, byName: who.visitor.name, at: now })
  }
  const team = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, home.leadId))
  await notify('question_answered', team.map((t) => t.id), { title: `${who.visitor.name} answered ${given.length === 1 ? 'a question' : `${given.length} questions`}`, body: 'On their portal.', href: `/leads/${home.leadId}/questionnaire`, leadId: home.leadId, actorId: null })
  revalidateLead(home.leadId)
  revalidatePath(portalPath(slug), 'layout')
  return { saved: given.length }
}
