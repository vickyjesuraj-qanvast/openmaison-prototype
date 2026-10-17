import 'server-only'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { LEAD_CAPTURE_KEY, fetchLeadCapture, fetchStudio } from '@/lib/settings/queries'
import { parseLeadCapture, platformSource, type LeadCapture } from '@/lib/settings/types'
import { importLeads } from '@/app/leads/actions'
import { revalidateLeadListings } from '@/lib/leads/queries'

/* (REG-602 · REG-612; moved here from app/leads/capture-actions.ts by pending modules S34 — a Server Action file's every export is a public
   endpoint, and the real webhook route needs this one too) An incoming lead from the website form (`email`), a Meta form (`meta`), a webhook
   POST (`webhook`) or an ingested platform email (`gmail`): recorded as a one-row import and added to the listing — a known phone waits in
   Review imported leads instead. `via` = the webhook's label or the sender domain. */

export type Arrival = { name: string; phone: string; email?: string; propertyType?: string; address?: string; budget?: string; message?: string }

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
  /* (pending modules S34 — a bug fix found by the webhook route's probe) a known phone is caught on the way in (`duplicates`, the row waits in
     Review imported leads) as well as on approval (`flagged`) — both are "waiting in Review"; before, a repeated arrival read as a new lead */
  return { importId: r.importId, approved: r.approved, flagged: r.flagged + r.duplicates }
}

/** A webhook's arrival on its counters and the Integrations log (the 50 latest) — the simulated POST's and a real one's alike. */
export async function recordWebhookArrival(webhookId: string, outcome: 'created' | 'duplicate', name: string, at = Date.now()): Promise<void> {
  const cur = await fetchLeadCapture()
  const next: LeadCapture = parseLeadCapture({
    ...cur,
    webhooks: cur.webhooks.map((x) => (x.id === webhookId ? { ...x, received: x.received + 1, created: x.created + (outcome === 'created' ? 1 : 0), duplicates: x.duplicates + (outcome === 'duplicate' ? 1 : 0), lastAt: at } : x)),
    webhookLog: [{ at, webhookId, outcome, name }, ...cur.webhookLog].slice(0, 50),
  })
  await db.insert(settings).values({ key: LEAD_CAPTURE_KEY, value: JSON.stringify(next), updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(next), updatedAt: new Date() } })
  revalidatePath('/company/integrations')
}
