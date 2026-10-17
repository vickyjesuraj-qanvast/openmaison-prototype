'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { LEAD_CAPTURE_KEY, fetchLeadCapture, fetchStudio } from '@/lib/settings/queries'
import { parseLeadCapture, type LeadCapture, type Webhook, type WebhookPlatform, WEBHOOK_PLATFORMS } from '@/lib/settings/types'
import { randomBytes, randomUUID } from 'node:crypto'
import { captureLead, recordWebhookArrival, type Arrival } from '@/lib/leads/capture'   // (pending modules S34) shared with the real webhook route (app/api/webhooks/leads/[token])

/* (REG-602) Lead capture: the website form's email intake and Meta Lead Ads. The platform receives the email or the form
   submission; the prototype records the arrival the way the platform would — as a one-row import that lands in the listing
   (a known phone goes to Review imported leads instead), source Website or Meta Ads, the primary band on the new row. */

/** (REG-646, settings parity Q-07 · E-85) The page's own writes — Meta's connection and forms, the monitored email platforms — for Owners
    and Admins only; the webhooks, their log and the sync counts are written by their own guarded actions, never through this door. */
export async function setLeadCapture(patch: { meta?: Partial<LeadCapture['meta']>; email?: { platforms?: string[]; custom?: string[] } }): Promise<LeadCapture> {
  await guard()
  const email = patch.email ? { ...(patch.email.platforms ? { platforms: patch.email.platforms } : {}), ...(patch.email.custom ? { custom: patch.email.custom } : {}) } : undefined
  return writeLeadCapture({ ...(patch.meta ? { meta: patch.meta as LeadCapture['meta'] } : {}), ...(email ? { email: email as LeadCapture['email'] } : {}) })
}
/** (REG-647) A webhook's label is a lead source the studio lists — added (live) when it is not one yet, so its leads never carry an off-list source. */
async function ensureSource(name: string): Promise<void> {
  const { fetchLeadSources, LEAD_SOURCES_KEY } = await import('@/lib/settings/queries')
  const { sources } = await fetchLeadSources()
  if (sources.some((s) => s.name.toLowerCase() === name.toLowerCase())) return
  const next = [...sources.filter((s) => s.name !== 'Others'), { name: name.slice(0, 40), retired: false }, ...sources.filter((s) => s.name === 'Others')].slice(0, 40)
  await db.insert(settings).values({ key: LEAD_SOURCES_KEY, value: JSON.stringify(next), updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next), updatedAt: new Date() } })
  revalidatePath('/leads', 'layout')
}
async function writeLeadCapture(patch: Partial<LeadCapture>): Promise<LeadCapture> {
  const cur = await fetchLeadCapture()
  const next = parseLeadCapture({ ...cur, ...patch, meta: { ...cur.meta, ...(patch.meta ?? {}) }, email: { ...cur.email, ...(patch.email ?? {}) } })
  await db.insert(settings).values({ key: LEAD_CAPTURE_KEY, value: JSON.stringify(next), updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next), updatedAt: new Date() } })
  revalidatePath('/settings'); revalidatePath('/company/integrations')
  return next
}

/** The demo's "Simulate an incoming lead": a plausible enquiry, different each press (invented demo data, marked so on the card). */
const SAMPLE_ARRIVALS: Arrival[] = [
  { name: 'Nadia Rahim', phone: '91180234', email: 'nadia.rahim@example.com', propertyType: 'HDB 4-Room', address: 'Blk 512 Bedok North Ave 2', budget: '48000', message: 'Resale flat, keys in November — full renovation, kitchen and two bathrooms.' },
  { name: 'Wei Jie Tan', phone: '96633127', email: 'weijie.tan@example.com', propertyType: 'Condo 3-bedder', address: 'The Tapestry, Tampines', budget: '85000', message: 'New launch, looking for a modern Japandi look. Free this weekend to talk.' },
  { name: 'Priyanka Menon', phone: '83319902', email: 'priyanka.m@example.com', propertyType: 'BTO 5-Room', address: 'Punggol Point Crown', budget: '62000', message: 'BTO keys collected. Need carpentry and flooring first, the rest later.' },
  { name: 'Marcus Ong', phone: '97720186', email: 'marcus.ong@example.com', propertyType: 'Executive Condo', address: 'Parc Canberra', budget: '110000', message: 'Whole-unit renovation, family of four, timeline three months.' },
]
export async function simulateArrival(channel: 'email' | 'meta', formName?: string): Promise<{ name: string; approved: number; flagged: number; importId: string }> {
  await guard()   // (REG-646) the demo's triggers are the studio runners', as the pages offer them
  const pick = SAMPLE_ARRIVALS[Math.floor(Math.random() * SAMPLE_ARRIVALS.length)]!
  const r = await captureLead(channel, pick, formName)
  return { name: pick.name, ...r }
}

/* ── (REG-612, parity Q-36 · I-07) Webhook endpoints — 1.0's Lead Webhooks tab as a stand-in: a URL (and a signing key for Google, shown
   once) per endpoint, counters, a log; "Simulate a POST" plays an arrival through captureLead so the listing shows what a real POST would. */
const hex = (n: number) => randomBytes(n).toString('hex')
/* (S44O — call C6) lead capture is the lead set-up — Owners, Admins and Marketing (`runsLeadSetup`; the page reads the same rule) */
const guard = async () => { const { fetchViewer } = await import('@/lib/leads/visibility'); const { runsLeadSetup } = await import('@/lib/settings/roles'); const v = await fetchViewer(); if (!runsLeadSetup(v.role)) throw new Error('owners, admins and marketing only') }

export async function createWebhook(input: { platform: WebhookPlatform; label?: string; notes?: string }): Promise<{ webhook: Webhook; key: string | null }> {
  await guard()
  const cur = await fetchLeadCapture()
  const platform = WEBHOOK_PLATFORMS.find((p) => p.key === input.platform) ?? WEBHOOK_PLATFORMS[0]!
  const key = platform.key === 'google_ads' ? hex(24) : null
  const webhook: Webhook = { id: randomUUID(), platform: platform.key, label: (input.label ?? '').trim().slice(0, 80) || platform.defaultLabel, notes: (input.notes ?? '').trim().slice(0, 200), token: hex(24), key, received: 0, created: 0, duplicates: 0, lastAt: null, active: true, createdAt: Date.now() }
  await writeLeadCapture({ webhooks: [webhook, ...cur.webhooks] })
  await ensureSource(webhook.label)   // (REG-647, settings parity Q-12) its leads carry the label as their source — one of the studio's own
  return { webhook, key }
}
export async function regenerateWebhook(id: string): Promise<Webhook | null> {
  await guard()
  const cur = await fetchLeadCapture()
  let out: Webhook | null = null
  const webhooks = cur.webhooks.map((w) => (w.id === id && w.active ? (out = { ...w, token: hex(24), key: w.platform === 'google_ads' ? hex(24) : null }) : w))
  await writeLeadCapture({ webhooks })
  return out
}
export async function revokeWebhook(id: string): Promise<void> {
  await guard()
  const cur = await fetchLeadCapture()
  await writeLeadCapture({ webhooks: cur.webhooks.map((w) => (w.id === id ? { ...w, active: false } : w)) })
}
/** The demo's POST: a sample arrival through the endpoint — the counters and the log move as the platform's would. */
export async function simulateWebhook(id: string): Promise<{ name: string; outcome: 'created' | 'duplicate' }> {
  await guard()
  const cur = await fetchLeadCapture()
  const w = cur.webhooks.find((x) => x.id === id && x.active)
  if (!w) throw new Error('no such webhook')
  const pick = SAMPLE_ARRIVALS[Math.floor(Math.random() * SAMPLE_ARRIVALS.length)]!
  const r = await captureLead('webhook', pick, undefined, w.label)
  const outcome: 'created' | 'duplicate' = r.flagged > 0 ? 'duplicate' : 'created'
  await recordWebhookArrival(id, outcome, pick.name)   // (pending modules S34) the real route's own record
  return { name: pick.name, outcome }
}

/* ── (REG-612, parity Q-36 · I-10) Email lead sources — 1.0's Gmail ingestion as a stand-in: connect a studio inbox, pick the platforms
   to monitor, "Sync now" plays one enquiry per press as the cron would and keeps the last sync's counts. */
export async function connectGmail(): Promise<LeadCapture> {
  await guard()
  const studio = await fetchStudio()
  const slug = studio.name.toLowerCase().replace(/pte\.? ltd\.?/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'studio'
  return writeLeadCapture({ email: { connected: true, address: `leads@${slug}.sg`, lastSyncAt: null } as Partial<LeadCapture['email']> as LeadCapture['email'] })
}
export async function disconnectGmail(): Promise<LeadCapture> {
  await guard()
  return writeLeadCapture({ email: { connected: false } as Partial<LeadCapture['email']> as LeadCapture['email'] })
}
export async function setEmailPlatforms(platforms: string[], custom: string[]): Promise<LeadCapture> {
  await guard()
  return writeLeadCapture({ email: { platforms, custom } as Partial<LeadCapture['email']> as LeadCapture['email'] })
}
export async function syncGmail(): Promise<{ name: string; platform: string; outcome: 'created' | 'duplicate' }> {
  await guard()
  const cur = await fetchLeadCapture()
  if (!cur.email.connected) throw new Error('Gmail is not connected')
  const platforms = [...cur.email.platforms, ...cur.email.custom]
  if (!platforms.length) throw new Error('no platforms to monitor')
  const platform = platforms[Math.floor(Math.random() * platforms.length)]!
  const pick = SAMPLE_ARRIVALS[Math.floor(Math.random() * SAMPLE_ARRIVALS.length)]!
  const r = await captureLead('gmail', pick, undefined, platform)
  const outcome: 'created' | 'duplicate' = r.flagged > 0 ? 'duplicate' : 'created'
  const s = cur.email.stats
  await writeLeadCapture({ email: { ...cur.email, lastSyncAt: Date.now(), stats: { found: s.found + 1, created: s.created + (outcome === 'created' ? 1 : 0), duplicates: s.duplicates + (outcome === 'duplicate' ? 1 : 0), failed: s.failed } } })
  return { name: pick.name, platform, outcome }
}
