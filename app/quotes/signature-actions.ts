'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, quotes } from '@/lib/db/schema'
import { revalidateEveryLead } from '@/lib/leads/queries'
import { stampQuote } from '@/lib/quotes/stamp'
import { isSignatureImage, isSignatureKind, SIGNATURE_TOO_BIG, SIGNATURE_WRONG_TYPE, type MemberSignature, type SignatureKind } from '@/lib/quotes/signature'

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
  await db.update(members).set({ signatureKind: kind, signatureName: name, signatureData: data }).where(eq(members.isYou, true))   // (REG-667) the signed-in member's own signature
  revalidateEveryLead()
  return { kind, name, data }
}

/** The section-top switch. */
export async function setClientSignatureRequired(quoteId: string, required: boolean): Promise<{ updatedAt: number }> {
  await db.update(quotes).set({ clientSignatureRequired: !!required }).where(eq(quotes.id, quoteId))
  return stampQuote(quoteId)
}
