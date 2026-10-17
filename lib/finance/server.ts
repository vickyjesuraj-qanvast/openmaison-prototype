import 'server-only'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { costDocuments, leadAssignees, leads, members, projects, vendors } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { revalidateLead } from '@/lib/leads/queries'
import type { Viewer } from '@/lib/leads/assign-policy'
import { seesMoney } from '@/lib/projects/policy'
import { logProjectEvent, type ProjectEventDetail, type ProjectEventKind } from '@/lib/projects/events'
import { DATA_URL, dataUrlSize } from '@/lib/leads/file-store'
import { titleCaseName } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { COSTS_RULE } from './rules'
import { FINANCE_BASE, OLD_FINANCE_TABS } from './sections'

/*
 * (gaps build F1 — money out) What every money-out action shares: the refusal shape, the project's two checks (Who sees leads, then who sees its
 * money — F-17), the pages a change refreshes, an event on the project's Activity, a member's name, and a cost record's documents (E's data-URL
 * seam: a picture or a PDF, up to 8 MB, kept beside the record).
 */
export type Refusal = { error: string }
export const isRefusal = (x: unknown): x is Refusal => !!x && typeof x === 'object' && 'error' in x && typeof (x as Refusal).error === 'string'
export const NOT_FOUND = 'This project is not there any more'
export const GONE = 'This record is not there any more'

export type ProjectCtx = { p: typeof projects.$inferSelect; viewer: Viewer; team: string[]; client: string; address: string | null }
/** The project, after the viewer's two checks: they may see it (its lead's rule) and its money (F-17) — its costs are its money. */
export async function forCosts(projectId: string): Promise<ProjectCtx | Refusal> {
  const [row] = await db.select({ p: projects, name: leads.name, address: leads.propertyAddress, other: leads.leadAddress }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1)
  if (!row) return { error: NOT_FOUND }
  const viewer = await fetchViewer()
  if (!(await canOpenLead(viewer, row.p.leadId))) return { error: NOT_FOUND }
  const team = (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, row.p.leadId))).map((r) => r.memberId)
  if (!seesMoney(viewer, team)) return { error: COSTS_RULE }
  return { p: row.p, viewer, team, client: titleCaseName(row.name), address: row.address ?? row.other ?? null }
}

/** Refresh what a money-out change shows: Finance's pages, and the project's Money, listing and lead when it is on one. */
export function touchCosts(p?: { id: string; leadId: string } | null) {
  revalidatePath('/company/finance', 'layout')
  if (!p) return
  revalidatePath('/projects', 'layout')
  revalidatePath(`/projects/${p.id}/money`)
  revalidateLead(p.leadId)
}
/** A money-out step on the project's Activity (a money line — hidden from whoever doesn't see the money, `isMoneyEventKind`). */
export const logCost = (ctx: Pick<ProjectCtx, 'p'>, kind: ProjectEventKind, detail: ProjectEventDetail, actorId?: string | null) =>
  logProjectEvent(db, ctx.p.leadId, ctx.p.id, kind, { name: ctx.p.name, ...detail }, actorId === undefined ? {} : { actorId })
export const nameOf = async (id: string | null | undefined) => (id ? (await db.select({ name: members.name }).from(members).where(eq(members.id, id)).limit(1))[0]?.name ?? 'Someone' : 'Someone')
export const vendorName = async (id: string) => (await db.select({ name: vendors.name }).from(vendors).where(eq(vendors.id, id)).limit(1))[0]?.name ?? 'The vendor'
export const moneyWords = (minor: number) => money2(minor)
export const moneyHref = (projectId: string, open?: string) => `/projects/${projectId}/money${open ? `?open=${encodeURIComponent(open)}` : ''}`
/** (simplify S-11) A record on Finance: an old tab's name lands on its new home (`expenses` → Money out `?kind=expenses`), its `?open=` kept. */
export const financeHref = (tab: string, open?: string) => {
  const to = OLD_FINANCE_TABS[tab] ?? `${FINANCE_BASE}/${tab}`
  return open ? `${to}${to.includes('?') ? '&' : '?'}open=${encodeURIComponent(open)}` : to
}
export const teamOf = async (leadId: string) => (await db.select({ memberId: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.memberId)

/* ── Documents (F1-Q14) ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PickedDoc = { name: string; dataUrl: string; thumb?: string | null }
const DOC_MAX_BYTES = 8 * 1024 * 1024
const DOC_MIME = /^(image\/(jpeg|png|webp)|application\/pdf)$/
/** Why a picked file can't be kept, or null. */
export function docProblem(d: PickedDoc): string | null {
  const m = DATA_URL.exec(d.dataUrl)
  if (!m) return `${d.name} didn’t read — pick it again`
  if (!DOC_MIME.test(m[1]!.toLowerCase())) return `${d.name} isn’t a picture or a PDF`
  if (dataUrlSize(d.dataUrl) > DOC_MAX_BYTES) return `${d.name} is over 8 MB — a smaller file fits`
  return null
}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
/** Keep a record's file. */
export async function keepDoc(w: typeof db | Tx, kind: 'bill' | 'expense' | 'payout', recordId: string, d: PickedDoc, by: string): Promise<string> {
  const m = DATA_URL.exec(d.dataUrl)!
  const id = randomUUID()
  const thumb = d.thumb && /^data:image\/(jpeg|png|webp);base64,/.test(d.thumb) && d.thumb.length < 600_000 ? d.thumb : null
  await w.insert(costDocuments).values({ id, recordKind: kind, recordId, name: d.name.slice(0, 160), mime: m[1]!.toLowerCase(), sizeBytes: dataUrlSize(d.dataUrl), data: d.dataUrl, thumb, createdBy: by, createdAt: new Date() })
  return id
}
