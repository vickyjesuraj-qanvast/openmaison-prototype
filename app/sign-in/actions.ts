'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { CODE_LENGTH, SIGN_IN, codeWentTo, isContact, readContact, type Contact } from '@/lib/auth/model'
import { safeStudioNext } from '@/lib/auth/paths'
import { takeTry } from '@/lib/auth/limit'
import { visitorTry } from '@/lib/auth/visitor'   // (pending modules S34)
import { signInProvider, type ProvisionedMember } from '@/lib/auth/provider'
import { endStudioSession, leaveThisStudio, memberByContact, startStudioSession } from '@/lib/auth/session'
import { claimTrialWork } from '@/lib/trial/claim'   // (pending modules S41b-3)
import type { WorkCount } from '@/lib/trial/policy'
import { acceptInvitationOf, homeOf, latestInvitation } from '@/lib/company/invitations-server'
import { findElsewhere, openStudio, openStudioKey } from '@/lib/studios/registry'
import { createStudio } from '@/lib/studios/create'
import { readSignUp } from '@/lib/studios/model'
import { nextTint } from '@/lib/company/member-rules'
import { lookUnder } from '@/lib/company/member-photo'
import { titleCaseName } from '@/lib/format'

/*
 * (pending modules S30 — her "build all of them" 2026-10-11; card onboarding:studio-sign-in; 1.0's api/auth/login · verify · logout) Signing in
 * to the studio, on the server. Step one asks for a code for a mobile number or an email; step two checks it and starts the session. 1.0's
 * refusals, in 2.0's words: a number nobody in the studio has ("No account found…"), a deactivated member, an invitation that ran out (an open
 * one joins the team on this sign-in — 1.0's verify route accepted every pending invitation for that number); and five tries a minute.
 * Nothing names the studio or anyone in it before the code is checked — anyone can type a number. The code itself is the provider's
 * (lib/auth/provider.ts): the prototype's sends nothing and takes any six digits, and the page says so.
 */

type Refusal = { error: string; /** "No account found" — the page adds who to ask */ noAccount?: true }

type Who = { member: NonNullable<Awaited<ReturnType<typeof memberByContact>>>; joining: boolean } | { provisioned: ProvisionedMember }
  /** (pending modules S31) a member of another of this prototype's studios — the code opens that studio */
  | { elsewhere: string; joining: boolean } | Refusal

/** Who this mobile number or email signs in as — or why it can't. */
async function whoSignsIn(c: Contact, now = Date.now()): Promise<Who> {
  const m = await memberByContact(c)
  if (!m) {
    /* the Qanvast line (the developers' provider): someone the provider knows becomes a member on their first sign-in */
    const p = await signInProvider().provision?.(c) ?? null
    if (p) return { provisioned: p }
    /* (pending modules S31) signing in finds your studio: a member of another studio on this prototype (the demo's, or one started here) —
       with the same refusals as here */
    const e = await findElsewhere(c)
    if (e) {
      if (!e.member.isActive) return { error: SIGN_IN.deactivated }
      const waiting = e.invitation?.status === 'pending' && !e.member.welcomedAt
      if (waiting && e.invitation!.expiresAt.getTime() <= now) return { error: SIGN_IN.inviteExpired }
      return { elsewhere: e.key, joining: waiting }
    }
    return { error: c.kind === 'phone' ? SIGN_IN.noAccountPhone : SIGN_IN.noAccountEmail, noAccount: true }
  }
  if (!m.isActive) return { error: SIGN_IN.deactivated }
  const inv = await latestInvitation(m.id)
  const waiting = inv?.status === 'pending' && !m.welcomedAt
  if (waiting && inv.expiresAt.getTime() <= now) return { error: SIGN_IN.inviteExpired }
  return { member: m, joining: waiting }
}

/** Sign-in, step one: a code to the mobile or the email. Answers where it went (as the page says it) and whether this sign-in joins the team. */
export async function requestSignInCode(input: { contact: string }): Promise<Refusal | { to: string; joining: boolean }> {
  const c = readContact(input?.contact)
  if (!isContact(c)) return c
  if (!takeTry(`send:${c.kind}:${c.value}`) || !(await visitorTry('send'))) return { error: SIGN_IN.tooMany }   // (pending modules S34) and per visitor, with a real provider
  const who = await whoSignsIn(c)
  if ('error' in who) return who
  const sent = await signInProvider().sendCode(c)
  if ('error' in sent) return { error: SIGN_IN.couldntSend }
  return { to: codeWentTo(c), joining: ('member' in who || 'elsewhere' in who) && who.joining }
}

/** A provider's new member (the Qanvast line): added as Add member adds one — owed the first-visit welcome — with the provider's role.
    (pending modules S31) A provider's person whose company has no studio yet (`p.studio` — 1.0's auto-provision made it on the first sign-in)
    gets the studio made for them, as signing up makes one, and is its Owner: answers the studio to open with them. */
async function addProvisionedMember(p: ProvisionedMember): Promise<string | { studio: string; ownerId: string } | Refusal> {
  if (p.studio) {
    const r = readSignUp({ kind: 'studio', studioName: p.studio.name, ownerName: p.name, phone: p.phone ?? '', email: p.email ?? '' })
    if ('errors' in r) return { error: SIGN_IN.couldntSend }
    const made = await createStudio(r.studio, { via: 'qanvast' })
    return 'error' in made ? made : { studio: made.key, ownerId: made.ownerId }
  }
  const team = await db.select({ color: members.color }).from(members)
  const id = randomUUID()
  await db.insert(members).values({ id, name: titleCaseName(p.name).slice(0, 60) || 'New member', role: p.role, color: nextTint(team.map((m) => lookUnder(m.color))), standingYou: false, email: p.email, phone: p.phone, isActive: true, managerId: null, welcomeDue: true })
  return id
}

/**
 * Sign-in, step two: the code. Checked by the provider; the number or email is looked up again (it may have changed since). An open
 * invitation is accepted on this first sign-in (whoever invited them hears it); the session starts — 24 hours, or 30 days with Keep me signed
 * in — and the member lands where they asked to go, else on their home (Accounting's is Finance).
 */
export async function signInWithCode(input: { contact: string; code: string; remember: boolean; next?: string | null }): Promise<Refusal | { to: string; /** (S31) another studio opened — the page loads in full */ switched?: true; /** (pending modules S41b-3) what came over from the website's free trial */ claimed?: WorkCount }> {
  const c = readContact(input?.contact)
  if (!isContact(c)) return c
  const code = typeof input?.code === 'string' ? input.code.replace(/\D/g, '') : ''
  if (code.length !== CODE_LENGTH) return { error: SIGN_IN.codeShort }
  if (!takeTry(`check:${c.kind}:${c.value}`) || !(await visitorTry('check'))) return { error: SIGN_IN.tooMany }
  let who = await whoSignsIn(c)
  if ('error' in who) return who
  if (!(await signInProvider().checkCode(c, code))) return { error: SIGN_IN.codeWrong }
  /* (pending modules S31) their studio is another of this prototype's: this browser leaves the open one and that studio opens — then the
     sign-in goes on there, as it would have from the start (an open invitation is accepted, the session starts) */
  let switched = false
  if ('elsewhere' in who) {
    const before = openStudioKey()
    await leaveThisStudio()
    if (!(await openStudio(who.elsewhere))) return { error: SIGN_IN.couldntSend }
    who = await whoSignsIn(c)
    if ('error' in who || 'elsewhere' in who) { await openStudio(before); return 'error' in who ? who : { error: SIGN_IN.couldntSend } }
    switched = true
  }
  let memberId: string
  if ('member' in who) memberId = who.member.id
  else {
    const added = await addProvisionedMember(who.provisioned)
    if (typeof added === 'object' && 'error' in added) return added
    if (typeof added === 'object') {
      await leaveThisStudio()
      if (!(await openStudio(added.studio))) return { error: SIGN_IN.couldntSend }
      memberId = added.ownerId
      switched = true
    } else memberId = added
  }
  const role = 'member' in who ? who.member.role : who.provisioned.studio ? 'Owner' : who.provisioned.role
  if ('member' in who && who.joining) await acceptInvitationOf(memberId)
  await startStudioSession(memberId, { remember: input?.remember === true, via: 'code', channel: c.kind })
  /* (pending modules S41b-3 — 1.0's claim-on-login: "logging into an existing account still claims — it is their work and their studio")
     what this browser made in the website's free trial comes into the studio signed in to (never the demo's own, on this prototype) */
  const claimed = await claimTrialWork({ into: openStudioKey(), memberId })
  if (!switched) revalidatePath('/', 'layout')   // (S31) another studio that opened loads in full — no refresh in place
  /* a studio that opened here is a new one for this browser: it goes to that studio's front door, never a page asked for in the other */
  return { to: switched ? homeOf(role) : safeStudioNext(input?.next) ?? homeOf(role), ...(switched ? { switched: true as const } : {}), ...(claimed ? { claimed } : {}) }
}

/** Sign out — the studio block's menu, the phone's You sheet. The session ends on the server, not only in the browser (1.0's logout). */
export async function signOut(): Promise<{ to: string }> {
  await endStudioSession()
  revalidatePath('/', 'layout')
  return { to: '/sign-in?reason=out' }
}
