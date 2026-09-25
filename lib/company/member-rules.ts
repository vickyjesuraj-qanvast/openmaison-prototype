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

/** The avatar tints a new member takes, in order, skipping those in use (the seeded team's palette, REG-329). */
export const MEMBER_TINTS = ['#5B7FD7', '#3E9B63', '#E8A33D', '#B07B2E', '#2F3B8F', '#C2549A', '#2B8A8A', '#8A5CD1', '#D0663A', '#4C6B2E'] as const
export const nextTint = (used: string[]) => MEMBER_TINTS.find((t) => !used.includes(t)) ?? MEMBER_TINTS[used.length % MEMBER_TINTS.length]!
