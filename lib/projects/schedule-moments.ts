import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerLeadLinks, homeownerProfiles, leadEvents, leadFiles, leads, notifications, projectInvoices, projectPayments } from '@/lib/db/schema'
import { isSgMobile, phoneDigits, titleCaseName } from '@/lib/format'
import { currentPortalSlug, fetchPortalLook, fetchPortalSettings } from '@/lib/portal/queries'
import { portalPath } from '@/lib/portal/model'

/*
 * (simplify S-17 · S-18 · S-19 · P2 §6.8, 2026-10-09) The server half the project's moments share — the Start sheet (app/projects/actions.ts),
 * the Mark done sheet (app/projects/schedule-actions.ts), the Hand over sheet and the hold (app/projects/ending-actions.ts · actions.ts):
 *   · the ticks a Done carries while it waits for an Owner's or an Admin's approval (`project_milestones.done_ask_json`, migration 0083);
 *   · an invoice's send or submission put back, for a moment's Undo (refused once money was recorded on it);
 *   · what a moment needs to tell the client — their first name, the number that signs in, their page, the studio's name.
 * Every write here is the reverse of today's own action (money-actions' `sendInvoice` · `submitInvoice`), never a rule of its own.
 */

/* ── The ticks that ride with a Done (S-18) ───────────────────────────────────────────────────────────────────────────────────── */

/** What the Mark done sheet asked for. `day` is a day number (lib/projects/schedule-model.ts `dayOf`). */
export type DoneTicks = {
  day: number
  bringForward: boolean
  /** Show it on the client's schedule as done — with the other changes ticked (`shareOnly`, ids). */
  share: boolean
  shareOnly: string[]
  /** Ask the client to confirm it on their page. */
  askConfirm: boolean
  /** Photos uploaded to Site updates — they post as "{milestone} is done" under the update review rule. */
  fileIds: string[]
  /** The stage's invoice to send (or submit, under invoice approval). */
  invoiceId: string | null
}
const ids = (v: unknown, n: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length <= 64).slice(0, n) : [])
export function parseDoneTicks(v: unknown): DoneTicks | null {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const day = typeof o.day === 'number' && Number.isFinite(o.day) && o.day > 10_000 && o.day < 60_000 ? Math.round(o.day) : null
  if (day === null) return null
  return {
    day, bringForward: o.bringForward === true, share: o.share === true, shareOnly: ids(o.shareOnly, 60), askConfirm: o.askConfirm === true,
    fileIds: ids(o.fileIds, 12), invoiceId: typeof o.invoiceId === 'string' && o.invoiceId ? o.invoiceId.slice(0, 64) : null,
  }
}
/** Something rides with it beyond the Done itself. */
export const ticksCarry = (t: DoneTicks | null): boolean => !!t && (t.share || t.askConfirm || t.fileIds.length > 0 || !!t.invoiceId)

/* ── An invoice's send or submission, put back (a moment's Undo) ──────────────────────────────────────────────────────────────── */

type InvoiceCols = Pick<typeof projectInvoices.$inferSelect, 'number' | 'status' | 'sentBy' | 'sentAt' | 'dueAt' | 'gstMinor' | 'issuingEntity' | 'reviewNote' | 'contractMinor'
  | 'baseMinor' | 'variationsMinor' | 'shareToken' | 'fileId' | 'reviewedBy' | 'reviewedAt' | 'submittedBy' | 'submittedAt'>
/** The invoice as it was before the moment touched it — dates as ms so the Undo can travel through the page. */
export type InvoiceBefore = { [K in keyof InvoiceCols]: InvoiceCols[K] extends Date | null ? number | null : InvoiceCols[K] }
export type InvoiceRevert = { invoiceId: string; projectId: string; kind: 'sent' | 'submitted'; at: number; before: InvoiceBefore }

const ms = (d: Date | null) => (d ? d.getTime() : null)
const dt = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? new Date(n) : null)
export async function invoiceBefore(invoiceId: string): Promise<InvoiceBefore | null> {
  const [i] = await db.select().from(projectInvoices).where(eq(projectInvoices.id, invoiceId)).limit(1)
  if (!i) return null
  return {
    number: i.number, status: i.status, sentBy: i.sentBy, sentAt: ms(i.sentAt), dueAt: ms(i.dueAt), gstMinor: i.gstMinor, issuingEntity: i.issuingEntity, reviewNote: i.reviewNote,
    contractMinor: i.contractMinor, baseMinor: i.baseMinor, variationsMinor: i.variationsMinor, shareToken: i.shareToken, fileId: i.fileId,
    reviewedBy: i.reviewedBy, reviewedAt: ms(i.reviewedAt), submittedBy: i.submittedBy, submittedAt: ms(i.submittedAt),
  }
}
const moneyHref = (projectId: string, invoiceId: string) => `/projects/${projectId}/money?open=${encodeURIComponent(invoiceId)}`

/** Why the invoice can't be put back — a payment recorded on it (the client's or the studio's), or voided since. Null = it can. */
export async function invoiceRevertBlock(r: Pick<InvoiceRevert, 'invoiceId' | 'projectId'>, client: string): Promise<string | null> {
  const [i] = await db.select({ number: projectInvoices.number, stageName: projectInvoices.stageName, status: projectInvoices.status, projectId: projectInvoices.projectId }).from(projectInvoices).where(eq(projectInvoices.id, r.invoiceId)).limit(1)
  if (!i || i.projectId !== r.projectId) return null
  const [paid] = await db.select({ id: projectPayments.id }).from(projectPayments).where(eq(projectPayments.invoiceId, r.invoiceId)).limit(1)
  if (paid) return `${client} has paid ${i.number ?? `the ${i.stageName} invoice`} since — it stays as it is`
  if (i.status === 'void') return `${i.number ?? `The ${i.stageName} invoice`} was voided since — it stays as it is`
  return null
}

/** Puts an invoice back to the Draft it was: the columns the send (or the submission) wrote, its Files › Payments entry when the send filed it,
    its Activity line and the bell rows it raised. The client's email already went — the outbox keeps it (the developers' delivery layer). */
export async function revertInvoice(r: InvoiceRevert): Promise<void> {
  const [i] = await db.select().from(projectInvoices).where(eq(projectInvoices.id, r.invoiceId)).limit(1)
  if (!i || i.projectId !== r.projectId) return
  const b = r.before
  const since = new Date(r.at - 2000)
  if (r.kind === 'submitted') {
    await db.update(projectInvoices).set({ submittedBy: b.submittedBy, submittedAt: dt(b.submittedAt), updatedAt: new Date() }).where(eq(projectInvoices.id, i.id))
    await db.delete(leadEvents).where(and(eq(leadEvents.projectId, r.projectId), eq(leadEvents.kind, 'project_invoice_submitted'), gte(leadEvents.at, since), sql`json_extract(${leadEvents.detail}, '$.id') = ${i.id}`))
    await db.delete(notifications).where(and(eq(notifications.kind, 'invoice_review'), eq(notifications.href, moneyHref(r.projectId, i.id)), gte(notifications.createdAt, since)))
    return
  }
  if (i.status !== 'sent') return
  await db.update(projectInvoices).set({
    number: b.number, status: b.status, sentBy: b.sentBy, sentAt: dt(b.sentAt), dueAt: dt(b.dueAt), gstMinor: b.gstMinor, issuingEntity: b.issuingEntity, reviewNote: b.reviewNote,
    contractMinor: b.contractMinor, baseMinor: b.baseMinor, variationsMinor: b.variationsMinor, shareToken: b.shareToken, fileId: b.fileId,
    reviewedBy: b.reviewedBy, reviewedAt: dt(b.reviewedAt), submittedBy: b.submittedBy, submittedAt: dt(b.submittedAt), updatedAt: new Date(),
  }).where(eq(projectInvoices.id, i.id))
  /* the send filed "{number} · {stage}.pdf" in Files › Payments — an entry for a number the invoice no longer has goes with it */
  if (i.fileId && i.fileId !== b.fileId) await db.delete(leadFiles).where(eq(leadFiles.id, i.fileId))
  await db.delete(leadEvents).where(and(eq(leadEvents.projectId, r.projectId), inArray(leadEvents.kind, ['project_invoice_sent', 'project_invoice_submitted']), gte(leadEvents.at, since), sql`json_extract(${leadEvents.detail}, '$.id') = ${i.id}`))
  await db.delete(notifications).where(and(inArray(notifications.kind, ['invoice_review', 'invoice_approved', 'invoice_sent']), eq(notifications.href, moneyHref(r.projectId, i.id)), gte(notifications.createdAt, since)))   // (parity map, UC-098 — P-A's) the new "sent" row goes too
}

/* ── Telling the client: what a moment needs to know ──────────────────────────────────────────────────────────────────────────── */

export type ClientTellFacts = {
  /** The client's full name, title-cased, and their first name. */
  name: string; first: string
  /** The number that signs in (the portal profile's, else the lead's) — WhatsApp goes to it. */
  phone: string | null
  /** An SG mobile — the portal's code goes by SMS, so a landline can never be invited (fix-G, G-05). */
  mobile: boolean
  /** The studio's name as the portal wears it. */
  studio: string
  /** The client's page (a path; the browser adds its origin). */
  path: string
  /** Invited and not withdrawn — they can open their page. */
  live: boolean
  invited: boolean
  withdrawn: boolean
  /** When they first opened their page (ms), null = never. */
  openedAt: number | null
  /** The studio's portal is paused (Company › Client portal). */
  paused: boolean
}
export async function clientTellFacts(leadId: string): Promise<ClientTellFacts | null> {
  const [l] = await db.select({ name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!l) return null
  const [[link], look, slug, settings] = await Promise.all([
    db.select({ k: homeownerLeadLinks, phone: homeownerProfiles.phone }).from(homeownerLeadLinks).innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerLeadLinks.homeownerId)).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1),
    fetchPortalLook(), currentPortalSlug(), fetchPortalSettings(),
  ])
  const name = titleCaseName(l.name)
  const phone = phoneDigits(link?.phone ?? l.phone) || null
  const invited = !!link?.k.invitedAt
  const withdrawn = !!link?.k.withdrawnAt
  return {
    name, first: name.split(/\s+/)[0] ?? name, phone, mobile: !!phone && isSgMobile(phone), studio: look.studio, path: portalPath(slug),
    live: invited && !withdrawn, invited, withdrawn, openedAt: link?.k.openedAt?.getTime() ?? null, paused: settings.paused,
  }
}
/** The link's stamps as they were — what the Start sheet's Undo puts back. */
export type InviteBefore = { linkId: string | null; invitedAt: number | null; invitedBy: string | null; withdrawnAt: number | null; withdrawnBy: string | null }
export async function inviteBefore(leadId: string): Promise<InviteBefore> {
  const [k] = await db.select().from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1)
  return k ? { linkId: k.id, invitedAt: ms(k.invitedAt), invitedBy: k.invitedBy, withdrawnAt: ms(k.withdrawnAt), withdrawnBy: k.withdrawnBy } : { linkId: null, invitedAt: null, invitedBy: null, withdrawnAt: null, withdrawnBy: null }
}
/** The invite's stamps back as they were, and the `invite_sent` line it wrote. A link the invite made stays (it holds no access without the stamp). */
export async function revertInvite(leadId: string, b: InviteBefore, at: number): Promise<void> {
  await db.update(homeownerLeadLinks).set({ invitedAt: dt(b.invitedAt), invitedBy: b.invitedBy, withdrawnAt: dt(b.withdrawnAt), withdrawnBy: b.withdrawnBy }).where(eq(homeownerLeadLinks.leadId, leadId))
  await db.delete(leadEvents).where(and(eq(leadEvents.leadId, leadId), eq(leadEvents.kind, 'invite_sent'), gte(leadEvents.at, new Date(at - 2000))))
}
/** The client opened their page after the moment — its Undo is refused (P2 §6.2: "refused once the client opened the link"). */
export async function openedSince(leadId: string, at: number): Promise<boolean> {
  const [k] = await db.select({ lastOpenedAt: homeownerLeadLinks.lastOpenedAt, openedAt: homeownerLeadLinks.openedAt }).from(homeownerLeadLinks).where(eq(homeownerLeadLinks.leadId, leadId)).limit(1)
  const last = k?.lastOpenedAt?.getTime() ?? k?.openedAt?.getTime() ?? null
  return last !== null && last > at
}
