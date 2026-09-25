/**
 * (REG-604) Notifications — the events, the rules and the messages, pure and client-safe.
 *
 * An EVENT is raised by an action (a lead arrives, a lead is assigned, a quote goes for approval, a client confirms or
 * signs) or derived at read time (a follow-up is due). The RULES say which channels carry each event and who receives it;
 * the MESSAGES are the copy each channel sends, with fields the platform fills. The delay and the stop rule are Cove's
 * "30 minutes" and "a closed lead gets no follow-up".
 */

export type Channel = 'in_app' | 'email' | 'whatsapp'
export const CHANNELS: { key: Channel; label: string }[] = [{ key: 'in_app', label: 'In app' }, { key: 'email', label: 'Email' }, { key: 'whatsapp', label: 'WhatsApp' }]

export type EventKey = 'new_lead' | 'assigned' | 'untouched' | 'quote_approval' | 'quote_approved' | 'quote_changes' | 'quote_confirmed' | 'contract_sent' | 'quote_signed' | 'task_due' | 'stage_changed' | 'task_assigned' | 'task_due_soon' | 'hold_due' | 'question_answered' | 'price_book_proposed' | 'price_book_answered'
export type EventDef = { key: EventKey; label: string; help: string; who: string; icon: string }
export const EVENTS: EventDef[] = [
  { key: 'new_lead', label: 'A new lead arrives', help: 'From the form, an import, the website or Meta.', who: 'Owners and Admins', icon: 'person_add' },
  { key: 'assigned', label: 'A lead is assigned', help: 'To the member it was assigned to.', who: 'The assignee', icon: 'person' },
  { key: 'untouched', label: 'A new lead is untouched', help: 'No contact logged within the delay below.', who: 'The assignee, else Owners and Admins', icon: 'schedule' },   // (REG-645, E-106) as queries.ts raises it
  { key: 'quote_approval', label: 'A quote needs approval', help: 'Sent for Approval by a designer.', who: 'Approvers', icon: 'approval' },
  /* (REG-624, quote editor parity Q-22) The approver's answer goes back to whoever sent the quote. */
  { key: 'quote_approved', label: 'Your quote is approved', help: 'An approver approved a quote you sent for approval.', who: 'Whoever sent it', icon: 'verified' },
  { key: 'quote_changes', label: 'Changes are asked on your quote', help: 'An approver sent a quote back to Draft with a note.', who: 'Whoever sent it', icon: 'edit' },
  { key: 'quote_confirmed', label: 'A client confirms a quote', help: 'On the confirmation link.', who: 'The lead’s members', icon: 'task' },
  /* (REG-634, contracts parity Q-23) 1.0 told the studio on every send (`quote.signature_requested`); a signature — the client's own, or one the studio marks — reaches the same people. */
  { key: 'contract_sent', label: 'A contract goes out for signature', help: 'Sent on WhatsApp, its link shared, or sent together — by anyone but you.', who: 'Owners, Admins and the lead’s members', icon: 'send' },
  { key: 'quote_signed', label: 'A contract is signed', help: 'By the client on its link, or marked signed by the studio.', who: 'The lead’s members, Owners and Admins', icon: 'draw' },
  { key: 'task_due', label: 'A task is overdue', help: 'Its due date has passed.', who: 'The task’s assignees', icon: 'warning' },
  /* (REG-608, parity Q-23) 1.0's events that 2.0 lacked — the owner's six, minus the T−30 lead reminder, which "a task is due in 30 minutes" covers now that follow-ups are tasks. */
  { key: 'stage_changed', label: 'A lead’s stage changes', help: 'A move, a hold, a loss or a resume — by anyone but you.', who: 'Owners, Admins and the lead’s members', icon: 'swap_horiz' },
  { key: 'task_assigned', label: 'A task is assigned to you', help: 'Created with you on it, or added to it later.', who: 'The assignee', icon: 'task_alt' },
  { key: 'task_due_soon', label: 'A task is due in 30 minutes', help: 'A follow-up or any task with a time, raised as it comes due.', who: 'The task’s assignees', icon: 'event' },
  { key: 'hold_due', label: 'An On Hold date is reached', help: 'The follow-up date on a lead still on hold.', who: 'The lead’s members, else Owners and Admins', icon: 'timelapse' },
  { key: 'question_answered', label: 'A client answers the questionnaire', help: 'On their portal link — raised once the portal lands.', who: 'The lead’s members', icon: 'help' },
  /* (REG-652, price book parity Q-04) A Designer proposes an item for My Items; the answer goes back to them. */
  { key: 'price_book_proposed', label: 'An item is proposed for My Items', help: 'A Designer’s new item, waiting to be approved or sent back.', who: 'Owners and Admins', icon: 'list_alt' },
  { key: 'price_book_answered', label: 'Your proposed item is answered', help: 'Approved into My Items, or sent back with a note.', who: 'Whoever proposed it', icon: 'verified' },
]
export const eventDef = (key: string): EventDef | undefined => EVENTS.find((e) => e.key === key)

export type NotificationRules = {
  channels: Record<EventKey, Record<Channel, boolean>>
  /** Minutes a New lead may go without a contact log before "untouched" is raised. */
  untouchedMinutes: number
  /** No follow-ups once a lead is Won, Lost or On Hold. */
  stopWhenClosed: boolean
}
export const UNTOUCHED_OPTIONS: { minutes: number; label: string }[] = [{ minutes: 15, label: '15 minutes' }, { minutes: 30, label: '30 minutes' }, { minutes: 60, label: '1 hour' }, { minutes: 240, label: '4 hours' }, { minutes: 1440, label: '1 day' }]
const on = (in_app: boolean, email: boolean, whatsapp: boolean): Record<Channel, boolean> => ({ in_app, email, whatsapp })
export const DEFAULT_RULES: NotificationRules = {
  channels: { new_lead: on(true, true, true), assigned: on(true, true, false), untouched: on(true, false, true), quote_approval: on(true, true, false), quote_approved: on(true, true, false), quote_changes: on(true, true, false), quote_confirmed: on(true, true, true), contract_sent: on(true, true, false), quote_signed: on(true, true, true), task_due: on(true, false, false), stage_changed: on(true, false, false), task_assigned: on(true, true, false), task_due_soon: on(true, false, true), hold_due: on(true, true, false), question_answered: on(true, true, false), price_book_proposed: on(true, true, false), price_book_answered: on(true, false, false) },
  untouchedMinutes: 30,
  stopWhenClosed: true,
}
export function parseRules(v: unknown): NotificationRules {
  const r = (v ?? {}) as Partial<{ channels: Record<string, Partial<Record<Channel, unknown>>>; untouchedMinutes: unknown; stopWhenClosed: unknown }>
  const channels = {} as NotificationRules['channels']
  for (const e of EVENTS) {
    const c = r.channels?.[e.key] ?? {}
    channels[e.key] = { in_app: c.in_app === undefined ? DEFAULT_RULES.channels[e.key].in_app : !!c.in_app, email: c.email === undefined ? DEFAULT_RULES.channels[e.key].email : !!c.email, whatsapp: c.whatsapp === undefined ? DEFAULT_RULES.channels[e.key].whatsapp : !!c.whatsapp }
  }
  const minutes = typeof r.untouchedMinutes === 'number' && UNTOUCHED_OPTIONS.some((o) => o.minutes === r.untouchedMinutes) ? r.untouchedMinutes : DEFAULT_RULES.untouchedMinutes
  return { channels, untouchedMinutes: minutes, stopWhenClosed: r.stopWhenClosed === undefined ? true : !!r.stopWhenClosed }
}

/* ── messages ── */
export type MessageTemplate = { event: EventKey; channel: Exclude<Channel, 'in_app'>; subject: string; body: string }
export const FIELDS: { key: string; label: string }[] = [
  { key: '{lead_name}', label: 'The lead’s name' }, { key: '{studio}', label: 'The studio' }, { key: '{member}', label: 'Who the message is to' }, { key: '{actor}', label: 'Who did it' },
  { key: '{source}', label: 'The lead’s source' }, { key: '{quote_number}', label: 'The quote’s number' }, { key: '{link}', label: 'The record’s link' },
  { key: '{stage}', label: 'The lead’s new stage' }, { key: '{task}', label: 'The task’s title' },   /* (REG-608) */
  { key: '{item}', label: 'The price book item' },   /* (REG-652) */
]
const T = (event: EventKey, channel: 'email' | 'whatsapp', subject: string, body: string): MessageTemplate => ({ event, channel, subject, body })
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  T('new_lead', 'whatsapp', '', 'New lead at {studio}: {lead_name} ({source}). Open it: {link}'),
  T('new_lead', 'email', 'New lead: {lead_name}', 'Hi {member},\n\n{lead_name} just came in through {source}. Open the lead to assign it and log the first contact: {link}\n\n{studio}'),
  T('assigned', 'email', '{lead_name} is now yours', 'Hi {member},\n\n{actor} assigned {lead_name} to you. Reach out today and log the contact: {link}\n\n{studio}'),
  T('assigned', 'whatsapp', '', '{actor} assigned {lead_name} to you at {studio}. Open it: {link}'),
  T('untouched', 'whatsapp', '', '{lead_name} has had no contact yet. A quick reply keeps the lead warm: {link}'),
  T('untouched', 'email', 'Follow up: {lead_name}', 'Hi {member},\n\n{lead_name} arrived and nobody has logged a contact yet. Open the lead and reach out: {link}\n\n{studio}'),
  T('quote_approval', 'email', 'Quote {quote_number} needs your approval', 'Hi {member},\n\n{actor} sent quote {quote_number} for {lead_name} for approval. Review it here: {link}\n\n{studio}'),
  T('quote_approval', 'whatsapp', '', 'Quote {quote_number} for {lead_name} needs your approval: {link}'),
  /* (REG-624) */
  T('quote_approved', 'email', 'Quote {quote_number} is approved', 'Hi {member},\n\n{actor} approved quote {quote_number} for {lead_name}. Send it to the client when you’re ready: {link}\n\n{studio}'),
  T('quote_approved', 'whatsapp', '', '{actor} approved quote {quote_number} for {lead_name}: {link}'),
  T('quote_changes', 'email', 'Changes asked on quote {quote_number}', 'Hi {member},\n\n{actor} sent quote {quote_number} for {lead_name} back with a note. Open it to read the note and make the changes: {link}\n\n{studio}'),
  T('quote_changes', 'whatsapp', '', '{actor} asked for changes on quote {quote_number} for {lead_name}: {link}'),
  T('quote_confirmed', 'email', '{lead_name} confirmed quote {quote_number}', 'Hi {member},\n\n{lead_name} confirmed quote {quote_number} on its link. Add the T&Cs and send it for signature: {link}\n\n{studio}'),
  T('quote_confirmed', 'whatsapp', '', '{lead_name} confirmed quote {quote_number}. Next: add the T&Cs and send for signature — {link}'),
  /* (REG-634) */
  T('contract_sent', 'email', 'A contract went out to {lead_name}', 'Hi {member},\n\n{actor} sent a contract to {lead_name} for signature. Follow it on the lead: {link}\n\n{studio}'),
  T('contract_sent', 'whatsapp', '', '{actor} sent a contract to {lead_name} for signature: {link}'),
  T('quote_signed', 'email', '{lead_name} signed', 'Hi {member},\n\n{lead_name} signed on the signing link. The signed copy is on the lead: {link}\n\n{studio}'),
  T('quote_signed', 'whatsapp', '', '{lead_name} signed at {studio}. The signed copy is on the lead: {link}'),
  T('task_due', 'email', 'Overdue: a task on {lead_name}', 'Hi {member},\n\nA task on {lead_name} is past its due date. Open it: {link}\n\n{studio}'),
  T('task_due', 'whatsapp', '', 'A task on {lead_name} is overdue: {link}'),
  /* (REG-608) */
  T('stage_changed', 'email', '{lead_name} moved to {stage}', 'Hi {member},\n\n{actor} moved {lead_name} to {stage}. Open the lead: {link}\n\n{studio}'),
  T('stage_changed', 'whatsapp', '', '{actor} moved {lead_name} to {stage} at {studio}: {link}'),
  T('task_assigned', 'email', 'New task: {task}', 'Hi {member},\n\n{actor} put you on “{task}” for {lead_name}. Open it: {link}\n\n{studio}'),
  T('task_assigned', 'whatsapp', '', 'New task for you at {studio}: “{task}” on {lead_name} — {link}'),
  T('task_due_soon', 'email', 'In 30 minutes: {task}', 'Hi {member},\n\n“{task}” on {lead_name} is due in 30 minutes. Open it: {link}\n\n{studio}'),
  T('task_due_soon', 'whatsapp', '', 'In 30 minutes: “{task}” on {lead_name} — {link}'),
  T('hold_due', 'email', 'Hold ended: {lead_name}', 'Hi {member},\n\nThe follow-up date on {lead_name} has come round. Resume the lead or hold it again: {link}\n\n{studio}'),
  T('hold_due', 'whatsapp', '', 'Hold ended — revisit {lead_name}: {link}'),
  T('question_answered', 'email', '{lead_name} answered the questionnaire', 'Hi {member},\n\n{lead_name} answered the questionnaire on their portal. Read the answers: {link}\n\n{studio}'),
  T('question_answered', 'whatsapp', '', '{lead_name} answered the questionnaire at {studio}: {link}'),
  /* (REG-652) */
  T('price_book_proposed', 'email', '{actor} proposed an item for My Items', 'Hi {member},\n\n{actor} proposed “{item}” for the studio’s price book. Approve it, or send it back with a note: {link}\n\n{studio}'),
  T('price_book_proposed', 'whatsapp', '', '{actor} proposed “{item}” for My Items at {studio}: {link}'),
  T('price_book_answered', 'email', 'Your proposed item: {item}', 'Hi {member},\n\n{actor} answered your proposal “{item}”. Open My Items to see it: {link}\n\n{studio}'),
  T('price_book_answered', 'whatsapp', '', '{actor} answered your proposal “{item}”: {link}'),
]
export function parseTemplates(v: unknown): MessageTemplate[] {
  const list = Array.isArray(v) ? v : []
  return DEFAULT_TEMPLATES.map((d) => {
    const hit = list.find((x) => x && typeof x === 'object' && (x as MessageTemplate).event === d.event && (x as MessageTemplate).channel === d.channel) as Partial<MessageTemplate> | undefined
    return { ...d, subject: typeof hit?.subject === 'string' ? hit.subject.slice(0, 120) : d.subject, body: typeof hit?.body === 'string' ? hit.body.slice(0, 2000) : d.body }
  })
}
export const templateFor = (list: MessageTemplate[], event: EventKey, channel: 'email' | 'whatsapp') => list.find((t) => t.event === event && t.channel === channel) ?? DEFAULT_TEMPLATES.find((t) => t.event === event && t.channel === channel)!

/** The message with its fields filled — the preview and the platform's send use the same function. */
export function renderTemplate(text: string, fields: Record<string, string>): string {
  return text.replace(/\{[a-z_]+\}/g, (k) => fields[k] ?? k)
}
export const SAMPLE_FIELDS: Record<string, string> = { '{lead_name}': 'Farah Ahmad', '{studio}': 'Demo Studio', '{member}': 'Sarah', '{actor}': 'Dane', '{source}': 'Website', '{quote_number}': 'OM-10008', '{link}': 'https://app.openmaison.sg/leads/farah-ahmad', '{stage}': 'Met', '{task}': 'Follow up with Farah Ahmad', '{item}': 'Skirting, PVC' }

/** A feed row — a stored notification or a derived one (a due follow-up). */
export type FeedRow = { id: string; kind: EventKey; title: string; body: string | null; href: string | null; at: number; readAt: number | null; channels: Channel[]; derived: boolean }
