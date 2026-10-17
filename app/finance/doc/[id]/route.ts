import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { costDocuments, expenses, paymentsOut, purchaseOrders, supplierBills } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { seesBooks } from '@/lib/settings/roles'
import { sendStored } from '@/lib/leads/file-store'
import { forCosts, isRefusal } from '@/lib/finance/server'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

export const dynamic = 'force-dynamic'

/**
 * (gaps build F1 — F1-Q14) A cost record's own file — a bill's PDF, an expense's receipt, a transfer's screenshot, (parity map, MO-038) a PO made
 * elsewhere — through E's one sending
 * path (`sendStored`: its type, its name, ranges). Only to whoever may see the record: a project's to whoever sees its money (F-17), the studio's
 * overhead to Owners and Admins (a member's own expense to them). `?thumb=1` = its picture (a PDF's first page); `?download=1` = a download.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { id } = await params
  const [d] = await db.select().from(costDocuments).where(eq(costDocuments.id, id)).limit(1)
  if (!d) return new Response('Not found', { status: 404 })
  let projectId: string | null = null, mine = false
  const viewer = await fetchViewer()
  if (d.recordKind === 'bill') {
    const [b] = await db.select({ p: supplierBills.projectId, by: supplierBills.createdBy }).from(supplierBills).where(and(eq(supplierBills.id, d.recordId), isNull(supplierBills.deletedAt))).limit(1)
    if (!b) return new Response('Not found', { status: 404 })
    projectId = b.p
  } else if (d.recordKind === 'expense') {
    const [e] = await db.select({ p: expenses.projectId, by: expenses.createdBy, claim: expenses.claimantId }).from(expenses).where(and(eq(expenses.id, d.recordId), isNull(expenses.deletedAt))).limit(1)
    if (!e) return new Response('Not found', { status: 404 })
    projectId = e.p; mine = e.by === viewer.id || e.claim === viewer.id
  } else if (d.recordKind === 'po') {
    /* (parity map, MO-038) a PO made elsewhere keeps its own file — to whoever sees the project's money */
    const [po] = await db.select({ p: purchaseOrders.projectId }).from(purchaseOrders).where(and(eq(purchaseOrders.id, d.recordId), isNull(purchaseOrders.deletedAt))).limit(1)
    if (!po) return new Response('Not found', { status: 404 })
    projectId = po.p
  } else {
    const [p] = await db.select({ p: paymentsOut.projectId, member: paymentsOut.memberId }).from(paymentsOut).where(eq(paymentsOut.id, d.recordId)).limit(1)
    if (!p) return new Response('Not found', { status: 404 })
    projectId = p.p; mine = p.member === viewer.id
  }
  if (projectId) { const c = await forCosts(projectId); if (isRefusal(c)) return new Response('Not found', { status: 404 }) }
  else if (!seesBooks(viewer.role) && !mine) return new Response('Not found', { status: 404 })   // (parity map, MO-098) the overhead's files are Accounting's books too
  const url = new URL(req.url)
  const thumb = url.searchParams.get('thumb') === '1'
  const stored = thumb ? d.thumb ?? (d.mime.startsWith('image/') ? d.data : null) : d.data
  const res = sendStored(stored, req, { name: d.name, cache: 'private, max-age=300', download: url.searchParams.get('download') === '1' })
  return res ?? new Response('Not found', { status: 404 })
}
