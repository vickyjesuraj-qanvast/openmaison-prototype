import 'server-only'   // (REG-286) libSQL never reaches the browser bundle
import { and, eq, inArray, isNull, like, or, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractTemplates, contracts, leadFiles, leadNotes, leadTasks, leads, members, paymentTemplates, priceBookItems, priceBookSections, projectRooms,
  quoteComparisons, quoteTemplates, quoteTextTemplates, quotes, studioMaterials, taskTemplates, visualizerDesigns,
} from '@/lib/db/schema'
import { projects, spaceLayouts, taskAssignees } from '@/lib/db/schema'   // (gaps build J) · (parity map, FB-114) a task's assignees
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { isAccounting, isMarketing, opensPath } from '@/lib/settings/roles'
import { itemVisible } from '@/lib/company/price-book-rules'
import { displayDate, displayDue, moneySGD, phoneTyped } from '@/lib/format'
import { ACCOUNTING_KINDS, MARKETING_KINDS, ALL_LIMIT, KIND_LABEL, KIND_ORDER, SCOPE_LIMIT, SCOPES, rankOf, termsOf, type SearchGroup, type SearchHit, type SearchKind, type SearchResult, type SearchScope } from './model'

/**
 * (REG-709) The global search on the server: every kind the scope holds, each read once with the query's longest word as a LIKE on the text
 * the result shows (a word with a digit also against the phones), then ranked with every word (`rankOf`, the house rule). Whoever is asking
 * sees only what their lists show them — the leads they may see (`visibleLeadIds`, Settings › Who sees leads) and everything hanging off
 * those leads; a proposed Price book item only to its maker, an Owner or an Admin; nothing deleted. Pages are matched in the browser.
 */
const strip = (html: string | null | undefined) => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const pct = (t: string) => `%${t}%`   // a `%` or `_` typed only widens the LIKE; the rank below is exact

export async function searchStudio(query: string, scope: SearchScope): Promise<SearchResult> {
  const q = query.trim().slice(0, 80)
  const terms = termsOf(q)
  if (!terms.length) return { query: q, scope, groups: [] }
  const viewer = await fetchViewer()
  const visible = await visibleLeadIds(viewer)
  const seesLead = (id: string | null | undefined) => !!id && (!visible || visible.has(id))
  const key = [...terms].sort((a, b) => b.length - a.length)[0]!
  const k = pct(key)
  const kd = key.replace(/\D/g, '')
  const kinds = new Set<SearchKind>(scope === 'all' ? KIND_ORDER.filter((x) => x !== 'page') : [...(SCOPES.find((s) => s.key === scope)?.kinds ?? [])])
  /* (parity map, FB-114) Accounting finds the books only — a project (its Money), their own tasks, Finance's records — whatever scope is asked */
  const acct = isAccounting(viewer.role)
  if (acct) for (const x of [...kinds]) if (!ACCOUNTING_KINDS.includes(x)) kinds.delete(x)
  /* (S44O — call C6) Marketing finds the leads' own records only — a lead, its tasks, notes and files — whatever scope is asked */
  const desk = isMarketing(viewer.role)
  if (desk) for (const x of [...kinds]) if (!MARKETING_KINDS.includes(x)) kinds.delete(x)
  const anyLike = (...cols: Parameters<typeof like>[0][]) => or(...cols.map((c) => like(c, k))) as SQL

  /* The lead names every other kind shows beside it — one read. */
  const leadRows = await db.select({ id: leads.id, name: leads.name, stage: leads.stage }).from(leads).where(isNull(leads.deletedAt))
  const leadById = new Map(leadRows.filter((l) => seesLead(l.id)).map((l) => [l.id, l]))
  const leadIdsNamed = leadRows.filter((l) => leadById.has(l.id) && l.name.toLowerCase().includes(key)).map((l) => l.id)
  const byLead = (col: Parameters<typeof inArray>[0]) => (leadIdsNamed.length ? inArray(col, leadIdsNamed) : undefined)

  const hits: SearchHit[] = []
  const push = (h: Omit<SearchHit, 'rank'>, others: (string | null | undefined)[] = [], phones: (string | null | undefined)[] = []) => {
    const rank = rankOf(q, h.title, [h.sub, ...others], phones)
    if (rank !== null) hits.push({ ...h, rank })
  }
  const jobs: Promise<void>[] = []

  if (kinds.has('lead')) jobs.push((async () => {
    const rows = await db.select().from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false), or(anyLike(leads.name, leads.email, leads.source, leads.propertyType, leads.propertyAddress, leads.leadAddress, leads.area, leads.customerId), kd ? like(leads.phone, `%${kd}%`) : undefined)))
    for (const l of rows) {
      if (!seesLead(l.id)) continue
      push({ kind: 'lead', id: l.id, title: l.name, sub: [phoneTyped(l.phone), l.propertyType, l.source].filter(Boolean).join(' · '), chip: l.stage, href: `/leads/${l.id}`, icon: 'person' },
        [l.email, l.propertyAddress, l.leadAddress, l.area, l.customerId], [l.phone])
    }
  })())

  /* (REG-922, Projects round 1) A project — its name, number, client, phone, property and type; Who sees is its lead's rule. */
  if (kinds.has('project')) jobs.push((async () => {
    const { searchableProjects } = await import('@/lib/projects/queries')
    const { STAGE_LABEL, isProjectStage } = await import('@/lib/projects/model')
    /* (parity map, FR-115 — 1.0 matched a project on its assignee's name) a member's name finds the projects they're on; the line under the
       project names them when that is what matched, so the find is never a mystery */
    const { leadAssignees } = await import('@/lib/db/schema')
    const team = await db.select({ leadId: leadAssignees.leadId, name: members.name }).from(leadAssignees).innerJoin(members, eq(members.id, leadAssignees.memberId))
    const teamOf = new Map<string, string[]>()
    for (const t of team) teamOf.set(t.leadId, [...(teamOf.get(t.leadId) ?? []), t.name])
    for (const p of await searchableProjects()) {
      if (!seesLead(p.leadId)) continue
      const stage = isProjectStage(p.stage) ? STAGE_LABEL[p.stage] : null
      const names = teamOf.get(p.leadId) ?? []
      const base = [p.number, p.client, p.property].filter(Boolean).join(' · ')
      const byMember = names.filter((n) => terms.some((t) => n.toLowerCase().includes(t)) && !terms.every((t) => `${p.name} ${base}`.toLowerCase().includes(t)))
      push({ kind: 'project', id: p.id, title: p.name, sub: byMember.length ? `${base} · with ${byMember.join(', ')}` : base, chip: stage, href: `/projects/${p.id}`, icon: 'business_center' },
        [p.client, p.property, p.projectType, ...p.household.map((h) => h.name), ...names], [p.phone, ...p.household.map((h) => h.phone)])   // (fix-G, G-31) the household too
    }
  })())

  /* (parity map, UC-069) a message by its words — on a lead the viewer sees; it opens its conversation at it (`?at=`) */
  if (kinds.has('message')) jobs.push((async () => {
    const { messageHits } = await import('@/lib/projects/conversations')
    for (const h of await messageHits(key, seesLead, viewer.id)) { const { others, ...hit } = h; push(hit, others) }   // (pending modules S26) the studio's own conversations too
  })())

  /* (fix-D, D-12) an invoice or a receipt by its number — its row on the project's Money tab; only for whoever sees that project's money (F-17) */
  if (kinds.has('project') && /\d/.test(key)) jobs.push((async () => {
    const { moneyNumberHits } = await import('@/lib/projects/money-visibility')
    for (const h of await moneyNumberHits(key, viewer, seesLead)) push({ kind: 'project', ...h })
  })())

  /* (gaps build H, H-Q26) a ticket by its number, subject or words — on a project the viewer sees; it opens in its project's Tickets tab */
  if (kinds.has('ticket')) jobs.push((async () => {
    const { ticketHits } = await import('@/lib/projects/tickets-search')
    for (const h of await ticketHits(key, seesLead)) { const { others, ...hit } = h; push(hit, others) }
  })())
  /* (gaps build F1) money out: a vendor, a purchase order, a supplier bill — only what the viewer's Finance shows them */
  if (kinds.has('finance')) jobs.push((async () => {
    const { financeHits } = await import('@/lib/finance/search')
    for (const h of await financeHits(key, viewer, seesLead)) { const { others, phones, ...hit } = h; push(hit, others, phones) }
  })())
  /* (gaps build F2 — F2-Q15) a credit note by its number — on a project whose money the viewer sees */
  if (kinds.has('finance')) jobs.push((async () => {
    const { creditHits } = await import('@/lib/finance/search-books')
    for (const h of await creditHits(key, viewer, seesLead)) { const { others, phones, ...hit } = h; push(hit, others, phones) }
  })())

  if (kinds.has('quote')) jobs.push((async () => {
    /* (fix-G, G-10) a variation order is never a quote (REG-1000): it is found with its project, below */
    const rows = await db.select().from(quotes).where(and(isNull(quotes.deletedAt), eq(quotes.kind, 'quote'), or(anyLike(quotes.title, quotes.number, quotes.projectRef, quotes.client2Name), byLead(quotes.leadId))))
    for (const r of rows) {
      const lead = leadById.get(r.leadId); if (!lead) continue
      push({ kind: 'quote', id: r.id, title: r.title, sub: [r.number, lead.name, r.amountMinor ? moneySGD(r.amountMinor) : null].filter(Boolean).join(' · '), chip: r.status, href: `/quotes/${r.id}`, icon: 'request_quote' }, [r.projectRef, r.client2Name])
    }
  })())

  if (kinds.has('xray')) jobs.push((async () => {
    const rows = await db.select({ id: quoteComparisons.id, leadId: quoteComparisons.leadId, otherStudio: quoteComparisons.otherStudio, yourLabel: quoteComparisons.yourLabel, createdAt: quoteComparisons.createdAt }).from(quoteComparisons)
      .where(or(anyLike(quoteComparisons.otherStudio, quoteComparisons.yourLabel), byLead(quoteComparisons.leadId)))
    for (const r of rows) {
      const lead = r.leadId ? leadById.get(r.leadId) : null; if (!lead) continue
      push({ kind: 'xray', id: r.id, title: `${lead.name} · vs ${r.otherStudio ?? 'another studio'}`, sub: [r.yourLabel, displayDate(r.createdAt)].filter(Boolean).join(' · '), href: `/quote-x-ray/${r.id}`, icon: 'scan' })
    }
  })())

  if (kinds.has('contract')) jobs.push((async () => {
    const rows = await db.select({ id: contracts.id, leadId: contracts.leadId, title: contracts.title, status: contracts.status, recipientName: contracts.recipientName, updatedAt: contracts.updatedAt }).from(contracts)
      .where(and(isNull(contracts.deletedAt), or(anyLike(contracts.title, contracts.recipientName), byLead(contracts.leadId))))
    for (const r of rows) {
      const lead = leadById.get(r.leadId); if (!lead) continue
      push({ kind: 'contract', id: r.id, title: r.title, sub: [lead.name, r.updatedAt ? `updated ${displayDate(r.updatedAt)}` : null].filter(Boolean).join(' · '), chip: r.status, href: `/contracts/${r.id}`, icon: 'contract' }, [r.recipientName])
    }
  })())

  if (kinds.has('task')) jobs.push((async () => {
    const rows = await db.select({ id: leadTasks.id, leadId: leadTasks.leadId, title: leadTasks.title, description: leadTasks.description, dueAt: leadTasks.dueAt, done: leadTasks.done }).from(leadTasks)
      .where(or(anyLike(leadTasks.title, leadTasks.description), byLead(leadTasks.leadId)))
    /* (parity map, FB-114) Accounting: their own tasks, opened on their Tasks page */
    const mine = acct ? new Set((await db.select({ id: taskAssignees.taskId }).from(taskAssignees).where(eq(taskAssignees.memberId, viewer.id))).map((t) => t.id)) : null
    for (const r of rows) {
      if (mine && !mine.has(r.id)) continue
      const lead = r.leadId ? leadById.get(r.leadId) : null
      if (r.leadId && !lead) continue
      push({ kind: 'task', id: r.id, title: r.title, sub: [lead?.name ?? 'Studio', r.dueAt ? `due ${displayDue(r.dueAt)}` : null].filter(Boolean).join(' · '), chip: r.done ? 'Done' : null,
        href: lead && !acct ? `/leads/${lead.id}/tasks?open=${r.id}` : `/tasks?open=${r.id}`, icon: 'task_alt' }, [r.description])
    }
  })())

  if (kinds.has('note')) jobs.push((async () => {
    const rows = await db.select({ id: leadNotes.id, leadId: leadNotes.leadId, kind: leadNotes.kind, title: leadNotes.title, body: leadNotes.body, outcome: leadNotes.outcome, channel: leadNotes.channel, createdAt: leadNotes.createdAt }).from(leadNotes)
      .where(or(anyLike(leadNotes.title, leadNotes.body, leadNotes.outcome, leadNotes.channel), byLead(leadNotes.leadId)))
    for (const r of rows) {
      const lead = leadById.get(r.leadId); if (!lead) continue
      const contact = r.kind === 'contact'
      const body = strip(r.body)
      push({ kind: 'note', id: r.id, title: r.title?.trim() || (contact ? `Contact log${r.outcome ? ` · ${r.outcome}` : ''}` : body.slice(0, 60) || 'Note'), sub: [lead.name, contact ? 'Contact log' : 'Note', displayDate(r.createdAt)].join(' · '),
        href: `/leads/${lead.id}/notes?open=${r.id}`, icon: contact ? 'call_log' : 'sticky_note_2' }, [body, r.outcome, r.channel])
    }
  })())

  /* (pending modules S23) a meeting: by what it is for, where, its notes, or its lead's name */
  if (kinds.has('meeting')) jobs.push((async () => {
    const { meetings: meetingRowsT } = await import('@/lib/db/schema')
    const { aimLabel, standingOf } = await import('@/lib/meetings/model')
    const rows = await db.select({ id: meetingRowsT.id, leadId: meetingRowsT.leadId, aim: meetingRowsT.aim, aimNote: meetingRowsT.aimNote, whereKind: meetingRowsT.whereKind, place: meetingRowsT.place, notes: meetingRowsT.notes, status: meetingRowsT.status, startsAt: meetingRowsT.startsAt, endsAt: meetingRowsT.endsAt, briefAt: meetingRowsT.briefAt, briefSavedAt: meetingRowsT.briefSavedAt }).from(meetingRowsT)
      .where(and(isNull(meetingRowsT.deletedAt), or(anyLike(meetingRowsT.aim, meetingRowsT.aimNote, meetingRowsT.whereKind, meetingRowsT.place, meetingRowsT.notes), byLead(meetingRowsT.leadId))))
    const now = Date.now()
    for (const r of rows) {
      const lead = leadById.get(r.leadId); if (!lead) continue
      const label = aimLabel(r.aim) === 'Other' ? 'Meeting' : aimLabel(r.aim)
      push({ kind: 'meeting', id: r.id, title: `${label} with ${lead.name}`, sub: [displayDate(r.startsAt), r.whereKind, r.place].filter(Boolean).join(' · '),
        chip: standingOf({ status: r.status, startsAt: r.startsAt.getTime(), endsAt: r.endsAt?.getTime() ?? null, briefAt: r.briefAt?.getTime() ?? null, briefSavedAt: r.briefSavedAt?.getTime() ?? null }, now).word,
        href: `/meetings/${r.id}`, icon: 'event' }, [r.aimNote, strip(r.notes).slice(0, 400), r.aim.replace(/_/g, ' ')])
    }
  })())

  /* (pending modules S24) the Marketplace — a live brand by its name, line, categories and services; a live deal by its words and its brand's name */
  if (kinds.has('brand')) jobs.push((async () => {
    const { marketplaceRecords } = await import('@/lib/marketplace/queries')
    const { dealWhen } = await import('@/lib/marketplace/model')
    const { brands, deals } = await marketplaceRecords()
    const now = Date.now()
    const cats = (raw: string) => { try { const a = JSON.parse(raw) as unknown; return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string').join(' · ') : '' } catch { return '' } }
    for (const b of brands) push({ kind: 'brand', id: b.id, title: b.name, sub: ['Brand', cats(b.categories)].filter(Boolean).join(' · '), href: `/marketplace/${b.id}`, icon: 'storefront' }, [b.tagline, b.services])
    for (const d of deals) push({ kind: 'brand', id: d.id, title: d.title, sub: ['Deal', d.brandName, dealWhen({ startsAt: d.startsAt?.getTime() ?? null, endsAt: d.endsAt?.getTime() ?? null }, now)].filter(Boolean).join(' · '), href: `/marketplace?view=deals&deal=${d.id}`, icon: 'sell' }, [d.description])
  })())

  /* (pending modules S25) Market Insights — a live article by what its row shows (REG-274): its title and its category. Its first lines and
     tags are the page's own search (Market Insights' bar); here they'd answer "new lead" with an article about every new enquiry. */
  if (kinds.has('article')) jobs.push((async () => {
    const { liveArticles } = await import('@/lib/market-insights/queries')
    const { categoryLabel } = await import('@/lib/market-insights/model')
    for (const a of await liveArticles()) push({ kind: 'article', id: a.id, title: a.title, sub: [categoryLabel(a.category), a.sample ? 'Sample' : null, displayDate(new Date(a.publishedAt))].filter(Boolean).join(' · '), href: `/market-insights/${a.id}`, icon: 'article' })
  })())

  if (kinds.has('file')) jobs.push((async () => {
    const rows = await db.select({ id: leadFiles.id, leadId: leadFiles.leadId, kind: leadFiles.kind, name: leadFiles.name }).from(leadFiles)
      .where(and(isNull(leadFiles.deletedAt), or(anyLike(leadFiles.name), byLead(leadFiles.leadId))))
    for (const r of rows) {
      const lead = leadById.get(r.leadId); if (!lead) continue
      const folder = r.kind === 'folder'
      push({ kind: 'file', id: r.id, title: r.name, sub: `${lead.name} · ${folder ? 'Folder' : 'File'}`, href: folder ? `/leads/${lead.id}/files?folder=${r.id}` : `/leads/${lead.id}/files/${r.id}`, icon: folder ? 'folder' : r.kind === 'image' ? 'image' : 'description' })
    }
  })())

  if (kinds.has('design')) jobs.push((async () => {
    const [designs, rooms] = await Promise.all([
      db.select().from(visualizerDesigns).where(isNull(visualizerDesigns.deletedAt)),
      db.select({ designId: projectRooms.designId, name: projectRooms.name }).from(projectRooms).where(isNull(projectRooms.deletedAt)),
    ])
    for (const d of designs) {
      const rs = rooms.filter((r) => r.designId === d.id).map((r) => r.name)
      if (d.kind === 'lead' ? !(d.leadId && leadById.has(d.leadId)) || rs.length === 0 : d.sourceLeadId ? !seesLead(d.sourceLeadId) : false) continue
      const lead = d.leadId ? leadById.get(d.leadId) : null
      push({ kind: 'design', id: d.id, title: lead?.name ?? d.name ?? 'Untitled design', sub: [d.kind === 'lead' ? 'Lead' : 'Personal', rs.join(', ')].filter(Boolean).join(' · '), href: `/visualizer/${d.id}`, icon: 'wand_shine' }, [d.name])
    }
  })())

  /* (gaps build J, J-Q17) the 3D Space Planner's layouts — a project's by Who sees leads (its lead), a personal one for every member */
  if (kinds.has('layout')) jobs.push((async () => {
    const [rows, projs] = await Promise.all([
      db.select({ id: spaceLayouts.id, name: spaceLayouts.name, projectId: spaceLayouts.projectId, leadId: spaceLayouts.leadId, isTemplate: spaceLayouts.isTemplate }).from(spaceLayouts).where(isNull(spaceLayouts.deletedAt)),
      db.select({ id: projects.id, name: projects.name, number: projects.number, deletedAt: projects.deletedAt }).from(projects),
    ])
    for (const l of rows) {
      const p = l.projectId ? projs.find((x) => x.id === l.projectId) ?? null : null
      if (l.projectId && (!p || p.deletedAt || !l.leadId || !leadById.has(l.leadId))) continue
      /* (pending modules S07) a lead's layout, before it is won, follows its lead's rule too — never everyone's as a personal one is */
      const lead = !l.projectId && l.leadId && !l.isTemplate ? leadById.get(l.leadId) ?? null : null
      if (!l.projectId && l.leadId && !l.isTemplate && !lead) continue
      push({ kind: 'layout', id: l.id, title: l.name, sub: p ? `3D layout · ${p.name}` : lead ? `3D layout · ${lead.name} · Lead` : l.isTemplate ? '3D layout · Template' : '3D layout · Personal', href: `/planner/${l.id}`, icon: 'space_dashboard' }, [p?.name, p?.number, lead?.name])   // (parity map, TD-076 — P-J's) a studio template says so
    }
  })())

  if (kinds.has('template')) jobs.push((async () => {
    const [qt, ct, tt, xt, pt] = await Promise.all([
      db.select({ id: quoteTemplates.id, name: quoteTemplates.name, status: quoteTemplates.status, version: quoteTemplates.version }).from(quoteTemplates).where(and(isNull(quoteTemplates.deletedAt), anyLike(quoteTemplates.name))),
      db.select({ id: contractTemplates.id, title: contractTemplates.title }).from(contractTemplates).where(and(isNull(contractTemplates.deletedAt), anyLike(contractTemplates.title))),
      db.select({ id: taskTemplates.id, name: taskTemplates.name }).from(taskTemplates).where(and(isNull(taskTemplates.deletedAt), anyLike(taskTemplates.name))),
      db.select({ id: quoteTextTemplates.id, title: quoteTextTemplates.title, kind: quoteTextTemplates.kind }).from(quoteTextTemplates).where(and(isNull(quoteTextTemplates.deletedAt), anyLike(quoteTextTemplates.title))),
      db.select({ id: paymentTemplates.id, name: paymentTemplates.name }).from(paymentTemplates).where(and(isNull(paymentTemplates.deletedAt), anyLike(paymentTemplates.name))),
    ])
    for (const t of qt) push({ kind: 'template', id: t.id, title: t.name, sub: `Quote template · ${t.status === 'published' ? `Published v${t.version}` : t.status === 'draft' ? 'Draft' : t.status === 'pending' ? 'Awaiting approval' : 'Archived'}`, href: `/templates/${t.id}`, icon: 'request_quote' })
    for (const t of ct) push({ kind: 'template', id: t.id, title: t.title, sub: 'Contract template', href: `/templates/contracts/${t.id}`, icon: 'contract' })
    for (const t of tt) push({ kind: 'template', id: t.id, title: t.name, sub: 'Task template', href: `/templates/tasks/${t.id}`, icon: 'task' })
    for (const t of xt) push({ kind: 'template', id: t.id, title: t.title, sub: t.kind === 'notes' ? 'Notes template' : 'Terms template', href: `/templates/terms/${t.id}`, icon: 'gavel' })
    for (const t of pt) push({ kind: 'template', id: t.id, title: t.name, sub: 'Payment schedule template', href: `/templates/payments/${t.id}`, icon: 'payments' })   // (one-home N-14) Templates › Payment schedules
  })())

  if (kinds.has('book')) jobs.push((async () => {
    const [items, sections] = await Promise.all([
      db.select().from(priceBookItems).where(and(isNull(priceBookItems.deletedAt), anyLike(priceBookItems.name, priceBookItems.vendor, priceBookItems.category, priceBookItems.description))),
      db.select({ id: priceBookSections.id, name: priceBookSections.name, description: priceBookSections.description, tags: priceBookSections.tags }).from(priceBookSections).where(and(isNull(priceBookSections.deletedAt), anyLike(priceBookSections.name, priceBookSections.description, priceBookSections.tags))),
    ])
    for (const i of items) {
      if (!itemVisible(viewer, i)) continue
      push({ kind: 'book', id: i.id, title: i.name, sub: ['My Items', i.category, i.vendor].filter(Boolean).join(' · '), chip: i.status === 'proposed' ? 'Proposed' : null, href: `/company/price-book?open=${i.id}`, icon: 'list_alt' }, [strip(i.description)])
    }
    for (const s of sections) push({ kind: 'book', id: s.id, title: s.name, sub: 'My Sections', href: `/company/price-book/sections?open=${s.id}`, icon: 'format_list_bulleted' }, [strip(s.description), s.tags])
  })())

  if (kinds.has('material')) jobs.push((async () => {
    const rows = await db.select({ id: studioMaterials.id, name: studioMaterials.name, category: studioMaterials.category, finish: studioMaterials.finish }).from(studioMaterials)
      .where(and(isNull(studioMaterials.deletedAt), anyLike(studioMaterials.name, studioMaterials.category, studioMaterials.finish)))
    for (const m of rows) push({ kind: 'material', id: m.id, title: m.name, sub: ['Material', m.category, m.finish].filter(Boolean).join(' · '), href: `/company/materials?open=${m.id}`, icon: 'texture' })
  })())

  if (kinds.has('member')) jobs.push((async () => {
    const rows = await db.select({ id: members.id, name: members.name, role: members.role, email: members.email, phone: members.phone, color: members.color }).from(members)
      .where(and(eq(members.isActive, true), or(anyLike(members.name, members.email, members.role), kd ? like(members.phone, `%${kd}%`) : undefined)))
    for (const m of rows) push({ kind: 'member', id: m.id, title: m.name, sub: [m.role, m.email].filter(Boolean).join(' · '), href: `/company/members?open=${encodeURIComponent(m.id)}`, icon: 'person', person: { name: m.name, color: m.color } }, [m.email], [m.phone])
  })())

  /* (fix-G, G-10) a variation order — under its project, named as one, its change signed the house way ("−S$545.00") */
  if (kinds.has('project')) jobs.push((async () => {
    const { signedMoney, variationLabel } = await import('@/lib/projects/money')
    const rows = await db.select({ id: quotes.id, leadId: quotes.leadId, number: quotes.number, title: quotes.title, status: quotes.status, amountMinor: quotes.amountMinor }).from(quotes)
      .where(and(isNull(quotes.deletedAt), eq(quotes.kind, 'variation'), or(anyLike(quotes.title, quotes.number), byLead(quotes.leadId))))
    for (const r of rows) {
      const lead = leadById.get(r.leadId); if (!lead) continue
      push({ kind: 'project', id: r.id, title: `${r.number} · ${r.title}`, sub: ['Variation order', lead.name, signedMoney(r.amountMinor)].join(' · '), chip: variationLabel({ status: r.status }), href: `/quotes/${r.id}`, icon: 'request_quote' })
    }
  })())

  /* (fix-G, G-31) someone from a client's household, by name or number — their client's project (or lead), under the client's name */
  if (kinds.has('project') || kinds.has('lead')) jobs.push((async () => {
    const { homeownerHouseholdLinks, homeownerProfiles, projects } = await import('@/lib/db/schema')
    const rows = await db.select({ id: homeownerHouseholdLinks.id, leadId: homeownerHouseholdLinks.leadId, name: homeownerProfiles.name, phone: homeownerProfiles.phone, relationship: homeownerHouseholdLinks.relationship })
      .from(homeownerHouseholdLinks).innerJoin(homeownerProfiles, eq(homeownerProfiles.id, homeownerHouseholdLinks.homeownerId))
      .where(and(isNull(homeownerHouseholdLinks.removedAt), or(like(homeownerProfiles.name, k), kd ? like(homeownerProfiles.phone, `%${kd}%`) : undefined)))
    if (!rows.length) return
    const ps = await db.select({ id: projects.id, leadId: projects.leadId, name: projects.name }).from(projects).where(and(isNull(projects.deletedAt), inArray(projects.leadId, rows.map((r) => r.leadId))))
    for (const r of rows) {
      const lead = leadById.get(r.leadId); if (!lead) continue
      const p = ps.find((x) => x.leadId === r.leadId)
      if (!(p ? kinds.has('project') : kinds.has('lead'))) continue
      push({ kind: p ? 'project' : 'lead', id: `household-${r.id}`, title: r.name, sub: [`${lead.name}’s household`, r.relationship, p?.name].filter(Boolean).join(' · '), href: p ? `/projects/${p.id}` : `/leads/${r.leadId}`, icon: 'group' }, [r.relationship], [r.phone])
    }
  })())

  await Promise.all(jobs)
  /* (parity map, PR-022) Accounting opens a project on its Money, and a variation order read-only in its Preview */
  if (acct) for (const h of hits) {
    if (/^\/projects\/[^/?]+$/.test(h.href)) h.href = `${h.href}/money`
    else if (/^\/quotes\/[^/?]+$/.test(h.href)) h.href = `${h.href}/preview`
  }
  /* (fix-A, A-08) a task or a file of a lead whose work carries on as a project opens on the project's own tab (the lead's tab of a direct
     client only redirects there). (one-home N-10, owner 2026-10-08: "let the lead data till won be in the leads and after it's won rest is all
     under projects") — every tab the project carries on: a note or a log too (Notes & Logs), and Questionnaire and Activity should a result
     ever point at them; a lead whose project was deleted keeps its own tabs. */
  const CARRIED = /^\/leads\/([^/?]+)\/(tasks|files|notes|questionnaire|activity)(.*)$/
  const carried = hits.filter((h) => CARRIED.test(h.href))
  if (carried.length) {
    const { projects } = await import('@/lib/db/schema')
    const { projectTabHref } = await import('@/lib/projects/tabs')
    const ids = [...new Set(carried.map((h) => h.href.split('/')[2]!))]
    const live = new Map((await db.select({ id: projects.id, leadId: projects.leadId }).from(projects).where(and(inArray(projects.leadId, ids), isNull(projects.deletedAt)))).map((p) => [p.leadId, p.id]))
    for (const h of carried) {
      const m = CARRIED.exec(h.href)
      const pid = m ? live.get(m[1]!) : null
      const to = m && pid ? projectTabHref(pid, m[2]!) : null
      if (m && to) h.href = `${to}${m[3]}`
    }
  }
  const limit = scope === 'all' ? ALL_LIMIT : SCOPE_LIMIT
  /* (S44O — call C6) a result Marketing's role doesn't open — a Won lead's task or file, now its project's — is not offered: never a door to the gate */
  const opens = (h: SearchHit) => !desk || opensPath(viewer.role, h.href)
  const groups: SearchGroup[] = KIND_ORDER.flatMap((kind) => {
    const own = hits.filter((h) => h.kind === kind && opens(h)).sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title))
    return own.length ? [{ kind, label: KIND_LABEL[kind], total: own.length, hits: own.slice(0, limit) }] : []
  })
  /* Under All, the group holding the best single answer leads. */
  if (scope === 'all') groups.sort((a, b) => (b.hits[0]?.rank ?? 0) - (a.hits[0]?.rank ?? 0) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
  return { query: q, scope, groups }
}
