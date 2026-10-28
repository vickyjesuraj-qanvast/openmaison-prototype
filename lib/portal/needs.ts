/**
 * (Projects round 4a) What waits on the client, the steps before work starts and what the client can see — pure functions over one home's
 * facts (a home = one lead link: the lead, and its project once Won). The server loads the facts (lib/portal/home.ts); the portal's home,
 * its Files tab and the studio's Client access panel all read the same answers, so the client and the studio never see two versions.
 *
 * Three REGISTRIES — later rounds append, never reorder:
 *   · `NEED_PRODUCERS` — What needs you: r4b a stage to confirm, r6 a payment, r8 a choice (each its `NeedKind` in lib/portal/model.ts).
 *   · `BEFORE_STEPS`   — Before work starts (board 6): r6 adds "Pay the deposit" after the agreement.
 *   · `ACCESS_SECTIONS` — the Client access panel's "What {client} can see": r4b Schedule · Updates, r6 Money, r8 Choices.
 * Every link here is one of today's client pages (Q-40) — the confirmation link, the signing link (or its bundle), the renders link, a
 * shared file — or the portal's own questions page; `previewHref` is the studio's own read of the same record (a preview records nothing).
 */
import { moneySGD } from '@/lib/format'
import { shortDay, type NeedItem } from './model'
import { chooseTitle, optionsLine } from '@/lib/projects/choices-model'
import { confirmLine, confirmTitle } from './schedule-model'
import type { HomeSchedule } from './schedule'
import type { HomeUpdates } from './updates'
import type { SharedFileKind } from './file-kinds'   // (parity map, CP-099)
import type { HomePayment } from '@/lib/projects/payments-portal'
import { dayMonth, dayOf } from '@/lib/projects/schedule-model'
import { money2 } from '@/lib/quotes/math'   // (Projects round 6) a payment in cents, as board 1 prints it
import { confirmKeyOf, confirmPath } from '@/lib/quotes/confirm'   // (pending modules S04)

export type HomeQuote = { id: string; number: string; title: string; status: string; amountMinor: number; sentAt: number | null; confirmedAt: number | null; signedAt: number | null
  /** (pending modules S04) the confirmation link's key — never the quote's id */ confirmToken?: string
  /** (Projects round 6) 'variation' = a variation order on the project — the client approves a change, not a quote */ kind?: string
  /** (gaps build D, item 2 — M-07) the client declined this variation order on its link — it no longer waits on them */ declinedAt?: number | null }
export type HomeContract = { id: string; title: string; status: string; bundleId: string | null; fromQuoteId: string | null; sentAt: number | null; signedAt: number | null; /** (pending modules S03) the signing link's key — never the contract's id — and when it stops opening */ signToken: string; expiresAt?: number | null
  /** (S42F — S42 B-01's sibling) out for signature, but the quote it signs is being revised (`quoteHoldsSigning`): its link says "Not ready yet",
      so it waits on the studio, never on the client */ held?: boolean
  /** (S44R — UAT row 359, call C9) a completion letter issued at handover (`handover`), sent to read and keep (`toRead`) — nothing to sign */
  handover?: boolean; toRead?: boolean }
export type HomeDesign = { token: string; designId: string; rooms: number; createdAt: number; expiresAt: number; views: number
  /** (gaps build D, item 1 — M-06) the no-login link still opens; a design past its 7 days stays shared (the Designs tab), its link closed */ open?: boolean }
export type HomeFile = { id: string; name: string; kind: string; thumb: string | null; shownAt: number; href: string | null
  /** (fix-F, F-14) the reader has opened it — no longer new, not waiting on them */ opened?: boolean
  /** (parity map, CP-099) what it is, for the client's Files headings — lib/portal/file-kinds.ts */ group?: SharedFileKind }
export type HomeQuestions = { asked: number; open: number; askedAt: number | null }
/** (Projects round 8) A choice the studio shared on the home's project — filled by lib/projects/choices.ts `attachHomeChoices`. */
export type HomeChoice = { id: string; projectId: string; title: string; options: number; neededBy: number | null; sharedAt: number | null; status: 'shared' | 'chosen' | 'declined'; chosenAt: number | null }

export type HomeFacts = {
  homeId: string
  slug: string
  quotes: HomeQuote[]
  contracts: HomeContract[]
  questions: HomeQuestions
  designs: HomeDesign[]
  files: HomeFile[]
  /** When the client last opened the portal. */
  lastOpenedAt: number | null
  now: number
  /** (Projects round 8) The project's choices shared with the client; absent until `attachHomeChoices` fills it. */
  choices?: HomeChoice[]
  /** (r4b) The project's schedule as last shared, its stages waiting for the client's confirmation — absent before a project exists. */
  schedule?: HomeSchedule | null
  /** (r4b) The project's published updates (and those waiting for the studio's review, counted for the access panel only). */
  updates?: HomeUpdates | null
  /** (Projects round 6) The project's payment stages as the client has them — absent before a project exists (lib/projects/payments-portal.ts). */
  payments?: HomePayment[]
  /** (parity map, TD-049 · UC-094) The studio asked for the home's floor plan and none is on the project yet — filled by lib/projects/floor-plan.ts
      `attachHomeFloorPlanAsks` (absent: nothing asked, a plan arrived, or the Floor plan section is off). */
  floorPlanAsk?: { projectId: string; at: number } | null
}
/** How long a shown file counts as new in What needs you. */
export const NEW_FILE_DAYS = 7

/** (S42F) Out for signature and its link signs today: not past its window (S03), not waiting on a revised quote (S42 B-01). */
const signsNow = (c: HomeContract, now: number) => c.status === 'Sent to Client' && !c.toRead && !(c.expiresAt && c.expiresAt <= now) && !c.held   // (S44R, C9) a letter to read waits on nobody
const signPath = (c: Pick<HomeContract, 'id' | 'bundleId' | 'status' | 'signToken'>) => (c.bundleId && c.status === 'Sent to Client' ? `/sign/bundle/${c.bundleId}` : `/sign/${c.signToken}`)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** One producer per kind of thing that can wait on the client. */
export type NeedProducer = (f: HomeFacts) => NeedItem[]

export const NEED_PRODUCERS: NeedProducer[] = [
  /* a contract out for signature — one item per bundle, one per single contract */
  (f) => {
    const out: NeedItem[] = []
    /* (pending modules S03) a link past its window waits on the studio (a new send), not on the client — never "Read and sign" to a dead link ·
       (S42F) nor one whose quote is being revised: its link says "Not ready yet" (`held`), and a set waits while any of its documents does */
    const waiting = f.contracts.filter((c) => signsNow(c, f.now))
    const heldSets = new Set(f.contracts.filter((c) => c.status === 'Sent to Client' && c.held && c.bundleId).map((c) => c.bundleId!))
    const bundles = new Map<string, HomeContract[]>()
    for (const c of waiting) if (c.bundleId) bundles.set(c.bundleId, [...(bundles.get(c.bundleId) ?? []), c])
    for (const [id, list] of bundles) {
      if (heldSets.has(id)) continue
      const since = Math.min(...list.map((c) => c.sentAt ?? Date.now()))
      out.push({ key: `bundle:${id}`, kind: 'bundle', homeId: f.homeId, icon: 'signature', title: `Sign ${plural(list.length, 'document')}`, line: `${list.map((c) => c.title).join(' · ')} · sent ${shortDay(since)}`, action: 'Read and sign', href: `/sign/bundle/${id}`, previewHref: `/contracts/${list[0]!.id}/preview`, since })
    }
    for (const c of waiting.filter((x) => !x.bundleId)) {
      const since = c.sentAt ?? Date.now()
      out.push({ key: `contract:${c.id}`, kind: 'contract', homeId: f.homeId, icon: 'signature', title: 'Sign your agreement', line: `${c.title} · sent ${shortDay(since)}`, action: 'Read and sign', href: signPath(c), previewHref: `/contracts/${c.id}/preview`, since })
    }
    return out
  },
  /* a quote sent for the client's confirmation (one already in a contract out for signature is signed there) */
  (f) => f.quotes.filter((q) => q.status === 'Sent to Client' && !q.declinedAt && !f.contracts.some((c) => c.fromQuoteId === q.id && c.status === 'Sent to Client')).map((q) => {
    const since = q.sentAt ?? Date.now()
    /* (Projects round 6) a variation order is a change to the contract the client approves — never "your quote" (round 4b's note) */
    if (q.kind === 'variation') return { key: `quote:${q.id}`, kind: 'quote', homeId: f.homeId, icon: 'request_quote', title: 'Approve a change to your contract', line: `${q.number} · ${q.title} · ${q.amountMinor < 0 ? '−' : '+'}${moneySGD(Math.abs(q.amountMinor))} · sent ${shortDay(since)}`, action: 'Look and approve', href: confirmPath(confirmKeyOf({ id: q.id, confirmToken: q.confirmToken })), previewHref: `/quotes/${q.id}/preview`, since }
    return { key: `quote:${q.id}`, kind: 'quote', homeId: f.homeId, icon: 'request_quote', title: 'Look through your quote', line: `${q.title} · ${moneySGD(q.amountMinor)} · sent ${shortDay(since)}`, action: 'Look and confirm', href: confirmPath(confirmKeyOf({ id: q.id, confirmToken: q.confirmToken })), previewHref: `/quotes/${q.id}/preview`, since }
  }),
  /* the questions the studio asked, still open */
  (f) => (f.questions.open > 0 ? [{
    key: `questions:${f.homeId}`, kind: 'questions', homeId: f.homeId, icon: 'quiz', title: 'Tell us about your home',
    line: `${plural(f.questions.open, 'question')} to answer${f.questions.askedAt ? ` · asked ${shortDay(f.questions.askedAt)}` : ''}`,
    action: 'Answer', href: `/my/${f.slug}/questions/${f.homeId}`, previewHref: null, since: f.questions.askedAt ?? Date.now(),
  } satisfies NeedItem] : []),
  /* designs shared and not yet opened */
  (f) => f.designs.filter((d) => d.views === 0 && d.open !== false).map((d) => ({
    key: `renders:${d.token}`, kind: 'renders', homeId: f.homeId, icon: 'wand_shine', title: 'Look at your designs',
    line: `${plural(d.rooms, 'room')} · mark what you like · until ${shortDay(d.expiresAt)}`, action: 'Look', href: `/renders/${d.token}`, previewHref: `/visualizer/${d.designId}`, since: d.createdAt,
  })),
  /* files shown in the last week */
  (f) => {
    const fresh = f.files.filter((x) => !x.opened && f.now - x.shownAt < NEW_FILE_DAYS * 86_400_000)   // (fix-F, F-14) a file opened is done
    if (!fresh.length) return []
    const one = fresh.length === 1 ? fresh[0]! : null
    const since = Math.max(...fresh.map((x) => x.shownAt))
    return [{
      key: `file:${f.homeId}`, kind: 'file', homeId: f.homeId, icon: 'description',
      title: one ? 'A new file from your designer' : `${fresh.length} new files from your designer`,
      line: one ? `${one.name} · shared ${shortDay(one.shownAt)}` : `The latest shared ${shortDay(since)}`,
      action: 'Open', href: one?.href ?? `/my/${f.slug}/files`, previewHref: null, since,
    }]
  },
  /* (r4b) a finished stage the studio asked the client to confirm — board 1's "Confirm that electrical and plumbing is done · Finished 2 Oct
     · have a look and confirm"; the portal's own Schedule (a preview records nothing there, so the press needs no studio-side twin) */
  (f) => (f.schedule?.toConfirm ?? []).map((s) => ({
    key: `stage:${s.id}`, kind: 'stage' as const, homeId: f.homeId, icon: 'check', title: confirmTitle(s.title), line: confirmLine(s.finishedOn),
    action: 'Look and confirm', href: `/my/${f.slug}/schedule#stage-${s.id}`, previewHref: null, since: s.askedAt,
  })),
  /* (Projects round 8) a choice shared with the client and not yet made — "Choose your paint colours · 3 options · needed by Mon 19 Oct"
     (the portal canvas's home); the portal's own Choices page, safe to open in a preview (it records nothing) */
  (f) => (f.choices ?? []).filter((c) => c.status === 'shared').map((c) => ({
    key: `choice:${c.id}`, kind: 'choice', homeId: f.homeId, icon: 'palette', title: chooseTitle(c.title), line: optionsLine(c.options, c.neededBy, c.sharedAt),
    action: 'Choose', href: `/my/${f.slug}/choices?open=${encodeURIComponent(c.id)}`, previewHref: null, since: c.sharedAt ?? f.now,
  } satisfies NeedItem)),
  /* (Projects round 6) an invoice sent and not yet paid — board 1's "Your mid-project payment is due · S$20,784.94 · due 2 Oct"; the portal's
     own Money tab (a preview records nothing there). A payment the client said they made, waiting for the studio, is not theirs to do. */
  (f) => (f.payments ?? []).filter((p) => p.state === 'due' && p.owedMinor > 0).map((p) => {
    /* (fix-G, G-27) past its due day it says so — "is overdue · was due 2 Oct", as the studio's Money tab counts it */
    const late = !!p.dueAt && dayOf(new Date(p.dueAt)) < dayOf(new Date(f.now))
    return {
      key: `payment:${p.invoiceId}`, kind: 'payment' as const, homeId: f.homeId, icon: 'payments', title: payTitle(p.stage, late),
      line: `${money2(p.owedMinor)}${p.dueAt ? ` · ${late ? 'was due' : 'due'} ${dayMonth(dayOf(new Date(p.dueAt)))}` : ''}`,
      action: 'See how to pay', href: `/my/${f.slug}/money#pay-${p.invoiceId}`, previewHref: null, since: p.sentAt ?? f.now,
    }
  }),
  /* (parity map, TD-049 · UC-094 — 1.0's "Ask your homeowner to send it") the studio asked for the home's floor plan: "Send your floor plan ·
     a photo or a PDF is fine · asked 10 Oct", until a plan is on the project; the portal's own Floor plan page, where Send the plan is — a
     preview records nothing there. Its kind is `floor_plan` (lib/portal/model.ts `NeedKind`, wired by the portal's owner). (invented copy) */
  (f) => (f.floorPlanAsk ? [{
    key: `floor-plan:${f.floorPlanAsk.projectId}`, kind: 'floor_plan', homeId: f.homeId, icon: 'upload_file', title: 'Send your floor plan',
    line: `A photo or a PDF is fine · asked ${shortDay(f.floorPlanAsk.at)}`, action: 'Send it', href: `/my/${f.slug}/floor-plan`, previewHref: null, since: f.floorPlanAsk.at,
  } satisfies NeedItem] : []),
]
/** "Your mid-project payment is due" — the stage in the client's words, board 1; "…is overdue" once its due day has passed (fix-G, G-27). */
export const payTitle = (stage: string, late = false) => `Your ${stage.trim().toLowerCase()} payment is ${late ? 'overdue' : 'due'}`

/** Everything waiting on the client for one home, oldest ask first. */
export const needsOf = (f: HomeFacts): NeedItem[] => NEED_PRODUCERS.flatMap((p) => p(f)).sort((a, b) => a.since - b.since)

/* ── Before work starts (board 6) ─────────────────────────────────────────────────────────────────────────────────────────── */
export type StepState = 'done' | 'now' | 'later'
export type BeforeStep = { key: string; title: string; state: StepState; line: string; action: { label: string; href: string; previewHref: string | null } | null; change: { label: string; href: string } | null }
export type BeforeStepDef = { key: string; build: (f: HomeFacts) => Omit<BeforeStep, 'key'> | null }

const latestQuote = (f: HomeFacts) => [...f.quotes].filter((q) => q.kind !== 'variation').sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))[0] ?? null   // (Projects round 6) a variation order is not the quote
const theContract = (f: HomeFacts) => [...f.contracts].filter((c) => !c.handover).sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))[0] ?? null   // (S44R, C9) the agreement, never the handover's letter

export const BEFORE_STEPS: BeforeStepDef[] = [
  {
    key: 'questions',
    build: (f) => (f.questions.asked === 0 ? null : f.questions.open === 0
      ? { title: 'Tell us about your home', state: 'done', line: 'Done. Your answers are with the studio.', action: null, change: { label: 'Change an answer', href: `/my/${f.slug}/questions/${f.homeId}` } }
      : { title: 'Tell us about your home', state: 'now', line: `${plural(f.questions.open, 'question')} from the studio about your home and how you live.`, action: { label: 'Answer the questions', href: `/my/${f.slug}/questions/${f.homeId}`, previewHref: null }, change: null }),
  },
  {
    key: 'quote',
    build: (f) => {
      const q = latestQuote(f)
      if (!q) return null
      if (q.status === 'Confirmed' || q.status === 'Signed') return { title: 'Look through your quote', state: 'done', line: `Done. You confirmed ${q.title} on ${shortDay(q.confirmedAt ?? q.signedAt ?? q.sentAt ?? Date.now())}.`, action: null, change: null }
      return { title: 'Look through your quote', state: 'now', line: `${q.title} · ${moneySGD(q.amountMinor)}. Read it, pick your options, then confirm.`, action: { label: 'Open the quote', href: confirmPath(confirmKeyOf({ id: q.id, confirmToken: q.confirmToken })), previewHref: `/quotes/${q.id}/preview` }, change: null }
    },
  },
  {
    key: 'agreement',
    build: (f) => {
      const c = theContract(f)
      const q = latestQuote(f)
      if (c?.status === 'Signed') return { title: 'Sign the agreement', state: 'done', line: `Done. Signed on ${shortDay(c.signedAt ?? Date.now())}.`, action: null, change: null }
      /* (S42F — S42 B-01's sibling) the quote it signs is being revised: the step waits, in the signing link's own words, and offers no link
         that would only say so · (S42F, the same fault) a link past its window: the step says who sends a new one (the link's own words) */
      if (c?.status === 'Sent to Client' && c.held) return { title: 'Sign the agreement', state: 'later', line: 'Not ready yet — your designer is updating the quote this agreement signs. It’ll be back here once it’s ready.', action: null, change: null }
      if (c?.status === 'Sent to Client' && c.expiresAt && c.expiresAt <= f.now) return { title: 'Sign the agreement', state: 'later', line: 'The signing link has expired. Please ask your designer to send you a new one.', action: null, change: null }
      if (c?.status === 'Sent to Client') return { title: 'Sign the agreement', state: 'now', line: `${c.title}. Read it through, then sign at the end.`, action: { label: 'Open the agreement', href: signPath(c), previewHref: `/contracts/${c.id}/preview` }, change: null }
      return q ? { title: 'Sign the agreement', state: 'later', line: 'Opens once you have confirmed the quote.', action: null, change: null } : null
    },
  },
  /* (Projects round 6) Pay the deposit — after the agreement, once the project's first payment stage is invoiced */
  {
    key: 'deposit',
    build: (f) => {
      const d = [...(f.payments ?? [])].sort((a, b) => a.position - b.position)[0]
      if (!d) return null
      const title = `Pay the ${d.stage.toLowerCase()}`
      if (d.state === 'paid') return { title, state: 'done', line: 'Done. Thank you — your receipt is on your Payments page.', action: null, change: null }
      if (d.state === 'to_confirm') return { title, state: 'done', line: 'Done. Waiting for the studio to confirm it arrived.', action: null, change: null }
      if (d.state === 'due') return { title, state: 'now', line: `${money2(d.owedMinor)}${d.dueAt ? `, due ${dayMonth(dayOf(new Date(d.dueAt)))}` : ''}. How to pay is on your Payments page.`, action: { label: title, href: `/my/${f.slug}/money#pay-${d.invoiceId}`, previewHref: null }, change: null }
      return { title, state: 'later', line: 'Your designer sends the invoice once the agreement is signed.', action: null, change: null }
    },
  },
]
export function stepsOf(f: HomeFacts): BeforeStep[] {
  const steps = BEFORE_STEPS.map((d) => { const s = d.build(f); return s ? { key: d.key, ...s } : null }).filter((s): s is BeforeStep => !!s)
  /* one step is the current one: the first not done; any later "now" waits behind it */
  let seen = false
  return steps.map((s) => { if (s.state !== 'now') return s; if (seen) return { ...s, state: 'later' as const, action: null }; seen = true; return s })
}

/* ── What the client can see (the Client access panel, board 8) ─────────────────────────────────────────────────────────── */
export type AccessSection = { key: string; name: string; state: string; /** where the studio keeps it — the lead's tab, or the project's */ href: string }
export type AccessFacts = HomeFacts & { filesTotal: number; leadId: string; /** `/leads/<id>` or `/projects/<id>` — where Files lives */ base: string
  /** (fix-G, G-30) a direct project's client — no Quotes tab: its documents are on the project's Money tab */ direct?: boolean
  /** (fix-G, G-42) quotes the Quote Sent step names that went to the client outside the portal (an approved quote sent by hand, an upload) */ offPortal?: number
  /** (gaps build G) the project's floor plan: its plans, the client's open marks, the newest confirmation */ floorPlan?: { plans: number; open: number; confirmedAt: number | null } }
export type AccessSectionDef = (f: AccessFacts) => AccessSection | null

export const ACCESS_SECTIONS: AccessSectionDef[] = [
  /* (r4b) Schedule · Updates — board 8's "Shared 2 Oct" · "4 published · 1 waiting for review"; r6: Money — r8: Choices — inserted before Files */
  (f) => {
    const s = f.schedule
    if (!s) return null
    const asks = s.toConfirm.length
    const state = s.summary
      ? [`Shared ${shortDay(s.summary.sharedAt)}`, asks ? `${plural(asks, 'milestone')} to confirm` : null   /* (the calm UI build 2026-10-27, 3-04) milestones, as the Schedule says */, s.concerns ? `${s.concerns} not right` : null].filter(Boolean).join(' · ')
      : s.hasMilestones ? 'Not shared yet' : 'No schedule yet'
    return { key: 'schedule', name: 'Schedule', state, href: `${f.base}/schedule` }
  },
  (f) => {
    const u = f.updates
    if (!u) return null
    const state = [u.published ? `${u.published} published` : 'None published yet', u.inReview ? `${u.inReview} waiting for review` : null].filter(Boolean).join(' · ')
    return { key: 'updates', name: 'Updates', state, href: `${f.base}/updates` }
  },
  (f) => {
    /* (fix-G, G-09) a variation order is counted as one, never as a quote — the lead's Quotes tab lists quotes only (REG-1000) */
    const q = f.quotes.filter((x) => x.kind !== 'variation').length, vo = f.quotes.length - q, c = f.contracts.length
    /* (fix-G, G-30) a direct project has no Quotes tab: its documents (the variation orders) are on Money */
    const href = f.direct && f.base.startsWith('/projects/') ? `${f.base}/money` : `/leads/${f.leadId}/quotes`
    /* (fix-G, G-42) a quote the Quote Sent step names, sent to the client outside the portal, is said as such — not "Nothing sent yet" */
    const outside = f.offPortal ? `${plural(f.offPortal, 'quote')} sent outside the portal` : null
    if (!q && !c && !vo && !outside) return { key: 'documents', name: 'Quotes and agreements', state: 'Nothing sent yet', href }
    const waiting = f.quotes.filter((x) => x.status === 'Sent to Client' && !x.declinedAt).length + f.contracts.filter((x) => signsNow(x, f.now)).length   // (gaps build D) a declined order waits on the studio · (S42F) so does an agreement whose quote is being revised, or whose link has expired
    return { key: 'documents', name: 'Quotes and agreements', state: [q ? plural(q, 'quote') : null, c ? plural(c, 'agreement') : null, vo ? plural(vo, 'variation order') : null, outside, waiting ? `${waiting} waiting` : null].filter(Boolean).join(' · '), href }
  },
  (f) => (f.questions.asked ? { key: 'questions', name: 'Questionnaire', state: `${plural(f.questions.asked, 'question')} asked · ${f.questions.asked - f.questions.open} answered`, href: `/leads/${f.leadId}/questionnaire` } : null),
  /* (Projects round 6) Money — only a home that is a project has it */
  (f) => {
    if (!f.base.startsWith('/projects/') || !f.payments?.length) return null
    const paid = f.payments.filter((p) => p.state === 'paid').length, due = f.payments.filter((p) => p.state === 'due').length, waiting = f.payments.filter((p) => p.state === 'to_confirm').length
    return { key: 'money', name: 'Payments', state: [paid ? `${paid} paid` : null, due ? `${due} due` : null, waiting ? `${waiting} to confirm` : null].filter(Boolean).join(' · ') || 'Nothing invoiced yet', href: `${f.base}/money` }
  },
  /* (Projects round 8) Choices — only a home that is a project has them */
  (f) => {
    if (!f.base.startsWith('/projects/')) return null
    const list = f.choices ?? []
    const waiting = list.filter((c) => c.status === 'shared').length, declined = list.filter((c) => c.status === 'declined').length, chosen = list.filter((c) => c.status === 'chosen').length
    return { key: 'choices', name: 'Choices', state: list.length ? [waiting ? `${waiting} waiting` : null, declined ? `${declined} turned down` : null   /* (the calm UI build 2026-10-27, 3-25 · W-079) */, chosen ? `${chosen} chosen` : null].filter(Boolean).join(' · ') : 'Nothing shared', href: `${f.base}/choices` }   // (gaps build D, item 2)
  },
  /* (the calm UI build 2026-10-27, 3-25 · W-572) what is shared, said as a sentence: "3 of 10 files shared" · "10 files, none shared yet" */
  (f) => ({ key: 'files', name: 'Files', state: f.files.length ? `${f.files.length} of ${plural(f.filesTotal, 'file')} shared` : f.filesTotal ? `${plural(f.filesTotal, 'file')}, none shared yet` : 'No files yet', href: `${f.base}/files` }),
  (f) => ({ key: 'designs', name: 'Designs', state: f.designs.length ? `${plural(f.designs.reduce((n, d) => n + d.rooms, 0), 'room')} shared` : 'Nothing shared', href: f.designs[0] ? `/visualizer/${f.designs[0].designId}` : '/visualizer' }),
  /* (gaps build G) the floor plan — only a home that is a project has one */
  (f) => {
    if (!f.base.startsWith('/projects/') || !f.floorPlan) return null
    const fp = f.floorPlan
    return { key: 'floor-plan', name: 'Floor plan', state: fp.plans ? [plural(fp.plans, 'plan'), fp.open ? `${fp.open} of their marks open` : null, fp.confirmedAt ? `Layout confirmed ${shortDay(fp.confirmedAt)}` : 'Layout not confirmed yet'].filter(Boolean).join(' · ') : 'No plan yet', href: `${f.base}/floor-plan` }
  },
]
/** (fix-G, G-25) The rows in the portal's own order — what Home holds (the documents, the questions), then the tabs as the client has them:
    Schedule · Updates · Money · Choices · Designs · Files (`PORTAL_TABS`). The registry above stays append-only; this orders its answers. */
export const ACCESS_ORDER: readonly string[] = ['documents', 'questions', 'schedule', 'updates', 'money', 'choices', 'designs', 'floor-plan', 'files']   // (gaps build G) the floor plan before Files, as the portal's tabs
const accessRank = (k: string) => { const i = ACCESS_ORDER.indexOf(k); return i < 0 ? ACCESS_ORDER.length : i }
export const accessSectionsOf = (f: AccessFacts): AccessSection[] => ACCESS_SECTIONS.map((d) => d(f)).filter((s): s is AccessSection => !!s).sort((a, b) => accessRank(a.key) - accessRank(b.key))
