import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { sendStored } from '@/lib/leads/file-store'
import { portfolioPicture } from '@/lib/portfolio/queries'
import { portalGate } from '@/lib/portal/session'

/** (pending modules S27) A piece of work's picture on the portal's About › Our team — checked as every portal request is, and only the work of
    a member Our team shows now. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const gate = await portalGate(slug)
  if (gate.kind !== 'in' || gate.look.hidden.includes('about')) return new Response('Not found', { status: 404 })
  const p = await portfolioPicture(id)
  if (!p) return new Response('Not found', { status: 404 })
  const [m] = await db.select({ id: members.id }).from(members).where(and(eq(members.id, p.memberId), eq(members.portalShown, true), eq(members.isActive, true))).limit(1)
  if (!m) return new Response('Not found', { status: 404 })
  return sendStored(p.data, req, { name: `${id}.jpg`, cache: 'private, max-age=300' }) ?? new Response('Not found', { status: 404 })
}
