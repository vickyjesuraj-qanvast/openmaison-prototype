/**
 * (Projects round 9 — Q-44 · Q-45; the Client Portal Proposal, board 9 "What clients can see") The portal's six sections and its welcome line —
 * pure and client-safe. The server half is lib/portal/sections-queries.ts.
 *
 * A section a studio switches off is gone from every client's portal AND refused on the server (1.0's fifteen switches hid tabs in the browser
 * and served the data to anyone who asked, M-083): `portalGate(slug, sub)` sends a page of a section that is off back to the home,
 * `portalActor(slug, { section })` refuses its requests, `fetchPortalData` withholds its facts and its What needs you, the portal's file route
 * refuses its files, the bell withholds its rows, and the studio's Client access panel says it is off. Inside a section that is on, the client
 * still sees only what the studio shared.
 *
 * A section's key is the portal tab's key (`PORTAL_TABS`, lib/portal/model.ts): a tab whose key names a section that is off is not listed —
 * so the Money tab round 6 adds is hidden by the Money switch without either round touching the other's code.
 */
import type { HomeFacts } from './needs'

export const SECTIONS_KEY = 'portal_sections'
export const WELCOME_KEY = 'portal_welcome'

export type SectionKey = 'schedule' | 'updates' | 'money' | 'files' | 'designs' | 'choices'
  | 'floor-plan'   // (gaps build G, G-Q1) the floor plan marked up together — its key is its page's path, as `sectionOfPath` reads it
  | 'messages' | 'issues' | 'about'   // (gaps build H, H-Q2 · H-Q11 · H-Q20) the conversation with the team, issues reported, the studio's About page
/** Board 9's six, with its words — (fix-G, G-25) in the portal's own tab order (`PORTAL_TABS`), so the switches, the client's tabs and the
    Client access panel name them one way. */
export const PORTAL_SECTIONS: readonly { key: SectionKey; name: string; line: string }[] = [
  { key: 'schedule', name: 'Schedule', line: 'Milestones and dates, once you share them' },   // (the calm UI build 2026-10-27, 3-04) milestones, as the Schedule says
  { key: 'updates', name: 'Updates', line: 'Posts and photos, once published' },
  { key: 'money', name: 'Payments', line: 'What’s due, how to pay, receipts' },   // (the calm UI build 2026-10-27, 3-02) the client's tab reads Payments; the key stays `money`
  { key: 'choices', name: 'Choices', line: 'Options you ask the client to pick between' },
  { key: 'designs', name: 'Designs', line: 'Rooms you share from the Visualizer' },
  { key: 'files', name: 'Files', line: 'Only files marked Shown to client' },
  { key: 'floor-plan', name: 'Floor plan', line: 'Plans you mark up together, without what’s on Studio only' },   // (gaps build G, G-Q1) (invented copy)
  /* (gaps build H) (invented copy) */
  { key: 'messages', name: 'Messages', line: 'One conversation with the team about the project' },
  { key: 'issues', name: 'Issues', line: 'Problems the client reports, with photos, and your answers' },
  { key: 'about', name: 'About us', line: 'Your story, your team and how to reach you — from Company › Profile and Members' },
]
const KEYS = PORTAL_SECTIONS.map((s) => s.key) as readonly string[]
export const isSectionKey = (k: string): k is SectionKey => KEYS.includes(k)
export const sectionName = (k: SectionKey) => PORTAL_SECTIONS.find((s) => s.key === k)?.name ?? k

/** Every section on — a studio that never opened the card. */
export type PortalSections = Record<SectionKey, boolean>
export const ALL_ON: PortalSections = { schedule: true, updates: true, money: true, files: true, designs: true, choices: true, 'floor-plan': true, messages: true, issues: true, about: true }
export function parseSections(v: unknown): PortalSections {
  const r = (v ?? {}) as Partial<Record<string, unknown>>
  return Object.fromEntries(PORTAL_SECTIONS.map((s) => [s.key, r[s.key] !== false])) as PortalSections
}
/** The keys switched off. */
export const hiddenOf = (s: PortalSections): SectionKey[] => PORTAL_SECTIONS.filter((x) => !s[x.key]).map((x) => x.key)

/** The section a portal page belongs to, by its path after /my/<slug> ("schedule", "updates?x=1", "money/…") — null for Home, the questions,
    sign-in and the file route (a file is checked by its own rule). */
export function sectionOfPath(sub: string): SectionKey | null {
  const first = sub.replace(/^\/+/, '').split(/[/?#]/)[0] ?? ''
  return isSectionKey(first) ? first : null
}

/** What needs you's kinds (lib/portal/model.ts `NeedKind`) that belong to a section — the rest (a quote, a contract, the questions) are the
    steps before work starts and always show. 'payment' is round 6's kind. */
export const NEED_SECTION: Readonly<Record<string, SectionKey>> = { stage: 'schedule', choice: 'choices', file: 'files', renders: 'designs', payment: 'money', invoice: 'money' }

/** A home's facts with the sections that are off taken out — what `fetchPortalData` sends the client's pages. The schedule keeps a stub
    that says one exists (`hasMilestones`), so the home never prints the project's own target end in its place; the needs of a section that
    is off (round 6's payment included) are filtered by `NEED_SECTION`. */
export function withholdSections<F extends Pick<HomeFacts, 'files' | 'designs' | 'choices' | 'schedule' | 'updates'>>(f: F, hidden: readonly string[]): F {
  if (!hidden.length) return f
  const off = (k: SectionKey) => hidden.includes(k)
  return {
    ...f,
    files: off('files') ? [] : f.files,
    designs: off('designs') ? [] : f.designs,
    choices: off('choices') ? [] : f.choices,
    schedule: off('schedule') && f.schedule ? { projectId: f.schedule.projectId, hasMilestones: true, summary: null, toConfirm: [], concerns: 0 } : f.schedule,
    updates: off('updates') ? null : f.updates,
  }
}
export const needShown = (kind: string, hidden: readonly string[]) => { const k = NEED_SECTION[kind]; return !k || !hidden.includes(k) }

/** The refusal a client reads when a request names a section that is off (`portalActor`). */
export const sectionClosed = (k: SectionKey, studio: string) => `${sectionName(k)} isn’t open on ${studio}’s portal`
/** The Client access panel's line for a section that is off (board 8's "What {client} can see"). */
export const SECTION_OFF_STATE = 'Off for every client'

/* ── The welcome line (Q-44) ──────────────────────────────────────────────────────────────────────────────────────────────────── */
/** One plain line — board 9's "Welcome line, shown when a client signs in". */
export const WELCOME_MAX = 80
/** What the field keeps: no control characters, single spaces, no HTML meaning (React prints it as text), cut at the limit. */
export const cleanWelcome = (raw: string) => raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, WELCOME_MAX)
/** The sign-in page's heading when the studio wrote none — the line it always had (board 5). */
export const defaultWelcome = (studio: string) => `Your renovation with ${studio}`
