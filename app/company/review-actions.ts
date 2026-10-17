'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { BRAND_KEY, parseBrandSetting } from '@/lib/templates/brand'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/settings/roles'

/**
 * (pending modules S14 — card held:settings-company, "Review Link … 'Ask for a review' sends a WhatsApp with no link"; 1.0's
 * `settings.review_request_link`) What Maison AI's **Ask for a review** reads when it is pressed — on a Won lead's brief and a completed
 * project's: the studio's review link (Company › Profile › Reviews), and whether this member may set it there (Owners and Admins — the
 * Profile's own rule). Read-only; nothing is metered. Read on the press, so a link saved a moment ago is the one the message carries.
 */
export async function studioReviewLink(): Promise<{ link: string | null; mayEdit: boolean }> {
  const [viewer, [row]] = await Promise.all([fetchViewer(), db.select({ value: settings.value }).from(settings).where(eq(settings.key, BRAND_KEY)).limit(1)])
  let link: string | null = null
  if (row) { try { link = parseBrandSetting(JSON.parse(row.value)).details.reviewLink || null } catch { link = null } }
  return { link, mayEdit: runsStudio(viewer.role) }
}
