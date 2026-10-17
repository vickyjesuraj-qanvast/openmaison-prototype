import { NextResponse, type NextRequest } from 'next/server'
import { isAuthorizedCron } from '@/lib/services/cron-auth'
import { CRON_ROUTES, runJobs } from '@/lib/services/sweep'

/*
 * (pending modules S34 — card api:message-delivery-providers, "the production five-minute sweep") The scheduler's door: GET (Vercel Cron) or
 * POST /api/cron/<job> with `Authorization: Bearer <CRON_SECRET>` (1.0's guard — it fails closed in production, lib/services/cron-auth.ts).
 * `run` runs every timed job; 1.0's own addresses keep their jobs (`notification-scheduled`, `notification-digest`, `accounting-sync`) and
 * 2.0's add `repeats` and `feeds` (lib/services/sweep.ts `CRON_ROUTES`). Answers what each job did — counts only, never a record's words.
 */
export const dynamic = 'force-dynamic'

async function handle(req: NextRequest, job: string) {
  if (!isAuthorizedCron(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const route = Object.hasOwn(CRON_ROUTES, job) ? CRON_ROUTES[job] : undefined
  if (!route) return NextResponse.json({ error: 'No such job', jobs: Object.keys(CRON_ROUTES) }, { status: 404 })
  const report = await runJobs(route.jobs)
  return NextResponse.json({ ok: true, job, ...report }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function GET(req: NextRequest, { params }: { params: Promise<{ job: string }> }) { return handle(req, (await params).job) }
export async function POST(req: NextRequest, { params }: { params: Promise<{ job: string }> }) { return handle(req, (await params).job) }
