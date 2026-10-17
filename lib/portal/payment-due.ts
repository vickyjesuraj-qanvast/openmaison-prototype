import 'server-only'
import { and, eq, ne, gte, inArray, isNotNull, isNull, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { creditNotes, leads, projectInvoices, projectPayments, projects } from '@/lib/db/schema'
import { money2 } from '@/lib/quotes/math'
import { countsAsPaid, isPending } from '@/lib/projects/payments-model'
import { clientStageName } from './model'
import { fetchClientMessageRules, tellClient } from './client-messages-send'

/*
 * (simplify round 2 — P3 §6.8's option "a reminder on the due day", her "fix all the pending things" 2026-10-09) "A payment is due today": the
 * client hears of an invoice on its due day, by itself — today only *Remind on WhatsApp* by hand. Off until the studio switches it on (Settings ›
 * Notifications › Messages to clients, `client_payment_due`). Derived, never stored, the way the bell's reminders are: it runs when the studio's
 * bell is read (app/notifications/actions.ts `fetchFeedAction`, beside `deliverDerived`; PRODUCTION: the same sweep that runs `deliverDerived`
 * for every member), and the outbox key (`c:client_payment_due:<invoice>:<person>:<channel>`) keeps it to once per invoice.
 *
 * Who hears: whoever the invoice-sent email reaches — `tellClient`'s rule: the client and their household invited to the portal, not withdrawn;
 * nothing while the portal is paused or its Money section is off, nothing to a client never invited (the studio's own WhatsApp covers them,
 * REG-1056). Never for an invoice that is a Draft or void, paid (counting the payments that count, the client's "I have paid" waiting to be
 * confirmed — the ball is the studio's then — and the credit notes issued on it), on a project or a lead deleted, or one sent that same day (its
 * own email just said it). `{amount}` is what is still to pay on it. Never throws; answers how many messages went.
 */
export async function tellPaymentsDue(now = Date.now()): Promise<number> {
  try {
    const rules = await fetchClientMessageRules()
    const on = rules.channels.client_payment_due
    if (!on.email && !on.whatsapp) return 0
    /* its due day, by local midnights — the day the Money tab reads it due ("Due today"), the day before it is overdue */
    const d = new Date(now)
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    const due = await db.select({ i: projectInvoices, leadId: projects.leadId }).from(projectInvoices)
      .innerJoin(projects, eq(projects.id, projectInvoices.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
      .where(and(eq(projectInvoices.status, 'sent'), isNotNull(projectInvoices.dueAt), gte(projectInvoices.dueAt, from), lt(projectInvoices.dueAt, to), isNull(projects.deletedAt), isNull(leads.deletedAt)))
    const live = due.filter((r) => !(r.i.sentAt && r.i.sentAt.getTime() >= from.getTime()))
    if (!live.length) return 0
    const ids = live.map((r) => r.i.id)
    const [pays, credits] = await Promise.all([
      db.select({ invoiceId: projectPayments.invoiceId, amountMinor: projectPayments.amountMinor, status: projectPayments.status, trusted: projectPayments.trusted }).from(projectPayments)
        .where(and(inArray(projectPayments.invoiceId, ids), inArray(projectPayments.status, ['confirmed', 'to_confirm']))),
      db.select({ invoiceId: creditNotes.invoiceId, amountMinor: creditNotes.amountMinor }).from(creditNotes).where(and(inArray(creditNotes.invoiceId, ids), eq(creditNotes.status, 'issued'), ne(creditNotes.kind, 'overpayment'))),   // (pending modules S07) an overpayment's credit lowers no invoice
    ])
    let sent = 0
    for (const { i, leadId } of live) {
      const mine = pays.filter((x) => x.invoiceId === i.id)
      const owed = i.amountMinor - credits.filter((x) => x.invoiceId === i.id).reduce((s, x) => s + x.amountMinor, 0)
        - mine.filter(countsAsPaid).reduce((s, x) => s + x.amountMinor, 0) - mine.filter(isPending).reduce((s, x) => s + x.amountMinor, 0)
      if (owed <= 0) continue
      const stage = clientStageName(i.stageName).toLowerCase()
      sent += await tellClient({ event: 'client_payment_due', leadId, ref: i.id, path: `money?open=${encodeURIComponent(i.id)}`,
        fields: { '{invoice}': stage, '{amount}': money2(owed) },
        plain: { title: `Your ${stage} payment is due today`, line: `Your ${stage} invoice is due today — ${money2(owed)} to pay. How to pay is on your page.` } })   // (invented copy)
    }
    return sent
  } catch { return 0 }
}
