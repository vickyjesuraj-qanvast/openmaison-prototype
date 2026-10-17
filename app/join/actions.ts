'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { CODE_LENGTH, SIGN_IN, codeGoesTo, contactsOf, type Contact } from '@/lib/auth/model'
import { takeTry } from '@/lib/auth/limit'
import { visitorTry } from '@/lib/auth/visitor'   // (pending modules S34)
import { signInProvider } from '@/lib/auth/provider'
import { startStudioSession } from '@/lib/auth/session'
import { acceptInvitationOf, homeOf, memberForJoin } from '@/lib/company/invitations-server'

/*
 * (pending modules S09 — 1.0's `/api/invitations/accept` and auth/verify's auto-accept; pending modules S30 — sign-in) Join, on an
 * invitation's page. The token is the permission to ask; the code proves the mobile (or the email) is theirs — 1.0's invitee confirmed their
 * number at sign-in. An open invitation is accepted (whoever invited them hears it) and the member is signed in on this browser; a link that
 * has already joined signs them in the same way — a code, never the link alone. Answers where their first page is — the welcome waits there.
 */

/** The member a join link belongs to and what their code goes to (their mobile, else their email) — or why it can't. */
async function joiner(token: string): Promise<{ memberId: string; role: string; state: 'open' | 'joined'; to: Contact } | { error: string }> {
  const r = await memberForJoin(typeof token === 'string' ? token : '')
  if ('error' in r) return r
  const [m] = await db.select({ phone: members.phone, email: members.email }).from(members).where(eq(members.id, r.memberId)).limit(1)
  const to = m ? contactsOf(m)[0] : undefined
  if (!to) return { error: 'There’s no mobile number or email to send your code to — ask the studio to add one' }
  return { ...r, to }
}

/** Step one: the code, to the mobile number or the email the studio has for them. */
export async function sendJoinCode(input: { token: string }): Promise<{ to: string } | { error: string }> {
  const j = await joiner(input?.token)
  if ('error' in j) return j
  if (!takeTry(`join-send:${j.memberId}`) || !(await visitorTry('send'))) return { error: SIGN_IN.tooMany }   // (pending modules S34) and per visitor, with a real provider
  const sent = await signInProvider().sendCode(j.to)
  if ('error' in sent) return { error: SIGN_IN.couldntSend }
  return { to: codeGoesTo(j.to) }
}

/** Step two: the code checked — the invitation accepted (once), the session started, their home answered. */
export async function joinStudio(input: { token: string; code: string; remember?: boolean }): Promise<{ ok: true; href: string } | { error: string }> {
  const j = await joiner(input?.token)
  if ('error' in j) return j
  const code = typeof input?.code === 'string' ? input.code.replace(/\D/g, '') : ''
  if (code.length !== CODE_LENGTH) return { error: SIGN_IN.codeShort }
  if (!takeTry(`join-check:${j.memberId}`) || !(await visitorTry('check'))) return { error: SIGN_IN.tooMany }
  if (!(await signInProvider().checkCode(j.to, code))) return { error: SIGN_IN.codeWrong }
  if (j.state === 'open') await acceptInvitationOf(j.memberId)
  await startStudioSession(j.memberId, { remember: input?.remember !== false, via: 'join', channel: j.to.kind })
  revalidatePath('/', 'layout')
  return { ok: true, href: homeOf(j.role) }
}
