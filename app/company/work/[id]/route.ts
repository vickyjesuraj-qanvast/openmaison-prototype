import { sendStored } from '@/lib/leads/file-store'
import { portfolioPicture } from '@/lib/portfolio/queries'

/** (pending modules S27) A piece of work's picture on the studio's own pages — the Public profile editor, a Hangout's plan, the meeting room. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await portfolioPicture(id)
  return sendStored(p?.data, req, { name: `${id}.jpg`, cache: 'private, max-age=300' }) ?? new Response('Not found', { status: 404 })
}
