/**
 * (Projects round 8 — Selections, the project's **Choices**; Q-18 · Q-45's "Choices"; the report's "Design tools … selections", 1.0's
 * Materials sub-tab F-126…F-179 and the homeowner's board I-282…I-288) The words and rules of a choice put to the client, pure and
 * client-safe — the studio's tab, the portal, the server actions and the repair read the same functions, so a refusal on screen and on the
 * server is one sentence.
 *
 * A choice is **Draft** (only the studio sees it) → **Shared** (on the client's portal, waiting for their pick) → **Chosen** (by the client,
 * with their note; or by the studio with the client, "Chosen with the client on a call"). The pick is kept by the option's id (1.0 kept a
 * position, F-159 · F-174). A pick can change until the work it belongs to starts (its milestone under way or past its first day; a choice
 * with no milestone, until the project is complete). An option's price is against the quote: it adds, it saves, or it changes nothing.
 */
import { moneySGD } from '@/lib/format'
import { dayLabel, dayMonth, dayOf } from './schedule-model'
import type { ChoiceAnswer } from './decline'

/** (gaps build D, item 2 — M-07) `declined`: the client said no on their portal — turned the options down, or asked for other options — so it
    is back with the studio (no longer waiting on the client) until it is shared again. */
export type ChoiceStatus = 'draft' | 'shared' | 'chosen' | 'declined'
export const isChoiceStatus = (s: string): s is ChoiceStatus => s === 'draft' || s === 'shared' || s === 'chosen' || s === 'declined'
export type ChoiceSource = 'material' | 'price_book' | 'render' | 'upload'
export const isChoiceSource = (s: string): s is ChoiceSource => s === 'material' || s === 'price_book' || s === 'render' || s === 'upload'

/** Add an option ▾ — where an option can come from (the brief's four: Company › Materials, the Price book, the Visualizer's renders, an upload). */
export const CHOICE_SOURCES: { key: ChoiceSource; label: string; icon: string }[] = [
  { key: 'material', label: 'From Materials', icon: 'texture' },
  { key: 'price_book', label: 'From the Price book', icon: 'list_alt' },
  { key: 'render', label: 'From a render', icon: 'wand_shine' },
  { key: 'upload', label: 'Upload a picture', icon: 'upload' },
]
/** The caption under an option on the studio's card — where it came from. */
export const SOURCE_WORD: Record<ChoiceSource, string> = { material: 'Materials', price_book: 'Price book', render: 'Render', upload: 'Upload' }

export const TITLE_MAX = 80
export const ROOM_MAX = 60
export const NOTE_MAX = 300
export const OPTION_NAME_MAX = 80
export const OPTION_DESC_MAX = 300
export const OPTIONS_MAX = 8
export const CLIENT_NOTE_MAX = 300
/** (gaps build D, item 11) the team's own note on a choice, and an option's vendor */
export const STUDIO_NOTE_MAX = 300
export const VENDOR_MAX = 80
/** A price difference the field takes — S$1,000,000 either way. */
export const PRICE_MAX_MINOR = 100_000_000
/** How many days ahead a needed-by date counts as near — the listing's Waiting on client (invented threshold, as WAIT_GRACE_DAYS). */
export const NEAR_DAYS = 7
/** What a pick made with the client, off the portal, says by default (the brief's words). */
export const STUDIO_NOTE_DEFAULT = 'Chosen with the client on a call'
/** Grouping on the tab: by room or area, or by the milestone the work belongs to. */
export type ChoiceGroupBy = 'room' | 'milestone'
export const GROUP_OPTIONS: { value: ChoiceGroupBy; label: string }[] = [{ value: 'room', label: 'By room' }, { value: 'milestone', label: 'By milestone' }]
export const GROUP_KEY = 'om.choices.group'

/* ── the record as the pages read it ─────────────────────────────────────────────────────────────────────────────────────────── */

export type OptionView = {
  id: string
  name: string
  description: string | null
  /** The picture's address (the lead file's own — /files/img/<id> or the public picture it points at); null = a colour or nothing. */
  src: string | null
  /** (gaps build D, item 11 — 1.0 F-139) who supplies it */
  vendor?: string | null
  fileId: string | null
  hex: string | null
  priceMinor: number | null
  source: ChoiceSource
  sourceRef: string | null
}
export type ChoiceMilestone = { id: string; title: string; status: string; start: number; position: number }
export type ChoicePick = { optionId: string; by: 'client' | 'studio'; member: string | null; at: number; note: string | null }
/** (gaps build D, item 2) The client's no: which answer, their reason, when, who (their name as the studio reads it). */
export type ChoiceNo = { kind: ChoiceAnswer; note: string | null; at: number; person: string | null }
export type ChoiceView = {
  id: string
  title: string
  room: string | null
  note: string | null
  status: ChoiceStatus
  milestone: ChoiceMilestone | null
  /** Local midnight, ms. */
  neededBy: number | null
  options: OptionView[]
  chosen: ChoicePick | null
  /** (gaps build D, item 2) the client's no, while it stands (status `declined`) */
  answer?: ChoiceNo | null
  /** (gaps build D, item 11 — 1.0 F-162) the team's own note — never on the portal, the receipt or the client's preview */
  studioNote?: string | null
  /** (gaps build D, item 7) the selection receipt of a confirmed pick — its Files › Choices entry and its fingerprint */
  receipt?: { fileId: string; hash: string } | null
  /** (Projects round 6) The variation order drafted from the pick's price difference, if any — the card links to it. */
  variation?: { id: string; number: string; status: string } | null
  createdBy: string | null
  createdAt: number
  sharedBy: string | null
  sharedAt: number | null
  updatedAt: number
}
export type ChoicesData = {
  project: { id: string; name: string; number: string; stage: string; leadId: string }
  /** (fix-C, C-18) `section`: the portal's Choices switched on — with `invited`, whether a shared choice reaches the client at all. */
  client: { name: string; firstName: string; invited: boolean; section: boolean }
  choices: ChoiceView[]
  milestones: ChoiceMilestone[]
  /** (REG-1068) The GST a pick's variation order adds (the studio's rate when the project's quote charges it, else 0). */
  gstPct: number
  /** (gaps build D, item 11) the studio's trades — a new option saved to the Price book takes one as its category */
  trades?: string[]
  /** (S44I — M9) the studio's units — Save to the Price book's Unit list */
  units?: string[]
  viewer: { id: string; mayChange: boolean; /** (pending modules S41b-1) sees costs — else Save to the Price book asks a unit price only */ costs?: boolean }
  now: number
}

/* ── words ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
/** 0 and nothing are the same: no change against the quote. */
export const normPrice = (minor: number | null | undefined): number | null => (minor == null || !Number.isFinite(minor) || Math.round(minor) === 0 ? null : Math.round(minor))
/** The option's price on the studio's card: "+S$1,200" · "−S$300" · "No change" — (fix-C, C-21) "+S$240 + GST" when the project charges GST,
    so the tile says it is the figure before GST (the pick's line and the client's card say the inclusive one). */
export const priceText = (minor: number | null, gstPct = 0): string => { const m = normPrice(minor); return m == null ? 'No change' : `${m > 0 ? '+' : '−'}${moneySGD(Math.abs(m))}${gstPct > 0 ? ' + GST' : ''}` }
/**
 * (REG-1068) What a pick moves the contract by. An option's price is entered as a quote line's is — before GST — and the variation order
 * drafted from it charges GST on top when the project's quote does (the studio's rate, `pickGstPct` on the server), so every line that says
 * what the pick does to the contract says the GST-inclusive figure: the one the variation order will carry. 0 = no GST.
 */
export const withGst = (minor: number, gstPct: number): number => (gstPct > 0 ? minor + Math.round((minor * gstPct) / 100) : minor)
const money2s = (minor: number) => `S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100)}`
/** A pick's line on the card (the brief's words): "+S$1,200 on the contract" · "−S$300 off the contract"; with GST "+S$1,308.00 on the
    contract (S$1,200 + GST)" (REG-1068); null when it changes nothing. */
export const contractLine = (minor: number | null, gstPct = 0): string | null => {
  const m = normPrice(minor)
  if (m == null) return null
  if (gstPct > 0) { const t = withGst(m, gstPct); return t > 0 ? `+${money2s(t)} on the contract (${money2s(m)} + GST)` : `−${money2s(t)} off the contract (${money2s(-m)} + GST)` }   // (fix-C, C-21) one money format in the sentence
  return m > 0 ? `+${moneySGD(m)} on the contract` : `−${moneySGD(-m)} off the contract`
}
/** The option's price as the client reads it: "Adds S$1,200" · "Saves S$300" · "Included in your quote" — with GST, the amount their contract
    moves by: "Adds S$1,308.00" (REG-1068). */
export const clientPriceText = (minor: number | null, gstPct = 0): string => { const m = normPrice(minor); if (m == null) return 'Included in your quote'; const t = gstPct > 0 ? money2s(withGst(m, gstPct)) : moneySGD(Math.abs(m)); return m > 0 ? `Adds ${t}` : `Saves ${t}` }
/** Under the client's pick, before they confirm (1.0's I-283, in the client's words) — with GST, the inclusive figure and what it is made of. */
export function clientPriceNotice(name: string, minor: number | null, gstPct = 0): string | null {
  const m = normPrice(minor)
  if (m == null) return null
  const amount = gstPct > 0 ? `${money2s(withGst(m, gstPct))} (${money2s(Math.abs(m))} + GST)` : moneySGD(Math.abs(m))   // (fix-C, C-21) one money format
  return m > 0 ? `${name} adds ${amount} to your contract. Your designer sends you the change to confirm.` : `${name} takes ${amount} off your contract. Your designer sends you the change to confirm.`
}
/** "Choose your paint colours" — the portal's What needs you row (the portal canvas's home). */
export const chooseTitle = (title: string) => `Choose your ${title.charAt(0).toLowerCase()}${title.slice(1)}`
/** "Mon 19 Oct" — a needed-by day, the schedule's words. */
export const neededDay = (ms: number) => dayLabel(dayOf(new Date(ms)))
/** "3 options · needed by Mon 19 Oct" (the portal canvas's home line). */
export const optionsLine = (n: number, neededBy: number | null, sharedAt: number | null) =>
  `${plural(n, 'option')}${neededBy ? ` · needed by ${neededDay(neededBy)}` : sharedAt ? ` · shared ${dayMonth(dayOf(new Date(sharedAt)))}` : ''}`
/** The tab's head line for a needed-by date — "Needed by Mon 19 Oct · in 14 days" · "… · 2 days late" · "… · today". */
export function neededLine(neededBy: number, today: number): string {
  const d = dayOf(new Date(neededBy)) - today
  const when = d === 0 ? 'today' : d === 1 ? 'tomorrow' : d > 1 ? `in ${d} days` : `${plural(-d, 'day')} late`
  return `Needed by ${neededDay(neededBy)} · ${when}`
}

/* ── rules (the server's refusals, in the words the page shows) ─────────────────────────────────────────────────────────────── */

export const NOT_SHARED = 'Your designer took this back to change it — it comes back when it’s ready'
export const PROJECT_DONE = 'The project is complete — its choices stay as they were'

/** Share with the client: a Draft with at least one option — (gaps build D, item 2) or one the client said no to: shared again, with its options. */
export function shareBlock(c: { status: ChoiceStatus; options: readonly unknown[] }): string | null {
  if (c.status === 'shared') return 'Already shared'
  if (c.status === 'chosen') return 'Already chosen'
  if (!c.options.length) return 'Add an option first'
  return null
}
/** Take it back to Draft: only while it waits on the client. */
export const unshareBlock = (c: { status: ChoiceStatus }): string | null => (c.status === 'shared' || c.status === 'declined' ? null : c.status === 'chosen' ? 'Already chosen — change the pick instead' : 'Not shared yet')
/** Add, remove or move options: before a pick. */
export const optionsBlock = (c: { status: ChoiceStatus; options: readonly unknown[] }, adding = false): string | null =>
  c.status === 'chosen' ? 'Chosen — its options stay as they were' : adding && c.options.length >= OPTIONS_MAX ? `A choice holds up to ${OPTIONS_MAX} options` : null
/** Delete: never a choice that carries a pick — it is the record of what the client chose. */
export const deleteBlock = (c: { status: ChoiceStatus }): string | null => (c.status === 'chosen' ? 'Chosen — it stays as the record of the pick' : null)
/** Choose for the client, or change the pick: until the work it belongs to starts. */
export function pickBlock(c: { status: ChoiceStatus; options: readonly unknown[]; milestone: ChoiceMilestone | null }, projectStage: string, today: number): string | null {
  if (projectStage === 'completed') return PROJECT_DONE
  if (!c.options.length) return 'Add an option first'
  const m = c.milestone
  if (c.status === 'chosen' && m && (m.status === 'in_progress' || m.status === 'done' || m.start <= today)) return `${m.title} has started — the pick stays`
  return null
}
/** The client's own pick on the portal: shared, not yet chosen, an option of it. */
export function clientPickBlock(c: { status: string; deletedAt?: unknown } | null, chosenName?: string | null, by?: string | null): string | null {
  if (!c || c.deletedAt) return 'This choice isn’t there any more'
  /* (fix-F, F-03) `by` — someone else from the household picked it: their name, never "You" */
  if (c.status === 'chosen') return chosenName ? `${by ?? 'You'} chose ${chosenName} already — to change it, message your designer` : `${by ? `${by} has` : 'You have'} chosen already — to change it, message your designer`
  if (c.status === 'declined') return `${by ? `${by} has` : 'You have'} answered already — your designer will come back to you with other options`   // (gaps build D, item 2)
  if (c.status !== 'shared') return NOT_SHARED
  return null
}

/* ── waiting and attention ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Waiting on the client past its needed-by day. */
export const isChoiceOverdue = (c: { status: string; neededBy: number | null }, today: number) =>
  c.status === 'shared' && c.neededBy != null && dayOf(new Date(c.neededBy)) < today
/** Waiting on the client, its day near (NEAR_DAYS) or past — the listing's Waiting on client counts it. */
export const isChoiceNear = (c: { status: string; neededBy: number | null }, today: number) =>
  c.status === 'shared' && c.neededBy != null && dayOf(new Date(c.neededBy)) - today <= NEAR_DAYS
/** The Waiting on client line: "Paint colours awaits a choice — needed by Mon 19 Oct" · "… — was needed by Mon 19 Oct". */
export function choiceWaitLine(c: { title: string; neededBy: number | null }, today: number): string {
  if (!c.neededBy) return `${c.title} awaits a choice`
  return dayOf(new Date(c.neededBy)) < today ? `${c.title} awaits a choice — was needed by ${neededDay(c.neededBy)}` : `${c.title} awaits a choice — needed by ${neededDay(c.neededBy)}`
}

/* ── the tab's groups ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ChoiceGroup = { key: string; label: string; list: ChoiceView[] }
/** Grouped by room (A–Z, "No room set" last) or by milestone (the schedule's order, "No milestone" last); each group's choices waiting
    on the client first, then drafts, then chosen ones — newest first within each. */
export function groupChoices(list: ChoiceView[], by: ChoiceGroupBy): ChoiceGroup[] {
  const rank: Record<ChoiceStatus, number> = { declined: 0, shared: 1, draft: 2, chosen: 3 }   // (gaps build D, item 2) a no waits on the studio first
  const sorted = [...list].sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt - a.createdAt)
  const map = new Map<string, ChoiceGroup & { order: number }>()
  for (const c of sorted) {
    const key = by === 'room' ? (c.room?.trim().toLowerCase() || '') : c.milestone?.id ?? ''
    const label = by === 'room' ? (c.room?.trim() || 'No room set') : c.milestone?.title ?? 'No milestone'
    const order = by === 'room' ? 0 : c.milestone ? c.milestone.position : Number.MAX_SAFE_INTEGER
    const g = map.get(key)
    if (g) g.list.push(c); else map.set(key, { key: key || '—', label, list: [c], order })
  }
  return [...map.values()].sort((a, b) => (a.key === '—' ? 1 : b.key === '—' ? -1 : a.order - b.order || a.label.localeCompare(b.label))).map(({ key, label, list: l }) => ({ key, label, list: l }))
}

/** What the search box looks in. */
export const choiceSearchFields = (c: ChoiceView) => [c.title, c.room ?? '', c.note ?? '', c.milestone?.title ?? '', ...c.options.map((o) => o.name), ...c.options.map((o) => o.vendor ?? ''), c.chosen?.note ?? '', c.answer?.note ?? '', c.studioNote ?? '']

/* ── (fix-C, C-02) a pick's variation order follows the pick ──────────────────────────────────────────────────────────────── */

/**
 * A pick that moves keeps its variation order in step (money's own order, drafted by `draftVariationFromPick`): while the order is a **Draft**
 * its one line is rewritten to the new pick — or the order is deleted when the new pick changes nothing on the price; once it has left Draft
 * (with an approver, with the client, approved) the pick holds and the refusal says why. Money's rules stay as they are: nothing here sends,
 * approves or re-sizes anything.
 */
export function voPickBlock(vo: { number: string; status: string } | null | undefined, clientFirst: string): string | null {
  if (!vo || vo.status === 'Draft') return null
  if (vo.status === 'Confirmed' || vo.status === 'Signed') return `${clientFirst} approved ${vo.number} — the pick stays as they approved it`
  if (vo.status === 'Sent to Client') return `${vo.number} is with ${clientFirst} — move it back to Draft to change the pick`
  return `${vo.number} is waiting for approval — move it back to Draft to change the pick`
}
/** What happens to a Draft variation order when the pick changes, in the Change the pick dialog's words (null = no order). */
export function voPickLine(vo: { number: string; status: string } | null | undefined, carries: string | null, nextPrice: number | null): string | null {
  if (!vo || vo.status !== 'Draft') return null
  return normPrice(nextPrice) == null
    ? `${vo.number} (Draft) carries ${carries ?? 'the pick'} — it is deleted: this pick changes nothing on the price.`
    : `${vo.number} (Draft) carries ${carries ?? 'the pick'} — its line follows the new pick.`
}
/** A changed pick's way back (the snackbar's Undo): the pick as it was, its variation order's line or the order itself, the wait it ended. */
export type PickUndo = {
  before: { status: ChoiceStatus; optionId: string | null; by: string | null; memberId: string | null; at: number | null; note: string | null }
  eventId: string
  vo: { quoteId: string; deleted: boolean; title: string; amountMinor: number; line: { id: string; name: string; description: string | null; qty: number; costMinor: number } | null } | null
  wait: { milestoneId: string; note: string | null; since: number | null; until: number | null } | null
}
/** (fix-C, C-04) A wait on the client that a choice answers: the milestone's wait note names the choice (either way round), or names nothing. */
export const waitNamesChoice = (note: string | null | undefined, title: string) => {
  const n = (note ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const t = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return !n || n.includes(t) || t.includes(n)
}

/* ── (simplify S-21, her "build everything" 2026-10-09) sharing a choice starts its milestone's wait ─────────────────────────────── */

/** The wait note a share writes — the choice's name (the panel's "What for" field holds 80). */
export const SHARE_WAIT_NOTE_MAX = 80
/** How far apart the share and the wait's start may be and still be one act (both are stored to the second). */
const SAME_ACT_MS = 2_000
/**
 * The milestone's wait was started by sharing this choice: it waits on the client, its note is the choice's name, and it began with the share
 * (the same second). A wait the studio set by hand before sharing is never one — the share leaves it, the pick still ends it (`endWaitForPick`).
 */
export function waitSetByShare(m: { waitingOn: string | null; waitingNote: string | null; waitingSince: number | null }, c: { title: string; sharedAt: number | null }): boolean {
  if (m.waitingOn !== 'client' || !m.waitingNote?.trim() || m.waitingSince === null || c.sharedAt === null) return false
  return waitNamesChoice(m.waitingNote, c.title) && Math.abs(m.waitingSince - c.sharedAt) <= SAME_ACT_MS
}
/** The milestone panel's line under its wait: "Set by sharing Paint colours". (invented copy) */
export const shareWaitLine = (choice: string) => `Set by sharing ${choice}`

/* ── the sources' rows, as the Add an option dialog lists them ─────────────────────────────────────────────────────────────── */

export type SourceItem = {
  key: string
  name: string
  /** A second line — the category, the vendor and price, the room and version. */
  line: string | null
  src: string | null
  hex: string | null
  /** A Price book item's own price per unit — shown as help beside the price field ("S$1,950 per Lot in the Price book"). */
  bookPrice: string | null
  /** The render picker's group: the client's own design, or one of the studio's. */
  group?: string
  /** (gaps build D, item 11) a Price book item's vendor — the option takes it */
  vendor?: string | null
}
export type ChoiceSources = { material: SourceItem[]; price_book: SourceItem[]; render: SourceItem[] }
