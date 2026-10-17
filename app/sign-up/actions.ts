'use server'

import type { FieldErrors } from '@/lib/forms'
import { CODE_LENGTH, SIGN_IN, codeWentTo, type Contact } from '@/lib/auth/model'
import { takeTry } from '@/lib/auth/limit'
import { visitorTry } from '@/lib/auth/visitor'   // (pending modules S34)
import { signInProvider } from '@/lib/auth/provider'
import { leaveThisStudio, memberByContact, startStudioSession } from '@/lib/auth/session'
import { createStudio, signUpsPaused } from '@/lib/studios/create'
import { findElsewhere, openStudio, openStudioKey } from '@/lib/studios/registry'
import { SIGN_UP, readSignUp, type NewStudio, type SignUpField, type SignUpInput } from '@/lib/studios/model'
import { claimTrialWork } from '@/lib/trial/claim'   // (pending modules S41b-3)
import type { WorkCount } from '@/lib/trial/policy'

/*
 * (pending modules S31 — her "build all of them" 2026-10-11; card onboarding:studio-sign-up; 1.0's admin studios POST, its onboarding tour's
 * phone + code step) A new studio signs itself up, on the server. Step one checks the details and sends a 6-digit code to the mobile; step two
 * checks the code, makes the studio and its Owner in one go (lib/studios/create.ts — on this prototype a database of its own), opens it and
 * signs this browser in as its Owner. A number or email that already has an account is refused with the way in (1.0's admin route refused a
 * user that already existed); paused sign-ups say 1.0's "Contact support for account setup"; five tries a minute, as sign-in.
 */

type Refusal = { error: string }
type FieldRefusal = { errors: FieldErrors<SignUpField>; /** the number or email has an account — the page offers sign-in */ taken?: true }

/** A number or email that already has an account — in the studio that is open, or in another of this prototype's. */
async function takenBy(s: NewStudio): Promise<FieldRefusal | null> {
  const phone: Contact = { kind: 'phone', value: s.phone }
  if ((await memberByContact(phone)) || (await findElsewhere(phone))) return { errors: { phone: SIGN_UP.phoneTaken }, taken: true }
  if (s.email) {
    const email: Contact = { kind: 'email', value: s.email }
    if ((await memberByContact(email)) || (await findElsewhere(email))) return { errors: { email: SIGN_UP.emailTaken }, taken: true }
  }
  return null
}

/** Signing up, step one: the details, then a code to the mobile. Answers where it went, as the page says it. */
export async function requestSignUpCode(input: SignUpInput): Promise<Refusal | FieldRefusal | { to: string }> {
  if (signUpsPaused()) return { error: SIGN_UP.paused }
  const r = readSignUp(input)
  if ('errors' in r) return r
  if (!takeTry(`signup:${r.studio.phone}`) || !(await visitorTry('send'))) return { error: SIGN_IN.tooMany }   // (pending modules S34) and per visitor, with a real provider
  const taken = await takenBy(r.studio)
  if (taken) return taken
  const c: Contact = { kind: 'phone', value: r.studio.phone }
  const sent = await signInProvider().sendCode(c)
  if ('error' in sent) return { error: SIGN_IN.couldntSend }
  return { to: codeWentTo(c) }
}

/**
 * Signing up, step two: the code. Checked by the provider; the details are checked again (someone may have taken the number since); the
 * studio and its Owner are made; this browser leaves the studio it had open (its session there ends) and the new one opens, signed in as its
 * Owner — 24 hours, or 30 days with Keep me signed in. They land on the app's front door, where their welcome waits (S08).
 */
export async function startStudio(input: SignUpInput & { code: string; remember: boolean }): Promise<Refusal | FieldRefusal | { to: string; /** (pending modules S41b-3) what came over from the website's free trial */ claimed?: WorkCount }> {
  if (signUpsPaused()) return { error: SIGN_UP.paused }
  const r = readSignUp(input)
  if ('errors' in r) return r
  const code = typeof input?.code === 'string' ? input.code.replace(/\D/g, '') : ''
  if (code.length !== CODE_LENGTH) return { error: SIGN_IN.codeShort }
  if (!takeTry(`signup-check:${r.studio.phone}`) || !(await visitorTry('check'))) return { error: SIGN_IN.tooMany }
  const taken = await takenBy(r.studio)
  if (taken) return taken
  if (!(await signInProvider().checkCode({ kind: 'phone', value: r.studio.phone }, code))) return { error: SIGN_IN.codeWrong }
  const made = await createStudio(r.studio, { via: 'sign-up' })
  if ('error' in made) return made
  const before = openStudioKey()
  await leaveThisStudio()
  if (!(await openStudio(made.key))) { await openStudio(before); return { error: SIGN_UP.couldnt } }
  await startStudioSession(made.ownerId, { remember: input?.remember === true, via: 'code', channel: 'phone' })
  /* (pending modules S41b-3 — 1.0's claim-on-login) what this browser made in the website's free trial moves into the new studio, by the
     studio's own actions, now that it is open and its Owner signed in — never before, never into another */
  const claimed = await claimTrialWork({ into: made.key, memberId: made.ownerId })
  return { to: '/', ...(claimed ? { claimed } : {}) }   // the page loads in full (a new studio — no cached page of the one before); no refresh in place
}
