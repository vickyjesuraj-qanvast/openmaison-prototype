import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { and, asc, desc, eq, inArray, isNotNull, isNull, like, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, leadAssignees, leadEvents, leadFileRenders, leadFiles, leads, members, portalBellReads, projectPayments, projects, questions, quotes, renderShareLinks } from '@/lib/db/schema'
import { sharedFileKind } from './file-kinds'   // (parity map, CP-099)
import { portalSelectionReceipts } from '@/lib/projects/choice-receipt'
import { answerOf } from '@/lib/projects/decline'   // (parity map, TD-044)
import type { DocumentGroup } from './documents'
import { money2 } from '@/lib/quotes/math'
import { fileSharePath } from '@/lib/leads/file-share'
import { portalFileHref } from './files'
import { titleCaseName } from '@/lib/format'
import { clientDay, givenName, portalPath, type NeedItem } from './model'
import { needsOf, stepsOf, type BeforeStep, type HomeDesign, type HomeFacts, type HomeFile } from './needs'
import { placeOf, type PortalLook } from './queries'
import { loadScheduleFacts, type HomeSchedule } from './schedule'
import { loadUpdateFacts, type PortalUpdate } from './updates'
import type { PortalVisitor } from './session'
import { attachHomeChoices } from '@/lib/projects/choices'
import { attachHomeFloorPlanAsks } from '@/lib/projects/floor-plan'
import { needShown, withholdSections } from './sections'
import { attachHomePayments } from '@/lib/projects/payments-portal'
import { holdOf } from '@/lib/projects/hold'
import { confirmKeyOf, confirmPath } from '@/lib/quotes/confirm'   // (pending modules S04)
import { quoteHoldsSigning } from '@/lib/contracts/policy'   // (S42F — S42 B-01's sibling)
import { fetchQuoteApproval } from '@/lib/settings/queries'

/*
 * (Projects round 4a) One client's homes and what each needs — loaded for the portal (a signed-in client, or a studio preview) and for the
 * studio's Client access panel. Only what the client may see leaves here: a quote the studio has sent (never a draft or one awaiting its
 * approval), a contract out for signature or signed, the questions the studio ASKED, render links that are live, files marked Shown to client.
 * No cost, no note, no member's own record (I-240 · E-245: nothing unpublished, internal or costed reaches the page).
 */

const CLIENT_QUOTES = ['Sent to Client', 'Confirmed', 'Signed']
const CLIENT_CONTRACTS = ['Sent to Client', 'Signed']

export type HomeLink = { linkId: string; leadId: string; lastOpenedAt: number | null
  /** (fix-F, F-14) whose opens count — the reader's homeowner id (the studio's panel: the client's own); a shown file they opened is not new */
  readerIds?: string[] }

/** The facts of each home, by lead id. */
export async function loadHomeFacts(links: HomeLink[], slug: string, now = Date.now()): Promise<Map<string, HomeFacts & { filesTotal: number }>> {
  const ids = links.map((l) => l.leadId)
  const out = new Map<string, HomeFacts & { filesTotal: number }>()
  if (!ids.length) return out
  const readers = [...new Set(links.flatMap((l) => l.readerIds ?? []))]
  const [qs, cs, qns, asks, shares, files, sched, ups, opens] = await Promise.all([
    db.select().from(quotes).where(and(inArray(quotes.leadId, ids), isNull(quotes.deletedAt), isNull(quotes.archivedAt), inArray(quotes.status, CLIENT_QUOTES))),
    db.select().from(contracts).where(and(inArray(contracts.leadId, ids), isNull(contracts.deletedAt), isNull(contracts.archivedAt), inArray(contracts.status, CLIENT_CONTRACTS))),
    db.select({ id: questions.id, leadId: questions.leadId, answeredBy: questions.answeredBy }).from(questions).where(inArray(questions.leadId, ids)),
    db.select({ leadId: leadEvents.leadId, at: leadEvents.at, detail: leadEvents.detail }).from(leadEvents).where(and(inArray(leadEvents.leadId, ids), eq(leadEvents.kind, 'questionnaire_asked'))).orderBy(asc(leadEvents.at)),
    /* (gaps build D, item 1 — M-06) every design shared and not stopped — past its link's 7 days too (`open` says which still opens) */
    db.select().from(renderShareLinks).where(and(inArray(renderShareLinks.leadId, ids), isNull(renderShareLinks.revokedAt))).orderBy(desc(renderShareLinks.createdAt)),
    db.select({ id: leadFiles.id, leadId: leadFiles.leadId, name: leadFiles.name, kind: leadFiles.kind, thumb: leadFiles.thumb, shownAt: leadFiles.shownToClientAt, parentId: leadFiles.parentId }).from(leadFiles)
      .where(and(inArray(leadFiles.leadId, ids), isNull(leadFiles.deletedAt), ne(leadFiles.kind, 'folder'))).orderBy(desc(leadFiles.shownToClientAt), asc(leadFiles.name)),
    loadScheduleFacts(ids),   // (r4b) the schedule as last shared and the stages waiting for a confirmation
    loadUpdateFacts(ids, slug),   // (r4b) the published updates
    /* (fix-F, F-14) the shown files each reader has opened — the file route marks it as the bell marks a row read */
    readers.length ? db.select({ who: portalBellReads.homeownerId, key: portalBellReads.rowKey }).from(portalBellReads).where(and(inArray(portalBellReads.homeownerId, readers), like(portalBellReads.rowKey, 'file:%'))) : Promise.resolve([]),
  ])
  /* (S42F — S42 B-01's sibling) the quotes the agreements out for signature name, whatever their status: one being revised holds its signing
     (`quoteHoldsSigning`, the signing link's own rule) — read here so What needs you and Before work starts never offer that link */
  const named = [...new Set(cs.filter((c) => c.status === 'Sent to Client' && c.fromQuoteId).map((c) => c.fromQuoteId!))]
  const [namedQs, approval] = named.length ? await Promise.all([db.select({ id: quotes.id, status: quotes.status, version: quotes.version, deletedAt: quotes.deletedAt }).from(quotes).where(inArray(quotes.id, named)), fetchQuoteApproval()]) : [[], 'not-required' as const]
  const holds = new Set(namedQs.filter((q) => !q.deletedAt && quoteHoldsSigning(q, approval === 'required')).map((q) => q.id))
  /* (parity map, CP-099) what each shown file is — its folders' names (nearest first) and whether the Visualizer made it */
  const shownIds = files.filter((f) => !!f.shownAt).map((f) => f.id)
  const [folders, renders] = shownIds.length ? await Promise.all([
    db.select({ id: leadFiles.id, name: leadFiles.name, parentId: leadFiles.parentId }).from(leadFiles).where(and(inArray(leadFiles.leadId, ids), eq(leadFiles.kind, 'folder'))),
    db.select({ fileId: leadFileRenders.fileId }).from(leadFileRenders).where(inArray(leadFileRenders.fileId, shownIds)),
  ]) : [[], []]
  const folderOf = new Map(folders.map((f) => [f.id, f]))
  const rendered = new Set(renders.map((r) => r.fileId))
  const trail = (parentId: string | null) => { const out: string[] = []; for (let at = parentId, n = 0; at && n < 12; n++) { const f = folderOf.get(at); if (!f) break; out.push(f.name); at = f.parentId } return out }
  for (const l of links) {
    /* the questions the studio asked: every ask names its ids since T12; an older ask asked them all */
    const myAsks = asks.filter((a) => a.leadId === l.leadId)
    const mine = qns.filter((q) => q.leadId === l.leadId)
    const askedIds = new Set<string>()
    let all = false
    for (const a of myAsks) { const d = (a.detail ?? {}) as { ids?: string[] }; if (d.ids?.length) d.ids.forEach((id) => askedIds.add(id)); else all = true }
    const asked = mine.filter((q) => all || askedIds.has(q.id))
    const designs: HomeDesign[] = shares.filter((s) => s.leadId === l.leadId).map((s) => {
      let rooms = 0
      try { const snap = JSON.parse(s.snapshot) as { versions?: { roomId?: string }[] }; rooms = new Set((snap.versions ?? []).map((v) => v.roomId ?? '')).size } catch { rooms = 0 }
      return { token: s.token, designId: s.designId, rooms: Math.max(1, rooms), createdAt: s.createdAt.getTime(), expiresAt: s.expiresAt.getTime(), views: s.viewCount, open: s.expiresAt.getTime() > now }
    })
    const own = files.filter((f) => f.leadId === l.leadId)
    /* the portal's own session-checked address (lib/portal/files.ts) — the signed /f link only where no address is known */
    const openedHere = new Set(opens.filter((o) => (l.readerIds ?? []).includes(o.who)).map((o) => o.key.slice(5)))
    const shown: HomeFile[] = own.filter((f) => !!f.shownAt).map((f) => ({ id: f.id, name: f.name, kind: f.kind, thumb: f.thumb, shownAt: f.shownAt!.getTime(), href: slug ? portalFileHref(slug, f.id) : fileSharePath(f.id), opened: openedHere.has(f.id),
      group: sharedFileKind({ name: f.name, kind: f.kind, render: rendered.has(f.id), folders: trail(f.parentId) }) }))   // (parity map, CP-099)
    out.set(l.leadId, {
      homeId: l.linkId, slug,
      quotes: qs.filter((q) => q.leadId === l.leadId).map((q) => ({ id: q.id, confirmToken: q.confirmToken || q.id, number: q.number, title: q.title, status: q.status, amountMinor: q.amountMinor, sentAt: (q.clientSentAt ?? q.sentAt)?.getTime() ?? null, confirmedAt: q.confirmedAt?.getTime() ?? null, signedAt: q.signedAt?.getTime() ?? null, kind: q.kind, declinedAt: q.declinedAt?.getTime() ?? null })),
      contracts: cs.filter((c) => c.leadId === l.leadId).map((c) => ({ id: c.id, title: c.title, status: c.status, bundleId: c.bundleId, fromQuoteId: c.fromQuoteId, signToken: c.signToken || c.id, expiresAt: c.signExpiresAt?.getTime() ?? null, sentAt: c.sentAt?.getTime() ?? null, signedAt: c.signedAt?.getTime() ?? null, held: c.status === 'Sent to Client' && !!c.fromQuoteId && holds.has(c.fromQuoteId), handover: c.purpose === 'handover', toRead: c.toRead })),   // (S44R, C9)
      questions: { asked: asked.length, open: asked.filter((q) => !q.answeredBy).length, askedAt: myAsks.length ? myAsks[myAsks.length - 1]!.at.getTime() : null },
      designs, files: shown, lastOpenedAt: l.lastOpenedAt, now, filesTotal: own.length,
      schedule: sched.get(l.leadId) ?? null, updates: ups.get(l.leadId) ?? null,
    })
  }
  await attachHomeChoices(out)   // (Projects round 8) the project's choices shared with the client
  await attachHomeFloorPlanAsks(out)   // (parity map, TD-049) the studio asked for their floor plan — "Send your floor plan"
  await attachHomePayments(out, now)   // (Projects round 6) the project's payment stages: what is due, what waits for the studio
  return out
}

/* ── The portal's pages ──────────────────────────────────────────────────────────────────────────────────────────────────── */

export type PortalHome = {
  id: string
  leadId: string
  /** "HDB 5-Room — Benjamin Han" for a project; else "Your home at SkyOasis @ Dawson". */
  title: string
  place: string
  propertyType: string
  /** Where the home stands: a lead (before work starts), a project setting up, in progress, completed. */
  stage: 'lead' | 'setting_up' | 'in_progress' | 'completed'
  project: { name: string; startDate: number | null; targetEndDate: number | null; startedAt: number | null } | null
  steps: BeforeStep[]
  designs: HomeDesign[]
  files: HomeFile[]
  documents: PortalDocument[]
  /** (r4b) Where the work stands, as last shared (null before a project, or before the studio shares); `hasMilestones` keeps the project's
      own target end off the page once a schedule exists — it follows the live milestones, which may hold changes not shared yet. */
  schedule: HomeSchedule | null
  /** (r4b) The newest published update — the home's Latest update card. */
  latestUpdate: PortalUpdate | null
  /** (gaps build D, item 4 — M-01) the project is on hold: the reason the studio gave and the day it should resume */
  hold?: { reason: string; until: number | null } | null
}
/** A quote or agreement the client has (Files › Documents), opened on today's link. (gaps build D, item 8 — 1.0 I-321…I-325) `group`: the kind
    the Documents card files it under — quotes · agreements · variation orders · payment receipts · selection receipts. */
/** `previewHref` — the studio's own read of the same record, for a studio preview only; (S43B · F1-08) null on a client's own visit. */
export type PortalDocument = { key: string; title: string; line: string; href: string; previewHref: string | null; icon: string; group?: DocumentGroup }

export type PortalData = {
  slug: string
  look: PortalLook
  visitor: { name: string; first: string; preview: boolean; memberName: string | null; /** (fix-G, G-17) the set-up page's phone frame */ frame?: boolean }
  homes: PortalHome[]
  needs: NeedItem[]
  /** "Message your designer on WhatsApp" (Q-43): the first of the team with a mobile, else the studio's own number when it is a mobile
      (fix-F, F-13: a landline can't take a WhatsApp message) — `label` is the link's words; no number, no link (`phone` null). */
  contact: { name: string | null; phone: string | null; label: string | null }
  paused: boolean
  now: number
}

const docsOf = (f: HomeFacts): PortalDocument[] => {
  const dayOf = (ms: number | null) => (ms ? clientDay(ms, f.now) : '')   // (fix-F, F-29) the client's one way to say a day
  const out: PortalDocument[] = []
  for (const c of f.contracts) {
    out.push({ key: `c:${c.id}`, group: 'agreements', title: c.title, icon: 'contract', line: c.status === 'Signed' ? `Signed ${dayOf(c.signedAt)}` : c.toRead ? `Sent to you ${dayOf(c.sentAt)}` : `Sent for your signature ${dayOf(c.sentAt)}`,   /* (S44R, C9) a letter to keep */ href: c.bundleId && c.status === 'Sent to Client' ? `/sign/bundle/${c.bundleId}` : `/sign/${c.signToken}`, previewHref: `/contracts/${c.id}/preview` })
  }
  for (const q of f.quotes) {
    const viaContract = f.contracts.find((c) => c.fromQuoteId === q.id)
    /* (Projects round 6) a variation order says so */
    out.push({ key: `q:${q.id}`, group: q.kind === 'variation' ? 'variations' : 'quotes', title: `${q.kind === 'variation' ? 'Variation order' : 'Quote'} ${q.number} · ${q.title}`, icon: 'request_quote', line: q.status === 'Signed' ? `Signed ${dayOf(q.signedAt)}` : q.status === 'Confirmed' ? `Confirmed ${dayOf(q.confirmedAt)}` : q.declinedAt ? `You declined it ${dayOf(q.declinedAt)}` : `Sent ${dayOf(q.sentAt)}`, href: viaContract ? `/sign/${viaContract.signToken}/quote` : confirmPath(confirmKeyOf({ id: q.id, confirmToken: q.confirmToken })), previewHref: `/quotes/${q.id}/preview` })
  }
  return out
}
/** (fix-F, F-13) A Singapore mobile — eight digits starting 8 or 9 — the only kind of number WhatsApp reaches. */
const isMobile = (phone: string | null | undefined) => /^[89]\d{7}$/.test((phone ?? '').replace(/\D/g, '').slice(-8)) && (phone ?? '').replace(/\D/g, '').length >= 8

/** Everything the portal's pages draw for one visitor — every home their number opens. */
export async function fetchPortalData(slug: string, look: PortalLook, visitor: PortalVisitor, paused: boolean): Promise<PortalData> {
  const now = Date.now()
  const forVisitor = <T extends { previewHref: string | null }>(x: T): T => (visitor.preview ? x : { ...x, previewHref: null })   // (S43B · F1-08)
  const rows = visitor.links
  const leadIds = rows.map((r) => r.leadId)
  const [loaded, projectRows, team] = await Promise.all([
    loadHomeFacts(rows.map((r) => ({ linkId: r.linkId, leadId: r.leadId, lastOpenedAt: r.lastOpenedAt, readerIds: [visitor.homeownerId] })), slug, now),
    leadIds.length ? db.select().from(projects).where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt))) : Promise.resolve([]),
    leadIds.length ? db.select({ leadId: leadAssignees.leadId, name: members.name, phone: members.phone, role: members.role, at: leadAssignees.assignedAt }).from(leadAssignees).innerJoin(members, eq(members.id, leadAssignees.memberId)).where(inArray(leadAssignees.leadId, leadIds)).orderBy(asc(leadAssignees.assignedAt)) : Promise.resolve([]),
  ])
  /* (Projects round 9, Q-45) a section the studio switched off never leaves the server — its facts, its home cards, its needs */
  const facts = new Map([...loaded].map(([k, f]) => [k, withholdSections(f, look.hidden)]))
  const leadRows = leadIds.length ? await db.select().from(leads).where(inArray(leads.id, leadIds)) : []
  /* (gaps build D, item 8) the receipts the client keeps beside their documents — the payments' (while Money is on) and the picks' (Choices) */
  const pids = projectRows.map((p) => p.id)
  const [receipts, picks] = await Promise.all([
    pids.length && !look.hidden.includes('money') ? db.select({ id: projectPayments.id, projectId: projectPayments.projectId, number: projectPayments.receiptNumber, amountMinor: projectPayments.amountMinor, paidOn: projectPayments.paidOn, status: projectPayments.status })
      .from(projectPayments).where(and(inArray(projectPayments.projectId, pids), isNotNull(projectPayments.receiptNumber), inArray(projectPayments.status, ['confirmed', 'reversed']))).orderBy(desc(projectPayments.paidOn)) : Promise.resolve([]),
    leadIds.length && !look.hidden.includes('choices') ? portalSelectionReceipts(leadIds, { answers: true }) : Promise.resolve([]),   // (parity map, TD-044) a no's receipt too
  ])
  const homes: PortalHome[] = rows.map((r) => {
    const l = leadRows.find((x) => x.id === r.leadId)!
    const p = projectRows.find((x) => x.leadId === r.leadId) ?? null
    const f = facts.get(r.leadId)!
    const place = placeOf(l.propertyAddress ?? l.leadAddress)
    const stage: PortalHome['stage'] = p ? (p.stage === 'in_progress' || p.stage === 'completed' ? p.stage : 'setting_up') : 'lead'
    return {
      id: r.linkId, leadId: r.leadId, title: p ? p.name : place ? `Your home at ${place}` : l.propertyType, place, propertyType: l.propertyType, stage,
      project: p ? { name: p.name, startDate: p.startDate?.getTime() ?? null, targetEndDate: p.targetEndDate?.getTime() ?? null, startedAt: p.startedAt?.getTime() ?? null } : null,
      steps: stage === 'lead' || stage === 'setting_up' ? stepsOf(f) : [],
      designs: f.designs.filter((d) => d.open !== false), files: f.files,
      documents: [...docsOf(f),
        ...(p ? receipts.filter((x) => x.projectId === p.id).map((x): PortalDocument => ({ key: `r:${x.id}`, group: 'receipts', icon: 'receipt_long', title: `Receipt ${x.number} · ${money2(x.amountMinor)}`, line: `${x.status === 'reversed' ? 'Reversed · ' : ''}Paid ${clientDay(x.paidOn.getTime(), now)}`, href: portalPath(slug, `money/receipt/${x.id}`), previewHref: `/projects/${p.id}/receipts/${x.id}` })) : []),
        ...picks.filter((x) => x.leadId === r.leadId).map((x): PortalDocument => ({ key: `s:${x.selectionId}`, group: 'selections', icon: 'palette', title: `Selection receipt · ${x.title}`, line: x.answer ? `${answerOf(x.answer).chip} · ${clientDay(x.at, now)}` : `${x.option} · chosen ${clientDay(x.at, now)}`, href: `${portalPath(slug, `choices/receipt/${encodeURIComponent(x.selectionId)}`)}?from=files`, previewHref: p ? `/projects/${p.id}/selection-receipts/${x.selectionId}` : '' })),
      ],   // (gaps build D, item 8) grouped by kind on Files   // (gaps build D, item 1) Home's card opens the link: live links only — the Designs tab keeps the rest
      schedule: f.schedule ?? null, latestUpdate: f.updates?.latest ?? null,
      hold: p && p.stage !== 'completed' ? ((h) => (h ? { reason: h.reason, until: h.until } : null))(holdOf(p)) : null,   // (gaps build D, item 4)
    }
  })
  const needs = [...facts.values()].flatMap(needsOf).filter((n) => needShown(n.kind, look.hidden)).sort((a, b) => a.since - b.since).map(forVisitor)
  /* (S43B · F1-08 — his "fix all the pending things" 2026-10-15, as recommended; S13's note for the developers) the studio's own addresses — a
     quote's or a contract's preview, a design in the Visualizer, a receipt's studio page — ride only to a studio preview (`visitor.preview`, the
     portal's own flag), never to a client's browser, where nothing reads them (as `clientSafe` keeps cost off a client's quote lines) */
  for (const h of homes) {
    h.documents = h.documents.map(forVisitor)
    h.steps = h.steps.map((st) => (st.action ? { ...st, action: forVisitor(st.action) } : st))
  }
  /* the client's designer first — a Designer on the lead, then anyone on it — with a number to message */
  const withPhone = [...team].sort((a, b) => Number(b.role === 'Designer') - Number(a.role === 'Designer')).find((m) => isMobile(m.phone))
  return {
    slug, look, paused, now, homes, needs,
    /* (REG-1054) someone from the household is greeted by their given name — the family name they share with the client left off */
    visitor: { name: visitor.name, first: givenName(visitor.name, rows.find((r) => r.household) ? leadRows.find((x) => x.id === rows.find((r) => r.household)!.leadId)?.name : null), preview: visitor.preview, memberName: visitor.memberName },
    contact: withPhone ? { name: withPhone.name, phone: withPhone.phone!, label: `Message ${withPhone.name} on WhatsApp` }
      : isMobile(look.phone) ? { name: null, phone: look.phone, label: `Message ${look.studio} on WhatsApp` } : { name: null, phone: null, label: null },
  }
}

/* ── The questions page ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export type PortalQuestion = { id: string; text: string; type: string; options: string[]; answer: string | null; answeredBy: string | null; required: boolean }
export async function fetchPortalQuestions(leadId: string): Promise<PortalQuestion[]> {
  const [qns, asks] = await Promise.all([
    db.select().from(questions).where(eq(questions.leadId, leadId)).orderBy(asc(questions.sortOrder)),
    db.select({ detail: leadEvents.detail }).from(leadEvents).where(and(eq(leadEvents.leadId, leadId), eq(leadEvents.kind, 'questionnaire_asked'), isNotNull(leadEvents.at))),
  ])
  const ids = new Set<string>()
  let all = false
  for (const a of asks) { const d = (a.detail ?? {}) as { ids?: string[] }; if (d.ids?.length) d.ids.forEach((id) => ids.add(id)); else all = true }
  return qns.filter((q) => all || ids.has(q.id)).map((q) => {
    let options: string[] = []
    try { const v = JSON.parse(q.options ?? '[]'); options = Array.isArray(v) ? v.map(String) : [] } catch { options = [] }
    return { id: q.id, text: q.text, type: q.type, options, answer: q.answer, answeredBy: q.answeredBy, required: q.required }
  })
}

/** The lead a visitor's home names — or null when it is not one of theirs (an id from another client never answers). */
export const homeOf = (visitor: PortalVisitor, homeId: string) => visitor.links.find((l) => l.linkId === homeId) ?? null

export const clientName = (n: string) => titleCaseName(n)
