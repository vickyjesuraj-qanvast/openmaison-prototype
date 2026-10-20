import { MSG } from '@/lib/forms'
import { isSgMobile, isSgPhone, phoneDigits } from '@/lib/format'

/*
 * (pending modules S30 — his "build all of them" 2026-10-11; card onboarding:studio-sign-in; 1.0's src/app/login/page.tsx and
 * api/auth/{login,verify}) What a member signs in with and the words sign-in says — pure, for the page and the server alike.
 *
 * 1.0 signed a member in with their mobile number and a 6-digit SMS code. 2.0 takes the mobile number or the work email (a member added with
 * an email only — Add member allows it, S09 — must be able to come in too, and Dane, the demo's Owner, has no mobile on record). The country is
 * Singapore's (+65) until other countries come (S33, on hold by him). A code goes to a mobile, never a landline.
 */

export const CODE_LENGTH = 6
/** 1.0's: "Resend OTP in 30s". */
export const RESEND_S = 30

export type Contact = { kind: 'phone'; value: string } | { kind: 'email'; value: string }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** What was typed in "Mobile number or email": a Singapore mobile (8 or 9 first; +65 or not, spaces or not) or an email, else why not. */
export function readContact(raw: unknown): Contact | { error: string } {
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (!t) return { error: SIGN_IN.contactNeeded }
  if (t.includes('@')) {
    const e = t.toLowerCase()
    return e.length <= 120 && EMAIL.test(e) ? { kind: 'email', value: e } : { error: MSG.email }
  }
  if (/[^\d\s+().-]/.test(t)) return { error: SIGN_IN.contactNeeded }
  const d = phoneDigits(t)
  if (isSgMobile(d)) return { kind: 'phone', value: d }
  if (isSgPhone(d)) return { error: SIGN_IN.landline }
  return { error: MSG.phone }
}
export const isContact = (c: Contact | { error: string }): c is Contact => !('error' in c)

/** A member's sign-in keys: their mobile (a landline takes no code) and their email. */
export function contactsOf(m: { phone: string | null; email: string | null }): Contact[] {
  const out: Contact[] = []
  const p = phoneDigits(m.phone ?? '')
  if (isSgMobile(p)) out.push({ kind: 'phone', value: p })
  const e = (m.email ?? '').trim().toLowerCase()
  if (EMAIL.test(e)) out.push({ kind: 'email', value: e })
  return out
}

/**
 * (S01's note — "a phone change sends no confirmation code until sign-in exists") Your profile's save: the sign-in key a change ADDS — a new
 * mobile number first, else a new email — is the one a code confirms before it saves (a typo there would lock you out). Taking one away needs
 * no code; nothing added, nothing to confirm.
 */
export function keyToConfirm(before: { phone: string | null; email: string | null }, after: { phone: string; email: string }): Contact | null {
  const had = contactsOf(before)
  const added = contactsOf(after).filter((c) => !had.some((x) => x.kind === c.kind && x.value === c.value))
  return added.find((c) => c.kind === 'phone') ?? added[0] ?? null
}
/** (S44O — UAT row 344, Dwellings' "User not found"; his UAT ask 2026-10-15) A member's phone that is their only sign-in key — no email
    beside it — must be a mobile: the code goes there, and a landline (6…) takes none. With an email, a landline is just their number.
    Company › Members (Add member, Edit details) and Your profile ask it, on the page and on the server. */
export function landlineOnlyKey(d: { phone: string; email: string }): string | null {
  const p = phoneDigits(d.phone)
  return p && isSgPhone(p) && !isSgMobile(p) && !EMAIL.test(d.email.trim().toLowerCase()) ? MSG.mobile : null
}
/** A save that would leave a member who signs in with nothing to sign in with. */
export const losesEverySignInKey = (before: { phone: string | null; email: string | null }, after: { phone: string; email: string }): boolean =>
  contactsOf(before).length > 0 && contactsOf(after).length === 0
export const KEEP_A_KEY = 'Keep a mobile number or an email — you sign in with it'

/** "d•••@demostudio.sg" — an address the person did not type themselves (the invitation's page). */
export function maskEmail(e: string): string {
  const at = e.indexOf('@')
  return at < 1 ? e : `${e.slice(0, 1)}•••${e.slice(at)}`
}
/** Where the code went, as a sentence's end: "the number ending 4567" · "dane@demostudio.sg" (masked when they didn't type it). */
export function codeWentTo(c: Contact, masked = false): string {
  return c.kind === 'phone' ? `the number ending ${c.value.slice(-4)}` : masked ? maskEmail(c.value) : c.value
}
/** The join page's: "the mobile number ending 0077" · "your email d•••@demostudio.sg". */
export function codeGoesTo(c: Contact): string {
  return c.kind === 'phone' ? `the mobile number ending ${c.value.slice(-4)}` : `your email ${maskEmail(c.value)}`
}

/** The words (invented copy — REG-S30; 1.0's where they are 1.0's). Before the code nothing names the studio or anyone in it — anyone can
    type a number (the portal's rule, REG-1164 F-37). */
export const SIGN_IN = {
  contactNeeded: 'Enter your mobile number or email',
  landline: 'A code goes to a mobile — enter a number that starts with 8 or 9',
  noAccountPhone: 'No account found with this number',   // 1.0's
  noAccountEmail: 'No account found with this email',
  noAccountHelp: 'If your studio uses OpenMaison, ask its Owner to add you on Company › Members.',
  deactivated: 'This account is deactivated — ask your studio’s Owner to reactivate it',
  inviteExpired: 'Your invitation has expired — ask your studio to send you a new one',
  tooMany: 'Too many tries — wait a minute and try again',
  codeShort: 'Enter all 6 digits of the code',   // the portal's
  codeWrong: 'That code isn’t right — check it and try again',
  couldntSend: 'Couldn’t send the code — please try again',
  demo: 'Demo only — no text or email is sent: any six digits sign you in.',
  demoJoin: 'Demo only — no text or email is sent: any six digits work.',
  /* (pending modules S43A) S42A's fallback line ("one signed-in member at a time — every open window follows whoever signs in last") is gone:
     a code sign-in or a join now signs in this browser alone (lib/db/session.ts), so it was no longer true */
} as const

/** The page's one notice, by why it is showing (`?reason=`). */
export const SIGN_IN_NOTICE: Record<'out' | 'ended' | 'deactivated' | 'qanvast', { title: string; line: string | null }> = {
  out: { title: 'You’ve signed out', line: null },
  ended: { title: 'Your session ended', line: 'Sign in again to carry on.' },
  deactivated: { title: 'Your account is deactivated', line: 'Ask your studio’s Owner to reactivate it.' },
  /* 1.0's Qanvast line ("Your Qanvast session expired … The rest of OpenMaison kept working") — sent here by whatever finds Qanvast's
     connection dead (the developers' seam: signInHref({ reason: 'qanvast', next })) */
  qanvast: { title: 'Your Qanvast session expired', line: 'Sign in again to reach Lead credits, Qanvast leads and Reviews — everything else kept working.' },
}
