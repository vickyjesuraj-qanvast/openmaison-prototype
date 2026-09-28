import 'server-only'
import { eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings, subscriptions } from '@/lib/db/schema'
import { fetchStudio } from '@/lib/settings/queries'
import { BRAND_KEY, parseBrandSetting } from '@/lib/templates/brand'
import { fetchCreditSummary } from './queries'
import type { CreditSummary } from './model'

export type CreditsChrome = {
  summary: CreditSummary
  /** (Q-15) The one tax line under a price — from the studio's own GST status (Settings › Studio's GST card, Company › Profile). */
  gstLine: string
  /** What the demo checkout fills in for the studio (E-19): its registered name, UEN and GST number — nobody types them. */
  billing: { name: string; uen: string; gstReg: string; address: string; email: string; gstRegistered: boolean }
  /** (Q-16) The 14-day Pro trial is still the studio's to take — one per studio (the website's rule; the server checks it again). */
  trialAvailable: boolean
}

/** (REG-701) What every credits surface needs, read once per render of the shell or an editor. */
export async function fetchCreditsChrome(): Promise<CreditsChrome> {
  const [summary, studio, [brandRow], trials] = await Promise.all([fetchCreditSummary(), fetchStudio(), db.select().from(settings).where(eq(settings.key, BRAND_KEY)),
    db.select({ id: subscriptions.id }).from(subscriptions).where(isNotNull(subscriptions.trialEndsAt)).limit(1)])
  let details = parseBrandSetting(null).details
  try { if (brandRow) details = parseBrandSetting(JSON.parse(brandRow.value)).details } catch { /* the default details */ }
  const gstRegistered = studio.gstRegistered !== false
  const gstLine = gstRegistered && details.gstReg ? `your GST number ${details.gstReg} goes on the invoice` : 'GST is added at checkout where it applies'
  return { summary, gstLine, billing: { name: details.name || studio.name, uen: details.uen, gstReg: details.gstReg, address: details.address, email: details.email, gstRegistered }, trialAvailable: trials.length === 0 }
}
