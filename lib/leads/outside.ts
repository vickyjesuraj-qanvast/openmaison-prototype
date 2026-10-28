/**
 * (gaps build, package C — M-03; the report 26-… §3 "Put an outside person on a task", 1.0's F-101 · F-106 · J-27) Someone outside the studio
 * on a task: a subcontractor or a supplier, by name and mobile, with no sign-in. They sit beside the task's members (or instead of them), the
 * row shows them, and *Send on WhatsApp* drafts the task to them in one press — the message opens on the press (wa.me), then the send is
 * recorded. Every task has the field — a lead's and a project's alike (the Tasks tab is one). No client to-dos (M-03). Pure and client-safe.
 */
import { displayDue, isSgMobile, phoneLocal, SG_MOBILE_MSG } from '@/lib/format'
import { MSG } from '@/lib/forms'

export const OUTSIDE_KINDS = ['subcontractor', 'supplier'] as const
export type OutsideKind = (typeof OUTSIDE_KINDS)[number]
export const OUTSIDE_LABEL: Record<OutsideKind, string> = { subcontractor: 'Contractor', supplier: 'Vendor' }   // (the calm UI build 2026-10-27 — 1-23, W-103) Finance's words; the stored kinds stay
/** The glyph an outside person wears where a member wears their initial. */
export const OUTSIDE_ICON: Record<OutsideKind, string> = { subcontractor: 'handyman', supplier: 'local_shipping' }
export const isOutsideKind = (v: unknown): v is OutsideKind => typeof v === 'string' && (OUTSIDE_KINDS as readonly string[]).includes(v)
export const OUTSIDE_NAME_MAX = 60

export type Outside = { name: string; phone: string | null; kind: OutsideKind; sentAt: number | null }
/** A task row's outside person, from its columns. */
export function outsideOf(t: { externalName?: string | null; externalPhone?: string | null; externalKind?: string | null; externalSentAt?: Date | number | null }): Outside | null {
  const name = (t.externalName ?? '').trim()
  if (!name) return null
  const at = t.externalSentAt instanceof Date ? t.externalSentAt.getTime() : typeof t.externalSentAt === 'number' ? t.externalSentAt : null
  return { name, phone: t.externalPhone || null, kind: isOutsideKind(t.externalKind) ? t.externalKind : 'subcontractor', sentAt: at }
}

/** The form's checks, in the house words: a name, and a Singapore mobile (WhatsApp needs one — 8 or 9 first). */
export function outsideErrors(v: { name: string; phone: string }): { name?: string; phone?: string } {
  return { ...(!v.name.trim() ? { name: MSG.required } : {}), ...(!v.phone ? { phone: MSG.required } : !isSgMobile(v.phone) ? { phone: SG_MOBILE_MSG } : {}) }
}

/** "Ah Seng · Subcontractor · 9123 4567" — the person in one line (a tooltip, a filter row). */
export const outsideLine = (o: Pick<Outside, 'name' | 'kind' | 'phone'>) => [o.name, OUTSIDE_LABEL[o.kind], o.phone ? phoneLocal(o.phone) : null].filter(Boolean).join(' · ')

/** The key a filter keeps an outside person by — the same person on many tasks is one row: their number when they have one, else their name. */
export const outsideKey = (o: Pick<Outside, 'name' | 'phone'>) => `ext:${o.phone || o.name.trim().toLowerCase()}`

/**
 * The WhatsApp message a task goes out as: who it is from, whose job and where, the task, when it is due, its description — signed by the
 * member sending it. Never the studio's internal notes or anyone's comments.
 */
export function outsideMessage(o: { person: string; studio: string; sender: string; client: string | null; address: string | null; title: string; due: Date | null; description: string | null }): string {
  const first = o.person.trim().split(/\s+/)[0] ?? o.person
  const where = o.client ? ` for ${o.client}${o.address ? ` at ${o.address}` : ''}` : ''
  const lines = [
    `Hi ${first}, a job from ${o.studio}${where}:`,
    `• ${o.title}${o.due ? ` — by ${displayDue(o.due)}` : ''}`,
    ...(o.description?.trim() ? [o.description.trim().slice(0, 600)] : []),
    `Please reply here to confirm. — ${o.sender}, ${o.studio}`,
  ]
  return lines.join('\n')
}
