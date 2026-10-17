import 'server-only'
import { mkdir } from 'node:fs/promises'
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient, type InStatement } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { demoDatabase, schema } from '@/lib/db'
import { BUSY_WAIT_MS, guardLocalFile } from '@/lib/db/local-file'
import { creditLedger, members, plans, settings, studioCreditBalances, subscriptions } from '@/lib/db/schema'
import { MEMBER_TINTS } from '@/lib/company/member-rules'
import { PLAN_ROWS, allowanceFor, planRow } from '@/lib/credits/plans'
import { addMonths } from '@/lib/credits/ledger'
import { BRAND_KEY } from '@/lib/templates/brand'
import { DEFAULT_GST_PCT, type Studio } from '@/lib/settings/types'
import { MAX_PROTOTYPE_STUDIOS, ORIGIN_KEY, SIGN_UP, emptyBrandSetting, studioSlug, type NewStudio, type StudioOrigin } from './model'
import { dropStudioFile, madeStudioKeys, migrateStudio, studioUrlOf, studiosHome } from './registry'
import { serviceSlot } from '@/lib/services/slots'   // (pending modules S34)

/*
 * (pending modules S31 — her "build all of them" 2026-10-11; card onboarding:studio-sign-up; 1.0's api/admin/studios POST + seedDefaultStudioTaxonomies,
 * the Qanvast line's autoProvisionUser) MAKING A STUDIO AND ITS OWNER IN ONE GO — the one seam for the developers' tenancy.
 *
 * 1.0 made the owner's account, the studio, its membership (owner · admin · id) and the starter lists in one route, undoing each step when a
 * later one failed. 2.0 does the same job through `createStudio`: sign-up (and a first sign-in through Qanvast, the developers' provider) asks
 * the provisioner for a studio and gets its Owner back. THE PROTOTYPE'S PROVISIONER makes a database of its own beside the demo's (lib/studios/
 * registry.ts), migrated to this build's schema, and writes the studio's first records into it in one go — if anything fails the file goes, so
 * there is never half a studio; the demo's database is only read (OpenMaison's feeds, which every studio reads). PRODUCTION: the developers'
 * `setStudioProvisioner` makes the tenant and these same records in it.
 */

export type MadeStudio = { key: string; ownerId: string }
export type StudioProvisioner = {
  name: string
  create(s: NewStudio, o: { via: StudioOrigin['via']; at: number }): Promise<MadeStudio | { error: string }>
}

/** OpenMaison's own feeds — the studio's copy of each, as the feed writes it (Marketplace, Market Insights, Qanvast's Hangouts); parents first. */
const FEED_TABLES = ['marketplace_categories', 'marketplace_brands', 'marketplace_deals', 'marketplace_products', 'marketplace_banners', 'market_insights', 'hangout_events', 'hangout_shifts'] as const

/** The feeds' rows as the demo's copy holds them — inserted as they are (`INSERT OR IGNORE`, the columns both databases share). */
async function feedCopies(): Promise<InStatement[]> {
  const out: InStatement[] = []
  for (const t of FEED_TABLES) {
    const r = await demoDatabase.client.execute(`SELECT * FROM ${t}`)
    for (const row of r.rows) {
      const cols = r.columns
      out.push({ sql: `INSERT OR IGNORE INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, args: cols.map((c) => (row[c] ?? null) as string | number | null) })
    }
  }
  return out
}

const sec = (ms: number) => new Date(Math.floor(ms / 1000) * 1000)

const PROTOTYPE: StudioProvisioner = {
  name: 'prototype',
  async create(s, o) {
    const home = studiosHome()
    if (!home) return { error: SIGN_UP.noHome }
    if ((await madeStudioKeys()).length >= MAX_PROTOTYPE_STUDIOS) return { error: SIGN_UP.full }
    const key = `${studioSlug(s.studioName)}-${randomBytes(4).toString('hex')}`
    await mkdir(home, { recursive: true })
    const url = studioUrlOf(home, key)
    const raw = guardLocalFile(createClient({ url, timeout: BUSY_WAIT_MS }), url)
    try {
      await migrateStudio(raw, key)
      const d = drizzle(raw, { schema })
      const at = o.at, ownerId = randomUUID(), subId = randomUUID()
      const free = planRow('free'), welcome = free.signupCreditGrant, month = allowanceFor(free, 1)
      const studio: Studio = { name: s.studioName, gstRegistered: true, phone: '', gstPct: DEFAULT_GST_PCT }
      const origin: StudioOrigin = { madeAt: at, ownerId, kind: s.kind, via: o.via }
      await d.batch([
        /* the Owner (1.0: role owner, tags owner · admin · id) — owed the first-visit welcome (S08); the studio's first, so no invitation (S09) */
        d.insert(members).values({ id: ownerId, name: s.ownerName, role: 'Owner', color: MEMBER_TINTS[0]!, standingYou: true, email: s.email, phone: s.phone, isActive: true, managerId: null, acceptingLeads: true, welcomeDue: true }),
        d.insert(settings).values([
          { key: 'studio', value: JSON.stringify(studio), updatedAt: sec(at) },
          { key: BRAND_KEY, value: JSON.stringify(emptyBrandSetting(s.studioName)), updatedAt: sec(at) },
          { key: ORIGIN_KEY, value: JSON.stringify(origin), updatedAt: sec(at) },
        ]),
        /* the plans (1.0's rows) and Free from today: 1.0's welcome AI credits with the top-ups (they never expire, B-08), then 30 a month (S19) */
        d.insert(plans).values(PLAN_ROWS.map((p) => ({ id: p.id, name: p.name, monthlyPrice: p.monthlyPrice, yearlyPrice: p.yearlyPrice, maxMembers: p.maxMembers, creditAllowance: p.creditAllowance, signupCreditGrant: p.signupCreditGrant, featureFlags: JSON.stringify(p.featureFlags), minSeats: p.minSeats, extraSeatPriceCents: p.extraSeatPriceCents, isContactSales: p.isContactSales, trialPeriodDays: p.trialPeriodDays, isHighlighted: p.isHighlighted, isActive: true }))),
        d.insert(subscriptions).values({ id: subId, planId: 'free', billingCycle: 'monthly', status: 'active', seats: 1, currentPeriodStart: sec(at), currentPeriodEnd: sec(addMonths(at, 1)), trialEndsAt: null, cancelAtPeriodEnd: false, cancelledAt: null, graceUntil: null, createdBy: ownerId, createdAt: sec(at), updatedAt: sec(at) }),
        d.insert(studioCreditBalances).values({ id: 'studio', planCredits: month, topupCredits: welcome, periodStart: sec(at), periodEnd: sec(addMonths(at, 1)), enforcementEnabled: true, enforcementStartsAt: null, updatedAt: sec(at) }),
        d.insert(creditLedger).values([
          { id: randomUUID(), memberId: null, actionKey: 'welcome', credits: welcome, balanceAfter: welcome, reason: 'grant', refId: 'welcome', createdAt: sec(at) },
          { id: randomUUID(), memberId: ownerId, actionKey: 'plan_change', credits: month, balanceAfter: welcome + month, reason: 'refresh', refId: `plan:${subId}`, createdAt: sec(at) },
        ]),
      ])
      const feeds = await feedCopies()
      if (feeds.length) await raw.batch(feeds, 'write')
      return { key, ownerId }
    } catch {
      try { raw.close() } catch { /* closing a half-made file */ }
      await dropStudioFile(home, key)
      return { error: SIGN_UP.couldnt }
    } finally {
      try { raw.close() } catch { /* the registry opens its own client */ }
    }
  },
}

/* (pending modules S34) the slot (lib/services/slots.ts) — on globalThis, so the tenancy set at start-up is the one every bundle asks */
const slot = serviceSlot<StudioProvisioner>('studios', PROTOTYPE)
/** Make a studio and its Owner — sign-up's and the Qanvast line's one call. */
export const createStudio = (s: NewStudio, o: { via: StudioOrigin['via']; at?: number }): Promise<MadeStudio | { error: string }> => slot.use().create(s, { via: o.via, at: o.at ?? Date.now() })
/** The developers' call at start-up (beside `setSignInProvider`; lib/services/install.ts): their tenancy makes the studio. */
export function setStudioProvisioner(p: StudioProvisioner): void { slot.set(p) }
/** Whether the prototype's own database-per-studio still makes them. */
export const studiosAreStandIn = (): boolean => slot.standIn()

/** (1.0's `platform_config.signup_paused`, set in Platform admin › Settings — excluded by her) Whether sign-ups are paused for the whole
    platform: the environment's switch until the developers' Platform side keeps it (`OPENMAISON_SIGN_UPS_PAUSED=1`). Paused, signing up and
    sign-in's door say 1.0's "Contact support for account setup". */
export const signUpsPaused = (): boolean => process.env.OPENMAISON_SIGN_UPS_PAUSED === '1'
