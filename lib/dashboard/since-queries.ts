import 'server-only'
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leadAssignees, leadFiles, leadMessages, leads, marketInsights, projectMessages, projectPayments, projectTickets, projectUpdateFiles, projectUpdates, projects, quotes } from '@/lib/db/schema'
import { inputDate, moneyCard } from '@/lib/format'
import { plural } from '@/lib/projects/schedule-model'
import { projectHref } from '@/lib/projects/tabs'
import { conversationKey } from '@/lib/projects/messages-model'
import { SINCE_LIST, sinceFrom, chipSentence, markOf, orderChips, sinceWordsOf, whenWords, type SinceChip, type SinceData, type SinceItem } from './since'
import type { DashCtx } from './context'

/*
 * (the Dashboard redesigned, 2026-10-26 — his mark P-02 · lane D1 owns this file) Since you were last here, read from the records' own dates
 * (no event log): new leads, quotes confirmed and opened by their client, contracts signed, payments a client says they made, site updates
 * the team published, client messages, tickets a client raised, a new Market Insights article (P-15) — each on what this member sees (Who sees
 * leads, the role's own pages: Accounting the money, Marketing the leads), with Mine (Q-07) on an Owner's or Admin's own leads and projects,
 * after the mark (`markOf` over `members.dashboard_seen_at` · `dashboard_since_at`). What the member did themselves is never news to them.
 * `markDashboardVisit` (app/dashboard/frame-actions.ts) moves the mark once the page has drawn.
 */

const first = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || 'A client'
const clip = (s: string, n: number) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t }

/** (the calm UI build 2026-10-27 — the audit's 1-18) whether a Market Insights article is news here — no: the studio's own events only. */
const SINCE_ARTICLES = false

export async function fetchSince(ctx: DashCtx): Promise<SinceData | null> {
  const { viewer, now, workspace, books, desk, seen } = ctx
  const mark = markOf(ctx.visit.seenAt, ctx.visit.sinceAt, now)
  const from = new Date(sinceFrom(mark, now))
  const mine = ctx.scope === 'mine'
  const sees = (leadId: string) => !seen || seen.has(leadId)
  const at = (d: Date | null | undefined) => d?.getTime() ?? now

  /* Who is on each lead (Mine reads it); the projects this member's records name, with their client */
  const leadsOn = workspace || books || desk
  if (!leadsOn) return null
  const [team, prj] = await Promise.all([
    mine ? db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees) : Promise.resolve([] as { leadId: string; memberId: string }[]),
    db.select({ id: projects.id, name: projects.name, leadId: projects.leadId, client: leads.name }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId)).where(and(isNull(projects.deletedAt), isNull(leads.deletedAt))),
  ])
  const onLead = new Map<string, string[]>()
  for (const t of team) onLead.set(t.leadId, [...(onLead.get(t.leadId) ?? []), t.memberId])
  const ours = (leadId: string) => sees(leadId) && (!mine || (onLead.get(leadId) ?? []).includes(viewer.id))
  const projectOf = new Map(prj.map((p) => [p.id, p]))

  const chips: SinceChip[] = []
  let fresh = 0

  /* ── new leads (by source): the Leads pipeline's own (direct leads are a project's, never the pipeline's) ── */
  if (workspace || desk) {
    const rows = (await ctx.read.visibleLeads()).filter((r) => r.createdAt.getTime() > from.getTime() && (!mine || r.assignees.some((m) => m.id === viewer.id)))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    if (rows.length) {
      const bySource = new Map<string, number>()
      for (const r of rows) { const s = r.source.trim() || 'No source'; bySource.set(s, (bySource.get(s) ?? 0) + 1) }
      const [topSource, topN] = [...bySource.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!
      const newest = rows[0]!
      const unseen = rows.filter((r) => r.seenAt === null).length
      const items: SinceItem[] = rows.map((r) => ({ key: r.id, label: r.name, sub: [r.source || null, whenWords(r.createdAt.getTime(), now)].filter(Boolean).join(' · '), href: ctx.from(`/leads/${r.id}`), at: r.createdAt.getTime() }))
      const words: SinceChip['words'] = rows.length === 1
        ? [{ t: 'New lead ' }, { t: newest.name, bold: true }, ...(newest.source ? [{ t: ` · ${newest.source}` }] : [])]
        : [{ t: `${rows.length} new leads`, bold: true }, ...(topN === rows.length ? [{ t: ` · all from ${topSource}` }] : topN >= 2 ? [{ t: ` · ${topN} from ${topSource}` }] : [])]
      chips.push({
        key: `leads:${newest.id}`, kind: 'leads', icon: 'person_add', words, aria: '', at: newest.createdAt.getTime(), fresh: unseen > 0, count: rows.length,
        href: rows.length === 1 ? items[0]!.href : `/leads?date=custom&start=${encodeURIComponent(inputDate(from))}`,
        ...(rows.length > 1 ? { items: items.slice(0, SINCE_LIST), all: { label: `Open the ${rows.length} in Leads`, href: `/leads?date=custom&start=${encodeURIComponent(inputDate(from))}` } } : {}),
      })
      fresh += rows.length
    }
  }

  if (workspace) {
    const [confirmed, opened, signed] = await Promise.all([
      /* quotes and variation orders their client confirmed on the confirmation link (a studio's own Mark as confirmed is the studio's act) */
      db.select({ id: quotes.id, number: quotes.number, leadId: quotes.leadId, client: leads.name, at: quotes.confirmedAt, via: quotes.confirmedVia, kind: quotes.kind, projectId: quotes.projectId })
        .from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
        .where(and(isNull(quotes.deletedAt), isNull(leads.deletedAt), gt(quotes.confirmedAt, from))).orderBy(desc(quotes.confirmedAt)),
      /* quotes their client opened on a client link and has not answered yet */
      db.select({ id: quotes.id, number: quotes.number, leadId: quotes.leadId, client: leads.name, at: quotes.clientLastViewedAt, count: quotes.clientViewCount, status: quotes.status })
        .from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
        .where(and(isNull(quotes.deletedAt), isNull(leads.deletedAt), isNull(quotes.confirmedAt), gt(quotes.clientLastViewedAt, from))).orderBy(desc(quotes.clientLastViewedAt)),
      /* contracts signed — by the client online, or marked signed by someone else in the studio */
      db.select({ id: contracts.id, leadId: contracts.leadId, client: leads.name, at: contracts.signedAt, kind: contracts.signatureKind, markedBy: contracts.markedBy, quoteId: contracts.fromQuoteId })
        .from(contracts).innerJoin(leads, eq(leads.id, contracts.leadId))
        .where(and(isNull(contracts.deletedAt), isNull(leads.deletedAt), gt(contracts.signedAt, from))).orderBy(desc(contracts.signedAt)),
    ])
    for (const q of confirmed.filter((x) => (x.via === null || x.via === 'link') && ours(x.leadId)).slice(0, 2)) {
      chips.push({ key: `quote-confirmed:${q.id}:${at(q.at)}`, kind: 'quote-confirmed', icon: 'verified', words: [{ t: first(q.client) }, { t: ' confirmed ' }, { t: q.number, bold: true }],
        aria: '', href: q.kind === 'variation' && q.projectId ? ctx.from(`${projectHref(q.projectId, 'money')}?open=${encodeURIComponent(q.id)}`) : ctx.from(`/quotes/${q.id}`), at: at(q.at), fresh: true, rowKey: q.id })
      fresh++
    }
    for (const q of opened.filter((x) => x.status === 'Sent to Client' && ours(x.leadId)).slice(0, 2)) {
      chips.push({ key: `quote-opened:${q.id}:${at(q.at)}`, kind: 'quote-opened', icon: 'visibility', words: [{ t: first(q.client) }, { t: ' opened ' }, { t: q.number, bold: true }, ...(q.count >= 2 ? [{ t: ` · ${q.count} times` }] : [])],
        aria: '', href: ctx.from(`/quotes/${q.id}`), at: at(q.at), fresh: true, rowKey: q.id })
      fresh++
    }
    const numbers = new Map((signed.length ? await db.select({ id: quotes.id, number: quotes.number }).from(quotes).where(inArray(quotes.id, signed.map((c) => c.quoteId).filter((x): x is string => !!x))) : []).map((q) => [q.id, q.number]))
    for (const c of signed.filter((x) => (x.kind !== null || (x.markedBy !== null && x.markedBy !== viewer.id)) && ours(x.leadId)).slice(0, 2)) {
      const n = c.quoteId ? numbers.get(c.quoteId) : null
      chips.push({ key: `contract-signed:${c.id}`, kind: 'contract-signed', icon: 'draw', words: [{ t: first(c.client), bold: true }, { t: ' signed the contract' }, ...(n ? [{ t: ` · ${n}` }] : [])],
        aria: '', href: ctx.from(`/contracts/${c.id}`), at: at(c.at), fresh: true, rowKey: c.id })
      fresh++
    }
  }

  /* ── a client says they paid (Money's own record; Accounting's too — the books are theirs) ── */
  if (workspace || books) {
    const paid = await db.select({ id: projectPayments.id, projectId: projectPayments.projectId, amount: projectPayments.amountMinor, status: projectPayments.status, at: projectPayments.createdAt })
      .from(projectPayments).where(and(eq(projectPayments.source, 'client'), gt(projectPayments.createdAt, from))).orderBy(desc(projectPayments.createdAt))
    for (const p of paid.filter((x) => x.status !== 'reversed')) {
      const pr = projectOf.get(p.projectId)
      if (!pr || !ours(pr.leadId)) continue
      if (chips.filter((c) => c.kind === 'payment-said').length >= 2) break
      const waits = p.status === 'to_confirm'
      chips.push({ key: `payment-said:${p.id}:${p.status}`, kind: 'payment-said', icon: 'payments', words: [{ t: first(pr.client) }, { t: ' says they paid ' }, { t: moneyCard(p.amount), bold: true }, ...(waits ? [{ t: ' · to confirm' }] : [])],
        aria: '', href: ctx.from(`${projectHref(p.projectId, 'money')}?open=${encodeURIComponent(p.id)}`), at: at(p.at), fresh: waits, rowKey: waits ? p.id : undefined })
      if (waits) fresh++
    }
  }

  if (workspace) {
    const [ups, msgs, leadMsgs, tickets, articles] = await Promise.all([
      db.select({ id: projectUpdates.id, projectId: projectUpdates.projectId, title: projectUpdates.title, authorId: projectUpdates.authorId, at: projectUpdates.publishedAt })
        .from(projectUpdates).where(and(eq(projectUpdates.status, 'published'), isNull(projectUpdates.deletedAt), gt(projectUpdates.publishedAt, from))).orderBy(desc(projectUpdates.publishedAt)),
      db.select({ projectId: projectMessages.projectId, author: projectMessages.authorName, at: projectMessages.createdAt }).from(projectMessages)
        .where(and(eq(projectMessages.authorKind, 'client'), eq(projectMessages.channel, 'client'), isNull(projectMessages.deletedAt), gt(projectMessages.createdAt, from))).orderBy(desc(projectMessages.createdAt)),
      db.select({ leadId: leadMessages.leadId, author: leadMessages.authorName, at: leadMessages.createdAt, lead: leads.name }).from(leadMessages).innerJoin(leads, eq(leads.id, leadMessages.leadId))
        .where(and(eq(leadMessages.authorKind, 'client'), isNull(leadMessages.deletedAt), isNull(leads.deletedAt), gt(leadMessages.createdAt, from))).orderBy(desc(leadMessages.createdAt)),
      db.select({ id: projectTickets.id, projectId: projectTickets.projectId, number: projectTickets.number, subject: projectTickets.subject, by: projectTickets.raisedByName, at: projectTickets.createdAt })
        .from(projectTickets).where(and(eq(projectTickets.raisedKind, 'client'), gt(projectTickets.createdAt, from))).orderBy(desc(projectTickets.createdAt)),
      db.select({ id: marketInsights.id, title: marketInsights.title, at: marketInsights.publishedAt }).from(marketInsights)
        .where(and(isNull(marketInsights.removedAt), gt(marketInsights.publishedAt, from))).orderBy(desc(marketInsights.publishedAt)),
    ])

    /* ── tickets a client raised (also a Needs you row while it waits on the studio) ── */
    const tix = tickets.filter((t) => { const pr = projectOf.get(t.projectId); return !!pr && ours(pr.leadId) })
    if (tix.length === 1) {
      const t = tix[0]!, pr = projectOf.get(t.projectId)!
      chips.push({ key: `ticket:${t.id}`, kind: 'ticket', icon: 'handyman', words: [{ t: first(t.by || pr.client) }, { t: ' raised ' }, { t: t.number, bold: true }, { t: ` · ${clip(t.subject, 32)}` }],
        aria: '', href: ctx.from(`${projectHref(t.projectId, 'tickets')}?open=${encodeURIComponent(t.id)}`), at: t.at.getTime(), fresh: true, rowKey: t.id })
    } else if (tix.length > 1) {
      chips.push({ key: `ticket:${tix[0]!.id}`, kind: 'ticket', icon: 'handyman', words: [{ t: plural(tix.length, 'ticket'), bold: true }, { t: ' raised' }], aria: '', href: ctx.from('/tickets'), at: tix[0]!.at.getTime(), fresh: true, count: tix.length,
        items: tix.slice(0, SINCE_LIST).map((t) => ({ key: t.id, label: `${t.number} · ${clip(t.subject, 40)}`, sub: `${first(t.by || projectOf.get(t.projectId)?.client)} · ${whenWords(t.at.getTime(), now)}`, href: ctx.from(`${projectHref(t.projectId, 'tickets')}?open=${encodeURIComponent(t.id)}`), at: t.at.getTime() })),
        all: { label: 'Open Tickets', href: ctx.from('/tickets') } })
    }
    fresh += tix.length

    /* ── client messages, by conversation (a project's client conversation, a lead's) ── */
    type Conv = { key: string; who: string; n: number; at: number; href: string; rowKey?: string }
    const convs = new Map<string, Conv>()
    for (const m of msgs) {
      const pr = projectOf.get(m.projectId)
      if (!pr || !ours(pr.leadId)) continue
      const k = conversationKey('client', m.projectId)
      const c = convs.get(k) ?? { key: k, who: first(pr.client), n: 0, at: m.at.getTime(), href: ctx.from(`/chat?open=${encodeURIComponent(k)}`), rowKey: `project:${m.projectId}:message` }
      c.n++; convs.set(k, c)
    }
    for (const m of leadMsgs) {
      if (!ours(m.leadId)) continue
      const k = conversationKey('lead', m.leadId)
      const c = convs.get(k) ?? { key: k, who: first(m.lead), n: 0, at: m.at.getTime(), href: ctx.from(`/chat?open=${encodeURIComponent(k)}`) }
      c.n++; convs.set(k, c)
    }
    const list = [...convs.values()].sort((a, b) => b.at - a.at)
    if (list.length === 1) {
      const c = list[0]!
      chips.push({ key: `client-message:${c.key}:${c.at}`, kind: 'client-message', icon: 'chat', words: c.n === 1 ? [{ t: 'A message from ' }, { t: c.who, bold: true }] : [{ t: `${c.n} messages`, bold: true }, { t: ` from ${c.who}` }],
        aria: '', href: c.href, at: c.at, fresh: true, rowKey: c.rowKey, count: c.n })
    } else if (list.length > 1) {
      const n = list.reduce((s, c) => s + c.n, 0)
      chips.push({ key: `client-message:${list[0]!.key}:${list[0]!.at}`, kind: 'client-message', icon: 'chat', words: [{ t: `${n} client messages`, bold: true }], aria: '', href: ctx.from('/chat?show=unread'), at: list[0]!.at, fresh: true, count: n,
        items: list.slice(0, SINCE_LIST).map((c) => ({ key: c.key, label: c.who, sub: `${plural(c.n, 'message')} · ${whenWords(c.at, now)}`, href: c.href, at: c.at })), all: { label: 'Open Messages', href: ctx.from('/chat?show=unread') } })
    }
    fresh += list.length

    /* ── site updates the team published (photos named when they carry them) ── */
    const shown = ups.filter((u) => u.authorId !== viewer.id).filter((u) => { const pr = projectOf.get(u.projectId); return !!pr && ours(pr.leadId) })
    if (shown.length) {
      const photos = await db.select({ updateId: projectUpdateFiles.updateId, kind: leadFiles.kind }).from(projectUpdateFiles).innerJoin(leadFiles, eq(leadFiles.id, projectUpdateFiles.fileId))
        .where(and(inArray(projectUpdateFiles.updateId, shown.map((u) => u.id)), isNull(leadFiles.deletedAt)))
      const pics = (id: string) => photos.filter((p) => p.updateId === id && p.kind === 'image').length
      const byProject = new Map<string, typeof shown>()
      for (const u of shown) byProject.set(u.projectId, [...(byProject.get(u.projectId) ?? []), u])
      const open = (u: (typeof shown)[number]) => ctx.from(`${projectHref(u.projectId, 'updates')}?open=${encodeURIComponent(u.id)}`)
      if (byProject.size === 1) {
        const [pid, list1] = [...byProject.entries()][0]!
        const pr = projectOf.get(pid)!, n = list1.reduce((s, u) => s + pics(u.id), 0), u0 = list1[0]!
        const who = pr.client.trim() || pr.name
        const words: SinceChip['words'] = n ? [{ t: `${plural(n, 'site photo')}`, bold: true }, { t: ` · ${who}` }] : list1.length === 1 ? [{ t: 'Site update · ' }, { t: who, bold: true }] : [{ t: plural(list1.length, 'site update'), bold: true }, { t: ` · ${who}` }]
        chips.push({ key: `site-update:${u0.id}`, kind: 'site-update', icon: 'photo_camera', words, aria: '', href: list1.length === 1 ? open(u0) : ctx.from(projectHref(pid, 'updates')), at: at(u0.at), fresh: true, count: list1.length,
          ...(list1.length > 1 ? { items: list1.slice(0, SINCE_LIST).map((u) => ({ key: u.id, label: `“${clip(u.title, 40)}”`, sub: whenWords(at(u.at), now), href: open(u), at: at(u.at) })) } : {}) })
      } else {
        chips.push({ key: `site-update:${shown[0]!.id}`, kind: 'site-update', icon: 'photo_camera', words: [{ t: plural(shown.length, 'site update'), bold: true }, { t: ` · ${plural(byProject.size, 'project')}` }], aria: '', href: open(shown[0]!), at: at(shown[0]!.at), fresh: true, count: shown.length,
          items: shown.slice(0, SINCE_LIST).map((u) => ({ key: u.id, label: `“${clip(u.title, 40)}”`, sub: `${projectOf.get(u.projectId)?.client ?? ''} · ${whenWords(at(u.at), now)}`, href: open(u), at: at(u.at) })) })
      }
      fresh += shown.length
    }

    /* ── a new Market Insights article (P-15: the article left the page; its news stays a chip) ── (the calm UI build 2026-10-27 — the audit's
       1-18) Since names only the studio's own events — new leads, what clients did, what the team published; the editors' articles stay in
       Tools › Market Insights (in Mine an article title filled the greeting's one link). The read stays, so the developers' switch is one word. */
    if (SINCE_ARTICLES && articles.length) {
      const a = articles[0]!
      chips.push(articles.length === 1
        ? { key: `article:${a.id}`, kind: 'article', icon: 'trending_up', words: [{ t: 'New in Market Insights · ' }, { t: clip(a.title, 40), bold: true }], aria: '', href: ctx.from(`/market-insights/${a.id}`), at: a.at.getTime(), fresh: true }
        : { key: `article:${a.id}`, kind: 'article', icon: 'trending_up', words: [{ t: plural(articles.length, 'new article'), bold: true }, { t: ' in Market Insights' }], aria: '', href: ctx.from('/market-insights'), at: a.at.getTime(), fresh: true, count: articles.length,
            items: articles.slice(0, SINCE_LIST).map((x) => ({ key: x.id, label: clip(x.title, 48), sub: whenWords(x.at.getTime(), now), href: ctx.from(`/market-insights/${x.id}`), at: x.at.getTime() })), all: { label: 'Open Market Insights', href: ctx.from('/market-insights') } })
      fresh += articles.length
    }
  }

  const ordered = orderChips(chips).map((c) => ({ ...c, aria: `${chipSentence(c.words)} — ${c.items ? 'see which' : 'open it'}` }))
  return { since: mark, chips: ordered, fresh, sinceWords: sinceWordsOf(mark, now) }
}
