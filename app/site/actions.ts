'use server'

import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { betaSignups, contactMessages, newsletterSubscribers } from '@/lib/db/schema'
import { takeTry } from '@/lib/auth/limit'
import { SIGN_IN } from '@/lib/auth/model'
import { deliver } from '@/lib/notifications/delivery'
import { digitsOnly } from '@/lib/format'
import { hasErrors, type FieldErrors } from '@/lib/forms'
import { calendlyHref } from '@/lib/site/model'
import { CONTACT_FAILED, MESSAGE_MAX, NAME_MAX, checkContact, checkDemoRequest, checkNewsletter, phoneForRecord, sourceOf, type ContactField, type ContactForm, type DemoField, type DemoRequest } from '@/lib/site/forms'
import { SITE_CONTACT_EVENT, SITE_DEMO_EVENT, TEAM, contactMail, demoRequestMail } from '@/lib/site/team-mail'

/*
 * (pending modules S35 — 1.0's api/beta-signup · api/contact · api/newsletter) The website's three forms, on the server. Anyone may send them
 * (the site is public); each is checked again here (the browser's checks are a courtesy), slowed after 1.0's tries a minute from one address
 * (ten for a demo request, five for a message or the newsletter; S30's limiter), and written to 1.0's table. A demo request and a contact message also reach OpenMaison's team through the house
 * outbox. A newsletter address never says whether it was already on the list (1.0's "no email enumeration").
 *
 * THE STAND-IN, said plainly: nothing leaves the machine — the outbox records the team's email (Settings › Notifications › Sent messages) and a
 * real provider sends it once the developers plug one in (`setDeliveryAdapter`). Calendly is real: its own page opens to book the call.
 */

/** sign-in's own words for the same refusal */
const TOO_MANY = SIGN_IN.tooMany
/** 1.0's api/beta-signup allowed ten a minute (its contact and newsletter routes five, the limiter's own figure) */
const DEMO_TRIES = 10
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** The visitor's address as the proxy forwards it (1.0's getClientIp), else one shared key — the prototype runs on one machine. */
async function visitor(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
}

export type DemoAnswer = { ok: true; calendly: string } | { error: string; fields?: FieldErrors<DemoField> }

/** Book a demo: the request is kept, the team hears of it, and the visitor's Calendly page (prefilled) is the answer. */
export async function requestDemo(input: DemoRequest): Promise<DemoAnswer> {
  const f = { name: clean(input?.name, NAME_MAX), studio: clean(input?.studio, NAME_MAX), email: clean(input?.email, 200).toLowerCase(), phone: digitsOnly(clean(input?.phone, 40)) }
  const fields = checkDemoRequest(f)
  if (hasErrors(fields)) return { error: 'Some details need a look', fields }
  if (!takeTry(`site:demo:${await visitor()}`, Date.now(), DEMO_TRIES)) return { error: TOO_MANY }
  const id = randomUUID()
  const page = sourceOf(input?.sourcePage, 'landing')
  const phone = phoneForRecord(f.phone)
  try {
    await db.insert(betaSignups).values({ id, name: f.name, studioName: f.studio, email: f.email, phone, sourcePage: page, createdAt: new Date() })
  } catch { return { error: 'Couldn’t send your request — please try again' } }
  const words = demoRequestMail({ name: f.name, studio: f.studio, email: f.email, phone, page })
  try {
    await deliver({ key: `site:demo:${id}:email`, event: SITE_DEMO_EVENT, channel: 'email', to: { memberId: null, name: TEAM.name, email: TEAM.email, phone: null }, subject: words.subject, body: words.body, href: null, leadId: null, notificationId: null })
  } catch { /* the record is what counts (1.0: "a failure must never fail the visitor's request"); the outbox says what went */ }
  return { ok: true, calendly: calendlyHref({ name: f.name, email: f.email }) }
}

export type ContactAnswer = { ok: true } | { error: string; fields?: FieldErrors<ContactField> }

/** The contact form: kept, and emailed to the team with the visitor as the one to answer (1.0's reply-to). */
export async function sendContactMessage(input: ContactForm): Promise<ContactAnswer> {
  /* the message is checked whole (over 5,000 characters is refused, never cut) */
  const f = { name: clean(input?.name, NAME_MAX), email: clean(input?.email, 200).toLowerCase(), subject: clean(input?.subject, 200), message: typeof input?.message === 'string' ? input.message.trim().slice(0, MESSAGE_MAX + 1) : '' }
  const fields = checkContact(f)
  if (hasErrors(fields)) return { error: 'Some details need a look', fields }
  if (!takeTry(`site:contact:${await visitor()}`)) return { error: TOO_MANY }
  const id = randomUUID()
  try {
    await db.insert(contactMessages).values({ id, name: f.name, email: f.email, subject: f.subject || null, message: f.message, sourcePage: sourceOf(input?.sourcePage, 'contact'), createdAt: new Date() })
  } catch { return { error: CONTACT_FAILED } }
  const words = contactMail({ name: f.name, email: f.email, subject: f.subject || null, message: f.message })
  try {
    await deliver({ key: `site:contact:${id}:email`, event: SITE_CONTACT_EVENT, channel: 'email', to: { memberId: null, name: TEAM.name, email: TEAM.email, phone: null }, subject: words.subject, body: words.body, href: null, leadId: null, notificationId: null })
  } catch { /* kept either way */ }
  return { ok: true }
}

export type NewsletterAnswer = { ok: true } | { error: string }

/** The footer's sign-up: one row per address; signing up again answers the same, so no one learns who is on the list. */
export async function subscribeNewsletter(input: { email: string; sourcePage?: string }): Promise<NewsletterAnswer> {
  const email = clean(input?.email, 200).toLowerCase()
  const bad = checkNewsletter(email)
  if (bad) return { error: bad }
  if (!takeTry(`site:newsletter:${await visitor()}`)) return { error: TOO_MANY }
  try {
    await db.insert(newsletterSubscribers).values({ id: randomUUID(), email, sourcePage: sourceOf(input?.sourcePage, 'footer'), createdAt: new Date() })
      .onConflictDoNothing({ target: newsletterSubscribers.email })
  } catch { return { error: 'Couldn’t add you to the list — please try again' } }
  return { ok: true }
}
