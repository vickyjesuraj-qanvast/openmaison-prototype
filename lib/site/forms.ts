import { EMAIL_RE, MSG, type FieldErrors } from '@/lib/forms'
import { digitsOnly, isSgPhone } from '@/lib/format'

/*
 * (pending modules S35) The website's three forms — 1.0's beta-signup-modal.tsx, contact/page-client.tsx and marketing-footer.tsx, checked the
 * same way in the browser and on the server (1.0's api/{beta-signup,contact,newsletter}/route.ts). The messages are the house's (lib/forms.ts
 * MSG) — one list for every field in OpenMaison. Pure.
 *
 * The phone: 1.0 offered fourteen country codes; 2.0 is Singapore's for now (her hold on countries beyond Singapore, 2026-10-12) — +65 and the
 * eight digits, 6 / 8 / 9 first, as every phone box in 2.0 (REG-547).
 */

export const MESSAGE_MAX = 5000   // 1.0's MAX_MESSAGE_LENGTH
export const NAME_MAX = 120
export const MESSAGE_LONG = 'Keep the message to 5,000 characters'

export type DemoRequest = { name: string; studio: string; email: string; phone: string; sourcePage?: string }
export type DemoField = 'name' | 'studio' | 'email' | 'phone'
export function checkDemoRequest(f: DemoRequest): FieldErrors<DemoField> {
  const e: FieldErrors<DemoField> = {}
  if (!f.name.trim()) e.name = MSG.required
  if (!f.studio.trim()) e.studio = MSG.required
  if (!f.email.trim()) e.email = MSG.required
  else if (!EMAIL_RE.test(f.email.trim())) e.email = MSG.email
  const d = digitsOnly(f.phone)
  if (!d) e.phone = MSG.required
  else if (!isSgPhone(d)) e.phone = MSG.phone
  return e
}

export type ContactForm = { name: string; email: string; subject: string; message: string; sourcePage?: string }
export type ContactField = 'name' | 'email' | 'message'
export function checkContact(f: ContactForm): FieldErrors<ContactField> {
  const e: FieldErrors<ContactField> = {}
  if (!f.name.trim()) e.name = MSG.required
  if (!f.email.trim()) e.email = MSG.required
  else if (!EMAIL_RE.test(f.email.trim())) e.email = MSG.email
  if (!f.message.trim()) e.message = MSG.required
  else if (f.message.length > MESSAGE_MAX) e.message = MESSAGE_LONG
  return e
}

export function checkNewsletter(email: string): string | null {
  if (!email.trim()) return MSG.required
  return EMAIL_RE.test(email.trim()) ? null : MSG.email
}

/** The page a form was sent from, kept as 1.0 kept it (`source_page`): a site address, else the form's own default. */
export function sourceOf(path: unknown, fallback: string): string {
  return typeof path === 'string' && /^\/site(\/[a-z0-9/-]*)?$/.test(path) && path.length <= 120 ? path : fallback
}

/** 1.0 kept the code with the number: "+65 9123 4567". */
export const phoneForRecord = (digits: string) => `+65 ${digits.slice(0, 4)} ${digits.slice(4)}`

/** (1.0's contact page) When a message can't be sent, the way round it: write to the team directly. */
export const CONTACT_FAILED = 'Couldn’t send your message — please try again, or email hello@openmaison.ai directly'
