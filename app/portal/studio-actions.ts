'use server'

import { and, eq, inArray, isNull, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { homeownerLeadLinks, leadAssignees, leadFiles, leads, portalAddresses, projectPayments } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { isSgMobile, phoneDigits } from '@/lib/format'
import { dropLeadEvents, logLeadEvent } from '@/lib/leads/events'
import { ensureHomeownerLink } from '@/lib/leads/portal'
import { revalidateLead } from '@/lib/leads/queries'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { worksOn } from '@/lib/projects/policy'
import { fetchClientAccess, type ClientAccessData } from '@/lib/portal/access'
import { PORTAL_ACCESS_RULE, PORTAL_SETUP_RULE, cleanSlug, mayRunPortal, portalPath, slugProblem } from '@/lib/portal/model'
import { currentPortalSlug, fetchPortalSettings, savePortalSettings } from '@/lib/portal/queries'
import { endSessionsWithout } from '@/lib/portal/session'
import { syncRenderShares } from '@/lib/portal/render-files'

/*
 * (Projects round 4a) The studio's side of the portal. Access (invite · resend · withdraw · its Undo) is the client's team's — whoever works
 * on the lead, Owners and Admins (`worksOn`); the set-up (the address, Live / Paused) is the Owners' and Admins' (Q-49). Both checked here,
 * on the server; a refusal answers `{ error: <the rule> }` and the page says it (REG-646). WhatsApp opens on the press in the browser — these
 * record what the press did.
 */

type Refusal = { error: string }

const touchPortal = () => { revalidatePath('/company/portal', 'layout'); revalidatePath('/my', 'layout') }
const touchLead = (leadId: string) => { revalidateLead(leadId); touchPortal() }

/** The lead the viewer may act on for its client's access, or the refusal. */
async function forAccess(leadId: string): Promise<Refusal | { phone: string }> {
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return { error: 'This lead isn’t one you can open' }
  const [l] = await db.select({ phone: leads.phone }).from(leads).where(and(eq(leads.id, leadId), isNull(leads.deletedAt))).limit(1)
  if (!l) return { error: 'This lead was deleted' }
  const team = await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))
  if (!worksOn(viewer, team.map((t) => t.id))) return { error: PORTAL_ACCESS_RULE }
  return { phone: l.phone }
}

/** The Client access panel's data (board 8) — read when the panel opens, wherever it opens (the lead, the project, the listing's row). */
export async function readClientAccess(leadId: string): Promise<ClientAccessData | Refusal> {
  return (await fetchClientAccess(leadId)) ?? { error: 'This lead isn’t one you can open' }
}

/**
 * Invite / Resend (Q-41 · Q-46): the client's number may now open the portal. A withdrawn client is given access again. Every send is an
 * `invite_sent` line in Activity (as before, REG-613); the link keeps who sent it last and when.
 */
export async function inviteClient(leadId: string): Promise<Refusal | { again: boolean; slug: string }> {
  const ok = await forAccess(leadId)
  if ('error' in ok) return ok
  /* (fix-G, G-05) the portal signs in with a code sent by SMS: a mobile number, 8 or 9 first — a landline can never take it */
  if (!isSgMobile(phoneDigits(ok.phone))) return { error: 'The client’s phone number isn’t a mobile number — fix it on the lead first' }
  const link = await ensureHomeownerLink(leadId)
  const again = !!link.invitedAt && !link.withdrawnAt
  /* (fix-G, G-08) the first invite stays as it was ("Invited 8 Aug by Germaine"); a resend, or access given back, is its own line
     (`invite_sent`), which the panel reads as "sent again" */
  await db.update(homeownerLeadLinks).set({ invitedAt: link.invitedAt ?? new Date(), invitedBy: link.invitedAt ? link.invitedBy : await sessionMemberId(), withdrawnAt: null, withdrawnBy: null }).where(eq(homeownerLeadLinks.id, link.id))
  await logLeadEvent(db, leadId, 'invite_sent')
  touchLead(leadId)
  return { again, slug: await currentPortalSlug() }
}

/** Withdraw access: the number no longer opens the portal and any session on it ends at once. Answers the event so Undo can take its line away. */
export async function withdrawAccess(leadId: string): Promise<Refusal | { eventId: string }> {
  const ok = await forAccess(leadId)
  if ('error' in ok) return ok
  const [link] = await db.select().from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1)
  if (!link?.invitedAt || link.withdrawnAt) return { error: 'This client has no access to withdraw' }
  await db.update(homeownerLeadLinks).set({ withdrawnAt: new Date(), withdrawnBy: await sessionMemberId() }).where(eq(homeownerLeadLinks.id, link.id))
  const eventId = await logLeadEvent(db, leadId, 'portal_withdrawn')
  await endSessionsWithout(link.homeownerId)
  touchLead(leadId)
  return { eventId }
}

/** Withdraw's Undo: the access is back as it was, and the withdrawal's Activity line goes (the undoStageMove way). */
export async function undoWithdraw(leadId: string, eventId: string): Promise<Refusal | { ok: true }> {
  const ok = await forAccess(leadId)
  if ('error' in ok) return ok
  await db.update(homeownerLeadLinks).set({ withdrawnAt: null, withdrawnBy: null }).where(eq(homeownerLeadLinks.leadId, leadId))
  await dropLeadEvents([eventId])
  touchLead(leadId)
  return { ok: true }
}

/**
 * Shown to client (the lead's Files): the portal's Files lists only files marked so. Folders are left as they are (a folder is not a file
 * the client opens); a trashed file is never shown. One Activity line for the change. (pending modules S02 — 1.0 H-82) A render from the
 * AI Visualizer goes onto the client's Designs too, and comes off with Stop showing (lib/portal/render-files.ts); `designs` = how many of
 * the changed files are on Designs now, for the snackbar to say so.
 */
export async function setFilesShown(leadId: string, fileIds: string[], shown: boolean): Promise<Refusal | { changed: number; designs: number }> {
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, leadId))) return { error: 'This lead isn’t one you can open' }
  if (!fileIds.length) return { changed: 0, designs: 0 }
  const rows = await db.select({ id: leadFiles.id, name: leadFiles.name, shownAt: leadFiles.shownToClientAt }).from(leadFiles)
    .where(and(eq(leadFiles.leadId, leadId), inArray(leadFiles.id, fileIds), ne(leadFiles.kind, 'folder'), isNull(leadFiles.deletedAt)))
  /* (fix-G, G-40) a receipt's entry in Files › Payments is a pointer to the receipt page — the client has the receipt on their Money tab, so
     the stub is never shown as a file (taking one off stays possible, for an entry shown before this rule) */
  const receipts = shown && rows.length ? new Set((await db.select({ id: projectPayments.receiptFileId }).from(projectPayments).where(inArray(projectPayments.receiptFileId, rows.map((r) => r.id)))).map((r) => r.id)) : new Set<string | null>()
  if (shown && rows.length && rows.every((r) => receipts.has(r.id))) return { error: 'A receipt is already on the client’s Money page — it isn’t shown as a file' }
  const change = rows.filter((r) => (shown ? !r.shownAt && !receipts.has(r.id) : !!r.shownAt))
  if (!change.length) return { changed: 0, designs: 0 }
  await db.update(leadFiles).set({ shownToClientAt: shown ? new Date() : null }).where(inArray(leadFiles.id, change.map((r) => r.id)))
  const designs = await syncRenderShares(leadId, change.map((r) => r.id), shown, viewer.id)
  await logLeadEvent(db, leadId, shown ? 'file_shown' : 'file_hidden', change.length === 1 ? { name: change[0]!.name, id: change[0]!.id } : { ids: change.map((r) => r.id) })
  for (const r of change) revalidatePath(`/leads/${leadId}/files/${r.id}`)
  touchLead(leadId)
  if (designs || !shown) revalidatePath(`/leads/${leadId}/files`)
  return { changed: change.length, designs }
}

/* ── Company › Client portal (Owners and Admins) ─────────────────────────────────────────────────────────────────────────── */

async function forSetup(): Promise<Refusal | null> {
  const viewer = await fetchViewer()
  return mayRunPortal(viewer.role) ? null : { error: PORTAL_SETUP_RULE }
}

/**
 * The address (Q-44): cleaned as typed, reserved words refused, unique across every address ever used. The old one stays in the history
 * and redirects, so a link already sent keeps working; this studio may take one of its own old addresses back. Answers the previous one
 * for Undo.
 */
export async function setPortalAddress(input: { slug: string }): Promise<Refusal | { slug: string; previous: string }> {
  const refused = await forSetup()
  if (refused) return refused
  const slug = cleanSlug(input.slug)
  const current = await currentPortalSlug()
  if (slug === current) return { slug, previous: current }
  const [hit] = await db.select().from(portalAddresses).where(eq(portalAddresses.slug, slug)).limit(1)
  const ours = !!hit?.retiredAt   // one of this studio's own old addresses (the prototype holds one studio)
  const problem = slugProblem(slug, { taken: !!hit && !ours })
  if (problem) return { error: problem }
  const now = new Date()
  await db.update(portalAddresses).set({ retiredAt: now }).where(eq(portalAddresses.slug, current))
  if (hit) await db.update(portalAddresses).set({ retiredAt: null }).where(eq(portalAddresses.slug, slug))
  else await db.insert(portalAddresses).values({ slug, createdAt: now, createdBy: await sessionMemberId(), retiredAt: null })
  touchPortal()
  revalidatePath(portalPath(current), 'layout')
  return { slug, previous: current }
}

/** (fix-G, G-35) Change the address's Undo: the previous address is the current one again, and an address made by that change minutes ago
    goes altogether — nothing was sent with it, so it never joins the history of addresses that lead here. An address that was already one of
    the studio's own stays in the history. */
export async function undoPortalAddress(input: { slug: string; previous: string }): Promise<Refusal | { slug: string }> {
  const refused = await forSetup()
  if (refused) return refused
  const current = await currentPortalSlug()
  if (current !== input.slug) return { error: 'The address has changed again since — change it from the Address row' }
  const [made] = await db.select().from(portalAddresses).where(eq(portalAddresses.slug, input.slug)).limit(1)
  const r = await setPortalAddress({ slug: input.previous })
  if ('error' in r) return r
  /* made by the change being undone: created moments ago and never retired before it */
  if (made && Date.now() - made.createdAt.getTime() < 15 * 60_000) await db.delete(portalAddresses).where(eq(portalAddresses.slug, input.slug))
  touchPortal()
  return { slug: r.slug }
}

/** Live / Paused (Q-50): a pause shuts every client page and request; today's four links keep working. */
export async function setPortalPaused(paused: boolean): Promise<Refusal | { paused: boolean }> {
  const refused = await forSetup()
  if (refused) return refused
  const s = await fetchPortalSettings()
  await savePortalSettings({ ...s, paused, pausedAt: paused ? Date.now() : null, pausedBy: paused ? await sessionMemberId() : null })
  touchPortal()
  return { paused }
}
