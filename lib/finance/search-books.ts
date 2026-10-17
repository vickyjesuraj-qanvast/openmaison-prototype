import 'server-only'
import { and, eq, isNull, like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { creditNotes, leads, projectInvoices, projects } from '@/lib/db/schema'
import type { Viewer } from '@/lib/leads/assign-policy'
import { leadsSeeingMoney } from '@/lib/projects/money-visibility'
import { money2 } from '@/lib/quotes/math'
import type { FinanceHit } from './search'

/** (gaps build F2 — F2-Q15) The studio search's credit notes: by number, reason or invoice — on a project whose money the viewer sees (Who sees
    leads, then F-17). Each opens the Money tab on its row. */
export async function creditHits(key: string, viewer: Viewer, seesLead: (leadId: string) => boolean): Promise<FinanceHit[]> {
  const k = `%${key}%`
  const rows = await db.select({ id: creditNotes.id, number: creditNotes.number, reason: creditNotes.reason, amount: creditNotes.amountMinor, status: creditNotes.status, projectId: projects.id, project: projects.name, leadId: leads.id, invoice: projectInvoices.number })
    .from(creditNotes).innerJoin(projects, eq(projects.id, creditNotes.projectId)).innerJoin(leads, eq(leads.id, projects.leadId)).innerJoin(projectInvoices, eq(projectInvoices.id, creditNotes.invoiceId))
    .where(and(isNull(projects.deletedAt), or(like(creditNotes.number, k), like(creditNotes.reason, k), like(projectInvoices.number, k)))).limit(40)
  const money = await leadsSeeingMoney([...new Set(rows.map((r) => r.leadId).filter(seesLead))], viewer)
  return rows.filter((r) => money.has(r.leadId)).map((r) => ({
    kind: 'finance' as const, id: r.id, title: r.number, sub: ['Credit note', r.invoice, r.project, money2(r.amount)].filter(Boolean).join(' · '), chip: r.status === 'void' ? 'Void' : null,
    href: `/projects/${r.projectId}/money?open=${encodeURIComponent(r.id)}`, icon: 'receipt_long', others: [r.reason, r.invoice], phones: [],
  }))
}
