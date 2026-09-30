'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadTasks, leads, renderAnnotations, renderConsultationRequests, renderShareLinks, taskAssignees } from '@/lib/db/schema'
import { notify } from '@/lib/notifications/emit'
import { renderFeedbackIds } from '@/lib/notifications/queries'
import { callBackDue, PIN_CHARS, PIN_LIMIT } from '@/lib/visualizer/policy'
import { closedLinkMessage, parseComments, readShareLink, type ShareLinkRead } from '@/lib/visualizer/queries'
import { isSgPhone, phoneDigits } from '@/lib/format'

/*
 * The client's side of a shared render (REG-676, Q-14 · Q-15 · Q-16) — no session: the token is the key. What the client says reaches
 * the lead: the favourite, a note, a pin and a reply each notify the lead's members and (round 1, D2) whoever shared the link — the page
 * names the sharer ("Dane will see it"), so the sharer hears (`render_feedback`); a call back is a Follow-up task for all of them
 * as well (1.0 wrote a table nobody read, A E-07). A link that has expired or been stopped takes nothing — (audit 2026-09-26) nor one
 * whose design is deleted (F092 · F195), whose lead was returned or deleted, or a version the studio has deleted since (F077).
 */

/** (round 1) `closed` — the link no longer opens (the page swaps to its notice); `gone` — the design or pin left the link since the page loaded. */
type Err = { error: string; closed?: 'stopped' | 'expired'; gone?: true }
type Link = ShareLinkRead['s']
type Open = { s: Link; live: ShareLinkRead['live'] }
async function openLink(token: string): Promise<Open | Err> {
  const r = await readShareLink(String(token))
  /* (round 1) the words name whoever shared the link, as the page does */
  if (!r || r.state !== 'open') return { error: await closedLinkMessage(r), closed: r?.state === 'expired' ? 'expired' : 'stopped' }
  return { s: r.s, live: r.live }
}
/** The fallback name of a client the studio has no lead for — one wording in the bell, the pins and the tasks (round 1). */
const CLIENT = 'Your client'
const GONE: Err = { error: 'That design is no longer on this link.', gone: true }
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const leadName = async (leadId: string | null) => (leadId ? (await db.select({ name: leads.name }).from(leads).where(eq(leads.id, leadId)))[0]?.name ?? null : null)
/** (F098) The bell opens the design on the room and the version the client answered on — and on the pin itself when it is one; (UX audit V1)
    on a note, the client's notes on that version, open. */
async function tell(s: Link, title: string, body: string | null, at?: { roomId: string; key: string; pinId?: string; noteId?: string }) {
  const to = await renderFeedbackIds(s)   // (round 1, D2) the lead's members and the link's sharer, once each
  const q = [at ? `room=${at.roomId}` : null, at ? `v=${encodeURIComponent(at.key)}` : null, at?.pinId ? `pin=${at.pinId}` : null, at?.noteId ? `note=${at.noteId}` : null, s.leadId ? `from=${encodeURIComponent(`/leads/${s.leadId}`)}` : null].filter(Boolean).join('&')
  await notify('render_feedback', to, { title, body, href: `/visualizer/${s.designId}${q ? `?${q}` : ''}`, leadId: s.leadId, actorId: null })
}
const refresh = (s: Link) => { revalidatePath(`/renders/${s.token}`); revalidatePath(`/visualizer/${s.designId}`); if (s.leadId) revalidatePath(`/leads/${s.leadId}`, 'layout') }
/** A version still on the link — (F077) not one the studio has deleted since. The bell keeps the studio's own label (it finds the strip). */
const versionIn = (o: Open, key: string) => o.live.find((v) => v.key === key) ?? null

/** "I like this one" — the client's favourite (one at a time; picking another moves it). */
export async function pickFavourite(token: string, key: string): Promise<{ ok: true } | Err> {
  const o = await openLink(token); if ('error' in o) return o
  const v = versionIn(o, key); if (!v) return GONE
  const name = await leadName(o.s.leadId)
  await db.insert(renderConsultationRequests).values({ id: randomUUID(), shareLinkId: o.s.id, kind: 'favourite', versionKey: key, clientName: name, clientPhone: null, message: null, taskId: null, createdAt: new Date() })
  await tell(o.s, `${name ?? CLIENT} picked a favourite`, `${v.roomName} · ${v.label}`, { roomId: v.roomId, key })
  refresh(o.s); return { ok: true }
}

export async function leaveNote(token: string, key: string | null, message: string): Promise<{ ok: true } | Err> {
  const o = await openLink(token); if ('error' in o) return o
  const text = clean(message, PIN_CHARS); if (!text) return { error: 'Write a note first.' }
  const v = key ? versionIn(o, key) : null
  if (key && !v) return GONE
  const name = await leadName(o.s.leadId)
  const id = randomUUID()
  await db.insert(renderConsultationRequests).values({ id, shareLinkId: o.s.id, kind: 'note', versionKey: v ? key : null, clientName: name, clientPhone: null, message: text, taskId: null, createdAt: new Date() })
  await tell(o.s, `${name ?? CLIENT} left a note on the renders`, v ? `${v.roomName} · ${v.label}: “${text}”` : `“${text}”`, v ? { roomId: v.roomId, key: v.key, noteId: id } : undefined)
  refresh(o.s); return { ok: true }
}

/**
 * "Ask for a call back" — a Follow-up task for the lead's members and (round 1, D2) the link's sharer, or the studio's Owners and Admins
 * when neither is left (1.0's consultation form, now read — Q-16). (F099) A link with no lead
 * behind it (a personal design) needs the client's number — the studio has no other; on a lead's link an empty box means "the number you
 * have", and the task says so. Due in a working hour on the studio's clock, never at 3 a.m. (`callBackDue`).
 */
export async function askCallBack(token: string, phone: string, message: string): Promise<{ ok: true } | Err> {
  const o = await openLink(token); if ('error' in o) return o
  const s = o.s
  const digits = phoneDigits(phone)
  if (digits ? !isSgPhone(digits) : !s.leadId) return { error: 'Enter a Singapore number — 8 digits starting with 6, 8 or 9.' }
  const lead = s.leadId ? (await db.select({ name: leads.name, phone: leads.phone }).from(leads).where(eq(leads.id, s.leadId)))[0] ?? null : null
  const name = lead?.name ?? null
  const text = clean(message, 600)
  const at = new Date(), taskId = randomUUID()
  const team = await renderFeedbackIds(s)   // (round 1, D2) the sharer calls back too
  const onFile = lead?.phone ? phoneDigits(lead.phone) : ''
  const callOn = digits ? `Call on ${digits.slice(0, 4)} ${digits.slice(4)}.` : onFile ? `Call on the lead’s number, ${onFile.slice(0, 4)} ${onFile.slice(4)}.` : 'Call on the lead’s number.'
  await db.transaction(async (tx) => {
    await tx.insert(leadTasks).values({ id: taskId, leadId: s.leadId, title: `Call ${name ?? 'the client'} back about the renders`, kind: 'Follow-up', dueAt: callBackDue(at), done: false, createdAt: at, creatorId: s.createdBy ?? 'dane', description: [callOn, text ? `“${text}”` : null].filter(Boolean).join(' '), seenAt: null, updatedAt: at })
    if (team.length) await tx.insert(taskAssignees).values(team.map((memberId) => ({ taskId, memberId })))
    await tx.insert(renderConsultationRequests).values({ id: randomUUID(), shareLinkId: s.id, kind: 'call_back', versionKey: null, clientName: name, clientPhone: digits || null, message: text || null, taskId, createdAt: at })
  })
  await tell(s, `${name ?? CLIENT} asked for a call back`, text ? `About the renders: “${text}”` : 'About the renders you shared.')
  refresh(s)
  if (s.leadId) revalidatePath(`/leads/${s.leadId}/tasks`)
  return { ok: true }
}

/** A pin from the client (1.0's homeowner annotator, A E-20): same limits as the studio's. */
export async function clientPin(token: string, key: string, x: number, y: number, body: string): Promise<{ id: string } | Err> {
  const o = await openLink(token); if ('error' in o) return o
  const v = versionIn(o, key); if (!v) return GONE
  const text = clean(body, PIN_CHARS); if (!text) return { error: 'Write what you’d like changed here.' }
  const [jobId, vid] = key.split(':')
  const count = (await db.select({ id: renderAnnotations.id }).from(renderAnnotations).where(and(eq(renderAnnotations.jobId, jobId!), eq(renderAnnotations.variantId, Number(vid)), isNull(renderAnnotations.deletedAt)))).length
  if (count >= PIN_LIMIT) return { error: 'This design has too many pins already.' }
  const name = (await leadName(o.s.leadId)) ?? CLIENT
  const id = randomUUID(), at = new Date()
  await db.insert(renderAnnotations).values({ id, jobId: jobId!, variantId: Number(vid), x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)), body: text, status: 'open', authorRole: 'client', authorMemberId: null, authorName: name, commentsJson: '[]', createdAt: at, updatedAt: at })
  await tell(o.s, `${name} pinned a note on a render`, `${v.roomName} · ${v.label}: “${text}”`, { roomId: v.roomId, key, pinId: id })
  refresh(o.s); return { id }
}
export async function clientReply(token: string, pinId: string, body: string): Promise<{ ok: true } | Err> {
  const o = await openLink(token); if ('error' in o) return o
  const text = clean(body, PIN_CHARS); if (!text) return { error: 'Write a reply first.' }
  const [p] = await db.select().from(renderAnnotations).where(and(eq(renderAnnotations.id, String(pinId)), isNull(renderAnnotations.deletedAt)))
  const v = p ? versionIn(o, `${p.jobId}:${p.variantId}`) : null
  /* (round 1, D1) the client answers only on the threads they started — the studio's own pins never reach the link */
  if (!p || !v || p.authorRole !== 'client') return { error: 'That pin is gone.', gone: true }
  const name = (await leadName(o.s.leadId)) ?? CLIENT
  const comments = [...parseComments(p.commentsJson), { id: randomUUID(), authorRole: 'client' as const, authorName: name, authorMemberId: null, body: text, createdAt: Date.now() }]
  await db.update(renderAnnotations).set({ commentsJson: JSON.stringify(comments), updatedAt: new Date() }).where(eq(renderAnnotations.id, p.id))
  await tell(o.s, `${name} replied on a pin`, `“${text}”`, { roomId: v.roomId, key: v.key, pinId: p.id })
  refresh(o.s); return { ok: true }
}

/** The client opened the link (1.0's `view_count`), with when — only a link that opens counts. */
export async function stampShareView(token: string): Promise<void> {
  const r = await readShareLink(String(token)); if (!r || r.state !== 'open') return
  await db.update(renderShareLinks).set({ viewCount: r.s.viewCount + 1, lastViewedAt: new Date() }).where(eq(renderShareLinks.id, r.s.id))
}
