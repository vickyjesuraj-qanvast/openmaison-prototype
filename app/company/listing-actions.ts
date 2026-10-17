'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studioVerificationFiles, studioVerifications } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { DATA_URL, dataUrlSize } from '@/lib/leads/file-store'
import { FILE_UPLOAD_MAX, tooBigLine } from '@/lib/leads/file-model'
import { listingServiceIsStandIn, submitListingApplication, withdrawListingApplication } from '@/lib/qanvast-listing/service'
import { applyListingAnswer, fetchListingFacts, fetchListingRead, fetchProofFiles, payloadOf, sentOf, touchListing } from '@/lib/qanvast-listing/queries'
import {
  DESCRIPTION_MAX, DIFFERENTIATOR_MAX, PROOF_MAX_PER_KIND, PROOF_TYPES, demoChangesNote, listingBlock, parseSentDocuments,
  type ListingOutcome, type ProofKind,
} from '@/lib/qanvast-listing/model'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/*
 * (pending modules S37 — her "build all of them" 2026-10-11; cards onboarding:qanvast-listing-verification · studio:verify-listing) Company ›
 * Profile › Listed on Qanvast. Owners and Admins only (1.0's /verify was the owner's; the Profile's rule, REG-646) — every action asks the
 * signed-in member and answers a refusal as `{ error: <the rule> }`. A file travels inside one object (the house rule for long strings).
 * One application waits at a time; sending writes the record first, then the seam (a real service's refusal takes it away again, said).
 */

type Refusal = { error: string }
async function runner(): Promise<{ id: string } | Refusal> {
  const v = await fetchViewer()
  const no = listingBlock(v.role)
  return no ? { error: no } : { id: v.id }
}

/* ── proof files ── */

/** Add a proof file (a picture the browser shrank, or a PDF as it is) to the studio's list — kept the moment it is added. */
export async function addListingProof(input: { kind: ProofKind; name: string; dataUrl: string }): Promise<{ id: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const me = await runner(); if ('error' in me) return me
  const kind = input?.kind
  if (kind !== 'project' && kind !== 'testimonial') return { error: 'Pick where the file goes' }
  const name = String(input?.name ?? '').trim().slice(0, 120) || 'A file'
  const data = String(input?.dataUrl ?? '')
  const m = DATA_URL.exec(data)
  if (!m || !PROOF_TYPES.test(m[1]!.toLowerCase())) return { error: `${name} isn’t a PDF, JPG or PNG` }
  const size = dataUrlSize(data)
  if (size > FILE_UPLOAD_MAX) return { error: tooBigLine(name) }
  const [have] = await db.select({ n: sql<number>`count(*)` }).from(studioVerificationFiles).where(and(eq(studioVerificationFiles.kind, kind), isNull(studioVerificationFiles.removedAt)))
  if (Number(have?.n ?? 0) >= PROOF_MAX_PER_KIND) return { error: `Up to ${PROOF_MAX_PER_KIND} files here — take one off first` }
  const id = randomUUID()
  await db.insert(studioVerificationFiles).values({ id, kind, name, mime: m[1]!.toLowerCase(), sizeBytes: size, data, addedBy: me.id, addedAt: new Date() })
  touchListing()
  return { id }
}

/** Take a proof file off the list (softly — Undo puts it back; an application that sent it keeps it). */
export async function removeListingProof(id: string): Promise<{ ok: true; name: string } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const me = await runner(); if ('error' in me) return me
  const [f] = await db.update(studioVerificationFiles).set({ removedAt: new Date() })
    .where(and(eq(studioVerificationFiles.id, String(id ?? '')), isNull(studioVerificationFiles.removedAt))).returning({ name: studioVerificationFiles.name })
  if (!f) return { error: 'That file isn’t on the list any more' }
  touchListing()
  return { ok: true, name: f.name }
}
export async function restoreListingProof(id: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const me = await runner(); if ('error' in me) return me
  const [f] = await db.select({ kind: studioVerificationFiles.kind }).from(studioVerificationFiles).where(eq(studioVerificationFiles.id, String(id ?? ''))).limit(1)
  if (!f) return { error: 'That file isn’t there any more' }
  const [have] = await db.select({ n: sql<number>`count(*)` }).from(studioVerificationFiles).where(and(eq(studioVerificationFiles.kind, f.kind), isNull(studioVerificationFiles.removedAt)))
  if (Number(have?.n ?? 0) >= PROOF_MAX_PER_KIND) return { error: `Up to ${PROOF_MAX_PER_KIND} files here — take one off first` }
  await db.update(studioVerificationFiles).set({ removedAt: null }).where(eq(studioVerificationFiles.id, String(id)))
  touchListing()
  return { ok: true }
}

/* ── the application ── */

/**
 * Send the application — or, for a listed studio, its changes — to Qanvast for review: the studio's own words, and its records as they are
 * today (name, UEN, registrations, completed projects, About photos and awards, review link, website) with its proof files. Refused while one
 * already waits, without a UEN (Qanvast checks it — 1.0's required Registration ID) and without a description (1.0's required field).
 */
export async function sendListingApplication(input: { description: string; differentiator?: string | null }): Promise<{ id: string; kind: 'apply' | 'update' } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const me = await runner(); if ('error' in me) return me
  const description = String(input?.description ?? '').trim()
  const differentiator = String(input?.differentiator ?? '').trim() || null
  if (!description) return { error: 'Describe your studio first — Qanvast shows it to homeowners' }
  if (description.length > DESCRIPTION_MAX) return { error: `Keep the description under ${DESCRIPTION_MAX.toLocaleString('en-SG')} characters` }
  if (differentiator && differentiator.length > DIFFERENTIATOR_MAX) return { error: `Keep what makes you different under ${DIFFERENTIATOR_MAX} characters` }
  const [read, facts, files] = await Promise.all([fetchListingRead(), fetchListingFacts(), fetchProofFiles()])
  if (read.pending) return { error: read.listed ? 'Your changes are waiting for Qanvast already — withdraw them first to send others' : 'Your application is waiting for Qanvast already' }
  if (!facts.uen) return { error: 'Add your UEN in Company details first — Qanvast checks it' }
  const kind = read.listed ? 'update' as const : 'apply' as const
  const id = randomUUID()
  await db.insert(studioVerifications).values({
    id, kind, status: 'pending', studioName: facts.studioName, uen: facts.uen, description, differentiator, projectsDelivered: facts.projectsDelivered,
    submittedDocuments: JSON.stringify(sentOf(facts, files)), submittedBy: me.id, submittedAt: new Date(),
  })
  const sent = await submitListingApplication(await payloadOf({ id, kind, description, differentiator }, facts, files, me.id))
  if ('error' in sent) { await db.delete(studioVerifications).where(eq(studioVerifications.id, id)); return { error: sent.error } }
  if (sent.ref) await db.update(studioVerifications).set({ providerRef: sent.ref }).where(eq(studioVerifications.id, id))
  touchListing()
  return { id, kind }
}

/** Take a waiting application (or a listed studio's waiting changes) back — Undo sends it again. Refused once Qanvast has answered it. */
export async function withdrawListing(id: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const me = await runner(); if ('error' in me) return me
  const [row] = await db.select().from(studioVerifications).where(eq(studioVerifications.id, String(id ?? ''))).limit(1)
  if (!row) return { error: 'That application isn’t there any more' }
  if (row.status !== 'pending') return { error: row.status === 'withdrawn' ? 'It’s withdrawn already' : 'The application has its answer from Qanvast already' }
  const back = await withdrawListingApplication(row.providerRef)
  if ('error' in back) return back
  const moved = await db.update(studioVerifications).set({ status: 'withdrawn', withdrawnAt: new Date(), withdrawnBy: me.id })
    .where(and(eq(studioVerifications.id, row.id), eq(studioVerifications.status, 'pending'))).returning({ id: studioVerifications.id })
  if (!moved.length) return { error: 'The application has its answer from Qanvast already' }
  touchListing()
  return { ok: true }
}

/** Undo a withdrawal: the same application waits again (sent again through the seam once a real service is plugged in). */
export async function undoWithdrawListing(id: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const me = await runner(); if ('error' in me) return me
  const [row] = await db.select().from(studioVerifications).where(eq(studioVerifications.id, String(id ?? ''))).limit(1)
  if (!row || row.status !== 'withdrawn') return { error: 'That application can’t be put back' }
  const read = await fetchListingRead()
  if (read.pending) return { error: 'Another application is waiting for Qanvast — withdraw it first' }
  let ref = row.providerRef
  if (!listingServiceIsStandIn()) {
    const [facts, files] = await Promise.all([fetchListingFacts(), fetchProofFiles()])
    const sent = await submitListingApplication(await payloadOf({ id: row.id, kind: row.kind === 'update' ? 'update' : 'apply', description: row.description ?? '', differentiator: row.differentiator }, facts, files, me.id))
    if ('error' in sent) return { error: sent.error }
    ref = sent.ref
  }
  await db.update(studioVerifications).set({ status: 'pending', withdrawnAt: null, withdrawnBy: null, providerRef: ref }).where(and(eq(studioVerifications.id, row.id), eq(studioVerifications.status, 'withdrawn')))
  touchListing()
  return { ok: true }
}

/** Let Qanvast's ask for changes go — the first application stops there (Not applied), a listed studio keeps its listing as it is. Undo. */
export async function closeListingAsk(id: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const me = await runner(); if ('error' in me) return me
  const moved = await db.update(studioVerifications).set({ status: 'closed', closedAt: new Date(), closedBy: me.id })
    .where(and(eq(studioVerifications.id, String(id ?? '')), eq(studioVerifications.status, 'rejected'))).returning({ id: studioVerifications.id })
  if (!moved.length) return { error: 'There’s no ask for changes to close' }
  touchListing()
  return { ok: true }
}
export async function undoCloseListingAsk(id: string): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const me = await runner(); if ('error' in me) return me
  const moved = await db.update(studioVerifications).set({ status: 'rejected', closedAt: null, closedBy: null })
    .where(and(eq(studioVerifications.id, String(id ?? '')), eq(studioVerifications.status, 'closed'))).returning({ id: studioVerifications.id })
  if (!moved.length) return { error: 'That application can’t be put back' }
  touchListing()
  return { ok: true }
}

/**
 * (demo only) Play Qanvast's answer to a waiting application while the stand-in answers — Listed, or changes asked with a note chosen by rule
 * from what the application lacks. Recorded as `answered_via = 'demo'` and said so on the card and in the bell; refused once a real Qanvast
 * service is plugged in (Qanvast's own answer comes through its webhook then).
 */
export async function playListingAnswer(input: { id: string; outcome: ListingOutcome }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const me = await runner(); if ('error' in me) return me
  if (!listingServiceIsStandIn()) return { error: 'On this studio, Qanvast answers through its own feed' }
  const outcome = input?.outcome
  if (outcome !== 'verified' && outcome !== 'rejected') return { error: 'Pick an answer to play' }
  const [row] = await db.select().from(studioVerifications).where(eq(studioVerifications.id, String(input?.id ?? ''))).limit(1)
  if (!row || row.status !== 'pending') return { error: 'That application isn’t waiting for an answer' }
  const note = outcome === 'rejected' ? demoChangesNote(parseSentDocuments(row.submittedDocuments)) : null
  const r = await applyListingAnswer({ applicationId: row.id, outcome, note }, 'demo')
  return r.status === 'answered' ? { ok: true } : { error: 'That application isn’t waiting for an answer' }
}
