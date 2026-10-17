import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { homeownerProfiles, leadFiles, leads, members, projectSelectionOptions, projectSelections, projects } from '@/lib/db/schema'
import { canOpenLead, fetchViewer } from '@/lib/leads/visibility'
import { titleCaseName } from '@/lib/format'
import { fetchBrand } from '@/lib/templates/queries'
import { letterheadOf } from './money-queries'
import { choicesFolder, pickGstPct } from './choices'
import { normPrice } from './choices-model'
import type { PortalVisitor } from '@/lib/portal/session'
import { receiptHashSource, type SelectionReceiptData } from './choice-receipt-model'
import { isChoiceAnswer, type ChoiceAnswer } from './decline'   // (parity map, TD-044)

/*
 * (gaps build D, item 7 — 1.0 F-129 · F-163 · I-287, the per-pick "selection receipt") A confirmed pick's receipt: what was put to the client
 * (every option with its price against the quote), the pick, who made it and when, their note, and a fingerprint — SHA-256 over exactly what
 * the receipt says, so a printed copy can be checked against the record later. Filed as one entry in the lead's Files › Choices (a `lead_files`
 * row with no bytes: its page IS the receipt, as a payment receipt's entry is — the contract's `receiptOfFile` rule) and listed in the portal's
 * Documents. A changed pick re-issues it (same entry, new fingerprint); a pick undone takes the entry back to the trash.
 * (parity map 2026-10-10, TD-044 — 1.0 made a receipt for every answered selection, its status approved, rejected or change requested) The
 * client's no — **Turn them down** or **Ask for other options** — has its receipt as well: the options put to them, none ticked, their answer
 * and reason, who and when, and a fingerprint that takes the answer in. Filed the same way once the answer lands (`fileSelectionReceipt`);
 * sharing the choice again takes it back to the trash, as a pick undone does (the trail stays in Activity).
 */

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
export const receiptFileName = (title: string) => `Selection receipt · ${safeName(title) || 'Choice'}.pdf`

/** (parity map, TD-044) The client's no as its receipt reads it — the answer, who gave it, when — or null when the choice holds none. */
function noOf(s: typeof projectSelections.$inferSelect): { kind: ChoiceAnswer; at: Date; by: string | null; note: string | null } | null {
  return s.status === 'declined' && isChoiceAnswer(s.clientAnswer) && s.clientAnswerAt ? { kind: s.clientAnswer, at: s.clientAnswerAt, by: s.clientAnswerBy, note: s.clientAnswerNote } : null
}

/** The receipt's facts for a chosen choice — or (parity map, TD-044) one the client said no to — null otherwise (or gone). The page, the file
    and the fingerprint read this one. */
async function receiptFacts(selectionId: string): Promise<(SelectionReceiptData & { leadId: string; projectId: string }) | null> {
  const [r] = await db.select({ s: projectSelections, p: projects, l: leads }).from(projectSelections)
    .innerJoin(projects, eq(projects.id, projectSelections.projectId)).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(eq(projectSelections.id, selectionId), isNull(projectSelections.deletedAt), isNull(projects.deletedAt))).limit(1)
  if (!r) return null
  const no = noOf(r.s)
  if (!no && (r.s.status !== 'chosen' || !r.s.chosenOptionId || !r.s.chosenAt)) return null
  const { s, p, l } = r
  const chosenAt = no ? no.at : r.s.chosenAt!
  const [opts, brand, gst] = await Promise.all([
    db.select().from(projectSelectionOptions).where(and(eq(projectSelectionOptions.selectionId, s.id), isNull(projectSelectionOptions.deletedAt))).orderBy(asc(projectSelectionOptions.position), asc(projectSelectionOptions.createdAt)),
    fetchBrand(),
    pickGstPct([p.id]),
  ])
  const by = no ? (no.by ? (await db.select({ name: homeownerProfiles.name }).from(homeownerProfiles).where(eq(homeownerProfiles.id, no.by)).limit(1))[0]?.name ?? null : null)
    : s.chosenBy === 'studio'
    ? (s.chosenMemberId ? (await db.select({ name: members.name }).from(members).where(eq(members.id, s.chosenMemberId)).limit(1))[0]?.name ?? null : null)
    : (s.chosenHomeownerId ? (await db.select({ name: homeownerProfiles.name }).from(homeownerProfiles).where(eq(homeownerProfiles.id, s.chosenHomeownerId)).limit(1))[0]?.name ?? null : null)
  const { letterhead } = await letterheadOf(brand, null, p.quoteId)
  const client = titleCaseName(l.name)
  return {
    leadId: l.id, projectId: p.id,
    letterhead, studioPhone: brand.details.phone, studioEmail: brand.details.email,
    client, property: [l.propertyAddress ?? l.leadAddress, l.propertyType].filter(Boolean).join(' · ') || null,
    project: { name: p.name, number: p.number },
    choice: { id: s.id, title: s.title, room: s.room },
    options: opts.map((o) => ({ id: o.id, name: o.name, description: o.description, vendor: o.vendor, priceMinor: normPrice(o.priceMinor), picked: !no && o.id === s.chosenOptionId })),
    pick: no ? { by: 'client', person: by ? titleCaseName(by) : client, at: chosenAt.getTime(), note: no.note }
      : { by: s.chosenBy === 'studio' ? 'studio' : 'client', person: by ? titleCaseName(by) : s.chosenBy === 'studio' ? null : client, at: chosenAt.getTime(), note: s.chosenBy === 'studio' ? null : s.chosenNote },
    gstPct: gst.get(p.id) ?? 0,
    hash: '',
    answer: no?.kind ?? null,
  }
}
/** The fingerprint: the record as decided (`receiptHashSource`), never its letterhead or names (a new logo does not change what was chosen). */
const hashOf = (d: SelectionReceiptData) => {
  const picked = d.options.find((o) => o.picked)
  return sha(receiptHashSource(d.choice, d.options, { optionId: picked?.id ?? '', by: d.pick.by, at: d.pick.at, note: d.pick.note }, d.answer))
}

/**
 * Files (or re-files) the receipt of a choice once it is chosen: one entry per choice in Files › Choices, its fingerprint on the choice.
 * Not chosen any more (a pick undone) → the entry goes to the trash and the fingerprint is cleared. Never throws on the caller's path.
 */
export async function fileSelectionReceipt(selectionId: string): Promise<void> {
  try {
    const d = await receiptFacts(selectionId)
    const [s] = await db.select({ id: projectSelections.id, fileId: projectSelections.receiptFileId, projectId: projectSelections.projectId, title: projectSelections.title, by: projectSelections.createdBy })
      .from(projectSelections).where(eq(projectSelections.id, selectionId)).limit(1)
    if (!s) return
    const now = new Date()
    if (!d) {
      if (s.fileId) await db.update(leadFiles).set({ deletedAt: now, updatedAt: now }).where(and(eq(leadFiles.id, s.fileId), isNull(leadFiles.deletedAt)))
      await db.update(projectSelections).set({ receiptHash: null }).where(eq(projectSelections.id, selectionId))
      return
    }
    const hash = hashOf(d)
    const name = receiptFileName(d.choice.title)
    let fileId = s.fileId
    const [had] = fileId ? await db.select({ id: leadFiles.id }).from(leadFiles).where(eq(leadFiles.id, fileId)).limit(1) : []
    if (had) await db.update(leadFiles).set({ name, deletedAt: null, updatedAt: now }).where(eq(leadFiles.id, had.id))
    else {
      const [p] = await db.select({ leadId: projects.leadId }).from(projects).where(eq(projects.id, s.projectId)).limit(1)
      if (!p) return
      const folder = await choicesFolder(p.leadId, s.by ?? '')
      fileId = randomUUID()
      await db.insert(leadFiles).values({ id: fileId, leadId: p.leadId, kind: 'pdf', name, thumb: null, createdAt: new Date(d.pick.at), parentId: folder, ownerId: s.by, sizeBytes: null, mime: 'application/pdf', updatedAt: now })
    }
    await db.update(projectSelections).set({ receiptFileId: fileId, receiptHash: hash }).where(eq(projectSelections.id, selectionId))
  } catch { /* a receipt never stops the pick — the repair files any that are missing */ }
}

/** A selection receipt's entry in Files is the receipt itself: the file's choice, when it is one. */
export async function choiceReceiptOfFile(fileId: string): Promise<{ projectId: string; selectionId: string } | null> {
  const [r] = await db.select({ projectId: projectSelections.projectId, selectionId: projectSelections.id }).from(projectSelections)
    .where(and(eq(projectSelections.receiptFileId, fileId), isNull(projectSelections.deletedAt))).limit(1)
  return r ?? null
}

/** The receipt's page in the studio — Who sees leads of the project's lead; null when not chosen, gone or not theirs. */
export async function fetchSelectionReceipt(projectId: string, selectionId: string): Promise<(SelectionReceiptData & { projectId: string; leadId: string; fileId: string | null }) | null> {
  const d = await receiptFacts(selectionId)
  if (!d || d.projectId !== projectId) return null
  if (!(await canOpenLead(await fetchViewer(), d.leadId))) return null
  const [s] = await db.select({ hash: projectSelections.receiptHash, fileId: projectSelections.receiptFileId }).from(projectSelections).where(eq(projectSelections.id, selectionId)).limit(1)
  return { ...d, hash: s?.hash ?? hashOf(d), fileId: s?.fileId ?? null }
}

/** The receipt on the client's portal — one of the visitor's homes' choices, shared with them and chosen (or, TD-044, answered no). */
export async function fetchPortalSelectionReceipt(visitor: PortalVisitor, selectionId: string): Promise<SelectionReceiptData | null> {
  const d = await receiptFacts(selectionId)
  if (!d || !visitor.links.some((l) => l.leadId === d.leadId)) return null
  const [s] = await db.select({ hash: projectSelections.receiptHash }).from(projectSelections).where(eq(projectSelections.id, selectionId)).limit(1)
  return { ...d, hash: s?.hash ?? hashOf(d) }
}

/** (the portal's Documents) The receipts of a visitor's homes' chosen choices, newest pick first. (parity map, TD-044) `answers` adds the
    receipts of the client's no — each with `answer` (its line then reads the answer, not an option: `answerOf(answer).chip`). */
export async function portalSelectionReceipts(leadIds: string[], o: { answers?: boolean } = {}): Promise<{ leadId: string; selectionId: string; title: string; option: string; at: number; answer?: ChoiceAnswer }[]> {
  if (!leadIds.length) return []
  const rows = await db.select({ leadId: projects.leadId, id: projectSelections.id, title: projectSelections.title, at: projectSelections.chosenAt, optionId: projectSelections.chosenOptionId, hash: projectSelections.receiptHash })
    .from(projectSelections).innerJoin(projects, eq(projects.id, projectSelections.projectId))
    .where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt), isNull(projectSelections.deletedAt), eq(projectSelections.status, 'chosen')))
  const live = rows.filter((r) => r.hash && r.at && r.optionId)
  const names = live.length ? new Map((await db.select({ id: projectSelectionOptions.id, name: projectSelectionOptions.name }).from(projectSelectionOptions).where(inArray(projectSelectionOptions.id, live.map((r) => r.optionId!)))).map((o) => [o.id, o.name])) : new Map<string, string>()
  const picks = live.map((r) => ({ leadId: r.leadId, selectionId: r.id, title: r.title, option: names.get(r.optionId!) ?? '', at: r.at!.getTime() }))
  const nos = o.answers ? (await db.select({ leadId: projects.leadId, s: projectSelections }).from(projectSelections).innerJoin(projects, eq(projects.id, projectSelections.projectId))
    .where(and(inArray(projects.leadId, leadIds), isNull(projects.deletedAt), isNull(projectSelections.deletedAt), eq(projectSelections.status, 'declined'))))
    .flatMap((r) => { const no = noOf(r.s); return no && r.s.receiptHash ? [{ leadId: r.leadId, selectionId: r.s.id, title: r.s.title, option: '', at: no.at.getTime(), answer: no.kind }] : [] }) : []
  return [...picks, ...nos].sort((a, b) => b.at - a.at)
}
