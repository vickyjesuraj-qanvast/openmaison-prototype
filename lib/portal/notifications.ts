import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { floorPlanBellFacts } from '@/lib/projects/floor-plan'   // (gaps build G)
import { fetchPortalLayouts } from '@/lib/planner/queries'   // (gaps build J)
import { clientBellFacts } from './threads'   // (gaps build H)
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, members, portalBellReads, projectPayments, projectScheduleShares, projectUpdates, projects } from '@/lib/db/schema'
import { moneySummaryOf } from '@/lib/projects/money-queries'
import { creditsByProject } from '@/lib/finance/credit-records'   // (gaps build F2)
import { firstName, portalPath } from './model'
import { loadHomeFacts } from './home'
import { placeOf, type PortalLook } from './queries'
import { bellRows, unreadOf, type BellDocument, type BellFacts, type BellHome, type BellInvoice, type BellPayment, type BellRow } from './notifications-model'
import type { HomeFacts } from './needs'
import type { PortalVisitor } from './session'
import { confirmKeyOf, confirmPath } from '@/lib/quotes/confirm'   // (pending modules S04)

/*
 * (Projects round 9 — Q-41) The portal's bell on the server: the facts its rows derive from, for one visitor's homes — only what reaches the
 * client (the newest shares of the schedule, published updates, the stages and choices put to them, invoices once sent) — and what this
 * person has read. Nothing is written here; the read marks are app/portal/bell-actions.ts.
 */

/** (Round 6's seam) The payments the client hears of — confirmed, or not received with the studio's reason — by invoice. Round 6 reads its
    `project_payments` here; until then there are none, and the invoice rows follow money part one's own states. */
async function paymentsFor(invoiceIds: string[]): Promise<Map<string, BellPayment[]>> {
  const out = new Map<string, BellPayment[]>()
  if (!invoiceIds.length) return out
  /* (integration, rounds 6 + 9) the client hears of a payment once the studio has answered it: Confirmed (when it was), or Not received with
     the studio's reason. Waiting proofs and reversals ring nothing here — the invoice row's own state carries those. */
  const rows = await db.select({ id: projectPayments.id, invoiceId: projectPayments.invoiceId, amountMinor: projectPayments.amountMinor, status: projectPayments.status,
    confirmedAt: projectPayments.confirmedAt, rejectedAt: projectPayments.rejectedAt, reason: projectPayments.rejectReason })
    .from(projectPayments).where(and(inArray(projectPayments.invoiceId, invoiceIds), inArray(projectPayments.status, ['confirmed', 'not_received'])))
  for (const r of rows) {
    const at = r.status === 'confirmed' ? r.confirmedAt : r.rejectedAt
    if (!at) continue
    const p: BellPayment = { id: r.id, amountMinor: r.amountMinor, at: at instanceof Date ? at.getTime() : Number(at) * 1000, state: r.status === 'confirmed' ? 'confirmed' : 'not_received', reason: r.reason ?? null }
    out.set(r.invoiceId, [...(out.get(r.invoiceId) ?? []), p])
  }
  return out
}

const changeCount = (v: unknown) => (Array.isArray(v) ? v.length : 0)

/** (gaps build D, item 3 — 1.0 I-106 · I-110 · I-111) What the studio sent the client to look at, confirm, sign or approve, as the bell rings it:
    the quotes and variation orders sent, the agreements out for signature or signed — each done once the client acted on it. */
export function bellDocumentsOf(f: Pick<HomeFacts, 'quotes' | 'contracts'>): BellDocument[] {
  const out: BellDocument[] = []
  for (const q of f.quotes) {
    if (!q.sentAt) continue
    const via = f.contracts.find((c) => c.fromQuoteId === q.id)
    const vo = q.kind === 'variation'
    out.push({ id: q.id, kind: vo ? 'variation' : 'quote', number: q.number, title: q.title, amountMinor: q.amountMinor, at: q.sentAt,
      href: via && !vo ? `/sign/${via.signToken}/quote` : confirmPath(confirmKeyOf({ id: q.id, confirmToken: q.confirmToken })), previewHref: `/quotes/${q.id}/preview`,
      done: q.status === 'Confirmed' || q.status === 'Signed' || !!q.declinedAt })
  }
  for (const c of f.contracts) {
    if (!c.sentAt) continue
    out.push({ id: c.id, kind: 'agreement', number: '', title: c.title, amountMinor: 0, at: c.sentAt,
      href: c.bundleId && c.status === 'Sent to Client' ? `/sign/bundle/${c.bundleId}` : `/sign/${c.signToken}`, previewHref: `/contracts/${c.id}/preview`, done: c.status === 'Signed' || !!c.toRead })   // (S44R, C9) a letter to keep asks nothing
  }
  return out
}

export async function fetchPortalBell(visitor: PortalVisitor, slug: string, look: PortalLook): Promise<{ rows: BellRow[]; unread: number }> {
  const now = Date.now()
  const links = visitor.links
  const leadIds = links.map((l) => l.leadId)
  if (!leadIds.length) return { rows: [], unread: 0 }
  const [ps, leadRows, facts, reads] = await Promise.all([
    db.select().from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt))),
    db.select({ id: leads.id, propertyAddress: leads.propertyAddress, leadAddress: leads.leadAddress, propertyType: leads.propertyType }).from(leads).where(inArray(leads.id, leadIds)),
    loadHomeFacts(links.map((l) => ({ linkId: l.linkId, leadId: l.leadId, lastOpenedAt: l.lastOpenedAt, readerIds: [visitor.homeownerId] })), slug, now),
    db.select({ key: portalBellReads.rowKey }).from(portalBellReads).where(eq(portalBellReads.homeownerId, visitor.homeownerId)),
  ])
  const pids = ps.map((p) => p.id)
  const [shares, ups, names, money] = await Promise.all([
    pids.length ? db.select({ id: projectScheduleShares.id, projectId: projectScheduleShares.projectId, at: projectScheduleShares.sharedAt, note: projectScheduleShares.note, changes: projectScheduleShares.changes })
      .from(projectScheduleShares).where(inArray(projectScheduleShares.projectId, pids)).orderBy(asc(projectScheduleShares.sharedAt)) : Promise.resolve([]),
    pids.length ? db.select({ id: projectUpdates.id, projectId: projectUpdates.projectId, title: projectUpdates.title, publishedAt: projectUpdates.publishedAt, createdAt: projectUpdates.createdAt, authorId: projectUpdates.authorId, openedAt: projectUpdates.clientOpenedAt })
      .from(projectUpdates).where(and(inArray(projectUpdates.projectId, pids), eq(projectUpdates.status, 'published'), isNull(projectUpdates.deletedAt))) : Promise.resolve([]),
    db.select({ id: members.id, name: members.name }).from(members),
    /* money part one's one set of numbers — each invoice's state (Sent · Overdue · Part paid · Paid once round 6 records payments) */
    Promise.all(ps.map(async (p) => [p.id, (await moneySummaryOf(p, now)).invoices] as const)),
  ])
  const sent = money.flatMap(([pid, list]) => list.filter((i) => i.sentAt && i.state !== 'void' && i.state !== 'draft').map((i) => ({ pid, i })))
  const pays = await paymentsFor(sent.map((x) => x.i.id))
  const credits = await creditsByProject(pids)   // (gaps build F2 — F2-Q9) the credit notes the client hears of
  const nameOf = new Map(names.map((m) => [m.id, firstName(m.name)]))
  const homes: BellHome[] = links.map((l) => {
    const p = ps.find((x) => x.leadId === l.leadId) ?? null
    const lead = leadRows.find((x) => x.id === l.leadId)
    const f = facts.get(l.leadId)
    const mine = p ? shares.filter((s) => s.projectId === p.id) : []
    const invoices: BellInvoice[] = p ? sent.filter((x) => x.pid === p.id).map(({ i }) => ({
      id: i.id, number: i.number ?? i.stageName, stage: i.stageName, amountMinor: i.amountMinor, sentAt: i.sentAt!, dueAt: i.dueAt, state: i.state, payments: pays.get(i.id) ?? [],
      overdueMinor: i.overdueMinor, owedMinor: Math.max(0, i.balanceMinor - i.toConfirmMinor),   // (fix-F, F-18)
      credits: (credits.get(p.id) ?? []).filter((c) => c.invoiceId === i.id && c.status === 'issued').map((c) => ({ id: c.id, number: c.number, amountMinor: c.amountMinor, at: c.issuedAt })),   // (gaps build F2)
    })) : []
    return {
      homeId: l.linkId, leadId: l.leadId, place: placeOf(lead?.propertyAddress ?? lead?.leadAddress) || lead?.propertyType || null,
      shares: mine.map((s, n) => ({ id: s.id, at: s.at.getTime(), first: n === 0, changes: changeCount(s.changes), note: s.note })),
      updates: p ? ups.filter((u) => u.projectId === p.id).map((u) => ({ id: u.id, title: u.title, at: (u.publishedAt ?? u.createdAt).getTime(), author: u.authorId ? nameOf.get(u.authorId) ?? null : null,
        opened: !!u.openedAt && (!u.publishedAt || u.openedAt.getTime() >= u.publishedAt.getTime()) })) : [],   // (fix-F, F-15) opened = its row read
      stages: (f?.schedule?.toConfirm ?? []).map((s) => ({ id: s.id, title: s.title, finishedOn: s.finishedOn, askedAt: s.askedAt })),
      choices: (f?.choices ?? []).filter((c) => c.status === 'shared').map((c) => ({ id: c.id, title: c.title, options: c.options, neededBy: c.neededBy, sharedAt: c.sharedAt })),
      invoices,
      /* (gaps build D, item 3) a quote shared, an agreement to sign, a variation order to approve, a file newly shown, designs newly shared */
      documents: f ? bellDocumentsOf(f) : [],
      files: (f?.files ?? []).map((x) => ({ id: x.id, name: x.name, at: x.shownAt, href: x.href ?? portalPath(slug, 'files'), opened: !!x.opened })),
      designs: (f?.designs ?? []).map((d) => ({ id: d.token, rooms: d.rooms, at: d.createdAt, sender: null, opened: d.views > 0 })),
      since: l.household ? l.invitedAt ?? null : null,   // (fix-F, F-16) someone from the household starts at their invite
      /* (parity map, CP-110) the studio's newest ask to answer the questionnaire */
      questions: f?.questions.askedAt && f.questions.asked ? { askedAt: f.questions.askedAt, open: f.questions.open } : null,
    }
  })
  /* (gaps build G, G-Q14) the floor plan's rows — a plan from the studio, its replies on the client's marks — while the section is on */
  if (!look.hidden.includes('floor-plan')) await Promise.all(homes.map(async (h) => { h.floorPlan = await floorPlanBellFacts(h.leadId, h.homeId) }))
  /* (gaps build H, H-Q10 · H-Q15) the studio's answers on the home's issues and the team's unread messages, while their sections are on */
  const threads = { issues: !look.hidden.includes('issues'), chat: !look.hidden.includes('messages') }
  if (threads.issues || threads.chat) await Promise.all(homes.map(async (h) => { const x = await clientBellFacts(h.leadId, visitor.homeownerId, threads); h.issues = x.issues; h.chat = x.chat }))
  /* (gaps build J, J-Q16) the 3D layouts shared on each home, while Designs is on */
  if (!look.hidden.includes('designs')) await Promise.all(homes.map(async (h) => { h.layouts = (await fetchPortalLayouts([h.leadId])).map((x) => ({ id: x.id, name: x.name, at: x.sharedAt, sender: x.sender, opened: x.seen })) }))
  const bell: BellFacts = { slug, studio: look.studio, now, homes }
  const all = bellRows(bell, look.hidden, new Set(reads.map((r) => r.key)))
  /* (S43B · F1-08 — her "fix all the pending things" 2026-10-15, as recommended) the studio's own addresses (a quote's or a contract's preview)
     ride only to a studio preview — never to a client's browser, where nothing reads them */
  const rows = visitor.preview ? all : all.map((r) => { const c = { ...r }; delete c.previewHref; return c })
  return { rows, unread: unreadOf(rows) }
}
