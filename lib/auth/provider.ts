import 'server-only'
import type { Contact } from './model'
import { serviceSlot } from '@/lib/services/slots'

/*
 * (pending modules S30 — his "build all of them" 2026-10-11; card onboarding:studio-sign-in; 1.0's src/lib/twilio.ts `sendVerification` ·
 * `checkVerification`, src/lib/bypass-otp.ts, and the Qanvast line's auth routes) THE ONE SEAM for a real sign-in provider.
 *
 * The prototype's provider is a stand-in and says so on every page that asks for a code: it sends nothing and takes any six digits. A real
 * one (1.0 used Twilio Verify, or Qanvast's own sign-in on 20 of its 22 deployments) is plugged in with `setSignInProvider` — the sign-in
 * page, the invitation's page and Your profile's number check all ask it, and nothing else changes:
 *   · `sendCode` — a 6-digit code by SMS to the mobile, or by email to the address.
 *   · `checkCode` — whether the code typed is the one sent. A staff test code for demos (1.0's 72-hour "bypass OTP" set in Platform admin)
 *     belongs inside the real provider's check — Platform admin is out of this build by his call.
 *   (pending modules S34) The client portal's code step asks it too (app/portal/actions.ts — a client's mobile, the same `sendCode` /
 *   `checkCode`), and with a real provider every code step is held to 1.0's limit per visitor address as well (lib/auth/limit.ts).
 *   · `provision` (optional — the Qanvast line): someone the studio has no member for, known to the provider (a Qanvast company user), becomes
 *     a member on their first sign-in, their role from the provider (`roleFromQanvast`: a company Admin → Owner, anyone else → Designer).
 *     (S31) Their company has no studio yet: `studio` names it, and the first sign-in makes it (`createStudio`) with them as its Owner.
 */

export type ProvisionedMember = { name: string; role: 'Owner' | 'Designer'; phone: string | null; email: string | null
  /** (pending modules S31) their company has no studio on OpenMaison yet — 1.0's auto-provision made it on this first sign-in: the studio is
      made with them as its Owner (lib/studios/create.ts `createStudio`, via 'qanvast') */
  studio?: { name: string } }
export type SignInProvider = {
  name: string
  sendCode(to: Contact): Promise<{ ok: true } | { error: string }>
  checkCode(to: Contact, code: string): Promise<boolean>
  provision?(to: Contact): Promise<ProvisionedMember | null>
}

/** The prototype's: no message goes anywhere; any six digits pass. */
const STAND_IN: SignInProvider = {
  name: 'stand-in',
  async sendCode() { return { ok: true } },
  async checkCode(_to, code) { return /^\d{6}$/.test(code) },
}

/* (pending modules S34) the slot (lib/services/slots.ts) — on globalThis, so the provider set at start-up is the one every bundle asks */
const slot = serviceSlot<SignInProvider>('sign-in', STAND_IN)
export const signInProvider = (): SignInProvider => slot.use()
/** The developers' call at start-up (beside `setDeliveryAdapter`; lib/services/install.ts). */
export function setSignInProvider(p: SignInProvider): void { slot.set(p) }
/** Whether the pages should say "Demo only — any six digits". */
export const isStandInProvider = (): boolean => slot.standIn()

/** 1.0's Qanvast line (`resolveTagsFromSubRole`): a Qanvast company Admin is the studio's Owner; anyone else designs. */
export const roleFromQanvast = (subRole: string | null | undefined): 'Owner' | 'Designer' => (subRole === 'Admin' ? 'Owner' : 'Designer')
