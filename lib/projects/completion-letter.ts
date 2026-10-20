import 'server-only'
import { and, desc, eq, gte, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplates, contracts, notifications } from '@/lib/db/schema'
import { signFieldsIn } from '@/lib/contracts/tokens'
import { newSignToken, windowFrom } from '@/lib/contracts/link-server'
import { afterSent, freshContract } from '@/lib/contracts/automation'
import { tellToAnswer } from '@/lib/portal/client-tells'
import { revalidateLead } from '@/lib/leads/queries'
import { revalidatePath } from 'next/cache'
import { DEFECTS_MONTHS_MAX } from './completion-letter-model'

/*
 * (S44R — UAT row 359, call C9, as recommended — his UAT ask 2026-10-15) The completion & warranty letter at handover. Company › Templates ›
 * Contracts marks ONE template *Use at handover*; the Hand over sheet offers "Send {client} the completion letter" with it, filled from the project
 * (the Handover fields: its number, the completion day, the defects period and the day it ends — lib/contracts/snapshot.ts), to sign (the house
 * signing link) or just to read and keep (`to_read`: its link shows the letter and a copy to download — nothing to sign). It goes with the press
 * that completes the project and comes back with that press's Undo.
 */

export type LetterTemplate = { templateId: string; title: string; /** it has a Client signature field — it can go to be signed */ signs: boolean }
export type LetterSent = { id: string; title: string; at: number; toRead: boolean; status: string }
/** The studio's handover template, and the letter this lead already has (the newest live one). */
export async function completionLetterFor(leadId: string): Promise<{ template: LetterTemplate; sent: LetterSent | null } | null> {
  const [t] = await db.select({ id: contractTemplates.id, title: contractTemplates.title, body: contractTemplates.body }).from(contractTemplates)
    .where(and(eq(contractTemplates.useAtHandover, true), isNull(contractTemplates.deletedAt), eq(contractTemplates.kind, 'document'))).limit(1)
  if (!t) return null
  const [c] = await db.select({ id: contracts.id, title: contracts.title, sentAt: contracts.sentAt, createdAt: contracts.createdAt, toRead: contracts.toRead, status: contracts.status }).from(contracts)
    .where(and(eq(contracts.leadId, leadId), eq(contracts.purpose, 'handover'), isNull(contracts.deletedAt))).orderBy(desc(contracts.createdAt)).limit(1)
  return {
    template: { templateId: t.id, title: t.title, signs: signFieldsIn(t.body).includes('client-signature') },
    sent: c ? { id: c.id, title: c.title, at: (c.sentAt ?? c.createdAt).getTime(), toRead: c.toRead, status: c.status } : null,
  }
}

export type IssuedLetter = { id: string; title: string; path: string; toRead: boolean }
/** Make the letter from the handover template and send it: to sign (its link opens for the studio's window) or to read and keep. */
export async function issueCompletionLetter(o: { leadId: string; at: Date; months: number; toRead: boolean; by: string; makeDoc: (leadId: string, templateId: string) => Promise<string> }): Promise<IssuedLetter | null> {
  const found = await completionLetterFor(o.leadId)
  if (!found) return null
  const months = Math.min(DEFECTS_MONTHS_MAX, Math.max(1, Math.round(o.months) || 12))
  const toRead = o.toRead || !found.template.signs   // a letter with nowhere to sign can only be read
  const id = await o.makeDoc(o.leadId, found.template.templateId)
  const token = newSignToken()
  await db.update(contracts).set({
    purpose: 'handover', toRead, defectsMonths: months, contractDate: o.at, reminders: false, fromQuoteId: null,   // the letter signs no quote
    status: 'Sent to Client', sentAt: o.at, sentBy: o.by, signToken: token, signExpiresAt: toRead ? null : await windowFrom(o.at), updatedAt: o.at,
  }).where(eq(contracts.id, id))
  const fresh = await freshContract(id)
  if (fresh && !toRead) { await afterSent(fresh, o.at); await tellToAnswer({ kind: 'agreement', id }) }   // the house send's own follow-ups and the client's email
  revalidateLead(o.leadId); revalidatePath('/contracts')
  return { id, title: fresh?.title ?? found.template.title, path: `/sign/${token}`, toRead }
}

/** The completion's Undo takes the letter back: it goes to Deleted Contracts (never one the client already signed), its bell row with it. */
export async function withdrawCompletionLetter(id: string, by: string): Promise<boolean> {
  const [c] = await db.select({ id: contracts.id, leadId: contracts.leadId, title: contracts.title, status: contracts.status, purpose: contracts.purpose, deletedAt: contracts.deletedAt, sentAt: contracts.sentAt }).from(contracts).where(eq(contracts.id, id)).limit(1)
  if (!c || c.purpose !== 'handover' || c.deletedAt || c.status === 'Signed') return false
  await db.update(contracts).set({ deletedAt: new Date(), deletedBy: by, signExpiresAt: null, signToken: newSignToken() }).where(eq(contracts.id, id))   // its old address stops opening
  /* the studio's "went out for signature" row its send raised — that one only */
  if (c.sentAt) await db.delete(notifications).where(and(eq(notifications.kind, 'contract_sent'), eq(notifications.leadId, c.leadId), eq(notifications.title, `“${c.title}” went out for signature`), gte(notifications.createdAt, new Date(c.sentAt.getTime() - 2000))))
  revalidateLead(c.leadId); revalidatePath('/contracts')
  return true
}

