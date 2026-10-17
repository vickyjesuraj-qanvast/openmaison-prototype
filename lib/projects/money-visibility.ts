import 'server-only'
import { and, eq, inArray, isNull, like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadFiles, projectInvoices, projectPayments, projects } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { seesMoney } from './policy'

/*
 * (fix-D, D-04 · G-01 — F-17) Who sees money, everywhere it shows: the contract value, the invoices, the payments — and the client's bank proof
 * and receipts filed in Files › Payments — are the project's team's, its Owners' and its Admins' (`seesMoney`). The Money tab already asked;
 * these are the one check the other surfaces call (Activity, Files and its picture route, the Overview's and the listing's reasons, the search,
 * the Client access panel and the portal preview — package G), so a viewer refused money meets no figure and no proof anywhere.
 */

/** Whether this viewer sees the money of the project on this lead. A lead with no project has no money to hide (true). */
export async function seesLeadMoney(leadId: string, viewer?: Viewer): Promise<boolean> {
  const [p] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.leadId, leadId), isNull(projects.deletedAt))).limit(1)
  if (!p) return true
  const v = viewer ?? await fetchViewer()
  const team = (await db.select({ id: leadAssignees.memberId }).from(leadAssignees).where(eq(leadAssignees.leadId, leadId))).map((r) => r.id)
  return seesMoney(v, team)
}

/** The project's money files on this lead: Files › Payments (the folder and everything in it) and every proof and receipt a payment points at. */
export async function moneyFileIdsOf(leadId: string): Promise<Set<string>> {
  const files = await db.select({ id: leadFiles.id, parentId: leadFiles.parentId, kind: leadFiles.kind, name: leadFiles.name }).from(leadFiles).where(eq(leadFiles.leadId, leadId))
  const out = new Set<string>()
  const roots = files.filter((f) => f.kind === 'folder' && f.parentId === null && f.name === PAYMENTS_FOLDER_NAME).map((f) => f.id)
  const walk = (id: string) => { if (out.has(id)) return; out.add(id); for (const c of files) if (c.parentId === id) walk(c.id) }
  roots.forEach(walk)
  const [p] = await db.select({ id: projects.id }).from(projects).where(eq(projects.leadId, leadId)).limit(1)
  if (p) {
    const pays = await db.select({ proof: projectPayments.proofFileId, receipt: projectPayments.receiptFileId }).from(projectPayments).where(eq(projectPayments.projectId, p.id))
    for (const x of pays) { if (x.proof) out.add(x.proof); if (x.receipt) out.add(x.receipt) }
    /* (gaps build B, items 6 · 9) a sent invoice's entry and a recorded invoice's own file are money files too, wherever they were moved */
    const invs = await db.select({ file: projectInvoices.fileId, ext: projectInvoices.externalFileId }).from(projectInvoices).where(eq(projectInvoices.projectId, p.id))
    for (const x of invs) { if (x.file) out.add(x.file); if (x.ext) out.add(x.ext) }
  }
  return out
}

/** The money files this viewer may not see on this lead (an empty set when they see its money). */
export async function hiddenMoneyFiles(leadId: string, viewer?: Viewer): Promise<Set<string>> {
  return (await seesLeadMoney(leadId, viewer)) ? new Set() : moneyFileIdsOf(leadId)
}

/** Whether one file is a money file the viewer may not see (the picture route's and the viewer's question). */
export async function moneyFileHidden(fileId: string, viewer?: Viewer): Promise<boolean> {
  const [f] = await db.select({ leadId: leadFiles.leadId }).from(leadFiles).where(eq(leadFiles.id, fileId)).limit(1)
  if (!f) return false
  if (await seesLeadMoney(f.leadId, viewer)) return false
  const [pay] = await db.select({ id: projectPayments.id }).from(projectPayments).where(or(eq(projectPayments.proofFileId, fileId), eq(projectPayments.receiptFileId, fileId))).limit(1)
  return !!pay || (await moneyFileIdsOf(f.leadId)).has(fileId)
}

/** The money kinds of a lead's event log — Activity leaves them out for a viewer refused money. */
export const isMoneyEventKind = (kind: string) => kind.startsWith('project_payment_') || kind.startsWith('project_invoice_') || kind.startsWith('project_vo_') || kind === 'project_money_rebalanced'
  || /^project_(po|bill|expense|payout)_/.test(kind)   // (gaps build F1) money out's lines are money too
  || kind.startsWith('project_credit_')   // (gaps build F2) a credit note's lines
  || kind.startsWith('project_commission_')   // (gaps build F2) commission paid — and only the member's own besides (lib/leads/activity.ts)
  || kind.startsWith('parity_b_po_') || kind.startsWith('parity_c_commission_')   // (parity map) a PO's delivery and a project's commission rule are money

/** The leads (of many) whose project's money this viewer sees — one read for a list. */
export async function leadsSeeingMoney(leadIds: string[], viewer: Viewer): Promise<Set<string>> {
  const out = new Set<string>()
  if (!leadIds.length) return out
  const team = await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, leadIds))
  for (const id of leadIds) if (seesMoney(viewer, team.filter((t) => t.leadId === id).map((t) => t.memberId))) out.add(id)
  return out
}

const PAYMENTS_FOLDER_NAME = 'Payments'

/**
 * (fix-D, D-12) The studio-wide search's money hits: an invoice or a receipt by its number ("INV-2026-006", "RCT-2026"), on a project the viewer
 * sees and whose money they see. Each lands on its row of the project's Money tab (`?open=`).
 */
export async function moneyNumberHits(key: string, viewer: Viewer, seesLead: (leadId: string) => boolean): Promise<{ id: string; title: string; sub: string; href: string; icon: string }[]> {
  const k = `%${key.toUpperCase()}%`
  const [invs, pays] = await Promise.all([
    db.select({ id: projectInvoices.id, number: projectInvoices.number, stage: projectInvoices.stageName, status: projectInvoices.status, projectId: projects.id, name: projects.name, leadId: projects.leadId })
      .from(projectInvoices).innerJoin(projects, eq(projects.id, projectInvoices.projectId)).where(and(isNull(projects.deletedAt), like(projectInvoices.number, k))).limit(40),
    db.select({ id: projectPayments.id, number: projectPayments.receiptNumber, stage: projectInvoices.stageName, projectId: projects.id, name: projects.name, leadId: projects.leadId })
      .from(projectPayments).innerJoin(projectInvoices, eq(projectInvoices.id, projectPayments.invoiceId)).innerJoin(projects, eq(projects.id, projectPayments.projectId))
      .where(and(isNull(projects.deletedAt), like(projectPayments.receiptNumber, k))).limit(40),
  ])
  const leads = [...new Set([...invs, ...pays].map((r) => r.leadId).filter(seesLead))]
  const money = await leadsSeeingMoney(leads, viewer)
  return [
    ...invs.filter((r) => r.number && money.has(r.leadId)).map((r) => ({ id: r.id, title: r.number!, sub: `Invoice · ${r.stage}${r.status === 'void' ? ' · Void' : ''} · ${r.name}`, href: `/projects/${r.projectId}/money?open=${encodeURIComponent(r.id)}`, icon: 'payments' })),
    ...pays.filter((r) => r.number && money.has(r.leadId)).map((r) => ({ id: r.id, title: r.number!, sub: `Receipt · ${r.stage} · ${r.name}`, href: `/projects/${r.projectId}/money?open=${encodeURIComponent(r.id)}`, icon: 'receipt_long' })),
  ]
}
