import 'server-only'
import { and, asc, eq, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, members, quoteFiles, quoteItems, quotes } from '@/lib/db/schema'
import { fetchBrand } from '@/lib/templates/queries'
import { lineTotalMinor } from './math'

/** A quote status the confirmation link answers to: the studio has sent it (or approved it for the client). */
export const CONFIRMABLE = ['Approved', 'Sent to Client'] as const
export const isConfirmable = (status: string) => (CONFIRMABLE as readonly string[]).includes(status)

export type ConfirmExtras = {
  /** (REG-626, parity §8.2 · E-110) The link confirms only a quote the studio has sent; a draft says it is still being prepared. */
  open: boolean
  /** (REG-626, parity Q-32) The optional works the client may pick: each line's price with its GST, and what they answered. */
  optional: { id: string; name: string; description: string | null; minor: number; choice: 'want' | 'skip' | null }[]
  /** (REG-626, parity §8.2 · E-91) The files the studio shares with the quote while its Files section's "Show in client view" is on. */
  files: { id: string; name: string; kind: string; thumb: string | null }[]
  /** (UX audit Q6) Who "Ask for a change" writes to on WhatsApp: whoever prepared the quote, on their own number — else the studio's. */
  designer: { name: string; phone: string }
}

export async function fetchConfirmExtras(quoteId: string): Promise<ConfirmExtras | null> {
  const [q] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
  if (!q) return null
  const [items, files, team, brand] = await Promise.all([
    db.select().from(quoteItems).where(and(eq(quoteItems.quoteId, quoteId), eq(quoteItems.optional, true), eq(quoteItems.kind, 'item'), ne(quoteItems.visibility, 'hidden'))).orderBy(asc(quoteItems.position)),
    q.filesVisible ? db.select({ id: leadFiles.id, name: leadFiles.name, kind: leadFiles.kind, thumb: leadFiles.thumb }).from(quoteFiles).innerJoin(leadFiles, eq(leadFiles.id, quoteFiles.fileId))
      .where(and(eq(quoteFiles.quoteId, quoteId), isNull(leadFiles.deletedAt), ne(leadFiles.kind, 'folder'))) : Promise.resolve([]),
    db.select({ id: members.id, name: members.name, phone: members.phone }).from(members),
    fetchBrand(),
  ])
  const prepared = team.find((m) => m.id === (q.preparedBy ?? q.createdBy)) ?? null
  return {
    open: isConfirmable(q.status),
    optional: items.filter((i) => i.status !== 'Declined').map((i) => ({ id: i.id, name: i.name, description: i.description, minor: Math.round(lineTotalMinor(i) * (1 + (q.gstEnabled && i.printAs !== 'behalf' ? i.gstPct / 100 : 0))), choice: i.clientChoice === 'want' || i.clientChoice === 'skip' ? i.clientChoice : null })),
    files,
    designer: { name: prepared?.name ?? brand.details.name, phone: (prepared?.phone ?? '').trim() || brand.details.phone },
  }
}
