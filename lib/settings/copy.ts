import type { Stage } from '@/lib/leads/enums'

/**
 * (pending modules S17 — consistency leftovers) Settings' own words, kept once. Each module's cards and the module's ghost
 * (app/settings/settings-ghost.tsx, REG-708) read them here, so the ghost's sentences are the page's and wrap where the page's wrap, at every width — the
 * ghost's copies had gone stale (Lead sources, Document numbers and Notifications each said a sentence the page no longer said) and a stale
 * sentence wraps to another height. A line with a link inside is kept as its parts: `lead` · `link` · `end`. Client-safe, pure.
 */
export type Linked = { lead: string; link: string; end: string }
export const linkedText = (l: Linked) => `${l.lead}${l.link}${l.end}`

/* The module heads' help lines */
/** (pending modules S14) Roles & access — *(invented copy)* */
export const studioHelp = (studio: string) => `Who sees which leads in ${studio}, and what each role may do. Its team is on Members; the companies it issues quotes and contracts under are on Profile.`
export const leadsModuleHelp = (studio: string) => `Applies to every lead in ${studio} — the table, the kanban board and imports.`
export const quotesModuleHelp = (studio: string) => `Applies to every quote and contract in ${studio} — the editors, the lists, the templates and the client’s copy.`
export const projectsModuleHelp = (studio: string) => `Applies to every project in ${studio} — what waits for an Owner or an Admin, the numbers projects carry, how they end, where a schedule starts and the client’s tickets.`
export const financeModuleHelp = (studio: string) => `Applies to ${studio}’s money — what clients are invoiced and pay, what is paid out to vendors and the team, and the team’s commission.`
export const NOTIFICATIONS_HELP = 'What the studio hears about, on which channels, and the words each message uses. In app rows land in the bell; email and WhatsApp go out with them, sent by the platform with the same words — every one is listed under Sent messages.'

/* Roles & access */
export const WHO_SEES_LEADS_MORE: Linked = { lead: ' Roles and who reports to whom are set under ', link: 'Company › Members', end: '.' }
export const WHO_MAY_HELP: Linked = { lead: 'What each role may do, as the app checks it. The rows follow this studio’s settings — quote and template approval, the payment schedule, who sees leads and who sees costs. Roles are fixed; a member’s role is set under ', link: 'Company › Members', end: '.' }

/* Lead management */
export const LEAD_STAGES_HELP = 'Every lead moves through the same stages, and each one keeps a step of the sale on the lead. Choose what a step asks for and how leads move between them.'
/** What moving into each stage keeps on the lead — the Move stage window's own step, in plain words. */
export const STAGE_RECORDS: Record<Stage, string> = {
  'New': 'A member on the lead before it moves on.',
  'Contacted': 'A contact log: how and when you reached the client, what came of it, and a photo or screenshot that shows it.',
  'Met': 'A meeting log: where and when you met.',
  'Quote Sent': 'The quote that went to the client — made in OpenMaison or uploaded, with its amount.',
  'Won': 'The signed quote, the payment split and the project type. Won starts the project.',
  'On Hold': 'A reason and the day to follow up. The lead picks up where it left off.',
  'Lost': 'A reason. A lost lead can resume where it stopped.',
}
/** The two steps a studio sets (1.0's Follow-up required · Contract required). */
export const STAGE_ASK_WORDS: Partial<Record<Stage, { label: string; help: string }>> = {
  'Contacted': { label: 'Ask for the next call or meeting’s date', help: 'Not when the client said they’re not interested. A task reminds the members of it.' },
  'Won': { label: 'Ask for the client’s signed contract', help: 'Off, a lead is won on its signed quote alone — for a studio whose quote is the agreement.' },
}
export const HOW_LEADS_MOVE_NOTE = 'On Hold and Lost always ask for a reason, and nothing moves back to a stage the lead has passed.'
export const UNTOUCHED_HELP = 'A New lead with no contact logged is raised as “untouched” after this delay — to the members on it, in the bell and on the channels Notifications sets for it.'
export const LEAD_SOURCES_HELP = 'Where a lead can come from — the Lead source field, the import mapping and the Source filter offer these. Retire a source to keep its leads and stop offering it; a source with no leads can be removed.'

/* Meetings — (pending modules S23 — Meetings and the Meeting Co-Pilot; 1.0's Accounts › AI & Copilot) the module's head and its five cards'
   words, read by the page (app/settings/meetings-settings.tsx) and its ghost. *(invented copy)* */
export const meetingsModuleHelp = (studio: string) => `How the co-pilot works in ${studio}’s meetings — what it shows, how it scores a client, what it asks you to cover, your answers when a client pushes back and the studios you compete with.`
export const MEETING_CARDS = {
  features: { title: 'During a meeting', help: 'The parts of the co-pilot your team sees beside a meeting. A part switched off stays out of every meeting; the others work as before.' },
  score: { title: 'Deal score', help: 'How warm a client is, scored 0 to 100 as the meeting goes — Hot from 80, Warm from 60, Cool from 40, Cold below that. Choose how much each part counts; the six add up to 100%.' },
  checklists: { title: 'Meeting checklists', help: 'What the co-pilot asks you to cover in each kind of meeting, ticked as soon as it’s said. The platform’s items come with every meeting; add your studio’s own under them. A meeting lists them Must ask first.' },
  answers: { title: 'Objection answers', help: 'What to say when a client pushes back — on price, timing, trust and the rest. When a client says something like it in a meeting, the co-pilot shows your answer. The platform’s answers for Singapore studios are yours from the start: edit one to make it your own, or switch it off.' },
  competitors: { title: 'Competitors', help: 'The studios you compete with. When a client names one in a meeting, the co-pilot spots it and shows your answer on competition; when a lead is lost, the Lost dialog offers them.' },
} as const
/** The lines inside the cards the ghost draws too: the deal score's buttons, the checklists' two captions. */
export const MEETINGS_WORDS = { even: 'Share evenly', reset: 'Reset to defaults', platformItems: 'From the platform', ownItems: 'Your studio’s items' } as const
/** The deal score's total, live: "Total: 100%" · "Total 95% — 5% short" · "Total 105% — 5% over". */
export const weightsTotalLine = (t: number) => (t === 100 ? 'Total: 100%' : t < 100 ? `Total ${t}% — ${100 - t}% short` : `Total ${t}% — ${t - 100}% over`)
/** A checklist item's words, as its row says them: "Ticks on: budget, how much, price range, afford, spend and 3 more". */
export const checklistWordsLine = (words: readonly string[]) => (words.length ? `Ticks on: ${words.slice(0, 5).join(', ')}${words.length > 5 ? ` and ${words.length - 5} more` : ''}` : 'Ticks on the words of its name')

/* Projects */
export const PROJECTS_VISIBILITY_POINTER: Linked = { lead: 'Who sees a project follows who sees its lead — set under ', link: 'Roles & access › Who sees leads', end: '.' }
export const PROJECTS_MONEY_POINTER: Linked = { lead: 'How projects are invoiced and paid — invoices, their paper, client payments, credit notes and their numbers — is set under ', link: 'Finance', end: '.' }
export const OWNER_APPROVALS_HELP = 'Every approval a project can wait for, in one place. On, a Designer’s or a Manager’s step waits until an Owner or an Admin approves it; theirs goes at once. Off, the project’s team goes ahead.'
/** What waits for an Owner or an Admin — each rule's glyph, name and help, in the card's order after the updates' review. */
export const APPROVAL_RULES = {
  invoice: { icon: 'receipt_long', label: 'Invoices need approval before they’re sent', help: 'A Designer’s or a Manager’s invoice waits for approval; an Owner’s or an Admin’s goes at once. Off, the project’s team sends its own.' },
  done: { icon: 'check_circle', label: 'Milestone completion needs approval', help: 'A Designer’s or a Manager’s Done waits for an Owner or an Admin; theirs is done at once. Off, anyone on the team marks a milestone done.' },
  share: { icon: 'share', label: 'Schedule changes need approval before the client sees them', help: 'A Designer’s or a Manager’s Share changes asks an Owner or an Admin, who shares it or sends it back. Off, the team shares at once.' },
  handover: { icon: 'key', label: 'Handover needs an owner’s review', help: 'A Designer’s or a Manager’s handover waits for review; an Owner’s or an Admin’s completes at once. Off, the project’s team completes its own handover once the checklist is met.' },
} as const
export const UPDATE_REVIEW_WORDS = { icon: 'photo_camera', label: 'Updates need review before the client sees them', help: 'A Designer’s or a Manager’s update waits In review; a reviewer’s is published at once. Off, every update is published at once.' } as const
/* (S44R — UAT row 361, call C8) a supplier bill over the limit or off its PO joins money out's approvals — named here, set there (invented copy) */
export const COST_APPROVALS_WORDS = { icon: 'local_shipping', label: 'Purchase orders, expenses and supplier bills', lead: (limit: string) => `A Designer’s or a Manager’s PO over ${limit} or with an advance, their expenses, and a bill over ${limit} with no PO or over its PO by more than the tolerance — set with the PO limit and when vendors are paid, under `, link: 'Finance › Costs', end: '.' } as const
export const PROJECT_NUMBERS_HELP = 'The pattern new projects are numbered with. Projects already numbered keep their numbers.'
export const PROJECT_NUMBER_HELPERS = { prefix: 'Letters and digits, up to 8', next: 'Blank continues from the highest number given', digits: 'Pads the number: 3 prints 004' } as const

/* Finance */
export const FINANCE_PROFILE_POINTER = 'How a client pays — the bank and PayNow — the issuing entities and the GST switch are kept on Profile; the payment schedules a quote offers, in Templates › Payment schedules.'
export const DOCUMENT_NUMBERS_HELP = 'How the studio’s invoices, receipts, credit notes, purchase orders and tickets are numbered, each under its own prefix. The prefix is letters and digits, up to 8; a blank next number continues from the highest given; the digits pad the number — 3 prints 004; the year adds the year it is numbered in. Documents already numbered keep their numbers.'
export const INVOICES_HELP = 'Each project’s invoices, one per payment stage — when they fall due, and how a project’s own split may start.'
export const INVOICE_APPROVAL_POINTER: Linked = { lead: 'Whether a Designer’s or a Manager’s invoice waits for an Owner or an Admin is set with the studio’s other approvals, under ', link: 'Projects › What waits for an Owner or an Admin', end: '. Invoice numbers are set under Document numbers, above.' }
export const PAYMENT_TERMS_HELPER = 'The due day is the day it’s sent plus these days; 0 is on receipt'
/** (S44O — UAT row 360, her UAT ask 2026-10-15) How an approved variation order is billed. *(invented copy)* */
export const VO_BILLING_WORDS = {
  label: 'Variation orders are billed',
  options: [{ value: 'spread', label: 'Spread over the stages' }, { value: 'own', label: 'On their own, up front' }],
  help: { spread: 'An approved order’s money joins the stage invoices not sent yet — each takes its share.', own: 'An approved order gets its own invoice at once — a Draft for its whole amount; the stages keep their shares.' },
  done: { spread: 'Approved variation orders are now spread over the stages', own: 'Approved variation orders now get their own invoice, up front' },
} as const
export const FEE_FIRST_WORDS = { label: 'May open with a fixed fee', help: '· “Design fees S$3,000” first, the shares splitting what is left — on a quote’s Payment Schedule and on a project’s own split' } as const

/* Notifications */
export const EVENTS_CARD = { title: 'Events and channels', help: 'Who receives each event is fixed by the event; the channels are yours to switch.' } as const
/** (pending modules S18) the members' own choices have their own home — said under the studio's table (invented copy) */
export const EVENTS_PERSONAL: Linked = { lead: ' Each member can mute one for themselves, or take their emails as one daily summary, on ', link: 'Your profile', end: '.' }
