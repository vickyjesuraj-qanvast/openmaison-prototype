import { COMPANY } from './model'

/*
 * (pending modules S35) What OpenMaison's team hears from its website — through the house outbox (lib/notifications/delivery.ts), the one way an
 * email leaves OpenMaison, so it is recorded in Settings › Notifications › Sent messages with the rest. 1.0 emailed the contact form to
 * hello@openmaison.ai (Resend, the visitor as reply-to — api/contact/route.ts); a demo request it kept for staff's Beta sign-ups list (Platform
 * admin, excluded by him), so here it reaches the team the same way as the contact form — the stand-in for that list. A newsletter address is a
 * list row only (1.0 sent nothing). PRODUCTION: these go to the platform's own outbox, never a studio's (one database is the demo's here).
 * Pure and client-safe.
 */

export const SITE_DEMO_EVENT = 'site_demo_request' as const
export const SITE_CONTACT_EVENT = 'site_contact' as const
export type SiteEvent = typeof SITE_DEMO_EVENT | typeof SITE_CONTACT_EVENT
export const SITE_EVENTS: readonly SiteEvent[] = [SITE_DEMO_EVENT, SITE_CONTACT_EVENT]
export const isSiteEvent = (k: string): k is SiteEvent => (SITE_EVENTS as readonly string[]).includes(k)
/** Sent messages' name for each (its event pill and rows) — who it went to, then what it was. */
export const SITE_EVENT_LABEL: Record<SiteEvent, string> = {
  [SITE_DEMO_EVENT]: 'To the OpenMaison team · A demo request',
  [SITE_CONTACT_EVENT]: 'To the OpenMaison team · A message from the website',
}

/** The team's inbox (1.0's CONTACT_INBOX). */
export const TEAM = { name: 'OpenMaison team', email: COMPANY.email } as const

/** A demo request, as the team reads it. */
export function demoRequestMail(r: { name: string; studio: string; email: string; phone: string; page: string }): { subject: string; body: string } {
  return {
    subject: `Demo request — ${r.name}, ${r.studio}`,
    body: `Name: ${r.name}\nStudio: ${r.studio}\nEmail: ${r.email}\nPhone: ${r.phone}\nFrom: ${r.page}\n\nCalendly opened for them to book a 30-minute call.`,
  }
}

/** A contact message (1.0's words: "Contact form: {subject} — {name}", the fields, then the message). */
export function contactMail(r: { name: string; email: string; subject: string | null; message: string }): { subject: string; body: string } {
  return {
    subject: `Contact form: ${r.subject || 'New message'} — ${r.name}`,
    body: `Name: ${r.name}\nEmail: ${r.email}\nSubject: ${r.subject || '-'}\n\n${r.message}`,
  }
}
