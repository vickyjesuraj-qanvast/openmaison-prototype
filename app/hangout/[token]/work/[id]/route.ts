import { sendStored } from '@/lib/leads/file-store'
import { portfolioPicture } from '@/lib/portfolio/queries'
import { onPagePlan } from '@/lib/hangouts/queries'

/** (pending modules S27) A piece of work's picture on the studio's Hangout page — only the work of someone on that Hangout's plan; the studio's
    own picture addresses never reach a homeowner's page. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params
  const p = await portfolioPicture(id)
  if (!p || !(await onPagePlan(token, p.memberId))) return new Response('Not found', { status: 404 })
  return sendStored(p.data, req, { name: `${id}.jpg`, cache: 'public, max-age=300' }) ?? new Response('Not found', { status: 404 })
}
