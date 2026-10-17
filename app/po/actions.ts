'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, purchaseOrders, vendors } from '@/lib/db/schema'
import { notify } from '@/lib/notifications/emit'
import { logProjectEvent } from '@/lib/projects/events'
import { isShareToken } from '@/lib/projects/invoices-token'
import { REASON_MAX } from '@/lib/finance/model'
import { moneyHref, teamOf, touchCosts } from '@/lib/finance/server'

/*
 * (gaps build F1 — F1-Q9) The vendor's answer on the PO's no-login link: Accept, Ask for changes (a note), Decline (a note). One answer while
 * the PO is with them; a cancelled, closed or removed PO takes none. The studio's people hear it on the bell (the PO's maker and the project's
 * team); the line on the project's Activity is the vendor's own. Opening the link stamps Viewed (`stampPoViewed`, the page calls it).
 */
type Refusal = { error: string }
const DEAD = 'This purchase order can’t be answered any more — call the studio'

export async function answerPo(token: string, o: { answer: 'accepted' | 'changes' | 'declined'; note?: string | null }): Promise<{ ok: true } | Refusal> {
  if (!isShareToken(token)) return { error: DEAD }
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.vendorToken, token)).limit(1)
  if (!po || po.deletedAt || !po.sentAt || po.status !== 'sent') return { error: DEAD }
  if (po.vendorAnswer) return { error: 'You have answered this purchase order already — call the studio to change it' }
  if (!['accepted', 'changes', 'declined'].includes(o.answer)) return { error: 'Pick an answer' }
  const note = (o.note ?? '').trim().slice(0, REASON_MAX)
  if (o.answer !== 'accepted' && !note) return { error: o.answer === 'changes' ? 'Say what should change' : 'Say why you decline it' }
  const [p] = await db.select().from(projects).where(and(eq(projects.id, po.projectId), isNull(projects.deletedAt))).limit(1)
  if (!p) return { error: DEAD }
  await db.update(purchaseOrders).set({ vendorAnswer: o.answer, vendorAnswerNote: note || null, vendorAnsweredAt: new Date(), answerVia: 'link', answerMarkedBy: null, vendorViewedAt: po.vendorViewedAt ?? new Date() }).where(eq(purchaseOrders.id, po.id))
  const vendor = (await db.select({ n: vendors.name }).from(vendors).where(eq(vendors.id, po.vendorId)).limit(1))[0]?.n ?? 'The vendor'
  await logProjectEvent(db, p.leadId, p.id, 'project_po_answered', { name: p.name, id: po.id, title: po.number, vendor, answer: o.answer, via: 'link', note: note || null }, { actorId: null })
  const words = o.answer === 'accepted' ? 'accepted it' : o.answer === 'changes' ? `asked for changes — “${note}”` : `declined it — “${note}”`
  const to = [...new Set([po.createdBy, po.sentBy, ...(await teamOf(p.leadId))].filter((x): x is string => !!x))]
  await notify('po_answered', to, { title: `${vendor} ${o.answer === 'accepted' ? 'accepted' : o.answer === 'changes' ? 'asked for changes to' : 'declined'} ${po.number}`, body: note || null, href: moneyHref(p.id, po.id), leadId: p.leadId, actorId: null, fields: { '{po}': po.number, '{vendor}': vendor, '{note}': words } })
  touchCosts(p)
  return { ok: true }
}
