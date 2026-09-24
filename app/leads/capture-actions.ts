'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { LEAD_CAPTURE_KEY, fetchLeadCapture, fetchStudio } from '@/lib/settings/queries'
import { parseLeadCapture, platformSource, type LeadCapture, type Webhook, type WebhookPlatform, WEBHOOK_PLATFORMS } from '@/lib/settings/types'
import { randomBytes, randomUUID } from 'node:crypto'
import { importLeads } from '@/app/leads/actions'
import { revalidateLeadListings } from '@/lib/leads/queries'

/* (REG-602) Lead capture: the website form's email intake and Meta Lead Ads. The platform receives the email or the form
   submission; the prototype records the arrival the way the platform would — as a one-row import that lands in the listing
   (a known phone goes to Review imported leads instead), source Website or Meta Ads, the primary band on the new row. */

export async function setLeadCapture(patch: Partial<LeadCapture>): Promise<LeadCapture> {
  const cur = await fetchLeadCapture()
  const next = parseLeadCapture({ ...cur, ...patch, meta: { ...cur.meta, ...(patch.meta ?? {}) }, email: { ...cur.email, ...(patch.email ?? {}) } })
  await db.insert(settings).values({ key: LEAD_CAPTURE_KEY, value: JSON.stringify(next), updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next), updatedAt: new Date() } })
  revalidatePath('/settings'); revalidatePath('/company/integrations')
  return next
}

export type Arrival = { name: string; phone: string; email?: string; propertyType?: string; address?: string; budget?: string; message?: string }

/** An incoming lead from the website form (`email`), a Meta form (`meta`), a webhook POST (`webhook`, REG-612) or an ingested
 *  platform email (`gmail`, REG-612): recorded as an import and added to the listing. `via` = the webhook's label or the sender domain. */
export async function captureLead(channel: 'email' | 'meta' | 'webhook' | 'gmail', arrival: Arrival, formName?: string, via?: string): Promise<{ importId: string; approved: number; flagged: number }> {
  const capture = await fetchLeadCapture()
  if (channel === 'meta' && !capture.meta.connected) throw new Error('Meta is not connected')
  if (channel === 'gmail' && !capture.email.connected) throw new Error('Gmail is not connected')
  const studio = await fetchStudio()
  const headers = ['Lead Name', 'Lead Phone Number', 'Lead Email', 'Lead Source', 'Property Type', 'Property Address', 'Estimated Budget (S$)', 'Remarks']
  const source = channel === 'meta' ? 'Meta Ads' : channel === 'webhook' ? (via ?? 'Webhook') : channel === 'gmail' ? platformSource(via ?? '') : 'Website'
  const row = [arrival.name, arrival.phone, arrival.email ?? '', source, arrival.propertyType ?? '', arrival.address ?? '', arrival.budget ?? '', arrival.message ?? '']
  const fileName = channel === 'meta' ? `Meta Lead Ads · ${formName ?? capture.meta.forms.find((f) => f.on)?.name ?? 'form'}` : channel === 'webhook' ? `Webhook · ${via ?? 'Webhook'}` : channel === 'gmail' ? `Email · ${via ?? 'platform'}` : `Website form · ${studio.name}`
  const r = await importLeads({ fileName, headers, mapping: headers, rows: [row], destination: 'listing' })
  revalidateLeadListings()
  return { importId: r.importId, approved: r.approved, flagged: r.flagged }
}

/** The demo's "Simulate an incoming lead": a plausible enquiry, different each press (invented demo data, marked so on the card). */
const SAMPLE_ARRIVALS: Arrival[] = [
  { name: 'Nadia Rahim', phone: '91180234', email: 'nadia.rahim@example.com', propertyType: 'HDB 4-Room', address: 'Blk 512 Bedok North Ave 2', budget: '48000', message: 'Resale flat, keys in November — full renovation, kitchen and two bathrooms.' },
  { name: 'Wei Jie Tan', phone: '96633127', email: 'weijie.tan@example.com', propertyType: 'Condo 3-bedder', address: 'The Tapestry, Tampines', budget: '85000', message: 'New launch, looking for a modern Japandi look. Free this weekend to talk.' },
  { name: 'Priyanka Menon', phone: '83319902', email: 'priyanka.m@example.com', propertyType: 'BTO 5-Room', address: 'Punggol Point Crown', budget: '62000', message: 'BTO keys collected. Need carpentry and flooring first, the rest later.' },
  { name: 'Marcus Ong', phone: '97720186', email: 'marcus.ong@example.com', propertyType: 'Executive Condo', address: 'Parc Canberra', budget: '110000', message: 'Whole-unit renovation, family of four, timeline three months.' },
]
export async function simulateArrival(channel: 'email' | 'meta', formName?: string): Promise<{ name: string; approved: number; flagged: number; importId: string }> {
  const pick = SAMPLE_ARRIVALS[Math.floor(Math.random() * SAMPLE_ARRIVALS.length)]!
  const r = await captureLead(channel, pick, formName)
  return { name: pick.name, ...r }
}

/* ── (REG-612, parity Q-36 · I-07) Webhook endpoints — 1.0's Lead Webhooks tab as a stand-in: a URL (and a signing key for Google, shown
   once) per endpoint, counters, a log; "Simulate a POST" plays an arrival through captureLead so the listing shows what a real POST would. */
const hex = (n: number) => randomBytes(n).toString('hex')
const guard = async () => { const { fetchViewer } = await import('@/lib/leads/visibility'); const { runsStudio } = await import('@/lib/leads/assign-policy'); const v = await fetchViewer(); if (!runsStudio(v.role)) throw new Error('owners and admins only') }

export async function createWebhook(input: { platform: WebhookPlatform; label?: string; notes?: string }): Promise<{ webhook: Webhook; key: string | null }> {
  await guard()
  const cur = await fetchLeadCapture()
  const platform = WEBHOOK_PLATFORMS.find((p) => p.key === input.platform) ?? WEBHOOK_PLATFORMS[0]!
  const key = platform.key === 'google_ads' ? hex(24) : null
  const webhook: Webhook = { id: randomUUID(), platform: platform.key, label: (input.label ?? '').trim().slice(0, 80) || platform.defaultLabel, notes: (input.notes ?? '').trim().slice(0, 200), token: hex(24), key, received: 0, created: 0, duplicates: 0, lastAt: null, active: true, createdAt: Date.now() }
  await setLeadCapture({ webhooks: [webhook, ...cur.webhooks] })
  return { webhook, key }
}
export async function regenerateWebhook(id: string): Promise<Webhook | null> {
  await guard()
  const cur = await fetchLeadCapture()
  let out: Webhook | null = null
  const webhooks = cur.webhooks.map((w) => (w.id === id && w.active ? (out = { ...w, token: hex(24), key: w.platform === 'google_ads' ? hex(24) : null }) : w))
  await setLeadCapture({ webhooks })
  return out
}
export async function revokeWebhook(id: string): Promise<void> {
  await guard()
  const cur = await fetchLeadCapture()
  await setLeadCapture({ webhooks: cur.webhooks.map((w) => (w.id === id ? { ...w, active: false } : w)) })
}
/** The demo's POST: a sample arrival through the endpoint — the counters and the log move as the platform's would. */
export async function simulateWebhook(id: string): Promise<{ name: string; outcome: 'created' | 'duplicate' }> {
  const cur = await fetchLeadCapture()
  const w = cur.webhooks.find((x) => x.id === id && x.active)
  if (!w) throw new Error('no such webhook')
  const pick = SAMPLE_ARRIVALS[Math.floor(Math.random() * SAMPLE_ARRIVALS.length)]!
  const r = await captureLead('webhook', pick, undefined, w.label)
  const outcome: 'created' | 'duplicate' = r.flagged > 0 ? 'duplicate' : 'created'
  const now = Date.now()
  await setLeadCapture({
    webhooks: cur.webhooks.map((x) => (x.id === id ? { ...x, received: x.received + 1, created: x.created + (outcome === 'created' ? 1 : 0), duplicates: x.duplicates + (outcome === 'duplicate' ? 1 : 0), lastAt: now } : x)),
    webhookLog: [{ at: now, webhookId: id, outcome, name: pick.name }, ...cur.webhookLog].slice(0, 50),
  })
  return { name: pick.name, outcome }
}

/* ── (REG-612, parity Q-36 · I-10) Email lead sources — 1.0's Gmail ingestion as a stand-in: connect a studio inbox, pick the platforms
   to monitor, "Sync now" plays one enquiry per press as the cron would and keeps the last sync's counts. */
export async function connectGmail(): Promise<LeadCapture> {
  await guard()
  const studio = await fetchStudio()
  const slug = studio.name.toLowerCase().replace(/pte\.? ltd\.?/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'studio'
  return setLeadCapture({ email: { connected: true, address: `leads@${slug}.sg`, lastSyncAt: null } as Partial<LeadCapture['email']> as LeadCapture['email'] })
}
export async function disconnectGmail(): Promise<LeadCapture> {
  await guard()
  return setLeadCapture({ email: { connected: false } as Partial<LeadCapture['email']> as LeadCapture['email'] })
}
export async function setEmailPlatforms(platforms: string[], custom: string[]): Promise<LeadCapture> {
  await guard()
  return setLeadCapture({ email: { platforms, custom } as Partial<LeadCapture['email']> as LeadCapture['email'] })
}
export async function syncGmail(): Promise<{ name: string; platform: string; outcome: 'created' | 'duplicate' }> {
  const cur = await fetchLeadCapture()
  if (!cur.email.connected) throw new Error('Gmail is not connected')
  const platforms = [...cur.email.platforms, ...cur.email.custom]
  if (!platforms.length) throw new Error('no platforms to monitor')
  const platform = platforms[Math.floor(Math.random() * platforms.length)]!
  const pick = SAMPLE_ARRIVALS[Math.floor(Math.random() * SAMPLE_ARRIVALS.length)]!
  const r = await captureLead('gmail', pick, undefined, platform)
  const outcome: 'created' | 'duplicate' = r.flagged > 0 ? 'duplicate' : 'created'
  const s = cur.email.stats
  await setLeadCapture({ email: { ...cur.email, lastSyncAt: Date.now(), stats: { found: s.found + 1, created: s.created + (outcome === 'created' ? 1 : 0), duplicates: s.duplicates + (outcome === 'duplicate' ? 1 : 0), failed: s.failed } } })
  return { name: pick.name, platform, outcome }
}
