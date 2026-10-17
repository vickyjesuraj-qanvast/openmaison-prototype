import type { Member } from '@/lib/db/schema'
import type { ScheduleFacts } from './schedule-model'

/**
 * (REG-911…) Projects — the record's words and shapes, pure and client-safe. One client record in two chapters: a project always
 * points at a lead (a Won lead, or a `direct` one made by New project). The build record is
 * design-source/context/parity/23-projects-build-2026-10-05.md; §5 there names every extension point in this folder.
 */

/** (Q-03) One stage word per state, no second status — 1.0's Draft · Active · Closed. */
export const PROJECT_STAGES = ['setting_up', 'in_progress', 'completed'] as const
export type ProjectStage = (typeof PROJECT_STAGES)[number]
export const STAGE_LABEL: Record<ProjectStage, string> = { setting_up: 'Setting up', in_progress: 'In progress', completed: 'Completed' }
export const isProjectStage = (v: unknown): v is ProjectStage => typeof v === 'string' && (PROJECT_STAGES as readonly string[]).includes(v)
/** The stage's chip colour — the header's MetaChip and the table's Tag read the same: yellow while it is set up, green while it runs. */
export const STAGE_TONE: Record<ProjectStage, 'yellow' | 'green' | 'default'> = { setting_up: 'yellow', in_progress: 'green', completed: 'default' }

/** The Won step's project types (lib/leads/stage-data.ts, `components/leads/move-stage/panels.tsx`) — the owner kept these three (leads Q-34). */
export const PROJECT_TYPES = ['Whole-home renovation', 'Partial renovation', 'Commercial fit-out'] as const

/** (Q-05) A new project's name: "{property type} — {client}". Renamed at any stage. */
export const defaultProjectName = (propertyType: string | null | undefined, client: string): string =>
  propertyType && propertyType !== 'Others' ? `${propertyType} — ${client}` : client
export const NAME_MAX = 80

/* ── Numbers (Settings › Projects › Project numbers; the quotes' numbering model, REG-561) ───────────────────────────────────── */

/** A prefix, the year when switched on, then the running number padded to `digits`: "P-2026-001". */
export type ProjectNumbering = { prefix: string; year: boolean; next: number; digits: number }
export const DEFAULT_PROJECT_NUMBERING: ProjectNumbering = { prefix: 'P', year: true, next: 0, digits: 3 }
export const PROJECT_NUMBERING_KEY = 'project_numbering'

export function parseProjectNumbering(v: unknown): ProjectNumbering {
  const r = (v ?? {}) as Partial<Record<keyof ProjectNumbering, unknown>>
  const prefix = typeof r.prefix === 'string' ? r.prefix.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() : ''
  return {
    prefix: prefix || DEFAULT_PROJECT_NUMBERING.prefix,
    year: r.year === undefined ? DEFAULT_PROJECT_NUMBERING.year : r.year === true,
    next: typeof r.next === 'number' && Number.isFinite(r.next) && r.next > 0 ? Math.floor(r.next) : 0,
    digits: typeof r.digits === 'number' && Number.isFinite(r.digits) ? Math.min(6, Math.max(0, Math.floor(r.digits))) : DEFAULT_PROJECT_NUMBERING.digits,
  }
}

/** The running number the next project takes: the setting's `next`, never below the highest already given under the prefix. */
export function nextProjectSeq(numbers: string[], n: ProjectNumbering): number {
  const tail = (x: string) => { const m = /(\d+)$/.exec(x); return m ? Number(m[1]) : 0 }
  const highest = numbers.filter((x) => x.startsWith(`${n.prefix}-`)).reduce((m, x) => Math.max(m, tail(x)), 0)
  return Math.max(n.next || 1, highest + 1)
}

/** (fix-A, A-06) The highest running number ever given under each prefix — a purge never frees one (`markNumberGiven`). */
export const PROJECT_NUMBERS_GIVEN_KEY = 'project_numbers_given'
export function parseNumbersGiven(v: unknown): Record<string, number> {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]) && e[1] > 0))
}

export function formatProjectNumber(n: ProjectNumbering, seq: number, date: Date): string {
  const parts = [n.prefix]
  if (n.year) parts.push(String(date.getFullYear()))
  parts.push(n.digits ? String(seq).padStart(n.digits, '0') : String(seq))
  return parts.join('-')
}

/** (fix-A, A-15) The Won step's uploaded signed quote, filed in the lead's Files under this name — Key documents names and opens it. */
export const signedQuoteFileName = (uploaded: string) => `Signed quote — ${uploaded.replace(/\.pdf$/i, '').trim().slice(0, 120)}.pdf`

/* ── The agreed payment split outside a system quote ─────────────────────────────────────────────────────────────────────────── */

export type SplitShare = { name: string; pct: number
  /** (gaps build B, item 13 — 1.0's fee first, behind Settings › Projects) a fixed-amount stage: it bills this; the shares split what it leaves */
  fixedMinor?: number | null }
/** `projects.payment_template`: a direct project's Payments template (its id and its rows as agreed), or the Won step's milestones on an
    uploaded quote (`template` null). */
export type ProjectSplit = { template: string | null; rows: SplitShare[] }
export function parseProjectSplit(v: unknown): ProjectSplit | null {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { template?: unknown; rows?: unknown }
  const rows = Array.isArray(r.rows) ? r.rows.flatMap((x) => {
    const o = (x ?? {}) as { name?: unknown; pct?: unknown; fixedMinor?: unknown }
    const fixed = typeof o.fixedMinor === 'number' && Number.isFinite(o.fixedMinor) && o.fixedMinor > 0 ? Math.round(o.fixedMinor) : null   // (gaps build B, item 13)
    return typeof o.name === 'string' && typeof o.pct === 'number' && Number.isFinite(o.pct) ? [{ name: o.name.slice(0, 60), pct: fixed ? 0 : Math.max(0, Math.min(100, o.pct)), ...(fixed ? { fixedMinor: fixed } : {}) }] : []
  }) : []
  return rows.length ? { template: typeof r.template === 'string' ? r.template : null, rows } : null
}

/* ── What the pages are handed (built on the server by lib/projects/queries.ts) ──────────────────────────────────────────────── */

export type ProjectMember = { id: string; name: string; color: string }
/** A payment stage as the Money card lists it: a share of the contract value. */
export type PaymentStage = { name: string; pct: number; amountMinor: number; due: string | null }

/** One row of the listing — what every column, tile, scope and search reads. Columns other rounds add read their own fields here. */
export type ProjectRow = {
  id: string
  number: string
  name: string
  stage: ProjectStage
  projectType: string | null
  leadId: string
  direct: boolean
  /** The signed quote and contract it names — the row's menu opens them (the project page's menu, the same items). */
  quoteId: string | null
  contractId: string | null
  client: string
  phone: string
  propertyType: string
  property: string | null
  team: ProjectMember[]
  /** null when the viewer may not see money (lib/projects/policy.ts `seesMoney`). */
  contractValueMinor: number | null
  startDate: Date | null
  targetEndDate: Date | null
  startedAt: Date | null
  createdAt: Date
  /** The newest thing done on the project's record (a task, a file, a note, an event) — the Last activity column. */
  lastActivity: Date
  /** Why it needs attention (lib/projects/attention.ts), worst first; empty when it does not. */
  attention: string[]
  /** What the client has in hand to answer — a quote awaiting confirmation, a contract awaiting signature. */
  waitingOn: string[]
  /** (REG-956) The newest published update — the Last update column; null when nothing has reached the client yet. */
  lastUpdate: Date | null
  /** (REG-956) Updates In review this viewer may approve (an Owner's or an Admin's) — the "Needs my review" to-do scope; 0 for anyone else. */
  updatesToReview: number
  /** (Projects round 5) Invoices waiting for this Owner's or Admin's approval — "Needs my review" with the updates; 0 for anyone else. */
  invoicesToReview?: number
  /** (Projects round 2) The schedule's facts: the Next milestone and Progress columns read them; null before the loader fills them. */
  schedule: ScheduleFacts | null
  /** (Projects round 7) What the row's menu offers this viewer: the handover (the project's team), Reopen and Delete (Owners and Admins);
      `requested` = a handover waits for review — "Needs my review" counts it for an Owner or an Admin. */
  ends?: { mayHandover: boolean; runs: boolean; requested: boolean; /** (fix-E, E-21) who asked for the review, and when */ requestedBy?: string | null; requestedAt?: number | null }
  /** (Projects round 6) Collected on the sent invoices — the Collected column (Owner / Admin, like Contract value); null for anyone else. */
  collectedMinor?: number | null
  /** (Projects round 6, Q-48) A client's payments waiting for THIS viewer to confirm — "Needs my review"; 0 for anyone else. */
  paymentsToConfirm?: number
  /** (gaps build, package A — M-01) On hold: since when, why, when it resumes (lib/projects/hold.ts); null while it runs. */
  hold?: { since: number; reason: string; until: number | null; by: string | null } | null
  /** (gaps build F2 — F2-Q1 · Q2) Profit and margin — the Margin column, Owners and Admins only; null for anyone else. */
  profit?: import('@/lib/finance/profit').ProfitView | null
  /** (simplify S-20) The rest of what waits for THIS viewer's OK on the project — the schedule's asks (more time on a milestone, a Done to
      approve, changes to share; an Owner's or an Admin's) and the purchase orders and expenses waiting for approval — "Needs my review"
      counts them with the updates, invoices, payments and handover above; null for a viewer who answers none of them. */
  approvals?: { more: string[]; done: string[]; share: boolean; pos: number; expenses: number } | null
  /** (pending modules S45A — H-UHD-3, UHD's "Lead Type") the lead's source, as Settings › Lead sources names it — the Source column */
  source?: string
  /** (S45A — UHD's "Sign Date") the day the client signed: the signed quote's or the contract's signature, whichever came first, else the day the
      lead was won (the Won step records the signed copy); null for neither — the Signed on column. `ref` names the quote or the contract. */
  signedOn?: { at: number; by: 'quote' | 'contract' | 'won'; ref: string | null } | null
  /** (S45A — UHD's "Total Sales, Initial Amount bf GST") the sale as signed, before GST — the signed quote as signed, else the value agreed
      (lib/projects/money-queries.ts `signedNetBy`, the Sales report's Won value); variation orders not included. null for a viewer who may not
      see money, or a project with no value — the Value before GST column. */
  signedValue?: { minor: number; netMinor: number; from: 'quote' | 'agreed'; quoteNumber: string | null } | null
}

export type ProjectsListData = {
  rows: ProjectRow[]
  team: Member[]
  now: number
  viewer: { id: string; role: string; /** (gaps build D, item 10) reviews updates: an Owner, an Admin or a named reviewer */ reviews?: boolean }
  /** Owner / Admin only (Q-06): the open projects' contract value; null for everyone else. */
  totalValueMinor: number | null
  /** (pending modules S41b-1) the viewer sees profit and margin — the listing's Margin column (Who sees costs and margins) */
  margins?: boolean
  /** The member ids this viewer may put on a project's team (the leads' rule, `assignableIds`), and why not when none. */
  assignable: string[]
  assignHint: string | null
  /** For New project: the studio's payment splits (Company › Templates › Payments) and the live lead sources. */
  splits: { id: string; name: string; rows: SplitShare[] }[]
  /** (gaps build, package A) New project's team picker: each member's projects still running (Setting up · In progress) and the stats the
      lead's Assign popover suggests from (`suggestMember`, REG-612). */
  memberLoad?: Record<string, number>
  memberStats?: Record<string, { closeRate: number; projects12m: number; active: number }>
  /** (gaps build I, I-Q1 · I-Q3) The Workload view: whether this viewer sees it (Owners, Admins, Managers) and sets capacities (Owners and
      Admins), the studio's default capacity and a Manager's team. Absent for anyone who doesn't see it. */
  workload?: { defaultCapacity: number; sets: boolean; teamIds: string[] }
  /** (S45B · H-UHD-2) The Workload view's Contractors — the contractors' records, for whoever works on projects (not Accounting, not Marketing) */
  contractors?: import('./contractors').CrewBoardData
}

/* ── (gaps build, package A) The scope's rooms — 1.0's twelve chips (B-67), the project's own (`projects.scope`) ─────────────────────── */
export const ROOMS = ['Living Room', 'Kitchen', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3', 'Bathroom 1', 'Bathroom 2', 'Balcony', 'Service Yard', 'Study', 'Dining', 'Others'] as const
/** The stored scope, kept to the twelve and in their order. */
export function parseScope(v: unknown): string[] {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!Array.isArray(raw)) return []
  const set = new Set(raw.filter((x): x is string => typeof x === 'string'))
  return ROOMS.filter((r) => set.has(r))
}
/** "Living Room, Kitchen and Study". */
export const scopeWords = (rooms: string[]): string => (rooms.length <= 1 ? rooms.join('') : `${rooms.slice(0, -1).join(', ')} and ${rooms[rooms.length - 1]}`)

/** (gaps build, package A, 1.0 B-187) Two projects never share a name — the number tells them apart in a list, a name does in speech. */
export const DUPLICATE_NAME = 'A project with this name already exists'
/** (S42F — a project made with nobody on it, P-2026-006) A project needs a member, as a lead past New does (REG-130 · REG-334): the stage
    menu's words (`blockedReason`), answered by New project's server and every stage move past New. */
export const TEAM_NEEDED = 'Assign a member first'
export const sameName = (a: string, b: string) => a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase()
