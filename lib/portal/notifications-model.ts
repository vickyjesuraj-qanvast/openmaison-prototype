/**
 * (Projects round 9 — Q-41; I-104…I-114: 1.0's homeowner bell) The portal's bell — pure and client-safe. Its rows are DERIVED from the records
 * that reach the client (lib/portal/notifications.ts loads them), the way the studio's `derivedDue` derives the follow-ups: the schedule's
 * changes shared, an update published, a stage to confirm, a choice to make, an invoice sent / due in 3 days / overdue, a payment confirmed or
 * not received. Only what each person has read is stored (`portal_bell_reads`), so the client and someone from their household each keep
 * their own. A row of a section the studio switched off is withheld (Q-45).
 *
 * `BELL_PRODUCERS` is a REGISTRY — a later round appends its producer (never reorders). Round 6's payments fill `BellInvoice.payments`
 * (lib/portal/notifications.ts `paymentsFor`) — the payment rows below then appear by themselves.
 */
import { money2 } from '@/lib/quotes/math'
import { chooseTitle, optionsLine } from '@/lib/projects/choices-model'
import { clientStageName, portalPath, shortDay } from './model'
import { confirmLine, confirmTitle } from './schedule-model'
import type { SectionKey } from './sections'

export type BellKind = 'schedule_shared' | 'update_published' | 'stage_to_confirm' | 'choice_to_make' | 'invoice_sent' | 'invoice_due' | 'invoice_overdue'
  | 'payment_confirmed' | 'payment_not_received'
  | 'quote_shared' | 'agreement_to_sign' | 'variation_to_approve' | 'file_shown' | 'design_shared'   // (gaps build D, item 3 — 1.0 I-106 · I-110 · I-111)
  | 'floor_plan_shared' | 'floor_plan_reply'   // (gaps build G, G-Q14) a plan from the studio, the studio's reply on the client's mark
  | 'credit_issued'   // (gaps build F2 — F2-Q9) a credit note on one of their invoices
  | 'issue_reply' | 'message'   // (gaps build H, H-Q10 · H-Q15) the studio answers an issue; the team writes in Messages
  | 'layout_shared'   // (gaps build J, J-Q16) a 3D layout shared from the 3D Space Planner
  | 'questions_asked'   // (parity map, CP-110) the studio asked them to answer the questionnaire
export type BellRow = {
  /** Stable for what it says — the read mark's key. */
  key: string
  /** (fix-F, F-15) read already by what it points at — an update opened is its row read (one read for one thing) */
  seen?: boolean
  kind: BellKind
  /** The portal section it belongs to — (gaps build D, item 3) null for the steps before work starts (a quote, an agreement, a variation
      order), which always show, as What needs you's do. */
  section: SectionKey | null
  /** (gaps build D, item 3) A studio's preview opens this instead (the studio's own read of the document — a preview records nothing on the
      client's links); undefined = `href` */
  previewHref?: string | null
  icon: string
  title: string
  body: string
  href: string
  at: number
  read: boolean
}

export type BellShare = { id: string; at: number; first: boolean; changes: number; note: string | null }
export type BellUpdate = { id: string; title: string; at: number; author: string | null
  /** (fix-F, F-15) opened since it was published (the card's New chip gone) — its row reads as read */ opened?: boolean }
export type BellStage = { id: string; title: string; finishedOn: number; askedAt: number }
export type BellChoice = { id: string; title: string; options: number; neededBy: number | null; sharedAt: number | null }
/** (round 6) a payment against an invoice, as the client hears of it. */
export type BellPayment = { id: string; amountMinor: number; at: number; state: 'confirmed' | 'not_received'; reason: string | null }
export type BellInvoice = {
  id: string; number: string; stage: string; amountMinor: number; sentAt: number; dueAt: number | null
  /** Money part one's word for it (lib/projects/money.ts `invoiceState`): sent · overdue · part_paid · paid. */
  state: string
  payments: BellPayment[]
  /** (fix-F, F-18) what is still owed past the due day (money's `overdueMinor`), part paid or not — 0 when nothing is */
  overdueMinor?: number
  /** what is still owed and not waiting for the studio — the due-soon row rings while it is above 0 */
  owedMinor?: number
  /** (gaps build F2 — F2-Q9) the credit notes issued on it */
  credits?: { id: string; number: string; amountMinor: number; at: number }[]
}
/** (gaps build D, item 3) A document the studio sent for the client to look at, confirm, sign or approve — `done` once they did. (the calm UI
    build 2026-10-27, 3-35) `outcome`: what was done, read from the record that made it done, so the row then says it instead of still asking. */
export type BellDocument = { id: string; kind: 'quote' | 'variation' | 'agreement'; number: string; title: string; amountMinor: number; at: number; href: string; previewHref: string; done: boolean
  outcome?: 'confirmed' | 'signed' | 'declined' | null }
/** (gaps build D, item 3) A file newly shown on the portal (`opened` once they opened it), a set of designs newly shared (`opened` once viewed). */
export type BellShown = { id: string; name: string; at: number; href: string; opened: boolean }
export type BellDesign = { id: string; rooms: number; at: number; sender: string | null; opened: boolean }
export type BellHome = { homeId: string; leadId: string; place: string | null; shares: BellShare[]; updates: BellUpdate[]; stages: BellStage[]; choices: BellChoice[]; invoices: BellInvoice[]
  /** (gaps build D, item 3) the documents sent, the files shown, the designs shared — absent on an older caller */
  documents?: BellDocument[]; files?: BellShown[]; designs?: BellDesign[]
  /** (fix-F, F-16) someone from the household starts at their invite: rows from before it read as read */ since?: number | null
  /** (gaps build G) the floor plan — plans the studio added, its replies on the client's marks, when this person last opened the floor plan */
  floorPlan?: BellFloorPlan
  /** (gaps build H) the studio's answers on the home's issues, and the team's newest message this person hasn't read */
  issues?: BellIssueAnswer[]; chat?: BellChatNews | null
  /** (gaps build J) the 3D layouts shared on this home — `opened` once the client opened it */ layouts?: BellLayout[]
  /** (parity map, CP-110) the studio's newest ask to answer the questionnaire, and how many it asked are still open */ questions?: BellQuestions | null }
/** (parity map, CP-110) An ask to answer questions (the newest) — the row reads as read once every question asked is answered. */
export type BellQuestions = { askedAt: number; open: number }
/** (gaps build J, J-Q16) A 3D layout shared from the 3D Space Planner. */
export type BellLayout = { id: string; name: string; at: number; sender: string | null; opened: boolean }
/** (gaps build H, H-Q10) A studio's reply to the client on an issue, or the issue marked resolved — `seen` once the client has spoken since. */
export type BellIssueAnswer = { key: string; ticketId: string; number: string; subject: string; by: string; resolved: boolean; at: number; seen: boolean }
/** (gaps build H, H-Q15) The team's unread messages in a home's conversation — one row for the run, keyed by its newest. */
export type BellChatNews = { projectId: string; latestId: string; by: string; words: string; at: number; count: number }
/** (gaps build G) What reached a home on the floor plan (lib/projects/floor-plan.ts `floorPlanBellFacts` — Studio only never counted). */
export type BellFloorPlan = { plans: { id: string; name: string; at: number }[]; replies: { id: string; markId: string; at: number; author: string; plan: string }[]; seenAt: number | null }
export type BellFacts = { slug: string; studio: string; now: number; homes: BellHome[] }

type Draft = Omit<BellRow, 'read'>
export type BellProducer = (h: BellHome, f: BellFacts) => Draft[]

const DAY = 86_400_000
/** "In 3 days" before a due day — 1.0 had none (I-114); the studio's reminders say the same (F-14). */
export const DUE_SOON_DAYS = 3
/** How many rows the bell keeps — the newest. */
export const BELL_KEEP = 30
/** "Mid-Project" → "mid-project" — a stage's name inside a sentence. */
const low = (s: string) => s.toLowerCase()
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
/** "due in 3 days" · "due tomorrow" · "due today". */
export function dueIn(dueAt: number, now: number): string {
  const days = Math.ceil((new Date(dueAt).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / DAY)
  return days <= 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due in ${days} days`
}

/** (the calm UI build 2026-10-27, 3-35) A document's row once the client acted on it: a variation order approved (confirmed or signed) or
    declined, a quote confirmed, signed or declined, an agreement signed. */
function doneTitle(d: BellDocument, o: NonNullable<BellDocument['outcome']>): string {
  if (d.kind === 'variation') return `${d.number} ${o === 'declined' ? 'declined' : 'approved'}`
  if (d.kind === 'quote') return `Quote ${d.number} ${o}`
  return o === 'signed' ? 'Agreement signed' : 'An agreement to sign'
}

export const BELL_PRODUCERS: BellProducer[] = [
  /* the schedule as shared — the first share, then each share of changes (round 2's Share changes) */
  (h, f) => h.shares.map((s) => ({
    key: `share:${s.id}`, kind: 'schedule_shared', section: 'schedule', icon: 'calendar_month',
    title: s.first ? 'Your schedule is ready' : 'Your schedule has changed',
    body: s.note ? `“${s.note}”` : s.first ? 'The milestones ahead and when each is planned' : s.changes   /* (the calm UI build 2026-10-27, 3-04 · W-403) */ ? `${plural(s.changes, 'change')} — see what moved` : 'See what moved',
    href: portalPath(f.slug, 'schedule'), at: s.at,
  })),
  /* an update published (round 3's rule: published, never a draft or one in review) */
  (h, f) => h.updates.map((u) => ({
    key: `update:${u.id}:${u.at}`, kind: 'update_published', section: 'updates', icon: 'chat',
    title: `New update: ${u.title}`, body: `From ${u.author ?? f.studio}`, href: portalPath(f.slug, 'updates'), at: u.at, seen: !!u.opened,
  })),
  /* a finished stage the studio asked the client to confirm — it leaves the bell once answered */
  (h, f) => h.stages.map((s) => ({
    key: `stage:${s.id}:${s.askedAt}`, kind: 'stage_to_confirm', section: 'schedule', icon: 'check',
    title: confirmTitle(s.title), body: confirmLine(s.finishedOn), href: `${portalPath(f.slug, 'schedule')}#stage-${s.id}`, at: s.askedAt,
  })),
  /* a choice to make — it leaves the bell once made */
  (h, f) => h.choices.filter((c) => c.sharedAt !== null).map((c) => ({
    key: `choice:${c.id}:${c.sharedAt}`, kind: 'choice_to_make', section: 'choices', icon: 'palette',
    title: chooseTitle(c.title), body: optionsLine(c.options, c.neededBy, c.sharedAt), href: `${portalPath(f.slug, 'choices')}?open=${encodeURIComponent(c.id)}`, at: c.sharedAt!,
  })),
  /* an invoice: sent; due in 3 days (still unpaid); overdue (money part one's Overdue — sent and past its due day, not paid) */
  (h, f) => h.invoices.flatMap((i): Draft[] => {
    const href = `${portalPath(f.slug, 'money')}?open=${encodeURIComponent(i.id)}`
    const amount = money2(i.amountMinor)
    const out: Draft[] = [{ key: `invoice:${i.id}:sent`, kind: 'invoice_sent', section: 'money', icon: 'receipt_long', title: `Invoice ${i.number} is here`, body: `${clientStageName(i.stage)} · ${amount}${i.dueAt ? ` · due ${shortDay(i.dueAt)}` : ''}`, href, at: i.sentAt }]
    /* (fix-F, F-18) due soon and overdue follow what is still owed, part paid or not (the studio's `overdueOf`) — never only the state word */
    const owed = i.owedMinor ?? (i.state === 'sent' || i.state === 'overdue' ? i.amountMinor : 0)
    const late = i.overdueMinor ?? (i.state === 'overdue' ? i.amountMinor : 0)
    if (i.dueAt && owed > 0 && late <= 0 && f.now < i.dueAt + DAY && f.now >= i.dueAt - DUE_SOON_DAYS * DAY) {
      out.push({ key: `invoice:${i.id}:due`, kind: 'invoice_due', section: 'money', icon: 'payments', title: `Your ${low(i.stage)} payment is ${dueIn(i.dueAt, f.now)}`, body: `${money2(owed)} · due ${shortDay(i.dueAt)}`, href, at: Math.max(i.sentAt, i.dueAt - DUE_SOON_DAYS * DAY) })
    }
    if (i.dueAt && late > 0) {
      out.push({ key: `invoice:${i.id}:late`, kind: 'invoice_overdue', section: 'money', icon: 'payments', title: `Your ${low(i.stage)} payment is overdue`, body: `${money2(late)} · was due ${shortDay(i.dueAt)}`, href, at: i.dueAt + DAY })
    }
    return out
  }),
  /* (round 6's records) a payment confirmed, or not received — with the studio's reason */
  (h, f) => h.invoices.flatMap((i) => i.payments.map((p): Draft => ({
    key: `payment:${p.id}:${p.state}`, kind: p.state === 'confirmed' ? 'payment_confirmed' : 'payment_not_received', section: 'money', icon: 'payments',
    title: p.state === 'confirmed' ? `Payment for ${i.number} confirmed` : `${f.studio} hasn’t received your ${money2(p.amountMinor)} payment`,
    body: p.state === 'confirmed' ? `${f.studio} confirmed your ${money2(p.amountMinor)} payment — your receipt is ready` : p.reason ? `“${p.reason}”` : `For ${i.number} — message your designer if you have paid`,
    href: `${portalPath(f.slug, 'money')}?open=${encodeURIComponent(i.id)}`, at: p.at,
  }))),
  /* (gaps build D, item 3 — 1.0 I-110 · I-111 · I-106) a quote shared, an agreement to sign, a variation order to approve: each rings once, at
     the send, and reads as read once the client has acted on it (confirmed, signed, approved or declined) */
  /* (the calm UI build 2026-10-27, 3-35 · W-093 · T-17) once acted on, the row says the outcome — "VO-1 approved · Study lighting · +S$3,455.30",
     "VO-2 declined" — instead of still asking; it never says who (anyone in the household may have answered) */
  (h) => (h.documents ?? []).map((d): Draft => ({
    key: `doc:${d.kind}:${d.id}:${d.at}`, kind: d.kind === 'quote' ? 'quote_shared' : d.kind === 'variation' ? 'variation_to_approve' : 'agreement_to_sign', section: null,
    icon: d.kind === 'agreement' ? 'signature' : 'request_quote',
    title: d.done && d.outcome ? doneTitle(d, d.outcome) : d.kind === 'quote' ? 'Your quote is ready to look through' : d.kind === 'variation' ? 'A change to your contract to approve' : 'An agreement to sign',
    body: d.kind === 'agreement' ? d.title : `${d.kind === 'variation' && !(d.done && d.outcome) ? `${d.number} · ` : ''}${d.title} · ${d.kind === 'variation' ? (d.amountMinor < 0 ? '−' : '+') : ''}${money2(Math.abs(d.amountMinor))}`,
    href: d.href, previewHref: d.previewHref, at: d.at, seen: d.done,
  })),
  /* (gaps build D, item 3) a file newly shown, a set of designs newly shared — read once opened */
  (h, f) => (h.files ?? []).map((x): Draft => ({ key: `shown:${x.id}:${x.at}`, kind: 'file_shown', section: 'files', icon: 'description', title: 'A new file from your designer', body: x.name, href: x.href, previewHref: portalPath(f.slug, 'files'), at: x.at, seen: x.opened })),
  (h, f) => (h.designs ?? []).map((x): Draft => ({ key: `design:${x.id}`, kind: 'design_shared', section: 'designs', icon: 'wand_shine', title: 'New designs of your home', body: `${plural(x.rooms, 'room')}${x.sender ? ` · from ${x.sender}` : ''} — mark what you like`, href: portalPath(f.slug, 'designs'), at: x.at, seen: x.opened })),
  /* (gaps build G, G-Q14) the floor plan: a plan the studio added, the studio's reply on the client's own mark — read once they open the floor plan */
  (h, f) => {
    const fp = h.floorPlan
    if (!fp) return []
    const seen = (at: number) => fp.seenAt !== null && fp.seenAt >= at
    const at = (q: string) => `${portalPath(f.slug, 'floor-plan')}${q}`
    return [
      ...fp.plans.map((x): Draft => ({ key: `plan:${x.id}`, kind: 'floor_plan_shared', section: 'floor-plan', icon: 'space_dashboard', title: 'A floor plan from your designer', body: `${x.name} — mark it up and say what you think`, href: at(`?plan=${encodeURIComponent(x.id)}`), at: x.at, seen: seen(x.at) })),
      ...fp.replies.map((x): Draft => ({ key: `plan-reply:${x.id}`, kind: 'floor_plan_reply', section: 'floor-plan', icon: 'comment', title: `${x.author} replied on the floor plan`, body: x.plan, href: at(''), at: x.at, seen: seen(x.at) })),
    ]
  },
  /* (gaps build F2 — F2-Q9) a credit note issued on one of their invoices — it opens the credit note's paper */
  (h, f) => h.invoices.flatMap((i) => (i.credits ?? []).map((c): Draft => ({
    key: `credit:${c.id}`, kind: 'credit_issued', section: 'money', icon: 'receipt_long', title: `Credit note ${c.number} for ${i.number}`,
    body: `${money2(c.amountMinor)} comes off what you owe`, href: portalPath(f.slug, `money/credit/${c.id}`), at: c.at,
  }))),
  /* (gaps build H, H-Q10) the studio answers an issue — a reply, or the issue marked resolved; read once opened, or once the client spoke since */
  (h, f) => (h.issues ?? []).map((x): Draft => ({
    key: x.key, kind: 'issue_reply', section: 'issues', icon: 'handyman',
    title: x.resolved ? `${x.by} marked your issue resolved` : `${x.by} replied on your issue`, body: `${x.number} · ${x.subject}`,
    href: `${portalPath(f.slug, 'issues')}?open=${encodeURIComponent(x.ticketId)}`, at: x.at, seen: x.seen,
  })),
  /* (gaps build H, H-Q15) the team's unread messages — one row for the run, gone once Messages is opened */
  (h, f) => (h.chat ? [{
    key: `msg:${h.chat.latestId}`, kind: 'message' as const, section: 'messages' as const, icon: 'comment',
    title: h.chat.count > 1 ? `${h.chat.count} new messages from your team` : `${h.chat.by} sent you a message`, body: h.chat.words.replace(/\s+/g, ' ').trim().slice(0, 120),
    href: portalPath(f.slug, 'messages'), at: h.chat.at,
  }] : []),
]

/* (gaps build J, J-Q16) a 3D layout shared from the 3D Space Planner — read once opened (appended: the registry never reorders) */
BELL_PRODUCERS.push((h, f) => (h.layouts ?? []).map((x): Draft => ({
  key: `layout:${x.id}`, kind: 'layout_shared', section: 'designs', icon: 'view_in_ar', title: 'A 3D layout from your designer',
  body: `${x.name}${x.sender ? ` · from ${x.sender}` : ''} — walk through it`, href: portalPath(f.slug, `layout/${encodeURIComponent(x.id)}`), at: x.at, seen: x.opened,
})))

/* (parity map, CP-110 — 1.0 M-172) the studio asked them to answer the questionnaire: one row per ask, opening their questions page; read once
   every question asked is answered (appended: the registry never reorders) */
BELL_PRODUCERS.push((h, f) => (h.questions && h.questions.askedAt ? [{
  key: `questions:${h.homeId}:${h.questions.askedAt}`, kind: 'questions_asked' as const, section: null, icon: 'help',
  title: `${f.studio} has a few questions about your home`, body: h.questions.open ? `${plural(h.questions.open, 'question')} to answer` : 'All answered — thank you',
  href: portalPath(f.slug, `questions/${encodeURIComponent(h.homeId)}`), at: h.questions.askedAt, seen: h.questions.open === 0,
}] : []))

/** Every row the person may see — of the sections that are on, already come round, newest first, the newest `BELL_KEEP` — with their reads. */
export function bellRows(f: BellFacts, hidden: readonly string[], read: ReadonlySet<string>): BellRow[] {
  const many = f.homes.length > 1
  const all = f.homes.flatMap((h) => BELL_PRODUCERS.flatMap((p) => p(h, f)).map((r) => ({ ...(many && h.place ? { ...r, body: `${r.body} · ${h.place}` } : r), before: h.since != null && r.at < h.since })))
  return all.filter((r) => (!r.section || !hidden.includes(r.section)) && r.at <= f.now)
    .sort((a, b) => b.at - a.at).slice(0, BELL_KEEP)
    .map(({ before, seen, ...r }) => ({ ...r, read: read.has(r.key) || !!seen || before }))
}
export const unreadOf = (rows: readonly BellRow[]) => rows.filter((r) => !r.read).length
