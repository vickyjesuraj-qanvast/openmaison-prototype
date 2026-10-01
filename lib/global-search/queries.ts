import 'server-only'   // (REG-286) libSQL never reaches the browser bundle
import { and, eq, inArray, isNull, like, or, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractTemplates, contracts, leadFiles, leadNotes, leadTasks, leads, members, paymentTemplates, priceBookItems, priceBookSections, projectRooms,
  quoteComparisons, quoteTemplates, quoteTextTemplates, quotes, studioMaterials, taskTemplates, visualizerDesigns,
} from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { itemVisible } from '@/lib/company/price-book-rules'
import { displayDate, displayDue, moneySGD, phoneTyped } from '@/lib/format'
import { ALL_LIMIT, KIND_LABEL, KIND_ORDER, SCOPE_LIMIT, SCOPES, rankOf, termsOf, type SearchGroup, type SearchHit, type SearchKind, type SearchResult, type SearchScope } from './model'

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
    const rows = await db.select().from(leads).where(and(isNull(leads.deletedAt), or(anyLike(leads.name, leads.email, leads.source, leads.propertyType, leads.propertyAddress, leads.leadAddress, leads.area, leads.customerId), kd ? like(leads.phone, `%${kd}%`) : undefined)))
    for (const l of rows) {
      if (!seesLead(l.id)) continue
      push({ kind: 'lead', id: l.id, title: l.name, sub: [phoneTyped(l.phone), l.propertyType, l.source].filter(Boolean).join(' · '), chip: l.stage, href: `/leads/${l.id}`, icon: 'person' },
        [l.email, l.propertyAddress, l.leadAddress, l.area, l.customerId], [l.phone])
    }
  })())

  if (kinds.has('quote')) jobs.push((async () => {
    const rows = await db.select().from(quotes).where(and(isNull(quotes.deletedAt), or(anyLike(quotes.title, quotes.number, quotes.projectRef, quotes.client2Name), byLead(quotes.leadId))))
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
    for (const r of rows) {
      const lead = r.leadId ? leadById.get(r.leadId) : null
      if (r.leadId && !lead) continue
      push({ kind: 'task', id: r.id, title: r.title, sub: [lead?.name ?? 'Studio', r.dueAt ? `due ${displayDue(r.dueAt)}` : null].filter(Boolean).join(' · '), chip: r.done ? 'Done' : null,
        href: lead ? `/leads/${lead.id}/tasks?open=${r.id}` : `/tasks?open=${r.id}`, icon: 'task_alt' }, [r.description])
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
    for (const t of pt) push({ kind: 'template', id: t.id, title: t.name, sub: 'Payment template', href: `/templates/payments/${t.id}`, icon: 'payments' })
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
    for (const m of rows) push({ kind: 'member', id: m.id, title: m.name, sub: [m.role, m.email].filter(Boolean).join(' · '), href: '/company/members', icon: 'person', person: { name: m.name, color: m.color } }, [m.email], [m.phone])
  })())

  await Promise.all(jobs)
  const limit = scope === 'all' ? ALL_LIMIT : SCOPE_LIMIT
  const groups: SearchGroup[] = KIND_ORDER.flatMap((kind) => {
    const own = hits.filter((h) => h.kind === kind).sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title))
    return own.length ? [{ kind, label: KIND_LABEL[kind], total: own.length, hits: own.slice(0, limit) }] : []
  })
  /* Under All, the group holding the best single answer leads. */
  if (scope === 'all') groups.sort((a, b) => (b.hits[0]?.rank ?? 0) - (a.hits[0]?.rank ?? 0) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
  return { query: q, scope, groups }
}
