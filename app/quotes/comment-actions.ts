'use server'

import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { members, quoteItemComments, quoteItems, quotes, type QuoteItemComment } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'   // (pending modules S43A) this browser's member, never the standing flag
import { revalidateLead } from '@/lib/leads/queries'
import { deskRefusal, keepOffDesk } from '@/lib/quotes/desk'   // (S44Z) the editors' role rule on the server
import type { Refusal } from '@/lib/company/template-rules'

/* (REG-627, quote editor parity Q-30) Comments on a quote's lines — the task comments' rules: anyone on the team comments, the author
   edits their own, anyone deletes (the Tasks panel's kebab). Every write revalidates the lead (its Activity reads the threads). */

async function me(): Promise<string> {
  await keepOffDesk()   // (S44Z) the role first
  const [m] = await db.select({ id: members.id }).from(members).where(eq(members.id, await sessionMemberId()))
  if (!m) throw new Error('no signed-in member')
  return m.id
}
const clean = (body: string) => body.replace(/\s+$/g, '').slice(0, 2000).trim()
const touch = async (quoteId: string) => {
  const [q] = await db.select({ leadId: quotes.leadId }).from(quotes).where(eq(quotes.id, quoteId))
  if (q) revalidateLead(q.leadId)
  revalidatePath(`/quotes/${quoteId}`)
}

export async function addLineComment(quoteId: string, itemId: string, body: string): Promise<QuoteItemComment | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a comment is read
  const text = clean(body)
  if (!text) throw new Error('empty comment')
  const [line] = await db.select({ id: quoteItems.id }).from(quoteItems).where(and(eq(quoteItems.id, itemId), eq(quoteItems.quoteId, quoteId)))
  if (!line) throw new Error('line not found')
  const now = new Date()
  const row = { id: randomUUID(), quoteId, itemId, authorId: await me(), body: text, createdAt: now, updatedAt: now }
  await db.insert(quoteItemComments).values(row)
  await touch(quoteId)
  return row
}
export async function editLineComment(id: string, body: string): Promise<void | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a comment is read
  const text = clean(body)
  if (!text) throw new Error('empty comment')
  const [c] = await db.select().from(quoteItemComments).where(eq(quoteItemComments.id, id))
  if (!c) throw new Error('comment not found')
  if (c.authorId !== (await me())) throw new Error('only its author edits a comment')
  await db.update(quoteItemComments).set({ body: text, updatedAt: new Date() }).where(eq(quoteItemComments.id, id))
  await touch(c.quoteId)
}
export async function deleteLineComment(id: string): Promise<void | Refusal> {
  const no = await deskRefusal(); if (no) return no   // (S44Z) the editors' role rule — before a comment is read
  const [c] = await db.select().from(quoteItemComments).where(eq(quoteItemComments.id, id))
  if (!c) return
  await db.delete(quoteItemComments).where(eq(quoteItemComments.id, id))
  await touch(c.quoteId)
}
