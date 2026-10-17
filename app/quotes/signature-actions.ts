'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, quotes } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { revalidateEveryLead } from '@/lib/leads/queries'
import { stampQuote } from '@/lib/quotes/stamp'
import { deskRefusal } from '@/lib/quotes/desk'   // (S44Z) the editors' role rule on the server — a quote's switch, never the member's own signature
import type { Refusal } from '@/lib/company/template-rules'
import { isSignatureImage, isSignatureKind, memberSignatureOf, SIGNATURE_TOO_BIG, SIGNATURE_WRONG_TYPE, type MemberSignature, type SignatureKind } from '@/lib/quotes/signature'

/* Signature (1240:34176, REG-421): the signed-in member's own signature (studio-wide — it travels to every quote they prepare)
   and the quote's "Client Signature Required" switch. */

/** (Dane UAT 6.23) `image`: the picture as a PNG / JPEG data URL — inside this one object, as every long string travels to an action. */
export type SignatureInput = { kind: SignatureKind; name: string; data: string | null }

/** Signature Settings › Save: the member's signature. A drawing is an SVG path (M/L commands only, bounded) — never markup; (Dane UAT 6.23)
 *  a picture is a PNG or JPEG data URL of at most 1 MB — never a link. A picture that isn't one is refused with the rule, as `{ error }`. */
export async function saveMemberSignature(input: SignatureInput): Promise<MemberSignature | { error: string }> {
  const kind: SignatureKind = isSignatureKind(input.kind) ? input.kind : 'type'
  const name = (typeof input.name === 'string' ? input.name : '').trim().slice(0, 80)
  if (!name) throw new Error('name required')
  let data: string | null = null
  if (kind === 'draw') {
    const raw = typeof input.data === 'string' ? input.data.slice(0, 20_000) : ''
    if (!/^(M[\d.\s]+(L[\d.\s]+)*\s*)+$/.test(raw.trim())) throw new Error('bad signature path')
    data = raw.trim()
  } else if (kind === 'image') {
    const raw = typeof input.data === 'string' ? input.data.trim() : ''
    if (!isSignatureImage(raw)) return { error: /^data:image\/(png|jpeg);base64,/.test(raw) ? SIGNATURE_TOO_BIG : SIGNATURE_WRONG_TYPE }
    data = raw
  }
  /* (pending modules S03 — 1.0 carried the opt-in across a new image) a member who never answered says yes by saving it here, where Signature
     Settings says it goes on their documents; a "no" stays a no until they turn it on in Your profile */
  const me = await sessionMemberId()   // (REG-667 · pending modules S43A) the signed-in member — this browser's
  const [had] = await db.select({ consent: members.signatureConsent }).from(members).where(eq(members.id, me)).limit(1)
  const consent = had?.consent ? {} : { signatureConsent: 'yes', signatureConsentAt: new Date() }
  await db.update(members).set({ signatureKind: kind, signatureName: name, signatureData: data, ...consent }).where(eq(members.id, me))   // (REG-667) the signed-in member's own signature
  revalidateEveryLead()
  revalidatePath('/profile'); revalidatePath('/company/members')   // (pending modules S01) Your profile's card, the Members row's state
  return { kind, name, data }
}

/** (pending modules S01 — 1.0's My Signature › Remove) Your profile › Your signature › Remove: the signed-in member's signature is taken off — the
 *  quotes they prepare print without one until they set it again. Answers what it was, so Undo saves it back (`saveMemberSignature`). */
export async function removeMemberSignature(): Promise<{ ok: true; previous: MemberSignature | null }> {
  const me = await sessionMemberId()
  const [m] = await db.select({ name: members.name, signatureKind: members.signatureKind, signatureName: members.signatureName, signatureData: members.signatureData }).from(members).where(eq(members.id, me)).limit(1)
  await db.update(members).set({ signatureKind: null, signatureName: null, signatureData: null }).where(eq(members.id, me))
  revalidateEveryLead()
  revalidatePath('/profile'); revalidatePath('/company/members')
  return { ok: true, previous: memberSignatureOf(m) }
}

/** The section-top switch. */
export async function setClientSignatureRequired(quoteId: string, required: boolean): Promise<{ updatedAt: number } | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before the quote is read
  await db.update(quotes).set({ clientSignatureRequired: !!required }).where(eq(quotes.id, quoteId))
  return stampQuote(quoteId)
}

/**
 * (pending modules S03 — 1.0's My Signature › "Auto-apply on approval … Revocable anytime") Your profile › Your signature's switch: may the
 * studio put the signed-in member's signature on the quotes and contracts they prepare. Their own row only; when they said so is kept.
 * Off, documents print the studio signature box blank (a signed contract keeps the copy it was signed with).
 */
export async function setSignatureConsent(on: boolean): Promise<{ consent: 'yes' | 'no' }> {
  const consent = on ? 'yes' : 'no'
  await db.update(members).set({ signatureConsent: consent, signatureConsentAt: new Date() }).where(eq(members.id, await sessionMemberId()))
  revalidateEveryLead()
  revalidatePath('/profile')
  return { consent }
}
