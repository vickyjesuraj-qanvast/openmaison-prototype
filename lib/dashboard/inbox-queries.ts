import 'server-only'
import { and, eq, gt, gte, inArray, isNotNull, isNull, like, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contracts, creditRequests, dashboardSnoozes, leadEvents, leadFiles, leadNotes, leads, members, priceBookItems, projectMilestoneExtensions,
  projectUpdateFiles, projectUpdates, quotes, studioMemberCreditCaps,
} from '@/lib/db/schema'
import { calendarDaysBetween, dayWords, displayDate, moneyCard } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { htmlToPlain } from '@/lib/quotes/items-model'
import { dayLabel, plural } from '@/lib/projects/schedule-model'
import { holdSplit } from '@/lib/projects/needs-you'
import type { ProjectDetail } from '@/lib/projects/queries'
import { projectHref } from '@/lib/projects/tabs'
import { needIcon } from '@/lib/projects/need-icon'
import { reminderMessage as invoiceReminder } from '@/lib/projects/payments-model'
import { CALL_AFTER_REMINDERS } from '@/lib/projects/invoices-kinds'
import { complianceCountsOf } from '@/lib/compliance/queries'
import { phaseLabel, phaseOfStage } from '@/lib/compliance/model'
import { isOverdueLead, isUnassignedLead, isUntouchedLead } from '@/lib/leads/filters'   // (lane D5) the one rule for each
import { sightOf } from '@/lib/quotes/cost-sight'
import { reminderMessage as quoteReminder } from '@/lib/quotes/next-step'
import { confirmPath } from '@/lib/quotes/confirm'
import { REMIND_QUIET_DAYS } from '@/lib/maison-ai/remind'   // (closing pass) one rule for a reminded client: the dock's and this row's
import { sentToClientDates } from '@/lib/quotes/sent-to-client'
import { waitingOnClient, validPassed } from '@/lib/leads/quote-filters'
import { awaitingLine, contractLink, firstName as contractFirst, reminderMessage as contractReminder } from '@/lib/contracts/model'
import { fetchStudioSetup } from '@/lib/studio-setup/queries'
import { SETUP_HREF } from '@/lib/studio-setup/model'
import { todoInputOf, todoRows, type TodoRow } from '@/lib/finance/todo'
import { fetchFinanceTodo } from '@/lib/finance/todo-server'
import { aimLabel, standingOf } from '@/lib/meetings/model'
import { fetchListingRead } from '@/lib/qanvast-listing/queries'
import { fetchNotificationRules } from '@/lib/notifications/queries'
import { fetchQuoteApproval, isApprover } from '@/lib/settings/queries'
import { runsLeads } from '@/lib/settings/roles'
import { runsBook } from '@/lib/company/price-book-rules'
import { ownerRole, trustedRole } from '@/lib/credits/policy'
import { fetchCreditSummary, fetchOpenAsks } from '@/lib/credits/queries'
import { fmtCredits, toneOf } from '@/lib/credits/model'
import { TOPUP_CREDITS } from '@/lib/credits/plans'
import { fetchBrand } from '@/lib/templates/queries'
import { withFrom } from '@/lib/nav'
import { DASHBOARD } from './model'
import type { DashCtx } from './context'
import {
  EMPTY_INBOX, INBOX_KEY, RANK, STAYS_LATE, chipsOf, clientOfProject, factsOf, fitCaption, foldStanding, orderInbox, rankOfNeedGroup, snoozeKeyOf, studioDay, studioDayStart,
  type InboxBack, type InboxData, type InboxGroup, type InboxReview, type InboxRow, type InboxVerb,
} from './inbox'

/*
 * (the Dashboard redesigned, 2026-10-26 — his marks P-04 · P-05 · Q-05 · lane D2) **Needs you, read through each module's own rules.** One
 * list, every row the record's own: every project's Needs you rows (lib/projects/needs-you.ts — all of them now, not only each project's
 * first), Finance › To do's own rows where no project row already says them (lib/finance/todo.ts), the approvals the rail counts — each quote,
 * each Price book proposal, each AI credits ask a row of its own —, the signals the page never had (B §18 ① ②): a quote the client opened
 * and hasn't answered, asked to change, or whose price ends within three days; a contract out for signature three days and unsigned; a new
 * lead nobody has contacted past the studio's untouched delay (the bell's own rule); AI credits running low (the credits summary's own
 * tone); Xero failing — and S22's rows (meetings to write up, compliance, the studio's set-up, Qanvast's ask). Scoped to what this member sees
 * (Who sees leads — every read starts from `ctx.seen` · the project details this member opens; `Viewer.costs` before a cost is said), each
 * door with `?from=/dashboard`. Mine (Q-07) keeps the approvals and the rows about the member's own leads and projects.
 *
 * Not today (Q-05) reads `dashboard_snoozes`; the ring reads what the records say this member finished today (`clearedToday`). Each producer
 * that can't be read is left out — never a failed page (the rail's rule).
 */

const DAY = 86_400_000
/** How long a quote or a contract may sit with the client before the Dashboard asks for a follow-up (the brief's three days). */
export const FOLLOW_UP_DAYS = 3
/** A quote's price ending within this many days is said before it ends (the brief's three). */
export const EXPIRING_DAYS = 3
/** "Opened ≥ 2 times" — the strongest follow-up cue (B §3). */
export const OPENED_TIMES = 2

/** An address with the way back to the Dashboard, its #fragment kept last (`withFrom` alone puts it after the hash). A call, or an address that
    already names its way back, is left as it is. */
export function dash(href: string): string {
  if (href.startsWith('tel:') || href.startsWith('https:') || /[?&]from=/.test(href)) return href
  const i = href.indexOf('#')
  return i < 0 ? withFrom(href, DASHBOARD) : `${withFrom(href.slice(0, i), DASHBOARD)}${href.slice(i)}`
}
/** "today" · "yesterday" · "4 days ago" — the house "n days" (never "(4d)"). */
const agoWords = (at: number, now: number) => { const d = calendarDaysBetween(at, now); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${dayWords(d)} ago` }
const first = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || (name ?? '')
const timesWord = (n: number) => (n === 2 ? 'twice' : `${n} times`)
const shortDay = (ms: number) => displayDate(new Date(ms)).replace(/ ’\d\d$/, '')
/** An approval's words open its record to read before answering — never the step its button runs (the Overview's `recordOf`). */
const recordOf = (href: string) => href.replace(/&(?:do=[^&#]*|send=1)/g, '')
const door = (label: string, href: string, testId?: string): InboxVerb => ({ label, do: href.startsWith('tel:') ? { kind: 'call', href } : { kind: 'href', href: dash(href) }, ...(testId ? { testId } : {}) })
const plainOf = (html: string | null | undefined, max = 600) => { const t = htmlToPlain(html ?? '').replace(/\s+\n/g, '\n').trim(); return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t }
const phoneOk = (p: string | null | undefined) => (p ?? '').replace(/\D/g, '').length >= 8
const telOf = (p: string) => `tel:+65${p.replace(/\D/g, '').slice(-8)}`

type Draft = Omit<InboxRow, 'menu' | 'group'> & { group: InboxGroup; menu?: InboxVerb[] }
const row = (d: Draft): InboxRow => ({ ...d, menu: d.menu ?? [] })

/* ── captions: ONE short line (the Dashboard's calm pass, 2026-10-26 — lane C2) ─────────────────────────────────────────────────────
   His "too busy … simplify" and the Claude Design option: a row's caption says where · who · when in one short line (`fitCaption`, ≤ 60
   characters); the module's long sentence stays where it is read in full — the Review pane's byline and facts, or the record itself. Only
   the captions changed here (titles, verbs, keys, ranks, Not today's keys are as they were). */

/** "from Germaine" — who sent it, by first name; left out when the title already names them ("Germaine’s claim — …"). */
const fromWho = (name: string | null | undefined, title?: string) =>
  (name && name !== 'The team' && !(title && first(name) && title.includes(first(name))) ? `from ${first(name)}` : null)
/** A module's short "when" in the house words: "2d ago" → "2 days ago", "3h ago" → "3 hours ago", "17 Oct ’26" → "17 Oct" (never "(2d)"). */
const plainWhen = (s: string | null | undefined): string | null => {
  const t = (s ?? '').trim()
  if (!t) return null
  const d = /^(\d+)d ago$/.exec(t); if (d) return `${dayWords(Number(d[1]))} ago`
  const h = /^(\d+)h ago$/.exec(t); if (h) return `${plural(Number(h[1]), 'hour')} ago`
  return t.replace(/ ’\d\d$/, '')
}
/** A client's or an approver's note, short and in quotes — the caption's last part, left out when the line is full (the record has it all). */
const quoted = (note: string | null | undefined, max = 36) => {
  const t = (note ?? '').replace(/\s+/g, ' ').trim()
  return t ? `“${t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t}”` : null
}
/** A project's Needs you row as one short line: the client (where), then who and when — read from the row's own words by kind, the rest
    by the generic rule (the sentence's facts before its explanation, `factsOf`). */
function needCaption(r: ProjectDetail['needs'][number], where: string, pane: PaneFacts, now: number): string {
  const meta = r.meta ?? ''
  switch (r.kind) {
    case 'review-update': {
      const u = r.ref ? pane.updates.get(r.ref) : undefined
      return fitCaption([where, fromWho(u?.author ?? r.ask?.who, r.title), u?.at ? agoWords(u.at, now) : null])
    }
    case 'approve-done': {
      const m = /^(.+?) marked it done(?: (.+?))?(?: — |$)/.exec(meta)
      return fitCaption([where, m ? fromWho(m[1], r.title) : fromWho(r.ask?.who, r.title), m?.[2]])
    }
    case 'approve-more-time': {
      /* (the calm UI build 2026-10-27 — the audit's 1-08) the ask is the row's title now ("Michelle asks for 1 more week on …"); the caption is
         where — and the ask's words only when the title couldn't say them */
      const m = /^(.+?) asks to end it .+?, (.+?) (later|earlier)$/.exec(meta)
      return fitCaption([where, m ? null : factsOf(meta)[0]])
    }
    case 'cost-po-approve':
    case 'money-approve': {
      /* "Germaine submitted it 17 Oct ’26 · leaves 23.8% against the quote" → "from Germaine · 17 Oct" (the margin left is the pane's byline) */
      const m = /^(.+?) submitted it (.+?)(?: · | — |$)/.exec(meta)
      return fitCaption([where, m ? fromWho(m[1], r.title) : null, plainWhen(m?.[2])])
    }
    case 'cost-expense-approve': {
      /* "Transport · 16 Oct · logged by Germaine" → "from Germaine · 16 Oct" */
      const m = /^(.+?) · (.+?) · logged by (.+)$/.exec(meta)
      return fitCaption([where, m ? fromWho(m[3], r.title) : null, m?.[2] ?? null])
    }
    case 'cost-bill-approve': {
      /* "Over the approval limit, on no PO · recorded by Priya Tan 2d ago — …" → "from Priya · 2 days ago" (why it waits: the pane) — (the calm UI
         build closing regression 2026-10-28) `ago` now spells it out ("1 day ago", "3 hours ago"), so both forms are read: the row kept who and when */
      const m = /recorded by (.+?) ((?:\d+ min|\d+ hours?|\d+ days?|\d+h|\d+d) ago|just now|\d{1,2} \w{3}(?: ’\d\d)?)(?: — |$)/.exec(meta)
      return fitCaption([where, m ? fromWho(m[1], r.title) : null, plainWhen(m?.[2])])
    }
    case 'mark': return fitCaption([where])   // "From {client}" says the where again
    default: return fitCaption([where, ...factsOf(meta).map((f) => plainWhen(f))])
  }
}

/* ── (the calm UI build 2026-10-27 — the audit's 1-08 · 1-32, T-09 plain words) the person and the thing first, numbers last ─────────────── */

/** "1 week" → "1 more week" · "3 days" → "3 more days". */
const moreOf = (amount: string) => amount.replace(/^(\d+)\s+(.+)$/, '$1 more $2')
/** A more-time ask as a sentence: "Michelle asks for 1 more week on Carpentry fabrication" (was "More time on Carpentry fabrication", with "Michelle
    asks for 1 week more" as its caption) — from the row's own words; its own title when they don't read. */
function moreTimeTitle(r: ProjectDetail['needs'][number]): string {
  const m = /^(.+?) asks to end it .+?, (.+?) (later|earlier)$/.exec(r.meta ?? '')
  const what = (r.ask?.title ?? r.title.replace(/^More time on /, '')).trim()
  if (!m || !what) return r.title
  return m[3] === 'later' ? `${first(m[1])} asks for ${moreOf(m[2]!)} on ${what}` : `${first(m[1])} asks to end ${what} ${m[2]} sooner`
}
/** An approval's byline in the pane: "From Germaine · 18 Oct · margin left on this work 23.8%" (was "Germaine submitted it 18 Oct ’26 · leaves
    23.8% against the quote"); anything else as the module wrote it. */
function approvalByline(meta: string | null | undefined): string | undefined {
  const t = (meta ?? '').trim()
  if (!t) return undefined
  /* (the calm UI build closing regression 2026-10-28) the module now writes "· margin left on this work: 23.8%" itself — both forms are read */
  const m = /^(.+?) submitted it (.+?)(?: · (?:leaves ([\d.]+%) against the quote|margin left on this work: ([\d.]+%)))?(?: — .*)?$/.exec(t)
  if (!m) return t
  const left = m[3] ?? m[4]
  return [`From ${first(m[1])}`, plainWhen(m[2]), left ? `margin left on this work ${left}` : null].filter(Boolean).join(' · ')
}
/** A purchase order's or an invoice's title on one line: "PO-2026-008 · Stone & Tile Masonry" (was "PO-2026-008 to Stone & Tile Masonry Pte Ltd"). */
const recordLine = (title: string) => title.replace(/ to /, ' · ').replace(/,? (?:Pte\.? Ltd\.?|Pte\.?|Ltd\.?)$/i, '').trim()

/* ── each project's Needs you, every row ─────────────────────────────────────────────────────────────────────────────────────────── */

/** What the projects' approval rows need for their pane that `fetchProjectDetail` doesn't carry: an update's words and pictures, a reason
    for more time. Read once for every project the page shows. */
type PaneFacts = {
  updates: Map<string, { body: string; photos: { src: string; alt: string }[]; author: string | null; at: number | null }>
  reasons: Map<string, string>
}
async function paneFacts(details: ProjectDetail[]): Promise<PaneFacts> {
  const ups = details.flatMap((d) => d.needs.filter((r) => r.kind === 'review-update' && r.ref).map((r) => r.ref!))
  const asks = details.flatMap((d) => d.needs.filter((r) => r.kind === 'approve-more-time' && r.ref).map((r) => r.ref!))
  const [u, f, x, people] = await Promise.all([
    ups.length ? db.select({ id: projectUpdates.id, body: projectUpdates.body, pending: projectUpdates.pending, submittedBy: projectUpdates.submittedBy, authorId: projectUpdates.authorId, submittedAt: projectUpdates.submittedAt })
      .from(projectUpdates).where(inArray(projectUpdates.id, ups)) : Promise.resolve([]),
    ups.length ? db.select({ updateId: projectUpdateFiles.updateId, id: leadFiles.id, name: leadFiles.name, kind: leadFiles.kind, thumb: leadFiles.thumb, position: projectUpdateFiles.position })
      .from(projectUpdateFiles).innerJoin(leadFiles, eq(leadFiles.id, projectUpdateFiles.fileId)).where(and(inArray(projectUpdateFiles.updateId, ups), isNull(leadFiles.deletedAt))) : Promise.resolve([]),
    asks.length ? db.select({ id: projectMilestoneExtensions.id, reason: projectMilestoneExtensions.reason }).from(projectMilestoneExtensions).where(inArray(projectMilestoneExtensions.id, asks)) : Promise.resolve([]),
    db.select({ id: members.id, name: members.name }).from(members),
  ])
  const nameOf = (id: string | null) => (id ? people.find((p) => p.id === id)?.name ?? null : null)
  const updates: PaneFacts['updates'] = new Map()
  for (const r of u) {
    const pending = (r.pending ?? null) as { body?: string | null } | null
    const photos = f.filter((x) => x.updateId === r.id && x.kind === 'image').sort((a, b) => a.position - b.position).map((x) => ({ src: x.thumb ?? `/files/thumb/${x.id}`, alt: x.name }))
    updates.set(r.id, { body: plainOf(pending?.body ?? r.body), photos, author: nameOf(r.submittedBy ?? r.authorId), at: r.submittedAt?.getTime() ?? null })
  }
  return { updates, reasons: new Map(x.map((r) => [r.id, r.reason])) }
}

/** The verbs a project's row offers here: the in-place approval and Review, the client's payment to confirm, a reminder on WhatsApp, or the
    row's own step as a door — at most two (his note), the rest in the ⋮. */
function projectRows(ctx: DashCtx, d: ProjectDetail, pane: PaneFacts, studio: string): InboxRow[] {
  const { kept } = holdSplit(d.needs, d.project.hold ?? null)   // what the hold pauses rests on the project's own card (Q-14)
  const base = projectHref(d.project.id)
  const client = first(d.lead.name)
  const portal = d.withClient.portal
  const reaches = portal.state === 'invited' || portal.state === 'opened'
  const phone = portal.phone || d.lead.phone
  const invoices = d.money?.summary.invoices ?? []
  const about = { projectId: d.project.id, leadId: d.lead.id }
  const out: InboxRow[] = []
  for (const r of kept) {
    const href = r.action.href ?? (r.action.run ? `${base}?run=${encodeURIComponent(r.action.run)}` : r.tab ? `${base}/${r.tab}` : base)
    const open = r.action.href && !r.action.href.startsWith('tel:') ? recordOf(r.action.href) : r.tab ? `${base}/${r.tab}` : base
    const group: InboxGroup = r.group === 'ok' ? 'ok' : r.group === 'money' ? 'money' : r.group === 'client' ? 'client' : r.tone === 'late' ? 'late' : 'work'
    const caption = needCaption(r, d.lead.name, pane, ctx.now)   // (the calm pass 2026-10-26) the client · who · when — r.meta stays the pane's byline
    const verbs: InboxVerb[] = []
    const menu: InboxVerb[] = []
    let review: InboxReview | undefined
    let stays: string | undefined = r.tone === 'late' ? STAYS_LATE : undefined
    const facts = [{ label: 'Project', value: d.project.name }]
    const backOf = (kind: 'update' | 'done' | 'more-time', label: string, end?: number): InboxBack => ({ kind, ref: r.ref!, title: r.ask?.title ?? r.title, who: r.ask?.who ?? null, client, label, ...(end !== undefined ? { end } : {}) })

    if (r.kind === 'review-update' && r.ref) {
      const u = pane.updates.get(r.ref)
      const change = !!r.ask?.change
      const done = change ? (reaches ? `Change approved — ${client} can see the new words` : 'Change approved') : reaches ? `Approved — ${client} can see ${r.title}` : 'Approved'   // the Overview's own sentence
      const run = { kind: 'approve-update' as const, ref: r.ref, done }
      verbs.push({ label: 'Approve', do: { kind: 'run', run }, testId: 'need-approve' }, { label: 'Review', do: { kind: 'review' }, testId: 'need-review' })   // (the calm UI build 2026-10-27 — the audit's 1-09: one verb for a yes, was "Publish")
      menu.push({ label: 'Send back', do: { kind: 'review' }, testId: 'need-send-back' })
      review = { title: `Site update · ${d.lead.name}`, icon: 'article', heading: (r.ask?.title ?? r.title).replace(/^“|”$/g, ''),
        byline: [u?.author ?? r.ask?.who ?? 'The team', u?.at ? agoWords(u.at, ctx.now) : null, u?.photos.length ? plural(u.photos.length, 'photo') : null].filter(Boolean).join(' · '),
        body: u?.body || undefined, photos: u?.photos ?? [],
        facts: [...facts, { label: `${client} sees it`, value: reaches ? (change ? 'The new words, once you approve' : 'Once you publish') : 'Once they are on the portal' }],
        approve: { label: change ? 'Approve the change' : reaches ? 'Approve and send' : 'Approve', run }, back: backOf('update', 'Send back'), open: dash(open) }   // (1-09) "Approve and send" only when the client then sees it (was "Publish to {client}")
    } else if (r.kind === 'approve-done' && r.ref) {
      const run = { kind: 'approve-done' as const, ref: r.ref, title: r.ask?.title ?? r.title.replace(/ — done$/, '') }
      verbs.push({ label: 'Approve', do: { kind: 'run', run }, testId: 'need-approve' }, { label: 'Review', do: { kind: 'review' }, testId: 'need-review' })
      menu.push({ label: 'Send back', do: { kind: 'review' }, testId: 'need-send-back' })
      review = { title: `Marked done · ${d.lead.name}`, icon: 'check_circle', heading: run.title, byline: r.meta, facts,
        approve: { label: 'Approve as done', run }, back: backOf('done', 'Send back'), open: dash(open) }
    } else if (r.kind === 'approve-more-time' && r.ref) {
      const end = r.ask?.end
      const toEnd = /end it (.+?)(?:,|$)/.exec(r.meta ?? '')?.[1]   // (the calm UI build closing regression 2026-10-28) "To end it Tue 3 Nov" (was "… asks to end it Tue 3 Nov, 1 week later")
      if (end !== undefined && end < ctx.today) stays = 'Its day has passed — answer it today'   // Q-05: an approval past its day can't wait
      const run = { kind: 'approve-more-time' as const, ref: r.ref }
      verbs.push({ label: 'Approve', do: { kind: 'run', run }, testId: 'need-approve' }, { label: 'Review', do: { kind: 'review' }, testId: 'need-review' })   // (1-09, W-019) was "Agree"
      menu.push({ label: 'Decline', do: { kind: 'review' }, testId: 'need-send-back' })
      review = { title: `More time · ${d.lead.name}`, icon: 'schedule', heading: moreTimeTitle(r), byline: r.ask?.who ? `${r.ask.who} asks` : undefined,
        body: pane.reasons.get(r.ref) || undefined,
        facts: [...facts, ...(end !== undefined ? [{ label: 'Ends now', value: dayLabel(end) }] : []), ...(toEnd ? [{ label: 'Asks to end', value: toEnd }] : [])],
        approve: { label: 'Approve', run }, back: backOf('more-time', 'Decline', end), open: dash(open) }
    } else if ((r.kind === 'cost-expense-approve' || r.kind === 'cost-bill-approve') && r.ref) {
      const bill = r.kind === 'cost-bill-approve'
      const run = bill ? { kind: 'approve-bill' as const, ref: r.ref, title: r.title } : { kind: 'approve-expense' as const, ref: r.ref }
      verbs.push({ label: 'Approve', do: { kind: 'run', run }, testId: 'need-approve' }, { label: 'Review', do: { kind: 'review' }, testId: 'need-review' })
      if (!bill) menu.push({ label: 'Send back', do: { kind: 'review' }, testId: 'need-send-back' })
      review = { title: `${bill ? 'Supplier bill' : 'Expense'} · ${d.lead.name}`, icon: 'receipt_long', heading: r.title, byline: r.meta,
        facts: [...facts, ...(r.amountMinor ? [{ label: 'Amount', value: money2(r.amountMinor) }] : [])],
        approve: { label: 'Approve', run }, back: bill ? null : { kind: 'expense', ref: r.ref, label: 'Send back', who: null, title: r.title }, open: dash(open) }
    } else if ((r.inline === 'approve-po' || r.inline === 'approve-invoice') && r.action.href) {
      /* it sends something (a PO to its vendor, an invoice to the client): Money's own send opens, its WhatsApp on the press (REG-534) */
      verbs.push({ label: 'Approve', do: { kind: 'review' }, testId: 'need-review' })   // (1-32) was "Review" — the row's verb opens the pane on its Approve
      if (r.secondary?.href) menu.push(door(r.secondary.label, r.secondary.href, 'need-send-back'))
      review = { title: recordLine(r.title), icon: r.inline === 'approve-po' ? 'receipt_long' : 'payments', heading: `${r.inline === 'approve-po' ? 'Purchase order' : 'Invoice'} · ${d.lead.name}`, byline: approvalByline(r.meta),
        facts: [...facts, ...(r.amountMinor ? [{ label: 'Amount', value: money2(r.amountMinor) }] : [])],
        approve: { label: r.action.label, href: dash(r.action.href) }, back: r.secondary?.href ? { kind: 'href', href: dash(r.secondary.href), label: r.secondary.label } : null, open: dash(open) }
    } else if (r.kind === 'money-confirm' && r.ref) {
      const p = r.amountMinor ?? 0
      verbs.push({ label: 'Confirm', do: { kind: 'run', run: { kind: 'confirm-payment', ref: r.ref, done: `Confirmed — ${money2(p)} from ${client}` } }, testId: 'need-confirm' })   // Finance › To do's own sentence
      if (r.secondary?.href) menu.push(door(r.secondary.label, r.secondary.href))
    } else if ((r.kind === 'money-overdue' || r.kind === 'money-due-today' || r.kind === 'money-trailing') && r.ref) {
      const i = invoices.find((x) => x.id === r.ref)
      const third = r.secondary?.href?.startsWith('tel:')
      if (third && r.secondary?.href) verbs.push({ label: r.secondary.label, icon: 'call', do: { kind: 'call', href: r.secondary.href } })
      if (i && phoneOk(phone)) {
        const owed = Math.max(0, i.amountMinor - i.paidMinor - i.toConfirmMinor)
        const text = invoiceReminder({ client: d.lead.name, studio: portal.studio || studio, stage: i.stageName, number: i.number ?? '', amount: money2(owed), due: i.dueAt ? displayDate(new Date(i.dueAt)) : '', url: reaches && portal.home ? '{link}' : null, late: i.dueAt !== null && ctx.now >= i.dueAt + DAY })
        const nth = (i.remindedCount ?? 0) + 1 === CALL_AFTER_REMINDERS && i.overdueMinor > 0
        const done = nth ? `Third reminder drafted on WhatsApp for ${client} — next, a call; Owners and Admins are told` : `Reminder drafted on WhatsApp for ${client} — it’s on the project’s Activity`   // Money's own sentence
        const remind: InboxVerb = { label: 'Remind', icon: 'whatsapp', do: { kind: 'whatsapp', phone, text, ...(reaches && portal.home ? { link: portal.home } : {}), run: { kind: 'remind-invoice', ref: i.id, done } }, testId: 'need-remind' }
        if (third) menu.push(remind); else verbs.push(remind)
      }
      const record = r.action.label === 'Record a payment' ? r.action : r.secondary?.label === 'Record a payment' ? r.secondary : null
      if (record?.href) (verbs.length < 2 ? verbs : menu).push(door('Record a payment', record.href))
      if (!verbs.length) verbs.push(door(r.action.label, href))
    } else {
      verbs.push(door(r.action.label, href, r.inline ? 'need-approve' : 'need-action'))
      if (r.secondary && (r.secondary.href || r.secondary.run)) {
        const h2 = r.secondary.href ?? `${base}?run=${encodeURIComponent(r.secondary.run!)}`
        if (r.kind !== 'hold') verbs.push(door(r.secondary.label, h2, 'need-secondary'))
      }
    }
    out.push(row({
      key: INBOX_KEY.project(d.project.id, r.key), kind: `need:${r.kind}`, group, ok: r.group === 'ok', icon: needIcon(r.kind, r.tab), title: r.kind === 'approve-more-time' ? moreTimeTitle(r) : r.title, caption,
      ...(r.amountMinor ? { amountMinor: r.amountMinor } : {}), tone: r.tone, open: dash(open), verbs: verbs.slice(0, 2), menu: [...verbs.slice(2), ...menu], ...(review ? { review } : {}),
      ...(r.kind === 'review-update' && r.ref && pane.updates.get(r.ref)?.photos.length ? { thumbs: pane.updates.get(r.ref)!.photos.slice(0, 3).map((p) => p.src) } : {}),
      snoozeKey: stays ? null : snoozeKeyOf(INBOX_KEY.project(d.project.id, r.key), r.title, r.amountMinor), ...(stays ? { stays } : {}),
      rank: rankOfNeedGroup(r.group, r.kind), about,
      phrase: r.kind === 'hold' ? `${d.project.name} is on hold` : r.kind === 'start' ? `start ${d.project.name}` : `${r.title} — ${d.project.name}`,
    }))
  }
  return out
}

/* ── Finance › To do's own rows, where no project row says them already ──────────────────────────────────────────────────────────── */

function todoInbox(ctx: DashCtx, list: TodoRow[], money: { projectId: string; client: string; phone: string; portalUrl: string | null; invoices: { id: string; label: string | null; stageName: string; amountMinor: number; paidMinor: number; toConfirmMinor: number; dueAt: number | null; remindedCount: number; overdueMinor: number }[] }[], studio: string, said: Set<string>): InboxRow[] {
  const out: InboxRow[] = []
  const todoHref = (ref: string) => `/company/finance?open=${encodeURIComponent(ref)}`
  const moneyHref = (r: TodoRow, extra = '') => `/projects/${r.projectId}/money?open=${encodeURIComponent(r.invoiceId ?? r.ref)}${extra}`
  const xero = list.filter((r) => r.kind === 'xero')
  for (const r of list) {
    if (r.group === 'waiting' || r.kind === 'xero') continue
    if (said.has(r.ref) || (r.invoiceId && said.has(r.invoiceId))) continue   // one fact, once: the project's own row says it
    if (r.group === 'pay' && !(r.late || r.dueWords === 'Today')) continue    // money to move today — the rest waits on To pay
    if (r.group === 'drafts' || r.group === 'claims') continue                // a member's drafts and claims wait on no one but them
    /* To do's own words, said once: money in names the invoice and what the client did; money out the vendor and its bill; the rest its record */
    const title = r.group === 'collect' ? (r.about ?? r.title) : r.group === 'pay' && r.about ? `${r.title} · ${r.about}` : r.title
    /* (the calm pass 2026-10-26) one short line: the client (or what it is, with no project) · who asked · when — what to know is the pane's */
    const where = r.project !== '--' ? (money.find((x) => x.projectId === r.projectId)?.client ?? clientOfProject(r.project)) : r.sub
    const caption = fitCaption([where, r.group === 'approve' ? fromWho(r.asker, title) : null, plainWhen(r.dueWords ?? r.when) ?? (r.askedAt ? agoWords(r.askedAt, ctx.now) : null),
      r.group === 'collect' && r.project !== '--' ? r.sub : null, factsOf(r.know)[0]])
    const base: Omit<Draft, 'verbs'> = {
      key: INBOX_KEY.todo(r.key), kind: `todo:${r.kind}`, group: r.group === 'approve' ? 'ok' : r.group === 'stuck' || r.group === 'sent_back' || r.group === 'answered' ? 'work' : 'money',
      ok: r.group === 'approve', icon: r.kind === 'confirm' || r.kind === 'check' || r.kind === 'remind' || r.kind === 'send' || r.kind === 'invoice' ? 'payments' : r.kind === 'ask' || r.kind === 'commission' ? 'payments' : 'receipt_long',
      title, caption, ...(r.amountMinor ? { amountMinor: r.amountMinor } : {}),
      tone: r.late ? 'late' : r.group === 'approve' ? 'approve' : 'neutral', open: dash(r.projectId && (r.invoiceId || r.kind === 'invoice') ? moneyHref(r) : todoHref(r.ref)),
      snoozeKey: r.late ? null : snoozeKeyOf(INBOX_KEY.todo(r.key), r.title, r.amountMinor), ...(r.late ? { stays: STAYS_LATE } : {}),
      rank: r.group === 'approve' ? RANK.ok : r.group === 'stuck' || r.group === 'sent_back' || r.group === 'answered' ? RANK.late : RANK.money,
      ...(r.projectId ? { about: { projectId: r.projectId } } : {}), phrase: r.title,
    }
    let verbs: InboxVerb[] = []
    const menu: InboxVerb[] = []
    let review: InboxReview | undefined
    if (r.kind === 'confirm' || r.kind === 'check') {
      const m = money.find((x) => x.projectId === r.projectId)
      verbs = [{ label: r.kind === 'check' ? 'Check' : 'Confirm', do: { kind: 'run', run: { kind: 'confirm-payment', ref: r.ref, done: `Confirmed — ${money2(r.amountMinor ?? 0)} from ${first(m?.client ?? 'the client')}` } }, testId: 'need-confirm' }]
      menu.push(door('Open on the project’s Payments', moneyHref(r)))   // (T-01) the project's Money tab reads Payments
    } else if (r.kind === 'remind') {
      const m = money.find((x) => x.projectId === r.projectId), v = m?.invoices.find((x) => x.id === r.invoiceId)
      if (m && v && phoneOk(m.phone)) {
        const owed = Math.max(0, v.amountMinor - v.paidMinor - v.toConfirmMinor)
        const text = invoiceReminder({ client: m.client, studio, stage: v.stageName, number: v.label ?? '', amount: money2(owed), due: v.dueAt ? displayDate(new Date(v.dueAt)) : '', url: m.portalUrl ? '{link}' : null, late: v.dueAt !== null && ctx.now >= v.dueAt + DAY })
        verbs = [{ label: 'Remind', icon: 'whatsapp', do: { kind: 'whatsapp', phone: m.phone, text, ...(m.portalUrl ? { link: m.portalUrl } : {}), run: { kind: 'remind-invoice', ref: v.id, done: `Reminder drafted on WhatsApp for ${first(m.client)} — it’s on the project’s Activity` } }, testId: 'need-remind' }]
      }
      verbs.push(door('Record a payment', moneyHref(r, '&do=record')))
    } else if (r.kind === 'send') {
      verbs = [door('Send', moneyHref(r, '&send=1'))]
    } else if (r.kind === 'invoice') {
      verbs = [door('Review', moneyHref(r, '&do=approve'))]
    } else if (r.kind === 'expense' && r.group === 'approve') {
      const run = { kind: 'approve-expense' as const, ref: r.ref }
      verbs = [{ label: 'Approve', do: { kind: 'run', run }, testId: 'need-approve' }, { label: 'Review', do: { kind: 'review' }, testId: 'need-review' }]
      menu.push({ label: 'Send back', do: { kind: 'review' }, testId: 'need-send-back' })
      review = { title: 'Expense', icon: 'receipt_long', heading: r.title, byline: [r.asker, r.askedAt ? agoWords(r.askedAt, ctx.now) : null].filter(Boolean).join(' · ') || undefined,
        facts: [{ label: 'For', value: r.project }, ...(r.sub ? [{ label: 'Kind', value: r.sub }] : []), ...(r.amountMinor ? [{ label: 'Amount', value: money2(r.amountMinor) }] : []), ...(r.know ? [{ label: 'What to know', value: r.know }] : [])],
        approve: { label: 'Approve', run }, back: { kind: 'expense', ref: r.ref, label: 'Send back', who: r.asker, title: r.title }, open: dash(todoHref(r.ref)) }
    } else if (r.kind === 'bill' && r.group === 'approve') {
      const run = { kind: 'approve-bill' as const, ref: r.ref, title: r.title }
      verbs = [{ label: 'Approve', do: { kind: 'run', run }, testId: 'need-approve' }, { label: 'Review', do: { kind: 'review' }, testId: 'need-review' }]
      review = { title: 'Supplier bill', icon: 'receipt_long', heading: r.title, byline: [r.asker, r.askedAt ? agoWords(r.askedAt, ctx.now) : null].filter(Boolean).join(' · ') || undefined,
        facts: [{ label: 'For', value: r.project }, ...(r.amountMinor ? [{ label: 'Amount', value: money2(r.amountMinor) }] : []), ...(r.know ? [{ label: 'Why it waits', value: r.know }] : [])],
        approve: { label: 'Approve', run }, back: null, open: dash(todoHref(r.ref)) }
    } else if (r.kind === 'ask') {
      verbs = [door('Review', `/company/finance/commissions?open=${encodeURIComponent(r.ref)}`)]   // (1-09, W-020) was "Answer"
    } else if (r.group === 'pay') {
      verbs = [door('Pay', todoHref(r.ref))]
    } else {
      verbs = [door(r.group === 'approve' ? 'Review' : 'Open', todoHref(r.ref))]
    }
    out.push(row({ ...base, verbs: verbs.slice(0, 2), menu: [...verbs.slice(2), ...menu], ...(review ? { review } : {}) }))
  }
  /* Xero, once: what didn't reach it (To do's Stuck rows) — Retry pushes them again, the Xero tab says why */
  if (xero.length) {
    const items = xero.map((r) => { const [kind, id] = r.ref.split(':'); return { kind: kind ?? '', id: id ?? '' } })
    out.push(row({ key: 'xero', kind: 'xero', group: 'work', ok: false, icon: 'refresh', title: xero.length === 1 ? `${xero[0]!.title}` : `${plural(xero.length, 'record')} didn’t reach Xero`,
      caption: fitCaption([xero[0]!.sub, 'Fix what it says, then Retry']), tone: 'neutral', open: dash('/company/finance/accounting'),
      verbs: [{ label: 'Retry', do: { kind: 'run', run: { kind: 'retry-xero', items } }, testId: 'need-xero-retry' }, door('Open Xero', '/company/finance/accounting')],
      snoozeKey: snoozeKeyOf('xero', xero.map((r) => r.ref).join(',')), rank: RANK.studio, phrase: 'records didn’t reach Xero' }))
  }
  return out
}

/* ── approvals the rail counts, each record its own row ─────────────────────────────────────────────────────────────────────────── */

async function quoteApprovals(ctx: DashCtx): Promise<InboxRow[]> {
  if ((await fetchQuoteApproval()) !== 'required' || !(await isApprover(ctx.viewer.id, ctx.role))) return []
  const rows = await db.select({ q: quotes, leadName: leads.name }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(eq(quotes.status, 'Sent for Approval'), eq(quotes.kind, 'quote'), isNull(quotes.archivedAt), isNull(quotes.deletedAt), isNull(leads.deletedAt)))   // countQuotesToApprove's own predicate
  const people = await ctx.read.members()
  const nameOf = (id: string | null) => (id ? people.find((p) => p.id === id)?.name ?? null : null)
  return rows.filter((r) => !ctx.seen || ctx.seen.has(r.q.leadId)).map(({ q, leadName }) => {
    const by = nameOf(q.submittedBy)
    const at = q.submittedAt?.getTime() ?? null
    const done = q.submittedBy && q.submittedBy !== ctx.viewer.id ? `Quote approved — ${by ?? 'the sender'} can send it to the client` : 'Quote approved'   // the editor's own sentence
    const run = { kind: 'approve-quote' as const, ref: q.id, done }
    const open = dash(`/quotes/${q.id}`)
    return row({
      key: INBOX_KEY.quoteApprove(q.id), kind: 'quote-approve', group: 'ok', ok: true, icon: 'request_quote', title: `${q.number} is waiting for your approval`,
      caption: fitCaption([leadName, fromWho(by), at ? agoWords(at, ctx.now) : null]), amountMinor: q.amountMinor, tone: 'approve', open,   // (the calm pass) its title and maker's line: the pane's
      verbs: [{ label: 'Approve', do: { kind: 'run', run }, testId: 'need-approve' }, { label: 'Review', do: { kind: 'review' }, testId: 'need-review' }],
      menu: [{ label: 'Send back', do: { kind: 'review' }, testId: 'need-send-back' }],
      review: { title: `Quote · ${leadName}`, icon: 'request_quote', heading: `${q.number} · ${q.title}`, byline: by ? `${by} sent it for approval${at ? ` ${agoWords(at, ctx.now)}` : ''}` : undefined,
        facts: [{ label: 'Client', value: leadName }, { label: 'Total', value: money2(q.amountMinor) }, { label: 'Version', value: String(q.version) }, ...(q.validUntil ? [{ label: 'Valid until', value: displayDate(q.validUntil) }] : [])],
        approve: { label: 'Approve', run }, back: { kind: 'quote', ref: q.id, label: 'Send back', who: by, title: q.number }, open },
      snoozeKey: snoozeKeyOf(INBOX_KEY.quoteApprove(q.id), q.version, q.amountMinor), rank: RANK.ok, about: { leadId: q.leadId }, phrase: `${q.number} is waiting for your approval`,
    })
  })
}

async function priceBookProposals(ctx: DashCtx): Promise<InboxRow[]> {
  if (!runsBook(ctx.viewer)) return []
  const rows = await db.select().from(priceBookItems).where(and(eq(priceBookItems.status, 'proposed'), isNull(priceBookItems.deletedAt)))   // countProposalsToReview's own predicate
  const people = await ctx.read.members()
  const costs = sightOf(ctx.viewer).costs
  return rows.map((i) => {
    const by = i.createdBy ? people.find((p) => p.id === i.createdBy)?.name ?? null : null
    const rate = i.costMinor + i.markupMinor
    const done = `${i.name} approved — it’s in the Price book for the studio`   // the Price book's own sentence (the close-out round 2026-10-31, C-122)
    const run = { kind: 'approve-price-book' as const, ref: i.id, done }
    const open = dash(`/company/price-book?open=${encodeURIComponent(i.id)}`)
    return row({
      key: INBOX_KEY.priceBook(i.id), kind: 'price-book', group: 'ok', ok: true, icon: 'list_alt', title: by ? `${first(by)} wants “${i.name}” in the Price book` : `“${i.name}” is proposed for the Price book`,   // (1-08, W-054)
      caption: fitCaption([i.category ?? 'Price book', agoWords(i.createdAt.getTime(), ctx.now), `${moneyCard(rate)} / ${i.unit.toLowerCase()}`]), tone: 'approve', open,
      verbs: [{ label: 'Approve', do: { kind: 'run', run }, testId: 'need-approve' }, { label: 'Review', do: { kind: 'review' }, testId: 'need-review' }],
      menu: [{ label: 'Send back', do: { kind: 'review' }, testId: 'need-send-back' }],
      review: { title: 'Price book · Items', icon: 'list_alt', heading: i.name, byline: by ? `${by} proposed it ${agoWords(i.createdAt.getTime(), ctx.now)}` : undefined,
        body: plainOf(i.descriptionHtml ?? i.description) || undefined, photos: i.thumb ? [{ src: i.thumb, alt: i.name }] : [],
        facts: [...(i.category ? [{ label: 'Trade', value: i.category }] : []), { label: 'Unit', value: i.unit }, { label: 'Unit price', value: money2(rate) },   // (T-01) a line's grouping is its Trade
          ...(costs ? [{ label: 'Cost', value: money2(i.costMinor) }, { label: 'Mark-up', value: money2(i.markupMinor) }] : []), ...(i.vendor ? [{ label: 'Vendor', value: i.vendor }] : [])],   // Viewer.costs (S41b-1)
        approve: { label: 'Approve', run }, back: { kind: 'price-book', ref: i.id, label: 'Send back', who: by, title: i.name }, open },
      snoozeKey: snoozeKeyOf(INBOX_KEY.priceBook(i.id), i.name, rate), rank: RANK.ok, phrase: `${i.name} waits for your approval`,
    })
  })
}

async function creditAsks(ctx: DashCtx): Promise<InboxRow[]> {
  if (!ownerRole(ctx.role)) return []   // only the Owner gives AI credits (REG-703)
  const [asks, caps] = await Promise.all([fetchOpenAsks(), db.select().from(studioMemberCreditCaps)])
  return asks.map((a) => {
    const cap = caps.find((c) => c.memberId === a.memberId)?.monthlyCap ?? null
    const raise = cap != null ? Math.ceil((cap + Math.max(a.needed, 200)) / 100) * 100 : null   // Company › Plan's own Raise to
    const name = a.name
    const verb: InboxVerb = a.kind === 'monthly' && raise != null
      ? { label: `Raise to ${fmtCredits(raise)}`, do: { kind: 'run', run: { kind: 'raise-credits', memberId: a.memberId, amount: raise, previous: cap, done: `${name} can use ${fmtCredits(raise)} AI credits a month` } }, testId: 'need-approve' }
      : a.kind === 'pool' ? { label: 'Top up', do: { kind: 'run', run: { kind: 'top-up' } }, testId: 'need-approve' } : door('Review', `/company/plan?member=${encodeURIComponent(a.memberId)}`)   // (1-09) was "Answer"
    const open = dash(`/company/plan?member=${encodeURIComponent(a.memberId)}`)
    return row({
      key: INBOX_KEY.creditsAsk(a.id), kind: 'credits-ask', group: 'ok', ok: true, icon: 'diamond', title: `${name} asked for more AI credits`,
      caption: fitCaption([a.kind === 'monthly' ? `Used their ${cap != null ? fmtCredits(cap) : 'monthly limit'} for this month` : 'The studio ran out', agoWords(a.at, ctx.now)]), tone: 'approve', open,
      verbs: [verb, { label: 'Review', do: { kind: 'review' }, testId: 'need-review' }],
      review: { title: 'AI credits', icon: 'diamond', heading: `${name} asked for more AI credits`, byline: agoWords(a.at, ctx.now),
        facts: [{ label: 'What ran out', value: a.kind === 'monthly' ? 'Their monthly limit' : 'The studio’s AI credits' }, ...(cap != null ? [{ label: 'Monthly limit', value: fmtCredits(cap) }] : []), ...(a.needed ? [{ label: 'Needed', value: fmtCredits(a.needed) }] : []),
          ...(a.kind === 'pool' ? [{ label: 'A top-up', value: `${fmtCredits(TOPUP_CREDITS)} AI credits — they never expire` }] : [])],
        approve: verb.do.kind === 'run' ? { label: verb.label, run: verb.do.run } : { label: 'Review', href: open }, back: null, open },
      snoozeKey: snoozeKeyOf(INBOX_KEY.creditsAsk(a.id), a.kind), rank: RANK.ok, phrase: `${name} asked for more AI credits`,
    })
  })
}

/* ── new leads nobody has contacted, past the studio's untouched delay (the bell's own rule) ────────────────────────────────────── */

type LeadRowLite = Awaited<ReturnType<DashCtx['read']['visibleLeads']>>[number]
async function leadRows(ctx: DashCtx, visible: LeadRowLite[]): Promise<InboxRow[]> {
  const rules = await fetchNotificationRules()
  const desk = runsLeads(ctx.role) || ctx.role === 'Manager'   // the lead desk sees the studio's; everyone else their own
  const mine = (r: LeadRowLite) => r.assignees.some((a) => a.id === ctx.viewer.id)
  const out: InboxRow[] = []
  const shown = new Set<string>()
  for (const r of visible) {
    if (!isUntouchedLead({ stage: r.stage, createdAt: r.createdAt, contacted: !!r.lastContact }, ctx.now, rules.untouchedMinutes)) continue   // the bell's own rule
    if (!(mine(r) || (desk && (ctx.scope === 'studio' || r.assignees.length === 0)))) continue
    shown.add(r.id)
    const name = r.name
    const who = first(name)
    const verbs: InboxVerb[] = phoneOk(r.phone)
      ? [{ label: 'Call', icon: 'call', do: { kind: 'call', href: telOf(r.phone), leadId: r.id, first: who }, testId: 'need-call' },
         { label: 'WhatsApp', icon: 'whatsapp', do: { kind: 'whatsapp', phone: r.phone, text: '', leadId: r.id, first: who }, testId: 'need-whatsapp' }]
      : [door('Open', `/leads/${r.id}`)]
    const came = r.createdAt.getTime()
    const ageH = Math.floor((ctx.now - came) / 3_600_000)
    const when = ageH < 1 ? 'came in just now' : ageH < 24 ? `came in ${plural(ageH, 'hour')} ago` : `came in ${agoWords(came, ctx.now)}`
    out.push(row({
      key: INBOX_KEY.leadCall(r.id), kind: 'lead-call', group: 'leads', ok: false, icon: 'person_add', title: `${phoneOk(r.phone) ? 'Call' : 'Contact'} ${name} — new lead`,   // (1-08, W-049) was "{name} · new lead, no contact yet"
      caption: fitCaption([r.source, r.propertyType, when, r.budgetMinor ? moneyCard(r.budgetMinor) : null, r.assignees.length ? null : 'not assigned']),
      tone: 'neutral', open: dash(`/leads/${r.id}`), verbs, menu: r.assignees.length ? [] : [door('Assign a member', `/leads/${r.id}`)],
      snoozeKey: snoozeKeyOf(INBOX_KEY.leadCall(r.id), r.stage), rank: RANK.leads, about: { leadId: r.id }, phrase: `call ${name}, a new lead`,
    }))
  }
  if (desk || ctx.runs) {
    const unassigned = visible.filter((r) => isUnassignedLead(r) && !shown.has(r.id)).length
    const overdue = visible.filter((r) => isOverdueLead(r, ctx.now)).length
    if (overdue) out.push(row({ key: 'leads-overdue', kind: 'leads-overdue', group: 'leads', ok: false, icon: 'flag', title: overdue === 1 ? '1 lead has an overdue follow-up' : `${overdue} leads have an overdue follow-up`, caption: 'Leads · Overdue follow-ups', tone: 'late', open: dash('/leads?scope=overdue'), verbs: [door('Open', '/leads?scope=overdue')], snoozeKey: null, stays: STAYS_LATE, rank: RANK.late }))
    if (unassigned) out.push(row({ key: 'leads-unassigned', kind: 'leads-unassigned', group: 'leads', ok: false, icon: 'person_add', title: unassigned === 1 ? '1 lead isn’t assigned' : `${unassigned} leads aren’t assigned`, caption: 'Leads · Unassigned',   /* (1-08, W-013) */ tone: 'neutral', open: dash('/leads?scope=unassigned'), verbs: [door('Assign', '/leads?scope=unassigned')], snoozeKey: snoozeKeyOf('leads-unassigned', unassigned), rank: RANK.leads }))
  }
  return out
}

/* ── quotes and contracts with the client ───────────────────────────────────────────────────────────────────────────────────────── */

/** Whether a lead is this member's for the quotes' and contracts' follow-ups: a runner's Studio is every lead they see, a Manager their reach;
    a Designer (and Mine) their own — on the lead, or the quote's maker. */
function followsUp(ctx: DashCtx, leadId: string, maker: string | null, byLead: Map<string, string[]>): boolean {
  if (ctx.seen && !ctx.seen.has(leadId)) return false
  if ((ctx.runs && ctx.scope === 'studio') || ctx.role === 'Manager') return true
  return maker === ctx.viewer.id || (byLead.get(leadId) ?? []).includes(ctx.viewer.id)
}

async function quoteRows(ctx: DashCtx, byLead: Map<string, string[]>, studio: string): Promise<InboxRow[]> {
  const rows = await db.select({ q: quotes, leadName: leads.name, leadPhone: leads.phone }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(isNull(quotes.archivedAt), isNull(quotes.deletedAt), isNull(leads.deletedAt), inArray(quotes.status, ['Sent to Client', 'Approved', 'Draft', 'Confirmed'])))
  const live = rows.filter((r) => followsUp(ctx, r.q.leadId, r.q.createdBy, byLead))
  const sent = await sentToClientDates(live.map((r) => r.q))
  const raised = live.length ? await db.select({ quoteId: contracts.fromQuoteId, status: contracts.status }).from(contracts).where(and(isNull(contracts.deletedAt), inArray(contracts.fromQuoteId, live.map((r) => r.q.id)))) : []
  const people = await ctx.read.members()
  const nameOf = (id: string | null) => (id ? people.find((p) => p.id === id)?.name ?? null : null)
  const today = new Date(studioDayStart(ctx.now))
  /* (the Dashboard's closing pass, 2026-10-26 — one fact, one record) a quote's reminder is the client's Activity line (`portal_reminded`,
     `quote:<id>` — lib/maison-ai/remind-actions.ts), written by this row's Remind and by Maison AI's alike; a client reminded within
     REMIND_QUIET_DAYS rests here as the docked field stops offering it, and the team reads who nudged them on the Activity */
  const leadIds = [...new Set(live.map((r) => r.q.leadId))]
  const kept = leadIds.length ? await db.select({ at: leadEvents.at, detail: leadEvents.detail }).from(leadEvents).where(and(inArray(leadEvents.leadId, leadIds), eq(leadEvents.kind, 'portal_reminded'))) : []
  const remindedAt = new Map<string, number>()
  for (const k of kept) { const id = (k.detail as { id?: string } | null)?.id; if (id?.startsWith('quote:')) remindedAt.set(id.slice(6), Math.max(remindedAt.get(id.slice(6)) ?? 0, k.at.getTime())) }
  const out: InboxRow[] = []
  for (const { q, leadName, leadPhone } of live) {
    const who = first(leadName)
    const vo = q.kind === 'variation'
    const noun = vo ? 'variation order' : 'quote'
    const open = dash(`/quotes/${q.id}`)
    const at = sent.get(q.id)?.getTime() ?? null
    const about = { leadId: q.leadId, ...(q.projectId ? { projectId: q.projectId } : {}) }
    const listed = { ...q, sentToClientAt: sent.get(q.id) ?? null }
    /* the client asked for a change on their link — they wait on the studio's answer */
    if (q.changeAskedAt && (q.status === 'Sent to Client' || q.status === 'Approved')) {
      out.push(row({ key: INBOX_KEY.quoteChange(q.id), kind: 'quote-change', group: 'client', ok: false, icon: 'edit', title: `${who} asked for a change on ${q.number}`,
        caption: fitCaption([leadName, agoWords(q.changeAskedAt.getTime(), ctx.now), quoted(q.changeAskedNote)]),
        amountMinor: q.amountMinor, tone: 'neutral', open, verbs: [door('Open', `/quotes/${q.id}`)],
        snoozeKey: snoozeKeyOf(INBOX_KEY.quoteChange(q.id), q.changeAskedAt.getTime()), rank: RANK.client, about, phrase: `${who} asked for a change on ${q.number}` }))
      continue
    }
    /* sent back to its maker with the approver's note (REG-624) — theirs to change and send again */
    if (q.status === 'Draft' && q.reviewNote && q.reviewedAt && (q.submittedBy === ctx.viewer.id || (!q.submittedBy && q.createdBy === ctx.viewer.id))) {
      out.push(row({ key: INBOX_KEY.quoteBack(q.id), kind: 'quote-back', group: 'work', ok: false, icon: 'request_quote', title: `${q.number} was sent back to you`,
        caption: fitCaption([leadName, fromWho(nameOf(q.reviewedBy)), quoted(q.reviewNote)]), tone: 'neutral', open,
        verbs: [door('Open', `/quotes/${q.id}`)], snoozeKey: snoozeKeyOf(INBOX_KEY.quoteBack(q.id), q.reviewedAt.getTime()), rank: RANK.mine, about }))
      continue
    }
    /* confirmed, and no agreement out yet — send it for signature (the quote's Next, REG-2541) */
    if (q.status === 'Confirmed' && !vo && !raised.some((c) => c.quoteId === q.id && (c.status === 'Sent to Client' || c.status === 'Signed'))) {
      out.push(row({ key: INBOX_KEY.quoteConfirmed(q.id), kind: 'quote-confirmed', group: 'client', ok: false, icon: 'draw', title: `${who} confirmed ${q.number} — send the agreement`,
        caption: fitCaption([leadName, q.confirmedAt ? `confirmed ${agoWords(q.confirmedAt.getTime(), ctx.now)}` : null]), amountMinor: q.amountMinor, tone: 'neutral', open,
        verbs: [door('Open', `/quotes/${q.id}`)], snoozeKey: snoozeKeyOf(INBOX_KEY.quoteConfirmed(q.id), q.version), rank: RANK.client, about, phrase: `send ${who} the agreement` }))
      continue
    }
    if (!waitingOnClient(listed) || at === null) continue
    const views = q.clientViewCount ?? 0
    const days = calendarDaysBetween(at, ctx.now)
    const valid = q.validUntil?.getTime() ?? null
    const ending = valid !== null && valid >= today.getTime() && valid < today.getTime() + EXPIRING_DAYS * DAY
    const ended = validPassed(q, ctx.now)
    if (!(views >= OPENED_TIMES || days >= FOLLOW_UP_DAYS || ending || ended)) continue
    const last = remindedAt.get(q.id)
    if (!ended && last !== undefined && ctx.now - last < REMIND_QUIET_DAYS * DAY) continue   // reminded lately: it rests, as the dock's offer does
    const answer = vo ? 'approved it' : 'confirmed'
    /* (the calm UI build 2026-10-27 — the audit's 1-08, W-042 · W-089) the person and the thing first, the number last */
    const title = ended ? `${who}’s ${noun} expired on ${shortDay(valid!)} (${q.number})`
      : views >= OPENED_TIMES ? `${who} opened ${q.number} ${timesWord(views)} and hasn’t ${answer}`
      : ending ? `${who}’s ${noun} is valid until ${shortDay(valid!)} (${q.number})`
      : `${who} hasn’t answered ${noun} ${q.number} — ${dayWords(days)}`
    const seen = views && views < OPENED_TIMES ? 'opened once' : !views ? 'not opened yet' : null
    /* (the calm pass 2026-10-26) the client · sent when · opened when — "VO-1" in the title already says it is a variation order */
    const caption = fitCaption([leadName, `sent ${agoWords(at, ctx.now)}`, seen, q.clientLastViewedAt && views >= OPENED_TIMES ? `last opened ${agoWords(q.clientLastViewedAt.getTime(), ctx.now)}` : null])
    const key = INBOX_KEY.quoteWait(q.id)
    const snooze = snoozeKeyOf(key, title)
    const verbs: InboxVerb[] = []
    if (ended && !vo) verbs.push(door('Open', `/quotes/${q.id}`))   // (1-09: the short verb set — was "Revise")
    else if (phoneOk(leadPhone)) {
      const text = quoteReminder({ clientFirst: who, studio, number: q.number, link: '{link}', variation: vo, validUntil: q.validUntil ? displayDate(q.validUntil) : null })
      verbs.push({ label: 'Remind', icon: 'whatsapp', do: { kind: 'whatsapp', phone: leadPhone, text, link: confirmPath(q.confirmToken || q.id), run: { kind: 'remind-quote', quoteId: q.id, done: `Reminder drafted in WhatsApp for ${leadName} — it’s on their Activity` } }, testId: 'need-remind' })
    } else verbs.push(door('Open', `/quotes/${q.id}`))
    out.push(row({ key, kind: vo ? 'vo-wait' : 'quote-wait', group: 'client', ok: false, icon: views >= OPENED_TIMES ? 'visibility' : ended || ending ? 'event' : 'hourglass_top', title, caption,
      amountMinor: q.amountMinor, tone: 'neutral', open, verbs, menu: verbs[0]?.label === 'Remind' ? [door(`Open the ${noun}`, `/quotes/${q.id}`)] : [],
      snoozeKey: snooze, rank: RANK.client, about, phrase: title }))
  }
  return out
}

async function contractRows(ctx: DashCtx, byLead: Map<string, string[]>, studio: string): Promise<InboxRow[]> {
  const rows = await db.select({ c: contracts, leadName: leads.name, leadPhone: leads.phone }).from(contracts).innerJoin(leads, eq(leads.id, contracts.leadId))
    .where(and(eq(contracts.status, 'Sent to Client'), isNull(contracts.deletedAt), isNull(contracts.archivedAt), isNull(leads.deletedAt), isNotNull(contracts.sentAt)))
  const out: InboxRow[] = []
  for (const { c, leadName, leadPhone } of rows) {
    if (!followsUp(ctx, c.leadId, c.createdBy ?? null, byLead)) continue
    const sentAt = c.sentAt!.getTime()
    const line = awaitingLine(c, ctx.now)
    const expired = !!line?.expired
    const days = calendarDaysBetween(sentAt, ctx.now)
    if (!expired && days < FOLLOW_UP_DAYS) continue
    const name = c.recipientName || leadName
    const who = contractFirst(name)
    const phone = c.recipientPhone || leadPhone
    const title = expired ? `The signing link for ${who} has closed` : c.viewedAt ? `${who} opened the ${c.title.toLowerCase()} and hasn’t signed` : `${who} hasn’t opened the ${c.title.toLowerCase()}`
    const open = dash(`/contracts/${c.id}`)
    const key = INBOX_KEY.contractWait(c.id)
    const verbs: InboxVerb[] = phoneOk(phone)
      ? [{ label: expired ? 'Send again' : 'Remind', icon: 'whatsapp', do: { kind: 'whatsapp', phone, text: contractReminder({ clientFirst: who, studio, title: c.title, link: '{link}' }), link: contractLink(c), run: { kind: 'remind-contract', ref: c.id, done: `Reminder sent to ${name}` } }, testId: 'need-remind' }]
      : [door('Open', `/contracts/${c.id}`)]
    out.push(row({ key, kind: 'contract-wait', group: 'client', ok: false, icon: 'draw', title, caption: fitCaption([leadName, ...factsOf(line?.full ?? `sent ${agoWords(sentAt, ctx.now)}`)]),
      tone: 'neutral', open, verbs, menu: verbs[0]?.label !== 'Open' ? [door('Open the contract', `/contracts/${c.id}`)] : [],
      snoozeKey: snoozeKeyOf(key, title), rank: RANK.client, about: { leadId: c.leadId }, phrase: title }))
  }
  return out
}

/* ── the studio's own signals ───────────────────────────────────────────────────────────────────────────────────────────────────── */

async function creditsRow(ctx: DashCtx): Promise<InboxRow[]> {
  if (!trustedRole(ctx.role)) return []   // the Owner and the Admins see the pool (lib/credits/policy.ts)
  const s = await fetchCreditSummary(ctx.now)
  const tone = toneOf(s)
  if (!s.counting || (tone !== 'low' && tone !== 'empty')) return []
  const out = tone === 'empty'
  const left = s.balance ?? 0
  const owner = ownerRole(ctx.role)
  return [row({ key: 'credits-low', kind: 'credits-low', group: 'work', ok: false, icon: 'diamond', title: out ? 'The studio is out of AI credits' : 'AI credits are running low',
    caption: fitCaption([`${fmtCredits(left)} left`, s.allowance ? `of ${fmtCredits(s.allowance)} this month` : null, owner ? null : `${s.owner?.name ?? 'The Owner'} tops them up`]),
    tone: 'neutral', open: dash('/company/plan'),
    verbs: owner ? [{ label: 'Top up', do: { kind: 'run', run: { kind: 'top-up' } }, testId: 'need-top-up' }, door('Open', '/company/plan')] : [door('Open', '/company/plan')],
    snoozeKey: snoozeKeyOf('credits-low', tone), rank: RANK.studio, phrase: out ? 'the studio is out of AI credits' : 'AI credits are running low' })]
}

/* ── Not today and the ring ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

async function snoozesOf(ctx: DashCtx): Promise<{ set: Set<string> }> {
  const rows = await db.select({ key: dashboardSnoozes.rowKey }).from(dashboardSnoozes)
    .where(and(eq(dashboardSnoozes.memberId, ctx.viewer.id), gt(dashboardSnoozes.untilDay, studioDay(ctx.now))))
  return { set: new Set(rows.map((r) => r.key)) }
}

/** What the records say this member cleared from Needs you today (the studio's day) — the kinds each module logs for an approval given or sent
    back, a payment confirmed, a reminder sent; the quotes and Price book items they answered; the credit asks they granted; the leads they
    logged a contact with; and the clients they reminded about a quote (the Activity line). Never a browser counter. The member's
    own tasks are Your day's, and so is their ring ("2 of 5 done", lane D3) — the two rings tell two facts, each once. */
export const CLEARING_KINDS = [
  'project_update_approved', 'project_update_sent_back', 'project_milestone_done_approved', 'project_milestone_done_sent_back',
  'project_milestone_more_approved', 'project_milestone_more_declined', 'project_schedule_share_sent_back',
  'project_expense_approved', 'project_expense_sent_back', 'project_bill_approved', 'project_invoice_sent_back', 'project_po_sent_back', 'parity_c_commission_answered',
  'project_payment_confirmed', 'project_invoice_reminded', 'parity_s03_contract_reminded',
] as const
export async function clearedToday(memberId: string, now: number): Promise<number> {
  const from = new Date(studioDayStart(now))
  const [ev, qa, qb, pb, asks, contacts, reminded] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(leadEvents).where(and(eq(leadEvents.actorId, memberId), gte(leadEvents.at, from), inArray(leadEvents.kind, [...CLEARING_KINDS]))),
    db.select({ n: sql<number>`count(*)` }).from(quotes).where(and(eq(quotes.approvedBy, memberId), gte(quotes.approvedAt, from))),
    db.select({ n: sql<number>`count(*)` }).from(quotes).where(and(eq(quotes.reviewedBy, memberId), gte(quotes.reviewedAt, from))),
    db.select({ n: sql<number>`count(*)` }).from(priceBookItems).where(and(eq(priceBookItems.reviewedBy, memberId), gte(priceBookItems.reviewedAt, from))),
    db.select({ n: sql<number>`count(*)` }).from(creditRequests).where(and(eq(creditRequests.answeredBy, memberId), gte(creditRequests.answeredAt, from))),
    db.select({ n: sql<number>`count(distinct ${leadNotes.leadId})` }).from(leadNotes).where(and(eq(leadNotes.authorId, memberId), eq(leadNotes.kind, 'contact'), gte(leadNotes.createdAt, from))),
    db.select({ n: sql<number>`count(*)` }).from(leadEvents).where(and(eq(leadEvents.actorId, memberId), eq(leadEvents.kind, 'portal_reminded'), gte(leadEvents.at, from), like(sql`json_extract(${leadEvents.detail}, '$.id')`, 'quote:%'))),   // a client reminded about a quote (the Activity line)
  ])
  return [ev, qa, qb, pb, asks, contacts, reminded].reduce((n, r) => n + Number(r[0]?.n ?? 0), 0)
}

/* ── the inbox ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const soft = <T,>(p: Promise<T>, fallback: T, what: string): Promise<T> => p.catch((e: unknown) => { console.error(`[dashboard] Needs you could not read ${what} —`, e instanceof Error ? e.message : e); return fallback })

/**
 * Needs you for the signed-in member. `okOnly` reads only what can be an approval (the Tasks page's "n approvals wait for you" line,
 * `countApprovalsWaiting`) — the same rows, the same Not today, never a second rule.
 */
export async function fetchInbox(ctx: DashCtx, opts: { okOnly?: boolean } = {}): Promise<InboxData> {
  const okOnly = !!opts.okOnly
  const { runs, now } = ctx
  const [details, todo, visible, mine, brand, snoozes] = await Promise.all([
    ctx.read.details(), ctx.read.todo(), okOnly ? Promise.resolve([]) : ctx.read.visibleLeads(), okOnly ? Promise.resolve([]) : ctx.read.meetings(),
    soft(fetchBrand(), null, 'the studio’s name'), soft(snoozesOf(ctx), { set: new Set<string>() }, 'Not today'),
  ])
  const studio = brand?.details.name ?? 'the studio'
  const byLead = new Map<string, string[]>(visible.map((r) => [r.id, r.assignees.map((a) => a.id)]))
  const pane = await soft(paneFacts(details), { updates: new Map(), reasons: new Map() }, 'the approvals’ facts')

  const all: InboxRow[] = []
  /* every project's rows — Mine keeps the approvals and the member's own projects */
  for (const d of details) {
    const own = ctx.isMine(d.team.map((m) => m.id))
    for (const r of projectRows(ctx, d, pane, studio)) if (ctx.scope === 'studio' || own || r.ok) all.push(r)
  }
  /* what the project rows already say, by the record they are about */
  const said = new Set<string>(details.flatMap((d) => d.needs.flatMap((r) => (r.ref ? [r.ref] : []))))
  /* Finance › To do: the books' roles read it in the context; a Manager's or a Designer's own (sent back to them) here */
  const money = todo ? todo.todo.money : []
  const todoList = todo ? todoRows(todoInputOf(todo.todo)) : !okOnly && ctx.workspace && !ctx.books ? await soft(fetchFinanceTodo().then((t) => todoRows(todoInputOf(t.todo)).filter((r) => r.group === 'sent_back')), [], 'Finance › To do') : []
  for (const r of todoInbox(ctx, todoList, money, studio, said)) if (ctx.scope === 'studio' || r.ok || !r.about?.projectId || details.some((d) => d.project.id === r.about!.projectId && ctx.isMine(d.team.map((m) => m.id)))) all.push(r)

  const [qa, pb, ca] = await Promise.all([
    soft(quoteApprovals(ctx), [], 'quotes to approve'), soft(priceBookProposals(ctx), [], 'Price book proposals'), soft(creditAsks(ctx), [], 'AI credits asks'),
  ])
  all.push(...qa, ...pb, ...ca)
  const badges = await ctx.read.badges()
  const templates = badges['company:templates'] ?? 0
  if (runs && templates) all.push(row({ key: 'templates', kind: 'templates', group: 'ok', ok: true, icon: 'style', title: templates === 1 ? '1 template waits for your approval' : `${templates} templates wait for your approval`, caption: 'Company › Templates', tone: 'approve', open: dash('/company/templates/quotes'), verbs: [door('Review', '/company/templates/quotes')], snoozeKey: snoozeKeyOf('templates', templates), rank: RANK.ok }))

  if (!okOnly) {
    const [ld, qs, cs, cr] = await Promise.all([
      soft(leadRows(ctx, visible), [], 'new leads'),
      ctx.workspace ? soft(quoteRows(ctx, byLead, studio), [], 'quotes with the client') : Promise.resolve([]),
      ctx.workspace ? soft(contractRows(ctx, byLead, studio), [], 'contracts out for signature') : Promise.resolve([]),
      soft(creditsRow(ctx), [], 'AI credits'),
    ])
    all.push(...ld, ...qs, ...cs, ...cr)
    /* S23's meetings: notes to write up once a planned meeting is over, a brief to save to the lead */
    for (const { m, leadName } of mine) {
      const st = standingOf({ status: m.status, startsAt: m.startsAt.getTime(), endsAt: m.endsAt?.getTime() ?? null, briefAt: m.briefAt?.getTime() ?? null, briefSavedAt: m.briefSavedAt?.getTime() ?? null }, now)
      if (!st.waits) continue
      const who = first(leadName)
      all.push(row({ key: INBOX_KEY.meeting(m.id), kind: `meeting-${st.waits}`, group: st.late ? 'late' : 'work', ok: false, icon: 'notes', title: st.waits === 'write' ? `Write up the meeting with ${who}` : `Save the meeting notes — ${who}`,   /* (1-08, W-084) */
        caption: `${aimLabel(m.aim)} · ${shortDay(m.startsAt.getTime())}`, tone: st.late ? 'late' : 'neutral', open: dash(`/meetings/${m.id}`), verbs: [door(st.waits === 'write' ? 'Write up' : 'Open', `/meetings/${m.id}`)],
        snoozeKey: st.late ? null : snoozeKeyOf(INBOX_KEY.meeting(m.id), st.waits), ...(st.late ? { stays: STAYS_LATE } : {}), rank: RANK.late, about: { leadId: m.leadId } }))
    }
    /* 1.0's Compliance Alerts: a project's mandatory items still to do in its phase */
    const counted = details.filter((d) => d.mayChange && d.project.stage !== 'completed' && (ctx.scope === 'studio' || ctx.isMine(d.team.map((x) => x.id))))
    const compliance = counted.length ? await soft(complianceCountsOf(counted.map((d) => ({ id: d.project.id, stage: d.project.stage, propertyType: d.lead.propertyType }))), new Map<string, number>(), 'compliance') : new Map<string, number>()
    for (const d of counted) {
      const n = compliance.get(d.project.id) ?? 0
      if (!n) continue
      all.push(row({ key: `compliance:${d.project.id}`, kind: 'compliance', group: 'work', ok: false, icon: 'verified_user', title: `${plural(n, 'compliance item')} to do · ${phaseLabel(phaseOfStage(d.project.stage))}`, caption: d.lead.name,   // (the calm pass) the client, as every project row
        tone: 'neutral', open: dash(projectHref(d.project.id, 'compliance')), verbs: [door('Open', projectHref(d.project.id, 'compliance'))], snoozeKey: snoozeKeyOf(`compliance:${d.project.id}`, n), rank: RANK.compliance, about: { projectId: d.project.id, leadId: d.lead.id } }))
    }
    /* S08: Set up your studio, while it is open for this Owner or Admin */
    const setup = runs ? await soft(fetchStudioSetup(), null, 'Set up your studio') : null
    if (setup && setup.mode === 'open') {
      const next = setup.rows.find((r) => !r.done)
      all.push(row({ key: 'setup', kind: 'setup', group: 'work', ok: false, icon: 'task_alt', title: 'Set up your studio', caption: `${setup.done} of ${setup.rows.length} done${next ? ` · next: ${next.label}` : ''}`, tone: 'neutral', open: dash(SETUP_HREF), verbs: [door('Continue', SETUP_HREF)], snoozeKey: snoozeKeyOf('setup', setup.done), rank: RANK.studioSetup }))
    }
    /* (S37) Qanvast asked for changes to the studio's listing */
    const listing = runs ? await soft(fetchListingRead(), null, 'the Qanvast listing') : null
    if (listing?.asked) {
      const title = listing.listed ? 'Qanvast asks for changes to your listing update' : 'Qanvast asks for changes to your listing application'
      all.push(row({ key: 'qanvast-listing', kind: 'qanvast-listing', group: 'work', ok: false, icon: 'storefront', title, caption: listing.asked.note ?? 'Company › Profile › Listed on Qanvast', tone: 'neutral', open: dash('/company/profile#qanvast'), verbs: [door('Fix', '/company/profile#qanvast')], snoozeKey: snoozeKeyOf('qanvast-listing', listing.asked.note), rank: RANK.setup, phrase: title }))
    }
  }

  /* each row once (a key two producers could share), then (the calm UI build 2026-10-27 — the audit's 1-01) a project's standing to-dos folded
     into one row for the project (its set-up, its start, a schedule to share, an update to write, a contractor to book, its compliance) — the
     decisions and the people waiting stay rows of their own; then Not today: set aside until tomorrow */
  const seen = new Set<string>()
  const once = all.filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)))
  const projectOf = new Map(details.map((d) => [d.project.id, { name: d.project.name, href: dash(projectHref(d.project.id)), leadId: d.lead.id }]))
  const unique = foldStanding(once, (r) => (r.kind.startsWith('need:') && r.group === 'work') || r.kind === 'compliance', (pid) => projectOf.get(pid) ?? null)
  const set = unique.filter((r) => r.snoozeKey && snoozes.set.has(r.snoozeKey))
  const rows = unique.filter((r) => !(r.snoozeKey && snoozes.set.has(r.snoozeKey)))
  const ordered = orderInbox(rows)
  const cleared = okOnly ? 0 : await soft(clearedToday(ctx.viewer.id, now), 0, 'what was cleared today')
  return { ...EMPTY_INBOX, rows: ordered, set: orderInbox(set), cleared, groups: chipsOf(ordered), snoozed: set.length }
}
