'use server'

import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { quotes } from '@/lib/db/schema'
import { fetchedForPreview } from '@/lib/link-cards/origin'
import { isStudioVisit } from '@/lib/auth/studio-visit'
import { fetchQuoteApproval } from '@/lib/settings/queries'
import { quoteByConfirmKey } from '@/lib/quotes/client-quote'
import { quoteByViewToken } from '@/lib/quotes/view-link-queries'
import { isConfirmable } from '@/lib/quotes/confirm-data'
import { viewShows } from '@/lib/quotes/view-link'

/**
 * (pending modules S04 — 1.0's `preview_view_count`; card held:quotes: "'Viewed' on the quote link … 'they opened it' is the follow-up cue")
 * A person opened the quote on one of its client links — the confirmation link or the view-only link. The page asks once it has run in a
 * browser (a chat app drawing the link's card never runs the page, and a fetcher's own ask is turned away here too); the first open, the
 * last and the count go on the quote (`client_viewed_at` · `client_last_viewed_at` · `client_view_count`). Only while the page shows the
 * quote — a link opened before the studio sent it ("Not ready yet") stamps nothing. No session: the token is the permission; one object.
 * It revalidates no path (the client's pages, as the portal's actions — S02): the studio's own pages read the stamp on their next load.
 */
export async function stampQuoteSeen(o: { token: string; via: 'confirm' | 'view' }): Promise<{ ok: boolean }> {
  const token = typeof o?.token === 'string' ? o.token : ''
  if (await fetchedForPreview()) return { ok: false }
  if (await isStudioVisit()) return { ok: false }   // (S42 B-02) the studio checking its own link is never the client's open
  const id = o?.via === 'view' ? (await quoteByViewToken(token))?.quoteId ?? null : o?.via === 'confirm' ? (await quoteByConfirmKey(token))?.id ?? null : null
  if (!id) return { ok: false }
  const [q] = await db.select({ id: quotes.id, status: quotes.status, confirmedAt: quotes.confirmedAt }).from(quotes).where(and(eq(quotes.id, id), isNull(quotes.deletedAt))).limit(1)
  if (!q) return { ok: false }
  const shows = o.via === 'view' ? viewShows({ status: q.status, approval: await fetchQuoteApproval() }) : isConfirmable(q.status) || q.status === 'Signed' || !!q.confirmedAt
  if (!shows) return { ok: false }
  const now = new Date()
  await db.update(quotes).set({ clientViewedAt: sql`coalesce(${quotes.clientViewedAt}, ${Math.floor(now.getTime() / 1000)})`, clientLastViewedAt: now, clientViewCount: sql`${quotes.clientViewCount} + 1` }).where(eq(quotes.id, q.id))
  return { ok: true }
}
