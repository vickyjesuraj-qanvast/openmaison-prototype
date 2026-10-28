/*
 * (the Dashboard redesigned, 2026-10-26 — his marks P-04 · P-05 · Q-05 · Q-11 · lane D2) **Needs you, one ranked inbox**: every module's waiting
 * work in one list — approvals, clients waiting, late and ours, money to move, new leads — each row with its verb on it, acting in place with
 * Undo through the module's own action, Review opening the record in a pane (P-05), Not today setting a row aside until tomorrow (Q-05), a
 * ring for what the records say this member finished today, and *You're all caught up* when nothing is left (Q-11). Pure and client-safe;
 * the rows are read by lib/dashboard/inbox-queries.ts, drawn by components/dashboard/inbox/*. The contract: brief.md § 5 D2.
 *
 * His note on the review page (2026-10-26): "the CTAs are too much to the eyes because of primary color" — a row's verbs are the house's quiet
 * buttons (the first outlined, a second as text), at most two on a row, the rest in its ⋮; the Review pane is the one place a filled button
 * may sit, because that is where the decision is made.
 *
 * INVENTED COPY (staged as REG-D2.*): every row's words below and in inbox-queries.ts that the module did not already say — the chips'
 * names (the brief's), "Not today", "n set aside for today", "You're all caught up", "Next: …".
 *
 * (the Dashboard's calm pass, 2026-10-26 — his "too busy … simplify" and the Claude Design option, lane C2) Needs you as the option draws it:
 * text tabs at the head's right (All · Approve n · Clients n · Late n), five rows of ONE title line and ONE short caption (where · who · when,
 * `fitCaption` — the long sentence stays in the Review pane or on the record), the amount, ONE outlined verb, the rest in the row's ⋮;
 * "Show all n"; no cleared ring (the head's count already says what waits). Staged as REG-C2.*.
 */

/** (the calm pass 2026-10-26) The inbox's tabs: All · Approve · Clients · Late — a tab shows only with rows under it. Money and New leads
    are no longer their own tabs (the option draws four; their rows stay in All, in their ranked place). */
export type InboxChip = 'all' | 'ok' | 'client' | 'late'
/** A row's place: an approval (Your OK), a client's thread, money to move, a new lead to own, late work of ours — or the rest of the work. */
export type InboxGroup = 'ok' | 'client' | 'late' | 'money' | 'leads' | 'work'

/**
 * What a verb does when pressed, in place — each through the module's own server action, its own sentence and its own Undo (the project
 * Overview's `useNeedActions` is the reference for the approvals; Finance › To do's for the money). The client never computes anything here:
 * every word the snackbar says rides in from the server.
 */
export type InboxRun =
  | { kind: 'approve-update'; ref: string; done: string }
  | { kind: 'approve-done'; ref: string; title: string }
  | { kind: 'approve-more-time'; ref: string }
  | { kind: 'approve-expense'; ref: string }
  | { kind: 'approve-bill'; ref: string; title: string }
  | { kind: 'approve-quote'; ref: string; done: string }
  | { kind: 'approve-price-book'; ref: string; done: string }
  | { kind: 'confirm-payment'; ref: string; done: string }
  /** a sent invoice's reminder — Money records it (`remindInvoice`) once WhatsApp has opened */
  | { kind: 'remind-invoice'; ref: string; done: string }
  /** a contract's — the signing link's window opens again from now and the reminder is on the lead's Activity (`renewSigningLink`) */
  | { kind: 'remind-contract'; ref: string; done: string }
  /** a quote's — the Quotes module records no reminder ("nothing is recorded — there is no reminder record for quotes", REG-2541), so the Dashboard keeps its own note that
      it was sent (`dashboard_snoozes`, a `reminded:` key) and the row rests until tomorrow */
  | { kind: 'remind-quote'; quoteId: string; done: string }
  | { kind: 'retry-xero'; items: { kind: string; id: string }[] }
  /** an AI credits ask for a member's monthly amount: Company › Plan's own Raise to (`setMonthlyAmount`, Undo to the amount before) */
  | { kind: 'raise-credits'; memberId: string; amount: number; previous: number | null; done: string }
  /** the Owner's top-up — the house checkout (`openTopUp`) */
  | { kind: 'top-up' }

/** A verb's press: a door (an address with the way back), a call or a WhatsApp opening on the press, the Review pane, or a run in place. */
export type InboxDo =
  | { kind: 'href'; href: string }
  /** `tel:` — on return the snackbar offers *Log the call* (the house log sheet) when it is a lead's */
  | { kind: 'call'; href: string; leadId?: string; first?: string }
  /** `wa.me` opening on the press (REG-534) with the module's own draft — `{link}` in it is the record's client link, made whole with the
      browser's address at the press — then `run` records it where the module records one; a lead's offers *Log it* on return */
  | { kind: 'whatsapp'; phone: string; text: string; link?: string; run?: InboxRun; leadId?: string; first?: string }
  | { kind: 'review' }
  | { kind: 'run'; run: InboxRun }

export type InboxVerb = { label: string; icon?: string; do: InboxDo; testId?: string }

/** The way back from an approval, answered in the pane: the tab's own dialog (a note) — or Money's own step behind a door. */
export type InboxBack =
  | { kind: 'update' | 'done' | 'more-time'; ref: string; title: string; who: string | null; end?: number; client: string; label: string }
  | { kind: 'expense' | 'quote' | 'price-book'; ref: string; label: string; who: string | null; title: string }
  | { kind: 'href'; href: string; label: string }

/** What the Review pane opens (P-05): the record's facts and pictures, and its two answers (the approval · send back / decline). */
export type InboxReview = {
  /** The pane's head: what it is and whose ("Site update · Benjamin Han"). */
  title: string
  icon: string
  /** The record's own title in the body, and who / when under it. */
  heading: string
  byline?: string
  /** The record's words, as plain text (an update's body, a reason for more time, a client's note). */
  body?: string
  photos?: { src: string; alt: string }[]
  facts: { label: string; value: string }[]
  /** The pane's one filled button — an in-place run, or a door when the approval sends something (a PO to its vendor, an invoice). */
  approve: { label: string; run?: InboxRun; href?: string } | null
  back: InboxBack | null
  /** Its home, for the head's ↗. */
  open: string
}

export type InboxRow = {
  /** Stable across loads — the list's React key, `data-inbox-row` (a Since chip scrolls to it), the keyboard's row id. */
  key: string
  kind: string
  group: InboxGroup
  /** An approval waiting on this member — "Your OK". */
  ok: boolean
  icon: string
  title: string
  caption?: string
  /** The money the row is about, as the record card writes it (moneyCard). */
  amountMinor?: number
  /** Red only for what is past its day and ours (S-05). */
  tone: 'late' | 'approve' | 'neutral'
  /** The words' door — the place it lives, with the way back. */
  open: string
  /** One or two verbs, the first the row's own (↵ presses it) — his note 2026-10-26: quiet buttons, never filled. */
  verbs: InboxVerb[]
  /** The ⋮'s own steps beyond Open · Not today · Ask about this (Send back…, Record a payment …). */
  menu: InboxVerb[]
  /** Small pictures beside the caption (a site update's photos). */
  thumbs?: string[]
  review?: InboxReview
  /** Not today's key — the row and a word of what it says, so a row that changes comes back at once (Q-05). null = it can't wait: late and
      ours, or an approval past its day. */
  snoozeKey: string | null
  /** Why it can't be set aside, when it can't (the ⋮'s help line). */
  stays?: string
  rank: number
  /** How the greeting names it when it is the first. */
  phrase?: string
  /** What the row is about — a lead or a project (Ask about this, the Since chips). */
  about?: { leadId?: string; projectId?: string }
  /** (the calm UI build 2026-10-27 — the audit's 1-01) A project's roll-up row: how many of its standing to-dos it stands for (each one in its
      ⋮, all of them on the project's own Needs your attention). */
  folded?: number
  /** …and the keys of the rows it stands for (its `data-folded-keys`) */
  foldedKeys?: string[]
}

export type InboxData = {
  /** What waits now, ranked (Your OK first, then Q-03's places). */
  rows: InboxRow[]
  /** Set aside for today (Not today) — shown under "n set aside for today · Show". Optional so a part's fallback may leave it out (the page's
      own fallback, lib/dashboard/queries.ts — `EMPTY_INBOX` is the whole empty value). */
  set?: InboxRow[]
  /** What the records say this member finished today — tasks done, approvals given, payments confirmed, reminders sent, leads contacted. */
  cleared: number
  groups: { key: InboxChip; label: string; count: number }[]
  /** How many are set aside for today. */
  snoozed: number
}

export const EMPTY_INBOX: InboxData = { rows: [], set: [], cleared: 0, groups: [{ key: 'all', label: 'All', count: 0 }], snoozed: 0 }

/** Rows at a desk before "Show all n", and on a phone — (the calm pass 2026-10-26) five at a desk, as the option draws them (was six); four
    on a phone. */
export const INBOX_SHOWN = 5
export const INBOX_SHOWN_PHONE = 4
/** (the calm UI build 2026-10-27 — the audit's 1-01) The tabs show only on a list long enough to need them: eight rows or more. */
export const INBOX_TABS_FROM = 8

/** The tabs' words and order — (the calm pass 2026-10-26) the option's four, in the house words; (the calm UI build 2026-10-27 — the audit's
    T-01 · 1-01 · 1-02, one vocabulary) **Approvals** (was "To approve" — the group's one name everywhere), **Clients waiting** (was "Clients":
    it holds the follow-ups and reminders too, not only replies — his correction 3), **Overdue** (was "Late" — the house word for past its day).
    The keys (`ok` · `client` · `late`) stay. */
export const CHIP_LABEL: Record<InboxChip, string> = { all: 'All', ok: 'Approvals', client: 'Clients waiting', late: 'Overdue' }
const CHIP_ORDER: InboxChip[] = ['all', 'ok', 'client', 'late']

/* ── a row's caption: one short line (the calm pass 2026-10-26) ───────────────────────────────────────────────────────────────────────── */

/** How long a caption may be — "where · who · when, ≤ ~60 characters" (brief-calm § 1). */
export const CAPTION_MAX = 60
/**
 * A caption that fits one short line: the parts in their order (where · who · when …), the first always, each next one only while the line
 * stays within `max` — so a row says its place and its people and leaves the long sentence to its Review pane or its record. Empty parts are
 * skipped.
 */
export function fitCaption(parts: readonly (string | null | undefined | false)[], max = CAPTION_MAX): string {
  let out = ''
  for (const p of parts) {
    const s = typeof p === 'string' ? p.replace(/\s+/g, ' ').trim() : ''
    if (!s) continue
    if (!out) { out = s; continue }
    if (out.length + 3 + s.length > max) break
    out = `${out} · ${s}`
  }
  return out
}
/**
 * The facts in a module's sentence, without its explanation: the words before an em dash (what follows it explains — "… — Benjamin sees it
 * once you approve"), each " · " part, the quotations left out (a client's or a vendor's own words belong to the record's pane).
 */
export function factsOf(sentence: string | null | undefined): string[] {
  const head = (sentence ?? '').split(' — ')[0] ?? ''
  return head.split(' · ').map((s) => s.trim()).filter((s) => s && !/^[“"]/.test(s))
}
/** The client in a project's name ("HDB 5-Room — Benjamin Han" → "Benjamin Han") — a caption's "where" (the option's). */
export const clientOfProject = (name: string | null | undefined) => (name ?? '').split(' — ').pop()?.trim() || (name ?? '')

/** Whether a row sits under a chip: Late is every red row (a late ticket is a client's and late); the others are the row's place. */
export function inChip(r: Pick<InboxRow, 'group' | 'ok' | 'tone'>, chip: InboxChip): boolean {
  if (chip === 'all') return true
  if (chip === 'ok') return r.ok
  if (chip === 'late') return r.tone === 'late'
  return r.group === chip
}
/** The chips this list shows — All, then only those with rows (his P-04). */
export function chipsOf(rows: Pick<InboxRow, 'group' | 'ok' | 'tone'>[]): InboxData['groups'] {
  return CHIP_ORDER.map((key) => ({ key, label: CHIP_LABEL[key], count: rows.filter((r) => inChip(r, key)).length })).filter((g) => g.key === 'all' || g.count > 0)
}

/** Needs you's order: Your OK first, then Q-03's places (the rank); inside a place, what is late first, then as its producer listed it. */
export function orderInbox<T extends Pick<InboxRow, 'ok' | 'rank' | 'tone'>>(rows: T[]): T[] {
  const toneRank = (r: T) => (r.tone === 'late' ? 0 : 1)
  return rows.map((r, i) => ({ r, i })).sort((a, b) => Number(b.r.ok) - Number(a.r.ok) || a.r.rank - b.r.rank || toneRank(a.r) - toneRank(b.r) || a.i - b.i).map(({ r }) => r)
}

/** Q-03's places on one scale: a hold's Resume and Start right after the approvals, then money, Complete handover, the client waiting on us,
    the new leads to call, late work, telling the client, the Dashboard's studio signals, set-up leftovers, compliance, the studio's set-up. */
export const RANK = { ok: 1, stage: 1.5, money: 2, handover: 3, client: 4, leads: 4.5, mine: 4.7, late: 5, tell: 6, studio: 6.5, setup: 7, compliance: 8, studioSetup: 9 } as const
/** A project's Needs you row's place (lib/projects/needs-you.ts `rankOf`) on this scale. */
export function rankOfNeedGroup(group: string, kind: string): number {
  if (group === 'stage') return kind === 'handover' ? RANK.handover : RANK.stage
  return ({ ok: RANK.ok, money: RANK.money, client: RANK.client, late: RANK.late, tell: RANK.tell, setup: RANK.setup } as Record<string, number>)[group] ?? RANK.setup
}

/**
 * The rows' keys, by what they are about — the one way to name a row (a Since chip about something that also waits here carries the key and
 * scrolls to it: components/dashboard/inbox/needs-inbox.tsx `revealInboxRow`). A project's row is its Needs you row's own key
 * (lib/projects/needs-you.ts — `message`, `ticket:<id>`, `money:confirm:<paymentId>`, `review-update:<id>` …) under its project.
 */
export const INBOX_KEY = {
  project: (projectId: string, needKey: string) => `project:${projectId}:${needKey}`,
  quoteWait: (quoteId: string) => `quote-wait:${quoteId}`,
  quoteChange: (quoteId: string) => `quote-change:${quoteId}`,
  quoteConfirmed: (quoteId: string) => `quote-confirmed:${quoteId}`,
  quoteBack: (quoteId: string) => `quote-back:${quoteId}`,
  quoteApprove: (quoteId: string) => `quote-approve:${quoteId}`,
  contractWait: (contractId: string) => `contract-wait:${contractId}`,
  leadCall: (leadId: string) => `lead-call:${leadId}`,
  priceBook: (itemId: string) => `price-book:${itemId}`,
  creditsAsk: (askId: string) => `credits-ask:${askId}`,
  todo: (todoKey: string) => `todo:${todoKey}`,
  meeting: (meetingId: string) => `meeting:${meetingId}`,
} as const

/**
 * (the calm UI build 2026-10-27 — the audit's 1-03 · 1-20: one home for approvals) Every record id a row is about: its key, the records its
 * runs and its pane answer (`ref`), the `open=` of its doors. The bell's approval rows open the Dashboard's Review pane on the row about that
 * record (`/dashboard?review=<id>`); a share ask or a handover is named by its project's row key (`reviewKeyOf`).
 */
export function rowRefs(r: Pick<InboxRow, 'key' | 'verbs' | 'menu' | 'review' | 'open'>): string[] {
  const out = new Set<string>([r.key])
  const take = (d: InboxDo | undefined) => {
    if (!d) return
    if (d.kind === 'run' && 'ref' in d.run && d.run.ref) out.add(d.run.ref)
    if (d.kind === 'run' && d.run.kind === 'remind-quote') out.add(d.run.quoteId)
    if (d.kind === 'whatsapp' && d.run && 'ref' in d.run && d.run.ref) out.add(d.run.ref)
    if (d.kind === 'href') { const m = /[?&]open=([^&#]+)/.exec(d.href); if (m) out.add(decodeURIComponent(m[1]!)) }
  }
  for (const v of [...r.verbs, ...r.menu]) take(v.do)
  const run = r.review?.approve?.run
  if (run && 'ref' in run && run.ref) out.add(run.ref)
  const back = r.review?.back
  if (back && 'ref' in back && back.ref) out.add(back.ref)
  const m = /[?&]open=([^&#]+)/.exec(r.open)
  if (m) out.add(decodeURIComponent(m[1]!))
  return [...out]
}
/** The row about a record (`rowRefs`), or null. */
export function findInboxRow<T extends Pick<InboxRow, 'key' | 'verbs' | 'menu' | 'review' | 'open'>>(rows: T[], ref: string): T | null {
  return rows.find((r) => r.key === ref) ?? rows.find((r) => rowRefs(r).includes(ref)) ?? null
}
/** The Needs you key or record id a bell approval opens: a share ask and a handover are their project's rows; every other ask its record's id. */
export function reviewKeyOf(a: { kind: string; id: string; projectId: string | null }): string {
  if (a.kind === 'share' && a.projectId) return INBOX_KEY.project(a.projectId, 'share-ask')
  if (a.kind === 'handover' && a.projectId) return INBOX_KEY.project(a.projectId, 'review-handover')
  return a.id
}

/**
 * (the calm UI build 2026-10-27 — the audit's 1-01, T-14 · T-04) **Decisions here, a project's own to-dos on the project.** The Dashboard keeps
 * what is a decision or someone waiting on the studio — the approvals, a client waiting, money to move, a new lead to call, what is overdue and
 * ours, the studio's own signals — and folds a project's standing to-dos (its set-up steps, Start the project, a schedule to share, a week's
 * update to write, a contractor to book, its compliance items) into ONE row for that project: its name, "n things to do", each to-do one press
 * away in the row's ⋮, all of them on the project's own Needs your attention. A project with one such to-do keeps it as its own row.
 * `standing` names a project's to-do (the producer's mark); `name` the project's name.
 */
export const FOLD_MENU_MAX = 6
export function foldStanding(rows: InboxRow[], standing: (r: InboxRow) => boolean, name: (projectId: string) => { name: string; href: string; leadId?: string } | null): InboxRow[] {
  const byProject = new Map<string, InboxRow[]>()
  for (const r of rows) {
    const pid = r.about?.projectId
    if (!pid || !standing(r)) continue
    byProject.set(pid, [...(byProject.get(pid) ?? []), r])
  }
  const folded = new Set<string>()
  const ups: InboxRow[] = []
  for (const [pid, list] of byProject) {
    const p = name(pid)
    if (!p || list.length < 2) continue
    for (const r of list) folded.add(r.key)
    const key = INBOX_KEY.project(pid, 'to-do')
    const items: InboxVerb[] = list.slice(0, FOLD_MENU_MAX).map((r) => ({ label: r.title, do: r.verbs[0]?.do ?? { kind: 'href', href: r.open } }))
    ups.push({
      key, kind: 'project-to-do', group: 'work', ok: false, icon: 'business_center', title: p.name,
      caption: fitCaption([`${list.length} things to do`, list[0]!.title]), tone: 'neutral', open: p.href,
      verbs: [{ label: 'Open', do: { kind: 'href', href: p.href } }], menu: items,
      snoozeKey: snoozeKeyOf(key, list.length, list.map((r) => r.key).join(',')), rank: Math.min(...list.map((r) => r.rank)),
      about: { projectId: pid, ...(p.leadId ? { leadId: p.leadId } : {}) }, phrase: `${list.length} things to do on ${p.name}`, folded: list.length, foldedKeys: list.map((r) => r.key),
    })
  }
  return [...rows.filter((r) => !folded.has(r.key)), ...ups]
}

/** A short, stable word of a text — Not today's key carries it so a row that says something new comes back (Q-05). */
export function wordOf(...parts: (string | number | null | undefined)[]): string {
  const s = parts.filter((p) => p !== null && p !== undefined && p !== '').join('|')
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}
/** Not today's key for a row: its key and the word of what it says. */
export const snoozeKeyOf = (key: string, ...about: (string | number | null | undefined)[]) => `${key}#${wordOf(...about)}`

/** Why a row can't wait for tomorrow (Q-05: "approvals past their day and ours can't be set aside"). */
export const STAYS_LATE = 'Past its day and ours — it can’t wait for tomorrow'

/** The studio's day (Singapore, no daylight saving): its number, and the moment it began — Not today's "tomorrow" and the ring's "today". */
const SGT_MS = 8 * 3_600_000
const DAY_MS = 86_400_000
export const studioDay = (now: number) => Math.floor((now + SGT_MS) / DAY_MS)
export const studioDayStart = (now: number) => studioDay(now) * DAY_MS - SGT_MS

/* (the calm pass 2026-10-26) The cleared ring went — the head's count already says what waits (his correction 4). `InboxData.cleared` is still
   read by fetchInbox (the records' own count of what this member cleared today) and rides on the card as `data-cleared` for the probes. */

/** *You're all caught up*'s "Next" line, from the first coming item of Your day (D1 passes it). */
export type InboxNext = { title: string; time?: string; caption?: string; href?: string } | null
export function nextWords(next: InboxNext): string | null {
  if (!next) return null
  return `Next: ${[next.time, next.title].filter(Boolean).join(' · ')}`
}
