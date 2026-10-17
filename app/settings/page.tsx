import type { Metadata } from 'next'
import { fetchCustomFields } from '@/lib/company/custom-fields'
import { db } from '@/lib/db'
import { members, quotes } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'
import { fetchCostVisibility, fetchLeadStageRules } from '@/lib/settings/queries'   // (pending modules S05) · (pending modules S41b-1) Who sees costs and margins
import { fetchLeadReasons, fetchLeadSources, fetchLeadVisibility, fetchNewQuoteDefaults, fetchNumbering, fetchStudio, fetchQuoteApproval, fetchQuoteRules, fetchStageMovement, fetchTemplateApproval, fetchTradeNotes, fetchTrades, fetchUnits } from '@/lib/settings/queries'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { leads, stageLogs } from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { isAccounting, isMarketing, runsLeadSetup } from '@/lib/settings/roles'   // (parity map, FB-114) Accounting's Settings open on Finance — read-only, as every member's are; (pending modules S06 — the role's open question 5, as recommended) and are Finance alone
import { fetchBrand } from '@/lib/templates/queries'
import { readFrom } from '@/lib/nav'
import { parseSettingsModule } from '@/lib/settings/modules'
import { SettingsView } from './settings-view'
import { fetchStudioSetup } from '@/lib/studio-setup/queries'   // (pending modules S08)
import { fetchProjectNumbering, fetchProjectNumbers } from '@/lib/projects/queries'
import { fetchUpdateReview, fetchUpdateReviewers } from '@/lib/projects/updates'
import { fetchHandoverRules, fetchScheduleDefaults } from '@/lib/projects/handover'   // (Projects round 7)
import { fetchProjectStart } from '@/lib/projects/start-rule-server'   // (S44R, C7)
import { fetchScheduleRules, fetchTypeDefaults, templateOptions } from '@/lib/projects/schedule'
import { fetchEntityNumbering, fetchInvoiceNumbering, fetchInvoiceNumbers, fetchInvoicePaper, fetchInvoiceRules } from '@/lib/projects/money-queries'
import { expenseCategoryCounts, fetchCostRules, fetchExpenseCategories, fetchPoNumbers } from '@/lib/finance/queries'   // (gaps build F1) · (pending modules S06) the categories
import { fetchPaymentRules, fetchReceiptNumbering, fetchReceiptNumbers } from '@/lib/projects/payments'
import { fetchMessageTemplates, fetchNotificationRules } from '@/lib/notifications/queries'
import { fetchBooksSettings } from '@/lib/finance/books'   // (gaps build F2)
import { fetchTicketCategories } from '@/lib/projects/tickets'   // (gaps build H)
import { ticketCategoryCounts } from '@/app/projects/tickets-actions'
import { fetchClientMessageRules } from '@/lib/portal/client-messages-send'
import { readMeetingsSettings } from './meetings-actions'   // (pending modules S23) Settings › Meetings

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

/**
 * Settings — the studio's rules (REG-645, settings parity Q-01): the modules Studio · Lead management · Quotes & pricing · Notifications
 * as the house tab strip, the open one in `?section=` (Studio when none), `?from=` for Back. The records the modules speak of live under
 * Company. Every member opens it; Owners and Admins change it (parity Q-41).
 */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string; from?: string; setup?: string }> }) {
  const [stageMovement, quoteApproval, templateApproval, numbering, trades, sp, rules, team, leadSources, counts, leadVisibility, studio, notificationRules, messageTemplates, brand, numbers] = await Promise.all([
    fetchStageMovement(), fetchQuoteApproval(), fetchTemplateApproval(), fetchNumbering(), fetchTrades(), searchParams,
    fetchQuoteRules(), db.select({ id: members.id, name: members.name, role: members.role, color: members.color, managerId: members.managerId, isActive: members.isActive }).from(members).then(withYou),   // (pending modules S43A) "you" = this browser's member
    fetchLeadSources(), db.select({ id: leads.id, source: leads.source, stage: leads.stage }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false))),   /* (REG-599) · (S42 B-04) counted below for the viewer */
    fetchLeadVisibility(),   /* (REG-601) */
    fetchStudio(),   /* (one-home N-03) Lead capture and its arrivals are read by Company › Integrations alone */
    fetchNotificationRules(), fetchMessageTemplates(),   /* (REG-604) */
    fetchBrand(), db.select({ number: quotes.number }).from(quotes),   /* (gaps build B) the issuing entities' invoice numbers; every quote number given, for the real next one */
  ])
  /* (REG-607) The Lost / On Hold reasons and how many leads each has ever carried (the parking logs' payloads); only Owners and Admins edit the Leads cards (parity Q-41). */
  const [reasonList, reasonRows, viewer, customFields, tradeNotes, newQuoteDefaults, projectNumbering, projectNumbers] = await Promise.all([
    fetchLeadReasons(),
    db.selectDistinct({ reason: sql<string | null>`json_extract(${stageLogs.payload}, '$.reason')`, toStage: stageLogs.toStage, leadId: stageLogs.leadId }).from(stageLogs).where(inArray(stageLogs.toStage, ['Lost', 'On Hold'])),   /* (S42 B-04) counted below for the viewer */
    fetchViewer(),
    fetchCustomFields(false),   /* (REG-612) */
    fetchTradeNotes(trades.trades),   /* (REG-617, parity Q-08) a note per trade */
    fetchNewQuoteDefaults(),   /* (UX audit S4) what a new quote starts with — the default template's New quotes settings */
    fetchProjectNumbering(), fetchProjectNumbers(),   /* (REG-921) Settings › Projects */
  ])
  const units = await fetchUnits()   /* (S44I — M9) Settings › Quotes & pricing › Units */
  const projectUpdateReview = await fetchUpdateReview()   /* (REG-949) Settings › Projects › Updates */
  const projectUpdateReviewers = await fetchUpdateReviewers()   /* (gaps build D, item 10) — (one-home N-07) CaseTrust is read on Company › Profile, not here */
  const [invoiceRules, invoiceNumbering, invoiceNumbers] = await Promise.all([fetchInvoiceRules(), fetchInvoiceNumbering(), fetchInvoiceNumbers()])   /* (Projects round 5) Settings › Projects › Invoices */
  const [invoicePaper, entityNumbering] = await Promise.all([fetchInvoicePaper(), fetchEntityNumbering()])   /* (gaps build B, items 12 · 14) */
  /* (Projects round 7) Settings › Projects › Stages and handover · the studio's default start (the schedule templates to start from) — (one-home N-11) one card with the starts by project type */
  const [handoverRules, scheduleDefaults, scheduleTemplateRows, projectStart] = await Promise.all([fetchHandoverRules(), fetchScheduleDefaults(), templateOptions(), fetchProjectStart()])   // (S44R, C7) when a project starts
  const [scheduleRules, typeDefaults] = await Promise.all([fetchScheduleRules(), fetchTypeDefaults()])   /* (gaps build, package C) Settings › Projects › Schedule */
  const [paymentRules, receiptNumbering, receiptNumbers] = await Promise.all([fetchPaymentRules(), fetchReceiptNumbering(), fetchReceiptNumbers()])   /* (Projects round 6) Settings › Projects › Payments */
  const [costRules, poNumbers, expenseCategories, categoryCounts] = await Promise.all([fetchCostRules(), fetchPoNumbers(), fetchExpenseCategories(), expenseCategoryCounts()])   /* (pending modules S06) Money out › Expense categories */   /* (gaps build F1) Settings › Finance › Costs; (one-home N-12) the books' credit-note numbering below goes to Settings › Projects */
  const [ticketCategories, ticketCounts, clientMessages] = await Promise.all([fetchTicketCategories(), ticketCategoryCounts(), fetchClientMessageRules()])   /* (gaps build H) Settings › Projects › Ticket categories · Notifications › Messages to clients */
  /* (pending modules S05) Lead stages: what a step asks for, and the live leads in each stage (the listing's own count) */
  /* (S42 B-04 — a Designer who sees only her own leads was shown the studio's numbers) every count on these cards is the viewer's own, as the
     listing's: Who sees leads applies (`visibleLeadIds`; Owners and Admins see every lead) */
  const [leadStageRules, visible] = await Promise.all([fetchLeadStageRules(), visibleLeadIds(viewer)])
  const sees = (leadId: string) => !visible || visible.has(leadId)
  const tally = (keys: (string | null)[]) => { const out: Record<string, number> = {}; for (const k of keys) if (k) out[k] = (out[k] ?? 0) + 1; return out }
  const seen = counts.filter((l) => sees(l.id))
  const stageRows = Object.entries(tally(seen.map((l) => l.stage))).map(([stage, n]) => ({ stage, n }))
  const sourceRows = Object.entries(tally(seen.map((l) => l.source))).map(([source, n]) => ({ source, n }))
  const reasonCounts = { lost: tally(reasonRows.filter((r) => r.toStage === 'Lost' && sees(r.leadId)).map((r) => r.reason)), hold: tally(reasonRows.filter((r) => r.toStage !== 'Lost' && sees(r.leadId)).map((r) => r.reason)) }
  const me = team.find((m) => m.isYou)
  /* (pending modules S08) Settings › Studio opens on Set up your studio while it shows for this Owner or Admin; ⌘K's "Set up your studio"
     (`?setup=1`) shows it as it stands */
  /* (S44O — call C6) Marketing's Settings are Lead management alone — theirs to change; nothing of the studio's money reaches their page */
  const desk = isMarketing(viewer.role)
  const openModule = isAccounting(viewer.role) ? 'finance' : desk ? 'leads' : parseSettingsModule(sp.section)
  const setup = openModule === 'studio' ? await fetchStudioSetup({ asked: sp.setup === '1' }) : null
  const meetings = openModule === 'meetings' ? await readMeetingsSettings() : null   /* (pending modules S23) read only when the module is open */
  /* (one-home N-06) Settings › Studio no longer lists the issuing entities — Company › Profile holds them. */
  return <SettingsView stageMovement={stageMovement} quoteApproval={quoteApproval} templateApproval={templateApproval} numbering={numbering} trades={trades.trades} tradesManaged={trades.managed} units={units.units} unitsManaged={units.managed} tradeNotes={tradeNotes} meName={me?.name ?? ''}
                       section={openModule} setup={setup} onlyBooks={isAccounting(viewer.role)} onlyLeads={desk} from={readFrom(sp.from)} rules={rules} team={team} studio={studio} quoteNumbers={desk ? [] : numbers.map((q) => q.number)}
                       leadReasons={reasonList.reasons} reasonsManaged={reasonList.managed} reasonCounts={reasonCounts} canManage={desk ? runsLeadSetup(viewer.role) : runsStudio(viewer.role)} customFields={customFields}
                       leadSources={leadSources.sources} sourcesManaged={leadSources.managed} sourceCounts={Object.fromEntries(sourceRows.map((c) => [c.source, Number(c.n)]))} leadVisibility={leadVisibility}
                       studioName={studio.name}
                       notificationRules={notificationRules} messageTemplates={messageTemplates} newQuoteDefaults={newQuoteDefaults} projectNumbering={projectNumbering} projectNumbers={projectNumbers}
                       projectUpdateReview={projectUpdateReview} projectUpdateReviewers={projectUpdateReviewers} projectInvoices={desk ? undefined : { rules: invoiceRules, numbering: invoiceNumbering, numbers: invoiceNumbers,
                         paper: invoicePaper, entityNumbering, entities: brand.details.entities.filter((e) => !e.retired).map((e) => ({ id: e.id, name: e.name })),   /* (gaps build B) */
                         payments: { rules: paymentRules, numbering: receiptNumbering, numbers: receiptNumbers, team: team.map((m) => ({ id: m.id, name: m.name, role: m.role, active: m.isActive !== false })) } }}
                       projectStart={projectStart.startsWhen}
                       projectEnding={desk ? undefined : { handoverReview: handoverRules.review, scheduleTemplate: scheduleDefaults.templateId, templates: scheduleTemplateRows.map((t) => ({ id: t.id, name: t.name })), schedule: { rules: scheduleRules, typeDefaults } }}
                       projectCosts={desk ? undefined : { rules: costRules, numbers: poNumbers, categories: { ...expenseCategories, counts: categoryCounts } }} booksSettings={desk ? null : await fetchBooksSettings()}
                       projectTickets={desk ? undefined : { categories: ticketCategories, counts: ticketCounts }} clientMessages={desk ? undefined : clientMessages}
                       projectsI={{ capacity: await (await import('@/lib/projects/workload-queries')).fetchDefaultCapacity(), starterTasks: await (await import('@/lib/compliance/queries')).fetchStarterTasksOn() }}
                       contractRules={await (await import('@/lib/contracts/link-server')).fetchContractRules()}
                       leadStages={{ rules: leadStageRules, counts: Object.fromEntries(stageRows.map((r) => [r.stage, Number(r.n)])) }} meetings={meetings}
                       costVisibility={await fetchCostVisibility()} />
}
