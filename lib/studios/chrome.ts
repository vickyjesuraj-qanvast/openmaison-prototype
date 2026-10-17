import 'server-only'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, settings } from '@/lib/db/schema'
import { BRAND_KEY } from '@/lib/templates/brand'
import { parseStudio, shortStudioName } from '@/lib/settings/types'
import { displayDate } from '@/lib/format'
import { DEMO_CHROME, DEMO_KEY, ORIGIN_KEY, parseOrigin, type StudioChrome } from './model'
import { openStudioKey, prototypeStudios } from './registry'

/**
 * (pending modules S31) The studio block's words for the studio this prototype has open (the app shell reads it once a page): the demo keeps
 * the mock's block (REG-667 — "Demo Studio", "Dane Bruce Lee", its avatar), named from its record; a studio started here shows its own name,
 * its Owner and its logo (its initial until it has one). The Studios group lists every studio on this prototype once one was started.
 */
export async function fetchStudioChrome(): Promise<StudioChrome> {
  const [rows, list] = await Promise.all([
    db.select({ key: settings.key, value: settings.value }).from(settings).where(sql`${settings.key} in ('studio', ${ORIGIN_KEY}, ${BRAND_KEY})`),
    prototypeStudios().catch(() => []),
  ])
  const read = (k: string): unknown => { const r = rows.find((x) => x.key === k); if (!r) return null; try { return JSON.parse(r.value) } catch { return null } }
  const name = shortStudioName(parseStudio(read('studio')).name)
  const origin = parseOrigin(read(ORIGIN_KEY))
  const open = openStudioKey()
  const studios = list.map((s) => ({
    key: s.key, name: s.name, open: s.key === open,
    line: s.key === DEMO_KEY ? 'The demo’s studio' : [s.origin ? `Started ${displayDate(new Date(s.origin.madeAt))}` : 'Started here', s.owner].filter(Boolean).join(' · '),
  }))
  if (!origin) return { ...DEMO_CHROME, name, studios }
  const [owner] = await db.select({ name: members.name }).from(members).where(eq(members.id, origin.ownerId)).limit(1)
  const logo = (read(BRAND_KEY) as { kit?: { logo?: unknown } } | null)?.kit?.logo
  return { name, owner: owner?.name ?? name, baseId: origin.ownerId, mark: typeof logo === 'string' && logo ? logo : null, solo: origin.kind === 'solo', studios }
}
