import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studioPictures } from '@/lib/db/schema'
import { sendStored } from '@/lib/leads/file-store'
import { onPagePlan } from '@/lib/hangouts/queries'

/** (pending modules S27) A member's photo on the studio's Hangout page — only the photo of someone on that Hangout's plan. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params
  const [p] = await db.select({ data: studioPictures.data, memberId: studioPictures.memberId }).from(studioPictures).where(and(eq(studioPictures.id, id), eq(studioPictures.kind, 'member'), isNull(studioPictures.deletedAt))).limit(1)
  if (!p?.memberId || !(await onPagePlan(token, p.memberId))) return new Response('Not found', { status: 404 })
  return sendStored(p.data, req, { name: `${id}.jpg`, cache: 'public, max-age=300' }) ?? new Response('Not found', { status: 404 })
}
