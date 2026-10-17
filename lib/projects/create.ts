import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contracts, floorPlanPhotos, floorPlanPictures, leadEvents, leadFiles, leads, members, projectFloorPlans, projects, quotes, settings, spaceLayouts, stageLogs } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { notify } from '@/lib/notifications/emit'
import { leadMemberIds } from '@/lib/notifications/queries'
import { amountMinor, type WizardData } from '@/lib/leads/stage-data'
import { titleCaseName } from '@/lib/format'
import { logProjectEvent } from './events'
import { addStarterFolders } from '@/lib/leads/starter-folders'   // (gaps build E, item 4)
import { draftInvoicesFor } from './invoices'
import { fetchProjectNumbering, fetchProjectNumbers } from './queries'
import { PROJECT_NUMBERS_GIVEN_KEY, signedQuoteFileName, defaultProjectName, formatProjectNumber, nextProjectSeq, parseNumbersGiven, type ProjectSplit } from './model'
import type { PickedPdf } from '@/lib/contracts/pdf'

/**
 * (REG-911, Q-02) Won creates the project in the same press — every path that reaches Won (the Move stage window's Won step, Convert to
 * Project, a kanban drop, a resume into Won) saves through `moveStage`, which calls this. Idempotent: a lead never gets a second project
 * (`projects.lead_id` is unique; a lead that already has one — deleted or not — returns it). The Won step's payload names the signed quote
 * and contract and the project type; an uploaded quote carries its typed amount and the step's milestones as the agreed split.
 */
export async function ensureProjectForLead(leadId: string, o: { payload?: unknown; at?: Date; notify?: boolean; /** (fix-E, E-06) Make the project again — its line says so, never "won the lead" */ remade?: boolean; /** (pending modules S05) the Won step's uploaded signed quote itself — kept with its bytes */ wonQuoteFile?: PickedPdf | null
  /** (S44R — UAT row 358, call C7) made by a signature, not a press: who it is made by (the agreement's sender) and that nobody pressed it — every member hears it */
  by?: string; byClient?: boolean } = {}): Promise<{ id: string; created: boolean; number: string }> {
  const [have] = await db.select({ id: projects.id, number: projects.number }).from(projects).where(eq(projects.leadId, leadId)).limit(1)
  if (have) return { id: have.id, created: false, number: have.number }
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) throw new Error('No such lead')
  const payload = (o.payload && typeof o.payload === 'object' ? o.payload
    : (await db.select({ payload: stageLogs.payload }).from(stageLogs).where(and(eq(stageLogs.leadId, leadId), eq(stageLogs.toStage, 'Won'))).orderBy(desc(stageLogs.createdAt)).limit(1))[0]?.payload ?? {}) as Partial<WizardData>
  const uploaded = payload.wonQuoteTab === 'upload'
  /* The signed quote: the lead's Signed quote (its latest signature), else the system quote the Won step named. */
  const qs = await db.select({ id: quotes.id, title: quotes.title, status: quotes.status, signedAt: quotes.signedAt }).from(quotes).where(and(eq(quotes.leadId, leadId), isNull(quotes.deletedAt), eq(quotes.kind, 'quote'))).orderBy(desc(quotes.signedAt), desc(quotes.createdAt))
  const quote = uploaded ? null : qs.find((q) => q.status === 'Signed') ?? qs.find((q) => q.title === payload.wonQuote) ?? null
  const cs = await db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.leadId, leadId), eq(contracts.status, 'Signed'), isNull(contracts.deletedAt))).orderBy(desc(contracts.signedAt)).limit(1)
  const split: ProjectSplit | null = uploaded && payload.milestones?.length ? { template: null, rows: payload.milestones.map((m) => ({ name: m.name, pct: m.pct })) } : null
  const made = await insertProject({
    leadId, at: o.at ?? new Date(), name: defaultProjectName(lead.propertyType, titleCaseName(lead.name)), projectType: payload.projectType || null,
    quoteId: quote?.id ?? null, contractId: cs[0]?.id ?? null, agreedValueMinor: uploaded ? amountMinor(payload.wonQuoteAmount ?? '') || null : null, split,
    direct: false, client: titleCaseName(lead.name), notify: o.notify ?? true, remade: o.remade,
    ...(o.by ? { by: o.by } : {}), ...(o.byClient ? { actorId: null } : {}),   // (S44R, C7)
  })
  if (made.created && uploaded && payload.wonQuoteUploaded) await fileWonQuote(leadId, payload.wonQuoteUploaded, o.at ?? new Date(), o.wonQuoteFile ?? null)   // (fix-A, A-15) · (pending modules S05) with its bytes
  return made
}

/**
 * (fix-A, A-15) The Won step's uploaded signed quote is kept: a PDF in the lead's Files (the project's Files), once per name, which the
 * project's Key documents names and opens. The upload is the prototype's (no bytes, as every upload in Files).
 */
export async function fileWonQuote(leadId: string, uploaded: string, at: Date, picked: PickedPdf | null = null): Promise<string> {
  const name = signedQuoteFileName(uploaded)
  const [have] = await db.select({ id: leadFiles.id }).from(leadFiles).where(and(eq(leadFiles.leadId, leadId), eq(leadFiles.name, name), isNull(leadFiles.deletedAt))).limit(1)
  if (have) return have.id
  /* (pending modules S05 — the card's "Move stage Quote Sent / Won upload keeps only the file's name") the picked PDF itself, its bytes and
     its first page; an older payload with no file keeps the name alone, as before */
  if (picked) { const { keepPdfIn } = await import('@/lib/contracts/files'); const k = await keepPdfIn(db, leadId, picked, at, null, name); if (typeof k === 'string') return k }
  const id = randomUUID()
  await db.insert(leadFiles).values({ id, leadId, kind: 'pdf', name, thumb: null, createdAt: at, parentId: null, ownerId: await sessionMemberId(), sizeBytes: 728064, mime: 'application/pdf', updatedAt: at })
  return id
}

export type NewProjectRow = {
  leadId: string; at: Date; name: string; projectType: string | null; quoteId: string | null; contractId: string | null
  agreedValueMinor: number | null; split: ProjectSplit | null; direct: boolean; client: string; notify: boolean; remade?: boolean
  /** (gaps build, package A) the scope's rooms */
  scope?: string[] | null
  /** (S44R — UAT row 358, call C7) who it is made by when no member pressed (a signed agreement: its sender) — else the signed-in member; and the
      bell's actor (null = nobody pressed it, so the team all hear it) */
  by?: string; actorId?: string | null
}
/** (gaps build, package A) The next project number — read BEFORE a transaction opens, so the writes inside it never wait on a read of `db`. */
export async function nextProjectNumber(at: Date): Promise<string> {
  const [numbering, numbers] = await Promise.all([fetchProjectNumbering(), fetchProjectNumbers()])
  return formatProjectNumber(numbering, nextProjectSeq(numbers, numbering), at)
}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
/** (gaps build, package A — 13) The project row, its number marked given and its `project_created` line, through one writer: `db`, or the
    transaction New project makes its client's record in, so neither lands without the other. Null when the lead already has a project.
    `by` = who makes it — the signed-in member, read before any transaction opens (pending modules S43A). */
export async function writeProjectRow(w: typeof db | Tx, i: NewProjectRow, number: string, by: string): Promise<string | null> {
  const id = randomUUID()
  const inserted = await w.insert(projects).values({
    id, leadId: i.leadId, number, name: i.name.slice(0, 80), stage: 'setting_up', projectType: i.projectType,
    quoteId: i.quoteId, contractId: i.contractId, agreedValueMinor: i.agreedValueMinor, paymentTemplate: i.split,
    scope: i.scope?.length ? i.scope : null,
    createdBy: by, createdAt: i.at, updatedAt: i.at,
  }).onConflictDoNothing({ target: projects.leadId }).returning({ id: projects.id })
  if (!inserted.length) return null
  await addStarterFolders(w, i.leadId, { at: i.at, ownerId: by })   // (gaps build E, item 4) Contract & VOs · Floor plans · Renders · Quotes & BOQ · Site photos
  await markNumberGiven(number, w)   // (fix-A, A-06) a number is given once — a purge never frees it
  await logProjectEvent(w, i.leadId, id, 'project_created', { name: i.name, number, direct: i.direct, ...(i.remade ? { remade: true } : {}) }, { at: i.at, actorId: by })
  await carryLeadLayouts(w, i.leadId, { id, name: i.name, number }, i.at)   // (pending modules S07)
  await carryLeadFloorPlans(w, i.leadId, { id, name: i.name, number }, i.at)   // (pending modules S28)
  return id
}
/**
 * (pending modules S28 — card studio:floorplan-isometric-ai; S07's "a lead's 3D layouts belong to the lead until Won, then the project") The
 * floor-plan photos a lead's layouts were traced on become the project's floor plans in the same writer — the same id, so a layout's
 * underlay (`/planner/plan-picture/<id>`) keeps its address; its picture, its size measured on it (else no scale yet), its original in Files ›
 * Floor plans. The first is the main plan when the project has none. Each says so on the project's Activity (`carried`), never to the client.
 * Answers how many came.
 */
export async function carryLeadFloorPlans(w: typeof db | Tx, leadId: string, p: { id: string; name: string; number: string }, at: Date): Promise<number> {
  const photos = await w.select().from(floorPlanPhotos).where(eq(floorPlanPhotos.leadId, leadId))
  if (!photos.length) return 0
  const [main] = await w.select({ id: projectFloorPlans.id }).from(projectFloorPlans).where(and(eq(projectFloorPlans.projectId, p.id), eq(projectFloorPlans.isMain, true), isNull(projectFloorPlans.putAwayAt))).limit(1)
  let hasMain = !!main
  /* one live plan per original: the newest photo of a file is the plan; an earlier one of the same file (an earlier try) comes put away —
     still the record its own layout lies on, never a second plan on the client's page */
  const newest = new Map<string, string>()
  for (const f of photos) { const k = f.fileId ?? f.id, had = photos.find((x) => x.id === newest.get(k)); if (!had || had.createdAt.getTime() < f.createdAt.getTime()) newest.set(k, f.id) }
  for (const f of photos.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const live = newest.get(f.fileId ?? f.id) === f.id
    const [by] = f.createdBy ? await w.select({ name: members.name }).from(members).where(eq(members.id, f.createdBy)).limit(1) : []
    await w.insert(projectFloorPlans).values({ id: f.id, projectId: p.id, leadId, name: f.name, fileId: f.fileId, width: f.width, height: f.height, isMain: live && !hasMain, scaleMmPerPx: f.scaleMmPerPx,
      scaleSetBy: f.scaleMmPerPx ? f.createdBy : null, scaleSetAt: f.scaleMmPerPx ? f.createdAt : null, addedByKind: 'studio', addedBy: f.createdBy, addedByName: by?.name ?? null, createdAt: f.createdAt, updatedAt: at,
      putAwayAt: live ? null : at, putAwayBy: null }).onConflictDoNothing()
    await w.insert(floorPlanPictures).values({ planId: f.id, data: f.picture }).onConflictDoNothing()
    await w.delete(floorPlanPhotos).where(eq(floorPlanPhotos.id, f.id))
    if (live) { await logProjectEvent(w, leadId, p.id, 'project_floor_plan_added', { name: p.name, number: p.number, id: f.id, title: f.name, by: 'studio', carried: true }, { at, actorId: null }); hasMain = true }
  }
  return photos.length
}
/**
 * (pending modules S07 — the projects card's "a 3D layout started on a lead before Won is not carried to its project", one-home N-10: "after
 * it's won rest is all under projects") The lead's own 3D layouts become the project's in the same writer as its row — those in Deleted Layouts
 * too, so a restore brings one back onto the project. Each says so on the project's Activity; its live share keeps its lead (the portal's
 * Designs reads it on). Never a template. Answers how many came.
 */
export async function carryLeadLayouts(w: typeof db | Tx, leadId: string, p: { id: string; name: string; number: string }, at: Date): Promise<number> {
  const carried = await w.update(spaceLayouts).set({ projectId: p.id, updatedAt: at })
    .where(and(eq(spaceLayouts.leadId, leadId), isNull(spaceLayouts.projectId), eq(spaceLayouts.isTemplate, false))).returning({ id: spaceLayouts.id, name: spaceLayouts.name })
  for (const l of carried) await logProjectEvent(w, leadId, p.id, 'project_layout_linked', { name: p.name, number: p.number, id: l.id, title: l.name, carried: true }, { at, actorId: null })
  return carried.length
}
/** What follows a project's row once it is on record: its Drafts (idempotent — the Money tab makes them on first read too) and the team's bell. */
export async function afterProjectRow(i: NewProjectRow, id: string, number: string): Promise<void> {
  await draftInvoicesFor(id, { at: i.at, ...(i.by ? { actorId: i.by } : {}) })   // (Projects round 5, F-04) one Draft per payment stage, made with the project
  if (i.notify) await notify('project_created', await leadMemberIds(i.leadId), { title: `New project: ${i.name}`, body: `${number} · ${i.client}`, href: `/projects/${id}`, leadId: i.leadId, ...(i.actorId !== undefined ? { actorId: i.actorId } : {}) })
  await (await import('@/lib/compliance/starter')).addComplianceTasks(id, i.leadId, { at: i.at, notify: i.notify, ...(i.by ? { by: i.by } : {}) })   // (gaps build I, I-Q11) Settings › Projects › Compliance
}

/** The one writer of a project row: its number from Settings › Projects, its `project_created` event, its team's bell row. */
export async function insertProject(i: NewProjectRow): Promise<{ id: string; created: boolean; number: string }> {
  const number = await nextProjectNumber(i.at)
  const id = await writeProjectRow(db, i, number, i.by ?? await sessionMemberId())   // (S44R, C7) a signature's project is its agreement's sender's
  if (!id) {   // another press made it first — that one stands
    const [p] = await db.select({ id: projects.id, number: projects.number }).from(projects).where(eq(projects.leadId, i.leadId)).limit(1)
    return { id: p!.id, created: false, number: p!.number }
  }
  await afterProjectRow(i, id, number)
  return { id, created: true, number }
}

/**
 * (fix-A, A-06) A number is given once: invoices, receipts and messages quote it, so a project deleted forever never frees its number for the
 * next one. The highest running number given under each prefix is kept in settings (`project_numbers_given`, `{ P: 8 }`) and read back by
 * `fetchProjectNumbers` beside the projects that still exist. Idempotent: it only ever raises the mark.
 */
export async function markNumberGiven(number: string, w: typeof db | Tx = db): Promise<void> {   // (gaps build, package A) inside New project's transaction too
  const m = /^([A-Za-z0-9]+)-(?:.*-)?(\d+)$/.exec(number)
  if (!m) return
  const prefix = m[1]!, seq = Number(m[2])
  const [row] = await w.select({ value: settings.value }).from(settings).where(eq(settings.key, PROJECT_NUMBERS_GIVEN_KEY)).limit(1)
  const given = parseNumbersGiven(row?.value)
  if ((given[prefix] ?? 0) >= seq) return
  const value = JSON.stringify({ ...given, [prefix]: seq })
  await w.insert(settings).values({ key: PROJECT_NUMBERS_GIVEN_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
}

/**
 * (parity map 2026-10-10, P-E) A line of this package's own in the project's Activity — `lead_events` kinds `parity_e_…` (lib/leads/activity.ts
 * region P-E reads them): a project duplicated (on the new one and on the one it came from), a variation order's days answered (moved · asked ·
 * not now), suggested tasks added. `actorId` left out = the signed-in member. Answers the line's id, for its Undo.
 */
export type ParityEKind = 'parity_e_duplicated' | 'parity_e_duplicated_to' | 'parity_e_vo_days' | 'parity_e_tasks_suggested'
/* (pending modules S43A) through `db` the signed-in member is read here; through any other writer (a transaction) the caller passes who */
export async function logParityEvent(w: typeof db, leadId: string, projectId: string, kind: ParityEKind, detail: Record<string, unknown>, o?: { at?: Date; actorId?: string }): Promise<string>
export async function logParityEvent(w: Pick<typeof db, 'insert'>, leadId: string, projectId: string, kind: ParityEKind, detail: Record<string, unknown>, o: { at?: Date; actorId: string }): Promise<string>
export async function logParityEvent(w: Pick<typeof db, 'insert'>, leadId: string, projectId: string, kind: ParityEKind, detail: Record<string, unknown>, o: { at?: Date; actorId?: string } = {}): Promise<string> {
  const id = randomUUID()
  await w.insert(leadEvents).values({ id, leadId, projectId, kind, actorId: o.actorId ?? await sessionMemberId(), at: o.at ?? new Date(), detail })
  return id
}

/* ── (parity map, PR-058 — 1.0's CloneProjectDialog + `projects/records/clone`, B-292…B-302) Duplicate a project ──────────────────────────────
   1.0 copied a project's details, its timeline and its quote snapshot into a new Draft (nothing in 1.0 opened it). 2.0's Duplicate project: the
   new project is ALWAYS born on its own client record (a `direct` lead — every project has one lead, `projects.lead_id` is unique), copied from
   the source's client, another client's record or a new client typed in; Setting up; its value and payment split as the source agreed them;
   optionally its schedule (re-dated from the day you pick, every milestone Not started, its words, colours, links and payment stages kept) and
   a draft of its signed quote. The source and the copy each get a line in Activity. */

/** The source's payment stages, in order, as the copy's split names them (`split:<n>`) — so a copied milestone keeps the stage it falls due on. */
export function stageRefMap(refs: string[]): Map<string, string> {
  return new Map(refs.map((r, i) => [r, `split:${i}`]))
}
/**
 * Copies a project's live milestones onto another: re-dated so the first starts on `startDay` (day numbers), each Not started and unanswered,
 * keeping its title, place, length, gap, what it moves with and waits on, its words and colour, whether it is shown to the client and asked to be
 * confirmed, and its payment stage (through `refs`). Sets the copy's start date and target end from it. Answers how many milestones it copied.
 */
export async function copyScheduleTo(srcProjectId: string, dstProjectId: string, startDay: number, refs: Map<string, string>, at: Date): Promise<number> {
  const { milestonesOf } = await import('./schedule')
  const { dateOfDay, handoverOf } = await import('./schedule-model')
  const { projectMilestoneLinks, projectMilestones } = await import('@/lib/db/schema')
  const list = (await milestonesOf([srcProjectId])).get(srcProjectId) ?? []
  if (!list.length) return 0
  const shift = startDay - Math.min(...list.map((m) => m.start))
  const ids = new Map(list.map((m) => [m.id, randomUUID()]))
  const by = await sessionMemberId()   // (pending modules S43A) who copied it — this browser's member
  await db.insert(projectMilestones).values(list.map((m) => ({
    id: ids.get(m.id)!, projectId: dstProjectId, title: m.title, position: m.position, startDate: dateOfDay(m.start + shift), endDate: dateOfDay(m.end + shift), status: 'not_started',
    followsId: m.followsId ? ids.get(m.followsId) ?? null : null, gapDays: m.gap, paymentRef: m.paymentRef ? refs.get(m.paymentRef) ?? null : null, paymentDue: m.paymentDue,
    clientVisible: m.clientVisible, confirmAskedAt: m.confirm.askedAt !== null ? at : null, description: m.description ?? null, color: m.color ?? null,
    createdBy: by, updatedBy: by, createdAt: at, updatedAt: at,
  })))
  const links = list.flatMap((m) => (m.after ?? []).filter((a) => ids.has(a.id)).map((a, k) => ({ id: randomUUID(), projectId: dstProjectId, milestoneId: ids.get(m.id)!, afterId: ids.get(a.id)!, gapDays: a.gap, createdAt: new Date(at.getTime() + k * 1000) })))
  if (links.length) await db.insert(projectMilestoneLinks).values(links)
  const h = handoverOf(list)
  await db.update(projects).set({ startDate: dateOfDay(startDay), ...(h ? { targetEndDate: dateOfDay(h.end + shift) } : {}), updatedAt: at }).where(eq(projects.id, dstProjectId))
  return list.length
}
