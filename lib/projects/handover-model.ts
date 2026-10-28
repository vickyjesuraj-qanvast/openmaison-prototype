/**
 * (Projects round 7 — Q-24 · Q-25 · Q-26 · Q-27; the report's "Ending a project" and "Roles and rules") How a project ends, as rules and
 * words — pure and client-safe. 1.0 had three endings whose words overlapped (Close · Archive · Delete), a sign-off with no way back, a
 * read-only state that only held when a lock nobody wrote was on, and a server that let any member approve (D-308 · D-309 · D-321…D-326).
 * Here there is ONE ending: **Complete handover**, with a short checklist drawn from the records (every milestone done · the handover stage
 * confirmed by the client when they were asked · nothing outstanding on money · no update waiting for review), each unmet item saying why with
 * its own button; *Complete anyway* for an Owner or an Admin, with a reason. An owner's review is a setting (Settings › Projects › Handover
 * needs an owner's review, off by default): a Designer's or a Manager's handover then waits for an Owner or an Admin — the quotes' approval
 * shape (REG-624). Completed, the schedule and the agreed money are read-only on the server; **Reopen** (an Owner or an Admin, with a reason)
 * puts the project back In progress. Delete is soft, the Owners' and Admins', refused while money is recorded against the project.
 */
import { runsStudio } from '@/lib/leads/assign-policy'
import { money2 } from '@/lib/quotes/math'
import type { ProjectStage } from './model'

/* ── Settings › Projects › Stages and handover ─────────────────────────────────────────────────────────────────────────────────── */

export const HANDOVER_RULES_KEY = 'project_handover'
/** `review`: a Designer's or a Manager's handover waits for an Owner or an Admin (off by default — the brief: "as a setting, default off"). */
export type HandoverRules = { review: boolean }
export const DEFAULT_HANDOVER_RULES: HandoverRules = { review: false }
export function parseHandoverRules(v: unknown): HandoverRules {
  const r = (v ?? {}) as { review?: unknown }
  return { review: r.review === true }
}

/* ── Settings › Projects › Schedule defaults ───────────────────────────────────────────────────────────────────────────────────── */

export const SCHEDULE_DEFAULTS_KEY = 'project_schedule_defaults'
/** The schedule template a new schedule starts from (Company › Templates › Schedules); null = the signed quote's stages when there is one. */
export type ScheduleDefaults = { templateId: string | null }
export const DEFAULT_SCHEDULE_DEFAULTS: ScheduleDefaults = { templateId: null }
export function parseScheduleDefaults(v: unknown): ScheduleDefaults {
  const r = (v ?? {}) as { templateId?: unknown }
  return { templateId: typeof r.templateId === 'string' && r.templateId ? r.templateId.slice(0, 80) : null }
}

/* ── Who may (each a rule the server checks — the *Who may do what* rows read the same functions) ───────────────────────────────── */

export const SETTINGS_RULE = 'Only Owners and Admins change the project settings'
export const REVIEW_RULE = 'Only Owners and Admins review a handover'
export const ANYWAY_RULE = 'Only Owners and Admins complete a project with items still open'
export const REOPEN_RULE = 'Only Owners and Admins reopen a project'
export const DELETE_RULE = 'Only Owners and Admins delete a project'
/** Q-27, word for word: every lead delete path refuses a lead whose project is live. */
export const LEAD_HAS_PROJECT = 'This lead has a project. Delete the project first.'
/** A count that opens a sentence, in words — a refusal is read back only when it starts with a capital (components/leads/tasks/use-run.ts
    `refusalOf`). */
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
export const countWord = (n: number) => WORDS[n] ?? `All ${n}`
export const leadsHaveProjects = (n: number) => (n === 1 ? LEAD_HAS_PROJECT : `${countWord(n)} of these leads have a project. Delete the projects first — nothing was deleted.`)
/** (fix-E, E-08) Several leads picked and one of them holds the delete: it is named, and the line says nothing went (the batch refuses whole). */
export const leadHasProjectNamed = (name: string) => `${name} has a project. Delete the project first — nothing was deleted.`

/** (fix-E, E-05) Make the project again, for anyone but an Owner or an Admin: the old one must be restored or removed for good first. */
export const remakeRefusal = (number: string) => `${number} is in Deleted projects — an Owner or an Admin can restore it or make it again`
/** (fix-E, E-26) Restore, from Deleted Projects. */
export const RESTORE_RULE = 'Only Owners and Admins restore a project'

/** Approve or send back a handover that waits for review. */
export const reviewsHandover = (role: string | null | undefined) => runsStudio(role)
/** Complete with checklist items still open — the reason is asked for. */
export const completesAnyway = (role: string | null | undefined) => runsStudio(role)
export const reopensProject = (role: string | null | undefined) => runsStudio(role)
/** Delete, restore and delete forever (Q-26 — 1.0's one server-checked rule kept). */
export const deletesProject = (role: string | null | undefined) => runsStudio(role)
/** The handover completes at once — an Owner's or an Admin's, or anyone's on the team while the review is off; else it waits for review. */
export const completesAtOnce = (role: string | null | undefined, rules: HandoverRules) => !rules.review || runsStudio(role)

/**
 * (Q-24) Completed: the schedule and the agreed money are read-only — refused on the server, said in one sentence. Recording a payment
 * against an invoice already sent stays open (`payments`): Complete anyway can leave money owed, and collecting it must not need a Reopen
 * (round 7's call, logged; the invoices, the variation orders and the value themselves stay fixed).
 */
export type ReadOnlyArea = 'schedule' | 'money' | 'value' | 'payments'
export function completedBlock(stage: string, area: ReadOnlyArea): string | null {
  if (stage !== 'completed' || area === 'payments') return null
  return area === 'schedule' ? 'This project is completed — reopen it to change its schedule'
    : area === 'value' ? 'This project is completed — reopen it to change its dates or value'
    : 'This project is completed — reopen it to change its money'
}

/* ── The checklist (Q-24: drawn from the records, never ticked by hand) ────────────────────────────────────────────────────────── */

export type HandoverFacts = {
  client: string
  /** Live milestones, and the unfinished ones by title. */
  milestones: { total: number; open: { id: string; title: string }[] }
  /** The handover stage (the milestone that ends last — lib/projects/schedule-model.ts `handoverOf`) and the client's answer when asked. */
  handover: { id: string; title: string; asked: boolean; answer: 'confirmed' | 'changes' | null } | null
  /** From the one set of numbers (lib/projects/money.ts `moneyOf`). */
  money: { contractMinor: number; outstandingMinor: number; leftMinor: number; awaiting: number; /** payment stages agreed — with none, nothing can be invoiced and "not invoiced" is no reason */ stages: number
    /** (gaps build, package A — 1.0 D-262) collected beyond the contract: a refund or a credit is due (`refundDueOf`) */
    refundMinor?: number
    /** (pending modules S07 — D-14) the client's overpayments still held as credit — used on an invoice or refunded before the close */
    heldMinor?: number }
  /** Updates In review. */
  updatesInReview: number
  /* ── (simplify S-19, the owner's "build everything", 2026-10-09; P2 §6.9) the Hand over sheet's in-place fixes and its two new rows ── */
  /** The updates waiting for review, by id — an approver approves them in place. */
  updates?: { id: string; title: string }[]
  /** The stage invoice still to send (the Completion, as a rule), and the sent ones past their due day — sent or reminded in place. */
  invoices?: { toSend: { id: string; stage: string; amountMinor: number; state: string } | null; overdue: { id: string; number: string; stage: string; owedMinor: number; dueAt: number | null }[] }
  /** The home's compliance checklist: its mandatory Handover-phase items not done (null = no checklist for this kind of home). */
  compliance?: { open: { id: string; title: string }[] } | null
  /** Live tickets whose turn is the studio's. */
  tickets?: { id: string; number: string; subject: string }[]
  /** (parity map, PR-121 · MO-101 — 1.0 D-260 "All POs have recorded payouts") what the studio still owes its vendors on this project, from the
      one set of costs (lib/finance/costs.ts `costsOf`): the bound POs and the bills on no PO with a balance, and the sum; `any` = the project has
      a PO or a bill at all (the row shows then, met or not). Null = not read (a project with no costs shows no row). */
  vendors?: { any: boolean; pos: number; bills: number; /** null for a viewer who may not see cost figures (F1-Q2: Owners and Admins) */ owedMinor: number | null } | null
}
export type ChecklistAction = { label: string; tab: 'schedule' | 'money' | 'updates' | 'compliance' | 'tickets'; open?: string | null
  /** (parity map, PR-121) a place on the tab — Money's `#costs` */
  hash?: string }
/**
 * (simplify S-19) A fix done in place, inside the sheet — never a trip to another tab: Mark the last milestone done (the Mark done sheet,
 * nested), ask the client again or remind them, send (or submit) the stage's invoice, remind an overdue one, approve the update waiting, mark a
 * compliance item done, open a ticket's thread. Each runs today's own action under today's rule.
 */
export type ChecklistFix =
  | { kind: 'mark-done'; milestoneId: string; label: string }
  | { kind: 'ask-again'; milestoneId: string; label: string }
  | { kind: 'remind-confirm'; milestoneId: string; label: string; title: string }
  | { kind: 'send-invoice'; invoiceId: string; label: string; mode: 'send' | 'submit' }
  | { kind: 'remind-invoice'; invoiceId: string; label: string; number: string; stage: string; owedMinor: number; dueAt: number | null }
  | { kind: 'approve-update'; updateId: string; label: string; title: string }
  | { kind: 'compliance-done'; itemId: string; label: string; title: string }
  | { kind: 'open-ticket'; ticketId: string; label: string; number: string }
/** `open` (fix-E, E-03): the item as it stood open, for the record — "4 milestones not done", "S$20,784.94 to collect" — never the met
    state's words, which Activity printed as if they were true. `fixes` (simplify S-19): what the sheet fixes in place, for this viewer. */
export type ChecklistItem = { key: 'milestones' | 'client' | 'money' | 'updates' | 'refund' | 'compliance' | 'tickets' | /** (parity map, PR-121 · MO-101) */ 'vendors' | /** (pending modules S07) */ 'credit-held'; label: string; met: boolean; why: string | null; action: ChecklistAction | null; open: string | null
  fixes?: ChecklistFix[] }
/** (simplify S-19) Who presses the sheet: an invoice goes at once or is submitted (money's rule), an update is approved here or waits. */
export type FixViewer = { sends: boolean; approvesUpdates: boolean }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const list = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, 2).join(', ')} and ${plural(xs.length - 2, 'more', 'more')}`)
const q = (s: string) => `“${s}”`

export function handoverChecklist(f: HandoverFacts, viewer?: FixViewer): ChecklistItem[] {
  const first = f.client.split(' ')[0] ?? f.client
  const open = f.milestones.open
  const items: ChecklistItem[] = [
    {
      key: 'milestones', label: 'Every milestone is done',
      met: open.length === 0,
      why: open.length ? `${open.length === 1 ? `${q(open[0]!.title)} isn’t` : `${list(open.map((m) => q(m.title)))} aren’t`} done yet.` : null,
      action: open.length ? { label: 'Open the schedule', tab: 'schedule', open: open[0]!.id } : null,
      open: open.length ? `${plural(open.length, 'milestone')} not done` : null,
      /* (simplify S-19) the last one is marked done here — the Mark done sheet, nested */
      ...(viewer && open.length === 1 ? { fixes: [{ kind: 'mark-done' as const, milestoneId: open[0]!.id, label: `Mark ${shortName(open[0]!.title)} done` }] } : {}),
    },
  ]
  /* the client's word on the handover stage — only when the studio asked them to confirm it (Q-16) */
  const h = f.handover
  if (h?.asked) {
    items.push({
      key: 'client', label: `${first} has confirmed ${q(h.title)}`,
      met: h.answer === 'confirmed',
      why: h.answer === 'changes' ? `${first} says something is not right with ${q(h.title)}.` : h.answer === 'confirmed' ? null : `${first} hasn’t confirmed ${q(h.title)} yet.`,
      action: h.answer === 'confirmed' ? null : { label: 'Open the stage', tab: 'schedule', open: h.id },
      open: h.answer === 'changes' ? `${first} says something is not right with ${q(h.title)}` : h.answer === 'confirmed' ? null : `${first} hasn’t confirmed ${q(h.title)}`,
      /* (simplify S-19) asked again after "not right", or reminded on WhatsApp while they haven't answered */
      ...(viewer && h.answer !== 'confirmed' ? { fixes: [h.answer === 'changes' ? { kind: 'ask-again' as const, milestoneId: h.id, label: `Ask ${first} again` } : { kind: 'remind-confirm' as const, milestoneId: h.id, label: 'Remind', title: h.title }] } : {}),
    })
  }
  const m = f.money
  const moneyWhy = m.outstandingMinor > 0 ? `${money2(m.outstandingMinor)} is still to collect.`
    : m.awaiting > 0 ? `${plural(m.awaiting, 'invoice waits', 'invoices wait')} for approval.`
    : m.leftMinor > 0 && m.stages > 0 ? `${money2(m.leftMinor)} of the contract isn’t invoiced yet.`
    : null
  const moneyOpen = m.outstandingMinor > 0 ? `${money2(m.outstandingMinor)} to collect`
    : m.awaiting > 0 ? `${plural(m.awaiting, 'invoice')} waiting for approval`
    : m.leftMinor > 0 && m.stages > 0 ? `${money2(m.leftMinor)} not invoiced`
    : null
  /* (simplify S-19) the stage's invoice sent (or submitted) here; an overdue one reminded — recording a payment still opens Money */
  const toSend = f.invoices?.toSend ?? null
  const late = f.invoices?.overdue[0] ?? null
  const moneyFixes: ChecklistFix[] = !viewer || !moneyWhy ? [] : [
    ...(toSend && toSend.state !== 'awaiting' ? [{ kind: 'send-invoice' as const, invoiceId: toSend.id, mode: viewer.sends ? 'send' as const : 'submit' as const, label: `${viewer.sends ? 'Send' : 'Submit'} the ${toSend.stage} invoice` }] : []),
    ...(late ? [{ kind: 'remind-invoice' as const, invoiceId: late.id, label: 'Remind', number: late.number, stage: late.stage, owedMinor: late.owedMinor, dueAt: late.dueAt }] : []),
  ]
  items.push({ key: 'money', label: 'Nothing is outstanding on money', met: !moneyWhy, why: moneyWhy, action: moneyWhy ? { label: 'Open Money', tab: 'money' } : null, open: moneyOpen, ...(moneyFixes.length ? { fixes: moneyFixes } : {}) })
  /* (gaps build, package A — 1.0 D-262's "No over-collection (refund due)") more collected than the contract: the client is owed the difference —
     raised only when it is so (Money's "S$x to credit"), deferrable with its reason ("refunded by bank transfer on 3 Oct") */
  if ((m.refundMinor ?? 0) > 0) {
    items.push({
      key: 'refund', label: `Nothing is owed back to ${first}`, met: false,
      why: `${money2(m.refundMinor!)} more was collected than the ${money2(m.contractMinor)} contract — refund or credit it.`,
      action: { label: 'Open Money', tab: 'money' }, open: `${money2(m.refundMinor!)} to refund`,
    })
  }
  /* (pending modules S07 — D-14; 1.0's "a refund / credit note is owed before closing") the client's money held as credit: raised only while some is
     left, deferrable as every row is *(invented copy)* */
  if ((m.heldMinor ?? 0) > 0) {
    items.push({
      key: 'credit-held', label: `Nothing of ${first}’s credit is left`, met: false,
      why: `${money2(m.heldMinor!)} of ${first}’s money is held as credit — take it off an invoice, or refund it.`,
      action: { label: 'Open Money', tab: 'money' }, open: `${money2(m.heldMinor!)} held`,
    })
  }
  /* (parity map, PR-121 · MO-101 — 1.0 D-260, deferrable as every row is) what the studio still owes its vendors — shown once the project has a
     PO or a bill; open while a bound PO or a bill on no PO has a balance. Recording the payment stays on Money › Costs, where the record is. */
  const vd = f.vendors
  if (vd?.any) {
    const owed = vd.pos + vd.bills
    const what = [vd.pos ? plural(vd.pos, 'PO') : '', vd.bills ? plural(vd.bills, 'bill') : ''].filter(Boolean).join(' and ')
    items.push({
      key: 'vendors', label: 'Vendors are paid', met: owed === 0,
      why: owed ? `${what} still owed${vd.owedMinor !== null ? ` — ${money2(vd.owedMinor)}` : ''}.` : null,   // (invented copy)
      action: owed ? { label: 'Open Costs', tab: 'money', hash: 'costs' } : null,
      open: owed ? (vd.owedMinor !== null ? `${money2(vd.owedMinor)} owed to vendors` : `${what} owed to vendors`) : null,
    })
  }
  items.push({
    key: 'updates', label: 'No update waits for review',
    met: f.updatesInReview === 0,
    why: f.updatesInReview ? `${plural(f.updatesInReview, 'update waits', 'updates wait')} for review${viewer && !viewer.approvesUpdates ? ' — waiting for an Owner or an Admin' : ''}.` : null,
    action: f.updatesInReview ? { label: 'Open Updates', tab: 'updates' } : null,
    open: f.updatesInReview ? `${plural(f.updatesInReview, 'update')} in review` : null,
    /* (simplify S-19) an approver approves it here */
    ...(viewer?.approvesUpdates && f.updates?.length ? { fixes: f.updates.slice(0, 3).map((u) => ({ kind: 'approve-update' as const, updateId: u.id, label: f.updates!.length > 1 ? `Approve “${shortName(u.title)}”` : 'Approve', title: u.title })) } : {}),
  })
  /* (simplify S-19, P2 §6.9 — new rows, each deferrable as every row is) compliance's Handover items, and no ticket waiting on the studio */
  if (f.compliance) {
    const c = f.compliance.open
    items.push({
      key: 'compliance', label: 'Compliance’s Handover items are done', met: c.length === 0,
      why: c.length ? `${c.length === 1 ? `${q(c[0]!.title)} is` : `${list(c.map((x) => q(x.title)))} are`} still to do.` : null,
      action: c.length ? { label: 'Open Compliance', tab: 'compliance' } : null,
      open: c.length ? `${plural(c.length, 'compliance item')} to do` : null,
      ...(viewer && c.length ? { fixes: c.slice(0, 4).map((x) => ({ kind: 'compliance-done' as const, itemId: x.id, title: x.title, label: c.length > 1 ? `Mark “${shortName(x.title)}” done` : 'Mark done' })) } : {}),
    })
  }
  const t = f.tickets ?? []
  items.push({
    key: 'tickets', label: 'No issue waits on the studio', met: t.length === 0,   // (the calm UI build 2026-10-27, 3-37 · T-01) "Issues" on screen
    why: t.length ? `${t.length === 1 ? `${t[0]!.number} waits` : `${list(t.map((x) => x.number))} wait`} for your answer.` : null,
    action: null,
    open: t.length ? `${plural(t.length, 'issue')} waiting on the studio` : null,
    ...(viewer && t.length ? { fixes: t.slice(0, 3).map((x) => ({ kind: 'open-ticket' as const, ticketId: x.id, number: x.number, label: `Open ${x.number}` })) } : {}),
  })
  return items
}
/** A name short enough for a button — "Carpentry fabrication" stays, "Handover & defect check walk-through" is cut at its first words. */
const shortName = (t: string) => { const s = t.trim(); return s.length <= 28 ? s : `${s.slice(0, 26).replace(/\s+\S*$/, '')}…` }
/** (fix-E, E-03) What the record keeps of the items still open when a handover is completed or asked for. */
export const openItemsOf = (items: ChecklistItem[]) => items.filter((i) => !i.met).map((i) => i.open ?? i.label)
/** (fix-E, E-03) A record written before the fix named an open item by its met label — read back as it stood open. */
export function openPhrase(s: string): string {
  if (s === 'Every milestone is done') return 'Milestones not done'
  if (s === 'Compliance’s Handover items are done') return 'Compliance items to do'   // (simplify S-19)
  if (s === 'No ticket waits on the studio') return 'An issue waiting on the studio'   // (the calm UI build 2026-10-27) an older record's words, said as Issues
  if (s === 'No issue waits on the studio') return 'An issue waiting on the studio'
  if (s === 'Nothing is outstanding on money') return 'Money still outstanding'
  if (s === 'Vendors are paid') return 'Vendors still owed'   // (parity map, PR-121)
  if (s === 'No update waits for review') return 'An update in review'
  const c = /^(.+) has confirmed (“.+”)$/.exec(s)
  return c ? `${c[1]} hasn’t confirmed ${c[2]}` : s
}
export const checklistMet = (items: ChecklistItem[]) => items.every((i) => i.met)

/** (The header's one action) The work is near its end: at most one milestone left, or no schedule and the target end within a week. */
export const NEAR_END_DAYS = 7
export function nearHandover(f: { stage: ProjectStage | string; milestones: number; openMilestones: number; targetEnd: number | null; now: number }): boolean {
  if (f.stage !== 'in_progress') return false
  if (f.milestones > 0) return f.openMilestones <= 1
  return f.targetEnd !== null && f.targetEnd - f.now <= NEAR_END_DAYS * 86_400_000
}

/* ── Delete (Q-26) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Money recorded against a project keeps it: payments first (the brief's words), then invoices the client has in hand — a sent invoice
 * (not void) is money asked for, and 1.0 refused a delete while any finance record held it (D bottom line). Void it first.
 */
export function deleteBlock(m: { payments: number; sent: number }): string | null {
  if (m.payments > 0) return `${countWord(m.payments)} ${m.payments === 1 ? 'payment is' : 'payments are'} recorded on this project.`
  if (m.sent > 0) return `${countWord(m.sent)} ${m.sent === 1 ? 'invoice has' : 'invoices have'} gone to the client on this project — void ${m.sent === 1 ? 'it' : 'them'} first.`
  return null
}

/* ── What the project page reads (filled on the server by lib/projects/handover.ts `endingOf`) ─────────────────────────────────── */

export type EndingPerson = { id: string | null; name: string }
export type EndingView = {
  rules: HandoverRules
  /** A handover waiting for an Owner's or an Admin's review. */
  request: { by: EndingPerson; at: number; note: string | null } | null
  /** The last review that sent it back — shown until it is asked again. `mine` (fix-E, E-23): the viewer asked — the hint is theirs. */
  sentBack: { by: EndingPerson; at: number; note: string; mine?: boolean } | null
  /** `open` (fix-E, E-24): how many checklist items were open when it was completed anyway. `deferred` (gaps build, package A): the items
      deferred, each with its own reason. */
  completed: { by: EndingPerson; at: number; note: string | null; reason: string | null; open?: number; deferred?: DeferredItem[] } | null
  /** On the project's team (or runs the studio): may open the handover. */
  mayHandover: boolean
  /** An Owner or an Admin: reviews, completes anyway, reopens, deletes. */
  runs: boolean
  /** Is the viewer the one who asked (they may take the request back)? */
  mine: boolean
  near: boolean
}

/** The bar's one sentence about a project that is completed. */
/** (REG-1069) The bar's line says what reads only — the schedule, the choices and the agreed money — and names Reopen as the way back (the
    bar's own button for an Owner or an Admin; who to ask for everyone else). */
/** (fix-E, E-24) Who completed it and their note first, then — when items were open — how many and why, in one sentence each; "Completed"
    once. (A-12 · REG-1022) It says what stays open after completion — its team, tasks, files and updates, and payments against invoices
    already sent (REG-1022, D-11) — so nothing offered beside it reads as a slip. */
export function completedLine(c: NonNullable<EndingView['completed']>, day: string, o: { runs?: boolean } = {}): string {
  const note = c.note ? ` — “${c.note.replace(/[.!?]+$/, '')}”` : ''
  /* (gaps build, package A) the deferred items name themselves with their own reasons; the general reason only when one was typed besides them */
  const deferred = c.deferred ?? []
  const general = c.reason && c.reason !== deferredReason(deferred) ? c.reason : null
  const left = (c.open ?? 0) - deferred.length
  const open = general ? ` ${left > 0 ? `${countWord(left)} ${left === 1 ? 'item was' : 'items were'}` : 'Items were'} still open: “${general.replace(/[.!?]+$/, '')}”.` : ''
  const def = deferred.length ? ` ${countWord(deferred.length)} ${deferred.length === 1 ? 'item was' : 'items were'} deferred: ${deferred.map((d) => `${d.item} — “${d.reason.replace(/[.!?]+$/, '')}”`).join('; ')}.` : ''
  return `Completed on ${day} by ${c.by.name}${note}.${open}${def} Its schedule, choices and agreed money are read-only until ${o.runs ? 'you reopen it' : 'an Owner or an Admin reopens it'} — payments, updates, tasks and its team stay open.`
}

/* ── (gaps build, package A) Deferred items (1.0 D-256 · D-257 · D-277: an open check deferred with its own reason) ─────────────────────── */

/** One checklist item deferred: which, its open words as they stood ("S$20,784.94 to collect"), and why it waits past the handover. */
export type DeferredItem = { key: string; item: string; reason: string }
export const DEFER_REASON_MAX = 200
export function parseDeferred(v: unknown): DeferredItem[] {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!Array.isArray(raw)) return []
  return raw.flatMap((x) => {
    const o = (x ?? {}) as { key?: unknown; item?: unknown; reason?: unknown }
    return typeof o.key === 'string' && typeof o.item === 'string' && typeof o.reason === 'string' && o.reason.trim() ? [{ key: o.key, item: o.item, reason: o.reason.trim().slice(0, DEFER_REASON_MAX) }] : []
  })
}
/** The record's reason when every open item was deferred and no other reason was typed — the reasons, in their order. */
export const deferredReason = (d: DeferredItem[]) => d.map((x) => x.reason.replace(/[.!?]+$/, '')).join('; ')
/** The deferrals asked for, kept to the items open now: an open item's key with a reason. */
export function deferralsOf(items: ChecklistItem[], asked: { key: string; reason: string }[] | null | undefined): DeferredItem[] {
  const open = new Map(items.filter((i) => !i.met).map((i) => [i.key as string, i]))
  const seen = new Set<string>()
  return (Array.isArray(asked) ? asked : []).flatMap((a) => {
    const it = a && typeof a.key === 'string' ? open.get(a.key) : undefined
    const reason = typeof a?.reason === 'string' ? a.reason.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, DEFER_REASON_MAX) : ''
    if (!it || !reason || seen.has(it.key)) return []
    seen.add(it.key)
    return [{ key: it.key, item: it.open ?? it.label, reason }]
  })
}
/** Every open item is deferred — no other reason is asked for. */
export const allDeferred = (items: ChecklistItem[], deferred: DeferredItem[]) => items.filter((i) => !i.met).every((i) => deferred.some((d) => d.key === i.key))

/* ── (gaps build, package A — 1.0 D-265 · D-266 · D-271 · D-307) The closing summary: how the project ended, in figures the records hold ─────
   Money is read from the one set of numbers (lib/projects/money.ts `moneyOf`) — never recomputed here; the days are calendar days, as the
   Schedule counts them; a milestone finished late is one done after its last planned day (the dates the client was first shown, else its own). */

export type ClosingSummary = {
  /** null for a viewer who may not see money (F-17). */
  money: { contractMinor: number; collectedMinor: number; outstandingMinor: number; variations: { count: number; netMinor: number }; toCreditMinor: number; refundMinor: number } | null
  /** Calendar days: planned = start → target end (else the last milestone's planned end); actual = start → completion (or today). */
  days: { planned: number | null; actual: number | null }
  milestones: { total: number; done: number; late: number }
  deferred: DeferredItem[]
  /** (parity map, PR-122 · PR-123 — 1.0 D-263 · D-306) the costs and the margin, with the expected margin and the strip's sentence when they are
      more than 25 points apart — Owners and Admins only (lib/finance/closing-numbers.ts `closingNumbers`, P-C's); absent for everyone else. */
  closing?: { costsMinor: number; marginPct: number | null; expectedMarginPct: number | null; word: string; warning: string | null } | null
}
/** Collected beyond the contract — what the client is owed back. (With one-off invoices outside the contract, collected must be the stages'.) */
/** (gaps build B) contract money against contract money — pass the summary's `collectedContractMinor`, never the all-in Collected (one-offs and recorded invoices are not the contract's) */
export const refundDueOf = (m: { collectedMinor: number; contractMinor: number }) => Math.max(0, m.collectedMinor - m.contractMinor)

const DAY_MS = 86_400_000
const dayNo = (t: number) => { const d = new Date(t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS) }
export function closingSummary(i: {
  money: { contractMinor: number; collectedMinor: number; outstandingMinor: number; toCreditMinor: number; variations: { approved: boolean; amountMinor: number }[] } | null
  start: number | null; targetEnd: number | null; endAt: number
  /** Day numbers (lib/projects/schedule-model.ts `dayOf`), `doneAt` in ms. */
  milestones: { status: string; end: number; plan: { end: number } | null; doneAt: number | null }[]
  deferred?: DeferredItem[]
}): ClosingSummary {
  const ms = i.milestones
  const lastPlanned = ms.length ? Math.max(...ms.map((m) => m.plan?.end ?? m.end)) : null
  const startDay = i.start !== null ? dayNo(i.start) : null
  const planned = startDay === null ? null : i.targetEnd !== null ? dayNo(i.targetEnd) - startDay : lastPlanned !== null ? lastPlanned - startDay : null
  const actual = startDay === null ? null : dayNo(i.endAt) - startDay
  const done = ms.filter((m) => m.status === 'done')
  const late = done.filter((m) => m.doneAt !== null && dayNo(m.doneAt) > (m.plan?.end ?? m.end)).length
  const v = i.money?.variations.filter((x) => x.approved) ?? []
  return {
    money: i.money ? { contractMinor: i.money.contractMinor, collectedMinor: i.money.collectedMinor, outstandingMinor: i.money.outstandingMinor, variations: { count: v.length, netMinor: v.reduce((s, x) => s + x.amountMinor, 0) }, toCreditMinor: i.money.toCreditMinor, refundMinor: refundDueOf(i.money) } : null,
    days: { planned: planned !== null && planned >= 0 ? planned : null, actual: actual !== null && actual >= 0 ? actual : null },
    milestones: { total: ms.length, done: done.length, late },
    deferred: i.deferred ?? [],
  }
}
/** "142 days — 22 more than the 120 planned" · "118 days — 2 fewer than planned" · "Took 142 days". */
export function daysLine(d: ClosingSummary['days']): string | null {
  if (d.actual === null) return null
  const n = (k: number) => `${k} ${k === 1 ? 'day' : 'days'}`
  if (d.planned === null) return n(d.actual)
  const diff = d.actual - d.planned
  return diff === 0 ? `${n(d.actual)} — as planned` : diff > 0 ? `${n(d.actual)} — ${diff} more than the ${d.planned} planned` : `${n(d.actual)} — ${-diff} fewer than the ${d.planned} planned`
}

/** (gaps build, package A) The closing summary as lines — the Overview's card rows and the handover dialog's table read the same words. */
export type ClosingLine = { key: string; label: string; value: string; caption?: string; tone?: 'alert' }
/** (the calm UI build 2026-10-27, 3-16 · T-09) The margin against the quote's plan, in words — "Margin 18% — the quote planned 44%" — only when the
    quote planned one above 0 and the finance rule raised its warning (more than 25 points off), and `below` (the warning tone) only when the
    margin fell short of the plan: a margin above its plan is good news, said quietly in its row. */
export function marginAgainstPlan(c: { marginPct: number | null; expectedMarginPct: number | null; warning: string | null }): { text: string; below: boolean } | null {
  if (!c.warning || c.marginPct === null || c.expectedMarginPct === null || c.expectedMarginPct <= 0) return null
  const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`
  return { text: `Margin ${pct(c.marginPct)} — the quote planned ${pct(c.expectedMarginPct)}`, below: c.marginPct < c.expectedMarginPct }
}

/** `fmt` — (parity Q-03) the Overview's Closing summary CARD writes its sums as a record card does (`moneyCard`, "S$ 77,900"); the handover
    dialog's table keeps the cents. */
export function closingLines(s: ClosingSummary, fmt: (minor: number) => string = money2): ClosingLine[] {
  const out: ClosingLine[] = []
  const money2_ = fmt
  const signed = (m: number) => (m > 0 ? `+${money2_(m)}` : money2_(m))
  if (s.money) {
    const m = s.money
    out.push({ key: 'contract', label: 'Contract value', value: money2_(m.contractMinor) })
    out.push({ key: 'collected', label: 'Collected', value: money2_(m.collectedMinor), caption: m.outstandingMinor ? `${money2_(m.outstandingMinor)} still to collect` : m.collectedMinor >= m.contractMinor && m.contractMinor > 0 ? 'All of it' : `of ${money2_(m.contractMinor)}` })
    if (m.variations.count) out.push({ key: 'variations', label: 'Variation orders', value: signed(m.variations.netMinor), caption: `${m.variations.count} approved` })
    /* (parity map, PR-122 · PR-123) the costs and the margin — an Owner's and an Admin's; the margin "--" until its costs grade it (S-09) */
    const c = s.closing
    if (c) {
      const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`
      out.push({ key: 'costs', label: 'Costs', value: money2_(c.costsMinor), caption: 'Committed — POs, bills and expenses' })   // (invented copy)
      /* (the calm UI build 2026-10-27, 3-16) the plan as the caption — "The quote planned 24%" — never "points over the expected 0%"; the late tone
         only when the margin fell short of a plan (`marginAgainstPlan`) */
      const vsPlan = marginAgainstPlan(c)
      out.push({ key: 'margin', label: 'Margin', value: c.marginPct !== null ? pct(c.marginPct) : '--',
        caption: c.marginPct !== null && c.expectedMarginPct !== null && c.expectedMarginPct > 0 ? `The quote planned ${pct(c.expectedMarginPct)}` : c.word, ...(vsPlan?.below ? { tone: 'alert' as const } : {}) })
    }
    if (m.refundMinor) out.push({ key: 'refund', label: 'To refund', value: money2_(m.refundMinor), caption: 'Collected beyond the contract', tone: 'alert' })
    else if (m.toCreditMinor) out.push({ key: 'credit', label: 'To credit', value: money2_(m.toCreditMinor), caption: 'Invoiced beyond the contract', tone: 'alert' })
  }
  /* the figure as the value, the plan as its caption — a phone's row keeps both whole */
  if (s.days.actual !== null) {
    const n = (k: number) => `${k} ${k === 1 ? 'day' : 'days'}`
    const diff = s.days.planned === null ? null : s.days.actual - s.days.planned
    out.push({ key: 'days', label: 'Days', value: n(s.days.actual), caption: diff === null ? undefined : diff === 0 ? 'As planned' : diff > 0 ? `${diff} more than the ${s.days.planned} planned` : `${-diff} fewer than the ${s.days.planned} planned` })
  }
  if (s.milestones.total) out.push({ key: 'late', label: 'Milestones finished late', value: `${s.milestones.late} of ${s.milestones.done}`, caption: s.milestones.done < s.milestones.total ? `${s.milestones.total - s.milestones.done} not done` : undefined, tone: s.milestones.late ? 'alert' : undefined })
  for (const d of s.deferred) out.push({ key: `deferred-${d.key}`, label: 'Deferred', value: d.item, caption: d.reason })
  return out
}
