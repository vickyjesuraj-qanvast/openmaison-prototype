'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, quotes } from '@/lib/db/schema'
import { SESSION_MEMBER_ID } from '@/lib/db/session'
import { revalidateEveryLead } from '@/lib/leads/queries'
import { stampQuote } from '@/lib/quotes/stamp'

/* Signature (1240:34176, REG-421): the signed-in member's own signature (studio-wide — it travels to every quote they prepare)
   and the quote's "Client Signature Required" switch. */

export type SignatureInput = { kind: 'draw' | 'type'; name: string; data: string | null }

/** Signature Settings › Save: the member's signature. A drawing is an SVG path (M/L commands only, bounded) — never markup. */
export async function saveMemberSignature(input: SignatureInput): Promise<{ kind: 'draw' | 'type'; name: string; data: string | null }> {
  const kind = input.kind === 'draw' ? 'draw' : 'type'
  const name = (typeof input.name === 'string' ? input.name : '').trim().slice(0, 80)
  if (!name) throw new Error('name required')
  let data: string | null = null
  if (kind === 'draw') {
    const raw = typeof input.data === 'string' ? input.data.slice(0, 20_000) : ''
    if (!/^(M[\d.\s]+(L[\d.\s]+)*\s*)+$/.test(raw.trim())) throw new Error('bad signature path')
    data = raw.trim()
  }
  await db.update(members).set({ signatureKind: kind, signatureName: name, signatureData: data }).where(eq(members.id, SESSION_MEMBER_ID))
  revalidateEveryLead()
  return { kind, name, data }
}

/** The section-top switch. */
export async function setClientSignatureRequired(quoteId: string, required: boolean): Promise<{ updatedAt: number }> {
  await db.update(quotes).set({ clientSignatureRequired: !!required }).where(eq(quotes.id, quoteId))
  return stampQuote(quoteId)
}
