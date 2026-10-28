/**
 * (parity map 2026-10-10, TD-019 — 1.0's "Request invite": an outside person's invite raised a Member Invite task for the owner with the name and
 * phone filled in) The studio task an ask to add someone makes, and where it leads — pure and client-safe. The task is an ordinary studio task
 * (no lead) on the Owners: "Add {name} to the studio", its description naming the person, their mobile and who asked. Its door is Company ›
 * Members' Add member, filled from the address (`?add=<name>&phone=<8 digits>`); the bell's `invite_requested` opens it, and the task panel
 * can offer the same door through `taskLinkOf` (one line, wired by the panel's owner).
 */
import { phoneLocal } from '@/lib/format'

export const inviteTaskTitle = (name: string) => `Add ${name} to the studio`

/** Company › Members with Add member open and filled — `from` the place to go back to. */
export function inviteHref(name: string, phone: string | null, from?: string | null): string {
  const q = new URLSearchParams({ add: name.trim() })
  const d = (phone ?? '').replace(/\D/g, '').slice(-8)
  if (d) q.set('phone', d)
  if (from) q.set('from', from)
  return `/company/members?${q.toString()}`
}

/** The task's long text: who they are, their mobile, who asked and on which task. (invented copy) */
export function inviteTaskDescription(o: { name: string; phone: string | null; kind: string; asker: string; task: string; lead: string | null }): string {
  const who = `${o.kind === 'supplier' ? 'Vendor' : 'Contractor'}${o.phone ? ` · mobile ${phoneLocal(o.phone)}` : ''}`
  return `${who}.\n${o.asker} put ${o.name} on “${o.task}”${o.lead ? ` (${o.lead})` : ''} and asks to add them to the studio.\nAdd them on Company › Members.`
}

/** A task that leads somewhere else — the ask to add someone to the studio opens Members' Add member, filled. Null for every other task. */
export function taskLinkOf(t: { title: string; leadId: string | null; description: string | null }): { label: string; href: string } | null {
  if (t.leadId) return null
  const m = /^Add (.+) to the studio$/.exec(t.title.trim())
  if (!m || !/Company › Members/.test(t.description ?? '')) return null
  const phone = /mobile (\d{4}) ?(\d{4})/.exec(t.description ?? '')
  return { label: 'Open Add member', href: inviteHref(m[1]!, phone ? `${phone[1]}${phone[2]}` : null, '/tasks') }
}

/** Members' landing: the person `?add=` names, with their mobile — null when the address asks for nothing. */
export function readInviteParams(p: { get: (k: string) => string | null }): { name: string; phone: string } | null {
  const name = (p.get('add') ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)
  if (!name) return null
  return { name, phone: (p.get('phone') ?? '').replace(/\D/g, '').slice(0, 8) }
}
