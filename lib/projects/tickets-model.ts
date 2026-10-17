/**
 * (gaps build H — calls H-Q1…H-Q10, design-source/context/parity/projects-gaps-build/h-read.md) Tickets — pure and client-safe. A problem the
 * client reports on their portal (an "issue" to them — H-Q1: the client reads "issue", the studio "ticket", one number on both sides) or the
 * studio raises for them. Four states (H-Q3), two priorities (H-Q4), the categories Settings › Projects keeps (H-Q8), the thread's lines.
 * The server half is lib/projects/tickets.ts (reads) and app/projects/tickets-actions.ts · app/portal/tickets-actions.ts (writes).
 */
import { formatProjectNumber, parseProjectNumbering, type ProjectNumbering } from './model'   // (parity map, UC-058) the numbering card's pattern

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]
export const isTicketStatus = (s: string): s is TicketStatus => (TICKET_STATUSES as readonly string[]).includes(s)
/** The state's word — the same on both sides (1.0's four). */
export const STATUS_WORDS: Record<TicketStatus, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' }
/** The house chip's colour for a state: open waits (red, as 1.0's pill), in progress is being looked at (yellow), resolved green, closed grey. */
export const STATUS_TONE: Record<TicketStatus, 'red' | 'yellow' | 'green' | 'default'> = { open: 'red', in_progress: 'yellow', resolved: 'green', closed: 'default' }
/** Open and In progress still need the studio; Resolved and Closed are done (a client's reply reopens a Resolved one). */
export const isLive = (s: string) => s === 'open' || s === 'in_progress'

export type TicketPriority = 'normal' | 'urgent'
export const PRIORITY_WORDS: Record<TicketPriority, string> = { normal: 'Normal', urgent: 'Urgent' }

/** 1.0's limits (I-330 · I-331): a subject of 120 characters, up to five photos. The words and a reply: 2,000. */
export const SUBJECT_MAX = 120
export const BODY_MAX = 2000
export const PHOTOS_MAX = 5
export const NOTE_MAX = 300
/** A photo from a phone, as the browser shrank it — the cap per photo, in characters of its data URL (G's). */
export const PHOTO_DATA_MAX = 2_400_000
/** (H-Q25) An open ticket the studio has not answered for this long raises its project in Needs attention (invented threshold). */
export const WAIT_DAYS = 2

/* ── Categories (H-Q8) — Settings › Projects › Ticket categories ─────────────────────────────────────────────────────────────── */
export const TICKET_CATEGORIES_KEY = 'ticket_categories'
export type TicketCategory = { name: string; retired?: boolean }
/** 1.0's eight words, each kept as a word (1.0 stored four of them as "Other", I-335). */
export const DEFAULT_CATEGORIES: TicketCategory[] = ['Quality of work', 'Timeline', 'Communication', 'Safety', 'Damage or breakage', 'Site cleanliness', 'Vendor or supplier', 'Other'].map((name) => ({ name }))
export const CATEGORY_MAX = 40
export function parseCategories(v: unknown): TicketCategory[] {
  if (!Array.isArray(v)) return DEFAULT_CATEGORIES
  const seen = new Set<string>()
  const out: TicketCategory[] = []
  for (const x of v) {
    const name = typeof x === 'string' ? x : x && typeof x === 'object' && typeof (x as { name?: unknown }).name === 'string' ? (x as { name: string }).name : ''
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, CATEGORY_MAX)
    if (!clean || seen.has(clean.toLowerCase())) continue
    seen.add(clean.toLowerCase())
    out.push((x as { retired?: unknown })?.retired === true ? { name: clean, retired: true } : { name: clean })
  }
  return out.length ? out : DEFAULT_CATEGORIES
}
/** The categories a new ticket may take (a retired one stays on its tickets). */
export const liveCategories = (list: readonly TicketCategory[]) => list.filter((c) => !c.retired).map((c) => c.name)

/* ── Numbers — T-{YYYY}-{nnn}, counted per year across the studio ────────────────────────────────────────────────────────────── */
export const ticketNumber = (year: number, seq: number) => `T-${year}-${String(seq).padStart(3, '0')}`
export function nextTicketSeq(numbers: readonly string[], year: number): number {
  let max = 0
  for (const n of numbers) {
    const m = /^T-(\d{4})-(\d+)$/.exec(n)
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]))
  }
  return max + 1
}

/* ── Whose turn ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export type TurnFacts = { status: string; lastClientAt: number | null; lastStudioAt: number | null; createdAt: number }
/** Who should speak next on a ticket still live: the studio, when the client's newest word is newer than the studio's (or the studio has not
    answered yet); else the client. Null once it is resolved or closed. */
export function turnOf(t: TurnFacts): 'studio' | 'client' | null {
  if (!isLive(t.status)) return null
  const client = t.lastClientAt ?? t.createdAt
  return t.lastStudioAt === null || client > t.lastStudioAt ? 'studio' : 'client'
}
/** (H-Q25) A live ticket that has waited on the studio for more than WAIT_DAYS — since the client's newest word. */
export function waitingDays(t: TurnFacts, now: number): number {
  if (turnOf(t) !== 'studio') return 0
  return Math.floor((now - (t.lastClientAt ?? t.createdAt)) / 86_400_000)
}

/* ── The thread's lines ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
export type TicketEvent = 'resolved' | 'reopened' | 'closed' | 'escalated' | 'assigned' | 'priority'
/** The events only the studio reads (H-Q6): who looks after it, its priority, an escalation. */
export const STUDIO_ONLY_EVENTS: readonly TicketEvent[] = ['escalated', 'assigned', 'priority']
/** A state line, as the thread draws it — "Germaine marked it resolved". `detail` = the assignee's name, the priority word. */
export function eventLine(event: string, by: string, detail?: string | null): string {
  if (event === 'resolved') return `${by} marked it resolved`
  if (event === 'reopened') return `${by} reopened it`
  if (event === 'closed') return `${by} closed it`
  if (event === 'escalated') return `${by} escalated it — Urgent`
  if (event === 'assigned') return !detail ? `${by} left it with nobody for now` : detail === by ? `${by} took it on` : `${by} gave it to ${detail}`
  if (event === 'priority') return `${by} set it to ${detail ?? 'Normal'}`
  return by
}

/** "Quality of work · Reported 3 Oct by Benjamin" — the line under a ticket's subject (the client's side reads "by you"). */
export const raisedLine = (o: { category: string; day: string; by: string }) => `${o.category} · Reported ${o.day} by ${o.by}`

/* ── (parity map 2026-10-10 — UC-058 · FR-084) the ticket's number, the studio's pattern: Settings › Finance › Document numbers' Tickets row ──
   The default is today's — T-{YYYY}-{nnn}, counted per year across the studio — so a studio that never opens the row numbers as it always did;
   1.0 let the studio set the prefix (Accounts › Document Numbering). The year in the pattern restarts the count each year, as today. */
export const TICKET_NUMBERING_KEY = 'ticket_numbering'
export const DEFAULT_TICKET_NUMBERING: ProjectNumbering = { prefix: 'T', year: true, next: 0, digits: 3 }
export function parseTicketNumbering(v: unknown): ProjectNumbering {
  if (!v || typeof v !== 'object') return DEFAULT_TICKET_NUMBERING
  const r = v as Partial<ProjectNumbering>
  const n = parseProjectNumbering({ ...r, prefix: typeof r.prefix === 'string' && r.prefix.trim() ? r.prefix : DEFAULT_TICKET_NUMBERING.prefix })
  return { ...n, digits: typeof r.digits === 'number' ? n.digits : DEFAULT_TICKET_NUMBERING.digits }
}
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The number a new ticket takes under this pattern: one past the highest given under its prefix (this year's, when the year is in it),
    never below the pattern's next number. The default pattern gives exactly what `ticketNumber(year, nextTicketSeq(…))` gave. */
export function nextTicketNumber(n: ProjectNumbering, numbers: readonly string[], at: Date): string {
  const re = n.year ? new RegExp(`^${escRe(n.prefix)}-${at.getFullYear()}-(\\d+)$`) : new RegExp(`^${escRe(n.prefix)}-(\\d+)$`)
  let max = 0
  for (const x of numbers) { const m = re.exec(x); if (m) max = Math.max(max, Number(m[1])) }
  return formatProjectNumber(n, Math.max(n.next || 1, max + 1), at)
}

/* ── (parity map 2026-10-10, UC-047 — 1.0's Escalations › Filter) Tickets › Filters: Priority · Status · Looks after, applied live ─────── */
/** `owners`: member ids, and `NOBODY` for a ticket nobody looks after yet. */
export const NOBODY = 'nobody'
export type TicketFilters = { priority: TicketPriority[]; status: TicketStatus[]; owners: string[] }
export const EMPTY_TICKET_FILTERS: TicketFilters = { priority: [], status: [], owners: [] }
/** Which groups hold a choice — the modal's dots, the button's count. */
export const activeTicketGroups = (f: TicketFilters) => ({ priority: f.priority.length > 0, status: f.status.length > 0, owners: f.owners.length > 0 })
export const ticketFilterCount = (f: TicketFilters) => Object.values(activeTicketGroups(f)).filter(Boolean).length
export const sameTicketFilters = (a: TicketFilters, b: TicketFilters) => JSON.stringify(a) === JSON.stringify(b)
/** A ticket the filters keep — every group with a choice must match (a group is any of its choices). */
export function keepsTicket(t: { priority: string; status: string; assignee: { id: string } | null }, f: TicketFilters): boolean {
  if (f.priority.length && !f.priority.includes(t.priority === 'urgent' ? 'urgent' : 'normal')) return false
  if (f.status.length && !f.status.includes(t.status as TicketStatus)) return false
  if (f.owners.length && !f.owners.includes(t.assignee?.id ?? NOBODY)) return false
  return true
}
