import type { Stage } from '@/lib/leads/enums'

/**
 * (pending modules S17 — consistency leftovers) Settings' own words, kept once. Each module's cards and the module's ghost
 * (app/settings/settings-ghost.tsx, REG-708) read them here, so the ghost's sentences are the page's and wrap where the page's wrap, at every width — the
 * ghost's copies had gone stale (Lead sources, Document numbers and Notifications each said a sentence the page no longer said) and a stale
 * sentence wraps to another height. A line with a link inside is kept as its parts: `lead` · `link` · `end`. Client-safe, pure.
 */
export type Linked = { lead: string; link: string; end: string }
export const linkedText = (l: Linked) => `${l.lead}${l.link}${l.end}`

/* The module heads' help lines — (the calm UI build 2026-10-27, 5-17 · T-05) ONE line each: the module's tab names it (the H2 that repeated
   the tab is for screen readers only), and where its records live is the module's last line, *Related:* (`RELATED_WORDS`, MODULE_LINKS) */
/** (pending modules S14) Roles & access — *(invented copy)* · (the calm UI build, 5-17) one line; Members and Profile are in Related */
export const studioHelp = (studio: string) => `Who sees which leads in ${studio}, and what each role can do.`
export const leadsModuleHelp = (studio: string) => `Applies to every lead in ${studio} — the table, the kanban board and imports.`
export const quotesModuleHelp = (studio: string) => `Applies to every quote and contract in ${studio} — the editors, the lists, the templates and the client’s copy.`
/* (the calm UI build, 5-33 · T-01) the card is Approvals, and the client's tickets are Issues on screen */
export const projectsModuleHelp = (studio: string) => `Applies to every project in ${studio} — approvals, the numbers projects carry, how they end, where a schedule starts and the client’s issues.`
export const financeModuleHelp = (studio: string) => `Applies to ${studio}’s money — what clients are invoiced and pay, what is paid out to vendors and the team, and the team’s commission.`
/* (the calm UI build, W-432) the wording of each message is behind its event's *Edit wording* now; what was sent, under Sent messages */
export const NOTIFICATIONS_HELP = 'What the studio is told about, and on which channels.'

/**
 * (the calm UI build 2026-10-27, 5-17 · 5-52 · W-043 · W-450) A module's last line: **Related:** then the doors — the Company pages that hold
 * its records (MODULE_LINKS), a Settings card a pointer paragraph named (Who sees leads, the money rules), and Your profile — one line of
 * text buttons at the module's END, where the *Kept in Company:* line, the Your profile line and the pointer paragraphs used to stack under
 * every module's title. *(invented copy)*
 */
export const RELATED_WORDS = 'Related:'
/** The pointers that became doors on the Related line (each keeps its old test id on the door, components their wrappers). */
export const RELATED_DOORS = {
  /** Lead management and Projects: who sees which leads (and each lead's project, quotes and contracts) — Roles & access › Who sees leads */
  visibility: { label: 'Who sees leads', tip: 'Who sees which leads — and each lead’s project, quotes and contracts — is set under Roles & access › Who sees leads' },
  /** Projects: who sees a project — its lead's rule, the same door */
  projectVisibility: { label: 'Who sees leads', tip: 'Who sees a project follows who sees its lead — set under Roles & access › Who sees leads' },
  /** Projects: how projects are invoiced and paid — Settings › Finance */
  money: { label: 'Invoices and payments', tip: 'How projects are invoiced and paid — invoices, their paper, client payments, credit notes and their numbers — is set under Settings › Finance' },
} as const

/* Roles & access */
export const WHO_SEES_LEADS_MORE: Linked = { lead: ' Roles and who reports to whom are set under ', link: 'Company › Members', end: '.' }
export const WHO_MAY_HELP: Linked = { lead: 'What each role may do, as the app checks it. The rows follow this studio’s settings — quote and template approval, the payment schedule, who sees leads and who sees costs. Roles are fixed; a member’s role is set under ', link: 'Company › Members', end: '.' }
/**
 * (the calm UI build 2026-10-27, 5-04 · W-069 · T-14) Who may do what leaves the page: Roles & access keeps its two decisions (who sees leads,
 * who sees costs) and one row — *What each role can do*, the roles named, *See the list* — which opens the whole table in the house Drawer,
 * one role at a time (Chips), grouped by area, each row's *Set under …* a link. Every row and every answer is kept. *(invented copy)*
 */
export const ROLES_ROW = { title: 'What each role can do', open: 'See the list', drawer: 'What each role can do', roles: 'Roles', all: 'All roles' } as const

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
/* (the calm UI build, W-097 · 5-32) the delay's words a studio owner says — the bell and the channels are Notifications' to say */
export const UNTOUCHED_HELP = 'A new lead nobody has contacted is flagged after this time, to the members on it.'
/** (the calm UI build, W-335) the delay's field */
export const UNTOUCHED_LABEL = 'Mark a new lead untouched after'
/** (the calm UI build, 5-32) Notifications › Follow-ups' line that says where the delay is set — in the delay's own words */
export const untouchedPointer = (delay: string) => `A new lead nobody has contacted is flagged after ${delay} — set under `
export const LEAD_SOURCES_HELP = 'Where a lead can come from — the Lead source field, the import mapping and the Source filter offer these. Stop offering a source to keep its leads; a source with no leads can be removed.'

/* Meetings — (pending modules S23 — Meetings and the Meeting Co-Pilot; 1.0's Accounts › AI & Copilot) the module's head and its five cards'
   words, read by the page (app/settings/meetings-settings.tsx) and its ghost. *(invented copy)* */
/* (the calm UI build, 5-45 · W-144) one spelling: Meeting Copilot as the name, Copilot in a sentence */
export const meetingsModuleHelp = (studio: string) => `How Meeting Copilot works in ${studio}’s meetings — what it shows, how it scores a client, what it asks you to cover, your answers when a client pushes back and the studios you compete with.`
export const MEETING_CARDS = {
  features: { title: 'During a meeting', help: 'The parts of Copilot your team sees beside a meeting. A part switched off stays out of every meeting; the others work as before.' },
  score: { title: 'Deal score', help: 'How warm a client is, scored 0 to 100 as the meeting goes — Hot from 80, Warm from 60, Cool from 40, Cold below that. Choose how much each part counts; the six add up to 100%.' },
  checklists: { title: 'Meeting checklists', help: 'What Copilot asks you to cover in each kind of meeting, ticked as soon as it’s said. The platform’s items come with every meeting; add your studio’s own under them. A meeting lists them Must ask first.' },
  answers: { title: 'Answers to concerns', help: 'What to say when a client pushes back — on price, timing, trust and the rest. When a client says something like it in a meeting, Copilot shows your answer. The platform’s answers for Singapore studios are yours from the start: edit one to make it your own, or switch it off.' },
  competitors: { title: 'Competitors', help: 'The studios you compete with. When a client names one in a meeting, Copilot spots it and shows your answer on competition; when a lead is lost, the Lost dialog offers them.' },
} as const
/** The lines inside the cards the ghost draws too: the deal score's buttons, the checklists' two captions. */
export const MEETINGS_WORDS = { even: 'Share evenly', reset: 'Reset to defaults', platformItems: 'From the platform', ownItems: 'Your studio’s items' } as const
/** The deal score's total, live: "Total: 100%" · "Total 95% — 5% short" · "Total 105% — 5% over". */
export const weightsTotalLine = (t: number) => (t === 100 ? 'Total: 100%' : t < 100 ? `Total ${t}% — ${100 - t}% short` : `Total ${t}% — ${t - 100}% over`)
/** A checklist item's words, as its row says them: "Ticks on: budget, how much, price range, afford, spend and 3 more". */
export const checklistWordsLine = (words: readonly string[]) => (words.length ? `Ticks on: ${words.slice(0, 5).join(', ')}${words.length > 5 ? ` and ${words.length - 5} more` : ''}` : 'Ticks on the words of its name')

/* Projects */
/* (the calm UI build, 5-17) the module's two pointer lines are doors on its Related line now (RELATED_DOORS · its tooltips say what they said) */
/* (the calm UI build 2026-10-27, 5-33 · W-068 · T-01) the card is **Approvals** — the app's one word for them — and its help one sentence */
export const OWNER_APPROVALS_TITLE = 'Approvals'
export const OWNER_APPROVALS_HELP = 'Turn on to have an Owner or an Admin approve what Designers and Managers do.'
/** What waits for an Owner or an Admin — each rule's glyph, name and help, in the card's order after the updates' review. */
export const APPROVAL_RULES = {
  invoice: { icon: 'receipt_long', label: 'Invoices need approval before they’re sent', help: 'A Designer’s or a Manager’s invoice waits for approval; an Owner’s or an Admin’s goes at once. Off, the project’s team sends its own.' },
  done: { icon: 'check_circle', label: 'Milestone completion needs approval', help: 'A Designer’s or a Manager’s Done waits for an Owner or an Admin; theirs is done at once. Off, anyone on the team marks a milestone done.' },
  share: { icon: 'share', label: 'Schedule changes need approval before the client sees them', help: 'A Designer’s or a Manager’s Share changes asks an Owner or an Admin, who shares it or sends it back. Off, the team shares at once.' },
  handover: { icon: 'key', label: 'Handover needs approval',   /* (the calm UI build, W-041) was “an owner’s review” — every other rule says an Owner or an Admin */
    help: 'A Designer’s or a Manager’s handover waits for review; an Owner’s or an Admin’s completes at once. Off, the project’s team completes its own handover once the checklist is met.' },
} as const
export const UPDATE_REVIEW_WORDS = { icon: 'photo_camera', label: 'Updates need review before the client sees them', help: 'A Designer’s or a Manager’s update waits In review; a reviewer’s is published at once. Off, every update is published at once.' } as const
/* (S44R — UAT row 361, call C8) a supplier bill over the limit or off its PO joins money out's approvals — named here, set there (invented copy) */
/* (the calm UI build, W-327 · 5-28) one line, not the rule's paragraph (the Costs card says the rule in full); its place named by Settings' own path */
export const COST_APPROVALS_WORDS = { icon: 'local_shipping', label: 'Purchase orders, expenses and supplier bills', lead: (limit: string) => `POs over ${limit}, expenses, and bills over the limit — set under `, link: 'Settings › Finance › Costs', end: '.' } as const
export const PROJECT_NUMBERS_HELP = 'The pattern new projects are numbered with. Projects already numbered keep their numbers.'
export const PROJECT_NUMBER_HELPERS = { prefix: 'Letters and digits, up to 8', next: 'Blank continues from the highest number given', digits: 'Pads the number: 3 prints 004' } as const

/* Finance */
/** (the calm UI build 2026-10-27, T-01 · 5-23) Settings › Finance's three groups, as the app names them — Finance's lists are Client payments and
    Costs (was Money in · Money out); finance-settings.tsx and the module's ghost read these */
export const FINANCE_GROUP_LABELS = { in: 'Client payments', out: 'Costs', commission: 'Commission' } as const
/* (the calm UI build, W-211 · 5-17) no longer a paragraph under the head: it is the tooltip of the Related line's Profile door */
export const FINANCE_PROFILE_POINTER = 'How a client pays — the bank and PayNow — the issuing entities and the GST switch are kept on Profile; the payment schedules a quote offers, in Templates › Payment schedules.'
/* (the calm UI build, W-213 · 5-34 · T-05) one line; the rules fold behind *How numbers work* (DOCUMENT_NUMBERS_RULES) */
export const DOCUMENT_NUMBERS_HELP = 'How invoices, receipts, credit notes, POs and issues are numbered.'
export const DOCUMENT_NUMBERS_HOW = 'How numbers work'
export const DOCUMENT_NUMBERS_RULES = 'Each document has its own prefix — letters and digits, up to 8. A blank next number continues from the highest given; the digits pad the number — 3 prints 004; the year adds the year it is numbered in. Documents already numbered keep their numbers.'
export const INVOICES_HELP = 'Each project’s invoices, one per payment — when they fall due, and how a project’s own split may start.'   /* (the calm UI build, T-01) a payment part is a payment, “stage” is a lead's or a project's */
/* (the calm UI build, W-437) a pointer line — asked to go (B3's card renders it); while it shows, it names the card by its new name */
export const INVOICE_APPROVAL_POINTER: Linked = { lead: 'Whether an invoice waits for approval is set under ', link: 'Projects › Approvals', end: '.' }
export const PAYMENT_TERMS_HELPER = 'The due day is the day it’s sent plus these days; 0 is on receipt'
/** (S44O — UAT row 360, his UAT ask 2026-10-15) How an approved variation order is billed. *(invented copy)* */
export const VO_BILLING_WORDS = {
  label: 'Variation orders are billed',
  options: [{ value: 'spread', label: 'Spread over the stages' }, { value: 'own', label: 'On their own, up front' }],
  help: { spread: 'An approved order’s money joins the stage invoices not sent yet — each takes its share.', own: 'An approved order gets its own invoice at once — a Draft for its whole amount; the stages keep their shares.' },
  done: { spread: 'Approved variation orders are now spread over the stages', own: 'Approved variation orders now get their own invoice, up front' },
} as const
export const FEE_FIRST_WORDS = { label: 'May open with a fixed fee', help: '· “Design fees S$3,000” first, the shares splitting what is left — on a quote’s Payment Schedule and on a project’s own split' } as const

/* Notifications */
export const EVENTS_CARD = { title: 'Events and channels', help: 'Who receives each event is fixed by the event; the channels are yours to switch.' } as const
/** (the calm UI build 2026-10-27, 5-05 · W-259) Each event's messages, behind its row's *Edit wording* (the drawer): the old card's title and help,
    the row's verb for whoever sets them and for whoever only reads them, the module head's door to what was sent. *(invented copy: edit · see)* */
export const WORDING_WORDS = {
  title: 'Message wording', column: 'Wording', edit: 'Edit wording', see: 'See wording', sent: 'Sent messages',
  help: 'Every email and WhatsApp this event can send, with its fields filled the way a recipient reads it. The link always points at the record.',
} as const
/** (pending modules S18) the members' own choices have their own home — said under the studio's table (invented copy) */
export const EVENTS_PERSONAL: Linked = { lead: ' Each member can mute one for themselves, or take their emails as one daily summary, on ', link: 'Your profile', end: '.' }
