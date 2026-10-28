/*
 * (the Dashboard redesigned, 2026-10-26 — his marks P-01 · P-10 · Q-01 · Q-02 · Q-03 · Q-09 · lane D4) **Maison AI, docked**: a field at the
 * foot of the page, the way a chat input sits under a conversation, with three suggestions written by rule from today's records and the role
 * (Q-03); short answers grow above it, long ones and proposals open in a pane (Q-01); every card's Ask puts that card in its context. Pure and
 * client-safe; the suggestions are written by lib/dashboard/dock-queries.ts. The contract: brief.md § Maison AI. Lane D4 owns this file.
 *
 * Every suggestion and every card's question is one Maison AI answers well from the records (lib/maison-ai/answer.ts) — the probe asks each.
 * INVENTED COPY (staged as REG-D4.*): every question below, the field's words, the context chips' names.
 */
import { isAccounting, isMarketing, runsStudio } from '@/lib/settings/roles'

/** A suggestion above the field: its words, its glyph and the question it asks (the words a member would type). */
export type DockChip = { key: string; label: string; icon: string; ask: string }
/** What a card's Ask puts in the field's context: the card's name (the chip in the field) and the questions it offers instead of the three. */
export type DockContext = { key: string; label: string; icon: string; asks: string[] }
export type DockData = {
  chips: DockChip[]
  /** Each card's context (pulse · needs · day · pipeline · projects · team · site) — a card's Ask button opens it. */
  contexts: DockContext[]
  /** Every question the page offers — the FAB sheet's list on other widths, and the field's suggestions as you type. */
  asks: string[]
  /** (D4) the field's + — the tools that read a file for you (Maison AI's own `attach` answer): whoever opens the workspace */
  tools?: boolean
}

/** The cards a context can name — the page's cards (lib/dashboard/frame.ts `DASH_CARDS`). */
export const DOCK_CARDS = ['pulse', 'needs', 'day', 'pipeline', 'projects', 'team', 'site'] as const
export type DockCard = (typeof DOCK_CARDS)[number]
export const isDockCard = (k: unknown): k is DockCard => typeof k === 'string' && (DOCK_CARDS as readonly string[]).includes(k)

/** The words a card adds to a question asked about it that reads as nothing on its own — "what's stuck?" about Pipeline reads "what's stuck?
    leads need attention" (lib/maison-ai/answer.ts `about`). */
export const ABOUT_WORDS: Record<DockCard, string> = {
  pulse: 'how is the studio doing',
  needs: 'what waits for my approval',
  day: 'my tasks today',
  pipeline: 'which leads need attention',
  projects: 'what is overdue on the schedule',
  team: 'who on my team is busy',
  site: 'site update',
}

/* The questions, once — each worded as Maison AI reads it (lib/maison-ai/intents.ts). */
export const Q = {
  studio: 'How is the studio doing?',
  cash: 'How is cash this month?',
  owes: 'Who owes the studio money?',
  owe: 'What does the studio owe?',
  gst: 'What’s the GST this quarter?',
  approvals: 'What waits for my approval?',
  attention: 'Which leads need attention?',
  overdue: 'What is overdue?',
  starts: 'What starts this week?',
  tasks: 'What are my tasks today?',
  nextMeeting: 'Prepare me for my next meeting',
  meetings: 'What meetings do I have this week?',
  quotesWaiting: 'Quotes waiting on the client',
  team: 'Who on my team is busy?',
  siteUpdate: 'Draft a site update',
  addLead: 'Add a lead',
  missed: 'What did I miss?',
} as const

/** The facts the three suggestions are written from (lib/dashboard/dock-queries.ts reads them). */
export type DockFacts = {
  role: string
  books: boolean
  workspace: boolean
  /** The member's next planned meeting today — its time on the studio's clock ("2 PM") and the client's first name. */
  meetingToday: { time: string; first: string } | null
  /** Any planned meeting ahead of the member's. */
  meetingAhead: boolean
  /** The quote or variation order that waits longest on its client, that this member may remind (lib/maison-ai/remind.ts). */
  waiting: { first: string; number: string } | null
}

const chip = (key: string, label: string, icon: string, ask = label): DockChip => ({ key, label, icon, ask })

/** What each role reaches for when the day gives nothing sharper — in order, the first not already offered. */
function reachFor(f: DockFacts): DockChip[] {
  if (isAccounting(f.role)) return [chip('owes', Q.owes, 'payments'), chip('gst', Q.gst, 'request_quote'), chip('owe', Q.owe, 'account_balance_wallet')]
  if (isMarketing(f.role)) return [chip('attention', Q.attention, 'people_alt'), chip('tasks', Q.tasks, 'task_alt'), chip('add-lead', Q.addLead, 'person_add')]
  if (runsStudio(f.role)) return [chip('studio', Q.studio, 'trending_up'), chip('approvals', Q.approvals, 'task_alt'), chip('attention', Q.attention, 'people_alt')]
  if (f.role === 'Manager') return [chip('team', Q.team, 'group'), chip('attention', Q.attention, 'people_alt'), chip('overdue', Q.overdue, 'schedule')]
  return [chip('tasks', Q.tasks, 'task_alt'), chip('attention', Q.attention, 'people_alt'), ...(f.meetingAhead ? [chip('next-meeting', Q.nextMeeting, 'event')] : []), chip('overdue', Q.overdue, 'schedule')]
}

/**
 * (Q-03) **The three suggestions, by rule** from today's records — the drawn order: a meeting next today ("Prepare me for 2 PM with Kelvin"),
 * a quote waiting on its client ("Remind Ryan about VO-2"), the books ("How is cash this month?"); then what the role reaches for. Three at most,
 * each once.
 */
export function dockChips(f: DockFacts): DockChip[] {
  const out: DockChip[] = []
  if (f.workspace && f.meetingToday) out.push(chip('prepare', `Prepare me for ${f.meetingToday.time} with ${f.meetingToday.first}`, 'event'))
  if (f.workspace && f.waiting) out.push(chip('remind', `Remind ${f.waiting.first} about ${f.waiting.number}`, 'chat'))
  if (f.books) out.push(chip('cash', Q.cash, 'payments'))
  for (const c of reachFor(f)) { if (out.length >= 3) break; if (!out.some((x) => x.ask === c.ask)) out.push(c) }
  return out.slice(0, 3)
}

/** Each card's context: its name, its glyph and the questions it offers (his "every card has a reason" made a question). By role, each one a
    question the role is answered on. */
export function dockContexts(f: Pick<DockFacts, 'role' | 'books' | 'workspace' | 'meetingAhead'>): DockContext[] {
  const runs = runsStudio(f.role), acct = isAccounting(f.role), desk = isMarketing(f.role)
  const books = f.books ? [Q.cash, Q.owes] : []
  const ctx = (key: DockCard, label: string, icon: string, asks: string[]): DockContext => ({ key, label, icon, asks: [...new Set(asks)].slice(0, 3) })
  return [
    ctx('pulse', 'Pulse', 'trending_up', acct ? [Q.cash, Q.owes, Q.owe] : desk ? [Q.attention, Q.tasks] : runs ? [Q.studio, ...books] : [Q.tasks, Q.attention, Q.overdue]),
    ctx('needs', 'Needs you', 'task_alt', acct ? [Q.owes, Q.owe, Q.tasks] : desk ? [Q.attention, Q.tasks] : [...(runs || f.role === 'Manager' ? [Q.approvals] : []), Q.attention, Q.overdue]),
    ctx('day', 'Your day', 'event', acct ? [Q.tasks, Q.owes] : [Q.tasks, ...(f.meetingAhead ? [Q.nextMeeting] : []), Q.meetings]),
    ctx('pipeline', 'Pipeline', 'view_kanban', desk ? [Q.attention, Q.addLead] : [Q.attention, Q.quotesWaiting, Q.addLead]),
    ctx('projects', 'Projects', 'business_center', [Q.overdue, Q.starts, ...(f.books ? [Q.owes] : [])]),
    ctx('team', 'Team', 'group', [Q.team, Q.overdue]),
    ctx('site', 'On site', 'photo_camera', [Q.siteUpdate, Q.starts]),
  ]
}

/** The field's words — what it answers from, never what it is ("Ask Maison AI about your studio…" on the drawing). */
/* (the calm UI build 2026-10-27 — the audit's 1-19, W-070) one door, one set of words: "Ask Maison AI…", as the sheet's Ask box says it */
export const FIELD_PLACEHOLDER = 'Ask Maison AI…'
export const FIELD_PLACEHOLDER_SHORT = 'Ask Maison AI…'
export const FOLLOW_UP_PLACEHOLDER = 'Ask a follow-up…'

/** (Q-01) Whether an answer is short enough to grow above the field at a desk — else it opens in the pane. A proposal always opens in the pane
    (a decision surface holds its one filled button, his § 2); so does a long list, a timeline, or words past a few lines. */
export function isShortAnswer(a: { plan?: unknown; rows?: unknown[]; timeline?: unknown[]; compare?: unknown; text?: string }): boolean {
  if (a.plan) return false
  if ((a.rows?.length ?? 0) > 4) return false
  if ((a.timeline?.length ?? 0) > 0) return false
  if ((a.text?.length ?? 0) > 280) return false
  return true
}
