/* (gaps build E, item 5) Settings › Notifications › Sent messages — the outbox's rows as the log reads them. Pure and client-safe. */

import { renderTemplate, type EventKey } from '@/lib/notifications/model'
import { heldWords } from '@/lib/notifications/held'   // (simplify round 2, R2-C)
import { safeguardWords } from '@/lib/notifications/safeguards'   // (parity map, UC-082 · UC-083)
import type { ClientEvent } from '@/lib/portal/client-messages'
import type { InviteEvent } from '@/lib/company/invitations'   // (pending modules S09)
import type { SummaryEvent } from '@/lib/notifications/summary'   // (pending modules S18)
import type { SiteEvent } from '@/lib/site/team-mail'   // (pending modules S35) OpenMaison's website to its own team
/** (gaps build H, H-Q17) a studio event, or one of the client's messages — (pending modules S09) or an invitation to a new member */
export type SentEvent = EventKey | ClientEvent | InviteEvent | SummaryEvent | SiteEvent   // (pending modules S18) and a member's daily summary — (S35) and the website's demo requests and messages to OpenMaison's team

export type SentChannel = 'email' | 'whatsapp'
/** (simplify round 2, R2-C) 'held' = a client's message waiting out its action's Undo (lib/notifications/delivery.ts `holdClientMail`);
    'sending' = claimed by a release, on its way through the adapter */
export type SentStatus = 'sent' | 'failed' | 'no_address' | 'held' | 'sending'
  | 'paused' | 'held_large' | 'dropped'   // (parity map, UC-082) OpenMaison's pause · a large send for the Owner · dropped by the Owner (lib/notifications/safeguards.ts)
  | 'not_in_plan'   // (pending modules S19) a WhatsApp message on a Free studio — written, never sent (1.0's "Not included in plan")
  | 'blocked'   // (pending modules S34) a deployment that sends only to its test list (1.0's NOTIFY_ALLOWLIST) — written, never sent
export type SentMessage = {
  id: string
  at: number
  channel: SentChannel
  event: SentEvent
  toName: string
  toAddress: string | null
  subject: string | null
  body: string
  href: string | null
  status: SentStatus
  /** (simplify round 2) when a held message goes unless its Undo takes it back (ms) */
  sendAfter: number | null
  error: string | null
  /** 'outbox' while the prototype's adapter records instead of sending. */
  provider: string
  /** (parity map, UC-083) the tries again so far, and when the next is due (null = none) */
  attempts?: number
  nextTryAt?: number | null
  /** (parity map, UC-082) the large send it waits in, for the Owner's Send · Drop */
  batch?: string | null
  /** (pending modules S34) what the provider's receipts said — delivered to the phone or the inbox, read (ms; null = not reported) */
  deliveredAt?: number | null
  readAt?: number | null
}
export type SentQuery = { channel: 'all' | SentChannel; event: 'all' | SentEvent; limit: number }
export type SentPage = { rows: SentMessage[]; /** every row the filters match */ total: number; /** the events the log holds, for the event filter */ events: SentEvent[]; /** the viewer sees the studio's whole log (Owners and Admins), else their own messages */ everyone: boolean
  /** (pending modules S34) the prototype's outbox still answers — nothing is really sent, and the log says so */
  simulated?: boolean }

export const SENT_PAGE = 25
export const CHANNEL_WORDS: Record<SentChannel, string> = { email: 'Email', whatsapp: 'WhatsApp' }
/** How a message went, in the log's words (invented copy). */
export const statusWords = (m: Pick<SentMessage, 'status' | 'channel'> & { sendAfter?: number | null; attempts?: number; nextTryAt?: number | null; error?: string | null; deliveredAt?: number | null; readAt?: number | null }): string =>
  safeguardWords(m) ?? (   // (parity map, UC-082 · UC-083)
  m.status === 'held' ? heldWords(m.sendAfter) : m.status === 'sending' ? 'Sending' :   // (simplify round 2, R2-C)
  m.status === 'not_in_plan' ? 'Not sent — WhatsApp notifications come with Pro' :   // (pending modules S19)
  m.status === 'blocked' ? 'Not sent — this server only sends to its test list' :   // (pending modules S34, 1.0's NOTIFY_ALLOWLIST)
  /* (pending modules S34) once a real provider reports back: Delivered, then Read (WhatsApp's blue ticks) */
  m.status === 'sent' ? (m.readAt ? 'Read' : m.deliveredAt ? 'Delivered' : 'Sent') : m.status === 'failed' ? 'Didn’t go' : m.channel === 'email' ? 'No email address' : 'No mobile number')
/** The message's first line — the log's Message column (an email's subject, a WhatsApp's opening words without the link it ends on). */
export const firstLine = (m: Pick<SentMessage, 'subject' | 'body'>): string => {
  const line = (m.subject?.trim() || m.body.split('\n').find((l) => l.trim()) || '').trim()
  return line.replace(/\s*https?:\/\/\S+/g, '').replace(/\s*(?:[:—–-]|Open it:?)\s*$/u, '').trim() || line
}

/* ── the message as the recipient reads it (lib/notifications/delivery.ts, and the repair's demo rows) ── */
export type Notice = { title: string; body?: string | null; href?: string | null; leadId?: string | null; quoteId?: string | null; actorId?: string | null; fields?: Record<string, string> }
/**
 * The studio's message for the event, filled for one person. A message whose words name a field this notice can't fill (a task's title the
 * sender did not pass) is not sent half-filled: it goes in the notice's own words — the bell's title and line, the link, the studio (invented
 * copy, the shape of the house drafts).
 */
export function compose(channel: SentChannel, words: { subject: string; body: string }, fields: Record<string, string>, n: Notice, member: string): { subject: string | null; body: string } {
  const all: Record<string, string> = { ...fields, '{member}': member }
  const subject = channel === 'email' ? renderTemplate(words.subject, all) : null
  const body = renderTemplate(words.body, all)
  if (!/\{[a-z_]+\}/.test(`${subject ?? ''} ${body}`)) return { subject, body }
  const line = n.body ? `${n.title} — ${n.body}` : n.title
  return channel === 'email'
    ? { subject: n.title, body: `Hi ${member},\n\n${line}\n\nOpen it: ${all['{link}']}\n\n${all['{studio}']}` }
    : { subject: null, body: `${line}: ${all['{link}']}` }
}


/** A mobile number as WhatsApp takes it — +65 and the eight digits; null when there is none on file. */
export function waNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length === 8 ? `+65${digits}` : digits.length > 8 ? `+${digits}` : null
}
