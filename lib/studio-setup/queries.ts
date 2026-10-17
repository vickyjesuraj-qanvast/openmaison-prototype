import 'server-only'
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, members, priceBookItems, quoteTemplates, settings, studioInvitations } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { BRAND_KEY, DEFAULT_BRAND_SETTING, parseBrandSetting } from '@/lib/templates/brand'
import { fetchLeadCapture, fetchStudio } from '@/lib/settings/queries'
import { runsStudio } from '@/lib/settings/roles'
import { shortStudioName } from '@/lib/settings/types'
import { ORIGIN_KEY, parseOrigin } from '@/lib/studios/model'
import { planAllowsNow } from '@/lib/credits/plan-gate'
import { EMPTY_SETUP_RECORD, SETUP_KEY, parseSetupRecord, setupRows, setupShows, welcomeFor, type SetupFacts, type SetupRecord, type StudioSetupData, type Welcome } from './model'

/**
 * (pending modules S08) The set-up list's facts, read from the records each page keeps — the brand kit's logo and the studio's details and
 * bank (settings `brand`, the studio's phone from `studio`), active members, published quote templates, live Price book items, the ways leads
 * come in (settings `lead_capture`) — and the list's own record (`studio_setup`). The welcome's one read, for the app shell, is here too.
 */

export async function fetchSetupRecord(): Promise<SetupRecord> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, SETUP_KEY)).limit(1)
  if (!row) return EMPTY_SETUP_RECORD
  try { return parseSetupRecord(JSON.parse(row.value)) } catch { return EMPTY_SETUP_RECORD }
}

export async function fetchSetupFacts(): Promise<SetupFacts> {
  const [brandRow, studio, capture, team, templates, book, originRow, templatesOpen] = await Promise.all([
    db.select({ value: settings.value }).from(settings).where(eq(settings.key, BRAND_KEY)).limit(1),
    fetchStudio(),
    fetchLeadCapture(),
    db.select({ n: sql<number>`count(*)` }).from(members).where(eq(members.isActive, true)),
    db.select({ name: quoteTemplates.name, isDefault: quoteTemplates.isDefault }).from(quoteTemplates).where(and(isNull(quoteTemplates.deletedAt), eq(quoteTemplates.status, 'published'))),
    db.select({ n: sql<number>`count(*)` }).from(priceBookItems).where(and(isNull(priceBookItems.deletedAt), eq(priceBookItems.status, 'live'))),
    db.select({ value: settings.value }).from(settings).where(eq(settings.key, ORIGIN_KEY)).limit(1),   // (pending modules S31) a studio of one
    planAllowsNow('template_editor'),   // (S42 audit A-01) Free keeps its own templates for Pro
  ])
  let solo = false
  if (originRow[0]) { try { solo = parseOrigin(JSON.parse(originRow[0].value))?.kind === 'solo' } catch { solo = false } }
  let brand = DEFAULT_BRAND_SETTING
  if (brandRow[0]) { try { brand = parseBrandSetting(JSON.parse(brandRow[0].value)) } catch { brand = DEFAULT_BRAND_SETTING } }
  const d = brand.details
  const own = d.entities[0]   // the studio's own entity — the one every document is issued under unless a quote names another
  return {
    details: { address: d.address, uen: d.uen, phone: studio.phone || d.phone, email: d.email },   // the phone as fetchBrand prints it
    logo: !!brand.kit.logo,
    bank: { bankName: own?.bankName ?? '', accountNo: own?.accountNo ?? '', payNow: own?.payNow ?? '' },
    members: Number(team[0]?.n ?? 0),
    templates: { published: templates.length, defaultName: templates.find((t) => t.isDefault)?.name ?? null },
    templatesLocked: !templatesOpen,
    book: Number(book[0]?.n ?? 0),
    capture: { gmail: capture.email.connected, meta: capture.meta.connected, webhooks: capture.webhooks.filter((w) => w.active).length },
    solo,
  }
}

/** Settings › Studio's list for the signed-in member — null when it does not show for them (`setupShows`). */
export async function fetchStudioSetup(o: { asked?: boolean } = {}): Promise<StudioSetupData | null> {
  const [me, record] = await Promise.all([sessionMemberId(), fetchSetupRecord()])
  const [m] = await db.select({ role: members.role }).from(members).where(eq(members.id, me)).limit(1)
  if (!runsStudio(m?.role)) return null
  if (!o.asked && (record.hidden[me] || record.doneAt)) return null   // nothing to read: it shows neither way
  const rows = setupRows(await fetchSetupFacts())
  const open = rows.filter((r) => !r.done).length
  const mode = setupShows({ runs: true, record, me, open, asked: o.asked })
  if (!mode) return null
  const noLeads = mode === 'done' ? Number((await db.select({ n: sql<number>`count(*)` }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false))))[0]?.n ?? 0) === 0 : false
  return { mode, rows, done: rows.length - open, asked: !!o.asked, hidden: !!record.hidden[me], finished: !!record.doneAt, firstSeen: mode === 'open' && !record.seenOpenAt, noLeads }
}

/** (the ghosts' seed · the welcome) How Settings › Studio opens the list for `viewer` by itself — the same rule, read cheaply when it is
    finished or hidden. */
export async function setupModeFor(viewer: { id: string; role: string }): Promise<'open' | 'done' | null> {
  if (!runsStudio(viewer.role)) return null
  const record = await fetchSetupRecord()
  if (record.hidden[viewer.id] || record.doneAt) return null
  const open = setupRows(await fetchSetupFacts()).filter((r) => !r.done).length
  return setupShows({ runs: true, record, me: viewer.id, open })
}

/** (the app shell) The signed-in member's welcome — only on a visit they are owed one (`members.welcome_due`). An Owner's or an Admin's points
    to the list while it is open for them; everyone else's to their own start (the leads, or Finance for Accounting). */
export async function fetchWelcome(): Promise<Welcome | null> {
  const me = await sessionMemberId()
  const [m] = await db.select({ name: members.name, role: members.role, due: members.welcomeDue }).from(members).where(eq(members.id, me)).limit(1)
  if (!m?.due) return null
  /* (pending modules S09) a member who was invited hears who invited them (1.0's "You've been invited to {studio}") */
  const [studio, setup, [inv]] = await Promise.all([fetchStudio(), setupModeFor({ id: me, role: m.role }),
    db.select({ by: members.name }).from(studioInvitations).innerJoin(members, eq(members.id, studioInvitations.invitedBy))
      .where(and(eq(studioInvitations.memberId, me), ne(studioInvitations.status, 'cancelled'))).orderBy(desc(studioInvitations.createdAt)).limit(1)])
  const solo = (await fetchSetupFacts()).solo === true   // (pending modules S31) a studio of one is told nothing about a team
  /* (S42 audit A-19) a member on no lead yet is told what will come */
  const onLeads = Number((await db.select({ n: sql<number>`count(*)` }).from(leadAssignees).innerJoin(leads, eq(leads.id, leadAssignees.leadId)).where(and(eq(leadAssignees.memberId, me), isNull(leads.deletedAt))))[0]?.n ?? 0)
  return welcomeFor({ name: m.name, role: m.role, studio: shortStudioName(studio.name), setup: setup === 'open', invitedBy: inv?.by ?? null, solo, noLeads: onLeads === 0 })
}
