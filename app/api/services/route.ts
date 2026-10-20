import { NextResponse, type NextRequest } from 'next/server'
import { isAuthorizedCron } from '@/lib/services/cron-auth'
import { serviceStates, serviceWarnings } from '@/lib/services/install'
import { SERVICES } from '@/lib/services/registry'

/*
 * (pending modules S34 — the card's "their admin", for the developers: Platform admin is out of this build by his word, so this is the
 * deployment's own report, not a screen) GET /api/services with `Authorization: Bearer <CRON_SECRET>` (the scheduler's secret, the same
 * guard, fails closed in production): every slot — stand-in or the adapter plugged in — which of 1.0's env names this server holds, the
 * warnings, and every seam of the registry with its one call. Names and states only — never a key's value.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    slots: serviceStates(),
    warnings: serviceWarnings(),
    seams: SERVICES.map((s) => ({ key: s.key, name: s.name, kind: s.kind, slot: s.slot ?? null, swap: s.swap.call, file: s.swap.file, env: s.env })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
