import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { StudioSignIn } from '@/components/auth/studio-sign-in'
import { contactsOf } from '@/lib/auth/model'
import { isSignInReason, safeStudioNext, signInHref } from '@/lib/auth/paths'
import { isStandInProvider } from '@/lib/auth/provider'
import { readStudioSession } from '@/lib/auth/session'
import { homeOf } from '@/lib/company/invitations-server'
import { phoneTyped } from '@/lib/format'
import { signUpsPaused } from '@/lib/studios/create'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } }

/** The demo's line under the form: who to try — the studio's first Owner, by their mobile, else their email. Never in a real build.
    (the calm UI build 2026-10-27 — the audit's 1-46) just what to type — the box says "Demo: any 6 digits work — try {it}" */
async function demoHint(): Promise<string | null> {
  const [o] = await db.select({ name: members.name, phone: members.phone, email: members.email }).from(members)
    .where(and(eq(members.role, 'Owner'), eq(members.isActive, true))).orderBy(asc(members.name)).limit(1)
  const key = o ? contactsOf(o)[0] : null
  return o && key ? (key.kind === 'phone' ? phoneTyped(key.value).replace(' ', '\u00a0') : key.value) : null   // a number never breaks across lines
}

/**
 * (pending modules S30 — his "build all of them" 2026-10-11; card onboarding:studio-sign-in; 1.0's /login) Sign in to the studio's app. Already
 * signed in, it is never shown: you go where you asked to go, else home (1.0's `getDefaultRoute` — Accounting's is Finance). `?next=` is the
 * studio page a signed-out visit asked for; `?reason=` says why the page is showing (signed out · the session ended · deactivated · the
 * Qanvast connection timed out).
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; reason?: string | string[] }> }) {
  const q = await searchParams
  const next = safeStudioNext(typeof q.next === 'string' ? q.next : null)
  const s = await readStudioSession()
  const asked = typeof q.reason === 'string' && isSignInReason(q.reason) ? q.reason : null
  /* signed in: straight on (proxy.ts already did this for an address with no reason) — except the Qanvast line's "session expired", which asks
     to sign in again over a live session (1.0's escape) */
  if (s.in && asked !== 'qanvast') redirect(next ?? homeOf(s.role))
  /* why it shows: the address's reason — and what the record says (a session that ran out, an account switched off) goes into the address
     first, so the ghost that paints before the page reads the same notice */
  const known = !s.in && (s.reason === 'ended' || s.reason === 'deactivated') ? s.reason : null
  if (!asked && known) redirect(signInHref({ next, reason: known }))
  const notice = asked
  const demo = isStandInProvider()
  return <StudioSignIn next={next} notice={notice} hint={demo ? await demoHint() : null} demo={demo} signUps={signUpsPaused() ? 'paused' : 'open'} />
}
