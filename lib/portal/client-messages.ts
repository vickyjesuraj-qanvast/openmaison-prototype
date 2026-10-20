/**
 * (gaps build H — calls H-Q17…H-Q19; Q-41's "automatic SMS / email later" is now) The messages that reach the client by themselves — pure and
 * client-safe. Seven events, each an email and a WhatsApp in the studio's own words with fields the sender fills, switched in Settings ›
 * Notifications › Messages to clients. (simplify Q-13, his "build everything" 2026-10-09) Four more — a choice to make, the work paused, the
 * work running again, the home handed over — and the team's messages emailed by default (H-Q18 had them off; the one-an-hour guard stays). They leave through E's delivery layer (lib/notifications/delivery.ts `deliver`, the outbox, Sent
 * messages); the sender is lib/portal/client-messages-send.ts. (simplify round 2 — P3 §6.8's option, his "fix all the pending things"
 * 2026-10-09) A twelfth, off until the studio switches it on: a payment due today — once per invoice, on its due day, while some of it is still to
 * pay (lib/portal/payment-due.ts, run when the studio's bell is read, as its derived reminders are). 1.0 emailed the client on an invoice sent, a signature requested, a contract
 * sent, a timeline published and an escalation resolved (6-portal "Things the inventory missed").
 */
import { renderTemplate } from '@/lib/notifications/model'
import type { SectionKey } from './sections'

export type ClientEvent = 'client_invoice_sent' | 'client_receipt' | 'client_to_answer' | 'client_schedule_shared' | 'client_update' | 'client_issue_answered' | 'client_message'
  /* (simplify Q-13) a choice shared · a hold · a resume · the handover — each its own row and its own words */
  | 'client_choice' | 'client_paused' | 'client_resumed' | 'client_handed_over'
  /* (simplify round 2 — P3 §6.8's option, his "fix all the pending things" 2026-10-09) the invoice's due day — off until the studio switches it on */
  | 'client_payment_due'
  /* (parity map 2026-10-10 — CP-118 · FR-095 · CP-110 · TD-049 · UC-094 · TD-067 · UC-113) 1.0's client emails 2.0 had no event for: a signature
     confirmed, questions to answer, a floor plan shared, the studio asking for theirs */
  | 'client_signed' | 'client_questions' | 'client_floor_plan' | 'client_floor_plan_ask'
  /* (pending modules S23 — the held card's "the client's meeting email") a meeting booked with them: when, where and the invitation's link */
  | 'client_meeting'
  /* (pending modules S27 — 1.0's hangout.homeowner_registered "Registration confirmed") a chat booked with the studio at a Qanvast Hangout */
  | 'client_hangout'
export type ClientEventDef = { key: ClientEvent; label: string; help: string; icon: string; /** the portal section it belongs to — off, nothing goes */ section: SectionKey | null }
export const CLIENT_EVENTS: ClientEventDef[] = [
  { key: 'client_invoice_sent', label: 'An invoice is sent', help: 'A stage’s invoice or a one-off invoice goes to the client.', icon: 'receipt_long', section: 'money' },
  /* (simplify round 2 — P3 §6.8) (invented copy) once per invoice, on its due day, while some of it is still to pay — lib/portal/payment-due.ts */
  { key: 'client_payment_due', label: 'A payment is due today', help: 'On a sent invoice’s due day, while some of it is still to pay — once for each invoice.', icon: 'today', section: 'money' },
  { key: 'client_receipt', label: 'A payment is confirmed', help: 'The receipt is ready on their page.', icon: 'payments', section: 'money' },
  { key: 'client_to_answer', label: 'Something to sign or approve', help: 'An agreement sent for signature, a quote or a change to the contract sent for their answer.', icon: 'signature', section: null },
  { key: 'client_schedule_shared', label: 'The schedule is shared', help: 'The first share, and each share of changes.', icon: 'calendar_month', section: 'schedule' },
  { key: 'client_update', label: 'An update is published', help: 'An update about the work goes out to them.', icon: 'chat', section: 'updates' },
  { key: 'client_issue_answered', label: 'The studio answers an issue', help: 'A reply to the client, or the issue marked resolved — never an internal note.', icon: 'handyman', section: 'issues' },
  { key: 'client_message', label: 'A message from the team', help: 'In Messages — at most one an hour while they haven’t read it.', icon: 'comment', section: 'messages' },
  /* (simplify S-21 · Q-13) (invented copy) */
  { key: 'client_choice', label: 'A choice to make', help: 'A choice is shared with them — the options to pick from on their page.', icon: 'palette', section: 'choices' },
  { key: 'client_paused', label: 'The work is paused', help: 'The project is put on hold — with the reason they read on their schedule and when it should pick up.', icon: 'hourglass_top', section: null },
  { key: 'client_resumed', label: 'The work is running again', help: 'The project resumes after a hold.', icon: 'restart_alt', section: null },
  { key: 'client_handed_over', label: 'The home is handed over', help: 'The handover is completed.', icon: 'key', section: null },
  /* (parity map 2026-10-10) (invented copy) */
  { key: 'client_signed', label: 'A signature is confirmed', help: 'Once they sign an agreement or a quote — their copy is on their page.', icon: 'draw', section: null },
  { key: 'client_questions', label: 'Questions to answer', help: 'The studio asks them to answer the questionnaire.', icon: 'help', section: null },
  { key: 'client_floor_plan', label: 'A floor plan is shared', help: 'The studio adds a floor plan to their page.', icon: 'floor_lamp', section: null },
  { key: 'client_floor_plan_ask', label: 'The studio asks for their floor plan', help: 'They can send it from their page.', icon: 'upload_file', section: null },
  /* (pending modules S23) (invented copy) — to the lead's email, portal or not: a lead meets the studio before it has a portal */
  { key: 'client_meeting', label: 'A meeting is booked', help: 'When and where, with a link to add it to their calendar or say the time doesn’t suit.', icon: 'event', section: null },
  /* (pending modules S27) (invented copy) — to the number and address they booked with: the day, the hours and the link to their own page */
  { key: 'client_hangout', label: 'A Hangout chat is booked', help: 'When they booked a chat with you at a Qanvast Hangout — the day, the hours and a link to their own page.', icon: 'group', section: null },
]
export const clientEventDef = (k: string) => CLIENT_EVENTS.find((e) => e.key === k)
export const isClientEvent = (k: string): k is ClientEvent => CLIENT_EVENTS.some((e) => e.key === k)

export type ClientChannel = 'email' | 'whatsapp'
export const CLIENT_CHANNELS: { key: ClientChannel; label: string }[] = [{ key: 'email', label: 'Email' }, { key: 'whatsapp', label: 'WhatsApp' }]
/** (H-Q18) Email on; WhatsApp off for all — the studio's own WhatsApp drafts already go on Send. (simplify Q-13, a deliberate change of H-Q18)
    the team's messages are emailed by default too — at most one an hour (`MESSAGE_GAP_MINUTES`) — and the four new events start on email. */
export const DEFAULT_CLIENT_CHANNELS: Record<ClientEvent, Record<ClientChannel, boolean>> = {
  client_invoice_sent: { email: true, whatsapp: false }, client_receipt: { email: true, whatsapp: false }, client_to_answer: { email: true, whatsapp: false },
  client_schedule_shared: { email: true, whatsapp: false }, client_update: { email: true, whatsapp: false }, client_issue_answered: { email: true, whatsapp: false },
  client_message: { email: true, whatsapp: false },
  client_choice: { email: true, whatsapp: false }, client_paused: { email: true, whatsapp: false }, client_resumed: { email: true, whatsapp: false }, client_handed_over: { email: true, whatsapp: false },
  /* (simplify round 2 — P3 §6.8) off by default: the studio decides whether its clients get a reminder on the due day */
  client_payment_due: { email: false, whatsapp: false },
  /* (parity map 2026-10-10) on email, as 1.0 sent them */
  client_signed: { email: true, whatsapp: false }, client_questions: { email: true, whatsapp: false }, client_floor_plan: { email: true, whatsapp: false }, client_floor_plan_ask: { email: true, whatsapp: false },
  client_meeting: { email: true, whatsapp: false },   // (pending modules S23) the invitation's WhatsApp is the studio's own press
  client_hangout: { email: true, whatsapp: true },   // (pending modules S27) they booked with their mobile — no press of the studio's sends it otherwise (1.0 confirmed by SMS and email)
}
/** At most one "a message from the team" per conversation in this long, while the client hasn't read it (H-Q17). */
export const MESSAGE_GAP_MINUTES = 60

export type ClientTemplate = { event: ClientEvent; channel: ClientChannel; subject: string; body: string }
export const CLIENT_FIELDS: { key: string; label: string }[] = [
  { key: '{client}', label: 'Client’s first name' }, { key: '{studio}', label: 'Studio' }, { key: '{designer}', label: 'Designer' }, { key: '{project}', label: 'Project' },
  { key: '{link}', label: 'Link to their page' }, { key: '{invoice}', label: 'Invoice' }, { key: '{amount}', label: 'Amount' }, { key: '{document}', label: 'What waits on them' },
  { key: '{update}', label: 'Update title' }, { key: '{ticket}', label: 'Issue number' }, { key: '{subject}', label: 'Issue subject' }, { key: '{sender}', label: 'Who wrote' }, { key: '{message}', label: 'First words' },
  /* (simplify Q-13) (invented copy) */
  { key: '{choice}', label: 'The choice' }, { key: '{reason}', label: 'Why it’s paused' }, { key: '{resume}', label: 'When it picks up' },
  /* (parity map 2026-10-10) (invented copy) */
  { key: '{plan}', label: 'Floor plan' },
  /* (pending modules S23) (invented copy) */
  { key: '{when}', label: 'When' }, { key: '{where}', label: 'Where' }, { key: '{meeting}', label: 'Meeting' },
  /* (pending modules S27) (invented copy) */
  { key: '{event}', label: 'The Hangout' },
]
/** The house drafts (invented copy) — never OpenMaison's name: the portal wears the studio's alone. */
export const DEFAULT_CLIENT_TEMPLATES: ClientTemplate[] = [
  { event: 'client_invoice_sent', channel: 'email', subject: 'Your {invoice} invoice from {studio}', body: 'Hi {client},\n\n{studio} has sent your {invoice} invoice for {amount}. It’s on your page, with how to pay:\n{link}\n\n{studio}' },
  { event: 'client_invoice_sent', channel: 'whatsapp', subject: '', body: 'Hi {client}, your {invoice} invoice for {amount} from {studio} is on your page: {link}' },
  /* (simplify round 2 — P3 §6.8) (invented copy) {amount} is what is still to pay on it */
  { event: 'client_payment_due', channel: 'email', subject: 'Your {invoice} payment is due today', body: 'Hi {client},\n\nA reminder that your {invoice} invoice is due today — {amount} to pay. How to pay is on your page:\n{link}\n\nThank you,\n{studio}' },
  { event: 'client_payment_due', channel: 'whatsapp', subject: '', body: 'Hi {client}, a reminder that your {invoice} invoice from {studio} is due today — {amount} to pay. How to pay is on your page: {link}' },
  { event: 'client_receipt', channel: 'email', subject: 'Your payment is confirmed', body: 'Hi {client},\n\n{studio} has confirmed your payment of {amount} for {invoice}. Your receipt is on your page:\n{link}\n\nThank you,\n{studio}' },
  { event: 'client_receipt', channel: 'whatsapp', subject: '', body: 'Hi {client}, {studio} has confirmed your payment of {amount}. Your receipt is on your page: {link}' },
  { event: 'client_to_answer', channel: 'email', subject: 'Waiting on you: {document}', body: 'Hi {client},\n\n{studio} has sent you {document}. It’s waiting on your page:\n{link}\n\n{studio}' },
  { event: 'client_to_answer', channel: 'whatsapp', subject: '', body: 'Hi {client}, {studio} has sent you {document}. It’s waiting on your page: {link}' },
  { event: 'client_schedule_shared', channel: 'email', subject: 'Your schedule with {studio}', body: 'Hi {client},\n\n{studio} has shared the schedule for {project} — the stages ahead and when each is planned:\n{link}\n\n{studio}' },
  { event: 'client_schedule_shared', channel: 'whatsapp', subject: '', body: 'Hi {client}, {studio} has shared the schedule for {project}: {link}' },
  { event: 'client_update', channel: 'email', subject: 'New update: {update}', body: 'Hi {client},\n\n{sender} has posted an update on the work at {project}: “{update}”.\n{link}\n\n{studio}' },
  { event: 'client_update', channel: 'whatsapp', subject: '', body: 'Hi {client}, a new update on {project} from {sender}: “{update}”. {link}' },
  { event: 'client_issue_answered', channel: 'email', subject: 'Your issue {ticket}: {subject}', body: 'Hi {client},\n\n{sender} answered your issue {ticket} — “{subject}”:\n\n{message}\n\nReply or close it on your page:\n{link}\n\n{studio}' },
  { event: 'client_issue_answered', channel: 'whatsapp', subject: '', body: 'Hi {client}, {sender} answered your issue {ticket} — “{subject}”: {message} {link}' },
  { event: 'client_message', channel: 'email', subject: 'A message from {sender}', body: 'Hi {client},\n\n{sender} sent you a message:\n\n{message}\n\nReply on your page:\n{link}\n\n{studio}' },
  { event: 'client_message', channel: 'whatsapp', subject: '', body: 'Hi {client}, {sender} sent you a message on your page with {studio}: “{message}” {link}' },
  /* (simplify S-21 · Q-13) (invented copy) */
  { event: 'client_choice', channel: 'email', subject: 'A choice to make: {choice}', body: 'Hi {client},\n\nThere’s a choice for you to make for {project}: “{choice}”. The options are on your page — pick the one you like:\n{link}\n\n{studio}' },
  { event: 'client_choice', channel: 'whatsapp', subject: '', body: 'Hi {client}, there’s a choice for you to make for {project}: “{choice}”. The options are on your page: {link}' },
  { event: 'client_paused', channel: 'email', subject: 'The works at {project} are paused', body: 'Hi {client},\n\nWe’re pausing the works at {project} — {reason}. {resume}\n\nYour schedule is on your page:\n{link}\n\n{studio}' },
  { event: 'client_paused', channel: 'whatsapp', subject: '', body: 'Hi {client}, we’re pausing the works at {project} — {reason}. {resume} {link}' },
  { event: 'client_resumed', channel: 'email', subject: 'The works at {project} are running again', body: 'Hi {client},\n\nThe works at {project} are running again. The schedule ahead is on your page:\n{link}\n\n{studio}' },
  { event: 'client_resumed', channel: 'whatsapp', subject: '', body: 'Hi {client}, the works at {project} are running again — the schedule is on your page: {link}' },
  { event: 'client_handed_over', channel: 'email', subject: '{project} is handed over', body: 'Hi {client},\n\n{project} is handed over — thank you for having us. Your page keeps everything from the project, and it’s where to tell us if something isn’t right:\n{link}\n\n{studio}' },
  { event: 'client_handed_over', channel: 'whatsapp', subject: '', body: 'Hi {client}, {project} is handed over — thank you for having us! Your page keeps everything from the project: {link}' },
  /* (parity map 2026-10-10) (invented copy) */
  { event: 'client_signed', channel: 'email', subject: 'Signed: {document}', body: 'Hi {client},\n\nThank you — {document} is signed. Your copy is on your page:\n{link}\n\n{studio}' },
  { event: 'client_signed', channel: 'whatsapp', subject: '', body: 'Hi {client}, thank you — {document} is signed. Your copy is on your page: {link}' },
  { event: 'client_questions', channel: 'email', subject: 'A few questions from {studio}', body: 'Hi {client},\n\n{studio} has a few questions about your home, to plan it well. You can answer them on your page:\n{link}\n\n{studio}' },
  { event: 'client_questions', channel: 'whatsapp', subject: '', body: 'Hi {client}, {studio} has a few questions about your home — you can answer them on your page: {link}' },
  { event: 'client_floor_plan', channel: 'email', subject: 'Your floor plan from {studio}', body: 'Hi {client},\n\n{studio} has added the floor plan “{plan}” to your page. Have a look, and mark anything you’d like to change:\n{link}\n\n{studio}' },
  { event: 'client_floor_plan', channel: 'whatsapp', subject: '', body: 'Hi {client}, {studio} added the floor plan “{plan}” to your page: {link}' },
  { event: 'client_floor_plan_ask', channel: 'email', subject: 'Could you send us your floor plan?', body: 'Hi {client},\n\nTo plan your home, {studio} needs its floor plan — a photo or a PDF is fine. You can send it from your page:\n{link}\n\nThank you,\n{studio}' },
  { event: 'client_floor_plan_ask', channel: 'whatsapp', subject: '', body: 'Hi {client}, could you send us your floor plan? A photo or a PDF is fine — you can send it from your page: {link}' },
  /* (pending modules S23) (invented copy) */
  { event: 'client_meeting', channel: 'email', subject: 'Your {meeting} with {studio}', body: 'Hi {client},\n\nThis is to confirm your {meeting} with {studio} on {when}, {where}.\n\nAdd it to your calendar, or tell us if the time doesn’t suit:\n{link}\n\nSee you then,\n{studio}' },
  { event: 'client_meeting', channel: 'whatsapp', subject: '', body: 'Hi {client}, this is to confirm your {meeting} with {studio} on {when}, {where}. Add it to your calendar or tell us if the time doesn’t suit: {link}' },
  /* (pending modules S27) (invented copy) */
  { event: 'client_hangout', channel: 'email', subject: 'Your chat with {studio} at {event}', body: 'Hi {client},\n\nYou’re booked to meet {designer} from {studio} at {event} — {when}, {where}.\n\nYour page has the details and who you’ll meet. On the day, press “I’m at the table” when you arrive:\n{link}\n\nSee you there,\n{studio}' },
  { event: 'client_hangout', channel: 'whatsapp', subject: '', body: 'Hi {client}, you’re booked to meet {designer} from {studio} at {event} — {when}, {where}. Your page: {link}' },
]
export const SAMPLE_CLIENT_FIELDS: Record<string, string> = {
  '{client}': 'Benjamin', '{studio}': 'Demo Studio', '{designer}': 'Germaine', '{project}': 'SkyOasis @ Dawson', '{link}': 'https://app.openmaison.sg/my/demo-studio',
  '{invoice}': 'mid-project', '{amount}': 'S$12,400.00', '{document}': 'your agreement to sign', '{update}': 'Kitchen cabinets are in', '{ticket}': 'T-2026-004',
  '{subject}': 'Water stain under the sink', '{sender}': 'Germaine', '{message}': 'We’ll send the plumber on Thursday morning.',
  '{choice}': 'Paint colours', '{reason}': 'the condo’s renovation permit is still with the MCST', '{resume}': 'We expect to pick up around Mon 16 Nov.',   // (simplify Q-13)
  '{plan}': 'Level 1 — as built',   // (parity map 2026-10-10)
  '{when}': 'Wed, 14 Oct ’26 at 3:00 PM', '{where}': 'at One Pearl Bank, Outram', '{meeting}': 'first consultation',   // (pending modules S23)
  '{event}': 'Qanvast Hangout · Marina Bay',   // (pending modules S27)
}

export const CLIENT_MESSAGES_KEY = 'client_messages'
export type ClientMessageRules = { channels: Record<ClientEvent, Record<ClientChannel, boolean>>; templates: ClientTemplate[] }
export const DEFAULT_CLIENT_RULES: ClientMessageRules = { channels: DEFAULT_CLIENT_CHANNELS, templates: DEFAULT_CLIENT_TEMPLATES }
export function parseClientMessages(v: unknown): ClientMessageRules {
  const r = (v ?? {}) as { channels?: Record<string, Partial<Record<ClientChannel, unknown>>>; templates?: unknown }
  const channels = Object.fromEntries(CLIENT_EVENTS.map((e) => {
    const c = r.channels?.[e.key] ?? {}
    const d = DEFAULT_CLIENT_CHANNELS[e.key]
    return [e.key, { email: c.email === undefined ? d.email : c.email === true, whatsapp: c.whatsapp === undefined ? d.whatsapp : c.whatsapp === true }]
  })) as ClientMessageRules['channels']
  const saved = Array.isArray(r.templates) ? (r.templates as Partial<ClientTemplate>[]) : []
  const templates = DEFAULT_CLIENT_TEMPLATES.map((d) => {
    const s = saved.find((t) => t.event === d.event && t.channel === d.channel)
    return s && typeof s.body === 'string' && s.body.trim() ? { ...d, subject: typeof s.subject === 'string' ? s.subject.slice(0, 120) : d.subject, body: s.body.slice(0, 2000) } : d
  })
  return { channels, templates }
}
export const clientTemplateFor = (list: readonly ClientTemplate[], event: ClientEvent, channel: ClientChannel) =>
  list.find((t) => t.event === event && t.channel === channel) ?? DEFAULT_CLIENT_TEMPLATES.find((t) => t.event === event && t.channel === channel)!
export const houseClientTemplate = (t: Pick<ClientTemplate, 'event' | 'channel'>) => DEFAULT_CLIENT_TEMPLATES.find((d) => d.event === t.event && d.channel === t.channel)!

/** The message for one person — the studio's words with the fields filled. A message naming a field this send can't fill is not sent
    half-filled: it goes in the plain words the sender gave (`plain`), the link and the studio (E's rule, `compose`). */
export function composeClient(channel: ClientChannel, words: { subject: string; body: string }, fields: Record<string, string>, plain: { title: string; line: string }): { subject: string | null; body: string } {
  const subject = channel === 'email' ? renderTemplate(words.subject, fields) : null
  const body = renderTemplate(words.body, fields)
  if (!/\{[a-z_]+\}/.test(`${subject ?? ''} ${body}`)) return { subject, body }
  const link = fields['{link}'] ?? ''
  const hi = fields['{client}'] ? `Hi ${fields['{client}']},` : 'Hello,'
  return channel === 'email'
    ? { subject: plain.title, body: `${hi}\n\n${plain.line}\n\n${link}\n\n${fields['{studio}'] ?? ''}`.trim() }
    : { subject: null, body: `${hi} ${plain.line} ${link}`.trim() }
}
