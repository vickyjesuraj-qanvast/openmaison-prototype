import 'server-only'   // libSQL must never reach the browser bundle: the tag helpers live in lib/leads/return-tags.ts
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leadReturns, members, returnAttachments, type LeadFile, type LeadReturn, type Member } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'   // (pending modules S43A) "you" = this request's member

/* Qanvast lead return (931:48236) — the return record with its attachments and people, for the LEAD RETURNED card and the details modal. */

export type ReturnDetail = LeadReturn & { attachments: LeadFile[]; returnedBy: Member | null }

/** The lead's latest return (null when never returned). */
export async function fetchReturnDetail(leadId: string): Promise<ReturnDetail | null> {
  const [ret] = await db.select().from(leadReturns).where(eq(leadReturns.leadId, leadId)).orderBy(desc(leadReturns.returnedAt)).limit(1)
  if (!ret) return null
  const [links, team] = await Promise.all([
    db.select().from(returnAttachments).where(eq(returnAttachments.returnId, ret.id)).orderBy(asc(returnAttachments.createdAt)),
    db.select().from(members).then(withYou),
  ])
  const files = links.length ? await db.select().from(leadFiles).where(and(inArray(leadFiles.id, links.map((l) => l.fileId)), isNull(leadFiles.deletedAt))) : []
  const byId = new Map(files.map((f) => [f.id, f]))
  return { ...ret, attachments: links.map((l) => byId.get(l.fileId)).filter((f): f is LeadFile => !!f), returnedBy: team.find((m) => m.id === ret.returnedById) ?? null }
}
