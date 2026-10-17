import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerHouseholdLinks, leadAssignees, leads } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { worksOn } from '@/lib/projects/policy'
import { mayRunPortal, portalPath, previewSlug } from '@/lib/portal/model'
import { fetchPortalSettings, resolvePortalSlug, savePortalSettings } from '@/lib/portal/queries'
import { portalSeesMoney } from '@/lib/portal/access'
import { startPreview } from '@/lib/portal/session'

/**
 * (Projects round 4a, Q-44 · board 8 · board 9) "See it as the client" and Company › Client portal's page in its phone frame: a studio member
 * opens the real portal on a real client, read-only — a preview for an hour in this browser. Nothing it opens stamps the client's links;
 * nothing it presses saves. Opened in a new tab from a plain link, so it opens on the press. `?test=1` (Company › Client portal) also ticks
 * the set-up checklist's "Try it yourself" — once, by an Owner or an Admin.
 *
 * (fix-G) Who may: whoever works on the client's lead — the Client access panel's own rule (G-01); a member who may not see the project's
 * money previews it with Money withheld. The preview rides in its own address (`/my/<slug>~<id>`, G-03), writes no client record (G-33), and
 * `&frame=1` is the set-up page's frame — no studio strip, the paused notice while paused (G-17).
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const url = new URL(req.url)
  const leadId = url.searchParams.get('client') ?? ''
  const where = await resolvePortalSlug(slug)
  if (!where) return new Response('Not found', { status: 404 })
  const viewer = await fetchViewer()
  const [l] = leadId ? await db.select({ id: leads.id }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).limit(1) : []
  if (!l || !(await canOpenLead(viewer, l.id))) return new Response('Not found', { status: 404 })
  const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, l.id))).map((t) => t.id)
  if (!worksOn(viewer, team)) return new Response('Only the client’s team, Owners and Admins see the portal as the client', { status: 403 })
  /* (Projects round 9) `&person=` — See it as someone from the client's household: the same home, under their name */
  const person = url.searchParams.get('person')
  const [hh] = person ? await db.select({ id: homeownerHouseholdLinks.id }).from(homeownerHouseholdLinks)
    .where(and(eq(homeownerHouseholdLinks.id, person), eq(homeownerHouseholdLinks.leadId, l.id), isNull(homeownerHouseholdLinks.removedAt))).limit(1) : []
  if (person && !hh) return new Response('Not found', { status: 404 })
  const id = await startPreview({ leadId: l.id, personId: hh?.id ?? null, memberId: viewer.id, frame: url.searchParams.get('frame') === '1', money: await portalSeesMoney(l.id, viewer) })
  if (url.searchParams.get('test') === '1' && mayRunPortal(viewer.role)) {
    const s = await fetchPortalSettings()
    if (!s.testedAt) await savePortalSettings({ ...s, testedAt: Date.now() })
  }
  return Response.redirect(new URL(portalPath(previewSlug(where.current, id)), req.url), 303)
}
