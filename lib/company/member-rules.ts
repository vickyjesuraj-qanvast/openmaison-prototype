/**
 * (REG-646, settings parity Q-06) The rules for a studio's people — 1.0's Maison bot enforced them, its API did not (A-32, A-33):
 * Owners and Admins add, deactivate and reactivate members and set roles; only an Owner makes, unmakes or deactivates an Owner;
 * nobody changes their own role or deactivates themself; the studio keeps at least one active Owner. A member is deactivated, never
 * deleted — their records stay theirs and they leave every picker. Pure, client-safe: the actions and Company › Members read the same
 * words.
 */
import type { Role } from '@/lib/leads/enums'

type Actor = { id: string; role: string }
type Target = { id: string; role: string; isActive: boolean }
const runs = (role: string) => role === 'Owner' || role === 'Admin'

/** Why `actor` may not give `target` the role `to`, else null. */
export function roleChangeBlock(actor: Actor, target: Target, to: Role, activeOwners: number): string | null {
  if (!runs(actor.role)) return 'Only Owners and Admins set roles'
  if (actor.id === target.id) return 'Nobody changes their own role'
  if (!target.isActive) return 'Reactivate the member first'
  if ((to === 'Owner' || target.role === 'Owner') && actor.role !== 'Owner') return 'Only an Owner makes or unmakes an Owner'
  if (target.role === 'Owner' && to !== 'Owner' && activeOwners <= 1) return 'The studio keeps at least one Owner'
  return null
}

/** Why `actor` may not deactivate `target`, else null. */
export function deactivateBlock(actor: Actor, target: Target, activeOwners: number): string | null {
  if (!runs(actor.role)) return 'Only Owners and Admins deactivate members'
  if (actor.id === target.id) return 'You can’t deactivate yourself'
  if (!target.isActive) return 'Already deactivated'
  if (target.role === 'Owner' && actor.role !== 'Owner') return 'Only an Owner deactivates an Owner'
  if (target.role === 'Owner' && activeOwners <= 1) return 'The studio keeps at least one Owner'
  return null
}

/** Why `actor` may not reactivate `target`, else null. */
export function reactivateBlock(actor: Actor, target: Target): string | null {
  if (!runs(actor.role)) return 'Only Owners and Admins reactivate members'
  if (target.isActive) return 'Already active'
  if (target.role === 'Owner' && actor.role !== 'Owner') return 'Only an Owner reactivates an Owner'
  return null
}

/** Why `actor` may not add a member with `role`, else null. */
export function addBlock(actor: Actor, role: Role): string | null {
  if (!runs(actor.role)) return 'Only Owners and Admins add members'
  if (role === 'Owner' && actor.role !== 'Owner') return 'Only an Owner makes an Owner'
  return null
}

/** (pending modules S01 — his "build all of them" 2026-10-11; 1.0's Settings › Your Profile) Why `actor` may not change `target`'s name, email,
    phone and photo, else null: everyone changes their own (Your profile); Owners and Admins change anyone's on Company › Members — but an Owner's
    only an Owner (the Owner rules above; a phone is how a member will sign in). */
export function detailsBlock(actor: Actor, target: { id: string; role: string }): string | null {
  if (actor.id === target.id) return null
  if (!runs(actor.role)) return 'Only Owners and Admins change another member’s details'
  if (target.role === 'Owner' && actor.role !== 'Owner') return 'Only an Owner changes an Owner’s details'
  return null
}

/** (simplify round 2 · F1 §6.9.3) Why `actor` may not set `targetId`'s PayNow, else null: everyone sets their own (Your profile, their row on
    Members), Owners and Admins anyone's. (pending modules S14) One rule for the action and Who may do what's row. */
export function payNowBlock(actor: Actor, targetId: string): string | null {
  return actor.id === targetId || runs(actor.role) ? null : 'Only Owners and Admins change another member’s PayNow'
}

/** (pending modules S01) Why these details can't be a member's — 1.0's checks: another member already has the name, the email or the phone
    (2.0 checked only the email, only at Add member). `team` is everyone else, deactivated members too: a number or an address stays theirs. */
export function detailsClash(d: { name: string; email: string; phone: string }, team: { name: string; email: string | null; phone: string | null }[]): string | null {
  if (d.name && team.some((m) => m.name.toLowerCase() === d.name.toLowerCase())) return `${d.name} is already a member`
  if (d.email && team.some((m) => (m.email ?? '').toLowerCase() === d.email.toLowerCase())) return 'Another member has that email'
  if (d.phone && team.some((m) => (m.phone ?? '') === d.phone)) return 'Another member has that phone number'
  return null
}

/** The avatar tints a new member takes, in order, skipping those in use (the seeded team's palette, REG-329). */
export const MEMBER_TINTS = ['#5B7FD7', '#3E9B63', '#E8A33D', '#B07B2E', '#2F3B8F', '#C2549A', '#2B8A8A', '#8A5CD1', '#D0663A', '#4C6B2E'] as const
export const nextTint = (used: string[]) => MEMBER_TINTS.find((t) => !used.includes(t)) ?? MEMBER_TINTS[used.length % MEMBER_TINTS.length]!   // `used`: the looks under any photos (lookUnder)
