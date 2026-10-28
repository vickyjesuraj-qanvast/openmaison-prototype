import 'server-only'
import { and, eq, isNotNull, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, paymentsOut, projects, purchaseOrders, supplierBills, vendors } from '@/lib/db/schema'
import { runsStudio } from '@/lib/leads/assign-policy'
import { isAccounting } from '@/lib/settings/roles'
import { billWaiting, deliveryLateDays, lateDeliveryTitle, poState } from './model'
import { moneyHref } from './server'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import type { FeedRow, NotificationRules } from '@/lib/notifications/model'
import { channelsOf } from '@/lib/notifications/queries'
import { todoHref } from './sections'

const DAY = 86_400_000
/** How many days before its due day a bill comes onto the bell (the alerts' lead time, Settings › Projects › Schedule's default). */
export const BILL_LEAD_DAYS = 3

/**
 * (gaps build F1 — F1-Q15) The bell's supplier bills — one row per bill that falls due within three days, or is past its day, with something still
 * to pay. For Owners and Admins (the caller asks). It opens the bill's To pay row on Finance › To do (simplify S-10).
 */
export async function derivedBillRows(rules: NotificationRules, now: number): Promise<FeedRow[]> {
  const [bills, paid, vs] = await Promise.all([
    db.select().from(supplierBills).where(isNull(supplierBills.deletedAt)),
    db.select({ billId: paymentsOut.billId, amount: paymentsOut.amountMinor, reversed: paymentsOut.reversedAt }).from(paymentsOut),
    db.select({ id: vendors.id, name: vendors.name }).from(vendors),
  ])
  const out: FeedRow[] = []
  for (const b of bills) {
    if (!b.dueOn) continue
    const paidMinor = paid.filter((p) => p.billId === b.id && !p.reversed).reduce((s, p) => s + p.amount, 0)
    const owed = b.totalMinor - paidMinor
    if (owed <= 0) continue
    /* (the Dashboard redesigned, 2026-10-26 — P-14, his Build mark; S44R's C8 rule) a bill still waiting for its OK is no bill to pay yet: To do
       lists it under To approve, never To pay, and nothing may be paid on it — so it rings the approver (`bill_review`, stored when it was
       recorded), never the payer. It rings here once it is approved. */
    if (billWaiting({ approvalWhy: b.approvalWhy === 'limit' || b.approvalWhy === 'differs' ? b.approvalWhy : null, approvedAt: b.approvedAt?.getTime() ?? null }, paidMinor)) continue
    const due = b.dueOn.getTime()
    if (now < due - BILL_LEAD_DAYS * DAY) continue
    const late = now >= due + DAY
    const vendor = vs.find((v) => v.id === b.vendorId)?.name ?? 'A vendor'
    out.push({
      id: `bill-due-${b.id}`, kind: 'bill_due', title: late ? `${vendor}’s bill ${b.reference} is overdue` : `${vendor}’s bill ${b.reference} is due ${displayDate(b.dueOn)}`,
      /* (simplify S-10 · F1 §6.9.5) it opens where bills are paid — Finance › To do's To pay row, the payee's bank in its Pay — and it is stamped
         with its due day: the bell's Due group reads `at` as the due day ("Due Tue, 6 Oct · 3 days late" said three days early, F1 P3) */
      body: `${money2(owed)} to pay`, href: todoHref(b.id),
      at: due, readAt: null, channels: channelsOf(rules, 'bill_due'), derived: true, fields: { '{vendor}': vendor, '{amount}': money2(owed) },   // (S42 audit A-09)
    })
  }
  return out
}

/**
 * (parity map, MO-094 · PR-089 — 1.0's `overdue-po`) The bell's late deliveries — one row per PO past its expected delivery day and not marked
 * delivered (it binds the studio and is not closed), for whoever made it and the project's members (the bell event's own "who"); an Owner or an
 * Admin hears it too on a project with no members. Derived from the date, never stored; gone the moment it is marked delivered. It opens the
 * PO on the project's Money, where its row has Mark delivered and Message {vendor}.
 */
export async function derivedPoLateRows(memberId: string, role: string, rules: NotificationRules, now: number): Promise<FeedRow[]> {
  const rows = await db.select({ po: purchaseOrders, leadId: projects.leadId, project: projects.name }).from(purchaseOrders)
    .innerJoin(projects, eq(projects.id, purchaseOrders.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(isNull(purchaseOrders.deletedAt), isNotNull(purchaseOrders.expectedOn), isNull(purchaseOrders.deliveredAt), isNotNull(purchaseOrders.sentAt), ne(purchaseOrders.status, 'cancelled'),
      isNull(projects.deletedAt), isNull(leads.deletedAt), ne(projects.stage, 'completed')))
  if (!rows.length) return []
  const [paid, team, vs] = await Promise.all([
    db.select({ poId: paymentsOut.poId, amount: paymentsOut.amountMinor, reversed: paymentsOut.reversedAt }).from(paymentsOut).where(isNotNull(paymentsOut.poId)),
    db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees),
    db.select({ id: vendors.id, name: vendors.name }).from(vendors),
  ])
  const out: FeedRow[] = []
  for (const r of rows) {
    const po = r.po
    const members = team.filter((t) => t.leadId === r.leadId).map((t) => t.memberId)
    if (!(po.createdBy === memberId || members.includes(memberId) || (members.length === 0 && runsStudio(role)) || isAccounting(role))) continue   // (parity map, MO-098) Accounting hears of every late delivery
    const paidMinor = paid.filter((p) => p.poId === po.id && !p.reversed).reduce((x, p) => x + p.amount, 0)
    const state = poState({ status: (po.status === 'closed' ? 'closed' : po.status === 'draft' ? 'draft' : 'sent'), submittedAt: po.submittedAt?.getTime() ?? null, reviewNote: po.reviewNote, vendorAnswer: (po.vendorAnswer === 'accepted' || po.vendorAnswer === 'changes' || po.vendorAnswer === 'declined' ? po.vendorAnswer : null) }, paidMinor)
    const days = deliveryLateDays({ expectedOn: po.expectedOn!.getTime(), deliveredAt: null }, state, now)
    if (!days) continue
    const vendor = vs.find((v) => v.id === po.vendorId)?.name ?? 'The vendor'
    const exp = po.expectedOn!
    out.push({
      id: `po-late-${po.id}`, kind: 'po_delivery_late', title: lateDeliveryTitle(po.number, days), body: `${vendor} · ${r.project}`, href: moneyHref(po.projectId, po.id),
      /* stamped with the day it was due, as the bills' rows are — the bell's Due group reads it */
      at: new Date(exp.getFullYear(), exp.getMonth(), exp.getDate()).getTime(), readAt: null, channels: channelsOf(rules, 'po_delivery_late'), derived: true, fields: { '{po}': po.number ?? '', '{vendor}': vendor },   // (S42 audit A-09)
    })
  }
  return out
}
